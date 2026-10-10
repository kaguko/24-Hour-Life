/** Cấu hình từ biến môi trường (chỉ đọc ở điểm vào, không rải process.env khắp nơi) */
export interface ServerConfig {
  port: number;
}

export const DEFAULT_PORT = 2567;

export function readConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const raw = env.PORT;
  if (raw === undefined || raw === '') return { port: DEFAULT_PORT };
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`PORT không hợp lệ: "${raw}"`);
  return { port };
}
