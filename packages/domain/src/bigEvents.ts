/**
 * PURE DOMAIN: SỰ KIỆN LỚN CỦA TUẦN
 * Mỗi ván có một sự kiện lớn vào Thứ Bảy (ngày 6) lúc 14:00. Mức chuẩn bị tính từ những gì bạn làm cả tuần,
 * còn độ khó thật của sự kiện là thông tin ẩn: bạn chỉ nghe tin đồn và tự cảm nhận qua thanh chuẩn bị.
 * Kết quả phụ thuộc cả mức chuẩn bị lẫn trạng thái cơ thể lúc đó.
 */
import { PlayerStatsPrimitive } from './types.js';
import type { Rng } from './rng.js';
import { DOMAIN_ACTIONS } from './actions.js';
import { computeSkillXp } from './progression.js';

export type BigEventId = 'exam' | 'interview' | 'deadline' | 'wedding';
export type BigEventTier = 'great' | 'pass' | 'close' | 'fail';

export const BIG_EVENT_DAY = 6;
/** Giờ đồng hồ sự kiện diễn ra; ngày bắt đầu 07:00 nên đây là sau 7 giờ */
export const BIG_EVENT_CLOCK = 14;
export const BIG_EVENT_AFTER_HOURS = BIG_EVENT_CLOCK - 7;

export interface BigEventState {
  id: BigEventId;
  /** 0.8 (dễ) .. 1.25 (khó); người chơi không nhìn thấy số này */
  difficulty: number;
  result?: { tier: BigEventTier; score: number };
}

export interface BigEventContext {
  history: string[][];
  todayIds: string[];
  stats: PlayerStatsPrimitive;
}

interface TierOutcome {
  text: string;
  deltas: Partial<PlayerStatsPrimitive>;
}

interface BigEventDef {
  id: BigEventId;
  emoji: string;
  title: string;
  description: string;
  /** Mức chuẩn bị, 1 = vừa đủ cho độ khó trung bình */
  prep: (ctx: BigEventContext, all: string[]) => number;
  /** Mô tả ngắn những gì bạn đã chuẩn bị */
  prepSummary: (ctx: BigEventContext, all: string[]) => string;
  outcomes: Record<BigEventTier, TierOutcome>;
}

const hoursOf = (ids: string[], list: string[]) =>
  ids.reduce((s, id) => (list.includes(id) ? s + (DOMAIN_ACTIONS.find((a) => a.id === id)?.hours ?? 0) : s), 0);

const EXAM_IDS = ['study_deep', 'deep_research', 'online_course', 'read_book', 'learn_skill'];
const WORK_IDS = ['work_focused', 'work_overtime', 'part_time_shift', 'freelance_gig', 'side_project'];

