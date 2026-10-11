/**
 * PURE DOMAIN: MẠCH TRUYỆN NHIỀU NGÀY
 * Mỗi ván bốc vài mạch truyện, mỗi mạch có 3 chương rải qua tuần. Chương sau đổi nội dung và lựa chọn theo
 * những gì bạn đã chọn ở chương trước, chương cuối rẽ nhánh thành các kết cục riêng. Không dùng rng ngoài
 * lúc bốc mạch: mọi thứ khác suy ra từ nhật ký lựa chọn `StoryLog` (được lưu trong PlayerState).
 * Mỗi chương xuất hiện dưới dạng một EventPrimitive có id `story:<beatId>`.
 */
import type { EventChoicePrimitive, EventPrimitive, PlayerStatsPrimitive } from './types.js';
import { applyStatDeltas } from './stats.js';
import type { Rng } from './rng.js';

export interface StoryLogEntry {
  /** vd. 'friend:2' */
  beat: string;
  day: number;
  choice: string;
}
export type StoryLog = StoryLogEntry[];

interface BeatView {
  title: string;
  description: string;
  choices: EventChoicePrimitive[];
}

interface Beat {
  id: string;
  /** Sớm nhất ngày này mới xuất hiện */
  minDay: number;
  build: (log: StoryLog) => BeatView;
}

export interface StoryEpilogue {
  title: string;
  text: string;
}

export interface Storyline {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  beats: Beat[];
  /** Kết cục của mạch, suy từ nhật ký (chỉ có nghĩa khi đã chơi hết các chương) */
  outcome: (log: StoryLog) => string;
  epilogues: Record<string, StoryEpilogue>;
}

type Deltas = Partial<PlayerStatsPrimitive>;

const c = (id: string, label: string, timeHours: number, deltas: Deltas, feedback: string): EventChoicePrimitive => ({
  id,
  label,
  timeHours,
  deltas,
  feedback,
});

/** Đã chọn `choice` ở chương `beat` chưa */
const chose = (log: StoryLog, beat: string, choice: string | string[]): boolean => {
  const set = Array.isArray(choice) ? choice : [choice];
  return log.some((e) => e.beat === beat && set.includes(e.choice));
};

// ───────────────────────── 1. Người bạn cũ ─────────────────────────

const friendOutcome = (log: StoryLog): string => {
  if (chose(log, 'friend:1', 'meet') && chose(log, 'friend:2', ['lend', 'help'])) return 'warm';
  if (chose(log, 'friend:1', 'meet') || chose(log, 'friend:2', ['promise', 'wish'])) return 'distant';
  return 'lost';
};

