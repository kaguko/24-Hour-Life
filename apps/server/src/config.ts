/** Cấu hình từ biến môi trường (chỉ đọc ở điểm vào, không rải process.env khắp nơi) */
export interface ServerConfig {
  port: number;
  /**
   * Các origin được phép gọi HTTP matchmaking (frontend trên Vercel...). Rỗng = cho mọi origin (chỉ nên dùng khi dev).
   * Ví dụ: CORS_ORIGINS="https://24-hour-life.vercel.app,https://24-hour-life-git-main.vercel.app"
   */
  corsOrigins: string[];
  /** Giới hạn chống lạm dụng (env MAX_ROOMS, JOINS_PER_MINUTE) */
  limits: { maxRooms: number; joinsPerMinute: number };
}

export const DEFAULT_PORT = 2567;

export function readConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const raw = env.PORT;
  let port = DEFAULT_PORT;
  if (raw !== undefined && raw !== '') {
    port = Number(raw);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`PORT không hợp lệ: "${raw}"`);
  }

  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  for (const o of corsOrigins) {
    if (o !== '*' && !/^https?:\/\/[^/\s]+$/.test(o)) throw new Error(`CORS_ORIGINS không hợp lệ: "${o}" (cần dạng https://ten-mien)`);
  }
  const positive = (name: string, fallback: number): number => {
    const v = env[name];
    if (v === undefined || v === '') return fallback;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new Error(`${name} không hợp lệ: "${v}"`);
    return n;
  };
  return {
    port,
    corsOrigins: corsOrigins.includes('*') ? [] : corsOrigins,
    limits: { maxRooms: positive('MAX_ROOMS', 200), joinsPerMinute: positive('JOINS_PER_MINUTE', 120) },
  };
}
