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

export type StoryTone = 'good' | 'mixed' | 'bad';

export interface StoryEpilogue {
  title: string;
  text: string;
  tone: StoryTone;
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
    warm: { tone: 'good', title: 'Giữ được một người bạn thật', text: 'Bạn đã có mặt đúng lúc Minh cần. Có những mối quan hệ chỉ cần một tin nhắn trả lời kịp thời để sống tiếp thêm nhiều năm.' },
    distant: { tone: 'mixed', title: 'Cánh cửa vẫn còn hé', text: 'Bạn và Minh chưa thân lại như xưa, nhưng cánh cửa vẫn còn mở. Chỉ cần một cuộc gọi nữa.' },
    lost: { tone: 'bad', title: 'Những tin nhắn không được trả lời', text: 'Bạn và Minh mất liên lạc, không có cuộc cãi vã nào, chỉ là những tin nhắn không bao giờ được trả lời.' },
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
    launched: { tone: 'good', title: 'Bấm nút xuất bản', text: 'Sản phẩm của bạn đã có người dùng thật, dù chỉ vài chục người. Khác biệt giữa "có ý tưởng" và "đã làm" nằm ở những buổi tối khó chịu nhất.' },
    prototype: { tone: 'mixed', title: 'Một bản thử nằm trong máy', text: 'Bạn có một bản thử chạy được, dù chưa ai biết. Nó chưa phải thành công, nhưng đã là một thứ thật.' },
    shelved: { tone: 'bad', title: 'Thư mục "Ý tưởng"', text: 'Ý tưởng không thất bại, nó chỉ chưa bao giờ được thử. Những dự án chết yểu thường chết vì chưa từng bắt đầu.' },
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
    healthy: { tone: 'good', title: 'Cơ thể được lắng nghe', text: 'Bạn dừng lại khi cơ thể mới thì thầm, nên nó không phải hét lên. Chăm sóc sớm luôn rẻ hơn chữa muộn.' },
    warning: { tone: 'mixed', title: 'Lời nhắc đã được ghi nhận', text: 'Bạn đã nhận ra các dấu hiệu, dù chưa thay đổi hết. Cơ thể kiên nhẫn, nhưng không vô hạn.' },
    crash: { tone: 'bad', title: 'Khi cơ thể phải hét lên', text: 'Cơ thể nhắc bạn ba lần và bạn bỏ qua cả ba. Lần thứ tư không còn là lời nhắc nữa.' },
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

/** Mức đổi tiền phòng mỗi ngày (nghìn VNĐ) so với tiền trọ gốc */
const LANDLORD_RAISE = 18;
const LANDLORD_RAISE_HALF = 9;
const LANDLORD_MOVE_SAVE = 12;

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
    deal: { tone: 'good', title: 'Một thỏa thuận công bằng', text: 'Bạn dám hỏi, và người ta dám nhượng bộ. Có những khoản tiết kiệm chỉ cần một cuộc nói chuyện nghiêm túc.' },
    moved: { tone: 'good', title: 'Một căn phòng mới', text: 'Bạn đã đổi chỗ ở để đổi nhịp sống. Không phải thay đổi nào cũng dễ, nhưng buổi sáng ở nơi mới có nắng.' },
    steady: { tone: 'mixed', title: 'Con số lớn hơn trên hóa đơn', text: 'Mọi thứ vẫn như cũ, chỉ có tiền phòng là lớn hơn. Bạn bắt đầu nhìn từng khoản chi kỹ hơn.' },
  },
  beats: [
    {
      id: 'landlord:1',
      minDay: 2,
      build: () => ({
        title: 'Thông báo tăng tiền phòng',
        description: `Chủ trọ dán một tờ giấy trước cửa: từ hôm nay tăng tiền phòng 15% (thêm ${LANDLORD_RAISE}k mỗi ngày).`,
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
            description: `Chủ trọ đồng ý giảm một nửa mức tăng (chỉ còn thêm ${LANDLORD_RAISE_HALF}k mỗi ngày) nếu bạn đóng trước một tuần tiền phòng.`,
            choices: [
              c('prepay', 'Đóng trước (0.25h, -600k)', 0.25, { money: -600, mental: 3 }, 'Bạn đưa tiền, chủ trọ ghi vào sổ và gật đầu. Hai bên cùng nhẹ nhõm.'),
              c('nodeal', 'Giữ nguyên, không đóng trước (0h)', 0, { mental: -2 }, 'Bạn thấy chưa cần cam kết. Mức tăng giữ nguyên như ban đầu.'),
            ],
          };
        }
        if (chose(log, 'landlord:1', 'search')) {
          return {
            title: 'Phòng mới trông ổn nhưng xa',
            description: `Phòng mới rẻ hơn tiền phòng cũ 10% (bớt ${LANDLORD_MOVE_SAVE}k mỗi ngày) nhưng xa chỗ làm thêm 25 phút mỗi chiều.`,
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

// ───────────────────────── 5. Bác Tư câu cá ─────────────────────────

const fisherOutcome = (log: StoryLog): string => {
  const went = chose(log, 'fisher:1', 'go');
  if (went && chose(log, 'fisher:2', ['listen', 'borrow'])) return 'mentor';
  if (went || chose(log, 'fisher:2', ['go2', 'join'])) return 'visitor';
  return 'passerby';
};

const FISHER: Storyline = {
  id: 'fisher',
  emoji: '🎣',
  title: 'Bác Tư câu cá',
  blurb: 'Một lời rủ ra bờ sông.',
  outcome: fisherOutcome,
  epilogues: {
    mentor: { tone: 'good', title: 'Có người để ngồi cùng', text: 'Bạn có thêm một người bạn không cùng tuổi nhưng cùng nhịp thở. Bờ sông giờ là nơi bạn có thể quay lại bất cứ lúc nào.' },
    visitor: { tone: 'mixed', title: 'Một buổi chiều bên sông', text: 'Bạn đã ngồi cạnh bác một buổi chiều, đủ để biết có một chỗ như thế tồn tại. Chỉ cần quay lại.' },
    passerby: { tone: 'bad', title: 'Chiếc ghế bên bờ sông', text: 'Chiếc ghế nhỏ bên bờ sông vẫn đó, nhưng người ngồi đã đi. Có những lời rủ chỉ đến một lần.' },
  },
  beats: [
    {
      id: 'fisher:1',
      minDay: 2,
      build: () => ({
        title: 'Lời rủ của bác Tư',
        description: 'Bác Tư bán nước ở đầu hẻm gọi với theo: "Chiều nay ra bờ sông ngồi với bác. Cá cắn hay không đâu có quan trọng."',
        choices: [
          c('go', 'Ra bờ sông ngồi với bác (2.5h, -20k)', 2.5, { mental: 14, social: 10, energy: -4, money: -20 }, 'Hai người ngồi im gần một tiếng. Bạn nhận ra mình lâu lắm rồi chưa ngồi im với ai.'),
          c('later', 'Hẹn bác hôm khác (0h)', 0, { social: 2 }, 'Bác cười: "Ừ, sông vẫn ở đó." Bạn tự nhủ nhất định sẽ đi.'),
          c('decline', 'Cảm ơn nhưng đang bận (0h)', 0, { social: -2, mental: -1 }, 'Bác gật đầu rồi quay lại bán nước. Bạn đi tiếp, có chút gì đó hơi lỡ.'),
        ],
      }),
    },
    {
      id: 'fisher:2',
      minDay: 4,
      build: (log) => {
        if (chose(log, 'fisher:1', 'go')) {
          return {
            title: 'Chuyện của bác Tư',
            description: 'Bác kể ngày xưa bác làm kế toán ba mươi năm, một sáng thức dậy và thấy mình chưa từng thật sự sống. Bác đưa bạn chiếc cần câu cũ.',
            choices: [
              c('listen', 'Ngồi nghe hết câu chuyện (1.5h)', 1.5, { mental: 12, social: 8, willpower: 4, energy: -2 }, 'Bác không khuyên gì cả. Nhưng câu chuyện của bác làm bạn nhìn tuần này khác đi.'),
              c('borrow', 'Mượn cần câu thử (1h)', 1, { dopamine: 8, mental: 6 }, 'Bạn quăng dây thật vụng. Cá không cắn, nhưng bạn cười nhiều hơn cả tuần.'),
              c('polite', 'Cảm ơn rồi xin phép về (0h)', 0, { mental: -1 }, 'Bạn lịch sự rút lui. Bác không phật lòng, chỉ cười hiền.'),
            ],
          };
        }
        if (chose(log, 'fisher:1', 'later')) {
          return {
            title: 'Bác Tư nhắn lại',
            description: 'Bác gửi một tin ngắn: "Chiều nay sông đẹp lắm." Không trách, không giục.',
            choices: [
              c('go2', 'Lần này đi thật (2h)', 2, { mental: 10, social: 6, energy: -3 }, 'Chỗ ngồi bên bờ sông đã được bác để sẵn một chiếc ghế nhỏ.'),
              c('again', 'Lại hẹn nữa (0h)', 0, { social: -3 }, 'Bạn hẹn hôm khác. Tin nhắn của bác dừng ở đó.'),
            ],
          };
        }
        return {
          title: 'Chiếc ghế trống bên bờ sông',
          description: 'Bạn đi ngang bờ sông và thấy bác Tư ngồi một mình với chiếc ghế nhỏ bên cạnh bỏ trống.',
          choices: [
            c('join', 'Ghé ngồi một lát (1h)', 1, { mental: 7, social: 5 }, 'Bác không hỏi vì sao bạn từ chối hôm trước. Chỉ đưa cho bạn chai nước.'),
            c('pass', 'Đi thẳng (0h)', 0, { mental: -3 }, 'Bạn bước nhanh qua. Có cảm giác bác nhìn theo, hoặc có thể là bạn tưởng thế.'),
          ],
        };
      },
    },
    {
      id: 'fisher:3',
      minDay: 6,
      build: (log) => {
        const out = fisherOutcome(log);
        if (out === 'mentor') {
          return {
            title: 'Chiếc cần câu cũ',
            description: 'Bác Tư đặt chiếc cần câu vào tay bạn: "Cho cậu. Tuần sau bác đi thăm con, cần có người giữ bờ sông."',
            choices: [
              c('accept', 'Nhận và hứa sẽ ra câu (0.5h)', 0.5, { mental: 12, social: 10, willpower: 5 }, 'Chiếc cần nhẹ hơn bạn nghĩ. Bạn cầm nó cả đường về như cầm một lời hứa.'),
              c('dinner', 'Rủ bác về nhà ăn cơm (2h, -80k)', 2, { social: 20, mental: 10, money: -80, energy: -4 }, 'Bữa cơm giản dị với một người xa lạ trở nên ấm hơn bữa nào trong tuần.'),
            ],
          };
        }
        if (out === 'visitor') {
          return {
            title: 'Bờ sông chiều thứ Bảy',
            description: 'Bác Tư vẫn ngồi đó, chiếc ghế nhỏ bên cạnh vẫn trống. Bác không nhìn lên, chỉ nói: "Nếu cậu muốn."',
            choices: [
              c('sit', 'Ngồi với bác đến tối (2h)', 2, { mental: 12, social: 8, energy: -2 }, 'Hoàng hôn xuống chậm hơn bạn nhớ. Bạn không muốn ai gọi mình về.'),
              c('wave', 'Chào bác rồi về (0h)', 0, { social: 1 }, 'Một cái vẫy tay. Bác gật đầu, và chiếc ghế nhỏ vẫn trống.'),
            ],
          };
        }
        return {
          title: 'Chiếc ghế đã dọn đi',
          description: 'Bờ sông chiều nay không còn bác Tư. Chiếc ghế nhỏ cũng biến mất. Có tin bác chuyển lên ở với con.',
          choices: [
            c('reflect', 'Đứng nhìn dòng sông một lúc (0.5h)', 0.5, { mental: -4, willpower: 3, social: 2 }, 'Dòng sông vẫn chảy như hôm trước. Chỉ là một lời rủ giờ không còn ai nói.'),
            c('scroll2', 'Mở điện thoại cho đỡ trống (1h)', 1, { dopamine: 8, mental: -4, social: -3 }, 'Một giờ trôi qua mà bạn không nhớ đã xem gì.'),
          ],
        };
      },
    },
  ],
};

// ───────────────────────── 6. Một buổi chiều yên tĩnh ─────────────────────────

const quietOutcome = (log: StoryLog): string => {
  const went = chose(log, 'quiet:1', 'go');
  if (went && chose(log, 'quiet:2', 'answer')) return 'calm';
  if (went || chose(log, 'quiet:2', ['go2', 'listen'])) return 'curious';
  return 'noise';
};

const QUIET: Storyline = {
  id: 'quiet',
  emoji: '🙏',
  title: 'Một buổi chiều yên tĩnh',
  blurb: 'Lời rủ đi chùa của người hàng xóm.',
  outcome: quietOutcome,
  epilogues: {
    calm: { tone: 'good', title: 'Tìm được một góc yên tĩnh', text: 'Bạn đã có một nơi để quay về khi đầu óc quá ồn. Không cần ở đó lâu, chỉ cần biết nó tồn tại.' },
    curious: { tone: 'mixed', title: 'Tiếng chuông vẫn còn vọng', text: 'Bạn chưa hiểu hết điều mình đã nghe, nhưng tiếng chuông vẫn còn đó khi bạn cần tới.' },
    noise: { tone: 'bad', title: 'Một tuần ồn ào', text: 'Cả tuần bạn bị thông báo kéo đi hết hướng này tới hướng khác. Sự yên tĩnh không đi tìm ai, chỉ chờ người đến.' },
  },
  beats: [
    {
      id: 'quiet:1',
      minDay: 2,
      build: () => ({
        title: 'Lời rủ của cô Hạnh',
        description: 'Cô Hạnh hàng xóm gõ cửa: "Chiều nay cô lên chùa ngồi một lát cho yên đầu óc. Con đi với cô không?"',
        choices: [
          c('go', 'Đi cùng cô (2h, -30k)', 2, { mental: 16, willpower: 6, social: 6, energy: -3, money: -30 }, 'Lên đến chùa, cô Hạnh chỉ lặng lẽ chỉ chỗ ngồi. Không ai nói gì mà bạn vẫn hiểu.'),
          c('maybe', 'Hẹn lần sau (0h)', 0, { social: 1 }, 'Cô gật đầu: "Cô còn đi mấy lần nữa." Lời hẹn nằm đó một cách thoải mái.'),
          c('refuse', 'Từ chối, bạn không thích chỗ yên tĩnh (0h)', 0, { mental: -1 }, 'Bạn viện cớ. Cô cười rồi đi, chỉ để lại mùi hương nhang thoảng qua.'),
        ],
      }),
    },
    {
      id: 'quiet:2',
      minDay: 4,
      build: (log) => {
        if (chose(log, 'quiet:1', 'go')) {
          return {
            title: 'Câu hỏi của sư cô',
            description: 'Cô Hạnh dẫn bạn gặp sư cô. Sư cô nhìn bạn một lúc rồi hỏi nhẹ: "Con đang chạy đi đâu mà vội thế?"',
            choices: [
              c('answer', 'Trả lời thật lòng (1h)', 1, { mental: 12, willpower: 6, social: 3, energy: -2 }, 'Bạn mở lời khó khăn, nhưng sau mười phút những điều mình giữ lâu nay tự nói ra.'),
              c('joke', 'Cười trừ, nói đang bận (0h)', 0, { mental: -1 }, 'Sư cô mỉm cười: "Ai cũng bận. Bận không phải câu trả lời." Bạn đỏ mặt.'),
            ],
          };
        }
        if (chose(log, 'quiet:1', 'maybe')) {
          return {
            title: 'Cô Hạnh rủ lần nữa',
            description: 'Cô Hạnh gặp bạn ở đầu hẻm: "Hôm nay cô lại đi chùa, con rảnh thì đi cùng."',
            choices: [
              c('go2', 'Lần này đi thật (2h, -30k)', 2, { mental: 14, willpower: 5, social: 5, energy: -3, money: -30 }, 'Sân chùa yên đến mức nghe được tiếng lá rơi. Bạn thấy mình thở chậm lại.'),
              c('skip', 'Lại hẹn (0h)', 0, { social: -2 }, 'Cô không hỏi thêm. Bạn bắt đầu thấy ngại khi nhìn thẳng vào mắt cô.'),
            ],
          };
        }
        return {
          title: 'Tiếng chuông vọng qua cửa sổ',
          description: 'Chiều nay gió đổi hướng, tiếng chuông chùa xa xa vọng đến tận phòng bạn.',
          choices: [
            c('listen', 'Ngồi nghe chuông (0.5h)', 0.5, { mental: 8, willpower: 3 }, 'Từng hồi chuông ngân dài. Lần đầu tiên trong tuần phòng bạn thật sự yên.'),
            c('ignore', 'Đeo tai nghe vào (0h)', 0, { dopamine: 3, mental: -2 }, 'Tiếng nhạc che lấp tiếng chuông. Bạn không nhận ra mình vừa bỏ lỡ điều gì.'),
          ],
        };
      },
    },
    {
      id: 'quiet:3',
      minDay: 6,
      build: (log) => {
        const out = quietOutcome(log);
        if (out === 'calm') {
          return {
            title: 'Cuốn sổ nhỏ',
            description: 'Sư cô đưa bạn một cuốn sổ nhỏ: "Mỗi tối viết ba điều con thấy biết ơn. Không cần dài."',
            choices: [
              c('write', 'Viết ba điều biết ơn (0.5h)', 0.5, { mental: 12, willpower: 6 }, 'Điều đầu tiên bạn viết là một chiếc ghế ở góc chùa. Điều thứ ba làm bạn dừng lại rất lâu.'),
              c('share', 'Chia sẻ với cô Hạnh (1h)', 1, { social: 14, mental: 8 }, 'Hai người ngồi đọc cho nhau nghe. Lâu lắm bạn mới thấy mình được hiểu.'),
            ],
          };
        }
        if (out === 'curious') {
          return {
            title: 'Chuông chiều thứ Bảy',
            description: 'Chiều thứ Bảy, tiếng chuông lại ngân lên. Bạn không chắc mình muốn gì, chỉ chắc là có điều gì đó đang kéo bạn lại.',
            choices: [
              c('sit', 'Đến ngồi lại một lát (1.5h)', 1.5, { mental: 12, willpower: 5, energy: -1 }, 'Không cần hiểu gì cả. Chỉ cần có mặt.'),
              c('later2', 'Để lần khác (0h)', 0, { mental: -1 }, 'Tiếng chuông tắt. Bạn tự hứa lần sau, và lần sau thường rất xa.'),
            ],
          };
        }
        return {
          title: 'Một tuần ồn ào',
          description: 'Điện thoại rung bảy mươi lần hôm nay. Bạn không nhớ nổi mình đã trả lời bao nhiêu, và cũng không nhớ mình thật sự muốn gì.',
          choices: [
            c('pause', 'Tắt thông báo một giờ (1h)', 1, { mental: 8, willpower: 4, dopamine: -2 }, 'Một giờ không có tiếng rung. Cảm giác ban đầu giống như cai nghiện, sau đó là nhẹ.'),
            c('more', 'Lướt thêm cho khuây (1h)', 1, { dopamine: 8, mental: -5 }, 'Bạn lướt thêm một giờ. Cảm giác ồn ào vẫn còn nguyên khi đặt máy xuống.'),
          ],
        };
      },
    },
  ],
};

/**
 * Mức đổi tiền trọ mỗi ngày (nghìn VNĐ, có thể âm) vào đêm của `day`, suy ra từ nhật ký mạch Chủ trọ:
 * thông báo tăng giá có hiệu lực ngay hôm đó; đóng trước tiền phòng thì chỉ còn nửa mức tăng; chuyển phòng thì rẻ hơn gốc.
 */
export function storyRentDelta(log: StoryLog, day: number): number {
  let delta = 0;
  for (const e of log) {
    if (e.day > day) continue;
    if (e.beat === 'landlord:1') delta = LANDLORD_RAISE;
    else if (e.beat === 'landlord:2' && e.choice === 'prepay') delta = LANDLORD_RAISE_HALF;
    else if (e.beat === 'landlord:2' && e.choice === 'movein') delta = -LANDLORD_MOVE_SAVE;
  }
  return delta;
}

export const STORYLINES: Storyline[] = [FRIEND, PROJECT, HEALTH, LANDLORD, FISHER, QUIET];
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
  /** Sắc thái phần kết (mạch chưa xong luôn là 'mixed') */
  tone: StoryTone;
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
      return [{ id, emoji: line.emoji, title: line.title, finished: false, tone: 'mixed', headline: 'Chưa kịp bắt đầu', text: `${line.blurb} Nhưng tuần này bạn bận quá nên câu chuyện chưa bao giờ mở ra.` }];
    }
    if (played < line.beats.length) {
      return [{ id, emoji: line.emoji, title: line.title, finished: false, tone: 'mixed', headline: 'Còn dang dở', text: 'Câu chuyện chưa kịp đi đến hồi kết. Có những chuyện cứ dang dở như thế.' }];
    }
    const ep = line.epilogues[line.outcome(log)];
    return ep ? [{ id, emoji: line.emoji, title: line.title, finished: true, tone: ep.tone, headline: ep.title, text: ep.text }] : [];
  });
}