const FRIEND: Storyline = {
  id: 'friend',
  emoji: '🤝',
  title: 'Người bạn cũ',
  blurb: 'Một tin nhắn sau nhiều năm im lặng.',
  outcome: friendOutcome,
  epilogues: {
    warm: { title: 'Giữ được một người bạn thật', text: 'Bạn đã có mặt đúng lúc Minh cần. Có những mối quan hệ chỉ cần một tin nhắn trả lời kịp thời để sống tiếp thêm nhiều năm.' },
    distant: { title: 'Cánh cửa vẫn còn hé', text: 'Bạn và Minh chưa thân lại như xưa, nhưng cánh cửa vẫn còn mở. Chỉ cần một cuộc gọi nữa.' },
    lost: { title: 'Những tin nhắn không được trả lời', text: 'Bạn và Minh mất liên lạc, không có cuộc cãi vã nào, chỉ là những tin nhắn không bao giờ được trả lời.' },
  },
  beats: [
    {
      id: 'friend:1',
      minDay: 2,
      build: () => ({
        title: 'Tin nhắn từ người bạn cũ',
        description: 'Minh, người bạn thân hồi đại học, nhắn sau ba năm im lặng: "Dạo này sao rồi? Cuối tuần này đi cà phê không?"',
        choices: [
          c('meet', 'Hẹn gặp luôn (tốn 2h, -60k)', 2, { social: 25, mental: 8, energy: -8, money: -60 }, 'Hai bạn nói chuyện đến quán đóng cửa. Ba năm hóa ra chỉ như một buổi chiều.'),
          c('later', 'Hẹn "để xem sao" (0h)', 0, { social: 2, willpower: -2 }, 'Bạn nhắn lại cho có. Cảm giác nợ ai đó một lời hồi đáp cứ lởn vởn.'),
          c('ignore', 'Xem rồi bỏ đó (0h)', 0, { mental: -3, social: -4, dopamine: 3 }, 'Bạn tắt màn hình. Tin nhắn nằm im trong hộp thư, càng để lâu càng khó trả lời.'),
        ],
      }),
    },
    {
      id: 'friend:2',
      minDay: 4,
      build: (log) => {
        if (chose(log, 'friend:1', 'meet')) {
          return {
            title: 'Minh ngỏ lời nhờ giúp',
            description: 'Minh ngập ngừng nhắn: dạo này làm ăn khó, cậu ấy hỏi vay 500k đến cuối tháng.',
            choices: [
              c('lend', 'Cho vay 500k (0.5h)', 0.5, { money: -500, social: 12, mental: 3 }, 'Bạn chuyển khoản mà không hỏi thêm. Minh chỉ nhắn lại đúng một chữ: "Cảm ơn".'),
              c('help', 'Không cho vay, giới thiệu việc làm (1h)', 1, { social: 10, mental: 4, willpower: -4, energy: -4 }, 'Bạn gửi cho cậu ấy ba địa chỉ tuyển người và một bản CV mẫu.'),
              c('decline', 'Từ chối khéo (0h)', 0, { social: -8, mental: -3 }, 'Bạn viện cớ cũng đang eo hẹp. Minh nhắn "Ừ, không sao", nhưng bạn biết là có.'),
            ],
          };
        }
        if (chose(log, 'friend:1', 'later')) {
          return {
            title: 'Minh nhắn lại',
            description: 'Minh nhắn: "Cậu có ổn không? Mình hơi lo." Bạn chưa hề hẹn được ngày nào.',
            choices: [
              c('promise', 'Hẹn một ngày cụ thể (0h)', 0, { social: 6, willpower: -3 }, 'Bạn chốt luôn: chiều thứ Bảy. Có một mốc cụ thể làm lời hẹn nhẹ hơn hẳn.'),
              c('brush', 'Trả lời cho có (0h)', 0, { social: -2 }, 'Một cái thả tim và một câu "dạo này bận quá". Cả hai đều biết đó không phải lý do.'),
            ],
          };
        }
        return {
          title: 'Minh sắp đi xa',
          description: 'Minh đăng một tấm ảnh: cậu ấy sắp chuyển sang nơi khác sống. Dòng cuối: "Tiếc là chưa kịp gặp ai."',
          choices: [
            c('wish', 'Nhắn lời chúc và xin địa chỉ (0.25h)', 0.25, { social: 6, mental: 2 }, 'Một tin nhắn muộn nhưng thật. Minh trả lời gần như ngay lập tức.'),
            c('scroll', 'Lướt tiếp (0h)', 0, { dopamine: 4, social: -4 }, 'Bạn vuốt qua bài đăng. Vài giây sau bạn đã quên tên người trong ảnh.'),
          ],
        };
      },
    },
    {
      id: 'friend:3',
      minDay: 6,
      build: (log) => {
        const out = friendOutcome(log);
        if (out === 'warm') {
          const lent = chose(log, 'friend:2', 'lend');
          return {
            title: 'Minh gọi lại',
            description: 'Minh đã qua cơn khó khăn và muốn mời bạn một bữa. "Cậu là người duy nhất hồi đó tin tớ."' + (lent ? ' Cậu ấy còn trả lại đủ 500k.' : ''),
            choices: [
              c('dinner', 'Đi ăn cùng (2h)', 2, { social: 30, mental: 12, energy: -6, money: lent ? 420 : -80 }, 'Bữa cơm kéo dài hơn dự định. Hai người cười nhiều hơn bất kỳ lúc nào trong tuần.'),
              c('thanks', 'Nhắn cảm ơn, hẹn dịp khác (0h)', 0, { social: 8, mental: 3, money: lent ? 500 : 0 }, 'Bạn giữ lời hẹn cho một dịp thong thả hơn.'),
            ],
          };
        }
        if (out === 'distant') {
          return {
            title: 'Cánh cửa còn hé',
            description: 'Minh nhắn một câu ngắn: "Cuối tuần này tớ rảnh, nếu cậu muốn." Không trách, không giục.',
            choices: [
              c('call', 'Gọi ngay (1h)', 1, { social: 18, mental: 6, energy: -4 }, 'Chuông chỉ reo hai hồi. Cuộc gọi kéo dài gần một tiếng.'),
              c('skip', 'Để lần sau (0h)', 0, { social: -3 }, 'Bạn tự hứa lần sau. Cả hai đều biết lần sau thường là bao giờ.'),
            ],
          };
        }
        return {
          title: 'Một tài khoản đã biến mất',
          description: 'Tên Minh không còn hiện trong danh sách bạn bè. Có những cuộc trò chuyện bạn không còn cơ hội trả lời nữa.',
          choices: [
            c('reflect', 'Ngồi lặng một lúc (0.5h)', 0.5, { mental: -6, willpower: 4, social: 4 }, 'Bạn nhìn khung chat trống thật lâu. Lần tới có tin nhắn từ ai đó, bạn sẽ trả lời sớm hơn.'),
            c('distract', 'Lướt cho qua (1h)', 1, { dopamine: 10, mental: -4, social: -6 }, 'Một giờ trôi qua. Cảm giác trống vẫn còn nguyên khi bạn đặt điện thoại xuống.'),
          ],
        };
      },
    },
  ],
};

