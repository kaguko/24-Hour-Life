/**
 * PURE DOMAIN: KHO TÀNG TRIẾT LÝ VĨ NHÂN (Philosophical Quotes Engine)
 * Rule 1: NO React, NO UI, NO localStorage.
 * Rule 2: Pure primitive shapes.
 */

export interface PhilosophicalQuote {
  id: string;
  quote: string;
  author: string;
  role: string;
  theme:
    | 'fast_dopamine'
    | 'slow_dopamine'
    | 'discipline_willpower'
    | 'burnout_rest'
    | 'financial_freedom'
    | 'social_connection'
    | 'folly_recklessness'
    | 'flow_study'
    | 'balance_moderation';
}

export const PHILOSOPHICAL_QUOTES: PhilosophicalQuote[] = [
  // 1. CẢNH TỈNH DOPAMINE NHANH & CÁM DỖ NGẮN HẠN
  {
    id: 'seneca_desire',
    quote: 'Kẻ nào làm nô lệ cho những dục vọng tức thời sẽ không bao giờ tìm thấy tự do đích thực.',
    author: 'Seneca',
    role: 'Triết gia Khắc Kỷ La Mã',
    theme: 'fast_dopamine',
  },
  {
    id: 'marcus_aurelius_pleasure',
    quote: 'Hãy nhớ rằng khoái cảm thoáng qua chỉ là mồi nhử; nó làm tê liệt lý trí và để lại sự trống rỗng ngay sau khi tàn lụi.',
    author: 'Marcus Aurelius',
    role: 'Hoàng đế & Triết gia La Mã',
    theme: 'fast_dopamine',
  },
  {
    id: 'schopenhauer_craving',
    quote: 'Cuộc đời như một con lắc, đung đưa qua lại giữa nỗi đau đớn và sự buồn chán vô vị một khi cơn thèm khát vừa được thỏa mãn.',
    author: 'Arthur Schopenhauer',
    role: 'Triết gia người Đức',
    theme: 'fast_dopamine',
  },
  {
    id: 'naval_dopamine',
    quote: 'Thế giới hiện đại được thiết kế để khai thác những điểm yếu sinh học của bạn. Nếu bạn không kiểm soát sự chú ý của mình, người khác sẽ kiếm tiền từ sự phân tâm của bạn.',
    author: 'Naval Ravikant',
    role: 'Nhà đầu tư & Nhà tư tưởng công nghệ',
    theme: 'fast_dopamine',
  },

  // 2. TÔN VINH DOPAMINE CHẬM, RÈN LUYỆN & KIÊN TRÌ
  {
    id: 'laozi_journey',
    quote: 'Hành trình vạn dặm bắt đầu từ một bước chân. Cây đại thụ ngút ngàn bắt đầu từ một mầm cây bé nhỏ.',
    author: 'Lão Tử',
    role: 'Triết gia Đạo gia',
    theme: 'slow_dopamine',
  },
  {
    id: 'confucius_slow_progress',
    quote: 'Không quan trọng bạn đi chậm thế nào, miễn là bạn không dừng lại.',
    author: 'Khổng Tử',
    role: 'Nhà tư tưởng Nho gia',
    theme: 'slow_dopamine',
  },
  {
    id: 'nietzsche_meaning',
    quote: 'Người có lý do để sống có thể chịu đựng được hầu hết mọi nghịch cảnh.',
    author: 'Friedrich Nietzsche',
    role: 'Triết gia người Đức',
    theme: 'slow_dopamine',
  },
  {
    id: 'james_clear_habits',
    quote: 'Bạn không vươn lên tới tầm của các mục tiêu; bạn tụt xuống mức của các hệ thống thói quen hàng ngày.',
    author: 'James Clear',
    role: 'Tác giả "Atomic Habits"',
    theme: 'discipline_willpower',
  },

  // 3. NGHỈ NGƠI & CẢNH BÁO KIỆT SỨC (BURNOUT)
  {
    id: 'socrates_busy',
    quote: 'Hãy coi chừng sự cằn cỗi của một cuộc đời quá đỗi bận rộn.',
    author: 'Socrates',
    role: 'Triết gia Hy Lạp cổ đại',
    theme: 'burnout_rest',
  },
  {
    id: 'carl_jung_hurry',
    quote: 'Hối hả không phải là một đức tính của ma quỷ; bản thân sự hối hả chính là ma quỷ.',
    author: 'Carl Jung',
    role: 'Bác sĩ tâm thần học & Nhà tâm lý',
    theme: 'burnout_rest',
  },
  {
    id: 'thich_nhat_hanh_peace',
    quote: 'Mỉm cười, thở và đi thật chậm. Bình an hiện diện trong từng hơi thở có ý thức.',
    author: 'Thích Nhất Hạnh',
    role: 'Thiền sư & Nhà hoạt động hòa bình',
    theme: 'burnout_rest',
  },

  // 4. TÀI CHÍNH & ÁP LỰC TIỀN BẠC
  {
    id: 'benjamin_franklin_debt',
    quote: 'Chạy theo những thứ phù phiếm hôm nay là cầm cố tương lai cho người khác vào ngày mai.',
    author: 'Benjamin Franklin',
    role: 'Khai quốc công thần Hoa Kỳ',
    theme: 'financial_freedom',
  },
  {
    id: 'epicurus_wealth',
    quote: 'Sự giàu có thực sự không nằm ở việc sở hữu thật nhiều của cải, mà ở việc có ít ham muốn không cần thiết.',
    author: 'Epicurus',
    role: 'Triết gia Hy Lạp cổ đại',
    theme: 'financial_freedom',
  },

  // 5. GẮN KẾT XÃ HỘI & TÌNH BẠN
  {
    id: 'aristotle_social',
    quote: 'Con người về bản chất là một sinh vật xã hội. Kẻ không thể sống trong cộng đồng hoặc là quái vật, hoặc là thần thánh.',
    author: 'Aristotle',
    role: 'Triết gia Hy Lạp cổ đại',
    theme: 'social_connection',
  },
  {
    id: 'maya_angelou_connection',
    quote: 'Mọi người sẽ quên những gì bạn nói, quên những gì bạn làm, nhưng họ sẽ không bao giờ quên cảm xúc bạn mang lại cho họ.',
    author: 'Maya Angelou',
    role: 'Nhà thơ & Nhà hoạt động nhân quyền',
    theme: 'social_connection',
  },

  // 6. NGHỊCH DẠI, BỐC ĐỒNG & CHỌC CHÓ
  {
    id: 'mark_twain_folly',
    quote: 'Đừng bao giờ tranh cãi với kẻ ngốc hoặc chọc giận một con chó dữ, kẻ ngoài cuộc sẽ không phân biệt được ai là ai.',
    author: 'Mark Twain',
    role: 'Đại văn hào người Mỹ',
    theme: 'folly_recklessness',
  },
  {
    id: 'einstein_stupidity',
    quote: 'Chỉ có hai điều là vô hạn: vũ trụ và sự ngốc nghếch của con người; nhưng về vũ trụ thì tôi chưa hoàn toàn chắc chắn.',
    author: 'Albert Einstein',
    role: 'Nhà vật lý học đoạt giải Nobel',
    theme: 'folly_recklessness',
  },
  {
    id: 'confucius_folly',
    quote: 'Người khôn ngoan học từ sai lầm của người khác. Người dại dột phải trả giá bằng xương máu của chính mình.',
    author: 'Khổng Tử',
    role: 'Nhà tư tưởng Nho gia',
    theme: 'folly_recklessness',
  },

  // 7. HỌC TẬP CHUYÊN MÔN & DÒNG CHẢY (FLOW)
  {
    id: 'da_vinci_learning',
    quote: 'Học tập là điều duy nhất mà tâm trí không bao giờ kiệt sức, không bao giờ sợ hãi và không bao giờ hối tiếc.',
    author: 'Leonardo da Vinci',
    role: 'Thiên tài toàn năng thời Phục Hưng',
    theme: 'flow_study',
  },
  {
    id: 'marie_curie_knowledge',
    quote: 'Cuộc đời không có gì đáng sợ, tất cả chỉ là để được thấu hiểu. Bây giờ là lúc cần hiểu biết nhiều hơn để bớt sợ hãi.',
    author: 'Marie Curie',
    role: 'Nhà vật lý & Hóa học đoạt 2 giải Nobel',
    theme: 'flow_study',
  },

  // 8. ĐIỀU ĐỘ & TRUNG DUNG
  {
    id: 'buddha_middle_way',
    quote: 'Dây đàn quá căng sẽ đứt, quá chùng sẽ không phát ra tiếng. Con đường trung đạo là chìa khóa của sự tự tại.',
    author: 'Đức Phật Thích Ca Mâu Ni',
    role: 'Bậc giác ngộ cổ đại',
    theme: 'balance_moderation',
  },
  {
    id: 'aristotle_golden_mean',
    quote: 'Sự vĩ đại không phải là một hành vi đơn lẻ, mà là một thói quen được tôi luyện bằng đức tính trung dung.',
    author: 'Aristotle',
    role: 'Triết gia Hy Lạp cổ đại',
    theme: 'balance_moderation',
  },
];

/**
 * Pure domain selector for contextual quote
 */
export function getContextualQuote(
  theme: PhilosophicalQuote['theme'],
  seed = Math.random()
): PhilosophicalQuote {
  const matching = PHILOSOPHICAL_QUOTES.filter((q) => q.theme === theme);
  const candidates = matching.length > 0 ? matching : PHILOSOPHICAL_QUOTES;
  const index = Math.floor(seed * candidates.length) % candidates.length;
  return candidates[index];
}
