import { PHILOSOPHICAL_QUOTES, type PhilosophicalQuote, type Rng } from '@24h/domain';

/**
 * Blob: linh vật của game (bộ sticker lockedin / win / cooked / loss / rizz). Đứng trên bục ở công viên thành phố,
 * nói một câu triết lý sau mỗi vài giây; đổi nét mặt theo chủ đề câu nói và chọn câu hợp với chỉ số đang yếu nhất của bạn.
 * File này thuần logic (không three.js, không React) để test được.
 */

export type MascotMood = 'lockedin' | 'win' | 'cooked' | 'loss' | 'rizz';
type Theme = PhilosophicalQuote['theme'];

export interface MascotLine {
  id: string;
  quote: string;
  author: string;
  role: string;
  mood: MascotMood;
  theme: Theme | 'greeting';
}

/** Toạ độ của bục Blob (không gian three.js). Phải khớp polar(335°, r = 5) trong art/blender/build_city_details.py. */
export const MASCOT_POS = { x: Math.cos((335 * Math.PI) / 180) * 5, z: Math.sin((335 * Math.PI) / 180) * 5 };
/** Mặt trên của bục (m) */
export const MASCOT_STAGE_TOP = 0.55;

export const MOOD_TAG: Record<MascotMood, { label: string; emoji: string; color: number; css: string }> = {
  lockedin: { label: 'LOCKED IN', emoji: '🔒', color: 0x4aa8ff, css: 'bg-sky-500/90 text-white' },
  win: { label: 'CHILL & WIN', emoji: '👑', color: 0xffcf3d, css: 'bg-amber-400 text-amber-950' },
  cooked: { label: 'COOKED', emoji: '🔥', color: 0xff8a3d, css: 'bg-orange-500 text-white' },
  loss: { label: 'SẬP NGUỒN', emoji: '🌧️', color: 0x7a93ff, css: 'bg-indigo-400 text-white' },
  rizz: { label: 'RIZZ', emoji: '😎', color: 0xc77dff, css: 'bg-fuchsia-500 text-white' },
};

const MOOD_OF_THEME: Record<Theme, MascotMood> = {
  discipline_willpower: 'lockedin',
  flow_study: 'lockedin',
  slow_dopamine: 'win',
  balance_moderation: 'win',
  apathy_meaning: 'win',
  fast_dopamine: 'cooked',
  folly_recklessness: 'cooked',
  burnout_rest: 'loss',
  rest_recovery: 'loss',
  financial_freedom: 'loss',
  social_connection: 'rizz',
};
export const moodForTheme = (theme: Theme): MascotMood => MOOD_OF_THEME[theme];

