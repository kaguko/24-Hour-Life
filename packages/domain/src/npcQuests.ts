/**
 * PURE DOMAIN: VIỆC NHỜ CỦA CƯ DÂN (nhiệm vụ riêng của từng người chơi, dùng trong multiplayer)
 * Mỗi cư dân có một việc nhờ. Nói chuyện với họ thì nhận việc (mỗi lần giữ một việc); làm đúng việc đó thì
 * quay lại nói chuyện để nhận thưởng. Mục tiêu hoặc là tới một địa điểm, hoặc là làm một hành vi, và được
 * theo dõi tự động. Thưởng nhẹ và mỗi việc chỉ một lần mỗi ván.
 * Hàm ở đây không giữ trạng thái: server giữ `NpcQuestState` và gọi vào.
 */
import type { PlayerStatsPrimitive } from './types.js';
import { locationOf } from './map.js';
import type { LocationId } from './map.js';

export type NpcQuestObjective =
  | { kind: 'visit'; place: LocationId; label: string }
  | { kind: 'action'; actionIds: string[]; label: string };

export type NpcQuestReward = Partial<Pick<PlayerStatsPrimitive, 'mental' | 'social' | 'willpower' | 'money'>>;

export interface NpcQuestDef {
  id: string;
  /** Trùng với id trong RESIDENTS (protocol) */
  giverId: string;
  giverName: string;
  giverEmoji: string;
  title: string;
  /** Lời cư dân nhờ lúc giao việc */
  ask: string;
  /** Lời nhắc khi bạn quay lại mà chưa làm xong */
  reminder: string;
  /** Lời cảm ơn khi trả việc */
  thanks: string;
  objective: NpcQuestObjective;
  reward: NpcQuestReward;
}

