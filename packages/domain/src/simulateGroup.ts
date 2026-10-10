/**
 * PURE DOMAIN: MÔ PHỎNG NHÓM (headless)
 * Nhiều người chơi cùng sống một tuần; mỗi sáng người chơi chọn hành vi chung theo "gu" của chiến lược, những ai chọn
 * cùng một hành vi thì lập nhóm và làm cùng nhau (resolveJointAction), phần còn lại của ngày chơi một mình theo chiến lược.
 * Dùng để kiểm tra cân bằng: chơi nhóm Kết nối cao hơn chơi một mình, nhóm toàn cám dỗ sụp đổ nhanh hơn,
 * và không chiến lược nào thắng áp đảo.
 */
import type { PlayerStatsPrimitive } from './types.js';
import { evaluateLifeStatus } from './stats.js';
import { clockFromHoursRemaining } from './availability.js';
import { BIG_EVENT_IDS } from './bigEvents.js';
import { applyAction, endDay, hoursLeftOf, newPlayerState, startNextDay, type PlayerState } from './gameState.js';
import { rollDomainEvent, resolveDomainChoice } from './events.js';
import { DOMAIN_STRATEGIES, chooseStrategyAction, type DomainStrategy, type RunTracePrimitive } from './simulate.js';
import { jointActionDef } from './jointActions.js';
import { PRESSURE_WILLPOWER_THRESHOLD, offerPressure, resolveJointAction } from './social.js';
import type { Rng } from './rng.js';

/** Mỗi sáng, chiến lược muốn làm hành vi chung nào (ưu tiên giảm dần). Rỗng = tự lo thân. */
export type JointPreference = (stats: PlayerStatsPrimitive, day: number) => string[];

export const JOINT_PREFERENCES: Record<string, JointPreference> = {
  dopamine_chaser: (s) => (s.money > 700 && s.energy > 30 ? ['drinking_group', 'movie_night'] : ['movie_night']),
  // Cày cuốc tới kiệt sức thì bạn bè mới kéo đi học nhóm cho đỡ ngộp
  workaholic: (s) => (s.mental < 45 ? ['study_group'] : []),
  pure_sleeper: () => [],
  party_animal: (s) => (s.money > 500 ? ['drinking_group', 'movie_night'] : ['movie_night']),
  balanced: (s, day) => (s.social < 55 ? ['heart_to_heart', 'eat_together'] : day % 2 === 1 ? ['run_together', 'eat_together'] : ['eat_together', 'study_group']),
};

/** Giờ đồng hồ bắt đầu ngày game */
const DAY_START_CLOCK = 7;
/** Hành vi chung bắt đầu sớm nhất lúc nào (mở cửa, hoặc 8h sáng) */
const slotClock = (actionId: string): number => Math.max(8, jointActionDef(actionId)?.window?.[0] ?? 8);

export interface GroupRunResult {
  /** Kết quả từng người, cùng thứ tự `strategies` */
  traces: RunTracePrimitive[];
  /** Số lần mỗi người đã làm hành vi chung */
  jointCounts: number[];
  /** Số lần nhóm cám dỗ kéo thêm người ý chí thấp ngoài ý định của họ */
  pressureJoins: number;
}

function formGroups(strategies: DomainStrategy[], states: PlayerState[], active: boolean[], rng: Rng): { groups: Map<string, number[]>; pressureJoins: number } {
  const groups = new Map<string, number[]>();
  const taken = new Set<number>();
  const prefs = strategies.map((st, i) => (active[i] ? (JOINT_PREFERENCES[st.id]?.(states[i].stats, states[i].day) ?? []) : []));

  // Vòng r: mỗi người ứng với lựa chọn thứ r của mình; nhóm đủ người thì chốt
  for (let round = 0; round < 2; round++) {
    const byAction = new Map<string, number[]>();
    for (let i = 0; i < states.length; i++) {
      const pick = prefs[i][round];
      if (!pick || taken.has(i)) continue;
      byAction.set(pick, [...(byAction.get(pick) ?? []), i]);
    }
    for (const [actionId, members] of byAction) {
      const joint = jointActionDef(actionId)?.joint;
      if (!joint || members.length < joint.minPlayers) continue;
      const chosen = members.slice(0, joint.maxPlayers);
      groups.set(actionId, chosen);
      chosen.forEach((i) => taken.add(i));
    }
  }

  // Áp lực đồng trang lứa: nhóm cám dỗ còn chỗ kéo thêm người ý chí thấp
  let pressureJoins = 0;
  for (const [actionId, members] of groups) {
    const joint = jointActionDef(actionId)?.joint;
    if (!joint?.peerPressure) continue;
    for (let i = 0; i < states.length && members.length < joint.maxPlayers; i++) {
      if (!active[i] || taken.has(i)) continue;
      const pull = -offerPressure(actionId, states[i].stats.willpower); // 0 nếu ý chí đủ cao
      if (pull > 0 && rng() < Math.min(0.9, pull / 4 + (PRESSURE_WILLPOWER_THRESHOLD - states[i].stats.willpower) / 100)) {
        members.push(i);
        taken.add(i);
        pressureJoins++;
      }
    }
  }
  return { groups, pressureJoins };
}

/** Chơi một người một mình tới khi đồng hồ chạm `untilClock` (hoặc hết giờ). */
function playSoloUntil(strategy: DomainStrategy, state: PlayerState, rng: Rng, untilClock: number | null): PlayerState {
  let s = state;
  for (let guard = 0; guard < 64 && hoursLeftOf(s) > 0; guard++) {
    if (untilClock !== null) {
      const clock = clockFromHoursRemaining(hoursLeftOf(s));
      const elapsed = (clock - DAY_START_CLOCK + 24) % 24;
      if (elapsed >= (untilClock - DAY_START_CLOCK + 24) % 24) break;
    }
    const pick = chooseStrategyAction(strategy, s);
    if (!pick) break;
    const res = applyAction(s, pick.plan.steps, null, pick.plan.endLocation, rng);
    s = res.state;
    if (res.blocked || !res.applied) break;
  }
  return s;
}

