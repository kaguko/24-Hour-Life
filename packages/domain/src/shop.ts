/**
 * PURE DOMAIN: CỬA HÀNG NỘI THẤT
 * Món đồ mua bằng tiền trong ván, đặt lên đồ có sẵn trong phòng. Mỗi món đổi cách chỉ số vận hành (như tính cách
 * nhưng mua được) và đều có cái giá: tiền, hoặc một mặt hại đi kèm. Không có món nào trong danh sách làm các
 * kiểu chơi cực đoan thắng được (xem sim.ts: tham số itemIds). Chưa mua gì => mọi hàm trả nguyên đầu vào.
 * Vị trí / mô hình 3D của từng món nằm ở apps/web/src/lib/roomItems.ts (chỉ là trình bày).
 */
import type { ActionPrimitive, PlayerStatsPrimitive } from './types.js';
import { ACTION_SKILL } from './progression.js';

export interface ItemMods {
  /** Nhân năng lượng hồi khi ngủ (sleep_*) */
  sleepEnergyMult?: number;
  /** Nhân tinh thần dương của hành vi luyện Trí tuệ (học, đọc, thiền) */
  studyMentalMult?: number;
  /** Nhân năng lượng tiêu hao của công việc */
  workEnergyDrainMult?: number;
  /** Cộng tinh thần cho hành vi nghỉ ngơi (không tính ngủ) */
  restMentalBonus?: number;
  /** Nhân dopamine dương của hành vi dopamine nhanh */
  fastDopamineMult?: number;
  /** Nhân xác suất cám dỗ tự tìm đến */
  intrusionMult?: number;
  /** Nhân Kết nối dương */
  socialGainMult?: number;
  /** Cộng tinh thần khi tự nấu ăn lành mạnh */
  cookMentalBonus?: number;
}

export interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  /** Nghìn VNĐ */
  cost: number;
  /** Mô tả ngắn món đồ */
  blurb: string;
  /** Lợi ích */
  upside: string;
  /** Cái giá đi kèm (nếu có) */
  downside?: string;
  mods: ItemMods;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'pillow',
    emoji: '🛏️',
    name: 'Gối êm',
    cost: 300,
    blurb: 'Một chiếc gối đúng độ cao.',
    upside: 'Ngủ hồi thêm 12% năng lượng',
    mods: { sleepEnergyMult: 1.12 },
  },
  {
    id: 'desk_lamp',
    emoji: '💡',
    name: 'Đèn bàn học',
    cost: 450,
    blurb: 'Ánh sáng ấm, không chói mắt.',
    upside: 'Làm việc đỡ tốn sức 8%, học tập thu thêm 10% tinh thần',
    mods: { workEnergyDrainMult: 0.92, studyMentalMult: 1.1 },
  },
  {
    id: 'bookcase',
    emoji: '📚',
    name: 'Kệ sách',
    cost: 900,
    blurb: 'Sách trong tầm tay là sách sẽ được mở.',
    upside: 'Học, đọc, thiền thu thêm 15% tinh thần',
    mods: { studyMentalMult: 1.15 },
  },
  {
    id: 'tv',
    emoji: '📺',
    name: 'Tivi & tủ',
    cost: 1600,
    blurb: 'Tối nào cũng có thứ gì đó để xem.',
    upside: 'Nghỉ ngơi hồi thêm 2 tinh thần, thú vui nhanh nhiều dopamine hơn 10%',
    downside: 'Cám dỗ tìm đến thường xuyên hơn 20%',
    mods: { restMentalBonus: 2, fastDopamineMult: 1.1, intrusionMult: 1.2 },
  },
  {
    id: 'small_plant',
    emoji: '🪴',
    name: 'Chậu cây nhỏ',
    cost: 150,
    blurb: 'Một chút xanh trên bàn làm việc.',
    upside: 'Nghỉ ngơi hồi thêm 2 tinh thần',
    mods: { restMentalBonus: 2 },
  },
  {
    id: 'small_fridge',
    emoji: '🧊',
    name: 'Tủ lạnh nhỏ',
    cost: 800,
    blurb: 'Có đồ ăn sẵn thì đỡ gọi đồ ăn vặt.',
    upside: 'Cám dỗ ăn vặt ít tìm đến hơn 15%, tự nấu ăn thu thêm 3 tinh thần',
    mods: { intrusionMult: 0.85, cookMentalBonus: 3 },
  },
  {
    id: 'coffee_table',
    emoji: '☕',
    name: 'Bàn trà',
    cost: 500,
    blurb: 'Chỗ để cốc trà khi bạn bè ghé chơi.',
    upside: 'Hoạt động kết nối thu thêm 12% Kết nối',
    mods: { socialGainMult: 1.12 },
  },
];

