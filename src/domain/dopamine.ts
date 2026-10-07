import { DOMAIN_ACTIONS } from './actions';

/**
 * Sụp dopamine (crash) chỉ do dopamine NHANH gây ra, không phải do con số dopamine tổng.
 * Dopamine cao nhờ học tập, vận động, trò chuyện là lành mạnh và không bị phạt.
 */

/** Ngưỡng tổng dopamine thu được từ hành vi nhanh trong ngày (≈ 1.5 hành vi cám dỗ). */
export const FAST_CRASH_GAIN = 45;
/** Hoặc số giờ dành cho hành vi nhanh trong ngày. */
export const FAST_CRASH_HOURS = 3.5;

export interface FastDopamineSummary {
  /** Tổng dopamine tức thì từ các hành vi nhanh hôm nay */
  gain: number;
  /** Tổng số giờ dành cho hành vi nhanh hôm nay */
  hours: number;
  /** Có nguy cơ sụp dopamine vào sáng hôm sau không */
  atRisk: boolean;
}

export function summarizeFastDopamine(actionIdsToday: string[]): FastDopamineSummary {
  let gain = 0;
  let hours = 0;
  for (const id of actionIdsToday) {
    const a = DOMAIN_ACTIONS.find((x) => x.id === id);
    if (!a || a.dopaminePathway !== 'fast') continue;
    gain += Math.max(0, a.baseDopamine ?? 0);
    hours += a.hours;
  }
  return { gain, hours, atRisk: gain >= FAST_CRASH_GAIN || hours >= FAST_CRASH_HOURS };
}
