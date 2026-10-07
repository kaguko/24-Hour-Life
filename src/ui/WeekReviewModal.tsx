import React, { useState } from 'react';
import { PlayerStats, DailyLog, evaluateLifeState } from '../core/stats';
import { Trophy, ArrowRight, RotateCcw, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WeekReviewModalProps {
  stats: PlayerStats;
  dailyLogs: DailyLog[];
  onRestart: () => void;
  onContinueEndless: () => void;
}

export const WeekReviewModal: React.FC<WeekReviewModalProps> = ({
  stats,
  dailyLogs,
  onRestart,
  onContinueEndless,
}) => {
  const [reflectionAnswer, setReflectionAnswer] = useState<string | null>(null);
  const lifeState = evaluateLifeState(stats);

  React.useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-indigo-950 to-stone-900 p-6 text-white text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">
            Tổng Kết Tròn 7 Ngày Cuộc Sống
          </h3>
          <p className="text-xs text-stone-300 mt-1 max-w-md mx-auto">
            Bạn đã sống trọn vẹn 168 giờ với những đánh đổi thực tế giữa công việc, sức khỏe và bẫy dopamine.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Kết quả chung */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 block">Đánh giá chung sau 1 tuần:</span>
              <span className="text-base font-bold text-stone-900">{lifeState.label}</span>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                lifeState.status === 'thriving'
                  ? 'bg-emerald-100 text-emerald-800'
                  : lifeState.status === 'stable'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {lifeState.status === 'thriving'
                ? 'Thành công vượt trội'
                : lifeState.status === 'stable'
                ? 'Sống sót bền bỉ'
                : 'Cần tái cân bằng'}
            </span>
          </div>

          {/* Bảng số liệu cuối tuần */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 bg-white rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Tài chính</span>
              <span className="text-sm font-bold text-teal-700 tabular-nums">
                {(stats.money / 1000).toFixed(1)}tr VNĐ
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Ý chí còn lại</span>
              <span className="text-sm font-bold text-indigo-700 tabular-nums">
                {stats.willpower}%
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-stone-200">
              <span className="text-stone-500 block mb-0.5">Năng lượng</span>
              <span className="text-sm font-bold text-amber-700 tabular-nums">
                {stats.energy}%
              </span>
            </div>
          </div>

          {/* Câu hỏi suy ngẫm cốt lõi của tác giả */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Câu hỏi Playtest dành riêng cho bạn:</span>
            </div>
            <p className="text-xs text-indigo-900 leading-relaxed font-medium">
              &quot;Sau khi trải nghiệm các hậu quả trễ và sự suy kiệt ý chí trong game, bạn muốn lướt mạng xã hội nhiều hơn hay ít hơn trong đời thực?&quot;
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setReflectionAnswer('less')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                  reflectionAnswer === 'less'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
                }`}
              >
                Muốn lướt ít hơn rõ rệt
              </button>
              <button
                onClick={() => setReflectionAnswer('same')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                  reflectionAnswer === 'same'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                }`}
              >
                Vẫn giữ như cũ
              </button>
            </div>

            {reflectionAnswer === 'less' && (
              <p className="text-[11px] text-emerald-800 bg-emerald-100/70 p-2 rounded-lg">
                Chúc mừng bạn đã cảm nhận được thông điệp cốt lõi của game: Dopamine rẻ tiền vay mượn khoái cảm của ngày mai với mức lãi suất cực cao.
              </p>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            onClick={onRestart}
            className="px-4 py-2 border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thử lại từ đầu</span>
          </button>
          <button
            onClick={onContinueEndless}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Tiếp tục tuần 2</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
