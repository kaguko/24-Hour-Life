/**
 * SHARE ADAPTER (Clean Architecture Lite)
 * Plugs the browser (Canvas, Web Share API, Clipboard) into the domain EndingPrimitive.
 * Không có tracking, không cần server: ảnh được vẽ hoàn toàn trên máy người chơi.
 */

import { EndingPrimitive, JourneyPrimitive, PlayerStatsPrimitive, buildShareText } from '../domain';
import { JOURNEY_SERIES, WEEKDAY_SHORT } from '../lib/journeyColors';
import { ENDING_PALETTES } from '../lib/endingPalette';
import { AvatarId, avatarUrl } from '../lib/avatars';

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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getGameUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

export async function renderShareCard(
  ending: EndingPrimitive,
  stats: PlayerStatsPrimitive,
  avatarId: AvatarId,
  journey: JourneyPrimitive
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const pal = ENDING_PALETTES[ending.palette];
  const avatar = await loadImage(avatarUrl(avatarId));

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
  if (avatar) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(avatar, CARD_W / 2 - 135, 110, 270, 270);
  }
  // Huy hiệu emoji của kết cục
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.arc(CARD_W / 2 + 130, 345, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `64px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ending.emoji, CARD_W / 2 + 130, 368);

  // Nhãn "Bạn là"
  ctx.fillStyle = pal.accent;
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText('BẠN LÀ', CARD_W / 2, 420);

  // Tên kết cục (tự thu nhỏ nếu quá dài)
  ctx.fillStyle = '#ffffff';
  let size = 88;
  ctx.font = `800 ${size}px ${FONT}`;
  while (ctx.measureText(ending.title).width > CARD_W - 140 && size > 48) {
    size -= 4;
    ctx.font = `800 ${size}px ${FONT}`;
  }
  ctx.fillText(ending.title, CARD_W / 2, 510);

  // Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `italic 500 44px ${FONT}`;
  const afterTagline = drawWrapped(ctx, `"${ending.tagline}"`, CARD_W / 2, 585, CARD_W - 200, 54);

  // Thẻ điểm + số ngày
  const cardY = Math.max(afterTagline + 8, 700);
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

  // Biểu đồ hành trình: mỗi người một hình khác nhau
  const chartTop = cardY + 205;
  const chartH = 150;
  const chartLeft = 110;
  const chartW = CARD_W - 220;
  const days = journey.days;
  const slot = chartW / 7;
  const barW = slot * 0.62;
  ctx.textAlign = 'center';
  days.forEach((d, i) => {
    const x = chartLeft + i * slot + (slot - barW) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(ctx, x, chartTop, barW, chartH, 14);
    ctx.fill();
    ctx.save();
    roundRect(ctx, x, chartTop, barW, chartH, 14);
    ctx.clip();
    let y = chartTop + chartH;
    for (const s of JOURNEY_SERIES) {
      const h = (d[s.key] / 24) * chartH;
      if (h <= 0) continue;
      ctx.fillStyle = s.color;
      ctx.fillRect(x, y - h, barW, h);
      y -= h;
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(WEEKDAY_SHORT[i % 7], x + barW / 2, chartTop + chartH + 32);
  });
  if (ending.outcome !== 'survived' && days.length > 0) {
    const i = days.length - 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText('✕', chartLeft + i * slot + slot / 2, chartTop - 12);
  }
  // Chú thích
  const legend = JOURNEY_SERIES.filter((s) => s.key !== 'other');
  ctx.font = `500 24px ${FONT}`;
  const itemW = chartW / legend.length;
  legend.forEach((s, i) => {
    const lx = chartLeft + i * itemW;
    ctx.fillStyle = s.color;
    roundRect(ctx, lx, chartTop + chartH + 52, 20, 20, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(s.label.replace('Dopamine ', 'DP '), lx + 28, chartTop + chartH + 69);
  });
  const by = chartTop + chartH + 52 + 20;

  // Lời nhắn bài học
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `italic 400 32px ${FONT}`;
  drawWrapped(ctx, ending.lesson, CARD_W / 2, by + 54, CARD_W - 220, 40);

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
  async share(
    ending: EndingPrimitive,
    stats: PlayerStatsPrimitive,
    avatarId: AvatarId,
    journey: JourneyPrimitive
  ): Promise<ShareResult> {
    const text = buildShareText(ending, getGameUrl());
    try {
      const blob = await renderShareCard(ending, stats, avatarId, journey);
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
