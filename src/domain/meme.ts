/**
 * PURE DOMAIN: GIỌNG MEME (Meme voice layer)
 * Rule 1: NO React, NO UI, NO localStorage.
 * Chỉ là bảng tra chữ/emoji ngắn gọn thay cho mô tả dài. KHÔNG ảnh hưởng luật chơi.
 */

import { mulberry32 } from './rng';

export interface MemeLine {
  /** Emoji lớn đại diện */
  e: string;
  /** Câu giật tít ngắn (≤ 6 từ) */
  line: string;
}

export const MEME_ACTIONS: Record<string, MemeLine> = {
  // Dopamine nhanh
  scroll_social: { e: '📱', line: 'Lướt thêm xíu thôi... (2 tiếng sau)' },
  binge_gaming: { e: '🎮', line: 'Ván nữa là ngủ. Chắc vậy.' },
  fast_food: { e: '🧋', line: 'Trà sữa full topping, ví khóc' },
  impulse_shopping: { e: '🛍️', line: 'Sale 50%! Mua đã, nghĩ sau' },
  beer_party: { e: '🍻', line: 'Zô zô zô, mai tính' },
  tease_dog: { e: '🐕', line: 'Chọc chó: aura -999' },
  caffeine_spike: { e: '☕', line: 'Cà phê đặc: tỉnh giả' },
  late_night_snack: { e: '🍜', line: 'Mì gói 2h sáng, ohio vibes' },
  lottery_ticket: { e: '🎰', line: 'Vé số: tiền đi, hy vọng ở lại' },
  drama_news: { e: '🍿', line: 'Hóng drama, quên cả deadline' },
  binge_series: { e: '📺', line: 'Thêm 1 tập nữa (x9)' },
  // Dopamine chậm
  study_deep: { e: '🧠', line: 'Locked in. Não to lên.' },
  learn_soft_skills: { e: '🗣️', line: 'Level up EQ, rizz +1' },
  exercise: { e: '🏃', line: 'Chạy bộ: arc nhân vật chính' },
  short_walk: { e: '🌞', line: 'Ra nắng, đỡ nấm mốc' },
  pet_bonding: { e: '🐱', line: 'Vuốt mèo, ý chí +++' },
  learn_skill: { e: '🎸', line: 'Học nhạc cụ, sigma moment' },
  deep_talk: { e: '💬', line: 'Tâm sự thật lòng, hiếm có' },
  meditate_breathe: { e: '🧘', line: 'Hít thở. Bình tĩnh. Aura+.' },
  cook_tyrosine: { e: '🍳', line: 'Tự nấu: đầu bếp Michelin' },
  listen_music: { e: '🎧', line: 'Nghe trọn album, no skip' },
  clean_room: { e: '🧹', line: 'Dọn phòng, dọn luôn đầu óc' },
  morning_stretch: { e: '🤸', line: 'Giãn cơ cho đỡ cooked' },
  cold_shower: { e: '🥶', line: 'Tắm lạnh: tỉnh như sigma' },
  read_book: { e: '📖', line: 'Đọc sách giấy, flex nhẹ' },
  hobby_craft: { e: '🎨', line: 'Vẽ vời, hồn nghệ sĩ' },
  gym_session: { e: '🏋️', line: 'Gym: gym là chân ái' },
  sunset_walk: { e: '🌇', line: 'Ngắm hoàng hôn, chill' },
  journal_plan: { e: '📝', line: 'Lên kế hoạch như CEO' },
  hot_bath: { e: '🛁', line: 'Tắm nóng, thư giãn lv max' },
  online_course: { e: '💻', line: 'Khóa online: thật sự học' },
  marathon_training: { e: '🏅', line: 'Chạy 10km: nhân vật chính' },
  public_speaking: { e: '🎤', line: 'Lên sân khấu, run nhưng chất' },
  side_project: { e: '🚀', line: 'Dự án riêng: founder arc' },
  deep_research: { e: '🔬', line: 'Đào sâu 3 tiếng, mê luôn' },
  // Nghỉ / làm việc
  sleep_deep: { e: '😴', line: 'Ngủ đủ 8h: reset thành công' },
  sleep_nap: { e: '💤', line: 'Chợp mắt: sạc 20%' },
  work_focused: { e: '💼', line: 'Cày việc, tập trung max' },
  work_overtime: { e: '🧟', line: 'OT đêm: zombie mode' },
  part_time_shift: { e: '☕', line: 'Ca part-time, có tiền rồi' },
  freelance_gig: { e: '💸', line: 'Job freelance: tiền về' },
  sell_old_stuff: { e: '📦', line: 'Bán đồ cũ, giàu thêm xíu' },
  // Xã hội
  call_family: { e: '📞', line: 'Gọi bố mẹ: +100 hiếu thảo' },
  text_old_friend: { e: '👋', line: 'Nhắn bạn cũ, "lâu quá bà ơi"' },
  cafe_friends: { e: '☕', line: 'Cà phê tám chuyện với hội' },
  board_game_night: { e: '🎲', line: 'Board game, cãi nhau vui vẻ' },
  date_night: { e: '💘', line: 'Hẹn hò: rizz check' },
  volunteer: { e: '🤝', line: 'Tình nguyện: hero arc' },
  // Xâm nhập (tự tìm đến khi ý chí thấp)
  intrusion_phone: { e: '📳', line: 'Điện thoại rung: đừng mà...' },
  intrusion_game: { e: '🕹️', line: 'Ván "cuối cùng" (nói dối)' },
  intrusion_snack: { e: '🍜', line: 'Tủ lạnh gọi tên bạn' },
  intrusion_sale: { e: '🏷️', line: 'Flash Sale: chốt đơn?!' },
  // Sự kiện lớn
  big_event: { e: '🔥', line: 'Boss cuối tuần: chuẩn bị chưa?' },
};

