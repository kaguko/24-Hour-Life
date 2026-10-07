/**
 * Core stats definition and boundary rules for "Cuộc sống 24 giờ".
 * 6 primary attributes:
 * - Dopamine: Kích thích ngắn hạn (0-100)
 * - Energy: Năng lượng thể chất (0-100)
 * - Mental: Sức khỏe tinh thần & chống stress (0-100)
 * - Social: Kết nối bạn bè, gia đình, xã hội (0-100)
 * - Money: Tài chính cá nhân (nghìn VNĐ)
 * - Willpower: Sức mạnh ý chí (0-100) - Quyết định độ hấp dẫn của lựa chọn xấu
 */

export interface PlayerStats {
  dopamine: number;     // 0 - 100
  energy: number;       // 0 - 100
  mental: number;       // 0 - 100
  social: number;       // 0 - 100
  money: number;        // Đơn vị: k VND (ví dụ: 3000 = 3 triệu)
  willpower: number;    // 0 - 100
}

export interface DayDebt {
  sleepDebtHours: number;      // Tích lũy thiếu ngủ (chuẩn 7-8h)
  excessScreenHours: number;   // Số giờ lướt màn hình vô thức
  workStreakHours: number;     // Số giờ làm việc liên tục
  overstimulationScore: number;// Mức độ quá tải dopamine từ hôm trước
}

export interface DailyLog {
  day: number;
  startStats: PlayerStats;
  endStats: PlayerStats;
  actionsTaken: Array<{
    id: string;
    title: string;
    hours: number;
    timeLabel: string;
  }>;
  nightNotes: string[];
  eventOccurred?: string;
  isBurnout: boolean;
  isBankrupt: boolean;
}

export const INITIAL_STATS: PlayerStats = {
  dopamine: 50,
  energy: 85,
  mental: 75,
  social: 60,
  money: 4500,     // 4.500.000 VNĐ
  willpower: 70,
};

export const DAILY_RENT_COST = 120; // 120k/ngày (khoảng 3.6tr/tháng tiền trọ + điện nước cơ bản)
export const MIN_SLEEP_HOURS = 7;

/**
 * Giới hạn các chỉ số trong khoảng hợp lệ
 */
export function clampStats(stats: PlayerStats): PlayerStats {
  return {
    dopamine: Math.max(0, Math.min(100, Math.round(stats.dopamine))),
    energy: Math.max(0, Math.min(100, Math.round(stats.energy))),
    mental: Math.max(0, Math.min(100, Math.round(stats.mental))),
    social: Math.max(0, Math.min(100, Math.round(stats.social))),
    money: Math.round(stats.money),
    willpower: Math.max(0, Math.min(100, Math.round(stats.willpower))),
  };
}

/**
 * Đánh giá trạng thái chung của người chơi
 */
export function evaluateLifeState(stats: PlayerStats): {
  status: 'thriving' | 'stable' | 'stressed' | 'burnout' | 'bankrupt';
  label: string;
  description: string;
} {
  if (stats.money < 0) {
    return {
      status: 'bankrupt',
      label: 'Khủng hoảng nợ nần',
      description: 'Ví tiền đã âm, áp lực chi tiêu sinh hoạt đè nặng mỗi ngày.',
    };
  }
  if (stats.energy <= 10 || stats.mental <= 15) {
    return {
      status: 'burnout',
      label: 'Kiệt quệ (Burnout)',
      description: 'Cơ thể báo động đỏ! Bạn cần nghỉ ngơi ngay trước khi sụp đổ hoàn toàn.',
    };
  }
  if (stats.willpower <= 20 || stats.mental <= 35) {
    return {
      status: 'stressed',
      label: 'Tê liệt ý chí & Căng thẳng',
      description: 'Mọi cám dỗ ngắn hạn đều trở nên cực kỳ khó cưỡng lại.',
    };
  }
  if (stats.energy >= 60 && stats.mental >= 60 && stats.social >= 50 && stats.money >= 3000) {
    return {
      status: 'thriving',
      label: 'Cân bằng & Phát triển',
      description: 'Bạn đang duy trì nhịp sống ổn định, làm việc hiệu quả và giữ tinh thần minh mẫn.',
    };
  }
  return {
    status: 'stable',
    label: 'Ổn định tạm thời',
    description: 'Cuộc sống vẫn đang vận hành nhưng cần chú ý các dấu hiệu tích tụ mệt mỏi.',
  };
}
