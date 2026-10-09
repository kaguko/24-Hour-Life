import { PlayerStatsPrimitive, EndingPrimitive, EndingPalette } from './types';
import { evaluateLifeStatus } from './stats';
import { DOMAIN_ACTIONS } from './actions';

/**
 * Hệ kết cục: kiểu chơi chiếm ưu thế (theme) x kết quả (sống sót / gục ngã).
 * Pure domain: nhận lịch sử hành vi (string[][]) + chỉ số cuối, trả về EndingPrimitive.
 */

type Theme =
  | 'scroll'
  | 'shopper'
  | 'party'
  | 'hustle'
  | 'scholar'
  | 'athlete'
  | 'social'
  | 'rest'
  | 'dog'
  | 'balanced'
  | 'generic';

type Tier = 'survived' | 'collapsed';

interface EndingText {
  emoji: string;
  title: string;
  tagline: string;
  description: string;
  lesson: string;
  palette: EndingPalette;
}

const THEME_ACTIONS: Record<Exclude<Theme, 'rest' | 'dog' | 'balanced' | 'generic'>, string[]> = {
  scroll: ['scroll_social', 'binge_gaming', 'caffeine_spike', 'drama_news', 'binge_series', 'late_night_snack'],
  shopper: ['impulse_shopping', 'fast_food', 'lottery_ticket'],
  party: ['beer_party'],
  hustle: ['work_focused', 'work_overtime', 'part_time_shift', 'freelance_gig', 'sell_old_stuff'],
  scholar: ['study_deep', 'learn_skill', 'learn_soft_skills', 'online_course', 'read_book'],
  athlete: ['exercise', 'short_walk', 'meditate_breathe', 'cook_tyrosine', 'gym_session', 'morning_stretch', 'cold_shower', 'sunset_walk'],
  social: ['deep_talk', 'call_family', 'pet_bonding', 'text_old_friend', 'cafe_friends', 'board_game_night', 'date_night', 'volunteer'],
};

