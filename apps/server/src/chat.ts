import { MAX_CHAT_LENGTH } from './protocol.js';

/** Bỏ ký tự điều khiển, gọn khoảng trắng, cắt độ dài. Trả null nếu rỗng hoặc không phải chuỗi. */
export function sanitizeText(input: unknown, maxLength = MAX_CHAT_LENGTH): string | null {
  if (typeof input !== 'string') return null;
  const text = input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return text.length > 0 ? text : null;
}
