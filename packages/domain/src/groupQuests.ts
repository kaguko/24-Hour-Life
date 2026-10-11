/**
 * PURE DOMAIN: NHIỆM VỤ CHUNG CỦA CẢ PHÒNG (multiplayer)
 * Mỗi phòng có một nhiệm vụ chung, tiến độ là tổng đóng góp của mọi người, suy ra từ lịch sử hành vi của từng
 * người (như mục tiêu tuần) nên không cần bộ đếm riêng. Mục tiêu tăng theo số người trong phòng. Chọn các kiểu
 * làm được cả khi phòng chỉ có một người; hành vi chung (chạy bộ cùng, học nhóm) tính cho từng người tham gia.
 * Hàm ở đây không giữ trạng thái: server giữ đóng góp cao nhất của từng người (rời phòng cũng không làm tụt).
 */
import { DOMAIN_ACTIONS } from './actions.js';
import type { LocationId } from './map.js';
import type { Rng } from './rng.js';

export interface GroupQuestReward {
  mental: number;
  social: number;
  willpower: number;
}

export interface GroupQuestDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Đơn vị hiển thị */
  unit: string;
  /** Mục tiêu cho phòng 1 người; phòng n người = round(base × (0.6 + 0.4 × n)) */
  base: number;
  /** Những nơi làm được việc này (để đánh dấu trên bản đồ) */
  places: LocationId[];
  /** Hành vi nào tính, mỗi hành vi đóng góp theo số giờ của nó */
  actionIds: string[];
  /** Thưởng cho mọi người còn chơi khi cả phòng hoàn thành */
  reward: GroupQuestReward;
  doneLine: string;
}

export const GROUP_QUESTS: GroupQuestDef[] = [
  {
    id: 'g_move',
    emoji: '🏃',
    title: 'Cả phòng cùng vận động',
    description: 'Cùng nhau dành đủ giờ chạy bộ, tập gym, đi bộ. Chạy cùng nhau tính cho từng người tham gia.',
    unit: 'giờ',
    base: 8,
    places: ['gym', 'park', 'riverside'],
    actionIds: ['exercise', 'gym_session', 'short_walk', 'sunset_walk', 'marathon_training', 'morning_stretch', 'run_together', 'river_sunset_walk'],
    reward: { mental: 5, social: 5, willpower: 4 },
    doneLine: 'Cả phòng đã vận động đủ giờ. Có người cùng chạy thì đường dài cũng ngắn lại.',
  },
  {
    id: 'g_study',
    emoji: '📚',
    title: 'Cả phòng cùng học',
    description: 'Cùng nhau dành đủ giờ học, đọc sách, nghiên cứu. Học nhóm tính cho từng người tham gia.',
    unit: 'giờ',
    base: 8,
    places: ['school'],
    actionIds: ['study_deep', 'online_course', 'read_book', 'deep_research', 'learn_skill', 'study_group', 'learn_soft_skills'],
    reward: { mental: 6, social: 4, willpower: 5 },
    doneLine: 'Cả phòng đã học đủ giờ. Một người cố gắng thì khó, cả phòng cùng cố thì dễ hơn nhiều.',
  },
  {
    id: 'g_calm',
    emoji: '🧘',
    title: 'Cả phòng cùng lắng lại',
    description: 'Cùng nhau dành đủ giờ thiền, đi dạo yên tĩnh, câu cá, viết nhật ký, chơi với thú cưng.',
    unit: 'giờ',
    base: 6,
    places: ['temple', 'riverside', 'park'],
    actionIds: ['meditate_breathe', 'temple_meditation', 'fishing', 'river_sunset_walk', 'journal_plan', 'pet_bonding', 'sunset_walk'],
    reward: { mental: 7, social: 4, willpower: 4 },
    doneLine: 'Cả phòng đã dành đủ thời gian để lắng lại. Yên tĩnh hóa ra cũng lây được.',
  },
];

export const groupQuestOf = (id: string): GroupQuestDef | undefined => GROUP_QUESTS.find((q) => q.id === id);

/** Bốc một nhiệm vụ chung cho phòng mới */
export function pickGroupQuest(rng: Rng): GroupQuestDef {
  return GROUP_QUESTS[Math.floor(rng() * GROUP_QUESTS.length) % GROUP_QUESTS.length];
}

/** Mục tiêu cho phòng có `players` người (tối thiểu 1) */
export const groupQuestTarget = (def: GroupQuestDef, players: number): number => Math.round(def.base * (0.6 + 0.4 * Math.max(1, players)));

const hoursOfAction = (id: string): number => DOMAIN_ACTIONS.find((a) => a.id === id)?.hours ?? 0;

/** Đóng góp của một người: tổng giờ các hành vi đủ điều kiện trong lịch sử của họ (các ngày trước + hôm nay) */
export function groupQuestContribution(def: GroupQuestDef, actionIds: string[]): number {
  return actionIds.reduce((sum, id) => (def.actionIds.includes(id) ? sum + hoursOfAction(id) : sum), 0);
}

export const groupQuestRewardText = (r: GroupQuestReward): string => `Tinh thần +${r.mental}, Kết nối +${r.social}, Ý chí +${r.willpower}`;

export interface GroupQuestViewPrimitive {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** 0..1 */
  progress: number;
  /** "5.5/12 giờ" */
  label: string;
  done: boolean;
  /** Đóng góp của từng người, người nhiều nhất đứng đầu */
  contributors: Array<{ name: string; amount: number }>;
  reward: string;
  places: LocationId[];
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** Dựng thông tin hiển thị từ đóng góp của mọi người. `done` do server chốt (đã nhận thưởng), giữ nguyên khi có người rời phòng. */
export function groupQuestView(def: GroupQuestDef, entries: Array<{ name: string; amount: number }>, players: number, done = false): GroupQuestViewPrimitive {
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const target = groupQuestTarget(def, Math.max(players, entries.length));
  return {
    id: def.id,
    emoji: def.emoji,
    title: def.title,
    description: def.description,
    progress: done ? 1 : Math.max(0, Math.min(1, total / target)),
    label: `${fmt(done ? Math.max(total, target) : total)}/${target} ${def.unit}`,
    done: done || total >= target,
    contributors: [...entries].filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount),
    reward: groupQuestRewardText(def.reward),
    places: def.places,
  };
}
