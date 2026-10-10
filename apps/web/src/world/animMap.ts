import type { Anim, EmoteKind } from '@24h/protocol';

/**
 * Hoạt hình của game -> clip có sẵn trong Kenney Mini Characters (32 clip: idle, walk, sprint, sit, die, interact-*, holding-*, emote-*...).
 * Không dựng lại rig: chỉ ánh xạ tên. `hold`: chạy một lần rồi giữ khung cuối (ngủ, gục).
 */
export interface ClipSpec {
  clip: string;
  hold?: boolean;
  timeScale?: number;
}

export const CLIP_FOR: Record<Anim, ClipSpec> = {
  idle: { clip: 'idle' },
  walk: { clip: 'walk', timeScale: 1.5 },
  run: { clip: 'sprint', timeScale: 1.1 },
  sit: { clip: 'sit' },
  sleep: { clip: 'die', hold: true, timeScale: 0.6 },
  eat: { clip: 'holding-right' },
  study: { clip: 'interact-right' },
  phone: { clip: 'holding-both' },
  dance: { clip: 'emote-yes', timeScale: 1.6 },
  collapse: { clip: 'die', hold: true },
  wave: { clip: 'emote-yes' },
};

/** Biểu cảm giữa người chơi -> clip có sẵn (Kenney không có clip ôm/đập tay riêng nên dùng clip gần nhất) */
export const CLIP_FOR_EMOTE: Record<EmoteKind, ClipSpec & { seconds: number }> = {
  wave: { clip: 'emote-yes', timeScale: 1.3, seconds: 2.2 },
  highfive: { clip: 'interact-right', timeScale: 1.4, seconds: 1.6 },
  hug: { clip: 'holding-both', seconds: 2.4 },
  dance: { clip: 'emote-yes', timeScale: 2.2, seconds: 4 },
  cheer: { clip: 'jump', timeScale: 1.3, seconds: 2 },
};

/** Emoji nổi trên đầu khi làm biểu cảm */
export const EMOTE_EMOJI: Record<EmoteKind, string> = { wave: '👋', highfive: '🙌', hug: '🤗', dance: '💃', cheer: '🎉' };

/** Thời gian (giây) nhân vật cục bộ giữ hoạt hình hành vi trước khi về idle */
export const ACTION_ANIM_SECONDS = 4.5;