const ENDINGS: Record<string, EndingText> = {
  // --- Gục ngã ---
  scroll_collapsed: {
    emoji: '📱',
    title: 'Nô Lệ Dopamine',
    tagline: 'Vui rất nhanh, sập cũng rất nhanh.',
    description:
      'Video ngắn, game và cà phê cho bạn niềm vui tức thì, nhưng não bộ đã hạ ngưỡng thỏa mãn và đòi liều cao hơn mỗi ngày cho đến khi cạn kiệt.',
    lesson: 'Dopamine rẻ tiền vay khoái cảm của ngày mai với lãi suất cực cao.',
    palette: 'fuchsia',
  },
  shopper_collapsed: {
    emoji: '🛍️',
    title: 'Tín Đồ Flash Sale',
    tagline: 'Chốt đơn nhanh hơn nghĩ.',
    description:
      'Mỗi lần bấm "mua ngay" là một cú hit nhỏ. Ví tiền và ý chí của bạn đã cạn trước khi bạn kịp nhận ra mình cần gì.',
    lesson: 'Cảm giác sung sướng nằm ở lúc chốt đơn, không phải lúc món hàng đến.',
    palette: 'rose',
  },
  party_collapsed: {
    emoji: '🎉',
    title: 'Linh Hồn Tiệc Tùng',
    tagline: 'Bạn bè đầy nhà, ví thì trống rỗng.',
    description:
      'Bạn sống nhiệt tình nhất: kết nối đầy đủ, tiếng cười khắp nơi. Chỉ có điều tiền trọ và thể lực không chịu cười cùng bạn.',
    lesson: 'Vui chơi rất cần, nhưng nó phải nằm trong ngân sách và sức lực.',
    palette: 'amber',
  },
  hustle_collapsed: {
    emoji: '🔥',
    title: 'Cỗ Máy Kiệt Sức',
    tagline: 'Kiếm được nhiều tiền, mất cả bản thân.',
    description:
      'Bạn cày cuốc không ngừng và ngủ rất ít. Tài khoản đầy lên, nhưng tinh thần cạn dần cho đến khi cơ thể bảo dừng.',
    lesson: 'Kiệt sức không phải huy chương. Năng suất bền vững cần được nạp lại.',
    palette: 'orange',
  },
  scholar_collapsed: {
    emoji: '📚',
    title: 'Mọt Sách Quá Tải',
    tagline: 'Học hết sức, quên mất nghỉ.',
    description:
      'Bạn đầu tư mọi giờ rảnh vào việc học. Tri thức đầy lên, nhưng thể lực và các mối quan hệ bị bỏ lại phía sau.',
    lesson: 'Dopamine chậm cũng cần nhịp nghỉ. Não không học được khi đang cạn.',
    palette: 'indigo',
  },
  athlete_collapsed: {
    emoji: '🏃',
    title: 'Vận Động Viên Quá Sức',
    tagline: 'Chăm lành mạnh đến mức quên cả đời sống.',
    description:
      'Bạn tập luyện, thiền, ăn sạch rất kỷ luật. Nhưng bỏ qua tiền bạc hay công việc, và cuộc sống vẫn gục dù cơ thể săn chắc.',
    lesson: 'Lành mạnh không chỉ là thể lực. Cân bằng mới là thứ đưa bạn đi xa.',
    palette: 'teal',
  },
  social_collapsed: {
    emoji: '💞',
    title: 'Trái Tim Quá Tải',
    tagline: 'Lo cho mọi người, quên mất mình.',
    description:
      'Bạn dành thời gian cho người thân và bạn bè nhiều nhất. Kết nối đầy, nhưng chính bạn không còn lại gì để cho đi.',
    lesson: 'Bạn cần được nạp lại trước khi nạp cho người khác.',
    palette: 'rose',
  },
  rest_collapsed: {
    emoji: '🛌',
    title: 'Ẩn Sĩ Ngủ Đông',
    tagline: 'Không làm gì cả, và vẫn cạn kiệt.',
    description:
      'Bạn trốn vào giấc ngủ và sự im lặng. Không có thử thách nào tìm đến, nhưng cũng không có niềm vui nào. Tâm trí vô cảm dần.',
    lesson: 'Nghỉ ngơi không phải là biến mất. Não cần có thứ gì đó để mong chờ.',
    palette: 'sky',
  },
  dog_collapsed: {
    emoji: '🐕',
    title: 'Kẻ Thách Thức Loài Chó',
    tagline: 'Sống nguy hiểm vì một cú hit dopamine.',
    description:
      'Bạn chọc chó nhiều lần, và hàng xóm đã nhớ mặt bạn. Cảm giác mạnh rẻ tiền luôn có giá của nó.',
    lesson: 'Cảm giác mạnh tức thì không phải sự tự do - nó chỉ là cái bẫy được ngụy trang.',
    palette: 'rose',
  },
  generic_collapsed: {
    emoji: '🪞',
    title: 'Pha Lê Dễ Vỡ',
    tagline: 'Mọi thứ ổn, cho đến khi không còn ổn.',
    description:
      'Không một thói quen nào quá tệ, nhưng những căng thẳng nhỏ tích tụ âm thầm cho đến khi vượt ngưỡng chịu đựng.',
    lesson: 'Hậu quả hiếm khi đến từ một quyết định lớn. Nó đến từ hàng chục quyết định nhỏ.',
    palette: 'slate',
  },

  // --- Sống sót ---
  scroll_survived: {
    emoji: '🎢',
    title: 'Kẻ Sống Sót Trên Lằn Ranh',
    tagline: 'Chạm đáy rồi, nhưng vẫn đứng được.',
    description:
      'Bạn chịu nhiều kích thích rẻ tiền nhưng vẫn đủ ý chí để sống hết cả tuần. Lần này may mắn, nhưng lằn ranh rất mỏng.',
    lesson: 'Sống sót không có nghĩa là đang sống tốt. Hãy nhìn lại các thói quen đang rút dần của bạn.',
    palette: 'violet',
  },
  shopper_survived: {
    emoji: '🏷️',
    title: 'Thợ Săn Khuyến Mãi',
    tagline: 'Mua nhiều, nhưng vẫn kịp dừng.',
    description:
      'Bạn thích cảm giác chốt đơn và đã tiêu khá nhiều, nhưng cuối cùng vẫn giữ được ví và ý chí. Một cú vượt ải sát nút.',
    lesson: 'Biết dừng đúng lúc là kỹ năng mua sắm quan trọng nhất.',
    palette: 'amber',
  },
  party_survived: {
    emoji: '🥳',
    title: 'Chủ Tiệc Có Tiết Chế',
    tagline: 'Vui hết mình, nhưng vẫn về nhà đúng giờ.',
    description:
      'Bạn là người luôn xuất hiện ở mọi cuộc vui và vẫn sống trọn 7 ngày. Hiếm ai làm được cả hai.',
    lesson: 'Niềm vui bền vững là niềm vui mà ngày mai vẫn trả nổi.',
    palette: 'amber',
  },
  hustle_survived: {
    emoji: '💼',
    title: 'Chiến Binh Cày Cuốc',
    tagline: 'Tiền vào như nước, ý chí rút như cát.',
    description:
      'Bạn kiên trì làm việc hết cả tuần và còn nguyên vẹn. Tài chính vững vàng, chỉ là đời sống ngoài công việc hơi mỏng.',
    lesson: 'Thành công bền vững cần cả sự nỗ lực và khoảng nghỉ có ý nghĩa.',
    palette: 'teal',
  },
  scholar_survived: {
    emoji: '🧠',
    title: 'Học Giả Kiên Định',
    tagline: 'Mỗi ngày giỏi hơn một chút.',
    description:
      'Bạn dành phần lớn thời gian cho việc học và rèn kỹ năng, đồng thời vẫn giữ được sức khỏe. Dopamine chậm đang làm việc cho bạn.',
    lesson: 'Những thứ khó làm lúc đầu thường là thứ cho bạn niềm tự hào lâu nhất.',
    palette: 'indigo',
  },
  athlete_survived: {
    emoji: '💪',
    title: 'Chiến Binh Thể Lực',
    tagline: 'Cơ thể khỏe, đầu óc tỉnh.',
    description:
      'Vận động, thiền và ăn uống lành mạnh là trục chính của bạn. Cả tuần trôi qua nhẹ nhàng nhờ nền tảng thể chất vững.',
    lesson: 'Chăm sóc cơ thể là cách rẻ nhất để chăm sóc tâm trí.',
    palette: 'emerald',
  },
  social_survived: {
    emoji: '🤝',
    title: 'Cầu Nối Của Mọi Người',
    tagline: 'Có người thương là có sức mạnh.',
    description:
      'Bạn đầu tư vào các mối quan hệ nhiều nhất và nhận lại sự nâng đỡ tinh thần. Những cuộc nói chuyện đã giữ bạn vững vàng.',
    lesson: 'Kết nối thật sự là một dạng dopamine chậm mà ai cũng có thể có.',
    palette: 'sky',
  },
  rest_survived: {
    emoji: '😴',
    title: 'Người Ngủ Đông Bền Bỉ',
    tagline: 'Ngủ nhiều, vẫn qua được.',
    description:
      'Bạn nghỉ ngơi gần như cả tuần mà vẫn trụ được. Hơi lạ, nhưng nhịp sống chậm cũng là một chiến lược.',
    lesson: 'Nghỉ ngơi tốt, nhưng đừng để nó thay thế cho những điều bạn thực sự muốn làm.',
    palette: 'sky',
  },
  dog_survived: {
    emoji: '🐕',
    title: 'Kẻ Liều Mạng May Mắn',
    tagline: 'Chọc chó nhiều lần mà vẫn lành lặn.',
    description:
      'Bạn thích cảm giác mạnh và tìm đến chú chó hung dữ nhiều lần, nhưng vẫn sống sót hết tuần. Đúng là may mắn.',
    lesson: 'May mắn không phải là chiến lược. Lần sau chó sẽ không nhân từ như vậy.',
    palette: 'rose',
  },
  balanced_survived: {
    emoji: '🌿',
    title: 'Bậc Thầy Cân Bằng',
    tagline: 'Sống chậm lại, thắng dài hơn.',
    description:
      'Bạn ưu tiên giấc ngủ, vận động và kết nối thật sự. Những chiến thắng nhỏ về dopamine chậm đã nuôi dưỡng ý chí của bạn suốt cả tuần.',
    lesson: 'Dopamine chậm xây nền tảng bền vững. Nó không ồn ào, nhưng nó thắng.',
    palette: 'emerald',
  },
  generic_survived: {
    emoji: '🧭',
    title: 'Người Bền Bỉ',
    tagline: 'Không hoàn hảo, nhưng đi được hết đường.',
    description:
      'Bạn xoay xở được qua 7 ngày với những lựa chọn khá đời thường. Không rực rỡ, nhưng đủ để tiếp tục.',
    lesson: 'Sự đều đặn bình thường thường mạnh hơn những nỗ lực đột biến.',
    palette: 'indigo',
  },
};

