/**
 * PURE DOMAIN: ĐIỀU KIỆN MỞ KHÓA HÀNH VI
 * Một số hành vi chỉ làm được vào khung giờ, ngày trong tuần hoặc số lần nhất định.
 */
import { ActionPrimitive } from './types';

const WAKE_HOUR = 7;
const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

/** Giờ đồng hồ (0-24) khi còn `hoursRemaining` giờ của ngày (ngày bắt đầu lúc 07:00) */
export const clockFromHoursRemaining = (hoursRemaining: number): number =>
  (WAKE_HOUR + (24 - hoursRemaining)) % 24;

const inWindow = (h: number, from: number, to: number) => (from <= to ? h >= from && h < to : h >= from || h < to);

const fmtHour = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}h`;

/** Lý do hành vi đang bị khóa, hoặc null nếu làm được. */
export function actionLockReason(
  action: ActionPrimitive,
  ctx: { clock: number; day: number; actionsTodayIds: string[] }
): string | null {
  if (action.minDay && ctx.day < action.minDay) return `Mở từ ngày ${action.minDay}`;
  if (action.onlyDays && !action.onlyDays.includes(ctx.day)) {
    return `Chỉ vào ${action.onlyDays.map((d) => WEEKDAYS[d - 1]).join(' / ')}`;
  }
  if (action.window && !inWindow(ctx.clock, action.window[0], action.window[1])) {
    return `Chỉ ${fmtHour(action.window[0])}–${fmtHour(action.window[1])}`;
  }
  if (action.maxPerDay && ctx.actionsTodayIds.filter((id) => id === action.id).length >= action.maxPerDay) {
    return action.maxPerDay === 1 ? 'Đã làm hôm nay' : `Tối đa ${action.maxPerDay} lần/ngày`;
  }
  return null;
}
