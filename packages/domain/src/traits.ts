/**
 * PURE DOMAIN: TÍNH CÁCH
 * Mỗi ván bốc ngẫu nhiên vài nét tính cách. Mỗi nét có một mặt lợi và một mặt hại, đổi cách chỉ số vận hành
 * (nhân/cộng lên mức thay đổi của hành vi) và mức dễ bị cám dỗ. Không có nét nào là "tốt hơn hẳn".
 * Không có tính cách nào => mọi hàm ở đây trả nguyên đầu vào (ván cũ, mô phỏng cơ bản không đổi).
 */
import type { ActionPrimitive, PlayerStatsPrimitive } from './types.js';
import type { Rng } from './rng.js';

export interface TraitMods {
  /** Nhân dopamine dương của hành vi dopamine nhanh */
  fastDopamineMult?: number;
  /** Cộng ý chí cho hành vi dopamine chậm (không tính nghỉ ngơi) */
  slowWillpowerBonus?: number;
  /** Nhân Kết nối dương */
  socialGainMult?: number;
  /** Nhân tiền kiếm được từ hành vi công việc */
  workMoneyMult?: number;
  /** Nhân năng lượng tiêu hao (mọi hành vi) */
  energyDrainMult?: number;
  /** Nhân năng lượng tiêu hao của hành vi xã hội */
  socialEnergyDrainMult?: number;
  /** Nhân năng lượng tiêu hao lúc khuya (từ 21h tới 4h) */
  nightEnergyMult?: number;
  /** Nhân năng lượng tiêu hao buổi sáng (6h tới 11h) */
  morningEnergyMult?: number;
  /** Cộng tinh thần cho hành vi nghỉ ngơi */
  restMentalBonus?: number;
  /** Nhân tinh thần bị mất */
  mentalDrainMult?: number;
  /** Nhân xác suất cám dỗ tự tìm đến */
  intrusionMult?: number;
  /** Nhân độ mạnh cơn thèm của thói quen xấu */
  cravingMult?: number;
}

export interface TraitDef {
  id: string;
  emoji: string;
  name: string;
  upside: string;
  downside: string;
  mods: TraitMods;
}

export const TRAITS: TraitDef[] = [
  {
    id: 'night_owl',
    emoji: '🦉',
    name: 'Cú đêm',
    upside: 'Khuya vẫn tỉnh táo, ít tốn sức hơn',
    downside: 'Buổi sáng uể oải, tốn sức hơn',
    mods: { nightEnergyMult: 0.7, morningEnergyMult: 1.3 },
  },
  {
    id: 'early_bird',
    emoji: '🐓',
    name: 'Chim sớm',
    upside: 'Buổi sáng làm gì cũng nhẹ',
    downside: 'Khuya nhanh kiệt sức',
    mods: { morningEnergyMult: 0.7, nightEnergyMult: 1.3 },
  },
  {
    id: 'addictive',
    emoji: '🎰',
    name: 'Dễ bị cuốn',
    upside: 'Thú vui nhanh đem lại nhiều dopamine hơn',
    downside: 'Cám dỗ tìm đến thường xuyên, cơn thèm mạnh hơn',
    mods: { fastDopamineMult: 1.2, intrusionMult: 1.4, cravingMult: 1.5 },
  },
  {
    id: 'disciplined',
    emoji: '🧱',
    name: 'Kỷ luật thép',
    upside: 'Việc khó tiếp thêm ý chí, cám dỗ ít bám',
    downside: 'Thú vui nhanh kém hấp dẫn, dopamine thấp hơn',
    mods: { slowWillpowerBonus: 3, fastDopamineMult: 0.85, intrusionMult: 0.7 },
  },
  {
    id: 'introvert',
    emoji: '🏠',
    name: 'Hướng nội',
    upside: 'Ở một mình là hồi tinh thần',
    downside: 'Giao tiếp tốn sức, kết nối tăng chậm',
    mods: { restMentalBonus: 3, socialGainMult: 0.8, socialEnergyDrainMult: 1.3 },
  },
  {
    id: 'extrovert',
    emoji: '🎉',
    name: 'Hướng ngoại',
    upside: 'Kết nối tăng nhanh, giao tiếp ít tốn sức',
    downside: 'Ở một mình thấy trống, nghỉ ngơi kém hồi tinh thần',
    mods: { socialGainMult: 1.3, socialEnergyDrainMult: 0.8, restMentalBonus: -2 },
  },
  {
    id: 'hustler',
    emoji: '💼',
    name: 'Cày cuốc',
    upside: 'Kiếm tiền từ công việc nhiều hơn',
    downside: 'Mọi việc đều tốn sức hơn một chút',
    mods: { workMoneyMult: 1.2, energyDrainMult: 1.1 },
  },
  {
    id: 'anxious',
    emoji: '🌧️',
    name: 'Hay lo',
    upside: 'Lên kế hoạch kỹ, việc khó bớt cảm giác nặng nề',
    downside: 'Tinh thần mất nhanh hơn',
    mods: { slowWillpowerBonus: 2, mentalDrainMult: 1.25 },
  },
];

