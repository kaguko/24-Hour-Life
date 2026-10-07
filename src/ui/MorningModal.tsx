import React from 'react';
import { NightResultPrimitive, evaluateLifeStatus } from '../domain';
import { Sunrise, Lightbulb, ArrowRight, Quote } from 'lucide-react';

interface MorningModalProps {
  report: NightResultPrimitive;
  onContinue: () => void;
}

export const MorningModal: React.FC<MorningModalProps> = ({ report, onContinue }) => {
  // Đêm cuối (ngày 7) hoặc đã sụp đổ: nút dẫn tới màn hình kết cục thay vì "ngày tiếp theo"
  const isFinalNight = report.dayCompleted >= 7 || evaluateLifeStatus(report.newStats).isGameOver;
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 to-indigo-950 p-5 text-white">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold mb-1">
            <Sunrise className="w-4 h-4" />
            <span>
              {isFinalNight
                ? `KẾT THÚC NGÀY ${report.dayCompleted}`
                : `KẾT THÚC NGÀY ${report.dayCompleted} · BƯỚC VÀO NGÀY ${report.dayCompleted + 1}`}
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight">
            Bình Minh & Những Hậu Quả Trễ Qua Đêm
          </h3>
          <p className="text-xs text-stone-300 mt-1">
            Những quyết định trong 24 giờ hôm qua bắt đầu phản hồi vào cơ thể và tâm trí bạn.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Sinh hoạt phí & Ngủ */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 font-medium block">Chi phí sinh hoạt:</span>
              <span className="text-sm font-bold text-stone-900 tabular-nums">
                -{report.rentPaid}k VNĐ
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-stone-500 font-medium block">Thời gian ngủ:</span>
              <span className="text-sm font-bold text-stone-900 tabular-nums">
                {report.sleepHours}h / 7h chuẩn
              </span>
            </div>
          </div>

          {/* Diễn biến sinh lý & tâm lý */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Diễn biến sáng nay
            </h4>
            <div className="space-y-1.5">
              {report.notes.map((note, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-stone-50 rounded-lg text-xs text-stone-700 leading-relaxed flex items-start gap-2 border border-stone-200/60"
                >
                  <span className="text-indigo-600 font-bold shrink-0">·</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Triết lý vĩ nhân đúc kết sau chuỗi hành động */}
          {report.philosophicalQuote && (
            <div className="p-4 bg-gradient-to-br from-indigo-50/90 via-stone-50 to-amber-50/50 border border-indigo-200/80 rounded-xl space-y-2 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Quote className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                <span>Lời đúc kết từ vĩ nhân</span>
              </div>
              <blockquote className="text-xs italic text-stone-800 leading-relaxed font-serif pl-2 border-l-2 border-indigo-400">
                &ldquo;{report.philosophicalQuote.quote}&rdquo;
              </blockquote>
              <div className="text-[11px] text-right text-stone-600 font-medium pt-0.5">
                — <strong className="text-stone-900">{report.philosophicalQuote.author}</strong> ({report.philosophicalQuote.role})
              </div>
            </div>
          )}

          {/* Cơ chế ẩn được hé lộ (sau ngày 3-5) */}
          {report.revealedMechanics.length > 0 && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>Quy luật tâm lý được hé lộ</span>
              </div>
              {report.revealedMechanics.map((mech, idx) => (
                <p key={idx} className="text-xs text-amber-800 leading-relaxed">
                  {mech}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onContinue}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <span>{isFinalNight ? 'Xem kết cục của bạn' : `Bắt đầu ngày ${report.dayCompleted + 1}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
