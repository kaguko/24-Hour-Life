import type { NightResultPrimitive } from '@24h/domain';

/** Hợp đồng giữa client và server: tên message, giới hạn, dạng payload. */

export const ROOM_NAME = 'life';
export const MAX_PLAYERS = 8;
export const ROOM_CODE_LENGTH = 4;
/** Bỏ các ký tự dễ nhầm (I, O, 0, 1) */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 12 nhân vật (Kenney Mini Characters, khớp ảnh trong public/avatars và GLB trong public/models/characters) */
export const AVATAR_IDS = [
  'male-a', 'female-a', 'male-b', 'female-b', 'male-c', 'female-c',
  'male-d', 'female-d', 'male-e', 'female-e', 'male-f', 'female-f',
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];
export const isAvatarId = (v: unknown): v is AvatarId => typeof v === 'string' && (AVATAR_IDS as readonly string[]).includes(v);

/** Thành phố: x, z trong [-30, 30] (xem city_nav.json). Server kẹp vị trí vào hình vuông này. */
export const WORLD_HALF_SIZE = 30;
/** Điểm xuất hiện: trước cửa nhà (khớp doors.home trong city_nav.json) */
export const SPAWN_POINT = { x: -20, z: 12.6 } as const;
/** Tốc độ tối đa (đơn vị/giây): server kẹp vị trí theo giới hạn này, client không thể dịch chuyển tức thời */
export const MAX_MOVE_SPEED = 8;
export const MAX_CHAT_LENGTH = 200;
export const CHAT_HISTORY = 50;
export const CHAT_MIN_INTERVAL_MS = 500;
export const MAX_MESSAGES_PER_SECOND = 30;

/**
 * Vòng đời một ngày trong phòng:
 *   planning (mọi người hành động, bấm ready) -> night (server tính qua đêm) -> morning (nhận báo cáo sáng) -> planning ngày kế.
 * `ended` là trạng thái cuối khi mọi người đã xong ván (đủ 7 ngày hoặc sụp đổ).
 */
export type Phase = 'planning' | 'night' | 'morning' | 'ended';

export interface Timing {
  /** Hết thời gian này thì qua đêm dù chưa ai ready */
  planningMs: number;
  /** Thời gian "đêm" trước khi báo cáo sáng được gửi (để client chạy hiệu ứng) */
  nightMs: number;
  /** Hết thời gian này (hoặc mọi người ready) thì sang ngày mới */
  morningMs: number;
  /** Người ngắt kết nối được giữ chỗ chừng này, sau đó bot Balanced điều khiển */
  reconnectMs: number;
}

export const DEFAULT_TIMING: Timing = {
  planningMs: 240_000,
  nightMs: 2_000,
  morningMs: 20_000,
  reconnectMs: 60_000,
};

/** Hoạt hình của nhân vật; client ánh xạ sang clip của mô hình (xem apps/web/src/world/animMap.ts) */
export type Anim = 'idle' | 'walk' | 'run' | 'sit' | 'sleep' | 'eat' | 'study' | 'phone' | 'dance' | 'collapse' | 'wave';

/** Hành vi (theo id domain) -> hoạt hình. Không có trong bảng = idle. Dùng chung cho server (ghi vào schema) và client (người chơi cục bộ). */
export function animForAction(actionId: string): Anim {
  if (/^sleep_|^hot_bath$/.test(actionId)) return 'sleep';
  if (/exercise|marathon|gym_session|run_together|morning_stretch|short_walk|sunset_walk/.test(actionId)) return 'run';
  if (/^(eat_together|fast_food|cook_|late_night_snack|caffeine_spike)/.test(actionId)) return 'eat';
  if (/study|learn|read_book|deep_research|online_course|work_|freelance|side_project|journal|hobby_craft|public_speaking/.test(actionId)) return 'study';
  if (/scroll_social|drama_news|binge_gaming|binge_series|call_family|text_old_friend|impulse_shopping|lottery_ticket/.test(actionId)) return 'phone';
  if (/beer_party|drinking_group|listen_music|date_night|movie_night|board_game_night|cafe_friends/.test(actionId)) return 'dance';
  if (/meditate|heart_to_heart|deep_talk|pet_bonding|tease_dog/.test(actionId)) return 'sit';
  return 'idle';
}

/** Tuỳ chọn khi tạo / vào phòng */
export interface JoinOptions {
  name?: string;
  avatar?: string;
}

