/**
 * PURE DOMAIN: TIẾN TRIỂN & THÓI QUEN
 * - Kỹ năng: mỗi hành vi cho điểm kinh nghiệm (XP) cho một kỹ năng; lên cấp thì hành vi liên quan hiệu quả hơn
 *   và mở khóa hành vi nâng cao.
 * - Thói quen: làm cùng một hành vi nhiều ngày liên tiếp. Hành vi lành mạnh thành nếp thì bớt tốn ý chí;
 *   hành vi cám dỗ lặp lại thì "nhờn" (dopamine thu được giảm).
 * Mọi thứ suy ra từ lịch sử hành vi (id) nên không cần lưu thêm trạng thái.
 */
import { ActionPrimitive, PlayerStatsPrimitive } from './types.js';

export type SkillId = 'mind' | 'body' | 'heart' | 'craft';

export interface SkillDef {
  id: SkillId;
  name: string;
  emoji: string;
  perk: string;
}

export const SKILLS: SkillDef[] = [
  { id: 'mind', name: 'Trí tuệ', emoji: '🧠', perk: 'Học tập, đọc sách, thiền hiệu quả hơn' },
  { id: 'body', name: 'Thể lực', emoji: '💪', perk: 'Vận động bớt mệt, hồi phục tốt hơn' },
  { id: 'heart', name: 'Giao tiếp', emoji: '🤝', perk: 'Kết nối sâu hơn, mở khóa hoạt động xã hội lớn' },
  { id: 'craft', name: 'Nghề nghiệp', emoji: '🛠️', perk: 'Làm việc hiệu quả hơn, mở khóa việc lương cao' },
];

/** XP cần để đạt cấp 1, 2, 3 */
export const SKILL_THRESHOLDS = [4, 12, 24];

/** Hành vi nào luyện kỹ năng nào và được bao nhiêu XP */
export const ACTION_SKILL: Record<string, { skill: SkillId; xp: number }> = {
  study_deep: { skill: 'mind', xp: 3 },
  read_book: { skill: 'mind', xp: 2 },
  online_course: { skill: 'mind', xp: 3 },
  journal_plan: { skill: 'mind', xp: 1 },
  meditate_breathe: { skill: 'mind', xp: 1 },
  deep_research: { skill: 'mind', xp: 4 },

  exercise: { skill: 'body', xp: 3 },
  gym_session: { skill: 'body', xp: 3 },
  short_walk: { skill: 'body', xp: 1 },
  morning_stretch: { skill: 'body', xp: 1 },
  cold_shower: { skill: 'body', xp: 1 },
  sunset_walk: { skill: 'body', xp: 1 },
  cook_tyrosine: { skill: 'body', xp: 1 },
  marathon_training: { skill: 'body', xp: 5 },

  deep_talk: { skill: 'heart', xp: 3 },
  learn_soft_skills: { skill: 'heart', xp: 3 },
  call_family: { skill: 'heart', xp: 1 },
  text_old_friend: { skill: 'heart', xp: 1 },
  cafe_friends: { skill: 'heart', xp: 2 },
  board_game_night: { skill: 'heart', xp: 3 },
  date_night: { skill: 'heart', xp: 3 },
  volunteer: { skill: 'heart', xp: 4 },
  pet_bonding: { skill: 'heart', xp: 1 },
  public_speaking: { skill: 'heart', xp: 5 },
  heart_to_heart: { skill: 'heart', xp: 4 },
  eat_together: { skill: 'heart', xp: 1 },
  run_together: { skill: 'body', xp: 3 },
  study_group: { skill: 'mind', xp: 3 },

  work_focused: { skill: 'craft', xp: 2 },
  work_overtime: { skill: 'craft', xp: 1 },
  part_time_shift: { skill: 'craft', xp: 3 },
  freelance_gig: { skill: 'craft', xp: 3 },
  learn_skill: { skill: 'craft', xp: 2 },
  hobby_craft: { skill: 'craft', xp: 2 },
  sell_old_stuff: { skill: 'craft', xp: 1 },
  side_project: { skill: 'craft', xp: 5 },

  temple_meditation: { skill: 'mind', xp: 2 },
  fishing: { skill: 'mind', xp: 1 },
  river_sunset_walk: { skill: 'body', xp: 1 },
  counseling: { skill: 'heart', xp: 2 },
  night_market_stroll: { skill: 'heart', xp: 1 },
};

export type SkillXp = Record<SkillId, number>;
export type SkillLevels = Record<SkillId, number>;

const emptyXp = (): SkillXp => ({ mind: 0, body: 0, heart: 0, craft: 0 });

/** Tổng XP từ các ngày đã qua và hôm nay */
export function computeSkillXp(history: string[][], todayIds: string[]): SkillXp {
  const xp = emptyXp();
  for (const id of [...history.flat(), ...todayIds]) {
    const entry = ACTION_SKILL[id];
    if (entry) xp[entry.skill] += entry.xp;
  }
  return xp;
}

export const levelFromXp = (xp: number): number => SKILL_THRESHOLDS.filter((t) => xp >= t).length;

