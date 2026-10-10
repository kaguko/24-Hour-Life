/**
 * PURE DOMAIN: TRẠNG THÁI VÁN CHƠI + CÁC BƯỚC CHUYỂN TRẠNG THÁI
 * Rule 1: NO React, NO UI, NO localStorage, NO Math.random (rng được tiêm vào).
 * Hook/adapter chỉ giữ PlayerState và gọi các hàm này; mọi luật nằm ở đây.
 * Hộp thoại đang chờ người chơi (sự kiện, cám dỗ, báo cáo sáng...) là trạng thái UI, không nằm trong PlayerState.
 */
import type { ActionResultPrimitive, EventPrimitive, NightResultPrimitive, PlayerStatsPrimitive, SoundCue } from './types';
import { INITIAL_STATS, applyStatDeltas, evaluateLifeStatus } from './stats';
import { DOMAIN_ACTIONS, executeActionById } from './actions';
import type { LocationId } from './map';
import { clockFromHoursRemaining } from './availability';
import { processOvernightCycle } from './consequence';
import { resolveDomainChoice, rollDomainEvent, rollPlaceEvent } from './events';
import { INTRUSIONS, MAX_INTRUSION_ROUNDS, resistCost, rollIntrusion } from './intrusion';
import type { IntrusionDef, IntrusionKind } from './intrusion';
import { TIER_LABEL, bigEventDef, pickBigEvent } from './bigEvents';
import type { BigEventOutcome, BigEventState, BigEventTier } from './bigEvents';
import { BIG_EVENT_ACTION_ID, BIG_EVENT_HOURS } from './bigEventAction';
import { pickGoalIds } from './goals';
import type { DayGrade } from './dayRecap';
import type { Rng } from './rng';

export const DAY_HOURS = 24;
/** Ván kết thúc sau ngày này (hoặc sớm hơn nếu sụp đổ) */
export const LAST_DAY = 7;

/** Toàn bộ tiến trình ván chơi (phần được lưu). */
export interface PlayerState {
  day: number;
  hoursUsed: number;
  stats: PlayerStatsPrimitive;
  sleepDebt: number;
  actionsTodayIds: string[];
  /** Hành vi đã làm của các ngày đã qua */
  history: string[][];
  /** Chỉ số lúc đầu ngày (để tổng kết cả ngày) */
  dayStartStats: PlayerStatsPrimitive;
  dayGrades: DayGrade[];
  goalIds: string[];
  location: LocationId;
  finished: boolean;
  bigEvent: BigEventState;
  intrusionsToday: number;
}

/** Cám dỗ đang xâm nhập: round tăng mỗi lần chiều theo, dừng lại càng khó */
export interface IntrusionState {
  kind: IntrusionKind;
  round: number;
  chunks: number;
  hoursSpent: number;
  note: string | null;
}

export function newPlayerState(goalIds: string[], bigEvent: BigEventState): PlayerState {
  return {
    day: 1,
    hoursUsed: 0,
    stats: INITIAL_STATS,
    sleepDebt: 0,
    actionsTodayIds: [],
    history: [],
    dayStartStats: INITIAL_STATS,
    dayGrades: [],
    goalIds,
    location: 'home',
    finished: false,
    bigEvent,
    intrusionsToday: 0,
  };
}

/** Ván mới: bốc mục tiêu rồi sự kiện lớn (thứ tự gọi rng cố định) */
export function createPlayerState(rng: Rng): PlayerState {
  const goalIds = pickGoalIds(rng);
  return newPlayerState(goalIds, pickBigEvent(rng));
}

export const hoursLeftOf = (state: PlayerState): number => Math.max(0, DAY_HOURS - state.hoursUsed);

export interface ApplyActionResult {
  state: PlayerState;
  /** Có ít nhất một bước được thực hiện */
  applied: boolean;
  /** Lý do bước kế tiếp bị chặn (nếu có) */
  blocked: string | null;
  /** Có bước nào không phải hành vi thật (đi đường) */
  traveled: boolean;
  /** Kết quả bước thực hiện cuối cùng */
  last: ActionResultPrimitive | null;
}

/**
 * Chạy lần lượt các bước (đi đường rồi làm). Nếu không bước nào làm được, state giữ nguyên.
 * Nếu một bước giữa chừng bị chặn, các bước trước vẫn được tính nhưng người chơi ở yên chỗ cũ.
 */