export const NPC_QUESTS: NpcQuestDef[] = [
  {
    id: 'q_batu_market',
    giverId: 'ba-tu',
    giverName: 'Bà Tư',
    giverEmoji: '👵',
    title: 'Rau cho bà',
    ask: 'Bà Tư: “Con ghé chợ giúp bà một chuyến nhé, chân bà đi không nổi. Xong thì quay lại kể bà nghe chợ hôm nay có gì.”',
    reminder: 'Bà Tư: “Con chưa ghé chợ à? Không gấp đâu, nhưng bà đợi đấy.”',
    thanks: 'Bà Tư cười móm mém: “Cảm ơn con. Có người nhớ tới bà là bà vui cả tuần rồi.”',
    objective: { kind: 'visit', place: 'market', label: 'Ghé chợ & siêu thị' },
    reward: { social: 5, mental: 4 },
  },
  {
    id: 'q_hung_run',
    giverId: 'hung',
    giverName: 'Anh Hùng',
    giverEmoji: '🏃',
    title: 'Một vòng cùng anh Hùng',
    ask: 'Anh Hùng: “Hôm nay bạn vận động một buổi đi, chạy hay đi bộ đều được. Xong quay lại báo tôi!”',
    reminder: 'Anh Hùng: “Chưa đi à? Đừng đợi có hứng, bắt đầu rồi hứng mới đến!”',
    thanks: 'Anh Hùng đập tay bạn: “Thấy chưa! Mai nhớ chạy tiếp, tôi để mắt đấy.”',
    objective: { kind: 'action', actionIds: ['exercise', 'marathon_training', 'short_walk'], label: 'Chạy bộ hoặc đi bộ một buổi' },
    reward: { willpower: 6, mental: 3 },
  },
  {
    id: 'q_lan_friends',
    giverId: 'lan',
    giverName: 'Cô Lan',
    giverEmoji: '☕',
    title: 'Ngồi quán cùng bạn bè',
    ask: 'Cô Lan: “Cưng à, quán cô vắng người trò chuyện lắm. Ghé ngồi với ai đó một buổi cho quán có hơi người, cô gửi ly nước.”',
    reminder: 'Cô Lan: “Chưa ngồi với ai à cưng? Quán vẫn còn chỗ đẹp đấy.”',
    thanks: 'Cô Lan đẩy ly nước sang: “Của cưng, cô mời. Cảm ơn đã làm quán ấm lên.”',
    objective: { kind: 'action', actionIds: ['cafe_friends', 'deep_talk', 'board_game_night'], label: 'Ngồi cùng bạn bè ở quán cà phê' },
    reward: { social: 5, mental: 3, money: 30 },
  },
  {
    id: 'q_tam_school',
    giverId: 'tam',
    giverName: 'Chú Tám',
    giverEmoji: '🥖',
    title: 'Giao bánh mì cho cô giáo',
    ask: 'Chú Tám: “Cháu đi ngang trường thì ghé đưa giúp chú ổ bánh mì cho cô giáo nhé. Chú còn bận hàng. Về chú trả công.”',
    reminder: 'Chú Tám: “Cháu chưa ghé trường à? Bánh nguội thì uổng lắm đó.”',
    thanks: 'Chú Tám nhét vào tay bạn mấy đồng: “Cô giáo khen cháu đó. Cầm lấy, của chú gửi.”',
    objective: { kind: 'visit', place: 'school', label: 'Ghé trường & thư viện' },
    reward: { social: 4, willpower: 3, money: 40 },
  },
  {
    id: 'q_minh_study',
    giverId: 'minh',
    giverName: 'Minh',
    giverEmoji: '📚',
    title: 'Học bài, không lướt',
    ask: 'Minh: “Anh chị học một buổi nghiêm túc đi, rồi quay lại kể em nghe. Em đang cố bỏ điện thoại mà khó quá.”',
    reminder: 'Minh: “Anh chị chưa học xong hả? Em cũng đang cố nè, cùng cố nhé.”',
    thanks: 'Minh cười toe: “Thấy anh chị học là em cũng thấy có động lực. Cảm ơn nhiều!”',
    objective: { kind: 'action', actionIds: ['study_deep', 'online_course', 'read_book', 'deep_research'], label: 'Học tập hoặc đọc sách một buổi' },
    reward: { mental: 6, willpower: 4 },
  },
  {
    id: 'q_phong_walk',
    giverId: 'phong',
    giverName: 'Phong',
    giverEmoji: '📱',
    title: 'Rủ Phong đi dạo',
    ask: 'Phong (không rời mắt khỏi màn hình): “Anh chị đi dạo một vòng đi, rồi kể em nghe ngoài kia có gì hay… Biết đâu em ra theo.”',
    reminder: 'Phong: “Dạ… anh chị chưa đi dạo à? Em vẫn đang ngồi đây nè.”',
    thanks: 'Phong ngẩng lên khỏi điện thoại, lần đầu tiên: “Nghe anh chị kể thích ghê. Mai em thử đi dạo với.”',
    objective: { kind: 'action', actionIds: ['short_walk', 'sunset_walk', 'river_sunset_walk'], label: 'Đi dạo một vòng' },
    reward: { mental: 5, social: 3 },
  },
  {
    id: 'q_binh_gym',
    giverId: 'binh',
    giverName: 'Thầy Bình',
    giverEmoji: '💪',
    title: 'Một buổi tập đúng bài',
    ask: 'Thầy Bình: “Tập một buổi có kế hoạch rồi quay lại đây. Không cần nặng, cần đều.”',
    reminder: 'Thầy Bình: “Chưa tập à? Khởi động nhẹ thôi cũng được, quan trọng là có mặt.”',
    thanks: 'Thầy Bình gật đầu: “Đều là thứ khó nhất. Bạn vừa làm được rồi đấy.”',
    objective: { kind: 'action', actionIds: ['gym_session'], label: 'Một buổi tập ở phòng gym' },
    reward: { willpower: 6, social: 2 },
  },
  {
    id: 'q_nam_river',
    giverId: 'nam',
    giverName: 'Cậu Nam',
    giverEmoji: '🎸',
    title: 'Chỗ hát đẹp bên sông',
    ask: 'Cậu Nam gảy đàn: “Nghe nói bờ sông chiều nay gió đẹp lắm. Bạn ra xem giùm tôi, tôi cần chỗ để viết bài hát mới.”',
    reminder: 'Cậu Nam: “Bạn chưa ra bờ sông à? Bài hát của tôi còn thiếu mất đoạn gió.”',
    thanks: 'Cậu Nam bật cười: “Gió có thật! Tôi viết ngay đoạn điệp khúc đây. Cảm ơn bạn!”',
    objective: { kind: 'visit', place: 'riverside', label: 'Ra bờ sông' },
    reward: { mental: 6, social: 3 },
  },
];

