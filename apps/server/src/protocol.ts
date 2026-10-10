import type { NightResultPrimitive } from '@24h/domain';

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
  planningMs: 90_000,
  nightMs: 2_000,
  morningMs: 15_000,
  reconnectMs: 60_000,
};

/** Client -> server */
export interface ClientMessages {
  action: { actionId: string };
  move: { x: number; z: number };
  chat: { text: string };
  /** Sẵn sàng qua đêm (planning) / sẵn sàng sang ngày mới (morning). `ready: false` để hủy. Mặc định true. */
  ready: { ready?: boolean };
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
}

export interface ServerMessages {
  action_result: ActionResultMessage;
  morning: MorningReportMessage;
}