/** Thêm vài câu ngắn, dễ nhớ (tục ngữ, Khắc Kỷ...) để Blob không lặp lại quá nhanh. Kho chính vẫn là PHILOSOPHICAL_QUOTES của domain. */
const EXTRA: Array<Omit<MascotLine, 'mood'> & { theme: Theme }> = [
  { id: 'x_kim', quote: 'Có công mài sắt, có ngày nên kim.', author: 'Tục ngữ Việt Nam', role: 'Kinh nghiệm dân gian', theme: 'discipline_willpower' },
  { id: 'x_non', quote: 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.', author: 'Ca dao Việt Nam', role: 'Kinh nghiệm dân gian', theme: 'social_connection' },
  { id: 'x_seneca_time', quote: 'Không phải ta có quá ít thời gian, mà là ta lãng phí quá nhiều.', author: 'Seneca', role: 'Triết gia Khắc Kỷ La Mã', theme: 'discipline_willpower' },
  { id: 'x_marcus_morning', quote: 'Mỗi sáng thức dậy, hãy tự nhủ: hôm nay mình phải làm việc của một con người.', author: 'Marcus Aurelius', role: 'Hoàng đế & Triết gia La Mã', theme: 'discipline_willpower' },
  { id: 'x_epictetus', quote: 'Có những điều ta kiểm soát được và có những điều không. Hãy chỉ lo cho điều thứ nhất.', author: 'Epictetus', role: 'Triết gia Khắc Kỷ', theme: 'apathy_meaning' },
  { id: 'x_laotzu_enough', quote: 'Biết đủ là đủ. Người biết đủ luôn giàu có.', author: 'Lão Tử', role: 'Triết gia Đạo gia', theme: 'financial_freedom' },
  { id: 'x_confucius_hurry', quote: 'Dục tốc bất đạt: càng vội càng chậm.', author: 'Khổng Tử', role: 'Nhà tư tưởng Nho gia', theme: 'burnout_rest' },
  { id: 'x_durant_habit', quote: 'Ta là những gì ta lặp đi lặp lại mỗi ngày. Vì thế, sự xuất sắc không phải một hành động mà là một thói quen.', author: 'Will Durant', role: 'Sử gia, tóm lược ý của Aristotle', theme: 'discipline_willpower' },
];

export const MASCOT_LINES: readonly MascotLine[] = [
  ...PHILOSOPHICAL_QUOTES.map((q) => ({ id: q.id, quote: q.quote, author: q.author, role: q.role, theme: q.theme, mood: MOOD_OF_THEME[q.theme] })),
  ...EXTRA.map((q) => ({ ...q, mood: MOOD_OF_THEME[q.theme] })),
];

/** Lời chào đầu tiên khi vào thành phố */
export const greeting = (name: string): MascotLine => ({
  id: 'greeting',
  quote: `Chào ${name}! Mình là Blob. Mỗi ngày một câu để bạn đỡ bị cooked, nhớ ghé nghe nhé.`,
  author: 'Blob',
  role: 'Linh vật của phố',
  theme: 'greeting',
  mood: 'win',
});

export interface MascotStats {
  energy: number;
  mental: number;
  willpower: number;
  dopamine: number;
  social: number;
  /** nghìn VNĐ */
  money: number;
}

/** Chủ đề nên nói với người này lúc này (rỗng nếu mọi chỉ số ổn). Thứ tự = mức ưu tiên. */
export function urgentThemes(s: MascotStats): Theme[] {
  const out: Theme[] = [];
  if (s.willpower < 35) out.push('discipline_willpower', 'slow_dopamine');
  if (s.energy < 30) out.push('burnout_rest', 'rest_recovery');
  if (s.social < 30) out.push('social_connection');
  if (s.money < 800) out.push('financial_freedom');
  if (s.dopamine >= 75) out.push('fast_dopamine', 'folly_recklessness');
  if (s.mental < 30) out.push('apathy_meaning', 'rest_recovery');
  return out;
}

/** Thời gian đọc (ms): đủ dài để đọc xong, kẹp trong 8–17 giây */
export const readMs = (line: MascotLine): number => Math.max(8000, Math.min(17000, 5500 + line.quote.length * 55));

/**
 * Bộ bài câu nói: xáo trộn, không lặp lại gần đây. 65% lần chọn theo chỉ số đang yếu (nếu có),
 * còn lại lấy từ cả kho để vẫn đa dạng.
 */
export class QuoteDeck {
  private recent: string[] = [];
  constructor(private readonly rng: Rng, private readonly lines: readonly MascotLine[] = MASCOT_LINES) {}

  next(stats?: MascotStats | null): MascotLine {
    const urgent = stats ? urgentThemes(stats) : [];
    const fresh = (l: MascotLine) => !this.recent.includes(l.id);
    let pool: readonly MascotLine[] = this.lines.filter(fresh);
    if (urgent.length > 0 && this.rng() < 0.65) {
      const themed = pool.filter((l) => urgent.includes(l.theme as Theme));
      if (themed.length > 0) pool = themed;
    }
    if (pool.length === 0) pool = this.lines;
    const pick = pool[Math.floor(this.rng() * pool.length) % pool.length];
    this.recent.push(pick.id);
    if (this.recent.length > 10) this.recent.shift();
    return pick;
  }
}
