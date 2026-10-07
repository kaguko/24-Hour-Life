import { PlayerStatsPrimitive, StatusResultPrimitive } from './types';

export const INITIAL_STATS: PlayerStatsPrimitive = {
  dopamine: 50,
  energy: 85,
  mental: 75,
  social: 60,
  money: 4500,     // 4.500.000 VNĐ
  willpower: 70,
};

export const DAILY_RENT_COST = 120; // 120k/ngày tiền trọ
export const MIN_SLEEP_HOURS = 7;

export function clampStats(stats: PlayerStatsPrimitive): PlayerStatsPrimitive {
  return {
    dopamine: Math.max(0, Math.min(100, Math.round(stats.dopamine))),
    energy: Math.max(0, Math.min(100, Math.round(stats.energy))),
    mental: Math.max(0, Math.min(100, Math.round(stats.mental))),
    social: Math.max(0, Math.min(100, Math.round(stats.social))),
    money: Math.round(stats.money),
    willpower: Math.max(0, Math.min(100, Math.round(stats.willpower))),
  };
}

export function applyStatDeltas(
  base: PlayerStatsPrimitive,
  deltas: Partial<PlayerStatsPrimitive>
): PlayerStatsPrimitive {
  return clampStats({
    dopamine: base.dopamine + (deltas.dopamine ?? 0),
    energy: base.energy + (deltas.energy ?? 0),
    mental: base.mental + (deltas.mental ?? 0),
    social: base.social + (deltas.social ?? 0),
    money: base.money + (deltas.money ?? 0),
    willpower: base.willpower + (deltas.willpower ?? 0),
  });
}

export function evaluateLifeStatus(stats: PlayerStatsPrimitive): StatusResultPrimitive {
  if (stats.money < 0) {
    return {
      status: 'bankrupt',
      label: 'Khủng hoảng nợ nần',
      description: 'Ví tiền đã âm, áp lực chi tiêu sinh hoạt đè nặng mỗi ngày.',
      isGameOver: true,
    };
  }
  if (stats.energy <= 10 || stats.mental <= 15) {
    return {
      status: 'burnout',
      label: 'Kiệt quệ (Burnout)',
      description: 'Cơ thể báo động đỏ! Bạn cần nghỉ ngơi ngay trước khi sụp đổ hoàn toàn.',
      isGameOver: true,
    };
  }
  if (stats.willpower <= 20 || stats.mental <= 35) {
    return {
      status: 'stressed',
      label: 'Tê liệt ý chí & Căng thẳng',
      description: 'Mọi cám dỗ ngắn hạn đều trở nên cực kỳ khó cưỡng lại.',
      isGameOver: false,
    };
  }
  if (stats.energy >= 60 && stats.mental >= 60 && stats.social >= 50 && stats.money >= 3000) {
    return {
      status: 'thriving',
      label: 'Cân bằng & Phát triển',
      description: 'Bạn đang duy trì nhịp sống ổn định, làm việc hiệu quả và giữ tinh thần minh mẫn.',
      isGameOver: false,
    };
  }
  return {
    status: 'stable',
    label: 'Ổn định tạm thời',
    description: 'Cuộc sống vẫn đang vận hành nhưng cần chú ý các dấu hiệu tích tụ mệt mỏi.',
    isGameOver: false,
  };
}
