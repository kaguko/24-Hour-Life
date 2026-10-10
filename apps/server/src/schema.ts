import { schema, t, type SchemaType } from '@colyseus/schema';

/**
 * Phần công khai của mỗi người chơi. Toàn bộ do server ghi; client chỉ đọc.
 * Tiến trình đầy đủ (lịch sử, nợ ngủ, mục tiêu...) nằm trong PlayerState ở server.
 */
export const PlayerSchema = schema(
  {
    id: t.string(),
    name: t.string(),
    connected: t.boolean(),
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

export const LifeState = schema(
  {
    /** Mã phòng 4 ký tự (cũng là roomId) */
    code: t.string(),
    players: t.map(PlayerSchema),
    chat: t.array(ChatMessageSchema),
  },
  'LifeState'
);
export type LifeState = SchemaType<typeof LifeState>;
