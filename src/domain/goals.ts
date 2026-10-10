/**
 * PURE DOMAIN: MỤC TIÊU TRONG TUẦN
 * Mỗi ván bốc 2 mục tiêu. Tiến độ suy ra từ lịch sử hành vi + chỉ số hiện tại, nên không cần lưu thêm
 * gì ngoài danh sách id đã bốc.
 */
import { PlayerStatsPrimitive } from './types';
import type { Rng } from './rng';
import { DOMAIN_ACTIONS } from './actions';
import { computeSkillXp } from './progression';

export type GoalState = 'progress' | 'done' | 'failed';

export interface GoalContext {
  /** Hành vi của các ngày đã qua */
  history: string[][];
  /** Hành vi của hôm nay */
  todayIds: string[];
  stats: PlayerStatsPrimitive;
  /** true khi ván đã kết thúc: các mục tiêu "giữ ở dưới mức" mới được tính là đạt */
  final: boolean;
}

export interface GoalResultPrimitive {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** 0..1 */
  progress: number;
  /** Dòng tiến độ ngắn, vd "7.5/12 giờ" */
  label: string;
  state: GoalState;
}

interface GoalDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  evaluate: (ctx: GoalContext, all: string[]) => { progress: number; label: string; state?: GoalState };
}

const hoursOf = (ids: string[], filter: (id: string) => boolean) =>
  ids.reduce((sum, id) => (filter(id) ? sum + (DOMAIN_ACTIONS.find((a) => a.id === id)?.hours ?? 0) : sum), 0);

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const EXAM_IDS = ['study_deep', 'deep_research', 'online_course', 'read_book', 'learn_skill'];
const FAST_HOURS_LIMIT = 8;

const GOALS: GoalDef[] = [
  {
    id: 'exam',
    emoji: '📝',
    title: 'Kỳ thi cuối tuần',
    description: 'Dành 12 giờ ôn bài trong tuần (học chuyên môn, đọc sách, khóa online).',
    evaluate: (_c, all) => {
      const h = hoursOf(all, (id) => EXAM_IDS.includes(id));
      return { progress: clamp01(h / 12), label: `${h}/12 giờ` };
    },
  },
  {
    id: 'savings',
    emoji: '💰',
    title: 'Quỹ dự phòng',
    description: 'Giữ ví trên 5.000k vào cuối tuần dù đã trừ tiền trọ.',
    evaluate: (c) => ({ progress: clamp01(c.stats.money / 5000), label: `${c.stats.money}k/5000k` }),
  },
  {
    id: 'fit',
    emoji: '💪',
    title: 'Thể hình mới',
    description: 'Luyện Thể lực tới cấp 2 trong tuần.',
    evaluate: (_c, all) => {
      const xp = computeSkillXp([], all).body;
      return { progress: clamp01(xp / 12), label: `${Math.min(xp, 12)}/12 XP` };
    },
  },
  {
    id: 'friends',
    emoji: '🤝',
    title: 'Gắn kết',
    description: 'Luyện Giao tiếp tới cấp 2: dành thời gian thật cho người xung quanh.',
    evaluate: (_c, all) => {
      const xp = computeSkillXp([], all).heart;
      return { progress: clamp01(xp / 12), label: `${Math.min(xp, 12)}/12 XP` };
    },
  },
  {
    id: 'promote',
    emoji: '🛠️',
    title: 'Thăng tiến',
    description: 'Luyện Nghề nghiệp tới cấp 2 để mở khóa việc lương cao.',
    evaluate: (_c, all) => {
      const xp = computeSkillXp([], all).craft;
      return { progress: clamp01(xp / 12), label: `${Math.min(xp, 12)}/12 XP` };
    },
  },
  {
    id: 'detox',
    emoji: '📵',
    title: 'Cai nghiện lướt',
    description: `Cả tuần chỉ dành tối đa ${FAST_HOURS_LIMIT} giờ cho dopamine nhanh (mạng xã hội, game, đồ ăn vặt...).`,
    evaluate: (c, all) => {
      const h = hoursOf(all, (id) => DOMAIN_ACTIONS.find((a) => a.id === id)?.dopaminePathway === 'fast');
      const failed = h > FAST_HOURS_LIMIT;
      return {
        progress: clamp01(1 - h / FAST_HOURS_LIMIT),
        label: `${h}/${FAST_HOURS_LIMIT} giờ cho phép`,
        state: failed ? 'failed' : c.final ? 'done' : 'progress',
      };
    },
  },
  {
    id: 'sleep_gold',
    emoji: '😴',
    title: 'Giấc ngủ vàng',
    description: 'Ngủ đủ giấc dài ít nhất 5 trong 7 ngày.',
    evaluate: (c) => {
      const days = [...c.history, c.todayIds].filter((d) => d.includes('sleep_deep')).length;
      return { progress: clamp01(days / 5), label: `${Math.min(days, 5)}/5 ngày` };
    },
  },
  {
    id: 'calm',
    emoji: '🧘',
    title: 'Bình tâm',
    description: 'Kết thúc tuần với Tinh thần ≥ 85 và Ý chí ≥ 75.',
    evaluate: (c) => {
      const ok = c.stats.mental >= 85 && c.stats.willpower >= 75;
      const p = (clamp01(c.stats.mental / 85) + clamp01(c.stats.willpower / 75)) / 2;
      return { progress: ok ? 1 : p, label: `Tinh thần ${c.stats.mental}/85 · Ý chí ${c.stats.willpower}/75` };
    },
  },
];

export const GOAL_COUNT_PER_RUN = 2;

export const isGoalId = (id: unknown): id is string => typeof id === 'string' && GOALS.some((g) => g.id === id);

/** Bốc ngẫu nhiên các mục tiêu cho một ván mới. `rng` trả số trong [0,1). */
export function pickGoalIds(rng: Rng): string[] {
  const pool = GOALS.map((g) => g.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, GOAL_COUNT_PER_RUN);
}

export function evaluateGoals(goalIds: string[], ctx: GoalContext): GoalResultPrimitive[] {
  const all = [...ctx.history.flat(), ...ctx.todayIds];
  return goalIds
    .map((id) => GOALS.find((g) => g.id === id))
    .filter((g): g is GoalDef => !!g)
    .map((g) => {
      const r = g.evaluate(ctx, all);
      const state: GoalState = r.state ?? (r.progress >= 1 ? 'done' : 'progress');
      return { id: g.id, emoji: g.emoji, title: g.title, description: g.description, progress: r.progress, label: r.label, state };
    });
}