// ───────────────────────── 2. Dự án riêng ─────────────────────────

const projectOutcome = (log: StoryLog): string => {
  if (chose(log, 'project:1', 'start') && chose(log, 'project:2', ['push', 'ask'])) return 'launched';
  if (chose(log, 'project:1', 'start') || chose(log, 'project:2', ['restart', 'learn'])) return 'prototype';
  return 'shelved';
};

const PROJECT: Storyline = {
  id: 'project',
  emoji: '💡',
  title: 'Dự án riêng',
  blurb: 'Một ý tưởng nảy ra trong lúc tắm.',
  outcome: projectOutcome,
  epilogues: {
    launched: { title: 'Bấm nút xuất bản', text: 'Sản phẩm của bạn đã có người dùng thật, dù chỉ vài chục người. Khác biệt giữa "có ý tưởng" và "đã làm" nằm ở những buổi tối khó chịu nhất.' },
    prototype: { title: 'Một bản thử nằm trong máy', text: 'Bạn có một bản thử chạy được, dù chưa ai biết. Nó chưa phải thành công, nhưng đã là một thứ thật.' },
    shelved: { title: 'Thư mục "Ý tưởng"', text: 'Ý tưởng không thất bại, nó chỉ chưa bao giờ được thử. Những dự án chết yểu thường chết vì chưa từng bắt đầu.' },
  },
  beats: [
    {
      id: 'project:1',
      minDay: 2,
      build: () => ({
        title: 'Ý tưởng nảy ra trong lúc tắm',
        description: 'Bạn nghĩ ra một sản phẩm nhỏ mà thật sự muốn làm. Ý tưởng kiểu này thường chết nếu không được làm ngay hôm nay.',
        choices: [
          c('start', 'Bắt tay làm ngay (2h)', 2, { mental: 8, willpower: -8, energy: -10, dopamine: 6 }, 'Hai tiếng trôi qua như hai phút. Bạn có trang đầu tiên và một cảm giác lâu lắm mới có lại.'),
          c('note', 'Ghi lại để sau (0.25h)', 0.25, { mental: 2 }, 'Bạn gõ vài dòng vào ghi chú. Ý tưởng được giữ lại, cơn hứng khởi thì không.'),
          c('drop', '"Chắc không ai cần đâu" (0h)', 0, { mental: -3, willpower: -2 }, 'Bạn gạt ý tưởng đi. Nó biến mất nhẹ nhàng như chưa từng có.'),
        ],
      }),
    },
    {
      id: 'project:2',
      minDay: 4,
      build: (log) => {
        if (chose(log, 'project:1', 'start')) {
          return {
            title: 'Bản đầu tiên bị lỗi',
            description: 'Bản thử chạy được một nửa. Một người bạn góp ý thẳng: "Phần chính chưa dùng được."',
            choices: [
              c('push', 'Thức sửa đến khi chạy được (3h)', 3, { mental: -8, energy: -18, willpower: -8, dopamine: 8 }, 'Gần nửa đêm, dòng chữ "Hoạt động" cuối cùng hiện lên. Mệt, nhưng đáng.'),
              c('ask', 'Hỏi một người có kinh nghiệm (1h)', 1, { mental: 6, social: 8, willpower: -3, energy: -5 }, 'Một cuộc gọi một tiếng đỡ mất ba ngày mò mẫm.'),
              c('pause', 'Tạm gác lại (0h)', 0, { mental: -4, willpower: 2 }, 'Bạn đóng máy, tự nhủ sẽ quay lại. Cảm giác dang dở bám theo cả buổi tối.'),
            ],
          };
        }
        if (chose(log, 'project:1', 'note')) {
          return {
            title: 'Ghi chú nằm im',
            description: 'Bạn mở lại ghi chú cũ. Ý tưởng vẫn còn đó, nhưng cảm giác háo hức đã nguội bớt.',
            choices: [
              c('restart', 'Bắt đầu lại từ đầu (2h)', 2, { mental: 4, willpower: -8, energy: -10 }, 'Khó hơn lúc đầu một chút, nhưng bạn đã bắt đầu rồi.'),
              c('leave', 'Để đó thêm một thời gian (0h)', 0, { mental: -2 }, 'Bạn đóng ghi chú. Nó sẽ nằm đó thêm một thời gian nữa.'),
            ],
          };
        }
        return {
          title: 'Có người làm đúng ý tưởng đó',
          description: 'Bạn thấy một sản phẩm giống hệt ý tưởng đã bỏ đang được khen trên mạng.',
          choices: [
            c('learn', 'Phân tích xem họ làm khác gì (1h)', 1, { mental: 3, willpower: -3, energy: -4 }, 'Hóa ra họ không thông minh hơn bạn, chỉ bắt đầu sớm hơn.'),
            c('closetab', 'Đóng tab, lướt chuyện khác (0h)', 0, { mental: -8, dopamine: 6, willpower: -3 }, 'Cảm giác tiếc nuối chìm xuống, và bạn tự dối rằng mình không để ý.'),
          ],
        };
      },
    },
    {
      id: 'project:3',
      minDay: 6,
      build: (log) => {
        const out = projectOutcome(log);
        if (out === 'launched') {
          return {
            title: 'Ngày ra mắt',
            description: 'Bạn bấm xuất bản. Hai mươi người dùng đầu tiên, vài lời góp ý và một tin nhắn: "Cảm ơn, cái này giúp mình thật."',
            choices: [
              c('share', 'Chia sẻ rộng hơn (1.5h)', 1.5, { social: 12, dopamine: 12, mental: 8, energy: -8 }, 'Lượt người dùng tăng lên từng chút một. Mỗi thông báo mới là một liều nhỏ tự hào.'),
              c('polish', 'Ngồi sửa theo góp ý (2h)', 2, { mental: 6, willpower: -6, energy: -10, money: 150 }, 'Một người dùng đề nghị trả phí cho bản nâng cao. Số tiền đầu tiên bạn kiếm bằng thứ do mình tạo ra.'),
            ],
          };
        }
        if (out === 'prototype') {
          return {
            title: 'Bản chạy được, chưa ai biết',
            description: 'Bạn có một bản thử chạy được. Chưa ai biết đến, nhưng nó nằm trong máy bạn thật.',
            choices: [
              c('showfriend', 'Cho một người bạn dùng thử (1h)', 1, { social: 8, mental: 5, willpower: -3 }, 'Bạn của bạn dùng thử rồi hỏi: "Cái này cậu tự làm thật à?" Câu hỏi đó đáng giá hơn cả lời khen.'),
              c('keep', 'Tiếp tục tự làm một mình (1h)', 1, { mental: 3, energy: -6 }, 'Bạn thêm một chức năng nhỏ. Không ai thấy, nhưng bạn biết.'),
            ],
          };
        }
        return {
          title: 'Thư mục "Ý tưởng"',
          description: 'Có những ý tưởng không thất bại, chúng chỉ đơn giản là không bao giờ được thử.',
          choices: [
            c('reopen', 'Mở lại và viết dòng đầu tiên (1h)', 1, { mental: 5, willpower: -5, energy: -4 }, 'Dòng đầu tiên luôn là dòng khó nhất. Bạn đã viết nó.'),
            c('closefolder', 'Đóng thư mục (0h)', 0, { mental: -3 }, 'Bạn đóng thư mục. Nó vẫn ở đó, chờ một lần tắm nào đó.'),
          ],
        };
      },
    },
  ],
};

