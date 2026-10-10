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
