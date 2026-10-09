import { PlayerStatsPrimitive, SimulationResultPrimitive } from './types';
import { INITIAL_STATS, evaluateLifeStatus } from './stats';
import { DOMAIN_ACTIONS, executeActionById } from './actions';
import { actionLockReason, clockFromHoursRemaining } from './availability';
import { processOvernightCycle } from './consequence';
import { rollDomainEvent, resolveDomainChoice } from './events';

export interface DomainStrategy {
  id: string;
  name: string;
  description: string;
  decideActionId: (stats: PlayerStatsPrimitive, hoursLeft: number, actionsToday: string[]) => string;
}

export const DOMAIN_STRATEGIES: DomainStrategy[] = [
  {
    id: 'dopamine_chaser',
    name: 'Nghiện kích thích (Dopamine Chaser)',
    description: 'Ưu tiên lướt mạng, cày game, đồ ăn nhanh. Chỉ chợp mắt ngắn (~6h) vì mải cày.',
    decideActionId: (stats, hoursLeft, actionsToday) => {
      const naps = actionsToday.filter((id) => id === 'sleep_nap').length;
      const free = hoursLeft - Math.max(0, 4 - naps) * 1.5; // dành chỗ cho 4 lần chợp mắt (6h)
      if (stats.money < 200 && free >= 4) return 'work_focused';
      if (free >= 3) return 'binge_gaming';
      if (free >= 2) return 'scroll_social';
      if (free >= 0.5) return 'fast_food';
      return 'sleep_nap';
    },
  },
  {
    id: 'workaholic',
    name: 'Cuồng công việc (Workaholic)',
    description: 'Cày cuốc 12h/ngày (có làm thêm đêm), chỉ chợp mắt ~6h và cắt bỏ mọi thứ khác.',
    decideActionId: (stats, hoursLeft, actionsToday) => {
      const naps = actionsToday.filter((id) => id === 'sleep_nap').length;
      const free = hoursLeft - Math.max(0, 4 - naps) * 1.5; // dành chỗ cho 4 lần chợp mắt (6h)
      const workDone = actionsToday.filter((id) => id.startsWith('work_')).length;
      if (free >= 4 && workDone < 3) return workDone < 2 ? 'work_focused' : 'work_overtime';
      if (free >= 0.5) return 'fast_food';
      return 'sleep_nap';
    },
  },
  {
    id: 'pure_sleeper',
    name: 'Trốn tránh thực tại (Chỉ ngủ & nằm)',
    description: 'Ngủ 8h ngay từ sáng (ngủ ngày), chợp mắt tiếp, rất ngại làm việc và giao tiếp.',
    decideActionId: (_stats, hoursLeft, actionsToday) => {
      if (!actionsToday.includes('sleep_deep') && hoursLeft >= 8) return 'sleep_deep';
      if (hoursLeft >= 1.5) return 'sleep_nap';
      if (hoursLeft >= 1) return 'meditate_breathe';
      return 'fast_food';
    },
  },
  {
    id: 'party_animal',
    name: 'Tiệc tùng & Hướng ngoại',
    description: 'Ưu tiên nhậu, trò chuyện bạn bè, làm việc cầm chừng đủ chi trả, vẫn ngủ đủ giấc.',
    decideActionId: (stats, hoursLeft, actionsToday) => {
      const slept = actionsToday.includes('sleep_deep');
      const free = hoursLeft - (slept ? 0 : 8); // dành chỗ cho giấc ngủ 8h
      if (stats.money < 500 && free >= 4) return 'work_focused';
      const hadBeer = actionsToday.includes('beer_party');
      if (!hadBeer && free >= 3.5 && stats.money >= 500) return 'beer_party';
      if (free >= 2.5) return 'deep_talk';
      if (!slept && hoursLeft >= 8) return 'sleep_deep';
      return 'sleep_nap';
    },
  },
  {
    id: 'balanced',
    name: 'Cân bằng có kỷ luật (Balanced Realist)',
    description: 'Ngủ đủ 8h ban đêm, làm việc 4h, tập thể dục/nấu ăn, kết nối bạn bè vừa phải.',
    decideActionId: (stats, hoursLeft, actionsToday) => {
      const slept = actionsToday.includes('sleep_deep');
      const worked = actionsToday.some((id) => id.startsWith('work_'));
      const wellness = actionsToday.some((id) => ['exercise', 'cook_tyrosine', 'short_walk'].includes(id));
      // Dành 8h cuối ngày (từ 23:00) cho giấc ngủ đêm, đúng nhịp sinh học
      const free = hoursLeft - (slept ? 0 : 8);

      if (!worked && free >= 4) return 'work_focused';
      if (!wellness && free >= 1.5 && stats.energy > 35) return 'exercise';
      if (free >= 1.5 && stats.energy < 50) return 'cook_tyrosine';
      if (stats.social < 50 && free >= 1) return 'call_family';
      if (free >= 2 && stats.willpower >= 30) return 'learn_skill';
      if (free >= 1) return 'meditate_breathe';
      if (free >= 0.5) return 'short_walk';
      if (!slept && hoursLeft >= 8) return 'sleep_deep';
      return 'meditate_breathe';
    },
  },
];

export interface DayTimelineEntry {
  day: number;
  stats: PlayerStatsPrimitive;
}

