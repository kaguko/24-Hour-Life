/**
 * PURE DOMAIN: HUẤN LUYỆN VIÊN
 * Trả lời câu hỏi của người chơi mới: "Bây giờ mình nên làm gì, và vì sao?"
 * - `nextAdvice`: một lời khuyên duy nhất theo thứ tự ưu tiên (sắp thua > giờ ngủ > Boss > cân bằng).
 * - `bossPrepActionIds`: hành vi nào giúp chuẩn bị cho Boss cuối tuần (để gắn nhãn 🎯 trên thẻ).
 * Chỉ đọc trạng thái, không đổi luật chơi.
 */
import { PlayerStatsPrimitive } from './types.js';
import { DOMAIN_ACTIONS, isNightSleepId } from './actions.js';
import { ACTION_SKILL } from './progression.js';
import { BigEventId, BIG_EVENT_DAY, EXAM_IDS, WORK_IDS } from './bigEvents.js';

/** Ngưỡng thua (khớp evaluateLifeStatus) để giao diện vẽ vạch nguy hiểm */
export const LOSE_AT = { energy: 10, mental: 15, money: 0 } as const;

/** Hành vi tính vào mức chuẩn bị của từng Boss (khớp công thức prep trong bigEvents.ts) */
export function bossPrepActionIds(id: BigEventId): string[] {
  const bySkill = (...skills: string[]) => Object.entries(ACTION_SKILL).filter(([, v]) => skills.includes(v.skill)).map(([k]) => k);
  switch (id) {
    case 'exam':
      return EXAM_IDS;
    case 'deadline':
      return WORK_IDS;
    case 'interview':
      return bySkill('craft', 'heart');
    case 'wedding':
      return [...new Set([...bySkill('heart'), ...DOMAIN_ACTIONS.filter((a) => a.category === 'social').map((a) => a.id)])];
  }
}

/** Một câu: Boss này cần gì */
export const BOSS_NEED: Record<BigEventId, string> = {
  exam: 'Ôn bài: học sâu, đọc sách, khóa học (~20 giờ cả tuần)',
  interview: 'Luyện Nghề nghiệp 🛠️ + Giao tiếp 🤝 (làm việc, học kỹ năng, trò chuyện)',
  deadline: 'Làm việc cho dự án (~26 giờ cả tuần)',
  wedding: 'Giữ Kết nối cao, để dành tiền mua quà, luyện Giao tiếp',
};

export interface AdviceInput {
  stats: PlayerStatsPrimitive;
  day: number;
  hoursUsed: number;
  todayIds: string[];
  bossId: BigEventId;
  /** Mức chuẩn bị Boss so với yêu cầu (0..1+), xem bigEventReadinessRatio */
  bossRatio: number;
  bossDone: boolean;
  /** Đã dồn quá nhiều dopamine nhanh hôm nay (sáng mai sẽ sụp) */
  crashRisk: boolean;
}

export type AdviceTone = 'danger' | 'warn' | 'goal' | 'calm';

export interface Advice {
  tone: AdviceTone;
  emoji: string;
  title: string;
  why: string;
  /** Hành vi gợi ý, theo thứ tự ưu tiên (giao diện chọn cái đầu tiên đang làm được) */
  actionIds: string[];
  /** Gợi ý bấm "Đi ngủ" (ngủ hết giờ còn lại, tối đa 8 tiếng) */
  bedtime?: boolean;
}

const REST = ['sleep_nap', 'meditate_breathe', 'listen_music'];
const CALM = ['meditate_breathe', 'short_walk', 'pet_bonding', 'deep_talk', 'call_family', 'listen_music', 'temple_meditation'];
const MONEY = ['work_focused', 'part_time_shift', 'freelance_gig', 'sell_old_stuff', 'work_overtime'];
const SOCIAL = ['text_old_friend', 'call_family', 'deep_talk', 'cafe_friends'];
const JOY = ['listen_music', 'short_walk', 'pet_bonding', 'exercise', 'cook_tyrosine', 'text_old_friend'];
const WILL = ['short_walk', 'meditate_breathe', 'sleep_nap', 'morning_stretch', 'cold_shower', 'clean_room'];

/** Giờ đồng hồ hiện tại (ngày bắt đầu 07:00) */
export const clockHour = (hoursUsed: number) => (7 + hoursUsed) % 24;

/** Giờ đi ngủ hợp lý: 22:00 (còn 9 tiếng). Sau mốc này mỗi việc làm thêm là bớt giờ ngủ. */
export const BEDTIME_HOURS_USED = 15;

/** Làm hành vi dài `hours` bây giờ thì mất bao nhiêu giờ ngủ (0 nếu không ảnh hưởng hoặc đã ngủ) */
export function sleepCutHours(hoursUsed: number, hours: number, todayIds: string[]): number {
  if (todayIds.some(isNightSleepId)) return 0;
  const leftAfter = 24 - hoursUsed - hours;
  return Math.max(0, Math.min(8, 8 - leftAfter));
}