export function applyAction(
  state: PlayerState,
  steps: string[],
  realActionId: string | null,
  endLocation: LocationId,
  rng: Rng
): ApplyActionResult {
  let stats = state.stats;
  let ids = state.actionsTodayIds;
  let left = hoursLeftOf(state);
  let last: ActionResultPrimitive | null = null;
  let traveled = false;
  let blocked: string | null = null;

  for (const stepId of steps) {
    const r = executeActionById(stepId, stats, left, ids, state.day, state.history, rng);
    if (!r.success) {
      blocked = r.notice;
      break;
    }
    stats = r.newStats;
    ids = [...ids, stepId];
    left -= r.hoursSpent;
    last = r;
    if (stepId !== realActionId) traveled = true;
  }

  if (!last) return { state, applied: false, blocked, traveled, last: null };

  return {
    state: {
      ...state,
      stats,
      hoursUsed: DAY_HOURS - left,
      actionsTodayIds: ids,
      location: blocked ? state.location : endLocation,
    },
    applied: true,
    blocked,
    traveled,
    last,
  };
}

export interface DayEventContext {
  traveled: boolean;
  realActionId: string | null;
  endLocation: LocationId;
  blocked: string | null;
  /** Đang có sự kiện / cám dỗ mở thì không bốc thêm */
  hasActiveEvent: boolean;
  hasIntrusion: boolean;
}

export interface DayEventRoll {
  event: EventPrimitive | null;
  intrusion: IntrusionDef | null;
}

/**
 * Sau một hành động: bốc sự kiện (trên đường, tại địa điểm, hoặc chung; tối đa một) rồi cám dỗ xâm nhập.
 * `state` là trạng thái SAU applyAction.
 */
export function rollDayEvents(state: PlayerState, ctx: DayEventContext, rng: Rng): DayEventRoll {
  const { day, hoursUsed } = state;
  const left = DAY_HOURS - hoursUsed;
  let event: EventPrimitive | null = null;

  if (!ctx.hasActiveEvent && !ctx.blocked) {
    if (ctx.traveled && rng() < 0.3) event = rollPlaceEvent('road', day, rng);
    if (!event && ctx.realActionId && ctx.endLocation !== 'home' && rng() < 0.2) event = rollPlaceEvent(ctx.endLocation, day, rng);
    if (!event && hoursUsed >= 8 && hoursUsed <= 18 && rng() < 0.35) event = rollDomainEvent(day, rng);
  }

  let intrusion: IntrusionDef | null = null;
  if (!event && !ctx.hasActiveEvent && !ctx.hasIntrusion && !ctx.blocked && hoursUsed < DAY_HOURS) {
    const ids = state.actionsTodayIds;
    const lastId = ctx.realActionId ?? ids[ids.length - 1];
    const lastAction = DOMAIN_ACTIONS.find((a) => a.id === lastId);
    intrusion = rollIntrusion(
      state.stats,
      {
        clock: clockFromHoursRemaining(left),
        hoursLeft: left,
        intrusionsToday: state.intrusionsToday,
        lastActionId: lastId,
        lastWasRest: lastAction?.category === 'rest',
      },
      rng
    );
  }

  return { event, intrusion };
}

/** Một cám dỗ xuất hiện: đếm vào số lần trong ngày */
export const registerIntrusion = (state: PlayerState): PlayerState => ({ ...state, intrusionsToday: state.intrusionsToday + 1 });

/** Hết ngày: tính hậu quả qua đêm, ghi lịch sử và hạng ngày. Chưa sang ngày mới (xem advanceDay). */
export function endDay(state: PlayerState, rng: Rng): { state: PlayerState; night: NightResultPrimitive } {
  const night = processOvernightCycle(
    state.stats,
    state.actionsTodayIds,
    state.sleepDebt,
    state.day,
    state.dayStartStats,
    rng
  );
  const grade = night.recap?.grade;
  return {
    night,
    state: {
      ...state,
      dayGrades: grade ? [...state.dayGrades, grade] : state.dayGrades,
      history: [...state.history, state.actionsTodayIds],
      stats: night.newStats,
      sleepDebt: night.newSleepDebt,
    },
  };
}

/** Đặt lại các trường theo ngày (sáng hôm sau): chỉ số buổi sáng là mốc so sánh cho ngày mới */
function resetDayFields(state: PlayerState): PlayerState {
  return {
    ...state,
    actionsTodayIds: [],
    hoursUsed: 0,
    location: 'home',
    intrusionsToday: 0,
    dayStartStats: state.stats,
  };
}

/** Sang ngày mới, không xét kết thúc ván (dùng cho mô phỏng dài hơn LAST_DAY ngày) */
export const startNextDay = (state: PlayerState): PlayerState => ({ ...resetDayFields(state), day: state.day + 1 });

