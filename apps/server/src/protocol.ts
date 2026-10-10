/** Hợp đồng giữa client và server: tên message, giới hạn, dạng payload. */

export const ROOM_NAME = 'life';
export const MAX_PLAYERS = 8;
export const ROOM_CODE_LENGTH = 4;
/** Bỏ các ký tự dễ nhầm (I, O, 0, 1) */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const WORLD_HALF_SIZE = 50;
/** Tốc độ tối đa (đơn vị/giây): server kẹp vị trí theo giới hạn này, client không thể dịch chuyển tức thời */
export const MAX_MOVE_SPEED = 8;
export const MAX_CHAT_LENGTH = 200;
export const CHAT_HISTORY = 50;
export const CHAT_MIN_INTERVAL_MS = 500;
export const MAX_MESSAGES_PER_SECOND = 30;
export const RECONNECT_SECONDS = 20;

/** Client -> server */
export interface ClientMessages {
  action: { actionId: string };
  move: { x: number; z: number };
  chat: { text: string };
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

export interface ServerMessages {
  action_result: ActionResultMessage;
  /** Báo cáo qua đêm khi hết 24h (dạng NightResultPrimitive của domain) */
  night: unknown;
}
