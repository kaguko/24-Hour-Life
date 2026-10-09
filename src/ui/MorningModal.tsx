import React from 'react';
import { DayGrade, NightResultPrimitive, PlayerStatsPrimitive, evaluateLifeStatus } from '../domain';
import { Lightbulb, ArrowRight, Quote, Trophy, Skull, Sparkles, MoonStar, Sunrise, Activity } from 'lucide-react';

/**
 * Báo cáo buổi sáng. Thiết kế từ Google Stitch ("Nocturne Hearth": nền tím than, nhấn hổ phách,
 * hồng cho dopamine nhanh, xanh ngọc cho điều bền vững), nối vào dữ liệu thật của game.
 */

interface MorningModalProps {
  report: NightResultPrimitive;
  /** Hạng của các ngày đã qua (gồm cả ngày vừa kết thúc) */
  dayGrades?: DayGrade[];
  onContinue: () => void;
}

/** Màu theo hạng trên nền tối */
const GRADE_STYLE: Record<DayGrade, { text: string; ring: string; glow: string; label: string; dot: string }> = {
  S: { text: 'text-amber-300', ring: 'border-amber-300/60', glow: 'rgba(252,211,77,0.35)', label: 'Xuất sắc', dot: 'bg-amber-300 text-amber-950' },
  A: { text: 'text-emerald-300', ring: 'border-emerald-300/60', glow: 'rgba(110,231,183,0.3)', label: 'Rất tốt', dot: 'bg-emerald-300 text-emerald-950' },
  B: { text: 'text-sky-300', ring: 'border-sky-300/60', glow: 'rgba(125,211,252,0.3)', label: 'Ổn', dot: 'bg-sky-300 text-sky-950' },
  C: { text: 'text-orange-300', ring: 'border-orange-300/60', glow: 'rgba(253,186,116,0.3)', label: 'Chật vật', dot: 'bg-orange-300 text-orange-950' },
  D: { text: 'text-rose-300', ring: 'border-rose-300/60', glow: 'rgba(253,164,175,0.3)', label: 'Tệ', dot: 'bg-rose-300 text-rose-950' },
};

const STAT_ROWS: Array<{ key: keyof PlayerStatsPrimitive; icon: string; label: string; bar: string }> = [
  { key: 'energy', icon: '⚡', label: 'Năng lượng', bar: '#f59e0b' },
  { key: 'mental', icon: '🧠', label: 'Tinh thần', bar: '#818cf8' },
  { key: 'willpower', icon: '🛡️', label: 'Ý chí', bar: '#38bdf8' },
  { key: 'dopamine', icon: '✨', label: 'Dopamine', bar: '#ec4899' },
  { key: 'social', icon: '👥', label: 'Kết nối', bar: '#10b981' },
  { key: 'money', icon: '💰', label: 'Tài chính', bar: '#fbbf24' },
];

const fmtMoney = (k: number) => (Math.abs(k) >= 1000 ? `${(k / 1000).toFixed(1)}tr` : `${k}k`);

const fmtDelta = (key: keyof PlayerStatsPrimitive, d: number) =>
  key === 'money' ? `${d > 0 ? '+' : '-'}${fmtMoney(Math.abs(d))}` : `${d > 0 ? '+' : ''}${d}`;

