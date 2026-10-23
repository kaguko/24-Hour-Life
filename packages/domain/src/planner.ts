/**
 * PURE DOMAIN: LẬP KẾ HOẠCH MỘT HÀNH VI (đi đường + làm)
 * Kiểm tra: đủ giờ cho cả đi lẫn làm, nơi đó còn mở cửa lúc đến, hành vi không bị khóa vào lúc đó.
 */
import { DOMAIN_ACTIONS } from './actions.js';
import { actionLockReason, clockFromHoursRemaining } from './availability.js';
import { computeSkillXp, skillLevels } from './progression.js';
import { LocationId, isLocationOpen, locationDef, locationOf, openHoursLabel, travelActionId, travelHours } from './map.js';

export type PlanResult =
  | { ok: true; steps: string[]; travelHours: number; totalHours: number; endLocation: LocationId }
  | { ok: false; reason: string; travelHours: number };

export interface PlanContext {
  day: number;
  actionsTodayIds: string[];
  history: string[][];
}

const fmt = (h: number) => `${Math.round(h * 100) / 100}`;

export function planAction(actionId: string, from: LocationId, hoursRemaining: number, ctx: PlanContext): PlanResult {
  const action = DOMAIN_ACTIONS.find((a) => a.id === actionId);
  if (!action) return { ok: false, reason: 'Hành vi không tồn tại.', travelHours: 0 };

  const to = locationOf(actionId);
  const travel = travelHours(from, to);
  const total = travel + action.hours;
  if (total > hoursRemaining) {
    return {
      ok: false,
      reason: travel > 0 ? `Cần ${fmt(total)}h (đi ${fmt(travel)}h + làm ${fmt(action.hours)}h)` : 'Không đủ thời gian',
      travelHours: travel,
    };
  }

  const arriveClock = clockFromHoursRemaining(hoursRemaining - travel);
  if (!isLocationOpen(to, arriveClock)) {
    return { ok: false, reason: `${locationDef(to).name} đóng cửa (mở ${openHoursLabel(to)})`, travelHours: travel };
  }

  const lock = actionLockReason(action, {
    clock: arriveClock,
    day: ctx.day,
    actionsTodayIds: ctx.actionsTodayIds,
    skillLevels: skillLevels(computeSkillXp(ctx.history, ctx.actionsTodayIds)),
  });
  if (lock) return { ok: false, reason: lock, travelHours: travel };

  return {
    ok: true,
    steps: travel > 0 ? [travelActionId(from, to), actionId] : [actionId],
    travelHours: travel,
    totalHours: total,
    endLocation: to,
  };
}

/** Chỉ đi đến một nơi (không làm gì): ví dụ về nhà */
export function planTravel(from: LocationId, to: LocationId, hoursRemaining: number): PlanResult {
  const travel = travelHours(from, to);
  if (from === to) return { ok: false, reason: 'Bạn đang ở đây rồi.', travelHours: 0 };
  if (travel > hoursRemaining) return { ok: false, reason: `Không đủ thời gian (cần ${fmt(travel)}h)`, travelHours: travel };
  if (!isLocationOpen(to, clockFromHoursRemaining(hoursRemaining - travel))) {
    return { ok: false, reason: `${locationDef(to).name} đóng cửa (mở ${openHoursLabel(to)})`, travelHours: travel };
  }
  return { ok: true, steps: [travelActionId(from, to)], travelHours: travel, totalHours: travel, endLocation: to };
}

/** Thứ tự thử khi đi ngủ: đủ 8 tiếng, rồi ngắn dần */
const BEDTIME_IDS = ['sleep_deep', 'sleep_h7', 'sleep_h6', 'sleep_h5', 'sleep_h4', 'sleep_h3', 'sleep_h2', 'sleep_h1'];

/**
 * "Đi ngủ": về nhà (nếu đang ở ngoài) rồi ngủ lâu nhất có thể, tối đa 8 tiếng. Giờ còn thừa sau đó bỏ qua (dậy sớm).
 * Không còn nổi 1 tiếng thì trả null (thức trắng).
 */
export function planBedtime(from: LocationId, hoursRemaining: number, ctx: PlanContext): { actionId: string; plan: Extract<PlanResult, { ok: true }> } | null {
  for (const id of BEDTIME_IDS) {
    const plan = planAction(id, from, hoursRemaining, ctx);
    if (plan.ok) return { actionId: id, plan };
  }
  return null;
}
