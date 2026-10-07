import React from 'react';
import { Shield, Sparkles, Clock, AlertCircle, Heart, DollarSign } from 'lucide-react';

export const GuideModal: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview */}
      <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <h2 className="text-lg font-bold text-stone-900">
          Nguyên Lý Thiết Kế & Hướng Dẫn: &quot;Cuộc Sống 24 Giờ&quot;
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          Game không dạy bạn đạo lý hay bắt bạn sống như một cỗ máy. Game đưa bạn vào một môi trường
          mô phỏng chân thực: Bạn có 24 giờ mỗi ngày, đối mặt với các áp lực sinh hoạt, deadline và những
          cơn thèm dopamine ngắn hạn của não bộ.
        </p>
      </div>

      {/* 6 Stats Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-sm font-bold text-stone-900">Ý Chí (Willpower) - Cơ Chế Cốt Lõi Mới</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Ý chí là nguồn tài nguyên có hạn tiêu hao khi bạn làm việc, tập thể dục hoặc cưỡng lại cám dỗ.
            <strong> Khi Ý chí dưới 35%: </strong> Não bạn rơi vào trạng thái &quot;đói khoái cảm&quot;. Lúc này,
            các hành vi xấu (lướt TikTok, chơi game) sẽ được hiển thị to hơn, sáng hơn và hấp dẫn hơn,
            trong khi các việc tốt sẽ bị cản trở bởi sức ì tâm lý lớn!
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-sm font-bold text-stone-900">Dopamine & Cơn Sụp Đổ Cảm Xúc (Crash)</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Dopamine không phải là kẻ thù, nhưng dopamine rẻ tiền (từ video ngắn, thức ăn nhanh) làm tăng
            ngưỡng kích thích của não. Nếu bạn dồn dopamine lên quá cao trong ngày hôm trước, sáng hôm sau
            bạn sẽ hứng chịu hậu quả trễ: Trống rỗng, mất động lực và thèm lướt điện thoại ngay khi mở mắt.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-sm font-bold text-stone-900">Năng Lượng & Nợ Ngủ Lũy Kế</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Chuẩn mực sinh học là 7-8 giờ ngủ sâu mỗi ngày. Thiếu ngủ 1-2 tiếng trông có vẻ vô hại trong
            ngắn hạn, nhưng nợ ngủ sẽ tích lũy ngầm. Khi nợ ngủ vượt quá 6 giờ, bạn bị sương mù não (Brain
            Fog), giảm mạnh hiệu suất và năng lượng phục hồi.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-sm font-bold text-stone-900">Tài Chính & Áp Lực Sinh Hoạt</h3>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Mỗi đêm chuyển ngày, hệ thống tự động trừ tiền thuê trọ và sinh hoạt cố định (-120k VNĐ).
            Nếu bạn chỉ lo nghỉ ngơi hoặc tiệc tùng mà không làm việc tạo thu nhập, tài khoản sẽ âm, gây
            căng thẳng cực độ và dẫn tới thua cuộc (Bankrupt).
          </p>
        </div>
      </div>

      {/* Triết lý làm game */}
      <div className="p-5 bg-stone-100 rounded-2xl space-y-2 text-stone-800">
        <h3 className="text-sm font-bold">Triết lý thiết kế: Không phán xét, chỉ có nhân quả</h3>
        <p className="text-xs text-stone-600 leading-relaxed">
          Game không dùng những thủ thuật giữ chân gây nghiện như thông báo đẩy, chuỗi streak vô nghĩa hay
          quảng cáo đổi năng lượng. Thông điệp duy nhất là giúp người chơi tự nhận diện khoảnh khắc:
          &quot;Ơ, mình vừa chọn một quyết định tưởng như nhỏ nhặt, nhưng cái giá phải trả vào ngày mai lại lớn đến vậy!&quot;
        </p>
      </div>
    </div>
  );
};