/** Sáng hôm sau: kết thúc ván nếu sụp đổ giữa chừng hoặc đã đủ LAST_DAY ngày, ngược lại sang ngày mới */
export function advanceDay(state: PlayerState): { state: PlayerState; collapsed: boolean } {
  const collapsed = evaluateLifeStatus(state.stats).isGameOver;
  if (collapsed || state.day >= LAST_DAY) return { state: { ...resetDayFields(state), finished: true }, collapsed };
  return { state: startNextDay(state), collapsed };
}

/** Chọn một lựa chọn của sự kiện đang hiện */
export function applyEventChoice(state: PlayerState, eventId: string, choiceId: string): PlayerState {
  const res = resolveDomainChoice(eventId, choiceId, state.stats);
  return { ...state, stats: res.newStats, hoursUsed: Math.min(DAY_HOURS, state.hoursUsed + res.timeHours) };
}

export interface IntrusionAnswerResult {
  state: PlayerState;
  /** Cám dỗ sau khi trả lời (null = đã kết thúc) */
  intrusion: IntrusionState | null;
  /** undefined = giữ nguyên thông báo hiện tại */
  notice?: string;
  cue: SoundCue | null;
  /** Hành vi vừa thực hiện (cho cảnh 3D) */
  actionId: string | null;
  /** Hết 24h: cần qua đêm */
  endsDay: boolean;
}

/** Trả lời cám dỗ: cưỡng lại (tốn ý chí, nếu đủ) hoặc chiều theo (mất giờ, có thể bị kéo vào vòng lặp) */
export function applyIntrusionAnswer(
  state: PlayerState,
  intrusion: IntrusionState,
  choice: 'resist' | 'yield',
  rng: Rng
): IntrusionAnswerResult {
  const def = INTRUSIONS[intrusion.kind];
  const cost = resistCost(intrusion.round);

  if (choice === 'resist' && state.stats.willpower >= cost) {
    return {
      state: { ...state, stats: applyStatDeltas(state.stats, { willpower: -cost, mental: 2 }) },
      intrusion: null,
      notice:
        intrusion.chunks === 0
          ? `Bạn cưỡng lại được "${def.title}" (-${cost} ý chí).`
          : `Cuối cùng bạn cũng dừng lại được, sau ${intrusion.hoursSpent}h.`,
      cue: 'healthy',
      actionId: null,
      endsDay: false,
    };
  }

  // Chiều theo, hoặc muốn dừng nhưng ý chí không đủ
  const left = hoursLeftOf(state);
  const r = executeActionById(def.actionId, state.stats, left, state.actionsTodayIds, state.day, state.history, rng);
  if (!r.success) return { state, intrusion: null, cue: null, actionId: null, endsDay: false };

  const nextLeft = left - r.hoursSpent;
  const spent = intrusion.hoursSpent + r.hoursSpent;
  const next: PlayerState = {
    ...state,
    stats: r.newStats,
    hoursUsed: DAY_HOURS - nextLeft,
    actionsTodayIds: [...state.actionsTodayIds, def.actionId],
  };
  const base = { state: next, cue: 'temptation' as SoundCue, actionId: def.actionId, endsDay: nextLeft <= 0 };

  if (def.loop && nextLeft >= 0.5 && intrusion.round < MAX_INTRUSION_ROUNDS) {
    return {
      ...base,
      intrusion: {
        ...intrusion,
        round: intrusion.round + 1,
        chunks: intrusion.chunks + 1,
        hoursSpent: spent,
        note: choice === 'resist' ? 'Bạn cố dừng nhưng ý chí không còn đủ. Video kế tiếp đã chạy.' : null,
      },
    };
  }
  return { ...base, intrusion: null, notice: `Bạn đã mất ${spent}h cho "${def.title}".` };
}

/** Xác nhận kết quả sự kiện lớn: áp tác động, tốn giờ, ghi kết quả */
export function applyBigEventOutcome(
  state: PlayerState,
  outcome: BigEventOutcome
): { state: PlayerState; notice: string; cue: SoundCue; endsDay: boolean } {
  const spend = Math.min(BIG_EVENT_HOURS, hoursLeftOf(state));
  const hoursUsed = state.hoursUsed + spend;
  return {
    state: {
      ...state,
      stats: applyStatDeltas(state.stats, outcome.deltas),
      hoursUsed,
      actionsTodayIds: [...state.actionsTodayIds, BIG_EVENT_ACTION_ID],
      bigEvent: { ...state.bigEvent, result: { tier: outcome.tier as BigEventTier, score: outcome.score } },
    },
    notice: `${bigEventDef(state.bigEvent.id).title}: ${TIER_LABEL[outcome.tier]} (${outcome.score}/100).`,
    cue: outcome.tier === 'great' || outcome.tier === 'pass' ? 'victory' : 'defeat',
    endsDay: hoursUsed >= DAY_HOURS,
  };
}