// ───────────────────────── 3. Cơ thể lên tiếng ─────────────────────────

const healthOutcome = (log: StoryLog): string => {
  const rested = chose(log, 'health:1', 'rest');
  if (rested && chose(log, 'health:2', 'stretch')) return 'healthy';
  if (!rested && chose(log, 'health:2', 'pain')) return 'crash';
  return 'warning';
};

const HEALTH: Storyline = {
  id: 'health',
  emoji: '🩺',
  title: 'Cơ thể lên tiếng',
  blurb: 'Một cơn đau đầu âm ỉ sau mắt.',
  outcome: healthOutcome,
  epilogues: {
    healthy: { title: 'Cơ thể được lắng nghe', text: 'Bạn dừng lại khi cơ thể mới thì thầm, nên nó không phải hét lên. Chăm sóc sớm luôn rẻ hơn chữa muộn.' },
    warning: { title: 'Lời nhắc đã được ghi nhận', text: 'Bạn đã nhận ra các dấu hiệu, dù chưa thay đổi hết. Cơ thể kiên nhẫn, nhưng không vô hạn.' },
    crash: { title: 'Khi cơ thể phải hét lên', text: 'Cơ thể nhắc bạn ba lần và bạn bỏ qua cả ba. Lần thứ tư không còn là lời nhắc nữa.' },
  },
  beats: [
    {
      id: 'health:1',
      minDay: 2,
      build: () => ({
        title: 'Đau đầu âm ỉ',
        description: 'Từ sáng tới giờ có một cơn đau đầu âm ỉ phía sau mắt. Có lẽ do thiếu ngủ và nhìn màn hình quá lâu.',
        choices: [
          c('rest', 'Nghỉ ngơi, uống nước, tắt màn hình (1.5h)', 1.5, { energy: 8, mental: 6, dopamine: -3 }, 'Sau một tiếng rưỡi, cơn đau đã nhạt đi. Hóa ra không cần thuốc.'),
          c('caffeine', 'Uống thêm cà phê cho tỉnh (0.25h)', 0.25, { energy: 10, mental: -4, money: -30, dopamine: 6 }, 'Cơn đau lùi lại, nhưng tim đập nhanh hơn một chút.'),
          c('ignore', 'Kệ, làm tiếp (0h)', 0, { mental: -3, energy: -4 }, 'Bạn gồng qua buổi chiều. Cơn đau không đi đâu cả, nó chỉ chờ.'),
        ],
      }),
    },
    {
      id: 'health:2',
      minDay: 4,
      build: (log) => {
        if (chose(log, 'health:1', 'rest')) {
          return {
            title: 'Đầu đã bớt đau',
            description: 'Cơn đau đã nhẹ, nhưng bạn nhận ra mình hay quên uống nước và ngồi liền hàng giờ trước màn hình.',
            choices: [
              c('stretch', 'Đặt báo thức đứng dậy mỗi giờ (0.25h)', 0.25, { energy: 5, mental: 3, willpower: -2 }, 'Chuông reo, bạn đứng lên, vươn vai, rót một cốc nước. Rẻ như thế mà hiệu quả.'),
              c('same', 'Quay lại thói quen cũ (0h)', 0, { mental: -1 }, 'Bạn quên mất lời tự nhủ ngay trong buổi chiều.'),
            ],
          };
        }
        return {
          title: 'Cơn đau quay lại mạnh hơn',
          description: 'Cơn đau đầu quay lại, kèm chóng mặt mỗi khi đứng lên nhanh. Cơ thể đang cố nói điều gì đó.',
          choices: [
            c('doctor', 'Đi khám sớm (2h, -150k)', 2, { mental: 6, energy: -4, money: -150 }, 'Bác sĩ hỏi vài câu giản dị về giấc ngủ và màn hình, rồi lắc đầu nhẹ.'),
            c('pain', 'Uống thuốc giảm đau và tiếp tục (0.25h)', 0.25, { energy: -6, mental: -5, money: -20 }, 'Thuốc có tác dụng đủ để bạn làm tiếp. Cơn đau chỉ lùi lại một nhịp.'),
          ],
        };
      },
    },
    {
      id: 'health:3',
      minDay: 6,
      build: (log) => {
        const out = healthOutcome(log);
        if (out === 'healthy') {
          return {
            title: 'Một tuần nhẹ nhõm',
            description: 'Bạn thức dậy mà không còn đau đầu. Hóa ra cơ thể chỉ cần được lắng nghe.',
            choices: [
              c('enjoy', 'Đi dạo cho thoải mái (1h)', 1, { energy: 8, mental: 10, dopamine: 5 }, 'Buổi chiều có nắng nhẹ. Lâu lắm mới có một giờ chẳng để làm gì cả.'),
              c('keepup', 'Ghi lại những thói quen đã có ích (0.25h)', 0.25, { willpower: 6, mental: 3 }, 'Ba dòng trong ghi chú: ngủ đủ, uống nước, đứng dậy.'),
            ],
          };
        }
        if (out === 'crash') {
          return {
            title: 'Choáng giữa buổi chiều',
            description: 'Mắt bạn tối sầm khi đứng dậy. Bạn ngồi phịch xuống, tim đập nhanh. Cơ thể đã nói mấy lần, lần này nó hét lên.',
            choices: [
              c('stop', 'Dừng mọi việc, nằm nghỉ (2h)', 2, { energy: 12, mental: -4, willpower: -4 }, 'Bạn nằm im nhìn trần nhà. Có những lúc dừng lại là việc quan trọng nhất trong ngày.'),
              c('push2', 'Cố gắng làm tiếp (0.5h)', 0.5, { energy: -15, mental: -10, willpower: -6 }, 'Chữ trên màn hình nhòe đi. Bạn không đọc nổi những gì mình vừa viết.'),
            ],
          };
        }
        return {
          title: 'Một tuần cơ thể nhắc nhở',
          description: 'Cơ thể đã nhắc bạn vài lần trong tuần. Bạn biết rõ mình cần chăm sóc bản thân hơn.',
          choices: [
            c('follow', 'Bắt đầu từ tối nay (0.5h)', 0.5, { mental: 6, willpower: 3 }, 'Tắt màn hình sớm, một cốc nước ấm. Bước đầu tiên luôn nhỏ hơn mình nghĩ.'),
            c('nextweek', '"Để tuần sau" (0h)', 0, { mental: -2 }, 'Tuần sau có vẻ là một nơi rất xa.'),
          ],
        };
      },
    },
  ],
};