export const MorningModal: React.FC<MorningModalProps> = ({ report, dayGrades = [], onContinue }) => {
  // Đêm cuối (ngày 7) hoặc đã sụp đổ: nút dẫn tới màn hình kết cục thay vì "ngày tiếp theo"
  const isFinalNight = report.dayCompleted >= 7 || evaluateLifeStatus(report.newStats).isGameOver;
  const recap = report.recap;
  const grade = recap?.grade ?? 'B';
  const gs = GRADE_STYLE[grade];
  const nextDay = report.dayCompleted + 1;

  return (
    <div role="dialog" aria-modal="true" aria-label="Báo cáo buổi sáng" className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto bg-[#0b0817]/80 backdrop-blur-md font-nocturne">
      {/* Quầng sáng nền */}
      <div aria-hidden className="pointer-events-none fixed -top-32 -left-32 w-[560px] h-[560px] rounded-full bg-amber-500/10 blur-[120px]" />
      <div aria-hidden className="pointer-events-none fixed top-1/4 right-0 w-[420px] h-[420px] rounded-full bg-fuchsia-700/15 blur-[130px]" />

      <div
        className="relative w-full max-w-5xl my-auto rounded-[1.75rem] bg-[#18132f]/95 backdrop-blur-xl border border-amber-200/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 40px -6px rgba(245,158,11,0.28), 0 24px 60px -12px rgba(0,0,0,0.7)' }}
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/4 w-96 h-40 bg-gradient-to-b from-amber-400/25 to-transparent blur-2xl" />

        {/* Đầu thẻ */}
        <div className="relative p-5 sm:p-7 pb-4 border-b border-white/10 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-label text-[11px] font-semibold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full bg-[#2b273e] text-amber-300 border border-amber-300/20">
              {isFinalNight ? `Kết thúc ngày ${report.dayCompleted}` : `Ngày ${report.dayCompleted} trên 7 · Thử thách 24h`}
            </span>
            <div className="flex gap-1" aria-label="Hạng các ngày">
              {Array.from({ length: 7 }, (_, i) => {
                const g = dayGrades[i];
                return (
                  <span
                    key={i}
                    className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center font-label ${
                      g ? GRADE_STYLE[g].dot : 'bg-white/10 text-white/35'
                    } ${i === report.dayCompleted - 1 ? 'ring-2 ring-white/80' : ''}`}
                  >
                    {g ?? i + 1}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-300/30 text-amber-300 flex items-center justify-center shrink-0">
              <Sunrise className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#e6defd]">
                {isFinalNight ? `Tổng kết ngày ${report.dayCompleted}` : `Sáng ngày ${nextDay}`}
              </h2>
              <p className="text-sm text-[#d8c3ad]">
                {isFinalNight ? 'Một tuần đã khép lại, hãy xem bạn đã sống ra sao.' : 'Một ngày mới bắt đầu với những hệ quả từ đêm qua.'}
              </p>
            </div>
          </div>
        </div>

        {/* Thân thẻ: 2 cột trên máy tính */}
        <div className="p-4 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Cột trái: hạng ngày + hậu quả qua đêm */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="relative overflow-hidden rounded-3xl bg-[#211c33] border border-amber-300/25 p-5">
              <div aria-hidden className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 blur-2xl" />
              {recap ? (
                <>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <span className="font-label text-[11px] font-semibold tracking-[0.1em] uppercase text-amber-300 block mb-1">Đánh giá hôm qua</span>
                      <h3 className="font-display text-lg font-bold text-[#e6defd] leading-snug">
                        <span aria-hidden className="mr-1.5">{recap.emoji}</span>
                        {recap.title}
                      </h3>
                    </div>
                    <div
                      className={`w-20 h-20 shrink-0 rounded-2xl bg-[#363249] flex flex-col items-center justify-center border-2 ${gs.ring}`}
                      style={{ boxShadow: `inset 0 0 16px ${gs.glow}, 0 0 20px ${gs.glow}` }}
                    >
                      <span className={`font-label text-4xl font-extrabold leading-none ${gs.text}`}>{recap.grade}</span>
                      <span className={`font-label text-[10px] mt-1 opacity-80 ${gs.text}`}>{gs.label}</span>
                    </div>
                  </div>
                  <div className="mb-4 bg-[#0f0b21]/70 p-3.5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-[#d8c3ad]">Điểm tổng kết nhịp sống</span>
                      <span className="font-label font-bold text-amber-300">
                        {recap.score} <span className="font-normal text-[#d8c3ad]">/ 100</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#363249] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 via-amber-500 to-emerald-400 transition-all duration-700"
                        style={{ width: `${recap.score}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-[#e6defd]/90 italic leading-relaxed bg-[#1c182f] p-3 rounded-2xl border border-white/10">{recap.summary}</p>
                </>
              ) : (
                <h3 className="font-display text-lg font-bold text-[#e6defd]">Bình minh &amp; những hậu quả trễ qua đêm</h3>
              )}
            </div>

            <div className="rounded-3xl bg-[#211c33] border border-white/10 p-5 flex-1">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <MoonStar className="w-5 h-5 text-pink-300" />
                <h3 className="font-display text-base font-bold text-[#e6defd]">Hậu quả qua đêm</h3>
                <span className="ml-auto font-label text-[11px] text-[#d8c3ad]">Tiền trọ -{report.rentPaid}k</span>
              </div>
              <div className="space-y-2">
                {report.notes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 bg-[#0f0b21]/60 p-3 rounded-2xl border border-white/5 text-sm text-[#d8c3ad] leading-relaxed">
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-pink-400/15 text-pink-300 flex items-center justify-center font-label text-[10px] font-bold">{idx + 1}</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: chỉ số + quyết định + danh ngôn */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {recap && (
              <div className="rounded-3xl bg-[#211c33] border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-300" />
                    <h3 className="font-display text-base font-bold text-[#e6defd]">Chỉ số sinh tồn &amp; tâm lý</h3>
                  </div>
                  <span className="font-label text-[11px] text-[#d8c3ad] hidden sm:block">Biến động cả ngày</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STAT_ROWS.map((s) => {
                    const d = recap.statChanges[s.key] ?? 0;
                    const value = report.newStats[s.key];
                    const isMoney = s.key === 'money';
                    const chip =
                      d > 0 ? 'text-emerald-300 bg-emerald-400/15' : d < 0 ? 'text-rose-300 bg-rose-400/15' : 'text-[#d8c3ad] bg-white/5';
                    return (
                      <div key={s.key} className="bg-[#0f0b21]/70 p-3 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-[#e6defd]">
                            <span aria-hidden className="mr-1.5">{s.icon}</span>
                            {s.label}
                          </span>
                          <span className={`font-label text-[11px] font-bold px-2 py-0.5 rounded-full ${chip}`}>
                            {d === 0 ? '±0' : `${d > 0 ? '↑' : '↓'} ${fmtDelta(s.key, d)}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-[#d8c3ad] mb-1">
                          <span className="font-label tabular-nums">{isMoney ? `${fmtMoney(value)} VNĐ` : `${value} / 100`}</span>
                        </div>
                        {!isMoney && (
                          <div className="w-full bg-[#363249] h-2 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: s.bar }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recap && (recap.best || recap.worst) && (
              <div className="grid sm:grid-cols-2 gap-3">
                {recap.best && (
                  <div className="p-4 rounded-3xl bg-emerald-400/10 border border-emerald-300/25">
                    <div className="flex items-center gap-1.5 font-label text-[11px] font-bold tracking-wider uppercase text-emerald-300">
                      <Trophy className="w-3.5 h-3.5" /> Quyết định tốt nhất
                    </div>
                    <div className="font-display text-sm font-bold text-[#e6defd] mt-1">{recap.best.title}</div>
                    <div className="text-xs text-emerald-200/90 mt-0.5">{recap.best.reason}</div>
                  </div>
                )}
                {recap.worst && (
                  <div className="p-4 rounded-3xl bg-rose-400/10 border border-rose-300/25">
                    <div className="flex items-center gap-1.5 font-label text-[11px] font-bold tracking-wider uppercase text-rose-300">
                      <Skull className="w-3.5 h-3.5" /> Quyết định tệ nhất
                    </div>
                    <div className="font-display text-sm font-bold text-[#e6defd] mt-1">{recap.worst.title}</div>
                    <div className="text-xs text-rose-200/90 mt-0.5">{recap.worst.reason}</div>
                  </div>
                )}
              </div>
            )}

            {recap && !isFinalNight && (
              <div className="p-4 rounded-3xl bg-indigo-400/10 border border-indigo-300/25 flex gap-3">
                <Sparkles className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-label text-[11px] font-bold tracking-wider uppercase text-indigo-200">Gợi ý cho ngày {nextDay}</div>
                  <p className="text-sm text-[#e6defd]/90 leading-relaxed mt-0.5">{recap.tip}</p>
                </div>
              </div>
            )}

            {report.philosophicalQuote && (
              <div className="p-4 rounded-3xl bg-[#211c33] border border-amber-300/20 space-y-2">
                <div className="flex items-center gap-1.5 font-label text-[11px] font-bold tracking-wider uppercase text-amber-300">
                  <Quote className="w-3.5 h-3.5 fill-amber-300" />
                  Lời đúc kết từ vĩ nhân
                </div>
                {report.philosophicalQuote.context && <p className="text-xs text-[#d8c3ad]/80">{report.philosophicalQuote.context}</p>}
                {/* Không dùng serif: một số phông serif hiển thị lỗi dấu tiếng Việt khi in nghiêng */}
                <blockquote className="text-sm italic text-[#e6defd] leading-relaxed pl-3 border-l-2 border-amber-300/60">
                  &ldquo;{report.philosophicalQuote.quote}&rdquo;
                </blockquote>
                <div className="text-xs text-right text-[#d8c3ad]">
                  — <strong className="text-[#e6defd]">{report.philosophicalQuote.author}</strong> ({report.philosophicalQuote.role})
                </div>
              </div>
            )}

            {report.revealedMechanics.length > 0 && (
              <div className="p-4 rounded-3xl bg-amber-400/10 border border-amber-300/25 space-y-1.5">
                <div className="flex items-center gap-1.5 font-label text-[11px] font-bold tracking-wider uppercase text-amber-300">
                  <Lightbulb className="w-4 h-4" />
                  Quy luật tâm lý được hé lộ
                </div>
                {report.revealedMechanics.map((mech, idx) => (
                  <p key={idx} className="text-sm text-amber-100/90 leading-relaxed">
                    {mech}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nút hành động */}
        <div className="px-4 sm:px-7 py-4 border-t border-white/10 bg-[#120e24]/60 flex justify-end">
          <button
            onClick={onContinue}
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#120e24] font-label text-sm font-bold flex items-center justify-center gap-2 transition-all active:translate-y-px"
            style={{ boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}
          >
            <span>{isFinalNight ? 'Xem kết cục của bạn' : `Bắt đầu ngày ${nextDay}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
