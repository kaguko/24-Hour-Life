/**
 * PURE DOMAIN: TƯƠNG TÁC XÃ HỘI
 * - resolveJointAction: áp dụng một hành vi chung cho cả nhóm cùng lúc (xem jointActions.ts).
 * - Áp lực đồng trang lứa cho hành vi cám dỗ nhóm.
 * - encourage: lời nhắc / động viên làm hồi ý chí nhẹ cho người khác.
 * Không React, không UI, không Math.random: rng được tiêm vào.
 */
import type { PlayerStatsPrimitive, SoundCue } from './types.js';
import { applyStatDeltas } from './stats.js';
import { planAction } from './planner.js';
import { DAY_HOURS, applyAction, hoursLeftOf, type PlayerState } from './gameState.js';
import { jointActionDef } from './jointActions.js';
import type { Rng } from './rng.js';

/** Tối đa bao nhiêu lời động viên mỗi người được gửi mỗi ngày */
export const MAX_ENCOURAGEMENTS_PER_DAY = 3;
export const ENCOURAGE_WILLPOWER = 4;
export const ENCOURAGE_SENDER_SOCIAL = 3;
/** Người ý chí dưới ngưỡng này bị cuốn khi có lời rủ cám dỗ */
export const PRESSURE_WILLPOWER_THRESHOLD = 40;
/** Người ý chí dưới ngưỡng này dễ sa ngã thêm khi cả nhóm cùng buông thả */
export const PEER_PRESSURE_THRESHOLD = 60;

const STAT_KEYS: Array<keyof PlayerStatsPrimitive> = ['dopamine', 'energy', 'mental', 'social', 'money', 'willpower'];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Kết nối nhận được từ một hành vi chung với `groupSize` người (kể cả mình) */
export function jointSocialGain(actionId: string, groupSize: number): number {
  const def = jointActionDef(actionId);
  if (!def?.joint) return 0;
  return (def.baseSocial ?? 0) + def.joint.socialPerPartner * Math.max(0, groupSize - 1);
}

/**
 * Xác suất một người sa ngã thêm (ở lại thêm, tốn thêm) khi cả nhóm cùng buông thả:
 * tăng khi ý chí thấp và khi nhóm đông. Ý chí từ ngưỡng trở lên: không bị.
 */
export function peerPressureChance(willpower: number, groupSize: number, maxPlayers: number): number {
  if (maxPlayers <= 1) return 0;
  const weak = clamp01((PEER_PRESSURE_THRESHOLD - willpower) / PEER_PRESSURE_THRESHOLD);
  const crowd = clamp01((groupSize - 1) / (maxPlayers - 1));
  return weak * crowd;
}

/**
 * Lời rủ cám dỗ làm người ý chí thấp bị kéo: trả mức đổi ý chí (<= 0) khi nhận lời rủ.
 * Hành vi không phải cám dỗ nhóm, hoặc ý chí đủ cao: 0.
 */
export function offerPressure(actionId: string, targetWillpower: number): number {
  const def = jointActionDef(actionId);
  if (!def?.joint?.peerPressure || targetWillpower >= PRESSURE_WILLPOWER_THRESHOLD) return 0;
  return -Math.min(3, Math.ceil((PRESSURE_WILLPOWER_THRESHOLD - targetWillpower) / 10));
}

export interface JointOutcome {
  /** Vị trí của người này trong mảng `states` đầu vào */
  index: number;
  ok: boolean;
  /** Lý do bị loại khỏi nhóm (khi ok = false) */
  reason?: string;
  state: PlayerState;
  notice: string | null;
  soundCue: SoundCue;
  /** Giờ tốn cho riêng hành vi chung (không tính đi đường) */
  hoursSpent: number;
  /** Bị áp lực đồng trang lứa kéo ở lại thêm */
  fellForPressure: boolean;
}

export interface JointResolution {
  ok: boolean;
  reason?: string;
  outcomes: JointOutcome[];
}

const rejected = (index: number, state: PlayerState, reason: string): JointOutcome => ({
  index,
  ok: false,
  reason,
  state,
  notice: null,
  soundCue: 'neutral',
  hoursSpent: 0,
  fellForPressure: false,
});

/**
 * Áp dụng hành vi chung cho nhóm. Mỗi người tự đi đường tới địa điểm (nếu cần) rồi cùng làm.
 * Người không làm được (hết giờ, đóng cửa, bị khóa, đã xong ván) bị loại; còn lại phải đủ minPlayers
 * mới thực hiện, nếu không không ai bị đổi gì. `rng` được dùng cho mọi người theo thứ tự trong `states`.
 */
