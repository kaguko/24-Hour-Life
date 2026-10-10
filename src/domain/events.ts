import { EventPrimitive, PlayerStatsPrimitive } from './types';
import { applyStatDeltas } from './stats';
import type { Rng } from './rng';
import { PLACE_EVENTS } from './placeEvents';

const CORE_EVENTS: EventPrimitive[] = [
  {
    id: 'deadline_rush',
    title: 'Dự án gấp từ sếp / Khách hàng',
    description: 'Một yêu cầu phát sinh đột ngột cần xử lý gấp trong ngày. Khách hứa trả thêm thù lao nóng!',
    minDay: 2,
    choices: [
      {
        id: 'take_it',
        label: 'Nhận làm luôn (+600k VNĐ, tốn 3h)',
        timeHours: 3,
        deltas: { money: 600, energy: -25, mental: -15, willpower: -10 },
        feedback: 'Bạn cày xong việc trong mệt mỏi nhưng ví tiền có thêm một khoản kha khá.',
      },
      {
        id: 'refuse_it',
        label: 'Từ chối để bảo vệ lịch trình (0h)',
        timeHours: 0,
        deltas: { mental: 5, willpower: 10 },
        feedback: 'Bạn kiên quyết từ chối. Sếp hơi hụt hẫng nhưng bạn giữ được ranh giới cá nhân.',
      },
    ],
  },
  {
    id: 'friend_crisis',
    title: 'Bạn thân gặp khủng hoảng tâm lý',
    description: 'Người bạn thân nhất nhắn tin trong nước mắt cần người lắng nghe và uống nước nói chuyện.',
    minDay: 2,
    choices: [
      {
        id: 'meet_support',
        label: 'Đến gặp và an ủi bạn (tốn 2.5h, -50k)',
        timeHours: 2.5,
        deltas: { social: 30, mental: 10, energy: -10, money: -50 },
        feedback: 'Bạn đã ở bên cạnh lúc bạn mình cần nhất. Tình bạn trở nên khăng khít hơn bao giờ hết.',
      },
      {
        id: 'text_only',
        label: 'Chỉ nhắn tin động viên ngắn gọn (tốn 0.5h)',
        timeHours: 0.5,
        deltas: { social: 5 },
        feedback: 'Bạn gửi vài dòng an ủi. Bạn ấy hiểu bạn đang bận nhưng cảm giác xa cách vẫn len lỏi.',
      },
    ],
  },
  {
    id: 'sale_temptation',
    title: 'Đại tiệc siêu sale Flash Sale 12/12',
    description: 'Thông báo giảm giá 50% món đồ công nghệ bạn ngắm nghía bấy lâu chỉ còn hiệu lực trong 2 giờ tới!',
    minDay: 3,
    choices: [
      {
        id: 'buy_now',
        label: 'Chốt đơn ngay! (-450k VNĐ)',
        timeHours: 0.5,
        deltas: { dopamine: 35, money: -450, willpower: -15 },
        feedback: 'Khoái cảm mua sắm ngập tràn trong chốc lát! Nhưng nhìn số dư tài khoản thì hơi xót xa...',
      },
      {
        id: 'skip_sale',
        label: 'Tắt app thương mại điện tử (0h)',
        timeHours: 0,
        deltas: { willpower: 15, mental: 5 },
        feedback: 'Một chiến thắng rực rỡ của lý trí trước bẫy tâm lý tiêu dùng!',
      },
    ],
  },
  {
    id: 'sudden_cold',
    title: 'Trở trời - Cảm sốt nhẹ',
    description: 'Thời tiết thay đổi đột ngột làm bạn nhức đầu và nghẹt mũi từ sáng.',
    minDay: 2,
    choices: [
      {
        id: 'buy_medicine',
        label: 'Mua thuốc & uống nước ấm (-100k, 0.5h)',
        timeHours: 0.5,
        deltas: { money: -100, energy: -10, mental: 5 },
        feedback: 'Thuốc giúp hạ sốt, bạn hồi phục dần nhưng người vẫn còn hơi uể oải.',
      },
      {
        id: 'ignore_cold',
        label: 'Cắn răng chịu đựng để tiết kiệm tiền (0h)',
        timeHours: 0,
        deltas: { energy: -25, mental: -15, willpower: -10 },
        feedback: 'Cơn sốt kéo dài làm bạn mất tập trung và kiệt sức suốt cả buổi.',
      },
    ],
  },
  {
    id: 'bike_trouble',
    title: 'Thủng lốp xe máy trên đường',
    description: 'Chiếc xe bị cán đinh nhọn giữa đường đi, bạn buộc phải dắt bộ tìm tiệm vá sửa.',
    minDay: 4,
    choices: [
      {
        id: 'repair_bike',
        label: 'Vào tiệm thay săm (-120k VNĐ, tốn 1.5h)',
        timeHours: 1.5,
        deltas: { money: -120, energy: -15, mental: -10 },
        feedback: 'Xe chạy bon bon trở lại. Một sự cố ngoài ý muốn làm mất tong buổi chiều.',
      },
    ],
  },
  {
    id: 'boss_bonus',
    title: 'Khen thưởng bất ngờ từ công ty',
    description: 'Nhờ hoàn thành tốt đợt báo cáo tuần trước, bạn nhận được khoản thưởng nóng.',
    minDay: 5,
    choices: [
      {
        id: 'take_bonus',
        label: 'Nhận thưởng (+500k VNĐ)',
        timeHours: 0,
        deltas: { money: 500, mental: 15, dopamine: 15 },
        feedback: 'Một tin vui ấm lòng giúp bạn có thêm động lực phấn đấu!',
      },
    ],
  },
  {
    id: 'partner_upset',
    title: 'Người yêu dỗi vì bạn ít nhắn tin',
    description: 'Người ấy nhắn: "Dạo này cậu cứ bận hoài, chẳng thèm quan tâm tớ gì cả..."',
    minDay: 2,
    choices: [
      {
        id: 'make_up_date',
        label: 'Dành thời gian dỗ dành, hẹn cà phê (-120k, 2h)',
        timeHours: 2,
        deltas: { social: 28, mental: 12, energy: -8, money: -120 },
        feedback: 'Một buổi trò chuyện chân thành hóa giải hiểu lầm. Hai bạn gần nhau hơn.',
      },
      {
        id: 'quick_sorry',
        label: 'Nhắn tin xin lỗi qua loa (0.2h)',
        timeHours: 0.2,
        deltas: { social: -8, mental: -10, willpower: -5 },
        feedback: 'Lời xin lỗi hời hợt khiến người ấy càng buồn. Bạn thấy tội lỗi âm ỉ cả ngày.',
      },
    ],
  },
  {
    id: 'laptop_broken',
    title: 'Laptop đột ngột hỏng giữa lúc làm việc',
    description: 'Màn hình xanh, máy không lên nguồn. Dữ liệu công việc đang nằm trong đó.',
    minDay: 3,
    choices: [
      {
        id: 'repair_laptop',
        label: 'Mang đi sửa ngay (-350k, 2h)',
        timeHours: 2,
        deltas: { money: -350, mental: -8, energy: -10 },
        feedback: 'Thợ sửa cứu được dữ liệu. Tốn tiền nhưng bạn thở phào nhẹ nhõm.',
      },
      {
        id: 'work_around',
        label: 'Mượn máy bạn làm tạm, tự xoay xở (1h)',
        timeHours: 1,
        deltas: { mental: -18, willpower: -12, social: 6 },
        feedback: 'Bạn xoay xở được nhưng áp lực và bất tiện làm tinh thần sa sút.',
      },
    ],
  },
  {
    id: 'small_lottery',
    title: 'Trúng thưởng nhỏ từ ví điện tử',
    description: 'Bạn bất ngờ trúng giải khuyến khích trong chương trình bốc thăm của ví điện tử.',
    minDay: 2,
    choices: [
      {
        id: 'save_prize',
        label: 'Cất vào quỹ dự phòng (+200k)',
        timeHours: 0,
        deltas: { money: 200, mental: 8, willpower: 6 },
        feedback: 'Một khoản nhỏ nhưng khiến bạn thấy an tâm hơn về tài chính.',
      },
      {
        id: 'treat_self',
        label: 'Tự thưởng ly trà sữa & bánh (+120k còn lại)',
        timeHours: 0.5,
        deltas: { money: 120, dopamine: 22, willpower: -6 },
        feedback: 'Vị ngọt thoáng qua mang lại niềm vui nhỏ, nhưng cơn thèm lại được nuôi dưỡng.',
      },
    ],
  },
  {
    id: 'weekend_deadline',
    title: 'Deadline bất thình lình cuối tuần',
    description: 'Sếp nhắn lúc cuối tuần: "Em xử lý giúp anh bản báo cáo này trước tối nhé!"',
    minDay: 5,
    choices: [
      {
        id: 'do_deadline',
        label: 'Làm ngay cho xong (+450k, 3h)',
        timeHours: 3,
        deltas: { money: 450, energy: -22, mental: -14, social: -6, willpower: -8 },
        feedback: 'Báo cáo xong, ví nặng hơn nhưng cuối tuần của bạn đã bay mất một góc.',
      },
      {
        id: 'push_back',
        label: 'Xin dời sang sáng thứ Hai (0.3h)',
        timeHours: 0.3,
        deltas: { mental: -4, willpower: 8 },
        feedback: 'Bạn lịch sự đề nghị dời lịch. Sếp đồng ý, hơi khó chịu nhưng bạn giữ được ngày nghỉ.',
      },
    ],
  },
  {
    id: 'friends_trip',
    title: 'Bạn bè rủ đi phượt cuối tuần',
    description: 'Nhóm bạn cũ rủ bạn đi phượt một vòng ngoại ô. "Đi đi, lâu rồi chưa gặp nhau!"',
    minDay: 6,
    onlyDays: [6, 7],
    choices: [
      {
        id: 'join_trip',
        label: 'Đi cùng nhóm (-250k, 4h)',
        timeHours: 4,
        deltas: { social: 35, mental: 20, dopamine: 12, energy: -18, money: -250 },
        feedback: 'Gió, đường dài và tiếng cười bạn bè. Một ký ức đẹp nạp đầy tâm hồn.',
      },
      {
        id: 'stay_home',
        label: 'Ở nhà nghỉ ngơi (0h)',
        timeHours: 0,
        deltas: { energy: 8, social: -10, mental: -3 },
        feedback: 'Bạn được nghỉ ngơi nhưng thấy hơi lạc lõng khi nhìn ảnh bạn bè đăng.',
      },
    ],
  },
  {
    id: 'sunday_family_meal',
    title: 'Bữa cơm gia đình ngày Chủ nhật',
    description: 'Bố mẹ gọi về ăn cơm chung. Mâm cơm đầy đủ món bạn thích.',
    minDay: 7,
    onlyDays: [7],
    choices: [
      {
        id: 'go_home',
        label: 'Về nhà ăn cơm (3h)',
        timeHours: 3,
        deltas: { social: 28, mental: 22, energy: 10, money: 60, willpower: 8 },
        feedback: 'Hơi ấm gia đình xoa dịu mọi mệt mỏi của tuần. Mẹ còn nhét thêm ít tiền cho bạn.',
      },
      {
        id: 'skip_meal',
        label: 'Viện cớ bận, không về (0h)',
        timeHours: 0,
        deltas: { social: -12, mental: -8 },
        feedback: 'Cuộc gọi cụt ngủn của mẹ khiến bạn day dứt suốt buổi tối.',
      },
    ],
  },
];