export interface RunTracePrimitive {
  survivedDays: number;
  endedEarly: boolean;
  collapseDay: number | null;
  collapseReason: 'burnout_energy' | 'burnout_mental' | 'bankrupt' | null;
  finalStats: PlayerStatsPrimitive;
  timeline: DayTimelineEntry[];
  /** Hành vi đã làm mỗi ngày (id) - dùng để tính kết cục */
  history: string[][];
}

/** Chơi 1 ván headless và ghi lại chỉ số cuối mỗi ngày (sau khi qua đêm). */
export function playOneRun(strategy: DomainStrategy, daysPerRun = 7): RunTracePrimitive {
  let currentStats = { ...INITIAL_STATS };
  let sleepDebt = 0;
  let survivedDays = 0;
  let collapseDay: number | null = null;
  let collapseReason: RunTracePrimitive['collapseReason'] = null;
  const timeline: DayTimelineEntry[] = [];
  const history: string[][] = [];

  for (let day = 1; day <= daysPerRun; day++) {
    let hoursLeft = 24;
    const actionsToday: string[] = [];

    while (hoursLeft > 0) {
      let chosenId = strategy.decideActionId(currentStats, hoursLeft, actionsToday);
      let action = DOMAIN_ACTIONS.find((a) => a.id === chosenId);

      if (!action || action.hours > hoursLeft) {
        const fallback = DOMAIN_ACTIONS.filter(
          (a) =>
            a.hours <= hoursLeft &&
            !actionLockReason(a, { clock: clockFromHoursRemaining(hoursLeft), day, actionsTodayIds: actionsToday })
        ).sort(
          (a, b) => b.hours - a.hours
        )[0];
        if (!fallback) break;
        chosenId = fallback.id;
        action = fallback;
      }

      const res = executeActionById(chosenId, currentStats, hoursLeft, actionsToday, day);
      if (!res.success) break;

      currentStats = res.newStats;
      actionsToday.push(chosenId);
      hoursLeft -= res.hoursSpent;
    }

    // Biến cố ngẫu nhiên: người chơi giả lập chọn ngẫu nhiên một lựa chọn (chỉ tính tác động chỉ số)
    if (Math.random() < 0.35) {
      const ev = rollDomainEvent(day, Math.random() * 0.45);
      if (ev) {
        const choice = ev.choices[Math.floor(Math.random() * ev.choices.length)];
        currentStats = resolveDomainChoice(ev.id, choice.id, currentStats).newStats;
      }
    }

    const nightRes = processOvernightCycle(currentStats, actionsToday, sleepDebt, day);
    currentStats = nightRes.newStats;
    sleepDebt = nightRes.newSleepDebt;
    survivedDays = day;
    history.push(actionsToday);
    timeline.push({ day, stats: currentStats });

    const lifeStatus = evaluateLifeStatus(currentStats);
    if (lifeStatus.status === 'bankrupt') {
      collapseDay = day;
      collapseReason = 'bankrupt';
      break;
    }
    if (lifeStatus.status === 'burnout') {
      collapseDay = day;
      collapseReason = currentStats.energy <= 10 ? 'burnout_energy' : 'burnout_mental';
      break;
    }
  }

  return {
    survivedDays,
    endedEarly: collapseDay !== null,
    collapseDay,
    collapseReason,
    finalStats: currentStats,
    timeline,
    history,
  };
}

export function runDomainSimulation(
  strategyId: string,
  totalRuns = 500,
  daysPerRun = 7
): SimulationResultPrimitive {
  const strategy = DOMAIN_STRATEGIES.find((s) => s.id === strategyId) || DOMAIN_STRATEGIES[4];

  let survivals = 0;
  let burnouts = 0;
  let bankruptcies = 0;

  let sumDopamine = 0;
  let sumEnergy = 0;
  let sumMental = 0;
  let sumSocial = 0;
  let sumMoney = 0;
  let sumWillpower = 0;
  let sumSurvivalDays = 0;

  for (let run = 0; run < totalRuns; run++) {
    const trace = playOneRun(strategy, daysPerRun);
    if (!trace.endedEarly) survivals++;
    else if (trace.collapseReason === 'bankrupt') bankruptcies++;
    else burnouts++;

    const f = trace.finalStats;
    sumSurvivalDays += trace.survivedDays;
    sumDopamine += f.dopamine;
    sumEnergy += f.energy;
    sumMental += f.mental;
    sumSocial += f.social;
    sumMoney += f.money;
    sumWillpower += f.willpower;
  }

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    runs: totalRuns,
    daysPerRun,
    survivalRate: Math.round((survivals / totalRuns) * 100),
    burnoutRate: Math.round((burnouts / totalRuns) * 100),
    bankruptRate: Math.round((bankruptcies / totalRuns) * 100),
    avgFinalDopamine: Math.round(sumDopamine / totalRuns),
    avgFinalEnergy: Math.round(sumEnergy / totalRuns),
    avgFinalMental: Math.round(sumMental / totalRuns),
    avgFinalSocial: Math.round(sumSocial / totalRuns),
    avgFinalMoney: Math.round(sumMoney / totalRuns),
    avgFinalWillpower: Math.round(sumWillpower / totalRuns),
    avgSurvivalDays: Number((sumSurvivalDays / totalRuns).toFixed(1)),
  };
}
