import { matchMaker } from '@colyseus/core';

/**
 * Giới hạn CORS của HTTP matchmaking về danh sách origin cho phép.
 * Mặc định của Colyseus phản chiếu mọi Origin; ở production nên truyền danh sách (CORS_ORIGINS).
 * Origin không nằm trong danh sách nhận về origin đầu tiên của danh sách, nên trình duyệt sẽ chặn vì không khớp.
 * Danh sách rỗng = giữ hành vi mặc định (dev).
 */
export function installCors(allowedOrigins: string[]): void {
  if (allowedOrigins.length === 0) return;
  matchMaker.controller.getCorsHeaders = (headers: Headers) => {
    const origin = headers.get('origin')?.replace(/\/$/, '');
    return { 'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0], Vary: 'Origin' };
  };
}
