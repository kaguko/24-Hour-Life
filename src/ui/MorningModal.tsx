import React from 'react';
import { DayGrade, NightResultPrimitive, PlayerStatsPrimitive, evaluateLifeStatus } from '../domain';
import { Lightbulb, ArrowRight, Quote, Trophy, Skull, Sparkles } from 'lucide-react';

interface MorningModalProps {
  report: NightResultPrimitive;
  /** Hạng của các ngày đã qua (gồm cả ngày vừa kết thúc) */
  dayGrades?: DayGrade[];
  onContinue: () => void;
}

/** Màu theo hạng: nền thẻ + huy hiệu */
const GRADE_STYLE: Record<DayGrade, { from: string; to: string; badge: string; label: string }> = {
  S: { from: '#065f46', to: '#0d9488', badge: 'bg-amber-300 text-amber-950', label: 'Xuất sắc' },
  A: { from: '#14532d', to: '#15803d', badge: 'bg-emerald-300 text-emerald-950', label: 'Rất tốt' },
  B: { from: '#1e3a8a', to: '#4338ca', badge: 'bg-sky-300 text-sky-950', label: 'Ổn' },
  C: { from: '#78350f', to: '#b45309', badge: 'bg-orange-300 text-orange-950', label: 'Chật vật' },
  D: { from: '#4c0519', to: '#9f1239', badge: 'bg-rose-300 text-rose-950', label: 'Tệ' },
};

const DOT_COLOR: Record<DayGrade, string> = {
  S: 'bg-amber-300 text-amber-950',
  A: 'bg-emerald-300 text-emerald-950',
  B: 'bg-sky-300 text-sky-950',
  C: 'bg-orange-300 text-orange-950',
  D: 'bg-rose-300 text-rose-950',
};

const STAT_ROWS: Array<{ key: keyof PlayerStatsPrimitive; icon: string; label: string }> = [
  { key: 'energy', icon: '⚡', label: 'Năng lượng' },
  { key: 'mental', icon: '🧠', label: 'Tinh thần' },
  { key: 'willpower', icon: '🛡️', label: 'Ý chí' },
  { key: 'social', icon: '👥', label: 'Kết nối' },
  { key: 'dopamine', icon: '✨', label: 'Dopamine' },
  { key: 'money', icon: '💰', label: 'Tiền' },
];

const fmtDelta = (k: keyof PlayerStatsPrimitive, d: number) =>
  k === 'money' ? `${d > 0 ? '+' : ''}${Math.abs(d) >= 1000 ? (d / 1000).toFixed(1) + 'tr' : d + 'k'}` : `${d > 0 ? '+' : ''}${d}`;

export const MorningModal: React.FC<MorningModalProps> = ({ report, dayGrades = [], onContinue }) => {
  // Đêm cuối (ngày 7) hoặc đã sụp đổ: nút dẫn tới màn hình kết cục thay vì "ngày tiếp theo"
  const isFinalNight = report.dayCompleted >= 7 || evaluateLifeStatus(report.newStats).isGameOver;
  const recap = report.recap;
  const gs = GRADE_STYLE[recap?.grade ?? 'B'];
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Thẻ danh hiệu của ngày */}
        <div className="p-5 text-white relative" style={{ background: `linear-gradient(135deg, ${gs.from}, ${gs.to})` }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70">
              {isFinalNight ? `KẾT THÚC NGÀY ${report.dayCompleted}` : `NGÀY ${report.dayCompleted} · TỔNG KẾT`}
            </p>
            {/* Tiến trình 7 ngày */}
            <div className="flex gap-1" aria-label="Hạng các ngày">
              {Array.from({ length: 7 }, (_, i) => {
                const g = dayGrades[i];
                return (
                  <span
                    key={i}
                    className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                      g ? DOT_COLOR[g] : 'bg-white/15 text-white/40'
                    } ${i === report.dayCompleted - 1 ? 'ring-2 ring-white' : ''}`}
                  >
                    {g ?? i + 1}
                  </span>
                );
              })}
            </div>
          </div>
          {recap ? (
            <div className="flex items-center gap-4 mt-3">
              <div className="text-5xl leading-none drop-shadow" aria-hidden>
                {recap.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">{recap.title}</h3>
                <p className="text-xs text-white/85 mt-1 leading-snug">{recap.summary}</p>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className={`w-14 h-14 rounded-2xl text-3xl font-black flex items-center justify-center shadow-lg ${gs.badge}`}>
                  {recap.grade}
                </span>
                <span className="text-[10px] font-semibold mt-1 text-white/80">{gs.label}</span>
              </div>
            </div>
          ) : (
            <h3 className="text-xl font-bold tracking-tight mt-2">Bình Minh & Những Hậu Quả Trễ Qua Đêm</h3>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {recap && (
            <>
              {/* Chỉ số thay đổi cả ngày */}
              <div className="grid grid-cols-3 gap-1.5">
                {STAT_ROWS.map((s) => {
                  const d = recap.statChanges[s.key] ?? 0;
                  const tone = d > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : d < 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-stone-500 bg-stone-50 border-stone-200';
                  return (
                    <div key={s.key} className={`rounded-xl border px-2 py-1.5 ${tone}`}>
                      <div className="text-[10px] font-medium opacity-80">
                        {s.icon} {s.label}
                      </div>
                      <div className="text-base font-extrabold tabular-nums leading-tight">
                        {d === 0 ? '±0' : fmtDelta(s.key, d)}
                        <span className="text-xs ml-0.5">{d > 0 ? '▲' : d < 0 ? '▼' : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quyết định tốt nhất / tệ nhất */}
              {(recap.best || recap.worst) && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {recap.best && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                        <Trophy className="w-3 h-3" /> Đáng giá nhất
                      </div>
                      <div className="text-xs font-semibold text-stone-900 mt-0.5">{recap.best.title}</div>
                      <div className="text-[11px] text-emerald-700">{recap.best.reason}</div>
                    </div>
                  )}
                  {recap.worst && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-800 uppercase tracking-wide">
                        <Skull className="w-3 h-3" /> Đắt giá nhất
                      </div>
                      <div className="text-xs font-semibold text-stone-900 mt-0.5">{recap.worst.title}</div>
                      <div className="text-[11px] text-rose-700">{recap.worst.reason}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Gợi ý cho ngày mai */}
              {!isFinalNight && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold text-indigo-900">Gợi ý cho ngày {report.dayCompleted + 1}</div>
                    <p className="text-xs text-indigo-900/90 leading-relaxed">{recap.tip}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Diễn biến sinh lý & tâm lý */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Diễn biến qua đêm <span className="normal-case font-medium text-stone-500">· tiền trọ -{report.rentPaid}k</span>
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
              {report.philosophicalQuote.context && (
                <p className="text-[11px] text-indigo-700/80">{report.philosophicalQuote.context}</p>
              )}
              {/* Không dùng font-serif: một số phông serif hiển thị lỗi dấu tiếng Việt khi in nghiêng */}
              <blockquote className="text-xs italic text-stone-800 leading-relaxed pl-2 border-l-2 border-indigo-400">
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
