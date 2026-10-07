import { ActionPrimitive, PlayerStatsPrimitive, ActionResultPrimitive, SoundCue } from './types';
import { applyStatDeltas } from './stats';

export const DOMAIN_ACTIONS: ActionPrimitive[] = [
  // ========================================================
  // 1. NHÓM DOPAMINE NHANH (FAST / "CHEAP" DOPAMINE)
  // Đặc điểm: Ít nỗ lực, kích thích tức thì, tụt dốc nhanh (crash), gây hao mòn ý chí
  // ========================================================
  {
    id: 'scroll_social',
    title: 'Lướt TikTok / Reels vô thức (2 giờ)',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 2,
    description: 'Doomscrolling video ngắn bất tận. Sự mới lạ liên tục kích thích dopamine vọt lên tức thì nhưng làm xói mòn khả năng tập trung.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 25,
    baseDopamine: 32,
    baseEnergy: -12,
    baseMental: -8,
    baseWillpower: -18,
  },
  {
    id: 'binge_gaming',
    title: 'Cày game vòng lặp gây nghiện (3 giờ)',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 3,
    description: 'Chiến thắng ảo, nhận rương ngẫu nhiên và quay gacha. Thỏa mãn cơn thèm kích thích nhưng lãng quên hoàn toàn thực tại.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 30,
    baseDopamine: 38,
    baseEnergy: -22,
    baseMental: -6,
    baseWillpower: -24,
    baseSocial: -6,
  },
  {
    id: 'fast_food',
    title: 'Đồ ăn siêu ngon miệng & Trà sữa (0.5 giờ)',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 0.5,
    description: 'Thức ăn nhiều đường, muối và chất béo bão hòa. Não bộ nhận tín hiệu khoái cảm tức thì nhưng tạo cảm giác nặng nề sau đó.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 18,
    baseDopamine: 25,
    baseMoney: -140, // 140k
    baseEnergy: 5,
    baseMental: -4,
    baseWillpower: -10,
  },
  {
    id: 'impulse_shopping',
    title: 'Mua sắm bốc đồng Flash Sale (1 giờ)',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 1,
    description: 'Cảm giác hồi hộp chốt đơn món đồ giảm giá 50%. Giải phóng dopamine ngay trước khi sở hữu nhưng làm ví tiền hao hụt.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 22,
    baseDopamine: 30,
    baseMoney: -380, // 380k
    baseMental: -5,
    baseWillpower: -15,
  },
  {
    id: 'beer_party',
    title: 'Đi nhậu tối & Karaoke xả láng (3.5 giờ)',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 3.5,
    description: 'Cồn kích thích giải phóng dopamine tức thì, vui vẻ cuồng nhiệt nhưng tốn kém tài chính và vắt kiệt thể lực cho ngày mai.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 20,
    baseSocial: 24,
    baseDopamine: 30,
    baseMoney: -450, // 450k
    baseEnergy: -32,
    baseMental: -8,
    baseWillpower: -20,
  },
  {
    id: 'caffeine_spike',
    title: 'Cà phê đậm đặc ép tỉnh táo (0.5 giờ)',
    category: 'temptation',
    dopaminePathway: 'fast',
    hours: 0.5,
    description: 'Vay mượn năng lượng từ tương lai. Đẩy dopamine và epinephrine lên cao tạm thời để chống chọi cơn buồn ngủ.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 15,
    baseDopamine: 20,
    baseEnergy: 14,
    baseMental: -5,
    baseMoney: -45, // 45k
    baseWillpower: -8,
  },

  // ========================================================
  // 2. NHÓM DOPAMINE CHẬM (SLOW / "HEALTHY" DOPAMINE)
  // Đặc điểm: Cần nỗ lực, thời gian, xây dựng nền tảng vững bền, nuôi dưỡng ý chí
  // ========================================================
  {
    id: 'exercise',
    title: 'Chạy bộ & Rèn luyện thể lực (1.5 giờ)',
    category: 'wellness',
    dopaminePathway: 'slow',
    hours: 1.5,
    description: 'Vận động thể chất kích hoạt giải phóng endorphin và dopamine tự nhiên. Cải thiện thể chất, giảm stress và rèn giũa ý chí thép.',
    willpowerCost: 28,
    isTemptation: false,
    baseEnergy: -10,
    baseMental: 26,
    baseWillpower: 24,
    baseDopamine: 12,
  },
  {
    id: 'short_walk',
    title: 'Đi bộ 20 phút & Tắm nắng sáng (0.5 giờ)',
    category: 'wellness',
    dopaminePathway: 'slow',
    hours: 0.5,
    description: 'Tiếp xúc ánh nắng tự nhiên giúp tái tạo nhịp sinh học, tạo ra bữa tiệc dopamine lành mạnh nhỏ giúp tâm trí tươi mới.',
    willpowerCost: 8,
    isTemptation: false,
    baseEnergy: 8,
    baseMental: 15,
    baseWillpower: 12,
    baseDopamine: 8,
  },
  {
    id: 'pet_bonding',
    title: 'Vuốt ve & Chơi cùng thú cưng (0.5 giờ)',
    category: 'wellness',
    dopaminePathway: 'slow',
    hours: 0.5,
    description: 'Khoa học chứng minh tiếp xúc dịu dàng với động vật làm tăng dopamine và oxytocin, hạ hormone căng thẳng cortisol.',
    willpowerCost: 5,
    isTemptation: false,
    baseMental: 18,
    baseSocial: 12,
    baseWillpower: 8,
    baseDopamine: 10,
  },
  {
    id: 'learn_skill',
    title: 'Học kỹ năng & Chơi nhạc cụ (2 giờ)',
    category: 'work',
    dopaminePathway: 'slow',
    hours: 2,
    description: 'Thành thạo một kỹ năng mới đòi hỏi kiên nhẫn. Cảm giác hoàn thành mục tiêu mang lại dopamine bền vững và lòng tự trọng.',
    willpowerCost: 24,
    isTemptation: false,
    baseMental: 15,
    baseWillpower: 20,
    baseEnergy: -12,
    baseDopamine: 10,
  },
  {
    id: 'deep_talk',
    title: 'Trò chuyện sâu sắc với tri kỷ (2 giờ)',
    category: 'social',
    dopaminePathway: 'slow',
    hours: 2,
    description: 'Tương tác xã hội tích cực và chia sẻ thật lòng. Kết nối sâu sắc nuôi dưỡng sức khỏe tinh thần và xua tan nỗi cô đơn.',
    willpowerCost: 8,
    isTemptation: false,
    baseSocial: 38,
    baseMental: 22,
    baseMoney: -60, // 60k nước
    baseWillpower: 10,
    baseDopamine: 12,
  },
  {
    id: 'meditate_breathe',
    title: 'Thiền định & Hít thở sâu (1 giờ)',
    category: 'wellness',
    dopaminePathway: 'slow',
    hours: 1,
    description: 'Thanh lọc tâm trí, điều hòa hệ thần kinh giao cảm. Tăng cường khả năng kiểm soát xung động và tái thiết lập ngưỡng dopamine.',
    willpowerCost: 10,
    isTemptation: false,
    baseMental: 20,
    baseWillpower: 18,
    baseDopamine: -8, // Ổn định ngưỡng
    baseEnergy: 6,
  },
  {
    id: 'cook_tyrosine',
    title: 'Nấu ăn dinh dưỡng giàu Tyrosine (1.5 giờ)',
    category: 'wellness',
    dopaminePathway: 'slow',
    hours: 1.5,
    description: 'Bữa ăn giàu đạm, trứng, quả bơ, chuối - cung cấp tiền chất tyrosine để cơ thể sản sinh dopamine tự nhiên lành mạnh.',
    willpowerCost: 12,
    isTemptation: false,
    baseEnergy: 18,
    baseMental: 12,
    baseMoney: -65, // Tiết kiệm 65k
    baseWillpower: 8,
    baseDopamine: 10,
  },
  {
    id: 'listen_music',
    title: 'Thưởng thức trọn vẹn album nhạc (1 giờ)',
    category: 'wellness',
    dopaminePathway: 'slow',
    hours: 1,
    description: 'Đắm mình trong âm nhạc yêu thích kích hoạt trung tâm phần thưởng của não bộ một cách êm dịu, không áp lực.',
    willpowerCost: 5,
    isTemptation: false,
    baseMental: 16,
    baseWillpower: 10,
    baseDopamine: 10,
  },
  {
    id: 'clean_room',
    title: 'Dọn dẹp phòng & Hoàn thành việc nhỏ (1 giờ)',
    category: 'wellness',
    dopaminePathway: 'slow',
    hours: 1,
    description: 'Hoàn tất các đầu việc nhỏ trong không gian sống kích hoạt vòng lặp thành tựu, xua tan cảm giác bừa bộn trong tâm trí.',
    willpowerCost: 14,
    isTemptation: false,
    baseMental: 14,
    baseWillpower: 12,
    baseEnergy: -6,
    baseDopamine: 8,
  },

  // ========================================================
  // 3. THIẾT YẾU & CÔNG VIỆC
  // ========================================================
  {
    id: 'sleep_deep',
    title: 'Ngủ đủ giấc 8 tiếng (8 giờ)',
    category: 'rest',
    dopaminePathway: 'slow',
    hours: 8,
    description: 'Nền tảng sinh học tối thượng. Giấc ngủ sâu tái tạo các thụ thể dopamine D2, nạp đầy bình năng lượng và ý chí cho ngày mới.',
    willpowerCost: 5,
    isTemptation: false,
    baseEnergy: 55,
    baseMental: 20,
    baseWillpower: 35,
    baseDopamine: -12, // Đưa dopamine về baseline
  },
  {
    id: 'sleep_nap',
    title: 'Chợp mắt hồi sức (1.5 giờ)',
    category: 'rest',
    dopaminePathway: 'none',
    hours: 1.5,
    description: 'Giấc ngủ ngắn giữa ngày giúp hạ nhiệt não bộ và lấy lại tỉnh táo tức thời.',
    willpowerCost: 0,
    isTemptation: false,
    baseEnergy: 18,
    baseMental: 8,
    baseWillpower: 10,
  },
  {
    id: 'work_focused',
    title: 'Làm việc tập trung sâu (4 giờ)',
    category: 'work',
    dopaminePathway: 'none',
    hours: 4,
    description: 'Làm việc tạo giá trị kinh tế. Mang lại thu nhập cần thiết để trang trải tiền trọ và sinh hoạt phí.',
    willpowerCost: 15,
    isTemptation: false,
    baseMoney: 500, // +500k
    baseEnergy: -22,
    baseMental: -10,
    baseWillpower: -12,
  },
  {
    id: 'work_overtime',
    title: 'Cày cuốc làm thêm đêm (4 giờ)',
    category: 'work',
    dopaminePathway: 'none',
    hours: 4,
    description: 'Tăng ca kiếm thêm tiền nhưng bào mòn thần kinh, làm tăng nợ ngủ và kiệt quệ ý chí.',
    willpowerCost: 20,
    isTemptation: false,
    baseMoney: 700, // +700k
    baseEnergy: -38,
    baseMental: -24,
    baseWillpower: -20,
    baseSocial: -8,
  },
  {
    id: 'call_family',
    title: 'Gọi điện hỏi thăm bố mẹ (1 giờ)',
    category: 'social',
    dopaminePathway: 'slow',
    hours: 1,
    description: 'Kết nối ấm áp với người thân ruột thịt, mang lại sự nâng đỡ tinh thần và cảm giác bình yên.',
    willpowerCost: 5,
    isTemptation: false,
    baseSocial: 22,
    baseMental: 16,
    baseWillpower: 10,
    baseDopamine: 8,
  },
];

