/**
 * SHARE ADAPTER (Clean Architecture Lite)
 * Plugs the browser (Canvas, Web Share API, Clipboard) into the domain EndingPrimitive.
 * Không có tracking, không cần server: ảnh được vẽ hoàn toàn trên máy người chơi.
 */

import { EndingPrimitive, PlayerStatsPrimitive, buildShareText } from '../domain';
import { ENDING_PALETTES } from '../lib/endingPalette';

const CARD_W = 1080;
const CARD_H = 1350;

const FONT = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getGameUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

export async function renderShareCard(
  ending: EndingPrimitive,
  stats: PlayerStatsPrimitive
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const pal = ENDING_PALETTES[ending.palette];

  // Nền gradient
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, pal.from);
  bg.addColorStop(1, pal.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Vòng sáng trang trí
  const glow = ctx.createRadialGradient(CARD_W / 2, 280, 20, CARD_W / 2, 280, 520);
  glow.addColorStop(0, 'rgba(255,255,255,0.22)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Thương hiệu
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText('CUỘC SỐNG 24 GIỜ', CARD_W / 2, 90);

  // Emoji
  ctx.font = `170px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ending.emoji, CARD_W / 2, 300);

  // Nhãn "Bạn là"
  ctx.fillStyle = pal.accent;
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText('BẠN LÀ', CARD_W / 2, 385);

  // Tên kết cục (tự thu nhỏ nếu quá dài)
  ctx.fillStyle = '#ffffff';
  let size = 88;
  ctx.font = `800 ${size}px ${FONT}`;
  while (ctx.measureText(ending.title).width > CARD_W - 140 && size > 48) {
    size -= 4;
    ctx.font = `800 ${size}px ${FONT}`;
  }
  ctx.fillText(ending.title, CARD_W / 2, 485);

  // Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `italic 500 44px ${FONT}`;
  const afterTagline = drawWrapped(ctx, `"${ending.tagline}"`, CARD_W / 2, 565, CARD_W - 200, 54);

  // Thẻ điểm + số ngày
  const cardY = Math.max(afterTagline + 10, 690);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, 90, cardY, CARD_W - 180, 180, 36);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 100px ${FONT}`;
  ctx.fillText(String(ending.score), CARD_W / 2 - 220, cardY + 112);
  ctx.fillStyle = pal.accent;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText('ĐIỂM / 100', CARD_W / 2 - 220, cardY + 152);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 100px ${FONT}`;
  ctx.fillText(ending.outcome === 'survived' ? '7' : String(ending.daysSurvived), CARD_W / 2 + 220, cardY + 112);
  ctx.fillStyle = pal.accent;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(ending.outcome === 'survived' ? 'NGÀY SỐNG SÓT' : 'NGÀY TRƯỚC KHI GỤC', CARD_W / 2 + 220, cardY + 152);

  // Thanh chỉ số cuối
  const bars: Array<[string, number]> = [
    ['Năng lượng', stats.energy],
    ['Tinh thần', stats.mental],
    ['Ý chí', stats.willpower],
    ['Kết nối', stats.social],
  ];
  let by = cardY + 255;
  ctx.textAlign = 'left';
  for (const [label, value] of bars) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(label, 110, by);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, 330, by - 24, 640, 26, 13);
    ctx.fill();
    ctx.fillStyle = pal.accent;
    roundRect(ctx, 330, by - 24, Math.max(26, (640 * Math.max(0, Math.min(100, value))) / 100), 26, 13);
    ctx.fill();
    by += 48;
  }

  // Lời nhắn bài học
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `italic 400 32px ${FONT}`;
  drawWrapped(ctx, ending.lesson, CARD_W / 2, by + 30, CARD_W - 220, 42);

  // Chân thẻ
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('Bạn sống được mấy ngày?', CARD_W / 2, CARD_H - 70);
  ctx.fillStyle = pal.accent;
  ctx.font = `500 30px ${FONT}`;
  const url = getGameUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (url) ctx.fillText(url, CARD_W / 2, CARD_H - 28);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export type ShareResult = 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const shareAdapter = {
  getShareText(ending: EndingPrimitive): string {
    return buildShareText(ending, getGameUrl());
  },

  /** Chia sẻ ảnh + văn bản bằng Web Share (mobile). Không hỗ trợ -> tải ảnh xuống và chép văn bản. */
  async share(ending: EndingPrimitive, stats: PlayerStatsPrimitive): Promise<ShareResult> {
    const text = buildShareText(ending, getGameUrl());
    try {
      const blob = await renderShareCard(ending, stats);
      if (blob && typeof navigator !== 'undefined' && navigator.canShare && navigator.share) {
        const file = new File([blob], '24h-life-ket-cuc.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text, title: 'Cuộc Sống 24 Giờ' });
          return 'shared';
        }
      }
      if (blob) {
        downloadBlob(blob, '24h-life-ket-cuc.png');
        await copyText(text);
        return 'downloaded';
      }
      return (await copyText(text)) ? 'copied' : 'failed';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      return (await copyText(text)) ? 'copied' : 'failed';
    }
  },

  async copy(ending: EndingPrimitive): Promise<boolean> {
    return copyText(buildShareText(ending, getGameUrl()));
  },
};
