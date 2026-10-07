/**
 * Bản đồ trình bày cho cảnh 3D: hành vi nào dẫn nhân vật tới món đồ nào.
 * Chỉ là dữ liệu hiển thị - không ảnh hưởng luật chơi trong domain.
 */

export type StationId =
  | 'arcade'
  | 'pinball'
  | 'vending'
  | 'claw'
  | 'dance'
  | 'basketball'
  | 'register'
  | 'center';

export type ActionMood = 'fast' | 'slow' | 'work' | 'sleep' | 'neutral';

export interface ActionVisual {
  station: StationId;
  mood: ActionMood;
}

/** Vị trí (x, z) trong phòng của từng điểm đến. */
export const STATION_POS: Record<StationId, [number, number]> = {
  arcade: [-1.45, -0.95],
  pinball: [-1.25, 0.2],
  vending: [0.55, -1.2],
  claw: [-0.35, -1.2],
  dance: [1.0, 0.15],
  basketball: [-1.0, 1.2],
  register: [1.5, -1.05],
  center: [0, 0.35],
};

export const ACTION_VISUALS: Record<string, ActionVisual> = {
  // Dopamine nhanh
  scroll_social: { station: 'arcade', mood: 'fast' },
  binge_gaming: { station: 'arcade', mood: 'fast' },
  fast_food: { station: 'vending', mood: 'fast' },
  caffeine_spike: { station: 'vending', mood: 'fast' },
  impulse_shopping: { station: 'claw', mood: 'fast' },
  beer_party: { station: 'dance', mood: 'fast' },
  tease_dog: { station: 'pinball', mood: 'fast' },
  // Dopamine chậm
  exercise: { station: 'basketball', mood: 'slow' },
  short_walk: { station: 'center', mood: 'slow' },
  study_deep: { station: 'center', mood: 'slow' },
  learn_skill: { station: 'center', mood: 'slow' },
  learn_soft_skills: { station: 'center', mood: 'slow' },
  deep_talk: { station: 'center', mood: 'slow' },
  call_family: { station: 'center', mood: 'slow' },
  pet_bonding: { station: 'center', mood: 'slow' },
  meditate_breathe: { station: 'center', mood: 'slow' },
  cook_tyrosine: { station: 'center', mood: 'slow' },
  listen_music: { station: 'center', mood: 'slow' },
  clean_room: { station: 'center', mood: 'slow' },
  // Công việc & nghỉ
  work_focused: { station: 'register', mood: 'work' },
  work_overtime: { station: 'register', mood: 'work' },
  sleep_deep: { station: 'center', mood: 'sleep' },
  sleep_nap: { station: 'center', mood: 'sleep' },
};

/** Hướng nhân vật quay mặt khi tương tác (rad quanh trục Y; mô hình mặc định nhìn về +Z). */
export const STATION_FACING: Record<StationId, number> = {
  arcade: Math.PI,
  vending: Math.PI,
  claw: Math.PI,
  register: Math.PI,
  pinball: -Math.PI / 2,
  basketball: -Math.PI / 2,
  dance: Math.PI / 2,
  center: 0.6,
};

export const DEFAULT_VISUAL: ActionVisual = { station: 'center', mood: 'neutral' };

/** Màu phát sáng khi nhân vật tương tác (hex). */
export const MOOD_GLOW: Record<ActionMood, number> = {
  fast: 0xff2d95,
  slow: 0x34d399,
  work: 0xfbbf24,
  sleep: 0x60a5fa,
  neutral: 0xffffff,
};

/** Màu bầu trời theo giờ trong ngày (giờ 0-24). */
export const SKY_KEYS: Array<[number, number]> = [
  [0, 0x14143c],
  [5, 0x2a2a62],
  [7, 0xf2b07c],
  [10, 0xa6d8ff],
  [15, 0xbfe3ff],
  [18, 0xffae78],
  [20, 0x3a2f6e],
  [24, 0x14143c],
];