/**
 * Pure domain executor for taking an action
 * Input: primitive actionId (string), primitive stats, primitive hoursRemaining (number)
 * Output: primitive ActionResultPrimitive
 */
export function executeActionById(
  actionId: string,
  stats: PlayerStatsPrimitive,
  hoursRemaining: number
): ActionResultPrimitive {
  const action = DOMAIN_ACTIONS.find((a) => a.id === actionId);
  if (!action) {
    return {
      success: false,
      actionId,
      actionTitle: '',
      hoursSpent: 0,
      newStats: stats,
      notice: 'Hành vi không tồn tại trong danh mục.',
      soundCue: 'neutral',
    };
  }

  if (hoursRemaining < action.hours) {
    return {
      success: false,
      actionId,
      actionTitle: action.title,
      hoursSpent: 0,
      newStats: stats,
      notice: 'Không đủ thời gian còn lại trong ngày.',
      soundCue: 'neutral',
    };
  }

  const deltas: Partial<PlayerStatsPrimitive> = {
    dopamine: action.baseDopamine ?? 0,
    energy: action.baseEnergy ?? 0,
    mental: action.baseMental ?? 0,
    social: action.baseSocial ?? 0,
    money: action.baseMoney ?? 0,
    willpower: action.baseWillpower ?? 0,
  };

  let notice: string | null = null;
  let soundCue: SoundCue = 'neutral';

  if (action.dopaminePathway === 'fast') {
    soundCue = 'temptation';
  } else if (action.dopaminePathway === 'slow' || action.category === 'rest') {
    soundCue = 'healthy';
  }

  // 1. Kiểm tra làm việc khi kiệt sức
  if (stats.energy < 30 && action.category === 'work') {
    deltas.energy = (deltas.energy ?? 0) * 1.4;
    deltas.mental = (deltas.mental ?? 0) - 10;
    if (deltas.money) deltas.money = Math.round(deltas.money * 0.7);
    notice = 'Làm việc khi kiệt sức: Năng suất giảm 30%, căng thẳng tăng vọt!';
    soundCue = 'sigh';
  }
  // 2. Kiểm tra gồng mình khi ý chí thấp (với dopamine chậm / rèn luyện)
  else if (stats.willpower < 30 && !action.isTemptation && action.willpowerCost > 10) {
    deltas.willpower = (deltas.willpower ?? 0) - 8;
    notice = 'Sức ì tâm lý: Não bộ kháng cự Dopamine Chậm vì đòi hỏi nỗ lực, bạn mất thêm 8 điểm ý chí!';
  }
  // 3. Nghiện sâu hơn khi sa đà Dopamine Nhanh lúc ý chí thấp
  else if (stats.willpower < 35 && action.dopaminePathway === 'fast') {
    deltas.willpower = (deltas.willpower ?? 0) - 10;
    deltas.dopamine = (deltas.dopamine ?? 0) + 12;
    notice = 'Cơn bão Dopamine Nhanh: Khoái cảm tức thì làm lu mờ mọi mệt mỏi, nhưng cái giá phải trả ngày mai sẽ rất đắt!';
  }

  const newStats = applyStatDeltas(stats, deltas);

  return {
    success: true,
    actionId: action.id,
    actionTitle: action.title,
    hoursSpent: action.hours,
    newStats,
    notice,
    soundCue,
  };
}
