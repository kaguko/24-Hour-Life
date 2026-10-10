import type { Anim } from '@24h/protocol';

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

/** Thời gian (giây) nhân vật cục bộ giữ hoạt hình hành vi trước khi về idle */
export const ACTION_ANIM_SECONDS = 4.5;
