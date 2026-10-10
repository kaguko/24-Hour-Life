/**
 * PURE DOMAIN: TỔNG KẾT MỘT NGÀY (Day recap)
 * Danh hiệu + hạng cho ngày vừa qua, chỉ số thay đổi, quyết định tốt/tệ nhất và gợi ý cho ngày mai.
 */
import { PlayerStatsPrimitive } from './types.js';
import { DOMAIN_ACTIONS } from './actions.js';
import type { PhilosophicalQuote } from './quotes.js';

export type DayGrade = 'S' | 'A' | 'B' | 'C' | 'D';
type Theme = PhilosophicalQuote['theme'];

export interface DayRecapPrimitive {
  grade: DayGrade;
  score: number;
  emoji: string;
  title: string;
  summary: string;
  /** Thay đổi từ đầu ngày đến sáng hôm sau */
  statChanges: Partial<PlayerStatsPrimitive>;
  best?: { title: string; reason: string };
  worst?: { title: string; reason: string };
  tip: string;
}

const DAY_TITLE: Record<Theme, { emoji: string; title: string }> = {
  fast_dopamine: { emoji: '⚡', title: 'Ngày Của Những Cú Hit Rẻ Tiền' },
  slow_dopamine: { emoji: '🌱', title: 'Ngày Gieo Hạt' },
  flow_study: { emoji: '📚', title: 'Ngày Dòng Chảy' },
  discipline_willpower: { emoji: '🧱', title: 'Ngày Kỷ Luật' },
  burnout_rest: { emoji: '🥵', title: 'Ngày Vắt Kiệt' },
  rest_recovery: { emoji: '🔋', title: 'Ngày Sạc Đầy' },
  financial_freedom: { emoji: '💸', title: 'Ngày Cháy Túi' },
  social_connection: { emoji: '🌧️', title: 'Ngày Một Mình' },
  folly_recklessness: { emoji: '😈', title: 'Ngày Bốc Đồng' },
  balance_moderation: { emoji: '⚖️', title: 'Ngày Lệch Nhịp' },
  apathy_meaning: { emoji: '🌫️', title: 'Ngày Vô Vị' },
};

/** Gợi ý hành động cụ thể cho ngày mai, theo điểm yếu nổi bật của hôm qua */
const TIP: Record<Theme, string> = {
  fast_dopamine: 'Ngày mai thử thay một lượt lướt mạng bằng đi bộ 20 phút hoặc gọi điện cho ai đó. Ý chí sẽ không bị rút cạn từ sáng.',
  slow_dopamine: 'Giữ nhịp này! Thêm một hoạt động kết nối (trò chuyện, gọi bố mẹ) để cân bằng cả tinh thần lẫn xã hội.',
  flow_study: 'Học sâu rất tốt, nhưng xen kẽ vận động hoặc thiền để năng lượng không cạn vào cuối tuần.',
  discipline_willpower: 'Tiếp tục xây thói quen nhỏ mỗi ngày, đừng đợi có động lực mới bắt đầu.',
  burnout_rest: 'Ưu tiên ngủ đủ 8 tiếng ban đêm trước khi nhận thêm việc. Cơ thể đang cạn pin.',
  rest_recovery: 'Bạn đã sạc đầy pin. Đây là ngày tốt để học thứ khó hoặc tập luyện.',
  financial_freedom: 'Tiền đang âm dần: dành 4 giờ làm việc tập trung và tránh mua sắm bốc đồng ngày mai.',
  social_connection: 'Bạn đang cô lập dần. Một cuộc gọi cho gia đình hoặc trò chuyện sâu với bạn bè sẽ kéo tinh thần lên.',
  folly_recklessness: 'Cảm giác mạnh chóng tàn. Ngày mai thử vuốt ve chú chó thay vì chọc nó, nó sẽ "trả ơn" xứng đáng.',
  balance_moderation: 'Hôm qua có chỗ quá đà, có chỗ thiếu hụt. Ngày mai thử chia đều: 8h ngủ đêm, 4h làm, phần còn lại cho vận động và kết nối.',
  apathy_meaning: 'Khi mọi thứ vô vị, hãy bắt đầu từ việc nhỏ có ý nghĩa: dọn phòng, nấu một bữa ngon, hoặc đi bộ phơi nắng.',
};

/** Giá trị "thật" của một hành vi (bỏ qua dopamine nhanh vì nó sẽ sụp lại qua đêm) */
function actionValue(id: string): number {
  const a = DOMAIN_ACTIONS.find((x) => x.id === id);
  if (!a) return 0;
  const crash = a.dopaminePathway === 'fast' ? -8 * a.hours : 0;
  // Tiền cũng có giá trị: làm việc nuôi sống bạn, mua sắm bốc đồng thì ngược lại
  return (a.baseMental ?? 0) + (a.baseWillpower ?? 0) + (a.baseSocial ?? 0) + 0.5 * (a.baseEnergy ?? 0) + (a.baseMoney ?? 0) / 20 + crash;
}

function reasonOf(id: string): string {
  const a = DOMAIN_ACTIONS.find((x) => x.id === id);
  if (!a) return '';
  const parts: Array<[string, number | undefined]> = [
    ['ý chí', a.baseWillpower],
    ['tinh thần', a.baseMental],
    ['năng lượng', a.baseEnergy],
    ['kết nối', a.baseSocial],
  ];
  return parts
    .filter(([, v]) => v)
    .sort((x, y) => Math.abs(y[1] ?? 0) - Math.abs(x[1] ?? 0))
    .slice(0, 2)
    .map(([k, v]) => `${(v ?? 0) > 0 ? '+' : ''}${v} ${k}`)
    .join(', ');
}