// ───────────────────────── 4. Chủ trọ ─────────────────────────

const landlordOutcome = (log: StoryLog): string => {
  if (chose(log, 'landlord:2', 'prepay')) return 'deal';
  if (chose(log, 'landlord:2', 'movein')) return 'moved';
  return 'steady';
};

const LANDLORD: Storyline = {
  id: 'landlord',
  emoji: '🏠',
  title: 'Chủ trọ',
  blurb: 'Tờ giấy dán trước cửa phòng.',
  outcome: landlordOutcome,
  epilogues: {
    deal: { title: 'Một thỏa thuận công bằng', text: 'Bạn dám hỏi, và người ta dám nhượng bộ. Có những khoản tiết kiệm chỉ cần một cuộc nói chuyện nghiêm túc.' },
    moved: { title: 'Một căn phòng mới', text: 'Bạn đã đổi chỗ ở để đổi nhịp sống. Không phải thay đổi nào cũng dễ, nhưng buổi sáng ở nơi mới có nắng.' },
    steady: { title: 'Con số lớn hơn trên hóa đơn', text: 'Mọi thứ vẫn như cũ, chỉ có tiền phòng là lớn hơn. Bạn bắt đầu nhìn từng khoản chi kỹ hơn.' },
  },
  beats: [
    {
      id: 'landlord:1',
      minDay: 2,
      build: () => ({
        title: 'Thông báo tăng tiền phòng',
        description: 'Chủ trọ dán một tờ giấy trước cửa: từ tuần sau tăng tiền phòng 15%.',
        choices: [
          c('accept', 'Chấp nhận, ghi nhớ chi tiêu (0h)', 0, { mental: -3, willpower: -2 }, 'Bạn chụp tờ giấy lại, tự hứa sẽ để ý chi tiêu kỹ hơn.'),
          c('negotiate', 'Gặp chủ trọ thương lượng (1h)', 1, { social: 6, mental: -2, willpower: -4, energy: -3 }, 'Chủ trọ không hứa gì, nhưng lắng nghe đến hết câu.'),
          c('search', 'Đi xem phòng khác (2h)', 2, { energy: -8, mental: -3, willpower: -4, money: -40 }, 'Bạn đi bộ qua ba con hẻm. Phòng nào cũng có thứ gì đó không ổn.'),
        ],
      }),
    },
    {
      id: 'landlord:2',
      minDay: 4,
      build: (log) => {
        if (chose(log, 'landlord:1', 'negotiate')) {
          return {
            title: 'Chủ trọ đưa điều kiện',
            description: 'Chủ trọ đồng ý giảm một nửa mức tăng nếu bạn đóng trước một tuần tiền phòng.',
            choices: [
              c('prepay', 'Đóng trước (0.25h, -600k)', 0.25, { money: -600, mental: 3 }, 'Bạn đưa tiền, chủ trọ ghi vào sổ và gật đầu. Hai bên cùng nhẹ nhõm.'),
              c('nodeal', 'Giữ nguyên, không đóng trước (0h)', 0, { mental: -2 }, 'Bạn thấy chưa cần cam kết. Mức tăng giữ nguyên như ban đầu.'),
            ],
          };
        }
        if (chose(log, 'landlord:1', 'search')) {
          return {
            title: 'Phòng mới trông ổn nhưng xa',
            description: 'Phòng mới rẻ hơn 10% nhưng xa chỗ làm thêm 25 phút mỗi chiều.',
            choices: [
              c('movein', 'Chuyển qua (3h, -300k)', 3, { money: -300, energy: -15, mental: -5, willpower: -5 }, 'Cả buổi chiều khuân đồ. Cuối ngày căn phòng mới vẫn còn mùi sơn.'),
              c('stay', 'Ở lại và chịu tăng giá (0h)', 0, { mental: -3 }, 'Bạn quyết định ở lại. Quen với một nơi đôi khi đáng giá hơn một ưu đãi.'),
            ],
          };
        }
        return {
          title: 'Chủ trọ gõ cửa',
          description: 'Chủ trọ nhờ bạn trông giúp nhà hai ngày. Đổi lại sẽ cho bạn gia hạn tiền phòng cuối tuần.',
          choices: [
            c('agree', 'Nhận lời (0.5h)', 0.5, { social: 5, willpower: -3 }, 'Bạn nhận chìa khóa. Chủ trọ cười: "Cậu là người đàng hoàng."'),
            c('refuse', 'Từ chối lịch sự (0h)', 0, { social: -2 }, 'Bạn viện lý do lịch trình. Chủ trọ gật đầu rồi đi tìm người khác.'),
          ],
        };
      },
    },
    {
      id: 'landlord:3',
      minDay: 6,
      build: (log) => {
        const out = landlordOutcome(log);
        if (out === 'deal') {
          return {
            title: 'Hợp đồng mới',
            description: 'Chủ trọ ký lại hợp đồng với mức giá đã thỏa. Có một người chủ nhà công bằng hóa ra đáng giá.',
            choices: [
              c('sign', 'Ký hợp đồng (0.25h)', 0.25, { money: 300, mental: 6, willpower: 3 }, 'Con số cuối cùng thấp hơn lo lắng ban đầu. Bạn được hoàn lại một phần.'),
              c('tea', 'Mua hộp trà cảm ơn (0.25h, -50k)', 0.25, { social: 8, mental: 4, money: -50 }, 'Chủ trọ hơi bất ngờ. Có những cử chỉ nhỏ làm quan hệ dễ chịu hơn nhiều.'),
            ],
          };
        }
        if (out === 'moved') {
          return {
            title: 'Căn phòng mới',
            description: 'Những ngày đầu ở phòng mới hơi lạ, nhưng ánh sáng buổi sáng tốt hơn hẳn.',
            choices: [
              c('settle', 'Sắp xếp lại đồ đạc (2h)', 2, { mental: 8, willpower: 4, energy: -6 }, 'Cái bàn kê cạnh cửa sổ. Một bàn làm việc có nắng làm tinh thần khác hẳn.'),
              c('explore', 'Đi dạo khu mới (1h)', 1, { social: 4, mental: 4, dopamine: 4 }, 'Quán cà phê đầu hẻm có vẻ sẽ thành quán quen.'),
            ],
          };
        }
        return {
          title: 'Hóa đơn tiền phòng',
          description: 'Mọi thứ vẫn như cũ, chỉ có con số trên hóa đơn là lớn hơn. Bạn bắt đầu để ý tới từng khoản chi.',
          choices: [
            c('budget', 'Lập bảng chi tiêu (0.5h)', 0.5, { mental: 5, willpower: 4 }, 'Hai cột đơn giản: cần và muốn. Cột "muốn" ngắn hơn bạn tưởng.'),
            c('shrug', 'Mặc kệ (0h)', 0, { mental: -2 }, 'Bạn gấp tờ hóa đơn lại. Con số vẫn nằm đó.'),
          ],
        };
      },
    },
  ],
};

