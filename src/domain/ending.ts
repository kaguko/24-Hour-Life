import { PlayerStatsPrimitive, EndingPrimitive, EndingId } from './types';
import { evaluateLifeStatus } from './stats';
import { DOMAIN_ACTIONS } from './actions';

/**
 * Kho "kết cục" (archetype): mỗi ván kết thúc bằng một kiểu người chơi dễ nhớ, dễ chia sẻ.
 * Pure domain: nhận lịch sử hành vi (string[][]) + chỉ số cuối, trả về EndingPrimitive.
 */
const ENDINGS: Record<EndingId, Omit<EndingPrimitive, 'id' | 'score' | 'daysSurvived' | 'outcome'>> = {
  dog_whisperer: {
    emoji: '🐕',
    title: 'Kẻ Thách Thức Loài Chó',
    tagline: 'Sống nguy hiểm vì một cú hit dopamine.',
    description:
      'Bạn đã chọc chó không chỉ một lần. Cảm giác mạnh rẻ tiền luôn có giá của nó, và hàng xóm đã nhớ mặt bạn.',
    lesson: 'Cảm giác mạnh tức thì không phải là sự tự do - nó chỉ là cái bẫy được ngụy trang.',
    palette: 'rose',
  },
  dopamine_slave: {
    emoji: '📱',
    title: 'Nô Lệ Dopamine',
    tagline: 'Vui rất nhanh, sập cũng rất nhanh.',
    description:
      'Những cú hit từ video ngắn, game và đồ ngọt cho bạn niềm vui tức thì, nhưng não bộ đã hạ ngưỡng thỏa mãn và đòi liều cao hơn mỗi ngày.',
    lesson: 'Dopamine rẻ tiền vay khoái cảm của ngày mai với lãi suất cực cao.',
    palette: 'fuchsia',
  },
  workaholic: {
    emoji: '🔥',
    title: 'Cỗ Máy Kiệt Sức',
    tagline: 'Kiếm được nhiều tiền, mất cả bản thân.',
    description:
      'Bạn cày cuốc không ngừng và ngủ rất ít. Tài khoản đầy lên, nhưng tinh thần cạn dần cho đến khi cơ thể bảo dừng.',
    lesson: 'Kiệt sức không phải huy chương. Năng suất bền vững cần được nạp lại.',
    palette: 'orange',
  },
  hermit: {
    emoji: '🛌',
    title: 'Ẩn Sĩ Ngủ Đông',
    tagline: 'Không làm gì cả, và vẫn cạn kiệt.',
    description:
      'Bạn trốn vào giấc ngủ và sự im lặng. Không có thử thách nào tìm đến, nhưng không có niềm vui nào cả. Tâm trí vô cảm dần.',
    lesson: 'Nghỉ ngơi không phải là biến mất. Não cần có thứ gì đó để mong chờ.',
    palette: 'sky',
  },
  party_broke: {
    emoji: '🎉',
    title: 'Linh Hồn Tiệc Tùng',
    tagline: 'Bạn bè đầy nhà, ví thì trống rỗng.',
    description:
      'Bạn là người sống nhiệt tình nhất: kết nối đầy đủ, tiếng cười khắp nơi. Chỉ có điều tiền trọ không chịu cười cùng bạn.',
    lesson: 'Vui chơi rất cần, nhưng nó phải nằm trong ngân sách.',
    palette: 'amber',
  },
  fragile: {
    emoji: '🪞',
    title: 'Pha Lê Dễ Vỡ',
    tagline: 'Mọi thứ ổn, cho đến khi không còn ổn.',
    description:
      'Không một thói quen nào quá tệ, nhưng những căng thẳng nhỏ tích tụ âm thầm cho đến khi vượt ngưỡng chịu đựng.',
    lesson: 'Hậu quả hiếm khi đến từ một quyết định lớn. Nó đến từ hàng chục quyết định nhỏ.',
    palette: 'slate',
  },
  balanced_master: {
    emoji: '🌿',
    title: 'Bậc Thầy Cân Bằng',
    tagline: 'Sống chậm lại, thắng dài hơn.',
    description:
      'Bạn ưu tiên giấc ngủ, vận động và kết nối thật sự. Những chiến thắng nhỏ về dopamine chậm đã nuôi dưỡng ý chí của bạn suốt cả tuần.',
    lesson: 'Dopamine chậm xây nền tảng bền vững. Nó không ồn ào, nhưng nó thắng.',
    palette: 'emerald',
  },
  edge_survivor: {
    emoji: '🎢',
    title: 'Kẻ Sống Sót Trên Lằn Ranh',
    tagline: 'Chạm đáy rồi, nhưng vẫn đứng được.',
    description:
      'Bạn chịu nhiều kích thích rẻ tiền nhưng vẫn đủ ý chí để sống hết cả tuần. Lần này may mắn, nhưng lằn ranh rất mỏng.',
    lesson: 'Sống sót không có nghĩa là đang sống tốt. Hãy nhìn lại các thói quen đang rút dần của bạn.',
    palette: 'violet',
  },
  hustler: {
    emoji: '💼',
    title: 'Chiến Binh Cày Cuốc',
    tagline: 'Tiền vào như nước, ý chí rút như cát.',
    description:
      'Bạn kiên trì làm việc hết cả tuần và còn nguyên vẹn. Tài chính vững vàng, chỉ là đời sống ngoài công việc hơi mỏng.',
    lesson: 'Thành công bền vững cần cả sự nỗ lực và khoảng nghỉ có ý nghĩa.',
    palette: 'teal',
  },
  steady: {
    emoji: '🧭',
    title: 'Người Bền Bỉ',
    tagline: 'Không hoàn hảo, nhưng đi được hết đường.',
    description:
      'Bạn xoay xở được qua 7 ngày với những lựa chọn khá đời thường. Không rực rỡ, nhưng đủ để tiếp tục.',
    lesson: 'Sự đều đặn bình thường thường mạnh hơn những nỗ lực đột biến.',
    palette: 'indigo',
  },
};