/** Một ván cho cả nhóm. Mỗi phần tử `strategies` là một người chơi. */
export function playGroupRun(strategies: DomainStrategy[], daysPerRun: number, rng: Rng): GroupRunResult {
  const n = strategies.length;
  let states = strategies.map(() => newPlayerState([], { id: BIG_EVENT_IDS[0], difficulty: 1 }));
  const alive = strategies.map(() => true);
  const survived = strategies.map(() => 0);
  const collapseDay: Array<number | null> = strategies.map(() => null);
  const collapseReason: RunTracePrimitive['collapseReason'][] = strategies.map(() => null);
  const timelines: RunTracePrimitive['timeline'][] = strategies.map(() => []);
  const jointCounts = strategies.map(() => 0);
  let pressureJoins = 0;

  for (let day = 1; day <= daysPerRun; day++) {
    // 1. Lập nhóm theo gu
    const formed = formGroups(strategies, states, alive, rng);
    pressureJoins += formed.pressureJoins;
    const ordered = [...formed.groups.entries()].sort((a, b) => slotClock(a[0]) - slotClock(b[0]));

    // 2. Mỗi nhóm: các thành viên chơi một mình tới giờ hẹn rồi cùng làm
    for (const [actionId, members] of ordered) {
      for (const i of members) states[i] = playSoloUntil(strategies[i], states[i], rng, slotClock(actionId));
      const result = resolveJointAction(members.map((i) => states[i]), actionId, rng);
      if (result.ok) {
        result.outcomes.forEach((o) => {
          if (o.ok) {
            states[members[o.index]] = o.state;
            jointCounts[members[o.index]]++;
          }
        });
      }
    }

    // 3. Phần còn lại của ngày + biến cố + qua đêm, từng người
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      let s = playSoloUntil(strategies[i], states[i], rng, null);
      if (rng() < 0.35) {
        const ev = rollDomainEvent(day, () => rng() * 0.45);
        if (ev) {
          const choice = ev.choices[Math.floor(rng() * ev.choices.length)];
          s = { ...s, stats: resolveDomainChoice(ev.id, choice.id, s.stats).newStats };
        }
      }
      s = endDay(s, rng).state;
      survived[i] = day;
      timelines[i].push({ day, stats: s.stats });

      const status = evaluateLifeStatus(s.stats);
      if (status.status === 'bankrupt') {
        collapseDay[i] = day;
        collapseReason[i] = 'bankrupt';
        alive[i] = false;
      } else if (status.status === 'burnout') {
        collapseDay[i] = day;
        collapseReason[i] = s.stats.energy <= 10 ? 'burnout_energy' : 'burnout_mental';
        alive[i] = false;
      }
      states[i] = alive[i] ? startNextDay(s) : s;
    }
    if (!alive.some(Boolean)) break;
  }

  const traces: RunTracePrimitive[] = strategies.map((_, i) => ({
    survivedDays: survived[i],
    endedEarly: collapseDay[i] !== null,
    collapseDay: collapseDay[i],
    collapseReason: collapseReason[i],
    finalStats: states[i].stats,
    timeline: timelines[i],
    history: states[i].history,
  }));
  return { traces, jointCounts, pressureJoins };
}

export interface GroupSimulationSlot {
  strategyId: string;
  survivalRate: number;
  avgSurvivedDays: number;
  avgFinalSocial: number;
  avgFinalMoney: number;
  /** Số lần làm hành vi chung trung bình mỗi ván */
  avgJointActions: number;
}

export interface GroupSimulationResult {
  runs: number;
  daysPerRun: number;
  groupSize: number;
  slots: GroupSimulationSlot[];
  avgPressureJoins: number;
}

/** Mô phỏng `runs` ván cho một nhóm có cấu thành `strategyIds` (một id mỗi người). */
export function runGroupSimulation(strategyIds: string[], runs: number, daysPerRun: number, rng: Rng): GroupSimulationResult {
  const strategies = strategyIds.map((id) => DOMAIN_STRATEGIES.find((s) => s.id === id) ?? DOMAIN_STRATEGIES[4]);
  const n = strategies.length;
  const survivals = new Array<number>(n).fill(0);
  const days = new Array<number>(n).fill(0);
  const social = new Array<number>(n).fill(0);
  const money = new Array<number>(n).fill(0);
  const joints = new Array<number>(n).fill(0);
  let pressure = 0;

  for (let r = 0; r < runs; r++) {
    const run = playGroupRun(strategies, daysPerRun, rng);
    pressure += run.pressureJoins;
    run.traces.forEach((t, i) => {
      if (!t.endedEarly) survivals[i]++;
      days[i] += t.survivedDays;
      social[i] += t.finalStats.social;
      money[i] += t.finalStats.money;
      joints[i] += run.jointCounts[i];
    });
  }

  return {
    runs,
    daysPerRun,
    groupSize: n,
    avgPressureJoins: pressure / runs,
    slots: strategies.map((s, i) => ({
      strategyId: s.id,
      survivalRate: Math.round((survivals[i] / runs) * 100),
      avgSurvivedDays: Math.round((days[i] / runs) * 10) / 10,
      avgFinalSocial: Math.round(social[i] / runs),
      avgFinalMoney: Math.round(money[i] / runs),
      avgJointActions: Math.round((joints[i] / runs) * 10) / 10,
    })),
  };
}

