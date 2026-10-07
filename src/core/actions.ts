import { PlayerStats } from './stats';

export type ActionCategory = 'rest' | 'work' | 'wellness' | 'social' | 'temptation';

export interface ActionDefinition {
  id: string;
  title: string;
  category: ActionCategory;
  hours: number;
  description: string;
  tip?: string;
  baseChanges: Partial<PlayerStats>;
  /** Chi phí ý chí để khởi động (hành động khó đòi hỏi ý chí cao) */
  willpowerCost: number;
  /** Đây có phải là thói quen xấu/bẫy dopamine ngắn hạn? */
  isTemptation: boolean;
  /** Lợi ích dopamine giả định hiển thị khi ý chí thấp (ảo giác) */
  perceivedDopamineBonus?: number;
}

export const GAME_ACTIONS: ActionDefinition[] = [
  // 1. NGỦ & NGHỈ NGƠI
  {
    id: 'sleep_deep',
    title: 'Ngủ đủ giấc (8 giờ)',
    category: 'rest',
    hours: 8,
    description: 'Giấc ngủ sâu chuẩn mực. Hồi phục năng lượng, giảm tải dopamine và nạp lại ý chí.',
    baseChanges: {
      energy: +55,
      mental: +20,
      willpower: +35,
      dopamine: -15, // Đưa dopamine về ngưỡng bình thường
    },
    willpowerCost: 5,
    isTemptation: false,
  },
  {
    id: 'sleep_nap',
    title: 'Chợp mắt hồi sức (1.5 giờ)',
    category: 'rest',
    hours: 1.5,
    description: 'Một giấc ngủ ngắn buổi chiều để lấy lại tỉnh táo tạm thời.',
    baseChanges: {
      energy: +18,
      mental: +8,
      willpower: +10,
    },
    willpowerCost: 0,
    isTemptation: false,
  },

  // 2. CÔNG VIỆC & THU NHẬP
  {
    id: 'work_focused',
    title: 'Làm việc tập trung (4 giờ)',
    category: 'work',
    hours: 4,
    description: 'Hoàn thành các đầu việc quan trọng. Kiếm thu nhập ổn định nhưng tiêu tốn năng lượng.',
    baseChanges: {
      money: +500, // +500k
      energy: -22,
      mental: -10,
      willpower: -12,
    },
    willpowerCost: 15,
    isTemptation: false,
  },
  {
    id: 'work_overtime',
    title: 'Cày cuốc làm thêm (4 giờ)',
    category: 'work',
    hours: 4,
    description: 'Tăng ca kiếm thêm tiền, nhưng vắt kiệt sức lực và dồn nén ức chế.',
    baseChanges: {
      money: +700, // +700k
      energy: -38,
      mental: -24,
      willpower: -20,
      social: -8,
    },
    willpowerCost: 20,
    isTemptation: false,
  },
  {
    id: 'learn_skill',
    title: 'Học kỹ năng & Đọc sách (2 giờ)',
    category: 'work',
    hours: 2,
    description: 'Đầu tư cho tương lai. Tăng ý chí dài hạn nhưng đòi hỏi kỷ luật cao.',
    baseChanges: {
      mental: +12,
      willpower: +15,
      energy: -12,
    },
    willpowerCost: 25,
    isTemptation: false,
  },

  // 3. THỂ CHẤT & CHĂM SÓC
  {
    id: 'exercise',
    title: 'Tập thể dục / Chạy bộ (1.5 giờ)',
    category: 'wellness',
    hours: 1.5,
    description: 'Giải phóng endorphin tự nhiên, hồi phục tinh thần và rèn luyện ý chí thép.',
    baseChanges: {
      energy: -10,
      mental: +25,
      willpower: +22,
      dopamine: +5,
    },
    willpowerCost: 28, // Đòi hỏi ý chí cao để xỏ giày ra sân
    isTemptation: false,
  },
  {
    id: 'cook_healthy',
    title: 'Tự nấu ăn dinh dưỡng (1.5 giờ)',
    category: 'wellness',
    hours: 1.5,
    description: 'Bữa ăn lành mạnh, tiết kiệm tiền và mang lại cảm giác làm chủ cuộc sống.',
    baseChanges: {
      energy: +15,
      mental: +10,
      money: -60, // Chi phí nguyên liệu rẻ: 60k
      willpower: +5,
    },
    willpowerCost: 10,
    isTemptation: false,
  },
  {
    id: 'meditate_walk',
    title: 'Đi bộ tĩnh tâm / Thiền (1 giờ)',
    category: 'wellness',
    hours: 1,
    description: 'Lắng đọng suy nghĩ, thanh lọc tâm trí khỏi những kích thích dồn dập.',
    baseChanges: {
      mental: +18,
      willpower: +15,
      dopamine: -10,
      energy: +5,
    },
    willpowerCost: 8,
    isTemptation: false,
  },
  {
    id: 'clean_room',
    title: 'Dọn dẹp không gian sống (1 giờ)',
    category: 'wellness',
    hours: 1,
    description: 'Không gian ngăn nắp giúp giảm tải căng thẳng tinh thần.',
    baseChanges: {
      mental: +12,
      willpower: +10,
      energy: -8,
    },
    willpowerCost: 12,
    isTemptation: false,
  },

  // 4. KẾT NỐI XÃ HỘI
  {
    id: 'meet_friend',
    title: 'Cà phê trò chuyện bạn bè (2.5 giờ)',
    category: 'social',
    hours: 2.5,
    description: 'Chia sẻ tâm sự, giải tỏa căng thẳng và duy trì các mối quan hệ quý giá.',
    baseChanges: {
      social: +35,
      mental: +20,
      money: -75, // Tiền nước: 75k
      energy: -8,
    },
    willpowerCost: 8,
    isTemptation: false,
  },
  {
    id: 'call_family',
    title: 'Gọi điện về gia đình (1 giờ)',
    category: 'social',
    hours: 1,
    description: 'Hỏi thăm bố mẹ, cảm nhận sự nâng đỡ tinh thần và hơi ấm gia đình.',
    baseChanges: {
      social: +20,
      mental: +15,
      willpower: +8,
    },
    willpowerCost: 5,
    isTemptation: false,
  },
  {
    id: 'beer_party',
    title: 'Đi nhậu tối / Karaoke (3.5 giờ)',
    category: 'social',
    hours: 3.5,
    description: 'Vui vẻ xả láng với hội cạ cứng nhưng tốn kém ví tiền và hao mòn thể lực.',
    baseChanges: {
      social: +25,
      dopamine: +28,
      money: -450, // 450k
      energy: -30,
      mental: -5,
      willpower: -18,
    },
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: +15,
  },

  // 5. BẪY CÁM DỖ / DOPAMINE RẺ TIỀN
  {
    id: 'scroll_social',
    title: 'Lướt TikTok / Facebook (2 giờ)',
    category: 'temptation',
    hours: 2,
    description: 'Kích thích não bộ bằng video ngắn bất tận. Khoái cảm tức thì, hao mòn ý chí.',
    baseChanges: {
      dopamine: +30,
      energy: -12,
      mental: -8,
      willpower: -18,
    },
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: +20,
  },
  {
    id: 'binge_gaming',
    title: 'Cày game liên tục (3 giờ)',
    category: 'temptation',
    hours: 3,
    description: 'Hòa mình vào thế giới ảo. Thắng bại cuốn hút nhưng lãng quên thực tại.',
    baseChanges: {
      dopamine: +35,
      energy: -20,
      mental: -5,
      willpower: -22,
      social: -5,
    },
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: +25,
  },
  {
    id: 'fast_food',
    title: 'Đặt trà sữa & Gà rán (0.5 giờ)',
    category: 'temptation',
    hours: 0.5,
    description: 'Hương vị đường và dầu mỡ thỏa mãn cơn thèm ngay tức khắc.',
    baseChanges: {
      dopamine: +22,
      money: -130, // 130k
      energy: +5,
      mental: -5,
      willpower: -10,
    },
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: +15,
  },
];

