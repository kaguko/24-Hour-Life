/** Màu chữ cho nhãn phụ trên thẻ hành vi: cảnh báo (amber), đi đường (sky), tích cực (emerald). */
export function tagTone(tag: string): string {
  if (tag.includes('nhờn')) return 'text-amber-700';
  if (tag.startsWith('🚶')) return 'text-sky-700';
  return 'text-emerald-700';
}
