import React from 'react';
import { Zap, Sprout, Brain, Shield, Clock, Heart, Award, Sparkles } from 'lucide-react';

export const GuideModal: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview */}
      <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-stone-900">
            Khoa Học Não Bộ: Hai Con Đường Dopamine & Triết Lý Thiết Kế
          </h2>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          Dopamine không phải là &quot;hormone hạnh phúc&quot; đơn thuần, mà là <strong>phân tử của sự khao khát (craving) và động lực</strong>.
          Trong &quot;Cuộc sống 24 giờ&quot;, trò chơi mô phỏng chính xác sự giằng xé giữa hai cơ chế giải phóng dopamine trong não bộ người:
        </p>

        {/* 2 Core Pathways Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>1. Dopamine Nhanh (Fast / Cheap Dopamine)</span>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Đến từ những hoạt động mang lại phần thưởng tức thì, đòi hỏi ít hoặc không có nỗ lực. Nó tạo ra cảm giác &quot;phê&quot; ngắn nhưng tụt dốc rất nhanh (crash), khiến não bộ đòi hỏi liều kích thích cao hơn và làm cạn kiệt ý chí.
            </p>
            <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg font-medium">
              Ví dụ: Doomscrolling TikTok, cày game gacha, đồ ăn ngọt béo, mua sắm bốc đồng, nhậu đêm, caffeine ép tỉnh.
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Sprout className="w-4 h-4 text-emerald-600" />
              <span>2. Dopamine Chậm (Slow / Healthy Dopamine)</span>
            </div>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              Đến từ những nỗ lực có chủ đích, đòi hỏi thời gian, công sức và sự kiên nhẫn. Nó mang lại cảm giác thỏa mãn và tự hào sâu sắc, nâng cao ngưỡng dopamine cơ bản (baseline) và nuôi dưỡng ý chí vững bền.
            </p>
            <div className="text-[11px] text-emerald-800 bg-emerald-100/60 p-2 rounded-lg font-medium">
              Ví dụ: Chạy bộ, đi bộ phơi nắng, vuốt ve thú cưng, học đàn, trò chuyện sâu với tri kỷ, thiền định, ngủ đủ 8h.
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h3 className="text-sm font-bold text-stone-900">
            Bảng Đối Chiếu Hai Con Đường Dopamine Trong Game
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
              <tr>
                <th className="p-3">Tiêu chí</th>
                <th className="p-3 text-amber-800">Dopamine Nhanh (Fast)</th>
                <th className="p-3 text-emerald-800">Dopamine Chậm (Slow)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="p-3 font-semibold text-stone-900">Nỗ lực ban đầu</td>
                <td className="p-3 text-stone-600">Gần như bằng 0 (quẹt ngón tay, mở app, gọi đồ ăn)</td>
                <td className="p-3 text-stone-600">Cần vượt qua sức ì tâm lý và tính kỷ luật</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-stone-900">Thời gian nhận thưởng</td>
                <td className="p-3 text-stone-600">Tức thì trong vài giây</td>
                <td className="p-3 text-stone-600">Chậm, tích lũy sau 20 phút đến vài tiếng</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-stone-900">Ảnh hưởng hôm sau</td>
                <td className="p-3 text-rose-700 font-medium">
                  Trống rỗng, tụt dốc cảm xúc (Crash), uể oải, mất tập trung
                </td>
                <td className="p-3 text-emerald-700 font-medium">
                  Tâm trí sảng khoái, tăng năng lượng, ý chí hồi phục vững chãi
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-stone-900">Khi Ý chí thấp (&lt;35%)</td>
                <td className="p-3 text-amber-700 font-semibold">
                  Phóng đại ảo giác: Trông hấp dẫn gấp đôi, cực kỳ khó cưỡng lại
                </td>
                <td className="p-3 text-stone-500">
                  Bị não bộ phản kháng, đòi hỏi trả thêm chi phí ý chí để bắt đầu
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4 Nhóm Nguồn Kích Thích Chi Tiết */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Vận Động & Thể Chất Lành Mạnh
            </h4>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Các bài tập aerobic như chạy bộ kích hoạt cơ chế giải phóng dopamine và beta-endorphin tự nhiên. Thậm chí chỉ cần đi bộ 20 phút dưới ánh nắng mặt trời buổi sáng cũng giúp tái thiết lập nhịp sinh học và tạo ra &quot;bữa tiệc dopamine&quot; nhẹ nhàng cho hệ thần kinh.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Gắn Kết & Dinh Dưỡng Tyrosine
            </h4>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Khoa học chứng minh việc vuốt ve thú cưng, trò chuyện chất lượng với bạn bè và ăn thực phẩm giàu axit amin tyrosine (thịt gà, trứng, bơ, chuối, hạt) cung cấp nguyên liệu tự nhiên để não bộ sản sinh dopamine bền vững mà không gây chai lì thụ thể.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Mạng Xã Hội & Cạm Bẫy Doomscrolling
            </h4>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Các thuật toán video ngắn vận hành dựa trên cơ chế phần thưởng biến đổi không thể đoán trước (như máy đánh bạc gacha). Mỗi lần cuộn là một vé số dopamine mới, khiến não bộ bị giam cầm trong vòng lặp vô tận nhưng không hề mang lại giá trị thật.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Giấc Ngủ: Nhà Máy Tái Tạo Thụ Thể D2
            </h4>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Chỉ khi bạn ngủ đủ 7-8 tiếng, các thụ thể dopamine mới có cơ hội tự phục hồi độ nhạy bén. Thiếu ngủ liên tục làm thụ thể bị thoái hóa, khiến bạn luôn trong trạng thái &quot;đói kích thích&quot; và dễ sa vào các thói quen xấu vào ngày hôm sau.
          </p>
        </div>
      </div>

      {/* Phân tích trường hợp đặc biệt: Học tập, Kỹ năng mềm & Chọc chó */}
      <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
        <h3 className="text-sm font-bold text-stone-900">
          🔍 Nghiên Cứu Tình Huống: Học Tập, Kỹ Năng Mềm và Trò Nghịch &quot;Chọc Chó&quot;
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
          <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-indigo-900 flex items-center gap-1">
              <span>📚 Học Tập Chuyên Môn</span>
            </div>
            <p className="text-stone-600 text-[11px]">
              <strong>Dopamine Chậm đỉnh cao:</strong> Tiêu hao năng lượng trí não và đòi hỏi ý chí cao. Tuy nhiên khi vượt qua ngưỡng kháng cự ban đầu, bạn đạt trạng thái <em>Dòng Chảy (Flow State)</em>, tạo ra sự tự tin vững chắc và gia tăng năng lực kinh tế dài hạn.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-emerald-900 flex items-center gap-1">
              <span>🤝 Luyện Kỹ Năng Mềm (EQ)</span>
            </div>
            <p className="text-stone-600 text-[11px]">
              <strong>Dopamine Chậm + Vốn Xã Hội:</strong> Thực hành giao tiếp, đàm phán và kiểm soát cảm xúc giúp tăng vọt chỉ số Kết Nối (+30). Kỹ năng mềm giúp bảo vệ bạn trước các áp lực cuộc sống và giảm mâu thuẫn trong các sự kiện ngẫu nhiên.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-rose-900 flex items-center gap-1">
              <span>🐕 Nghịch Dại: &quot;Chọc Chó&quot;</span>
            </div>
            <p className="text-stone-600 text-[11px]">
              <strong>Bẫy Dopamine Nhanh + Adrenaline:</strong> Tại sao con người lại thích nghịch dại? Vì não bộ bị kích động bởi sự hồi hộp và phần thưởng thoát hiểm tức thì! Nhưng rủi ro thực tế rất đắt: 55% bị rượt rơi dép mất sức, 25% bị cắn tốn 600k tiêm phòng dại!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
