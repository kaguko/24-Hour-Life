import { PlayerStats, DAILY_RENT_COST, MIN_SLEEP_HOURS, clampStats } from './stats';
import { ActionDefinition } from './actions';

export interface NightReport {
  dayCompleted: number;
  rentPaid: number;
  sleepHours: number;
  sleepDebtChange: number;
  totalSleepDebt: number;
  notes: string[];
  statChanges: Partial<PlayerStats>;
  revealedMechanics: string[]; // Giải thích bài học/cơ chế xuất hiện sau ngày 3-5
}

/**
 * Xử lý chuỗi hậu quả trễ khi chuyển sang ngày mới (Overnight Processing)
 */
export function processNightConsequences(
  currentStats: PlayerStats,
  actionsTakenToday: ActionDefinition[],
  previousSleepDebt: number,
  dayNumber: number
): {
  newStats: PlayerStats;
  report: NightReport;
  newSleepDebt: number;
} {
  const notes: string[] = [];
  const revealedMechanics: string[] = [];
  const statChanges: Partial<PlayerStats> = {
    money: -DAILY_RENT_COST,
  };

  notes.push(`Trừ tiền phòng trọ và chi phí sinh hoạt cố định: -${DAILY_RENT_COST}k VNĐ`);

  // 1. Tính tổng giờ ngủ hôm nay
  const sleepHours = actionsTakenToday
    .filter((a) => a.category === 'rest')
    .reduce((sum, a) => sum + a.hours, 0);

  const sleepDiff = MIN_SLEEP_HOURS - sleepHours;
  let newSleepDebt = Math.max(0, previousSleepDebt + (sleepDiff > 0 ? sleepDiff : sleepDiff * 0.5));

  if (sleepHours < 5) {
    notes.push(`Thiếu ngủ nghiêm trọng (${sleepHours}h/7h chuẩn). Cơ thể bạn phát tín hiệu cầu cứu.`);
    statChanges.energy = (statChanges.energy ?? 0) - 20;
    statChanges.mental = (statChanges.mental ?? 0) - 15;
    statChanges.willpower = (statChanges.willpower ?? 0) - 22;
  } else if (sleepHours < 7) {
    notes.push(`Ngủ chập chờn (${sleepHours}h). Nợ ngủ bắt đầu tích tụ âm ỉ.`);
    statChanges.energy = (statChanges.energy ?? 0) - 10;
    statChanges.willpower = (statChanges.willpower ?? 0) - 10;
  } else {
    notes.push(`Giấc ngủ trọn vẹn (${sleepHours}h). Năng lượng hồi phục dồi dào, giảm nợ ngủ.`);
    statChanges.energy = (statChanges.energy ?? 0) + 20;
    statChanges.willpower = (statChanges.willpower ?? 0) + 15;
    statChanges.mental = (statChanges.mental ?? 0) + 10;
  }

  // Tác động nợ ngủ lũy kế
  if (newSleepDebt >= 6) {
    notes.push(`Nợ ngủ lũy kế chạm mức ${newSleepDebt.toFixed(1)}h: Hội chứng sương mù não (Brain Fog) làm bạn uể oải cả ngày.`);
    statChanges.energy = (statChanges.energy ?? 0) - 15;
    statChanges.mental = (statChanges.mental ?? 0) - 10;
    if (dayNumber >= 3) {
      revealedMechanics.push(
        '💡 [Cơ chế ẩn được hé lộ]: Nợ ngủ không thể bù đắp chỉ bằng 1 ngày ngủ nướng. Nó ăn mòn sức đề kháng và năng lực tập trung.'
      );
    }
  }

  // 2. Tác động của Dopamine Spike & Crash hôm trước
  const temptationHours = actionsTakenToday
    .filter((a) => a.isTemptation)
    .reduce((sum, a) => sum + a.hours, 0);

  if (currentStats.dopamine >= 75 || temptationHours >= 4) {
    notes.push('Cơn sụp đổ Dopamine (Crash): Sau một ngày kích thích quá độ, sáng nay bạn thấy trống rỗng, vô vị và bồn chồn.');
    statChanges.dopamine = -25;
    statChanges.willpower = (statChanges.willpower ?? 0) - 18;
    statChanges.mental = (statChanges.mental ?? 0) - 12;

    if (dayNumber >= 3) {
      revealedMechanics.push(
        '💡 [Cơ chế ẩn được hé lộ]: Khi não bộ bị ngập trong dopamine nhân tạo hôm qua, ngưỡng khoái cảm cơ bản tụt sâu vào hôm sau. Việc bình thường bỗng trở nên nhàm chán cùng cực.'
      );
    }
  } else {
    // Tự cân bằng dopamine về mức lành mạnh 45-55
    if (currentStats.dopamine > 55) {
      statChanges.dopamine = -12;
    } else if (currentStats.dopamine < 40) {
      statChanges.dopamine = +8;
    }
  }

  // 3. Cô lập xã hội
  if (currentStats.social < 25) {
    notes.push('Sự cô đơn kéo dài: Thiếu kết nối sâu sắc khiến tâm trạng sa sút.');
    statChanges.mental = (statChanges.mental ?? 0) - 10;
    statChanges.willpower = (statChanges.willpower ?? 0) - 8;
  }

  // 4. Áp lực tài chính
  if (currentStats.money - DAILY_RENT_COST < 0) {
    notes.push('Áp lực nợ nần: Tiền trong tài khoản về âm, bạn lo lắng không yên.');
    statChanges.mental = (statChanges.mental ?? 0) - 15;
    statChanges.willpower = (statChanges.willpower ?? 0) - 12;
  }

  // 5. Thói quen phục hồi (Wellness) hôm trước
  const wellnessHours = actionsTakenToday
    .filter((a) => a.category === 'wellness')
    .reduce((sum, a) => sum + a.hours, 0);

  if (wellnessHours >= 2) {
    notes.push('Thói quen lành mạnh hôm qua phát huy tác dụng: Tinh thần sảng khoái và tự tin.');
    statChanges.mental = (statChanges.mental ?? 0) + 12;
    statChanges.willpower = (statChanges.willpower ?? 0) + 10;
  }

  // Áp dụng biến đổi
  const calculatedStats: PlayerStats = {
    dopamine: currentStats.dopamine + (statChanges.dopamine ?? 0),
    energy: currentStats.energy + (statChanges.energy ?? 0),
    mental: currentStats.mental + (statChanges.mental ?? 0),
    social: currentStats.social + (statChanges.social ?? 0),
    money: currentStats.money + (statChanges.money ?? 0),
    willpower: currentStats.willpower + (statChanges.willpower ?? 0),
  };

  const clamped = clampStats(calculatedStats);

  const report: NightReport = {
    dayCompleted: dayNumber,
    rentPaid: DAILY_RENT_COST,
    sleepHours,
    sleepDebtChange: sleepDiff,
    totalSleepDebt: newSleepDebt,
    notes,
    statChanges,
    revealedMechanics,
  };

  return {
    newStats: clamped,
    report,
    newSleepDebt,
  };
}
