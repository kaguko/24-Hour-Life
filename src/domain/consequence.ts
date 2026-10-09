import { PlayerStatsPrimitive, NightResultPrimitive } from './types';
import { DAILY_RENT_COST, MIN_SLEEP_HOURS, applyStatDeltas } from './stats';
import { DOMAIN_ACTIONS } from './actions';
import { PhilosophicalQuote, getContextualQuote } from './quotes';
import { summarizeFastDopamine } from './dopamine';
import { sleepSegments } from './circadian';

const fmtClock = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;

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
  // Mỗi hậu quả trong đêm ghi lại chủ đề triết lý và "sức nặng" (tổng mức đổi chỉ số, dấu + là tốt)
  const drivers: Array<{ theme: PhilosophicalQuote['theme']; weight: number }> = [];
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

  // 2. Tính nợ ngủ (theo nhịp sinh học: ngủ ngày chỉ tính một phần)
  const segments = sleepSegments(actionIdsToday);
  const sleepHours = segments.reduce((sum, s) => sum + s.hours, 0); // số giờ nằm ngủ thực tế
  const restedHours = Math.round(segments.reduce((sum, s) => sum + s.hours * s.efficiency, 0) * 2) / 2; // số giờ ngủ "có giá trị"

  const daySleep = segments.filter((s) => s.timing === 'day');
  if (daySleep.length > 0) {
    const h = daySleep.reduce((sum, s) => sum + s.hours, 0);
    notes.push(
      `Ngủ lệch nhịp sinh học: ${h}h ngủ giữa ban ngày (bắt đầu lúc ${fmtClock(daySleep[0].start)}). Giấc ngủ ban ngày nông và chập chờn, chỉ có giá trị bằng khoảng ${Math.round(h * 0.6)}h ngủ đêm.`
    );
    deltas.mental = (deltas.mental ?? 0) - 6;
    deltas.willpower = (deltas.willpower ?? 0) - 6;
    drivers.push({ theme: 'balance_moderation', weight: -22 });
    if (dayNumber >= 3) {
      revealedMechanics.push(
        '💡 [Nhịp sinh học]: Cơ thể tiết melatonin và hormone phục hồi chủ yếu vào ban đêm. Ngủ ban ngày không bù được ngủ đêm, còn khiến tối hôm sau khó ngủ hơn.'
      );
    }
  } else if (segments.some((s) => s.timing === 'twilight' || s.timing === 'evening_nap')) {
    notes.push('Ngủ hơi lệch giờ (chạng vạng hoặc gần sáng): giấc ngủ kém sâu hơn một chút so với ngủ đêm đúng giờ.');
  }
  if (segments.some((s) => s.timing === 'midday_nap')) {
    notes.push('Giấc trưa đúng lúc (12h-15h): chợp mắt ngắn buổi trưa giúp hồi sức cho buổi chiều.');
    deltas.energy = (deltas.energy ?? 0) + 5;
    deltas.mental = (deltas.mental ?? 0) + 3;
  }

  const sleepDiff = MIN_SLEEP_HOURS - restedHours;
  const newSleepDebt = Math.max(0, previousSleepDebt + (sleepDiff > 0 ? sleepDiff : sleepDiff * 0.5));

  // Nhãn giờ ngủ: nếu có ngủ lệch giờ thì ghi rõ số giờ "có giá trị"
  const sleepLabel = restedHours < sleepHours ? `${sleepHours}h, chỉ tương đương ${restedHours}h ngủ đêm` : `${sleepHours}h`;
  if (restedHours < 5) {
    notes.push(`Thiếu ngủ nghiêm trọng (${sleepLabel}/7h chuẩn). Cơ thể bạn phát tín hiệu cầu cứu, thụ thể dopamine không được tái tạo.`);
    deltas.energy = (deltas.energy ?? 0) - 20;
    deltas.mental = (deltas.mental ?? 0) - 15;
    deltas.willpower = (deltas.willpower ?? 0) - 22;
    drivers.push({ theme: 'burnout_rest', weight: -57 });
  } else if (restedHours < 7) {
    drivers.push({ theme: 'burnout_rest', weight: -20 });
    notes.push(`Ngủ chập chờn (${sleepLabel}). Nợ ngủ bắt đầu tích tụ âm ỉ.`);
    deltas.energy = (deltas.energy ?? 0) - 10;
    deltas.willpower = (deltas.willpower ?? 0) - 10;
  } else {
    notes.push(`Giấc ngủ trọn vẹn (${sleepLabel}). Hệ thần kinh phục hồi, các thụ thể dopamine được tái thiết lập nhịp nhàng.`);
    deltas.energy = (deltas.energy ?? 0) + 20;
    deltas.willpower = (deltas.willpower ?? 0) + 15;
    deltas.mental = (deltas.mental ?? 0) + 10;
    // Ngủ đủ là nền bình thường: trọng số thấp để không lấn át điều nổi bật hơn
    drivers.push({ theme: 'rest_recovery', weight: 15 });
  }

  // Ngủ quá nhiều: nặng nề, uể oải, bào mòn tinh thần
  // Giấc trưa đúng giờ không tính là "nằm quá lâu"
  const lyingHours = sleepHours - segments.filter((s) => s.timing === 'midday_nap').reduce((sum, s) => sum + s.hours, 0);
  if (lyingHours > OVERSLEEP_THRESHOLD_HOURS) {
    const excess = lyingHours - OVERSLEEP_THRESHOLD_HOURS;
    notes.push(
      `Nằm quá lâu (${sleepHours}h nghỉ/ngày): Ngủ nhiều hơn mức cần thiết khiến đầu óc nặng nề, người rã rời và tinh thần đi xuống.`
    );
    deltas.mental = (deltas.mental ?? 0) - Math.round(excess * OVERSLEEP_MENTAL_PER_HOUR);
    deltas.energy = (deltas.energy ?? 0) - Math.round(excess * 1.5);
    deltas.willpower = (deltas.willpower ?? 0) - Math.round(excess * 1.5);
    // Ngủ quá nhiều là thiếu điều độ, không phải kiệt sức
    drivers.push({ theme: 'balance_moderation', weight: -Math.round(excess * 5) });
  }

  // Tác động nợ ngủ lũy kế
  if (newSleepDebt >= 6) {
    notes.push(`Nợ ngủ lũy kế chạm mức ${newSleepDebt.toFixed(1)}h: Hội chứng sương mù não (Brain Fog) làm bạn uể oải cả ngày.`);
    deltas.energy = (deltas.energy ?? 0) - 15;
    deltas.mental = (deltas.mental ?? 0) - 10;
    drivers.push({ theme: 'burnout_rest', weight: -25 });
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
    drivers.push({ theme: 'fast_dopamine', weight: -62 });

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
    // Học sâu chiếm phần lớn -> chủ đề học tập; còn lại -> dopamine chậm nói chung
    const studyHours = actionsToday.filter((a) => a.id === 'study_deep' || a.id === 'learn_skill').reduce((s, a) => s + a.hours, 0);
    drivers.push({ theme: studyHours * 2 >= slowDopamineHours ? 'flow_study' : 'slow_dopamine', weight: 34 });

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
    drivers.push({ theme: 'apathy_meaning', weight: -(ANHEDONIA_BASE_PENALTY + deficit * ANHEDONIA_PENALTY_PER_POINT + 6) });
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
    drivers.push({ theme: 'social_connection', weight: -18 });
  }

  // 6. Áp lực nợ nần
  if (currentStats.money - DAILY_RENT_COST < 0) {
    notes.push('Áp lực nợ nần: Tiền trong tài khoản về âm, bạn lo lắng không yên.');
    deltas.mental = (deltas.mental ?? 0) - 15;
    deltas.willpower = (deltas.willpower ?? 0) - 12;
    drivers.push({ theme: 'financial_freedom', weight: -27 });
  }

  const newStats = applyStatDeltas(currentStats, deltas);

  // 7. Chọn câu triết lý khớp với kết cục nổi bật nhất của đêm
  if (actionIdsToday.includes('tease_dog') || actionIdsToday.includes('choc_cho')) {
    drivers.push({ theme: 'folly_recklessness', weight: -40 });
  }
  const { theme: quoteTheme, context: quoteContext } = pickQuoteTheme(drivers);
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
      context: quoteContext,
    },
  };
}