interface HistoryTotals {
  daysPlayed: number;
  fastHours: number;
  slowHours: number;
  workHours: number;
  restHours: number;
  beerCount: number;
  dogTeases: number;
}

function summarizeHistory(history: string[][]): HistoryTotals {
  const totals: HistoryTotals = {
    daysPlayed: history.length,
    fastHours: 0,
    slowHours: 0,
    workHours: 0,
    restHours: 0,
    beerCount: 0,
    dogTeases: 0,
  };
  for (const day of history) {
    for (const id of day) {
      const action = DOMAIN_ACTIONS.find((a) => a.id === id);
      if (!action) continue;
      if (action.dopaminePathway === 'fast') totals.fastHours += action.hours;
      if (action.dopaminePathway === 'slow' && action.category !== 'rest') totals.slowHours += action.hours;
      if (action.id.startsWith('work_')) totals.workHours += action.hours;
      if (action.category === 'rest') totals.restHours += action.hours;
      if (action.id === 'beer_party') totals.beerCount += 1;
      if (action.id === 'tease_dog' || action.id === 'choc_cho') totals.dogTeases += 1;
    }
  }
  return totals;
}

/** Điểm 0-100: sống được bao lâu + chỉ số cuối + tài chính. */
export function computeLifeScore(daysSurvived: number, stats: PlayerStatsPrimitive): number {
  const dayPart = (Math.min(daysSurvived, 7) / 7) * 50;
  const vitality = (stats.energy + stats.mental + stats.willpower + stats.social) / 4;
  const vitalityPart = (vitality / 100) * 35;
  const moneyPart = (Math.max(0, Math.min(stats.money, 5000)) / 5000) * 15;
  return Math.round(dayPart + vitalityPart + moneyPart);
}

/**
 * Xác định kết cục sau khi ván kết thúc (sống hết 7 ngày hoặc sụp đổ giữa chừng).
 */
export function evaluateEnding(history: string[][], finalStats: PlayerStatsPrimitive): EndingPrimitive {
  const t = summarizeHistory(history);
  const status = evaluateLifeStatus(finalStats).status;
  const days = Math.max(1, t.daysPlayed);
  const avg = (v: number) => v / days;
  const collapsed = status === 'bankrupt' || status === 'burnout';

  let id: EndingId;
  if (t.dogTeases >= 2) {
    id = 'dog_whisperer';
  } else if (status === 'bankrupt') {
    id = t.beerCount >= 2 ? 'party_broke' : 'fragile';
  } else if (status === 'burnout') {
    if (avg(t.restHours) >= 12) id = 'hermit';
    else if (avg(t.fastHours) >= 3 && t.fastHours >= t.workHours) id = 'dopamine_slave';
    else if (avg(t.workHours) >= 7) id = 'workaholic';
    else if (avg(t.fastHours) >= 2) id = 'dopamine_slave';
    else id = 'fragile';
  } else if (t.beerCount >= 4 && finalStats.money < 1500) {
    id = 'party_broke';
  } else if (status === 'thriving' && avg(t.slowHours) >= 3 && avg(t.fastHours) < 1.5) {
    id = 'balanced_master';
  } else if (avg(t.fastHours) >= 3) {
    id = 'edge_survivor';
  } else if (avg(t.workHours) >= 7) {
    id = 'hustler';
  } else {
    id = 'steady';
  }

  const daysSurvived = t.daysPlayed;
  return {
    id,
    ...ENDINGS[id],
    outcome: collapsed ? status : 'survived',
    daysSurvived,
    score: computeLifeScore(daysSurvived, finalStats),
  };
}

export const ALL_ENDING_IDS = Object.keys(ENDINGS) as EndingId[];

/** Nội dung chia sẻ (văn bản thuần). `url` do adapter cung cấp. */
export function buildShareText(ending: EndingPrimitive, url: string): string {
  const fate =
    ending.outcome === 'survived'
      ? `sống sót trọn 7 ngày (${ending.score}/100 điểm)`
      : `gục ngã ở ngày ${ending.daysSurvived} (${ending.score}/100 điểm)`;
  return `${ending.emoji} Mình là "${ending.title}" - ${fate}.\n"${ending.tagline}"\nBạn sẽ sống được mấy ngày với 24 giờ mỗi ngày? ${url}`;
}
