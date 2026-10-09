/**
 * PURE DOMAIN: CÁM DỖ XÂM NHẬP
 * Khi ý chí thấp, cám dỗ tự tìm đến bạn (điện thoại rung, tủ lạnh gọi tên...). Bạn có thể cưỡng lại nhưng tốn ý chí;
 * chiều theo thì mất thời gian, và với loại "vòng lặp" (video, game) mỗi lần dừng lại càng khó hơn.
 * Mỗi lần chiều theo là một hành vi thật (nằm trong lịch sử ngày) nên ảnh hưởng dopamine nhanh, cân bằng, kết cục.
 */
import { ActionPrimitive, PlayerStatsPrimitive } from './types';

export type IntrusionKind = 'phone' | 'game' | 'snack' | 'sale';

export interface IntrusionDef {
  kind: IntrusionKind;
  emoji: string;
  title: string;
  /** Lời gọi mời lúc đầu */
  prompt: string;
  /** Lời khi đã chiều một lần và lại bị mời tiếp */
  againPrompt: string;
  yieldLabel: string;
  againLabel: string;
  /** Có lặp lại không: video và game thì có, đồ ăn và flash sale thì chỉ một lần */
  loop: boolean;
  actionId: string;
  weight: number;
}

export const INTRUSIONS: Record<IntrusionKind, IntrusionDef> = {
  phone: {
    kind: 'phone',
    emoji: '📱',
    title: 'Điện thoại rung',
    prompt: 'Một thông báo mới nhấp nháy. Chỉ liếc qua một chút thôi, đúng không?',
    againPrompt: 'Video tiếp theo đã tự chạy. Còn một cái nữa thôi, rồi bạn dừng thật.',
    yieldLabel: 'Liếc một chút',
    againLabel: 'Thêm một video nữa',
    loop: true,
    actionId: 'intrusion_phone',
    weight: 40,
  },
  game: {
    kind: 'game',
    emoji: '🎮',
    title: 'Ván game cuối',
    prompt: 'Bạn bè vừa rủ vào một ván nhanh. "Ván cuối thôi", ai cũng nói vậy.',
    againPrompt: 'Vừa thua sát nút. Không thể kết thúc bằng một trận thua được.',
    yieldLabel: 'Vào một ván',
    againLabel: 'Thêm một ván nữa',
    loop: true,
    actionId: 'intrusion_game',
    weight: 25,
  },
  snack: {
    kind: 'snack',
    emoji: '🍜',
    title: 'Tủ lạnh gọi tên',
    prompt: 'Bạn không đói, nhưng bụng bảo chắc một gói mì sẽ ổn.',
    againPrompt: '',
    yieldLabel: 'Nấu gói mì',
    againLabel: '',
    loop: false,
    actionId: 'intrusion_snack',
    weight: 20,
  },
  sale: {
    kind: 'sale',
    emoji: '🛍️',
    title: 'Thông báo Flash Sale',
    prompt: '"Còn 3 phút! Giảm 50%." Bạn chưa cần gì cả, nhưng giỏ hàng vẫn đang đợi.',
    againPrompt: '',
    yieldLabel: 'Chốt đơn',
    againLabel: '',
    loop: false,
    actionId: 'intrusion_sale',
    weight: 15,
  },
};

/** Các hành vi tương ứng: chỉ xuất hiện khi bị xâm nhập, không có trong danh sách người chơi chọn */
export const INTRUSION_ACTIONS: ActionPrimitive[] = [
  {
    id: 'intrusion_phone',
    title: 'Lướt "thêm một chút nữa"',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 0.5,
    description: 'Lướt thêm nửa tiếng không định trước.',
    willpowerCost: 0,
    isTemptation: true,
    baseDopamine: 9,
    baseEnergy: -1,
    baseMental: -3,
    baseWillpower: -4,
  },
  {
    id: 'intrusion_game',
    title: 'Ván game "cuối cùng"',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 0.5,
    description: 'Thêm một ván nữa.',
    willpowerCost: 0,
    isTemptation: true,
    baseDopamine: 11,
    baseEnergy: -3,
    baseMental: -2,
    baseWillpower: -4,
  },
  {
    id: 'intrusion_snack',
    title: 'Mì gói giữa chừng',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 0.25,
    description: 'Ăn vặt vì buồn miệng.',
    willpowerCost: 0,
    isTemptation: true,
    baseDopamine: 14,
    baseMoney: -45,
    baseEnergy: 2,
    baseWillpower: -5,
  },
  {
    id: 'intrusion_sale',
    title: 'Chốt đơn Flash Sale',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 0.25,
    description: 'Mua thứ chưa cần.',
    willpowerCost: 0,
    isTemptation: true,
    baseDopamine: 16,
    baseMoney: -180,
    baseWillpower: -6,
  },
];

export const isIntrusionActionId = (id: string) => id.startsWith('intrusion_');

/** Dưới ngưỡng này cám dỗ bắt đầu tự tìm đến */
export const INTRUSION_WILLPOWER_LIMIT = 45;
const MAX_PER_DAY = 2;
export const MAX_INTRUSION_ROUNDS = 6;

/** Ý chí cần để cưỡng lại (hoặc để dừng) ở vòng thứ `round`; mỗi vòng sau càng khó */
export const resistCost = (round: number): number => 8 + 4 * round;

export interface IntrusionContext {
  /** Giờ đồng hồ hiện tại (0-24) */
  clock: number;
  hoursLeft: number;
  /** Số lần đã bị xâm nhập hôm nay */
  intrusionsToday: number;
  /** Hành vi vừa làm xong */
  lastActionId?: string;
  /** Hành vi vừa làm có thuộc loại nghỉ/ngủ không */
  lastWasRest?: boolean;
}

/** Xác suất bị xâm nhập sau một hành vi */
export function intrusionChance(stats: PlayerStatsPrimitive, ctx: IntrusionContext): number {
  if (stats.willpower >= INTRUSION_WILLPOWER_LIMIT) return 0;
  if (ctx.hoursLeft < 1 || ctx.intrusionsToday >= MAX_PER_DAY || ctx.lastWasRest) return 0;
  if (ctx.lastActionId && isIntrusionActionId(ctx.lastActionId)) return 0;
  let p = ((INTRUSION_WILLPOWER_LIMIT - stats.willpower) / INTRUSION_WILLPOWER_LIMIT) * 0.55;
  // Khuya khoắt thì khó cưỡng hơn
  if (ctx.clock >= 22 || ctx.clock < 2) p *= 1.25;
  return Math.min(0.7, p);
}

/** Bốc một cám dỗ xâm nhập, hoặc null nếu hôm nay bạn "thoát". `rand` trả số trong [0,1). */
export function rollIntrusion(
  stats: PlayerStatsPrimitive,
  ctx: IntrusionContext,
  rand: () => number = Math.random
): IntrusionDef | null {
  if (rand() >= intrusionChance(stats, ctx)) return null;
  // Flash Sale chỉ nhắm vào người còn tiền để tiêu
  const pool = Object.values(INTRUSIONS).filter((d) => d.kind !== 'sale' || stats.money >= 300);
  const total = pool.reduce((s, d) => s + d.weight, 0);
  let r = rand() * total;
  for (const d of pool) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return pool[0];
}