export const MEME_EVENTS: Record<string, MemeLine> = {
  deadline_rush: { e: '🚨', line: 'Sếp ping: gấp gấp gấp!' },
  friend_crisis: { e: '😭', line: 'Bạn thân khóc, bạn làm gì?' },
  sale_temptation: { e: '🛒', line: 'Sale 12/12: ví run rẩy' },
  sudden_cold: { e: '🤒', line: 'Cảm sốt: cooked nhẹ' },
  bike_trouble: { e: '🛵', line: 'Xe thủng lốp, đen thật sự' },
  boss_bonus: { e: '🎁', line: 'Sếp thưởng bất ngờ: W' },
  partner_upset: { e: '😤', line: 'Người yêu dỗi: nguy hiểm' },
  laptop_broken: { e: '💥', line: 'Laptop toang giữa deadline' },
  small_lottery: { e: '🎉', line: 'Trúng thưởng nhỏ: W bất ngờ' },
  weekend_deadline: { e: '📅', line: 'Deadline cuối tuần: L nặng' },
  friends_trip: { e: '🏕️', line: 'Hội rủ đi phượt, đi hông?' },
  sunday_family_meal: { e: '🍚', line: 'Cơm nhà Chủ nhật: aura+' },
  road_old_friend: { e: '🫂', line: 'Gặp bạn cũ giữa phố!' },
  road_rain: { e: '🌧️', line: 'Mưa bất chợt, NPC khắp nơi' },
  road_street_food: { e: '🥞', line: 'Bánh xèo gọi tên bạn' },
  road_lost_stranger: { e: '🧭', line: 'Người lạ hỏi đường' },
  road_flat_tire: { e: '🛞', line: 'Lại thủng lốp, ohio' },
  road_stray_cat: { e: '🐈', line: 'Mèo hoang nhìn bạn, bạn nhìn mèo' },
  road_phone_buzz: { e: '📳', line: 'Điện thoại rung liên hồi' },
  gym_buddy: { e: '💪', line: 'Gym bro nhiệt tình quá mức' },
  cafe_barista: { e: '😎', line: 'Barista nhớ order: bạn là VIP' },
  office_gossip: { e: '🗣️', line: 'Đồng nghiệp rủ buôn chuyện' },
  school_tip: { e: '🎓', line: 'Thầy cô cho lời khuyên: nghe đi' },
  park_runner: { e: '🏃', line: 'Người lạ chạy cùng: vibe tốt' },
  market_sale: { e: '🏷️', line: 'Siêu thị sale sốc, tay ngứa' },
  bar_toast: { e: '🥂', line: 'Người lạ mời ly... uống hông?' },
};