export const STORYLINES: Storyline[] = [FRIEND, PROJECT, HEALTH, LANDLORD];
export const STORIES_PER_RUN = 2;
export const STORY_BEATS_PER_LINE = 3;

export const storylineById = (id: string): Storyline | undefined => STORYLINES.find((s) => s.id === id);
export const isStoryId = (id: unknown): id is string => typeof id === 'string' && STORYLINES.some((s) => s.id === id);

/** Bốc `count` mạch truyện khác nhau; mỗi mạch tiêu thụ đúng một lần rng */
export function pickStoryIds(rng: Rng, count = STORIES_PER_RUN): string[] {
  const pool = [...STORYLINES];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
  return picked;
}

const lineOfBeat = (beatId: string) => beatId.split(':')[0];
const playedCount = (log: StoryLog, storyId: string) => log.filter((e) => lineOfBeat(e.beat) === storyId).length;

export const STORY_EVENT_PREFIX = 'story:';
export const isStoryEventId = (eventId: string) => eventId.startsWith(STORY_EVENT_PREFIX);
const beatIdOfEvent = (eventId: string) => eventId.slice(STORY_EVENT_PREFIX.length);

function findBeat(beatId: string): { line: Storyline; beat: Beat } | null {
  const line = storylineById(lineOfBeat(beatId));
  const beat = line?.beats.find((b) => b.id === beatId);
  return line && beat ? { line, beat } : null;
}