/** Client -> server */
export interface ClientMessages {
  action: { actionId: string };
  move: { x: number; z: number };
  chat: { text: string };
  /** Sẵn sàng qua đêm (planning) / sẵn sàng sang ngày mới (morning). `ready: false` để hủy. Mặc định true. */
  ready: { ready?: boolean };
  /** Hành vi chung: rủ (host), vào lời rủ, rời, bắt đầu (host). */
  joint: { op: 'offer'; actionId: string } | { op: 'join'; offerId: string } | { op: 'leave' } | { op: 'start' };
  /** Gửi lời nhắc / động viên cho người khác (hồi ý chí nhẹ cho họ) */
  nudge: { targetId: string };
  /** Vuốt ve / chọc một con vật ngoài phố (phải đứng gần) */
  animal: { animalId: string; op: AnimalOp };
  /** Biểu cảm với bạn bè; hug và highfive cần `targetId` đứng gần */
  emote: { kind: EmoteKind; targetId?: string };
  /** Trò chuyện / giúp đỡ / mời quà một cư dân trong thành phố (phải đứng gần) */
  resident: { residentId: string; op: ResidentOp };
}

/** Server -> client (chỉ gửi riêng cho người gửi) */
export interface ActionResultMessage {
  ok: boolean;
  actionId: string;
  /** Lý do bị từ chối (khi ok = false) */
  reason?: string;
  /** Thông báo của hành vi (khi ok = true) */
  notice?: string | null;
}

/** Báo cáo sáng riêng của từng người chơi */
export interface MorningReportMessage {
  /** Ngày vừa kết thúc */
  day: number;
  report: NightResultPrimitive;
  /** Ván của người này đã kết thúc (đủ ngày hoặc sụp đổ) */
  finished: boolean;
  /**
   * "Bạn bè hôm qua": chuyện đã xảy ra giữa bạn và mọi người (ai rủ ai, ai động viên ai, ai đang chật vật).
   * Chỉ kể chuyện, không xếp hạng.
   */
  friends: string[];
}

/** Có người rủ làm hành vi chung */
export interface InviteMessage {
  offerId: string;
  actionId: string;
  hostId: string;
  hostName: string;
  /** Ý chí bạn bị kéo mất vì lời rủ cám dỗ (<= 0) */
  pressure: number;
}

export interface JointResultMessage {
  ok: boolean;
  actionId: string;
  offerId: string;
  reason?: string;
  notice?: string | null;
  /** Tên những người cùng làm */
  withNames?: string[];
  fellForPressure?: boolean;
}

export interface NudgeResultMessage {
  ok: boolean;
  reason?: string;
}

export interface NudgedMessage {
  fromId: string;
  fromName: string;
}

/**
 * Trạng thái riêng của người chơi mà schema công khai không có: client dựng giao diện từ đây thay vì tự chạy luật.
 * Server gửi lại sau mỗi lần trạng thái người này đổi (hành động, hành vi chung, qua đêm, sang ngày).
 */
export interface PrivateStateMessage {
  /** Hành vi (kể cả bước đi đường) đã làm trong ngày, theo thứ tự */
  actionsToday: string[];
  /** Hành vi nào đang không làm được lúc này và vì sao (từ luật lên kế hoạch của domain). Gồm cả hành vi chung. */
  locks: Record<string, string>;
  /** Nợ ngủ lũy kế (giờ) */
  sleepDebt: number;
  /** Hạng các ngày đã qua */
  dayGrades: string[];
}

/** Con vật ngoài phố (mô hình dựng bằng Blender: public/models/animals/<kind>.glb) */
export const ANIMAL_KINDS = ['cat', 'capybara', 'duck', 'shiba', 'frog'] as const;
export type AnimalKind = (typeof ANIMAL_KINDS)[number];
export type AnimalMood = 'calm' | 'happy' | 'angry' | 'flee';
export type AnimalOp = 'pet' | 'poke';
export const isAnimalOp = (v: unknown): v is AnimalOp => v === 'pet' || v === 'poke';

export interface AnimalDef {
  id: string;
  kind: AnimalKind;
  name: string;
  /** Chỗ ngồi thường ngày */
  home: { x: number; z: number };
  /** Chỗ chạy tới khi bị chọc cáu / hoảng. Mọi điểm đều nằm trên ô đi bộ được của city_nav.json. */
  away: { x: number; z: number };
}

