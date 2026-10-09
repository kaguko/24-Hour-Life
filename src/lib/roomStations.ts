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
  | 'bed'
  | 'desk'
  | 'kitchen'
  | 'sofa'
  | 'music'
  | 'pet'
  | 'trash'
  | 'outside'
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
  bed: [1.2, 1.55],
  desk: [-0.6, 1.85],
  kitchen: [1.85, -0.9],
  sofa: [-0.98, 0.75],
  music: [0.62, 0.85],
  pet: [0.4, -0.4],
  trash: [-1.9, -0.75],
  // Ra khỏi phòng qua cạnh trước (thảm cửa ở mép sàn)
  outside: [0.12, 3.1],
  center: [0, 0.35],
};

/** Âm thanh khi nhân vật bắt đầu làm hành vi tại từng chỗ (public/sfx/room/<name>.mp3). */
export const STATION_SFX: Partial<Record<StationId, string>> = {
  desk: 'book',
  kitchen: 'pot',
  register: 'coins',
  claw: 'coins',
  sofa: 'creak',
  bed: 'cloth',
  trash: 'trash',
  arcade: 'arcade',
  vending: 'vending',
  music: 'music',
};

/** Độ cao nhân vật khi đang làm hành vi (vd nằm trên giường). */
export const STATION_Y: Partial<Record<StationId, number>> = {
  bed: 0.24,
};

export const DEFAULT_VISUAL: ActionVisual = { station: 'center', mood: 'neutral' };

export const ACTION_VISUALS: Record<string, ActionVisual> = {
  // Dopamine nhanh
  scroll_social: { station: 'arcade', mood: 'fast' },
  binge_gaming: { station: 'arcade', mood: 'fast' },
  fast_food: { station: 'vending', mood: 'fast' },
  caffeine_spike: { station: 'vending', mood: 'fast' },
  impulse_shopping: { station: 'claw', mood: 'fast' },
  beer_party: { station: 'dance', mood: 'fast' },
  tease_dog: { station: 'pet', mood: 'fast' },
  // Dopamine chậm
  exercise: { station: 'basketball', mood: 'slow' },
  short_walk: { station: 'outside', mood: 'slow' },
  study_deep: { station: 'desk', mood: 'slow' },
  learn_skill: { station: 'desk', mood: 'slow' },
  learn_soft_skills: { station: 'desk', mood: 'slow' },
  deep_talk: { station: 'sofa', mood: 'slow' },
  call_family: { station: 'sofa', mood: 'slow' },
  pet_bonding: { station: 'pet', mood: 'slow' },
  meditate_breathe: { station: 'center', mood: 'slow' },
  cook_tyrosine: { station: 'kitchen', mood: 'slow' },
  listen_music: { station: 'music', mood: 'slow' },
  clean_room: { station: 'trash', mood: 'slow' },
  // Công việc & nghỉ
  work_focused: { station: 'desk', mood: 'work' },
  work_overtime: { station: 'register', mood: 'work' },
  sleep_deep: { station: 'bed', mood: 'sleep' },
  sleep_nap: { station: 'bed', mood: 'sleep' },
};

/**
 * Biểu cảm hai pha của nhân vật: [lúc đang làm, sau khi làm xong].
 * Dopamine nhanh: sướng lúc làm, hụt hẫng sau đó. Dopamine chậm: gắng sức lúc làm, thỏa mãn sau đó.
 */
export const ACTION_EMOTE: Record<string, [string, string]> = {
  scroll_social: ['🤩', '😶'],
  binge_gaming: ['🤩', '😶'],
  fast_food: ['😋', '😪'],
  caffeine_spike: ['⚡', '😵‍💫'],
  impulse_shopping: ['🤑', '😬'],
  beer_party: ['🥳', '🤢'],
  tease_dog: ['😈', '😅'],
  exercise: ['😤', '😌'],
  short_walk: ['🚶', '😌'],
  study_deep: ['🤔', '💡'],
  learn_skill: ['🎸', '😊'],
  learn_soft_skills: ['🤔', '😊'],
  deep_talk: ['💬', '🤗'],
  call_family: ['📞', '🤗'],
  pet_bonding: ['🥰', '❤️'],
  meditate_breathe: ['😌', '🧘'],
  cook_tyrosine: ['👨‍🍳', '😋'],
  listen_music: ['🎧', '😊'],
  clean_room: ['🧹', '✨'],
  work_focused: ['🤔', '😊'],
  work_overtime: ['😓', '😮‍💨'],
  sleep_deep: ['💤', '😊'],
  sleep_nap: ['💤', '🥱'],
};

/** Tên hiển thị khi người chơi bấm vào món đồ trong phòng. */
export const STATION_LABEL: Record<StationId, string> = {
  arcade: '🕹️ Máy game – Mạng xã hội & game',
  pinball: '🎯 Pinball',
  vending: '🥤 Máy bán hàng – Đồ ăn & cà phê',
  claw: '🧸 Máy gắp – Mua sắm',
  dance: '🪩 Sàn nhảy – Tiệc tùng',
  basketball: '🏀 Bóng rổ – Vận động',
  register: '💼 Quầy – Tăng ca',
  bed: '🛏️ Giường – Ngủ',
  desk: '📚 Bàn – Học & làm việc',
  kitchen: '🍳 Bếp – Nấu ăn',
  sofa: '🛋️ Sofa – Trò chuyện & gọi điện',
  music: '🔊 Loa – Nghe nhạc',
  pet: '🐶 Chó cưng',
  trash: '🧹 Thùng rác – Dọn dẹp',
  outside: '🧥 Cửa ra vào – Ra ngoài đi bộ',
  center: '🧍 Bản thân – Thiền',
};

/** Hành vi thuộc về món đồ nào (không có trong bản đồ thì về 'center'). */
export const stationOf = (actionId: string): StationId =>
  (ACTION_VISUALS[actionId] ?? DEFAULT_VISUAL).station;

/** Hướng nhân vật quay mặt khi tương tác (rad quanh trục Y; mô hình mặc định nhìn về +Z). */
export const STATION_FACING: Record<StationId, number> = {
  arcade: Math.PI,
  vending: Math.PI,
  claw: Math.PI,
  register: Math.PI,
  pinball: -Math.PI / 2,
  basketball: -Math.PI / 2,
  dance: Math.PI / 2,
  bed: Math.PI,
  desk: Math.PI,
  kitchen: Math.PI / 2,
  sofa: Math.PI / 2,
  music: Math.PI / 2,
  pet: Math.PI / 2,
  trash: -Math.PI / 2,
  outside: 0,
  center: 0.6,
};


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
