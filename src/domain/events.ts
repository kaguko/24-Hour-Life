import { EventPrimitive, PlayerStatsPrimitive } from './types';
import { applyStatDeltas } from './stats';

export const DOMAIN_EVENTS: EventPrimitive[] = [
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
];

export function rollDomainEvent(day: number, rollSeed = Math.random()): EventPrimitive | null {
  if (rollSeed > 0.45) return null;
  const eligible = DOMAIN_EVENTS.filter((e) => day >= e.minDay);
  if (eligible.length === 0) return null;
  const idx = Math.floor(rollSeed * eligible.length * (1 / 0.45)) % eligible.length;
  return eligible[idx];
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