export const ANIMALS: readonly AnimalDef[] = [
  { id: 'cat', kind: 'cat', name: 'Mèo Cáu', home: { x: 6, z: 5 }, away: { x: 10, z: 3 } },
  { id: 'capybara', kind: 'capybara', name: 'Capybara Chill', home: { x: -7, z: 6 }, away: { x: -10, z: 9 } },
  { id: 'duck', kind: 'duck', name: 'Vịt Quạc', home: { x: 8, z: -7 }, away: { x: 5, z: -9 } },
  { id: 'shiba', kind: 'shiba', name: 'Cheems', home: { x: -8, z: -8 }, away: { x: -5, z: -10 } },
  { id: 'frog', kind: 'frog', name: 'Ếch Phèo', home: { x: 15, z: 9 }, away: { x: 18, z: 10 } },
];
/** Phải đứng trong bán kính này mới tương tác được với con vật */
export const ANIMAL_REACH = 4.5;
/** Con vật tự bình tĩnh lại sau chừng này ms */
export const ANIMAL_MOOD_MS = 6_000;

export const EMOTE_KINDS = ['wave', 'highfive', 'hug', 'dance', 'cheer'] as const;
export type EmoteKind = (typeof EMOTE_KINDS)[number];
export const isEmoteKind = (v: unknown): v is EmoteKind => typeof v === 'string' && (EMOTE_KINDS as readonly string[]).includes(v);
/** Biểu cảm nhắm vào một người (phải đứng gần) */
export const TARGETED_EMOTES: readonly EmoteKind[] = ['highfive', 'hug'];
export const EMOTE_REACH = 5;
export const EMOTE_MIN_INTERVAL_MS = 1_200;

/** Cư dân thành phố: NPC do server điều khiển, đi tuần theo lộ trình, nhớ mức thân quen với từng người chơi */
export const RESIDENT_OPS = ['talk', 'help', 'treat'] as const;
export type ResidentOp = (typeof RESIDENT_OPS)[number];
export const isResidentOp = (v: unknown): v is ResidentOp => typeof v === 'string' && (RESIDENT_OPS as readonly string[]).includes(v);
/** idle: đứng; walk: đang đi; talk: đang nói chuyện với ai đó (đứng yên) */
export type ResidentState = 'idle' | 'walk' | 'talk';

export interface ResidentDef {
  id: string;
  name: string;
  /** Mô hình nhân vật Kenney Mini Characters (public/models/characters/<avatar>.glb) */
  avatar: string;
  emoji: string;
  role: string;
  /** Lộ trình tuần hoàn; điểm đầu là chỗ đứng thường ngày. Mọi đoạn thẳng đều đi được trên city_nav.json (có test). */
  route: ReadonlyArray<{ x: number; z: number }>;
  /** Tốc độ đi (m/giây) */
  speed: number;
  /** Nghỉ ở mỗi điểm dừng trong khoảng này (ms) */
  pauseMs: readonly [number, number];
  /** Nhãn nút "giúp đỡ" (việc cụ thể của cư dân này) */
  helpLabel: string;
  /** Nhãn nút "mời" và giá (nghìn VNĐ); bỏ qua nếu cư dân không nhận quà */
  treatLabel?: string;
  treatCost?: number;
}