export const DOMAIN_EVENTS: EventPrimitive[] = [...CORE_EVENTS, ...PLACE_EVENTS];

export const WEEKDAY_LABELS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

/** Ngày game 1..7 -> nhãn thứ trong tuần (Ngày 1 = Thứ Hai) */
export function getWeekdayLabel(day: number): string {
  return WEEKDAY_LABELS[(((day - 1) % 7) + 7) % 7];
}

export function isWeekend(day: number): boolean {
  return day % 7 === 6 || day % 7 === 0;
}

export function rollDomainEvent(day: number, rng: Rng): EventPrimitive | null {
  const rollSeed = rng();
  if (rollSeed > 0.45) return null;
  const eligible = DOMAIN_EVENTS.filter(
    (e) => !e.places && day >= e.minDay && (!e.onlyDays || e.onlyDays.includes(day))
  );
  if (eligible.length === 0) return null;
  const idx = Math.floor(rollSeed * eligible.length * (1 / 0.45)) % eligible.length;
  return eligible[idx];
}

/** Sự kiện gắn với địa điểm ('road' = trên đường đi). `rng` trả số trong [0,1). */
export function rollPlaceEvent(place: string, day: number, rng: Rng): EventPrimitive | null {
  const eligible = DOMAIN_EVENTS.filter((e) => e.places?.includes(place) && day >= e.minDay);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(rng() * eligible.length) % eligible.length];
}

export function resolveDomainChoice(
  eventId: string,
  choiceId: string,
  stats: PlayerStatsPrimitive
): {
  newStats: PlayerStatsPrimitive;
  timeHours: number;
  feedback: string;
} {
  const event = DOMAIN_EVENTS.find((e) => e.id === eventId);
  const choice = event?.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return { newStats: stats, timeHours: 0, feedback: 'Không tìm thấy lựa chọn.' };
  }

  const newStats = applyStatDeltas(stats, choice.deltas);
  return {
    newStats,
    timeHours: choice.timeHours,
    feedback: choice.feedback,
  };
}