const PARTY_WEIGHT = 2;

interface HistoryTotals {
  daysPlayed: number;
  fastHours: number;
  slowHours: number;
  restHours: number;
  activeHours: number;
  dogTeases: number;
  themeHours: Record<string, number>;
}

function summarizeHistory(history: string[][]): HistoryTotals {
  const t: HistoryTotals = {
    daysPlayed: history.length,
    fastHours: 0,
    slowHours: 0,
    restHours: 0,
    activeHours: 0,
    dogTeases: 0,
    themeHours: {},
  };
  for (const day of history) {
    for (const id of day) {
      const action = DOMAIN_ACTIONS.find((a) => a.id === id);
      if (!action) continue;
      if (action.category === 'rest') {
        t.restHours += action.hours;
        continue;
      }
      t.activeHours += action.hours;
      if (action.dopaminePathway === 'fast') t.fastHours += action.hours;
      if (action.dopaminePathway === 'slow') t.slowHours += action.hours;
      if (action.id === 'tease_dog' || action.id === 'choc_cho') t.dogTeases += 1;
      for (const [theme, ids] of Object.entries(THEME_ACTIONS)) {
        // Tiệc tùng tốn thể lực và tiền nhiều hơn số giờ, nên được tính trọng số cao hơn
        const weight = theme === 'party' ? PARTY_WEIGHT : 1;
        if (ids.includes(action.id)) t.themeHours[theme] = (t.themeHours[theme] ?? 0) + action.hours * weight;
      }
    }
  }
  return t;
}

