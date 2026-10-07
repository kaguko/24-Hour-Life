import { PlayerStatsPrimitive, NightResultPrimitive } from './types';
import { DAILY_RENT_COST, MIN_SLEEP_HOURS, applyStatDeltas } from './stats';
import { DOMAIN_ACTIONS } from './actions';
import { PhilosophicalQuote, getContextualQuote } from './quotes';
import { summarizeFastDopamine } from './dopamine';

const OVERSLEEP_THRESHOLD_HOURS = 9;
const OVERSLEEP_MENTAL_PER_HOUR = 2;
const ANHEDONIA_DOPAMINE_THRESHOLD = 25;
const ANHEDONIA_BASE_PENALTY = 10;
const ANHEDONIA_PENALTY_PER_POINT = 2.5; // mỗi điểm dopamine thiếu hụt dưới ngưỡng

/**
 * Pure domain consequence processing
 * Input: primitive stats, primitive string[] action IDs, primitive numbers
 * Output: primitive NightResultPrimitive
 */
export function processOvernightCycle(
  currentStats: PlayerStatsPrimitive,
  actionIdsToday: string[],
  previousSleepDebt: number,
  dayNumber: number
): NightResultPrimitive {
  const notes: string[] = [];
  const revealedMechanics: string[] = [];
  const deltas: Partial<PlayerStatsPrimitive> = {
    money: -DAILY_RENT_COST,
  };

  notes.push(`Trừ tiền phòng trọ và chi phí sinh hoạt cố định: -${DAILY_RENT_COST}k VNĐ`);

  const actionsToday = actionIdsToday
    .map((id) => DOMAIN_ACTIONS.find((a) => a.id === id))
    .filter((a): a is (typeof DOMAIN_ACTIONS)[number] => a !== undefined);

  // 1. Phân loại tổng giờ Dopamine Nhanh vs Dopamine Chậm
  const fastSummary = summarizeFastDopamine(actionIdsToday);
  const fastDopamineHours = actionsToday
    .filter((a) => a.dopaminePathway === 'fast')
    .reduce((sum, a) => sum + a.hours, 0);

  const slowDopamineHours = actionsToday
    .filter((a) => a.dopaminePathway === 'slow' && a.id !== 'sleep_deep')
    .reduce((sum, a) => sum + a.hours, 0);

  // 2. Tính nợ ngủ
  const sleepHours = actionsToday
    .filter((a) => a.category === 'rest')
    .reduce((sum, a) => sum + a.hours, 0);

  const sleepDiff = MIN_SLEEP_HOURS - sleepHours;
  const newSleepDebt = Math.max(0, previousSleepDebt + (sleepDiff > 0 ? sleepDiff : sleepDiff * 0.5));

  if (sleepHours < 5) {
    notes.push(`Thiếu ngủ nghiêm trọng (${sleepHours}h/7h chuẩn). Cơ thể bạn phát tín hiệu cầu cứu, thụ thể dopamine không được tái tạo.`);
    deltas.energy = (deltas.energy ?? 0) - 20;
    deltas.mental = (deltas.mental ?? 0) - 15;
    deltas.willpower = (deltas.willpower ?? 0) - 22;
  } else if (sleepHours < 7) {
    notes.push(`Ngủ chập chờn (${sleepHours}h). Nợ ngủ bắt đầu tích tụ âm ỉ.`);
    deltas.energy = (deltas.energy ?? 0) - 10;
    deltas.willpower = (deltas.willpower ?? 0) - 10;
  } else {
    notes.push(`Giấc ngủ trọn vẹn (${sleepHours}h). Hệ thần kinh phục hồi, các thụ thể dopamine được tái thiết lập nhịp nhàng.`);
    deltas.energy = (deltas.energy ?? 0) + 20;
    deltas.willpower = (deltas.willpower ?? 0) + 15;
    deltas.mental = (deltas.mental ?? 0) + 10;
  }

  // Ngủ quá nhiều: nặng nề, uể oải, bào mòn tinh thần
  if (sleepHours > OVERSLEEP_THRESHOLD_HOURS) {
    const excess = sleepHours - OVERSLEEP_THRESHOLD_HOURS;
    notes.push(
      `Nằm quá lâu (${sleepHours}h nghỉ/ngày): Ngủ nhiều hơn mức cần thiết khiến đầu óc nặng nề, người rã rời và tinh thần đi xuống.`
    );
    deltas.mental = (deltas.mental ?? 0) - Math.round(excess * OVERSLEEP_MENTAL_PER_HOUR);
    deltas.energy = (deltas.energy ?? 0) - Math.round(excess * 1.5);
    deltas.willpower = (deltas.willpower ?? 0) - Math.round(excess * 1.5);
  }

  // Tác động nợ ngủ lũy kế
  if (newSleepDebt >= 6) {
    notes.push(`Nợ ngủ lũy kế chạm mức ${newSleepDebt.toFixed(1)}h: Hội chứng sương mù não (Brain Fog) làm bạn uể oải cả ngày.`);
    deltas.energy = (deltas.energy ?? 0) - 15;
    deltas.mental = (deltas.mental ?? 0) - 10;
    if (dayNumber >= 3) {
      revealedMechanics.push(
        '💡 [Cơ chế ẩn được hé lộ]: Nợ ngủ không thể bù đắp chỉ bằng 1 ngày ngủ nướng. Nó ăn mòn thụ thể dopamine và năng lực tập trung.'
      );
    }
  }

  // 3. Tác động của Dopamine Nhanh (Fast Dopamine Crash)
  // Chỉ dopamine NHANH gây sụp; dopamine cao nhờ hoạt động lành mạnh thì không bị phạt
  if (fastSummary.atRisk) {
    notes.push(
      `Cơn sụp đổ Dopamine Nhanh (Crash): Sau ${fastDopamineHours}h ngập trong kích thích rẻ tiền (mạng xã hội, game, đồ ngọt), thụ thể dopamine bị trơ lì (down-regulation). Sáng nay bạn thấy trống rỗng, vô vị và bồn chồn.`
    );
    deltas.dopamine = -28;
    deltas.willpower = (deltas.willpower ?? 0) - 20;
    deltas.mental = (deltas.mental ?? 0) - 14;

    if (dayNumber >= 2) {
      revealedMechanics.push(
        '💡 [Khoa học thần kinh - Dopamine Nhanh]: Kích thích tức thì mang lại "cú hit" hưng phấn ngắn, nhưng não bộ sẽ lập tức cân bằng lại bằng cách hạ thấp mức dopamine cơ bản (baseline) xuống dưới mức bình thường, gây ra cảm giác thèm muốn dữ dội hơn.'
      );
    }
  } else {
    if (currentStats.dopamine > 55) {
      deltas.dopamine = -12;
    } else if (currentStats.dopamine < 40) {
      deltas.dopamine = 8;
    }
  }

  // 4. Thành quả của Dopamine Chậm (Slow Dopamine Consolidation)
  if (slowDopamineHours >= 2) {
    notes.push(
      `Nuôi dưỡng Dopamine Chậm (${slowDopamineHours}h hôm qua): Vận động thể chất, gắn kết chân thành và dinh dưỡng lành mạnh phát huy tác dụng. Ngưỡng thỏa mãn tự nhiên tăng lên, tâm trí thanh thản và ý chí kiên định.`
    );
    deltas.mental = (deltas.mental ?? 0) + 14;
    deltas.willpower = (deltas.willpower ?? 0) + 12;
    deltas.energy = (deltas.energy ?? 0) + 8;

    if (dayNumber >= 3) {
      revealedMechanics.push(
        '💡 [Khoa học thần kinh - Dopamine Chậm]: Các hoạt động đòi hỏi nỗ lực (chạy bộ, học kỹ năng, thiền, trò chuyện sâu) kích hoạt con đường dopamine chậm, xây dựng cảm giác tự hào và phục hồi bình năng lượng ý chí bền vững.'
      );
    }
  }

  // 4b. Vô cảm (Anhedonia): dopamine nền cạn kiệt mà không làm gì nuôi dưỡng nó -> tinh thần mòn dần
  if (currentStats.dopamine < ANHEDONIA_DOPAMINE_THRESHOLD && slowDopamineHours < 2) {
    notes.push(
      'Vô cảm kéo dài: Không có điều gì khiến bạn háo hức. Nằm im tưởng là nghỉ ngơi, nhưng tâm trí đang cạn dần động lực sống.'
    );
    const deficit = ANHEDONIA_DOPAMINE_THRESHOLD - currentStats.dopamine;
    deltas.mental =
      (deltas.mental ?? 0) - Math.round(ANHEDONIA_BASE_PENALTY + deficit * ANHEDONIA_PENALTY_PER_POINT);
    deltas.willpower = (deltas.willpower ?? 0) - 6;
    if (dayNumber >= 3) {
      revealedMechanics.push(
        '💡 [Khoa học thần kinh - Vô cảm]: Không kích thích không có nghĩa là bình yên. Khi hệ thống phần thưởng không được dùng đến, não bộ mất dần khả năng cảm thấy hứng thú - nghỉ ngơi thật sự cần xen kẽ với hoạt động có ý nghĩa.'
      );
    }
  }

  // 5. Cô lập xã hội
  if (currentStats.social < 25) {
    notes.push('Sự cô đơn kéo dài: Thiếu kết nối sâu sắc khiến tâm trạng sa sút.');
    deltas.mental = (deltas.mental ?? 0) - 10;
    deltas.willpower = (deltas.willpower ?? 0) - 8;
  }

  // 6. Áp lực nợ nần
  if (currentStats.money - DAILY_RENT_COST < 0) {
    notes.push('Áp lực nợ nần: Tiền trong tài khoản về âm, bạn lo lắng không yên.');
    deltas.mental = (deltas.mental ?? 0) - 15;
    deltas.willpower = (deltas.willpower ?? 0) - 12;
  }

  const newStats = applyStatDeltas(currentStats, deltas);

  // 7. Chọn câu triết lý vĩ nhân theo chủ đề nổi bật của ngày
  let quoteTheme: PhilosophicalQuote['theme'] = 'balance_moderation';
  if (actionIdsToday.includes('tease_dog') || actionIdsToday.includes('choc_cho')) {
    quoteTheme = 'folly_recklessness';
  } else if (fastDopamineHours >= 3 || fastSummary.atRisk) {
    quoteTheme = 'fast_dopamine';
  } else if (sleepHours < 5 || currentStats.energy <= 20) {
    quoteTheme = 'burnout_rest';
  } else if (slowDopamineHours >= 2.5) {
    quoteTheme = 'slow_dopamine';
  } else if (currentStats.money - DAILY_RENT_COST < 0) {
    quoteTheme = 'financial_freedom';
  } else if (currentStats.social < 25) {
    quoteTheme = 'social_connection';
  } else if (actionIdsToday.includes('study_deep')) {
    quoteTheme = 'flow_study';
  }

  const selectedQuote = getContextualQuote(quoteTheme);

  return {
    dayCompleted: dayNumber,
    rentPaid: DAILY_RENT_COST,
    sleepHours,
    sleepDebtChange: sleepDiff,
    newSleepDebt,
    newStats,
    notes,
    revealedMechanics,
    philosophicalQuote: {
      quote: selectedQuote.quote,
      author: selectedQuote.author,
      role: selectedQuote.role,
    },
  };
}
