/**
 * PURE DOMAIN: CƠN THÈM (mặt tối của thói quen)
 * Thói quen tốt bớt tốn ý chí (xem progression.ts). Thói quen xấu thì đòi lại: một thú vui nhanh đã lặp
 * HABIT_DAYS ngày liền mà hôm nay chưa chạm vào sẽ "réo gọi", làm cám dỗ xâm nhập dễ tìm đến hơn
 * (kể cả khi ý chí chưa quá thấp). Suy ra từ lịch sử hành vi nên không cần lưu thêm trạng thái.
 */
import { DOMAIN_ACTIONS } from './actions.js';
import { HABIT_DAYS, streakBeforeToday } from './progression.js';
import { traitCravingMult } from './traits.js';

/** Các thú vui nhanh đang đòi lại hôm nay (đã thành nếp, chưa làm) */
export function cravingActionIds(history: string[][], todayIds: string[]): string[] {
  return DOMAIN_ACTIONS.filter(
    (a) => a.dopaminePathway === 'fast' && a.isTemptation && !todayIds.includes(a.id) && streakBeforeToday(a.id, history) >= HABIT_DAYS
  ).map((a) => a.id);
}

/** Độ mạnh cơn thèm: số thói quen xấu đang đòi (tối đa 2), nhân theo tính cách */
export function cravingLevel(history: string[][], todayIds: string[], traitIds: string[] = []): number {
  const n = Math.min(2, cravingActionIds(history, todayIds).length);
  return n * traitCravingMult(traitIds);
}