/**
 * Tính toán hiệu ứng thực tế khi người chơi chọn một hành vi
 * Cơ chế cốt lõi: Khi Ý chí (Willpower) thấp:
 * 1. Các hành vi khó (Tập thể dục, Học tập) tốn thêm sức ép ý chí
 * 2. Các hành vi cám dỗ (Lướt FB, Game) dễ bị cuốn vào (mất thêm ý chí)
 */
export function calculateActionEffect(
  action: ActionDefinition,
  currentStats: PlayerStats
): {
  statDeltas: Partial<PlayerStats>;
  penaltyMessage?: string;
  bonusMessage?: string;
} {
  const deltas: Partial<PlayerStats> = { ...action.baseChanges };

  // Cơ chế mệt mỏi: Nếu Năng lượng thấp (<30), làm việc sinh ít tiền hơn và tốn gấp rưỡi năng lượng
  if (currentStats.energy < 30 && action.category === 'work') {
    deltas.energy = (deltas.energy ?? 0) * 1.4;
    deltas.mental = (deltas.mental ?? 0) - 10;
    if (deltas.money) deltas.money = Math.round(deltas.money * 0.7);
    return {
      statDeltas: deltas,
      penaltyMessage: 'Làm việc khi kiệt sức: Năng suất giảm 30%, căng thẳng tăng vọt!',
    };
  }

  // Cơ chế Ý chí thấp: Hành vi lành mạnh đòi hỏi trả giá ý chí cao hơn
  if (currentStats.willpower < 30 && !action.isTemptation && action.willpowerCost > 10) {
    deltas.willpower = (deltas.willpower ?? 0) - 8;
    return {
      statDeltas: deltas,
      penaltyMessage: 'Ý chí đang cạn kiệt: Bạn phải gồng mình vượt qua sức ì nội tâm!',
    };
  }

  // Cơ chế Cám dỗ khi Ý chí thấp: Hiệu ứng nghiện dopamine sâu hơn
  if (currentStats.willpower < 35 && action.isTemptation) {
    deltas.willpower = (deltas.willpower ?? 0) - 10;
    deltas.dopamine = (deltas.dopamine ?? 0) + 10;
    return {
      statDeltas: deltas,
      bonusMessage: 'Cơn bão dopamine tạm thời làm mờ đi mọi mệt mỏi trong thoáng chốc...',
    };
  }

  return { statDeltas: deltas };
}