/** Điểm 0-100: sống được bao lâu + chỉ số cuối + tài chính. */
export function computeLifeScore(daysSurvived: number, stats: PlayerStatsPrimitive): number {
  const dayPart = (Math.min(daysSurvived, 7) / 7) * 50;
  const vitality = (stats.energy + stats.mental + stats.willpower + stats.social) / 4;
  const vitalityPart = (vitality / 100) * 35;
  const moneyPart = (Math.max(0, Math.min(stats.money, 5000)) / 5000) * 15;
  return Math.round(dayPart + vitalityPart + moneyPart);
}

function pickTheme(t: HistoryTotals, thriving: boolean): Theme {
  const days = Math.max(1, t.daysPlayed);
  // Cảnh giác với "trốn vào giấc ngủ": nghỉ ngơi quá nhiều mỗi ngày
  if (t.restHours / days >= 11) return 'rest';
  if (t.dogTeases >= 4) return 'dog';
  // Kiểu chơi cân bằng: nhiều dopamine chậm, ít dopamine nhanh, đang phát triển tốt
  if (thriving && t.slowHours / days >= 3 && t.fastHours / days < 1.5) return 'balanced';

  let best: Theme = 'generic';
  let bestHours = 0;
  for (const [theme, hours] of Object.entries(t.themeHours)) {
    if (hours > bestHours) {
      bestHours = hours;
      best = theme as Theme;
    }
  }
  // Phải chiếm ít nhất ~30% thời gian chủ động mới được coi là "kiểu chơi chủ đạo"
  if (t.activeHours > 0 && bestHours / t.activeHours >= 0.3) return best;
  return 'generic';
}

/**
 * Xác định kết cục sau khi ván kết thúc (sống hết 7 ngày hoặc sụp đổ giữa chừng).
 */
export function evaluateEnding(history: string[][], finalStats: PlayerStatsPrimitive): EndingPrimitive {
  const t = summarizeHistory(history);
  const status = evaluateLifeStatus(finalStats).status;
  const collapsed = status === 'bankrupt' || status === 'burnout';
  const tier: Tier = collapsed ? 'collapsed' : 'survived';

  let theme = pickTheme(t, status === 'thriving');
  // "Cân bằng" chỉ có khi sống sót; gục ngã thì quay về kiểu chơi chung
  if (collapsed && theme === 'balanced') theme = 'generic';
  let key = `${theme}_${tier}`;
  if (!ENDINGS[key]) key = `generic_${tier}`;

  const daysSurvived = t.daysPlayed;
  return {
    id: key,
    ...ENDINGS[key],
    outcome: collapsed ? status : 'survived',
    daysSurvived,
    score: computeLifeScore(daysSurvived, finalStats),
  };
}

export const ALL_ENDING_IDS = Object.keys(ENDINGS);

/** Nội dung chia sẻ (văn bản thuần). `url` do adapter cung cấp. */
export function buildShareText(ending: EndingPrimitive, url: string): string {
  const fate =
    ending.outcome === 'survived'
      ? `sống sót trọn 7 ngày (${ending.score}/100 điểm)`
      : `gục ngã ở ngày ${ending.daysSurvived} (${ending.score}/100 điểm)`;
  return `${ending.emoji} Mình là "${ending.title}" - ${fate}.\n"${ending.tagline}"\nBạn sẽ sống được mấy ngày với 24 giờ mỗi ngày? ${url}`;
}
