import type { EndingPalette } from '../domain';

/** Bảng màu gradient cho từng kết cục (dùng chung UI và ảnh chia sẻ). */
export const ENDING_PALETTES: Record<EndingPalette, { from: string; to: string; accent: string }> = {
  rose: { from: '#4c0519', to: '#be123c', accent: '#fda4af' },
  fuchsia: { from: '#4a044e', to: '#a21caf', accent: '#f0abfc' },
  orange: { from: '#431407', to: '#c2410c', accent: '#fdba74' },
  sky: { from: '#082f49', to: '#0369a1', accent: '#7dd3fc' },
  amber: { from: '#451a03', to: '#b45309', accent: '#fcd34d' },
  slate: { from: '#0f172a', to: '#475569', accent: '#cbd5e1' },
  emerald: { from: '#022c22', to: '#047857', accent: '#6ee7b7' },
  violet: { from: '#2e1065', to: '#6d28d9', accent: '#c4b5fd' },
  teal: { from: '#042f2e', to: '#0f766e', accent: '#5eead4' },
  indigo: { from: '#1e1b4b', to: '#4338ca', accent: '#a5b4fc' },
};