export function nextAdvice(i: AdviceInput): Advice {
  const { stats: s, hoursUsed } = i;
  const left = 24 - hoursUsed;
  const slept = i.todayIds.some(isNightSleepId);
  const bed = (tone: AdviceTone, emoji: string, title: string, why: string): Advice => ({ tone, emoji, title, why, actionIds: [], bedtime: true });

  if (!slept && left <= 8)
    return bed('danger', '😴', 'Đi ngủ ngay!', `Chỉ còn ${left}h: ngủ thiếu ${8 - left}h. Thức thêm là sáng mai kiệt sức.`);
  if (s.energy <= 25)
    return slept || hoursUsed < 10
      ? { tone: 'danger', emoji: '🪫', title: 'Sắp kiệt sức! Nghỉ ngay', why: `Năng lượng ${Math.round(s.energy)}. Sáng ra mà ≤ ${LOSE_AT.energy} là thua.`, actionIds: REST }
      : bed('danger', '🪫', 'Kiệt sức rồi: đi ngủ sớm', `Năng lượng ${Math.round(s.energy)}. Ngủ đủ 8 tiếng là cách hồi nhiều nhất.`);
  if (s.mental <= 30)
    return { tone: 'danger', emoji: '🫠', title: 'Tinh thần đang gãy', why: `Tinh thần ${Math.round(s.mental)}. Sáng ra mà ≤ ${LOSE_AT.mental} là thua. Làm gì đó nhẹ nhàng.`, actionIds: CALM };
  if (s.money < 400)
    return { tone: 'danger', emoji: '💸', title: 'Sắp hết tiền', why: 'Mỗi đêm trừ ~120k tiền trọ. Tiền âm là thua.', actionIds: MONEY };
  if (!slept && hoursUsed >= BEDTIME_HOURS_USED)
    return bed('warn', '🌙', 'Đến giờ đi ngủ', `Đã ${clockHour(hoursUsed)}h. Ngủ ngay thì đủ 8 tiếng; mỗi việc thêm là bớt giờ ngủ.`);
  if (i.crashRisk)
    return { tone: 'warn', emoji: '📉', title: 'Đủ "dopamine rẻ" cho hôm nay', why: 'Thêm nữa là sáng mai tụt mood. Đổi sang việc chậm mà chắc.', actionIds: CALM };
  if (s.willpower < 35)
    return { tone: 'warn', emoji: '🛡️', title: 'Ý chí thấp: cám dỗ sắp tới tìm', why: 'Hồi ý chí bằng việc nhỏ: đi bộ, thở, chợp mắt.', actionIds: WILL };

  const slowToday = i.todayIds.some((id) => !isNightSleepId(id) && DOMAIN_ACTIONS.find((a) => a.id === id)?.dopaminePathway === 'slow');
  if (s.dopamine < 15 && !slowToday)
    return { tone: 'warn', emoji: '🫥', title: 'Hưng phấn cạn: kiếm chút vui lành mạnh', why: 'Cả ngày không có niềm vui "chậm" thì đêm nay tinh thần đi xuống. Nghe nhạc, đi bộ, vuốt mèo đều được.', actionIds: JOY };

  if (!i.bossDone && i.day <= BIG_EVENT_DAY) {
    // Tiến độ mong đợi: tới sáng Thứ Bảy phải đủ
    const expected = Math.min(1, i.day / BIG_EVENT_DAY);
    if (i.bossRatio < expected - 0.05)
      return {
        tone: 'goal',
        emoji: '🎯',
        title: 'Chuẩn bị cho Boss cuối tuần',
        why: `Thanh chuẩn bị đang dưới vạch trắng của hôm nay. Cần: ${BOSS_NEED[i.bossId]}.`,
        actionIds: bossPrepActionIds(i.bossId),
      };
  }
  if (s.social < 35) return { tone: 'warn', emoji: '🥲', title: 'Hơi cô đơn rồi', why: 'Kết nối dưới 25 sẽ bào mòn tinh thần mỗi đêm.', actionIds: SOCIAL };
  if (s.money < 1200) return { tone: 'calm', emoji: '💼', title: 'Kiếm thêm chút tiền', why: 'Quỹ mỏng: dư ra để mua đồ và đỡ lo cuối tuần.', actionIds: MONEY };
  return {
    tone: 'calm',
    emoji: '✨',
    title: 'Đang ổn! Tự do chọn',
    why: i.bossDone ? 'Boss đã qua. Giữ cân bằng tới hết ngày 7.' : 'Đi trước tiến độ Boss. Thử việc mới hoặc thưởng cho bản thân (vừa phải thôi).',
    actionIds: [],
  };
}
