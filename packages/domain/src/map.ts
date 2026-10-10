/**
 * PURE DOMAIN: BẢN ĐỒ THÀNH PHỐ & DI CHUYỂN
 * Mỗi hành vi diễn ra ở một địa điểm. Đổi địa điểm tốn thời gian đi đường (một "hành vi" di chuyển thật,
 * có trong lịch sử ngày), một ít năng lượng, tiền và tinh thần.
 */
import { ActionPrimitive } from './types.js';

export type LocationId = 'home' | 'office' | 'school' | 'cafe' | 'gym' | 'park' | 'market' | 'bar';

export interface LocationDef {
  id: LocationId;
  name: string;
  emoji: string;
  tagline: string;
  /** Thời gian đi từ nhà (giờ) */
  distHome: number;
  /** Giờ mở cửa: [mở, đóng) theo đồng hồ, có thể vắt qua nửa đêm. Không có = luôn mở */
  open?: [number, number];
}

export const LOCATIONS: LocationDef[] = [
  { id: 'home', name: 'Nhà', emoji: '🏠', tagline: 'Phòng của bạn', distHome: 0 },
  { id: 'office', name: 'Công ty', emoji: '🏢', tagline: 'Kiếm tiền nuôi sống bản thân', distHome: 0.75, open: [7, 22] },
  { id: 'school', name: 'Trường & thư viện', emoji: '🏫', tagline: 'Học tập và câu lạc bộ', distHome: 0.5, open: [7, 21] },
  { id: 'cafe', name: 'Quán cà phê', emoji: '☕', tagline: 'Bạn bè, caffeine và việc làm thêm', distHome: 0.25, open: [6, 23] },
  { id: 'gym', name: 'Phòng gym', emoji: '🏋️', tagline: 'Tập luyện có kế hoạch', distHome: 0.5, open: [5, 22] },
  { id: 'park', name: 'Công viên', emoji: '🌳', tagline: 'Chạy bộ, đi dạo, chó mèo', distHome: 0.25, open: [5, 22] },
  { id: 'market', name: 'Chợ & siêu thị', emoji: '🛒', tagline: 'Mua sắm và đồ ăn vặt', distHome: 0.25, open: [7, 22] },
  { id: 'bar', name: 'Quán nhậu', emoji: '🍻', tagline: 'Tiệc tùng về đêm', distHome: 0.5, open: [17, 3] },
];

export const LOCATION_IDS = LOCATIONS.map((l) => l.id);

export const isLocationId = (v: unknown): v is LocationId => typeof v === 'string' && LOCATION_IDS.includes(v as LocationId);

export const locationDef = (id: LocationId): LocationDef => LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];

/** Hành vi nào diễn ra ở đâu (không có trong bảng = ở nhà) */
export const ACTION_LOCATION: Record<string, LocationId> = {
  // Công ty
  work_focused: 'office',
  work_overtime: 'office',
  // Trường & thư viện
  study_deep: 'school',
  learn_soft_skills: 'school',
  deep_research: 'school',
  public_speaking: 'school',
  // Quán cà phê
  caffeine_spike: 'cafe',
  cafe_friends: 'cafe',
  deep_talk: 'cafe',
  date_night: 'cafe',
  board_game_night: 'cafe',
  part_time_shift: 'cafe',
  // Phòng gym
  gym_session: 'gym',
  // Công viên
  exercise: 'park',
  short_walk: 'park',
  sunset_walk: 'park',
  marathon_training: 'park',
  tease_dog: 'park',
  volunteer: 'park',
  // Chợ & siêu thị
  impulse_shopping: 'market',
  fast_food: 'market',
  // Quán nhậu
  beer_party: 'bar',
};

export const locationOf = (actionId: string): LocationId => ACTION_LOCATION[actionId] ?? 'home';

const roundQuarter = (n: number) => Math.round(n / 0.25) * 0.25;

/** Thời gian đi giữa hai địa điểm (giờ). Qua lại nhà = khoảng cách gốc; giữa hai nơi ngoài thì đi tắt. */
export function travelHours(from: LocationId, to: LocationId): number {
  if (from === to) return 0;
  const a = locationDef(from).distHome;
  const b = locationDef(to).distHome;
  if (from === 'home') return b;
  if (to === 'home') return a;
  return Math.max(0.25, roundQuarter((a + b) * 0.6));
}

export const travelActionId = (from: LocationId, to: LocationId) => `travel_${from}_${to}`;

export const isTravelId = (id: string) => id.startsWith('travel_');

/** Cửa hàng đang mở không (nhà luôn "mở") */
export function isLocationOpen(id: LocationId, clock: number): boolean {
  const open = locationDef(id).open;
  if (!open) return true;
  const [from, to] = open;
  const h = ((clock % 24) + 24) % 24;
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

export function openHoursLabel(id: LocationId): string {
  const open = locationDef(id).open;
  if (!open) return 'Luôn mở';
  const f = (h: number) => `${String(h % 24).padStart(2, '0')}h`;
  return `${f(open[0])}–${f(open[1])}`;
}

/** Hành vi di chuyển giữa hai địa điểm: có thời lượng, tốn chút sức, tiền và tinh thần */
function makeTravelAction(from: LocationId, to: LocationId): ActionPrimitive {
  const hours = travelHours(from, to);
  const dest = locationDef(to);
  return {
    id: travelActionId(from, to),
    title: `Di chuyển đến ${dest.name} (${hours} giờ)`,
    category: 'travel',
    dopaminePathway: 'none',
    hours,
    description: `Đi từ ${locationDef(from).name} đến ${dest.name}.`,
    willpowerCost: 0,
    isTemptation: false,
    baseEnergy: -Math.max(1, Math.round(hours * 8)),
    baseMoney: -Math.round(hours * 28),
    baseMental: -Math.max(1, Math.round(hours * 3)),
  };
}

/** Mọi cặp (từ, đến) khác nhau */
export const TRAVEL_ACTIONS: ActionPrimitive[] = LOCATION_IDS.flatMap((from) =>
  LOCATION_IDS.filter((to) => to !== from).map((to) => makeTravelAction(from, to))
);