const BIG_EVENTS: BigEventDef[] = [
  {
    id: 'exam',
    emoji: '📝',
    title: 'Kỳ thi cuối kỳ',
    description: 'Môn quan trọng nhất học kỳ, thi vào Thứ Bảy lúc 14:00. Điểm ra sẽ quyết định cả kỳ của bạn.',
    prep: (_c, all) => hoursOf(all, EXAM_IDS) / 20,
    prepSummary: (_c, all) => `${hoursOf(all, EXAM_IDS)} giờ ôn bài trong tuần`,
    outcomes: {
      great: { text: 'Đề trúng đúng phần bạn đã ôn kỹ. Bạn nộp bài sớm, tự tin và nhận học bổng khuyến khích.', deltas: { mental: 15, willpower: 15, money: 300 } },
      pass: { text: 'Có vài câu bí nhưng bạn xoay xở được. Điểm đủ đạt, bạn thở phào ra khỏi phòng thi.', deltas: { mental: 6, willpower: 8 } },
      close: { text: 'Bạn ngồi nhìn đề thi mà nhiều chỗ trống. Có thể vừa chạm ngưỡng, có thể không.', deltas: { mental: -6, willpower: -4 } },
      fail: { text: 'Đề hỏi đúng chỗ bạn chưa kịp học. Bạn rời phòng thi trong im lặng, và phải đóng phí thi lại.', deltas: { mental: -18, willpower: -15, money: -300 } },
    },
  },
  {
    id: 'interview',
    emoji: '💼',
    title: 'Phỏng vấn công việc mơ ước',
    description: 'Công ty bạn mong muốn hẹn phỏng vấn Thứ Bảy lúc 14:00. Họ cần người giỏi nghề và biết giao tiếp.',
    prep: (c, all) => {
      const xp = computeSkillXp([], all);
      return (xp.craft + xp.heart) / 24 + (c.stats.social >= 60 ? 0.1 : 0);
    },
    prepSummary: (_c, all) => {
      const xp = computeSkillXp([], all);
      return `Nghề nghiệp ${xp.craft} XP, Giao tiếp ${xp.heart} XP`;
    },
    outcomes: {
      great: { text: 'Bạn trả lời trôi chảy và còn hỏi ngược lại được vài câu hay. Họ đề nghị nhận việc ngay tại chỗ.', deltas: { mental: 15, willpower: 15, social: 6, money: 900 } },
      pass: { text: 'Buổi phỏng vấn ổn. Họ hẹn phản hồi, và bạn có cảm giác tốt về kết quả.', deltas: { mental: 6, willpower: 8, money: 300 } },
      close: { text: 'Vài câu bạn lúng túng. Nhà tuyển dụng gật đầu lịch sự, và bạn không đoán được gì.', deltas: { mental: -6 } },
      fail: { text: 'Bạn chưa chuẩn bị đủ để trả lời những câu cơ bản. Lời cảm ơn và cái bắt tay vội vã cho bạn biết kết quả.', deltas: { mental: -18, willpower: -12 } },
    },
  },
  {
    id: 'deadline',
    emoji: '🚀',
    title: 'Chốt dự án cho khách hàng',
    description: 'Khách hàng lớn chốt bàn giao vào Thứ Bảy lúc 14:00. Đúng hạn thì có thưởng, trễ thì mất uy tín.',
    prep: (_c, all) => hoursOf(all, WORK_IDS) / 26,
    prepSummary: (_c, all) => `${hoursOf(all, WORK_IDS)} giờ làm việc cho dự án trong tuần`,
    outcomes: {
      great: { text: 'Bạn bàn giao sớm, sản phẩm gọn gàng. Khách khen và chuyển luôn khoản thưởng.', deltas: { money: 800, mental: 8, willpower: 10 } },
      pass: { text: 'Chỉnh sửa vội vài chỗ nhưng kịp giờ. Khách hài lòng ở mức chấp nhận được.', deltas: { money: 500, mental: 2 } },
      close: { text: 'Bạn nộp trễ nửa tiếng và phải xin lỗi. Khách vẫn thanh toán nhưng không thưởng.', deltas: { money: 200, mental: -8, willpower: -6 } },
      fail: { text: 'Sản phẩm chưa xong khi hết hạn. Khách hủy một phần hợp đồng và bạn mất khoản đã ứng.', deltas: { money: -400, mental: -16, willpower: -12 } },
    },
  },
  {
    id: 'wedding',
    emoji: '💐',
    title: 'Đám cưới của người bạn thân nhất',
    description: 'Người bạn thân nhất mời bạn làm phù rể/phù dâu, lễ cưới Thứ Bảy lúc 14:00. Bạn cần có mặt với tinh thần tốt, có quà và biết cách trò chuyện.',
    prep: (c, all) => {
      const heart = computeSkillXp([], all).heart;
      return Math.min(1.3, c.stats.social / 70) * 0.5 + Math.min(1.3, c.stats.money / 1500) * 0.3 + Math.min(1.3, heart / 12) * 0.2;
    },
    prepSummary: (c, all) => `Kết nối ${c.stats.social}, quỹ ${c.stats.money}k, Giao tiếp ${computeSkillXp([], all).heart} XP`,
    outcomes: {
      great: { text: 'Bạn xuất hiện chỉn chu, có quà ý nghĩa và phát biểu khiến cả phòng rơi nước mắt. Đây là ngày bạn sẽ nhớ mãi.', deltas: { social: 25, mental: 14, money: -250 } },
      pass: { text: 'Bạn có mặt đúng giờ, chúc phúc chân thành và ở lại đến cuối tiệc. Vậy là đủ.', deltas: { social: 14, mental: 6, money: -250 } },
      close: { text: 'Bạn đến muộn và gần như không nói được gì với cô dâu chú rể. Người ta vẫn cười, nhưng bạn thấy áy náy.', deltas: { social: 4, mental: -4, money: -250 } },
      fail: { text: 'Bạn kiệt sức, thiếu quà và chẳng có gì để nói. Bạn bè nhận ra, và bạn tự trách mình rất lâu.', deltas: { social: -14, mental: -14, willpower: -8, money: -250 } },
    },
  },
];