/** Điểm cộng cho kết cục: mỗi mạch đã khép lại đẹp +4, vừa +2, buồn +0 (mạch dang dở không có điểm) */
export function storyScoreBonus(storyIds: string[], log: StoryLog): number {
  return storyEpilogues(storyIds, log).reduce((s, e) => s + (!e.finished ? 0 : e.tone === 'good' ? 4 : e.tone === 'mixed' ? 2 : 0), 0);
}

export interface StoryBadgePrimitive {
  emoji: string;
  title: string;
  tagline: string;
}

/** Danh hiệu phụ cho kết cục theo cách bạn khép các mạch truyện (null = không có gì đặc biệt) */
export function storyBadge(storyIds: string[], log: StoryLog): StoryBadgePrimitive | null {
  const eps = storyEpilogues(storyIds, log);
  if (eps.length === 0) return null;
  const finished = eps.filter((e) => e.finished);
  if (finished.length === eps.length && eps.length >= 2 && finished.every((e) => e.tone === 'good')) {
    return { emoji: '🌟', title: 'Trọn Vẹn Từng Chương', tagline: 'Các câu chuyện của bạn đều kết thúc đẹp.' };
  }
  if (finished.filter((e) => e.tone === 'bad').length >= 2) {
    return { emoji: '🍂', title: 'Những Cánh Cửa Chưa Mở', tagline: 'Tuần này bạn bỏ lỡ nhiều hơn là giữ lại.' };
  }
  if (log.length === 0) {
    return { emoji: '🔇', title: 'Bận Đến Mức Quên Sống', tagline: 'Không câu chuyện nào kịp bắt đầu.' };
  }
  return null;
}
