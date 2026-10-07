import { JourneyPrimitive, JourneyDayPrimitive } from './types';
import { DOMAIN_ACTIONS } from './actions';

/** Bỏ phần "(2 giờ)" ở cuối tên hành vi cho gọn. */
function shortTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * Tóm tắt hành trình: thời gian mỗi ngày chia theo kiểu dopamine,
 * việc làm nhiều nhất và vài nhận xét cá nhân hóa. Pure domain.
 */
export function buildJourney(history: string[][]): JourneyPrimitive {
  const days: JourneyDayPrimitive[] = history.map((ids, i) => {
    const d: JourneyDayPrimitive = { day: i + 1, fast: 0, slow: 0, work: 0, rest: 0, other: 0 };
    for (const id of ids) {
      const a = DOMAIN_ACTIONS.find((x) => x.id === id);
      if (!a) continue;
      if (a.category === 'rest') d.rest += a.hours;
      else if (a.id.startsWith('work_')) d.work += a.hours;
      else if (a.dopaminePathway === 'fast') d.fast += a.hours;
      else if (a.dopaminePathway === 'slow') d.slow += a.hours;
      else d.other += a.hours;
    }
    return d;
  });

  const counts = new Map<string, number>();
  for (const day of history) for (const id of day) counts.set(id, (counts.get(id) ?? 0) + 1);
  const topActions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => {
      const a = DOMAIN_ACTIONS.find((x) => x.id === id);
      return { id, title: a ? shortTitle(a.title) : id, count };
    });

  const insights: string[] = [];
  if (days.length > 0) {
    const worstFast = days.reduce((m, d) => (d.fast > m.fast ? d : m), days[0]);
    if (worstFast.fast >= 3) {
      insights.push(`Ngày ${worstFast.day} là ngày bạn dành nhiều thời gian nhất cho dopamine nhanh (${worstFast.fast}h).`);
    }
    const bestSlow = days.reduce((m, d) => (d.slow > m.slow ? d : m), days[0]);
    if (bestSlow.slow >= 3) {
      insights.push(`Ngày ${bestSlow.day} bạn nuôi dopamine chậm nhiều nhất (${bestSlow.slow}h).`);
    }
    const lowSleep = days.find((d) => d.rest < 5);
    if (lowSleep) {
      insights.push(`Ngày ${lowSleep.day} bạn chỉ nghỉ ${lowSleep.rest}h, cơ thể trả giá vào sáng hôm sau.`);
    }
  }

  return { days, topActions, insights: insights.slice(0, 2) };
}
