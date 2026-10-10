import { schema, t, type SchemaType } from '@colyseus/schema';

/**
 * Phần công khai của mỗi người chơi. Toàn bộ do server ghi; client chỉ đọc.
 * Tiến trình đầy đủ (lịch sử, nợ ngủ, mục tiêu...) nằm trong PlayerState ở server.
 */
export const PlayerSchema = schema(
  {
    id: t.string(),
    name: t.string(),
    avatar: t.string(),
    connected: t.boolean(),
    /** Đang do bot Balanced điều khiển (sau khi hết hạn giữ chỗ) */
    bot: t.boolean(),
    /** Planning: sẵn sàng qua đêm. Morning: sẵn sàng sang ngày mới. */
    ready: t.boolean(),
    x: t.float32(),
    z: t.float32(),
    day: t.uint8(),
    hoursUsed: t.float32(),
    location: t.string(),
    finished: t.boolean(),
    dopamine: t.float32(),
    energy: t.float32(),
    mental: t.float32(),
    social: t.float32(),
    money: t.float32(),
    willpower: t.float32(),
    lastActionId: t.string(),
    /** Lời rủ đang tham gia ('' nếu không) */
    offerId: t.string(),
    /** Hoạt hình hiện tại (idle, sleep, study...): đặt khi làm hành vi, về idle khi di chuyển */
    anim: t.string(),
  },
  'Player'
);
export type PlayerSchema = SchemaType<typeof PlayerSchema>;

export const ChatMessageSchema = schema(
  {
    playerId: t.string(),
    name: t.string(),
    text: t.string(),
    at: t.number(),
  },
  'ChatMessage'
);
export type ChatMessageSchema = SchemaType<typeof ChatMessageSchema>;

/** Một lời rủ làm hành vi chung đang chờ người */
export const OfferSchema = schema(
  {
    id: t.string(),
    actionId: t.string(),
    hostId: t.string(),
    members: t.array('string'),
    minPlayers: t.uint8(),
    maxPlayers: t.uint8(),
  },
  'Offer'
);
export type OfferSchema = SchemaType<typeof OfferSchema>;

export const LifeState = schema(
  {
    /** Mã phòng 4 ký tự (cũng là roomId) */
    code: t.string(),
    /** planning | night | morning | ended */
    phase: t.string(),
    /** Ngày hiện tại của phòng (1..7) */
    day: t.uint8(),
    /** Mốc hết giờ của phase hiện tại (epoch ms); 0 = không đếm giờ */
    phaseEndsAt: t.number(),
    players: t.map(PlayerSchema),
    offers: t.map(OfferSchema),
    chat: t.array(ChatMessageSchema),
  },
  'LifeState'
);
export type LifeState = SchemaType<typeof LifeState>;