/** Lời dẫn ngắn: vì sao câu này được chọn cho buổi sáng hôm nay */
const THEME_CONTEXT: Record<PhilosophicalQuote['theme'], string> = {
  fast_dopamine: 'Cho cơn sụp đổ sau những khoái cảm tức thời hôm qua',
  slow_dopamine: 'Cho những nỗ lực bền bỉ bạn đã gieo hôm qua',
  flow_study: 'Cho những giờ học tập chuyên sâu hôm qua',
  discipline_willpower: 'Cho sức mạnh của thói quen',
  burnout_rest: 'Cho một cơ thể đang bị vắt kiệt',
  rest_recovery: 'Cho một đêm nghỉ ngơi trọn vẹn',
  financial_freedom: 'Cho áp lực tiền bạc đang đè nặng',
  social_connection: 'Cho những ngày thiếu vắng kết nối',
  folly_recklessness: 'Cho một phút bốc đồng hôm qua',
  balance_moderation: 'Cho một ngày lệch nhịp: chỗ quá đà, chỗ thiếu hụt',
  apathy_meaning: 'Cho những ngày mọi thứ trở nên vô vị',
};

/**
 * Chọn chủ đề theo hậu quả có sức nặng lớn nhất.
 * Ngày "lẫn lộn" (hậu quả tốt và xấu ngang ngửa, hoặc nhiều hậu quả xấu khác loại) -> trung đạo / điều độ.
 */
export function pickQuoteTheme(
  drivers: Array<{ theme: PhilosophicalQuote['theme']; weight: number }>
): { theme: PhilosophicalQuote['theme']; context: string } {
  if (drivers.length === 0) return { theme: 'balance_moderation', context: THEME_CONTEXT.balance_moderation };
  const bad = drivers.filter((d) => d.weight < 0).sort((a, b) => a.weight - b.weight);
  const good = drivers.filter((d) => d.weight > 0).sort((a, b) => b.weight - a.weight);
  const badSum = bad.reduce((s, d) => s - d.weight, 0);
  const goodSum = good.reduce((s, d) => s + d.weight, 0);
  const badThemes = new Set(bad.map((d) => d.theme));

  let theme: PhilosophicalQuote['theme'];
  if (bad.length === 0) {
    theme = good[0].theme;
  } else if (goodSum >= badSum * 0.5 && good.some((d) => d.theme !== 'rest_recovery')) {
    // Vừa buông thả vừa cố gắng
    theme = 'balance_moderation';
  } else if (badThemes.size >= 2 && -bad[1].weight >= -bad[0].weight * 0.5) {
    // Nhiều kiểu quá đà / thiếu hụt cùng lúc
    theme = 'balance_moderation';
  } else {
    theme = bad[0].theme;
  }
  return { theme, context: THEME_CONTEXT[theme] };
}