export const BIG_EVENT_IDS = BIG_EVENTS.map((e) => e.id);
export const isBigEventId = (v: unknown): v is BigEventId => typeof v === 'string' && BIG_EVENT_IDS.includes(v as BigEventId);

export const bigEventDef = (id: BigEventId): BigEventDef => BIG_EVENTS.find((e) => e.id === id) ?? BIG_EVENTS[0];

/** Bốc sự kiện lớn + độ khó ẩn cho ván mới. `rng` trả số trong [0,1). */
export function pickBigEvent(rng: Rng): BigEventState {
  const id = BIG_EVENTS[Math.floor(rng() * BIG_EVENTS.length) % BIG_EVENTS.length].id;
  const difficulty = Math.round((0.8 + rng() * 0.45) * 100) / 100;
  return { id, difficulty };
}

/** Mức chuẩn bị hiện tại (1 = vừa đủ cho độ khó trung bình) */
export function bigEventPrep(state: BigEventState, ctx: BigEventContext): number {
  const all = [...ctx.history.flat(), ...ctx.todayIds];
  return Math.max(0, bigEventDef(state.id).prep(ctx, all));
}

/** Mức chuẩn bị so với yêu cầu thật (ẩn): >= 1 là đủ */
export const bigEventReadinessRatio = (state: BigEventState, ctx: BigEventContext) => bigEventPrep(state, ctx) / state.difficulty;

/** Thanh chuẩn bị hiển thị (0..1) và nhãn không lộ con số */
export function bigEventPrepDisplay(state: BigEventState, ctx: BigEventContext): { fill: number; label: string } {
  const ratio = bigEventReadinessRatio(state, ctx);
  const label = ratio < 0.2 ? 'Chưa chuẩn bị gì' : ratio < 0.5 ? 'Mới bắt đầu' : ratio < 0.8 ? 'Được một nửa' : ratio < 1 ? 'Gần đủ' : 'Có vẻ vững';
  return { fill: Math.min(1, ratio), label };
}

/** Tin đồn về độ khó, chỉ hé lộ từ ngày 3: thông tin ẩn được lộ dần */
export function bigEventRumor(state: BigEventState, day: number): string {
  if (day < 3) return 'Chưa ai biết yêu cầu cụ thể.';
  if (state.difficulty < 0.95) return 'Tin đồn: lần này nghe nói khá nhẹ nhàng.';
  if (state.difficulty > 1.1) return 'Tin đồn: lần này nghe nói rất khắt khe.';
  return 'Tin đồn: độ khó vào mức bình thường.';
}

/** Hệ số trạng thái cơ thể lúc diễn ra sự kiện (0.55..1.1) */
export function bigEventReadiness(stats: PlayerStatsPrimitive): number {
  const r = (Math.min(1.2, stats.energy / 70) + Math.min(1.2, stats.mental / 70) + Math.min(1.2, stats.willpower / 60)) / 3;
  return Math.max(0.55, Math.min(1.1, r));
}

export interface BigEventOutcome {
  tier: BigEventTier;
  /** 0..100 */
  score: number;
  text: string;
  deltas: Partial<PlayerStatsPrimitive>;
  prepSummary: string;
  /** Mức chuẩn bị (0..100) và hệ số cơ thể (0..100) để hiển thị lý do */
  prepPct: number;
  bodyPct: number;
}

export function resolveBigEvent(state: BigEventState, ctx: BigEventContext): BigEventOutcome {
  const def = bigEventDef(state.id);
  const all = [...ctx.history.flat(), ...ctx.todayIds];
  const prep = Math.max(0, def.prep(ctx, all));
  const body = bigEventReadiness(ctx.stats);
  const ratio = (prep / state.difficulty) * body;
  const tier: BigEventTier = ratio >= 1 ? 'great' : ratio >= 0.75 ? 'pass' : ratio >= 0.5 ? 'close' : 'fail';
  const o = def.outcomes[tier];
  return {
    tier,
    score: Math.max(0, Math.min(100, Math.round(ratio * 80))),
    text: o.text,
    deltas: o.deltas,
    prepSummary: def.prepSummary(ctx, all),
    prepPct: Math.min(100, Math.round(Math.min(1.25, prep / state.difficulty) * 80)),
    bodyPct: Math.round((body / 1.1) * 100),
  };
}

export const TIER_LABEL: Record<BigEventTier, string> = {
  great: 'Xuất sắc',
  pass: 'Đạt',
  close: 'Suýt soát',
  fail: 'Hỏng',
};