/** Chương của mạch dưới dạng sự kiện để đưa vào hộp thoại sự kiện chung */
export function buildStoryEvent(beatId: string, log: StoryLog): EventPrimitive | null {
  const found = findBeat(beatId);
  if (!found) return null;
  const view = found.beat.build(log);
  return { id: STORY_EVENT_PREFIX + beatId, title: view.title, description: view.description, minDay: found.beat.minDay, choices: view.choices };
}

/** Giữa buổi (đã làm ≥3h, còn ≥4h) mới có chương mới; tối đa một chương mỗi ngày, các mạch lần lượt theo thứ tự bốc */
export const STORY_MIN_HOURS_USED = 3;
export const STORY_MAX_HOURS_USED = 20;

export function dueStoryEvent(storyIds: string[], log: StoryLog, day: number, hoursUsed: number): EventPrimitive | null {
  if (hoursUsed < STORY_MIN_HOURS_USED || hoursUsed > STORY_MAX_HOURS_USED) return null;
  if (log.some((e) => e.day === day)) return null;
  for (const id of storyIds) {
    const line = storylineById(id);
    const beat = line?.beats[playedCount(log, id)];
    if (line && beat && day >= beat.minDay) return buildStoryEvent(beat.id, log);
  }
  return null;
}

/** Áp lựa chọn của một chương: đổi chỉ số, tốn giờ, ghi vào nhật ký. null nếu id không hợp lệ. */
export function resolveStoryChoice(
  eventId: string,
  choiceId: string,
  stats: PlayerStatsPrimitive,
  log: StoryLog,
  day: number
): { newStats: PlayerStatsPrimitive; timeHours: number; log: StoryLog } | null {
  if (!isStoryEventId(eventId)) return null;
  const beatId = beatIdOfEvent(eventId);
  const ev = buildStoryEvent(beatId, log);
  const choice = ev?.choices.find((x) => x.id === choiceId);
  if (!ev || !choice) return null;
  return { newStats: applyStatDeltas(stats, choice.deltas), timeHours: choice.timeHours, log: [...log, { beat: beatId, day, choice: choiceId }] };
}