export const RESIDENTS: readonly ResidentDef[] = [
  { id: 'ba-tu', name: 'Bà Tư', avatar: 'female-e', emoji: '👵', role: 'Hay ngồi ghế đá công viên', route: [{ x: -6.5, z: 0.6 }, { x: -4.4, z: 0.6 }], speed: 1.1, pauseMs: [9000, 16000], helpLabel: 'Xách giỏ đồ giúp bà', treatLabel: 'Mời bà ly trà đá', treatCost: 15 },
  { id: 'hung', name: 'Anh Hùng', avatar: 'male-b', emoji: '🏃', role: 'Chạy vòng quanh công viên mỗi ngày', route: [{ x: 9.5, z: -9.5 }, { x: 9.5, z: 9.5 }, { x: -9.5, z: 9.5 }, { x: -9.5, z: -9.5 }], speed: 3.2, pauseMs: [200, 600], helpLabel: 'Chạy cùng anh một đoạn' },
  { id: 'lan', name: 'Cô Lan', avatar: 'female-a', emoji: '☕', role: 'Barista quán cà phê', route: [{ x: 18.2, z: -12.3 }, { x: 21.8, z: -12.3 }], speed: 1.2, pauseMs: [6000, 12000], helpLabel: 'Phụ cô bưng ly', treatLabel: 'Mua một ly cà phê', treatCost: 30 },
  { id: 'tam', name: 'Chú Tám', avatar: 'male-d', emoji: '🥖', role: 'Bán bánh mì trước chợ', route: [{ x: -12.0, z: -1.4 }, { x: -12.0, z: 1.4 }], speed: 1.0, pauseMs: [7000, 14000], helpLabel: 'Phụ chú dọn hàng', treatLabel: 'Mua ổ bánh mì', treatCost: 20 },
  { id: 'minh', name: 'Minh', avatar: 'male-a', emoji: '📚', role: 'Học sinh ôm sách trước trường', route: [{ x: -22.8, z: -12.2 }, { x: -21.0, z: -12.2 }], speed: 1.3, pauseMs: [8000, 15000], helpLabel: 'Ôn bài cùng bạn ấy' },
  { id: 'phong', name: 'Phong', avatar: 'male-f', emoji: '📱', role: 'Thiếu niên dán mắt vào điện thoại', route: [{ x: 22.6, z: 12.0 }, { x: 22.6, z: 11.5 }], speed: 0.5, pauseMs: [10000, 20000], helpLabel: 'Rủ bạn ấy đi dạo 5 phút' },
  { id: 'binh', name: 'Thầy Bình', avatar: 'male-c', emoji: '💪', role: 'Huấn luyện viên phòng gym', route: [{ x: 12.3, z: -1.6 }, { x: 12.3, z: 1.8 }], speed: 1.4, pauseMs: [6000, 11000], helpLabel: 'Đỡ tạ giúp thầy' },
  { id: 'nam', name: 'Cậu Nam', avatar: 'male-e', emoji: '🎸', role: 'Hát rong trong công viên', route: [{ x: 0, z: -5.8 }, { x: 0, z: -4.6 }], speed: 0.6, pauseMs: [12000, 22000], helpLabel: 'Vỗ tay và hát theo', treatLabel: 'Bỏ tiền vào hộp đàn', treatCost: 10 },
];
/** Phải đứng trong bán kính này mới nói chuyện được với cư dân */
export const RESIDENT_REACH = 4.5;
/** Cư dân đứng lại chừng này ms sau khi có người tương tác (không bỏ đi giữa câu chuyện) */
export const RESIDENT_BUSY_MS = 8_000;
/** Mỗi người chơi chỉ tương tác với cư dân tối đa mỗi chừng này ms một lần */
export const RESIDENT_MIN_INTERVAL_MS = 600;
/** Mức thân quen: 0 lạ, 1 quen mặt, 2 bạn bè. Điểm thân quen tăng theo lượt có thưởng (trò chuyện +1, giúp / mời +2); mỗi ngày tối đa ~8 điểm với một cư dân, nên làm bạn mất vài ngày. */
export const RESIDENT_LEVEL_AT = [0, 4, 12] as const;

/** Cư dân phản ứng với một người (gửi cho cả phòng) */
export interface ResidentEventMessage {
  residentId: string;
  residentName: string;
  byId: string;
  byName: string;
  op: ResidentOp;
  line: string;
  /** Mức thân quen của người này với cư dân sau lần này */
  level: number;
}

export interface ResidentResultMessage {
  ok: boolean;
  residentId: string;
  reason?: string;
  gained?: string | null;
  level?: number;
}

/** Con vật phản ứng với một người (gửi cho cả phòng để mọi người cùng thấy) */
export interface AnimalEventMessage {
  animalId: string;
  animalName: string;
  byId: string;
  byName: string;
  op: AnimalOp;
  mood: AnimalMood;
  /** Câu thoại hài của con vật */
  line: string;
}

export interface AnimalResultMessage {
  ok: boolean;
  animalId: string;
  reason?: string;
  /** Chỉ số nhận được (nếu có) để hiện nhẹ cho người chơi */
  gained?: string | null;
}

export interface EmoteMessage {
  fromId: string;
  fromName: string;
  kind: EmoteKind;
  targetId?: string;
  targetName?: string;
}

export interface EmoteResultMessage {
  ok: boolean;
  reason?: string;
  gained?: string | null;
}

export interface ServerMessages {
  resident_event: ResidentEventMessage;
  resident_result: ResidentResultMessage;
  animal_event: AnimalEventMessage;
  animal_result: AnimalResultMessage;
  emote: EmoteMessage;
  emote_result: EmoteResultMessage;
  private_state: PrivateStateMessage;
  action_result: ActionResultMessage;
  morning: MorningReportMessage;
  invite: InviteMessage;
  joint_result: JointResultMessage;
  nudge_result: NudgeResultMessage;
  nudged: NudgedMessage;
}