export const npcQuestOf = (id: string): NpcQuestDef | undefined => NPC_QUESTS.find((q) => q.id === id);
export const npcQuestForGiver = (giverId: string): NpcQuestDef | undefined => NPC_QUESTS.find((q) => q.giverId === giverId);

/** Việc nhờ đang làm của một người chơi (server giữ) */
export interface NpcQuestState {
  id: string;
  /** Số hành vi đã làm (cả ván) lúc nhận việc: chỉ hành vi SAU lúc đó mới tính */
  acceptedCount: number;
  /** Đã làm xong phần mục tiêu, chỉ còn quay lại trả việc */
  met: boolean;
  /** Mục tiêu ghé nơi: nhận việc lúc đang ở đúng nơi đó thì phải rời đi rồi quay lại mới tính */
  waitLeave?: boolean;
}

export interface NpcQuestContext {
  /** Nơi người chơi đang ở */
  location: LocationId;
  /** Mọi hành vi đã làm trong ván theo thứ tự (các ngày trước rồi hôm nay) */
  allActionIds: string[];
}

/** Mục tiêu đã đạt chưa. Với `visit`, server phải chốt `met` ngay khi thấy (người chơi có thể rời đi sau đó). */
export function objectiveMet(def: NpcQuestDef, state: NpcQuestState, ctx: NpcQuestContext): boolean {
  if (state.met) return true;
  const o = def.objective;
  if (o.kind === 'visit') return ctx.location === o.place && !state.waitLeave;
  return ctx.allActionIds.slice(state.acceptedCount).some((id) => o.actionIds.includes(id));
}

/** Những nơi nên đi để làm việc này (để đánh dấu trên bản đồ) */
export function npcQuestPlaces(def: NpcQuestDef): LocationId[] {
  const o = def.objective;
  if (o.kind === 'visit') return [o.place];
  return [...new Set(o.actionIds.map((id) => locationOf(id)))].filter((p) => p !== 'home');
}

export function rewardText(r: NpcQuestReward): string {
  const names: Record<string, string> = { mental: 'Tinh thần', social: 'Kết nối', willpower: 'Ý chí', money: 'Tiền' };
  return Object.entries(r)
    .filter(([, v]) => v)
    .map(([k, v]) => `${names[k]} ${v! > 0 ? '+' : ''}${v}${k === 'money' ? 'k' : ''}`)
    .join(', ');
}

export interface NpcQuestViewPrimitive {
  id: string;
  giverId: string;
  giverName: string;
  giverEmoji: string;
  title: string;
  /** Mô tả việc cần làm */
  objective: string;
  status: 'active' | 'ready';
  /** Nơi nên đi (rỗng khi đã xong và chỉ cần quay lại gặp cư dân) */
  places: LocationId[];
  reward: string;
}

export function npcQuestView(state: NpcQuestState): NpcQuestViewPrimitive | null {
  const def = npcQuestOf(state.id);
  if (!def) return null;
  return {
    id: def.id,
    giverId: def.giverId,
    giverName: def.giverName,
    giverEmoji: def.giverEmoji,
    title: def.title,
    objective: state.met ? `Xong rồi! Quay lại gặp ${def.giverName}` : def.objective.label,
    status: state.met ? 'ready' : 'active',
    places: state.met ? [] : npcQuestPlaces(def),
    reward: rewardText(def.reward),
  };
}