export function resolveJointAction(states: PlayerState[], actionId: string, rng: Rng): JointResolution {
  const def = jointActionDef(actionId);
  if (!def?.joint) return { ok: false, reason: 'Không phải hành vi chung.', outcomes: [] };
  const { minPlayers, maxPlayers, socialPerPartner, costPerPartner, peerPressure } = def.joint;
  if (states.length > maxPlayers) {
    return { ok: false, reason: `Tối đa ${maxPlayers} người.`, outcomes: states.map((s, i) => rejected(i, s, 'Quá đông.')) };
  }

  // 1. Ai làm được?
  const plans = states.map((s) =>
    s.finished
      ? ({ ok: false as const, reason: 'Ván đã kết thúc.' })
      : planAction(actionId, s.location, hoursLeftOf(s), { day: s.day, actionsTodayIds: s.actionsTodayIds, history: s.history })
  );
  const validCount = plans.filter((p) => p.ok).length;
  if (validCount < minPlayers) {
    const firstReason = plans.find((p) => !p.ok);
    return {
      ok: false,
      reason: validCount === 0 && firstReason && !firstReason.ok ? firstReason.reason : `Cần ít nhất ${minPlayers} người cùng làm được.`,
      outcomes: states.map((s, i) => rejected(i, s, plans[i].ok ? 'Nhóm chưa đủ người.' : (plans[i] as { reason: string }).reason)),
    };
  }

  // 2. Thực hiện cho từng người làm được
  const n = validCount;
  const partners = n - 1;
  const outcomes: JointOutcome[] = states.map((s, index) => {
    const plan = plans[index];
    if (!plan.ok) return rejected(index, s, plan.reason);

    // đi đường tới nơi (các bước trước hành vi chung)
    let state = s;
    const travelSteps = plan.steps.slice(0, -1);
    if (travelSteps.length > 0) {
      const moved = applyAction(state, travelSteps, null, plan.endLocation, rng);
      if (!moved.applied || moved.blocked) return rejected(index, s, moved.blocked ?? 'Không đi tới nơi được.');
      state = moved.state;
    }

    const deltas: Partial<PlayerStatsPrimitive> = {};
    for (const key of STAT_KEYS) {
      const base = def[`base${key[0].toUpperCase()}${key.slice(1)}` as 'baseDopamine'] ?? 0;
      deltas[key] = base + (costPerPartner?.[key] ?? 0) * partners;
    }
    deltas.social = (deltas.social ?? 0) + socialPerPartner * partners;

    // áp lực đồng trang lứa: chỉ gọi rng cho hành vi có áp lực, để các hành vi khác không đổi dòng số ngẫu nhiên
    let fell = false;
    let hours = def.hours;
    if (peerPressure && rng() < peerPressureChance(state.stats.willpower, n, maxPlayers)) {
      fell = true;
      hours = Math.min(def.hours + 1, hoursLeftOf(state));
      deltas.energy = (deltas.energy ?? 0) - 16;
      deltas.mental = (deltas.mental ?? 0) - 10;
      deltas.money = (deltas.money ?? 0) - 200;
      deltas.willpower = (deltas.willpower ?? 0) - 12;
    }

    const next: PlayerState = {
      ...state,
      stats: applyStatDeltas(state.stats, deltas),
      hoursUsed: Math.min(DAY_HOURS, state.hoursUsed + hours),
      actionsTodayIds: [...state.actionsTodayIds, actionId],
      location: plan.endLocation,
    };
    const notice = def.isTemptation
      ? fell
        ? `${def.title}: cả nhóm kéo nhau ở lại thêm, bạn không đứng dậy nổi.`
        : `${def.title}: vui thật, nhưng ví và sức bạn nhẹ đi trông thấy.`
      : `${def.title}: có ${n} người đi cùng (+${Math.round(deltas.social ?? 0)} Kết nối).`;
    return {
      index,
      ok: true,
      state: next,
      notice,
      soundCue: def.isTemptation ? 'temptation' : 'healthy',
      hoursSpent: hours,
      fellForPressure: fell,
    };
  });

  return { ok: true, outcomes };
}

export interface EncourageResult {
  ok: boolean;
  reason?: string;
  sender: PlayerState;
  target: PlayerState;
}

/**
 * Gửi lời nhắc / động viên: người nhận hồi ý chí nhẹ, người gửi được thêm chút Kết nối.
 * `sentToday` là số lời đã gửi trong ngày của người gửi (server theo dõi).
 */
export function encourage(sender: PlayerState, target: PlayerState, sentToday: number): EncourageResult {
  if (sentToday >= MAX_ENCOURAGEMENTS_PER_DAY) {
    return { ok: false, reason: `Mỗi ngày chỉ động viên được ${MAX_ENCOURAGEMENTS_PER_DAY} lần.`, sender, target };
  }
  if (target.finished) return { ok: false, reason: 'Người này đã xong ván.', sender, target };
  return {
    ok: true,
    sender: { ...sender, stats: applyStatDeltas(sender.stats, { social: ENCOURAGE_SENDER_SOCIAL }) },
    target: { ...target, stats: applyStatDeltas(target.stats, { willpower: ENCOURAGE_WILLPOWER }) },
  };
}