const shortTitle = (id: string) => (DOMAIN_ACTIONS.find((a) => a.id === id)?.title ?? id).split('(')[0].trim();

export function buildDayRecap(
  actionIds: string[],
  /** Các hậu quả trong đêm: chủ đề + sức nặng (âm = xấu) */
  drivers: Array<{ theme: Theme; weight: number }>,
  startStats: PlayerStatsPrimitive,
  endStats: PlayerStatsPrimitive,
  restedHours: number,
  /** Chủ đề tổng hợp (dùng cho câu trích dẫn) */
  overallTheme: Theme
): DayRecapPrimitive {
  const acts = actionIds.map((id) => DOMAIN_ACTIONS.find((a) => a.id === id)).filter((a): a is (typeof DOMAIN_ACTIONS)[number] => !!a);
  const sum = (f: (a: (typeof acts)[number]) => boolean) => acts.filter(f).reduce((s, a) => s + a.hours, 0);
  const fastH = sum((a) => a.dopaminePathway === 'fast');
  const slowH = sum((a) => a.dopaminePathway === 'slow' && a.category !== 'rest');
  const workH = sum((a) => a.category === 'work');
  const sleepH = sum((a) => a.category === 'rest');

  const keys: Array<keyof PlayerStatsPrimitive> = ['energy', 'mental', 'willpower', 'social', 'dopamine', 'money'];
  const statChanges: Partial<PlayerStatsPrimitive> = {};
  for (const k of keys) statChanges[k] = Math.round(endStats[k] - startStats[k]);

  // Điểm ngày: chỉ số lõi thay đổi thế nào + thói quen trong ngày
  const core = ((statChanges.energy ?? 0) + (statChanges.mental ?? 0) + (statChanges.willpower ?? 0) + (statChanges.social ?? 0)) / 4;
  // Chỉ số hay chạm trần 100 nên chỉ chiếm phần nhỏ; cách dùng thời gian mới là chính
  const raw =
    50 +
    Math.max(-40, Math.min(30, core)) * 0.6 +
    Math.min(30, slowH * 3) -
    fastH * 6 +
    (restedHours >= 7 ? 8 : restedHours < 5 ? -15 : -5) +
    (workH >= 4 && workH <= 10 ? 4 : workH > 10 ? -6 : 0) +
    ((statChanges.money ?? 0) < -400 ? -6 : 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const grade: DayGrade = score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D';

  // Ngủ là nền tảng, không tính là "quyết định" tốt/tệ nhất
  const unique = [...new Set(actionIds)].filter((id) => {
    const c = DOMAIN_ACTIONS.find((a) => a.id === id)?.category;
    return c !== 'rest' && c !== 'travel';
  });
  const ranked = unique.map((id) => ({ id, v: actionValue(id) })).sort((x, y) => y.v - x.v);
  const best = ranked[0] && ranked[0].v > 0 ? { title: shortTitle(ranked[0].id), reason: reasonOf(ranked[0].id) } : undefined;
  const lastR = ranked[ranked.length - 1];
  const worst = lastR && lastR.v < -10 && lastR.id !== ranked[0]?.id ? { title: shortTitle(lastR.id), reason: reasonOf(lastR.id) } : undefined;

  // Danh hiệu khớp với hạng: ngày tốt -> điều tích cực nổi bật; ngày tệ -> hậu quả xấu nặng nhất
  const studyH = sum((a) => a.id === 'study_deep' || a.id === 'learn_skill');
  // "Học tập chuyên môn" thuộc nhóm công việc nên đếm riêng, không dựa vào giờ dopamine chậm
  const positiveTheme: Theme =
    studyH >= 4 || (studyH > 0 && studyH * 2 >= slowH) ? 'flow_study' : slowH >= 2 ? 'slow_dopamine' : 'rest_recovery';
  const worstBad = drivers.filter((x) => x.weight < 0).sort((x, y) => x.weight - y.weight)[0]?.theme;
  const titleTheme: Theme =
    grade === 'S' || grade === 'A' ? positiveTheme : grade === 'B' ? overallTheme : worstBad ?? overallTheme;
  // Gợi ý: sửa điểm yếu nặng nhất; ngày tốt không có điểm yếu đáng kể thì khuyến khích giữ nhịp
  const tipTheme: Theme = grade === 'S' || grade === 'A' ? positiveTheme : worstBad ?? overallTheme;

  const parts: string[] = [];
  if (slowH) parts.push(`${slowH}h dopamine chậm`);
  if (fastH) parts.push(`${fastH}h dopamine nhanh`);
  if (workH) parts.push(`${workH}h làm việc`);
  parts.push(`${sleepH}h ngủ${restedHours < sleepH ? ` (chỉ tương đương ${restedHours}h ngủ đêm)` : ''}`);

  const { emoji, title } = DAY_TITLE[titleTheme];
  return { grade, score, emoji, title, summary: `Hôm qua bạn dành ${parts.join(', ')}.`, statChanges, best, worst, tip: TIP[tipTheme] };
}
