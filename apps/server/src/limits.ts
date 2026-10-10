import { sanitizeText } from './chat.js';

/** Giới hạn tài nguyên và thao tác lạm dụng của server (chỉ server quyết định, client không đổi được) */
export interface Limits {
  /** Số phòng tối đa cùng lúc trên một tiến trình */
  maxRooms: number;
  /** Số lượt tạo/vào phòng tối đa mỗi phút trên mỗi địa chỉ IP */
  joinsPerMinute: number;
}

export const DEFAULT_LIMITS: Limits = { maxRooms: 200, joinsPerMinute: 120 };

/** Cửa sổ trượt: cho phép tối đa `max` lần trong `windowMs` cho mỗi khoá */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs = 60_000
  ) {}

  /** Ghi nhận một lần; trả false nếu đã vượt giới hạn (lần này không được tính) */
  hit(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    // dọn khoá cũ để Map không phình mãi
    if (this.hits.size > 5000) for (const [k, v] of this.hits) if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
    return true;
  }
}

const URL_RE = /(https?:\/\/|www\.)\S+|\b[\w-]+\.(com|net|org|vn|io|xyz|gg|ly|me)\b\S*/gi;

const HAS_URL = new RegExp(URL_RE.source, 'i');

/** Thay đường dẫn trong chat bằng [link] (không cho quảng cáo / dẫn người chơi đi nơi khác) */
export const scrubLinks = (text: string): string => text.replace(URL_RE, '[link]');

/**
 * Tên hiển thị: bỏ ký tự điều khiển và ký tự HTML, không cho chứa đường dẫn. Trả null nếu không dùng được
 * (khi đó server đặt tên mặc định "Người chơi N"). Chỉ lưu trong phiên chơi.
 */
export function sanitizeName(input: unknown, max = 24): string | null {
  const t = sanitizeText(input, max);
  if (!t) return null;
  const cleaned = t.replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned || HAS_URL.test(cleaned)) return null;
  return cleaned;
}