export interface StoryProgressPrimitive {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  played: number;
  total: number;
  /** Ngày sớm nhất có chương kế (null khi đã hết) */
  nextDay: number | null;
}

export function storyProgress(storyIds: string[], log: StoryLog): StoryProgressPrimitive[] {
  return storyIds.flatMap((id) => {
    const line = storylineById(id);
    if (!line) return [];
    const played = playedCount(log, id);
    return [{ id, emoji: line.emoji, title: line.title, blurb: line.blurb, played, total: line.beats.length, nextDay: line.beats[played]?.minDay ?? null }];
  });
}

export interface StoryEpiloguePrimitive {
  id: string;
  emoji: string;
  title: string;
  /** Đã chơi hết các chương */
  finished: boolean;
  headline: string;
  text: string;
}

/** Phần kết của từng mạch cho màn kết cục; mạch chưa chơi hết thì nói rõ là còn dang dở */
export function storyEpilogues(storyIds: string[], log: StoryLog): StoryEpiloguePrimitive[] {
  return storyIds.flatMap((id): StoryEpiloguePrimitive[] => {
    const line = storylineById(id);
    if (!line) return [];
    const played = playedCount(log, id);
    if (played === 0) {
      return [{ id, emoji: line.emoji, title: line.title, finished: false, headline: 'Chưa kịp bắt đầu', text: `${line.blurb} Nhưng tuần này bạn bận quá nên câu chuyện chưa bao giờ mở ra.` }];
    }
    if (played < line.beats.length) {
      return [{ id, emoji: line.emoji, title: line.title, finished: false, headline: 'Còn dang dở', text: 'Câu chuyện chưa kịp đi đến hồi kết. Có những chuyện cứ dang dở như thế.' }];
    }
    const ep = line.epilogues[line.outcome(log)];
    return ep ? [{ id, emoji: line.emoji, title: line.title, finished: true, headline: ep.title, text: ep.text }] : [];
  });
}
