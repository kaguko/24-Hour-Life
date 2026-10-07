import { ActionPrimitive, PlayerStatsPrimitive, ActionResultPrimitive, SoundCue } from './types';
import { applyStatDeltas } from './stats';

export const DOMAIN_ACTIONS: ActionPrimitive[] = [
  // 1. NGỦ & NGHỈ NGƠI
  {
    id: 'sleep_deep',
    title: 'Ngủ đủ giấc (8 giờ)',
    category: 'rest',
    hours: 8,
    description: 'Giấc ngủ sâu chuẩn mực. Hồi phục năng lượng, giảm tải dopamine và nạp lại ý chí.',
    willpowerCost: 5,
    isTemptation: false,
    baseEnergy: 55,
    baseMental: 20,
    baseWillpower: 35,
    baseDopamine: -15,
  },
  {
    id: 'sleep_nap',
    title: 'Chợp mắt hồi sức (1.5 giờ)',
    category: 'rest',
    hours: 1.5,
    description: 'Một giấc ngủ ngắn buổi chiều để lấy lại tỉnh táo tạm thời.',
    willpowerCost: 0,
    isTemptation: false,
    baseEnergy: 18,
    baseMental: 8,
    baseWillpower: 10,
  },

  // 2. CÔNG VIỆC & THU NHẬP
  {
    id: 'work_focused',
    title: 'Làm việc tập trung (4 giờ)',
    category: 'work',
    hours: 4,
    description: 'Hoàn thành các đầu việc quan trọng. Kiếm thu nhập ổn định nhưng tiêu tốn năng lượng.',
    willpowerCost: 15,
    isTemptation: false,
    baseMoney: 500,
    baseEnergy: -22,
    baseMental: -10,
    baseWillpower: -12,
  },
  {
    id: 'work_overtime',
    title: 'Cày cuốc làm thêm (4 giờ)',
    category: 'work',
    hours: 4,
    description: 'Tăng ca kiếm thêm tiền, nhưng vắt kiệt sức lực và dồn nén ức chế.',
    willpowerCost: 20,
    isTemptation: false,
    baseMoney: 700,
    baseEnergy: -38,
    baseMental: -24,
    baseWillpower: -20,
    baseSocial: -8,
  },
  {
    id: 'learn_skill',
    title: 'Học kỹ năng & Đọc sách (2 giờ)',
    category: 'work',
    hours: 2,
    description: 'Đầu tư cho tương lai. Tăng ý chí dài hạn nhưng đòi hỏi kỷ luật cao.',
    willpowerCost: 25,
    isTemptation: false,
    baseMental: 12,
    baseWillpower: 15,
    baseEnergy: -12,
  },

  // 3. THỂ CHẤT & CHĂM SÓC
  {
    id: 'exercise',
    title: 'Tập thể dục / Chạy bộ (1.5 giờ)',
    category: 'wellness',
    hours: 1.5,
    description: 'Giải phóng endorphin tự nhiên, hồi phục tinh thần và rèn luyện ý chí thép.',
    willpowerCost: 28,
    isTemptation: false,
    baseEnergy: -10,
    baseMental: 25,
    baseWillpower: 22,
    baseDopamine: 5,
  },
  {
    id: 'cook_healthy',
    title: 'Tự nấu ăn dinh dưỡng (1.5 giờ)',
    category: 'wellness',
    hours: 1.5,
    description: 'Bữa ăn lành mạnh, tiết kiệm tiền và mang lại cảm giác làm chủ cuộc sống.',
    willpowerCost: 10,
    isTemptation: false,
    baseEnergy: 15,
    baseMental: 10,
    baseMoney: -60,
    baseWillpower: 5,
  },
  {
    id: 'meditate_walk',
    title: 'Đi bộ tĩnh tâm / Thiền (1 giờ)',
    category: 'wellness',
    hours: 1,
    description: 'Lắng đọng suy nghĩ, thanh lọc tâm trí khỏi những kích thích dồn dập.',
    willpowerCost: 8,
    isTemptation: false,
    baseMental: 18,
    baseWillpower: 15,
    baseDopamine: -10,
    baseEnergy: 5,
  },
  {
    id: 'clean_room',
    title: 'Dọn dẹp không gian sống (1 giờ)',
    category: 'wellness',
    hours: 1,
    description: 'Không gian ngăn nắp giúp giảm tải căng thẳng tinh thần.',
    willpowerCost: 12,
    isTemptation: false,
    baseMental: 12,
    baseWillpower: 10,
    baseEnergy: -8,
  },

  // 4. KẾT NỐI XÃ HỘI
  {
    id: 'meet_friend',
    title: 'Cà phê trò chuyện bạn bè (2.5 giờ)',
    category: 'social',
    hours: 2.5,
    description: 'Chia sẻ tâm sự, giải tỏa căng thẳng và duy trì các mối quan hệ quý giá.',
    willpowerCost: 8,
    isTemptation: false,
    baseSocial: 35,
    baseMental: 20,
    baseMoney: -75,
    baseEnergy: -8,
  },
  {
    id: 'call_family',
    title: 'Gọi điện về gia đình (1 giờ)',
    category: 'social',
    hours: 1,
    description: 'Hỏi thăm bố mẹ, cảm nhận sự nâng đỡ tinh thần và hơi ấm gia đình.',
    willpowerCost: 5,
    isTemptation: false,
    baseSocial: 20,
    baseMental: 15,
    baseWillpower: 8,
  },
  {
    id: 'beer_party',
    title: 'Đi nhậu tối / Karaoke (3.5 giờ)',
    category: 'social',
    hours: 3.5,
    description: 'Vui vẻ xả láng với hội cạ cứng nhưng tốn kém ví tiền và hao mòn thể lực.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 15,
    baseSocial: 25,
    baseDopamine: 28,
    baseMoney: -450,
    baseEnergy: -30,
    baseMental: -5,
    baseWillpower: -18,
  },

  // 5. BẪY CÁM DỖ / DOPAMINE RẺ TIỀN
  {
    id: 'scroll_social',
    title: 'Lướt TikTok / Facebook (2 giờ)',
    category: 'temptation',
    hours: 2,
    description: 'Kích thích não bộ bằng video ngắn bất tận. Khoái cảm tức thì, hao mòn ý chí.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 20,
    baseDopamine: 30,
    baseEnergy: -12,
    baseMental: -8,
    baseWillpower: -18,
  },
  {
    id: 'binge_gaming',
    title: 'Cày game liên tục (3 giờ)',
    category: 'temptation',
    hours: 3,
    description: 'Hòa mình vào thế giới ảo. Thắng bại cuốn hút nhưng lãng quên thực tại.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 25,
    baseDopamine: 35,
    baseEnergy: -20,
    baseMental: -5,
    baseWillpower: -22,
    baseSocial: -5,
  },
  {
    id: 'fast_food',
    title: 'Đặt trà sữa & Gà rán (0.5 giờ)',
    category: 'temptation',
    hours: 0.5,
    description: 'Hương vị đường và dầu mỡ thỏa mãn cơn thèm ngay tức khắc.',
    willpowerCost: 0,
    isTemptation: true,
    perceivedDopamineBonus: 15,
    baseDopamine: 22,
    baseMoney: -130,
    baseEnergy: 5,
    baseMental: -5,
    baseWillpower: -10,
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

  if (action.isTemptation) {
    soundCue = 'temptation';
  } else if (action.category === 'rest' || action.category === 'wellness') {
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
  // 2. Kiểm tra gồng mình khi ý chí thấp
  else if (stats.willpower < 30 && !action.isTemptation && action.willpowerCost > 10) {
    deltas.willpower = (deltas.willpower ?? 0) - 8;
    notice = 'Ý chí đang cạn kiệt: Bạn phải gồng mình vượt qua sức ì nội tâm!';
  }
  // 3. Nghiện sâu hơn khi sa đà cám dỗ lúc ý chí thấp
  else if (stats.willpower < 35 && action.isTemptation) {
    deltas.willpower = (deltas.willpower ?? 0) - 10;
    deltas.dopamine = (deltas.dopamine ?? 0) + 10;
    notice = 'Cơn bão dopamine tạm thời làm mờ đi mọi mệt mỏi trong thoáng chốc...';
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