/** Các nét loại trừ nhau (không bốc cùng ván) */
const CONFLICTS: string[][] = [
  ['night_owl', 'early_bird'],
  ['introvert', 'extrovert'],
  ['addictive', 'disciplined'],
];

export const TRAITS_PER_RUN = 2;

export const traitById = (id: string): TraitDef | undefined => TRAITS.find((t) => t.id === id);
export const isTraitId = (id: unknown): id is string => typeof id === 'string' && TRAITS.some((t) => t.id === id);

const conflicts = (a: string, b: string) => CONFLICTS.some((g) => g.includes(a) && g.includes(b));

/** Bốc `count` nét không mâu thuẫn nhau; mỗi nét tiêu thụ đúng một lần rng */
export function pickTraitIds(rng: Rng, count = TRAITS_PER_RUN): string[] {
  const pool = [...TRAITS];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    if (picked.every((p) => !conflicts(p, t.id))) picked.push(t.id);
  }
  return picked;
}

/** Gộp mọi nét thành một bộ hệ số (nhân dồn, cộng dồn) */
export function combineTraitMods(traitIds: string[]): Required<TraitMods> {
  const m: Required<TraitMods> = {
    fastDopamineMult: 1,
    slowWillpowerBonus: 0,
    socialGainMult: 1,
    workMoneyMult: 1,
    energyDrainMult: 1,
    socialEnergyDrainMult: 1,
    nightEnergyMult: 1,
    morningEnergyMult: 1,
    restMentalBonus: 0,
    mentalDrainMult: 1,
    intrusionMult: 1,
    cravingMult: 1,
  };
  for (const id of traitIds) {
    const t = traitById(id);
    if (!t) continue;
    const x = t.mods;
    m.fastDopamineMult *= x.fastDopamineMult ?? 1;
    m.slowWillpowerBonus += x.slowWillpowerBonus ?? 0;
    m.socialGainMult *= x.socialGainMult ?? 1;
    m.workMoneyMult *= x.workMoneyMult ?? 1;
    m.energyDrainMult *= x.energyDrainMult ?? 1;
    m.socialEnergyDrainMult *= x.socialEnergyDrainMult ?? 1;
    m.nightEnergyMult *= x.nightEnergyMult ?? 1;
    m.morningEnergyMult *= x.morningEnergyMult ?? 1;
    m.restMentalBonus += x.restMentalBonus ?? 0;
    m.mentalDrainMult *= x.mentalDrainMult ?? 1;
    m.intrusionMult *= x.intrusionMult ?? 1;
    m.cravingMult *= x.cravingMult ?? 1;
  }
  return m;
}

export const traitIntrusionMult = (traitIds: string[]): number => combineTraitMods(traitIds).intrusionMult;
export const traitCravingMult = (traitIds: string[]): number => combineTraitMods(traitIds).cravingMult;

/**
 * Áp tính cách lên mức thay đổi chỉ số của một hành vi (gọi sau kỹ năng và thói quen).
 * `clock` là giờ đồng hồ lúc bắt đầu hành vi (0-24).
 */
export function applyTraits(
  action: ActionPrimitive,
  deltas: Partial<PlayerStatsPrimitive>,
  clock: number,
  traitIds: string[]
): Partial<PlayerStatsPrimitive> {
  if (traitIds.length === 0) return deltas;
  const m = combineTraitMods(traitIds);
  const out: Partial<PlayerStatsPrimitive> = { ...deltas };

  if (action.dopaminePathway === 'fast' && (out.dopamine ?? 0) > 0) {
    out.dopamine = Math.round((out.dopamine ?? 0) * m.fastDopamineMult);
  }
  if (action.dopaminePathway === 'slow' && action.category !== 'rest') {
    out.willpower = (out.willpower ?? 0) + m.slowWillpowerBonus;
  }
  if ((out.social ?? 0) > 0) out.social = Math.round((out.social ?? 0) * m.socialGainMult);
  if (action.category === 'work' && (out.money ?? 0) > 0) out.money = Math.round((out.money ?? 0) * m.workMoneyMult);
  if (action.category === 'rest') out.mental = (out.mental ?? 0) + m.restMentalBonus;
  if ((out.mental ?? 0) < 0) out.mental = Math.round((out.mental ?? 0) * m.mentalDrainMult);

  if ((out.energy ?? 0) < 0) {
    let k = m.energyDrainMult;
    if (action.category === 'social') k *= m.socialEnergyDrainMult;
    if (clock >= 21 || clock < 4) k *= m.nightEnergyMult;
    else if (clock >= 6 && clock < 11) k *= m.morningEnergyMult;
    out.energy = Math.round((out.energy ?? 0) * k);
  }
  return out;
}
