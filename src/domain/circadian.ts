/**
 * PURE DOMAIN: NHỊP SINH HỌC (Circadian rhythm)
 * Ngày luôn bắt đầu lúc 07:00; giờ bắt đầu của mỗi hành vi suy ra từ thứ tự và thời lượng.
 * Ngủ ban ngày không bù được ngủ đêm; chợp mắt buổi trưa thì có lợi.
 */
import { DOMAIN_ACTIONS } from './actions';

export const DAY_START_HOUR = 7;

/** Giờ đồng hồ (0-24) lúc bắt đầu mỗi hành vi trong ngày */
export function actionStartClocks(actionIds: string[]): number[] {
  let used = 0;
  return actionIds.map((id) => {
    const start = (DAY_START_HOUR + used) % 24;
    used += DOMAIN_ACTIONS.find((a) => a.id === id)?.hours ?? 0;
    return start;
  });
}

export type SleepTiming = 'night' | 'day' | 'twilight' | 'midday_nap' | 'evening_nap' | 'nap';

export interface SleepSegment {
  id: string;
  hours: number;
  start: number;
  timing: SleepTiming;
  /** Hệ số hiệu quả: số giờ ngủ "thật" = hours * efficiency */
  efficiency: number;
}

const inRange = (h: number, from: number, to: number) => (from <= to ? h >= from && h < to : h >= from || h < to);

/** Phân loại một lần ngủ theo giờ bắt đầu */
export function classifySleep(id: string, start: number): { timing: SleepTiming; efficiency: number } {
  if (id === 'sleep_nap') {
    if (inRange(start, 12, 15)) return { timing: 'midday_nap', efficiency: 1 };
    if (inRange(start, 17, 20)) return { timing: 'evening_nap', efficiency: 0.7 };
    return { timing: 'nap', efficiency: 1 };
  }
  // Giấc ngủ dài
  if (inRange(start, 20, 3.01)) return { timing: 'night', efficiency: 1 };
  if (inRange(start, 7, 17)) return { timing: 'day', efficiency: 0.6 };
  return { timing: 'twilight', efficiency: 0.8 }; // 17-20h hoặc 3-7h: lệch nhịp vừa phải
}

/** Các lần ngủ trong ngày kèm giờ bắt đầu và hiệu quả */
export function sleepSegments(actionIds: string[]): SleepSegment[] {
  const starts = actionStartClocks(actionIds);
  const out: SleepSegment[] = [];
  actionIds.forEach((id, i) => {
    const action = DOMAIN_ACTIONS.find((a) => a.id === id);
    if (!action || action.category !== 'rest') return;
    const { timing, efficiency } = classifySleep(id, starts[i]);
    out.push({ id, hours: action.hours, start: starts[i], timing, efficiency });
  });
  return out;
}

/** Gợi ý cho UI: ngủ ngay bây giờ (sau `hoursUsed` giờ) thì hiệu quả thế nào */
export function sleepAdviceNow(actionId: string, hoursUsed: number): { timing: SleepTiming; efficiency: number } {
  return classifySleep(actionId, (DAY_START_HOUR + hoursUsed) % 24);
}