/** Luôn giữ lại chừng này tiền sau khi mua (còn tiền trọ và chi phí bất ngờ) */
export const SHOP_RESERVE = 500;

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);
export const isItemId = (id: unknown): id is string => typeof id === 'string' && SHOP_ITEMS.some((i) => i.id === id);

/** Gộp mọi món đã mua thành một bộ hệ số */
export function combineItemMods(itemIds: string[]): Required<ItemMods> {
  const m: Required<ItemMods> = {
    sleepEnergyMult: 1,
    studyMentalMult: 1,
    workEnergyDrainMult: 1,
    restMentalBonus: 0,
    fastDopamineMult: 1,
    intrusionMult: 1,
    socialGainMult: 1,
    cookMentalBonus: 0,
  };
  for (const id of itemIds) {
    const x = itemById(id)?.mods;
    if (!x) continue;
    m.sleepEnergyMult *= x.sleepEnergyMult ?? 1;
    m.studyMentalMult *= x.studyMentalMult ?? 1;
    m.workEnergyDrainMult *= x.workEnergyDrainMult ?? 1;
    m.restMentalBonus += x.restMentalBonus ?? 0;
    m.fastDopamineMult *= x.fastDopamineMult ?? 1;
    m.intrusionMult *= x.intrusionMult ?? 1;
    m.socialGainMult *= x.socialGainMult ?? 1;
    m.cookMentalBonus += x.cookMentalBonus ?? 0;
  }
  return m;
}

export const itemIntrusionMult = (itemIds: string[]): number => combineItemMods(itemIds).intrusionMult;

/** Áp đồ đã mua lên mức thay đổi chỉ số của một hành vi (gọi sau tính cách) */
export function applyItems(
  action: ActionPrimitive,
  deltas: Partial<PlayerStatsPrimitive>,
  itemIds: string[]
): Partial<PlayerStatsPrimitive> {
  if (itemIds.length === 0) return deltas;
  const m = combineItemMods(itemIds);
  const out: Partial<PlayerStatsPrimitive> = { ...deltas };
  const isSleep = action.id.startsWith('sleep');

  if (isSleep && (out.energy ?? 0) > 0) out.energy = Math.round((out.energy ?? 0) * m.sleepEnergyMult);
  if (ACTION_SKILL[action.id]?.skill === 'mind' && (out.mental ?? 0) > 0) out.mental = Math.round((out.mental ?? 0) * m.studyMentalMult);
  if (action.category === 'work' && (out.energy ?? 0) < 0) out.energy = Math.round((out.energy ?? 0) * m.workEnergyDrainMult);
  if (action.category === 'rest' && !isSleep) out.mental = (out.mental ?? 0) + m.restMentalBonus;
  if (action.dopaminePathway === 'fast' && (out.dopamine ?? 0) > 0) out.dopamine = Math.round((out.dopamine ?? 0) * m.fastDopamineMult);
  if ((out.social ?? 0) > 0) out.social = Math.round((out.social ?? 0) * m.socialGainMult);
  if (action.id === 'cook_tyrosine') out.mental = (out.mental ?? 0) + m.cookMentalBonus;
  return out;
}

export type BuyBlock = 'unknown' | 'owned' | 'poor';

/** Lý do không mua được (null = mua được) */
export function itemBuyBlock(itemId: string, owned: string[], money: number): BuyBlock | null {
  const item = itemById(itemId);
  if (!item) return 'unknown';
  if (owned.includes(itemId)) return 'owned';
  if (money - item.cost < SHOP_RESERVE) return 'poor';
  return null;
}