export function skillLevels(xp: SkillXp): SkillLevels {
  return { mind: levelFromXp(xp.mind), body: levelFromXp(xp.body), heart: levelFromXp(xp.heart), craft: levelFromXp(xp.craft) };
}

/** Tiến độ tới cấp kế tiếp: { level, into, need } (need = 0 khi đã tối đa) */
export function skillProgress(xp: number): { level: number; into: number; need: number } {
  const level = levelFromXp(xp);
  if (level >= SKILL_THRESHOLDS.length) return { level, into: 0, need: 0 };
  const base = level === 0 ? 0 : SKILL_THRESHOLDS[level - 1];
  return { level, into: xp - base, need: SKILL_THRESHOLDS[level] - base };
}

/** Số ngày liên tiếp (tính tới hôm qua) mà hành vi này được làm */
export function streakBeforeToday(actionId: string, history: string[][]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].includes(actionId)) break;
    n++;
  }
  return n;
}

/** Ngày thứ 3 liên tiếp trở đi là đã thành nếp (hoặc đã nhờn với cám dỗ) */
export const HABIT_DAYS = 2;

const isGoodHabitCandidate = (a: ActionPrimitive) => a.dopaminePathway === 'slow' && a.category !== 'rest' && !a.isTemptation;

export type HabitState = 'building' | 'formed' | 'tolerance' | 'none';

export function habitState(action: ActionPrimitive, history: string[][]): { state: HabitState; streak: number } {
  const streak = streakBeforeToday(action.id, history);
  if (isGoodHabitCandidate(action)) {
    if (streak >= HABIT_DAYS) return { state: 'formed', streak };
    if (streak >= 1) return { state: 'building', streak };
  } else if (action.dopaminePathway === 'fast') {
    if (streak >= HABIT_DAYS) return { state: 'tolerance', streak };
  }
  return { state: 'none', streak };
}

/** Nhãn ngắn hiển thị trên thẻ / menu; null nếu không có gì đáng nói */
export function habitTag(action: ActionPrimitive, history: string[][]): string | null {
  const { state, streak } = habitState(action, history);
  if (state === 'formed') return `🔥 Đã thành thói quen (${streak} ngày)`;
  if (state === 'building') return `🌱 Đang tạo thói quen (${streak}/${HABIT_DAYS + 1} ngày)`;
  if (state === 'tolerance') return `⚠️ Đã nhờn (${streak} ngày liền): dopamine giảm`;
  return null;
}

/** Kỹ năng tương ứng với một hành vi cùng cấp hiện tại */
export function skillBonusFor(actionId: string, levels: SkillLevels): { skill: SkillId; level: number } | null {
  const entry = ACTION_SKILL[actionId];
  return entry ? { skill: entry.skill, level: levels[entry.skill] } : null;
}

export interface ProgressionResult {
  deltas: Partial<PlayerStatsPrimitive>;
  notes: string[];
}

/**
 * Áp dụng kỹ năng + thói quen lên mức thay đổi chỉ số của một hành vi.
 * Gọi sau khi đã tính các hiệu ứng riêng của hành vi.
 */
export function applyProgression(
  action: ActionPrimitive,
  deltas: Partial<PlayerStatsPrimitive>,
  history: string[][],
  todayIds: string[]
): ProgressionResult {
  const out: Partial<PlayerStatsPrimitive> = { ...deltas };
  const notes: string[] = [];

  // 1. Kỹ năng
  const entry = ACTION_SKILL[action.id];
  const xpBefore = computeSkillXp(history, todayIds);
  const levelBefore = levelFromXp(xpBefore[entry?.skill ?? 'mind']);
  if (entry) {
    const lv = levelBefore;
    if (lv > 0) {
      for (const key of ['energy', 'mental', 'social', 'willpower', 'money'] as const) {
        const v = out[key];
        if (v === undefined) continue;
        if (v > 0) out[key] = Math.round(v * (1 + 0.1 * lv));
        else if (v < 0 && key === 'energy') out[key] = Math.round(v * (1 - 0.08 * lv));
      }
    }
    const levelAfter = levelFromXp(xpBefore[entry.skill] + entry.xp);
    if (levelAfter > levelBefore) {
      const def = SKILLS.find((s) => s.id === entry.skill)!;
      notes.push(`${def.emoji} ${def.name} lên cấp ${levelAfter}! ${def.perk}.`);
    }
  }

  // 2. Thói quen
  const habit = habitState(action, history);
  if (habit.state === 'formed') {
    out.willpower = (out.willpower ?? 0) + 4;
    notes.push(`🔥 "${action.title.split('(')[0].trim()}" đã thành thói quen: làm nhẹ nhàng hơn, +4 ý chí.`);
  } else if (habit.state === 'tolerance' && (out.dopamine ?? 0) > 0) {
    out.dopamine = Math.round((out.dopamine ?? 0) * 0.6);
    out.willpower = (out.willpower ?? 0) - 4;
    notes.push('⚠️ Não đã nhờn kích thích này: cùng một hành vi nhưng dopamine nhận được ít hơn, ý chí hao thêm.');
  }

  return { deltas: out, notes };
}