/** Nhãn ngắn cho các chỉ số (icon thay chữ) */
export const STAT_EMOJI = {
  dopamine: '✨',
  energy: '⚡',
  mental: '🧠',
  social: '👥',
  money: '💰',
  willpower: '🛡️',
} as const;

/** Phản ứng meme theo kết quả: dùng làm chú thích dưới sticker */
export type ReactionKind = 'W' | 'L' | 'cooked' | 'lockedin' | 'aura_up' | 'aura_down' | 'broke' | 'sleep';

export const MEME_REACTIONS: Record<ReactionKind, string[]> = {
  W: ['W nhẹ', 'Quá đỉnh', 'Goated', 'Sigma moment'],
  L: ['L rồi bạn ơi', 'Ohio quá', 'Cú ngã đau', 'NPC energy'],
  cooked: ['Cooked.', 'Toang thật sự', 'Brainrot lv max'],
  lockedin: ['Locked in', 'Tập trung max', 'Não to lên'],
  aura_up: ['Aura +500', 'Rizz tăng', 'Ngầu lòi'],
  aura_down: ['Aura -500', 'Mất mặt nhẹ', 'Cringe'],
  broke: ['Ví khóc', 'Hết tiền rồi', 'Sống bằng gió'],
  sleep: ['Ngủ ngon', 'Sạc pin', 'Zzz...'],
};

/** Chọn một câu phản ứng ổn định theo seed (không dùng Math.random để dễ test) */
export function pickReaction(kind: ReactionKind, seed = 0): string {
  const list = MEME_REACTIONS[kind];
  return list[Math.abs(Math.floor(seed)) % list.length];
}

export function memeAction(id: string, fallbackTitle: string): MemeLine {
  return MEME_ACTIONS[id] ?? { e: '❓', line: fallbackTitle };
}

export function memeEvent(id: string, fallbackTitle: string): MemeLine {
  return MEME_EVENTS[id] ?? { e: '⚡', line: fallbackTitle };
}

interface FeedActionLike {
  id: string;
  category: string;
  dopaminePathway: string;
  isTemptation: boolean;
}

/**
 * Chọn 4 "lá bài" cho màn feed: 1 cám dỗ + 1 lành mạnh + 1 theo nhu cầu hiện tại + 1 ngẫu nhiên.
 * Chỉ chọn hành vi đang làm được (isOk). Cùng seed => cùng bài.
 */
export function pickFeedChoices(
  actions: FeedActionLike[],
  isOk: (id: string) => boolean,
  stats: { energy: number; money: number; social: number; mental: number },
  seed: number
): string[] {
  const rand = mulberry32(seed);
  const pool = actions.filter((a) => a.category !== 'travel' && a.id !== 'big_event' && isOk(a.id));
  const picked: string[] = [];
  const take = (list: FeedActionLike[]) => {
    const rest = list.filter((a) => !picked.includes(a.id));
    if (rest.length) picked.push(rest[Math.floor(rand() * rest.length)].id);
  };
  take(pool.filter((a) => a.isTemptation));
  take(pool.filter((a) => a.dopaminePathway === 'slow'));
  // Nhu cầu: kiệt sức -> nghỉ; thiếu tiền -> việc; cô đơn -> kết nối; còn lại -> bất kỳ
  const need =
    stats.energy < 35 ? pool.filter((a) => a.category === 'rest')
    : stats.money < 1500 ? pool.filter((a) => a.category === 'work')
    : stats.social < 40 ? pool.filter((a) => a.category === 'social')
    : pool.filter((a) => a.category === 'wellness');
  take(need.length ? need : pool);
  take(pool);
  return picked;
}
