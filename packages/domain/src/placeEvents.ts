import { EventPrimitive } from './types.js';

/**
 * Sự kiện gắn với địa điểm: trên đường đi ('road') và tại từng nơi, có NPC.
 * Chỉ xuất hiện khi người chơi thực sự ở đó, không rơi vào bốc ngẫu nhiên chung.
 */
export const PLACE_EVENTS: EventPrimitive[] = [
  // ---------- Trên đường ----------
  {
    id: 'road_old_friend',
    title: 'Gặp bạn cũ giữa phố',
    description: 'Một gương mặt quen vẫy tay từ bên kia đường. Đã mấy năm rồi hai người chưa gặp.',
    minDay: 1,
    places: ['road'],
    choices: [
      { id: 'chat', label: 'Dừng lại trò chuyện (1h)', timeHours: 1, deltas: { social: 24, mental: 10, dopamine: 6 }, feedback: 'Hai người đứng bên lề đường nói đủ chuyện. Bạn đi tiếp với cảm giác nhẹ lòng.' },
      { id: 'wave', label: 'Chào vội rồi đi tiếp (0h)', timeHours: 0, deltas: { social: 4 }, feedback: 'Một cái vẫy tay và lời hẹn "bữa nào cà phê". Có lẽ sẽ không có bữa nào.' },
    ],
  },
  {
    id: 'road_rain',
    title: 'Mưa bất chợt',
    description: 'Trời đổ mưa như trút trên đường bạn đi và bạn không mang áo mưa.',
    minDay: 1,
    places: ['road'],
    choices: [
      { id: 'raincoat', label: 'Mua áo mưa ven đường (-30k)', timeHours: 0, deltas: { money: -30, mental: -2 }, feedback: 'Một chiếc áo mưa mỏng tang nhưng đủ để bạn không ướt như chuột lột.' },
      { id: 'run', label: 'Cứ chạy qua mưa (0.25h)', timeHours: 0.25, deltas: { energy: -8, mental: -8, willpower: -4 }, feedback: 'Bạn đến nơi ướt sũng, hắt hơi liên tục. Một buổi chiều cần thêm chút can đảm.' },
      { id: 'shelter', label: 'Trú quán cà phê chờ tạnh (0.5h, -40k)', timeHours: 0.5, deltas: { money: -40, mental: 8, dopamine: 4 }, feedback: 'Ngắm mưa với ly cà phê nóng. Mưa chậm lại, bạn cũng thế.' },
    ],
  },
  {
    id: 'road_street_food',
    title: 'Mùi bánh xèo bên đường',
    description: 'Hàng rong thơm lừng ngay trước mặt. Bạn vừa ăn xong nhưng bụng vẫn muốn thêm.',
    minDay: 1,
    places: ['road'],
    choices: [
      { id: 'eat', label: 'Dừng ăn một phần (-60k, 0.25h)', timeHours: 0.25, deltas: { money: -60, dopamine: 22, willpower: -8, energy: 4 }, feedback: 'Ngon thật. Và chỉ 10 phút sau, cảm giác nặng bụng quay lại.' },
      { id: 'pass', label: 'Đi thẳng, không dừng (0h)', timeHours: 0, deltas: { willpower: 8, mental: 3 }, feedback: 'Bạn nuốt nước bọt và bước tiếp. Chiến thắng nhỏ nhưng rất thật.' },
    ],
  },
  {
    id: 'road_lost_stranger',
    title: 'Người lạ hỏi đường',
    description: 'Một bác lớn tuổi cầm tờ giấy ghi địa chỉ, nhìn quanh bối rối.',
    minDay: 1,
    places: ['road'],
    choices: [
      { id: 'help', label: 'Dẫn bác đến tận nơi (0.25h)', timeHours: 0.25, deltas: { social: 8, mental: 8, willpower: 4, dopamine: 6 }, feedback: 'Bác cảm ơn rối rít. Bạn thấy ngày hôm nay bỗng có ý nghĩa hơn.' },
      { id: 'point', label: 'Chỉ đường nhanh rồi đi (0h)', timeHours: 0, deltas: { social: 2, mental: 2 }, feedback: 'Bạn chỉ tay về phía đúng. Cũng đủ.' },
    ],
  },
  {
    id: 'road_flat_tire',
    title: 'Xe thủng lốp',
    description: 'Tiếng "xì" quen thuộc. Bánh sau xẹp lép giữa đường.',
    minDay: 2,
    places: ['road'],
    choices: [
      { id: 'repair', label: 'Tìm tiệm vá xe (-70k, 0.5h)', timeHours: 0.5, deltas: { money: -70, mental: -6 }, feedback: 'Anh thợ vá xe nhanh gọn. Bạn mất tiền và thời gian nhưng không mất bình tĩnh.' },
      { id: 'push', label: 'Dắt bộ cả đoạn (0.75h)', timeHours: 0.75, deltas: { energy: -14, mental: -8, willpower: 4 }, feedback: 'Mồ hôi đầm đìa nhưng bạn tiết kiệm được 70k.' },
    ],
  },
  {
    id: 'road_stray_cat',
    title: 'Chú mèo hoang trên vỉa hè',
    description: 'Một chú mèo ngồi giữa lối đi, nhìn bạn như đòi phí qua đường.',
    minDay: 1,
    places: ['road'],
    choices: [
      { id: 'pet', label: 'Ngồi xuống vuốt ve (0.25h)', timeHours: 0.25, deltas: { mental: 12, dopamine: 8, social: 3 }, feedback: 'Chú mèo cọ đầu vào tay bạn. Cả ngày bỗng dịu đi.' },
      { id: 'skip', label: 'Bước vòng qua (0h)', timeHours: 0, deltas: {}, feedback: 'Bạn đi tiếp. Chú mèo thờ ơ liếm chân.' },
    ],
  },
  {
    id: 'road_phone_buzz',
    title: 'Điện thoại rung liên hồi',
    description: 'Thông báo liên tục nhấp nháy trong túi. Đèn đỏ kéo dài bất thường.',
    minDay: 1,
    places: ['road'],
    choices: [
      { id: 'scroll', label: 'Mở ra lướt một chút (0.5h)', timeHours: 0.5, deltas: { dopamine: 20, willpower: -10, mental: -6 }, feedback: '"Một chút" hóa ra là nửa tiếng. Đèn xanh đã đổi từ lâu và tiếng còi phía sau nổi lên.' },
      { id: 'pocket', label: 'Bỏ vào túi, nhìn đường (0h)', timeHours: 0, deltas: { willpower: 6, mental: 4 }, feedback: 'Bạn ngắm đường phố thay vì màn hình. Hóa ra thành phố cũng thú vị.' },
    ],
  },

  // ---------- Tại các địa điểm ----------
  {
    id: 'gym_buddy',
    title: 'Anh bạn tập nhiệt tình ở phòng gym',
    description: 'Một người lạ hỏi bạn có thể đỡ tạ giúp một set không.',
    minDay: 1,
    places: ['gym'],
    choices: [
      { id: 'spot', label: 'Đỡ tạ và cùng tập vài set (0.5h)', timeHours: 0.5, deltas: { social: 12, mental: 8, energy: -6, willpower: 4 }, feedback: 'Anh ấy cảm ơn và rủ bạn tập chung vài buổi. Có người tập cùng thì ý chí dễ hơn.' },
      { id: 'pass', label: 'Xin lỗi, bạn đang bận (0h)', timeHours: 0, deltas: {}, feedback: 'Bạn tiếp tục bài tập của mình.' },
    ],
  },
  {
    id: 'cafe_barista',
    title: 'Barista nhớ order của bạn',
    description: 'Cô barista mỉm cười: "Vẫn như mọi hôm nhé?". Bạn bất ngờ vì mình đã thành khách quen.',
    minDay: 1,
    places: ['cafe'],
    choices: [
      { id: 'chat', label: 'Hỏi thăm vài câu (0.25h)', timeHours: 0.25, deltas: { social: 8, mental: 6, dopamine: 4 }, feedback: 'Một cuộc trò chuyện nhỏ nhưng ấm lòng giữa ngày dài.' },
      { id: 'nod', label: 'Gật đầu cảm ơn (0h)', timeHours: 0, deltas: { social: 2 }, feedback: 'Một nụ cười đáp lại. Vậy cũng đủ.' },
    ],
  },
  {
    id: 'office_gossip',
    title: 'Đồng nghiệp rủ buôn chuyện',
    description: 'Giờ nghỉ, mấy đồng nghiệp kéo bạn vào nhóm tám chuyện về người vắng mặt.',
    minDay: 1,
    places: ['office'],
    choices: [
      { id: 'join', label: 'Hùa vào cho vui (0.5h)', timeHours: 0.5, deltas: { dopamine: 12, social: 8, willpower: -6, mental: -4 }, feedback: 'Vui đấy, nhưng bạn có cảm giác hơi áy náy sau đó.' },
      { id: 'decline', label: 'Lịch sự rút lui, tranh thủ làm việc (0h)', timeHours: 0, deltas: { willpower: 6, mental: 3 }, feedback: 'Bạn quay lại màn hình. Không ai giận, và đầu óc bạn nhẹ hơn.' },
    ],
  },
  {
    id: 'school_tip',
    title: 'Thầy cô cho lời khuyên bất ngờ',
    description: 'Một giảng viên thấy bạn ngồi học và dừng lại gợi ý một cách tiếp cận hay hơn.',
    minDay: 1,
    places: ['school'],
    choices: [
      { id: 'listen', label: 'Ngồi nghe kỹ và ghi chép (0.5h)', timeHours: 0.5, deltas: { mental: 12, willpower: 8, dopamine: 8 }, feedback: 'Một mẹo nhỏ tiết kiệm cho bạn cả giờ vật lộn. Bạn học thêm cả cách học.' },
      { id: 'thanks', label: 'Cảm ơn rồi học tiếp (0h)', timeHours: 0, deltas: { mental: 3 }, feedback: 'Bạn ghi nhớ lời khuyên để dùng sau.' },
    ],
  },
  {
    id: 'park_runner',
    title: 'Người lạ chạy cùng',
    description: 'Một người chạy bộ bắt kịp bước bạn và gật đầu: "Chạy cùng nhé?"',
    minDay: 1,
    places: ['park'],
    choices: [
      { id: 'together', label: 'Chạy cùng một vòng (0.5h)', timeHours: 0.5, deltas: { energy: -8, mental: 10, social: 10, willpower: 6, dopamine: 8 }, feedback: 'Có người cùng nhịp nên bạn chạy lâu hơn dự định. Hai người chia tay bằng một nụ cười.' },
      { id: 'alone', label: 'Giữ nhịp riêng (0h)', timeHours: 0, deltas: { willpower: 2 }, feedback: 'Bạn mỉm cười đáp lại rồi tiếp tục theo cách của mình.' },
    ],
  },
  {
    id: 'market_sale',
    title: 'Siêu thị giảm giá sốc',
    description: 'Biển "Giảm 50%, chỉ hôm nay" đỏ rực. Bạn chỉ định mua vài thứ nhưng giỏ hàng đã đầy.',
    minDay: 1,
    places: ['market'],
    choices: [
      { id: 'buy', label: 'Chốt đơn thêm vài món (-250k, 0.25h)', timeHours: 0.25, deltas: { money: -250, dopamine: 18, willpower: -10 }, feedback: 'Bạn rời đi với hai túi đầy và ví nhẹ hơn nhiều so với kế hoạch.' },
      { id: 'list', label: 'Chỉ mua theo danh sách (0h)', timeHours: 0, deltas: { willpower: 8, mental: 4 }, feedback: 'Bạn bước qua mà không nhìn lại. Ví tiền cảm ơn bạn.' },
    ],
  },
  {
    id: 'bar_toast',
    title: 'Người lạ mời ly',
    description: 'Bàn bên cạnh nâng ly: "Nào, làm một ly với tụi anh!".',
    minDay: 1,
    places: ['bar'],
    choices: [
      { id: 'accept', label: 'Cụng ly cho vui (0.5h)', timeHours: 0.5, deltas: { dopamine: 20, social: 10, energy: -10, willpower: -10, mental: -4 }, feedback: 'Một ly thành ba ly. Vui thật, và sáng mai chắc chắn bạn sẽ nhớ chuyện này.' },
      { id: 'decline', label: 'Khéo léo từ chối (0h)', timeHours: 0, deltas: { willpower: 6, social: 2 }, feedback: 'Bạn nâng ly nước ngọt. Không ai để ý, và bạn thấy tự hào.' },
    ],
  },
];
