import React, { useState } from 'react';
import { DayGrade, NightResultPrimitive, PlayerStatsPrimitive, ReactionKind, evaluateLifeStatus } from '@24h/domain';
import { ArrowRight } from 'lucide-react';
import { Sticker } from './Sticker';

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

const GRADE_REACTION: Record<DayGrade, ReactionKind> = { S: 'W', A: 'W', B: 'lockedin', C: 'cooked', D: 'L' };
const GRADE_MEME: Record<DayGrade, string> = { S: 'Goated', A: 'W đậm', B: 'Tạm ổn', C: 'Cooked nhẹ', D: 'Cooked thật' };

export const MorningModal: React.FC<MorningModalProps> = ({ report, dayGrades = [], onContinue }) => {
  const [more, setMore] = useState(false);
  // Đêm cuối (ngày 7) hoặc đã sụp đổ: nút dẫn tới màn hình kết cục thay vì "ngày tiếp theo"
  const isFinalNight = report.dayCompleted >= 7 || evaluateLifeStatus(report.newStats).isGameOver;
  const recap = report.recap;
  const grade = recap?.grade ?? 'B';
  const gs = GRADE_STYLE[grade];
  const nextDay = report.dayCompleted + 1;
  const hasMore = report.notes.length > 0 || !!report.philosophicalQuote || report.revealedMechanics.length > 0 || !!recap?.tip;

  return (
    <div role="dialog" aria-modal="true" aria-label="Báo cáo buổi sáng" className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 overflow-y-auto bg-[#0b0817]/85 backdrop-blur-md font-nocturne">
      <div
        className="relative w-full max-w-md my-auto rounded-[1.75rem] bg-[#18132f]/95 border border-amber-200/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 40px -6px rgba(245,158,11,0.28), 0 24px 60px -12px rgba(0,0,0,0.7)' }}
      >
        <div className="p-5 pb-3 text-center space-y-2">
          <div className="flex justify-center gap-1" aria-label="Hạng các ngày">
            {Array.from({ length: 7 }, (_, i) => {
              const g = dayGrades[i];
              return (
                <span
                  key={i}
                  className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center font-label ${
                    g ? GRADE_STYLE[g].dot : 'bg-white/10 text-white/35'
                  } ${i === report.dayCompleted - 1 ? 'ring-2 ring-white/80' : ''}`}
                >
                  {g ?? i + 1}
                </span>
              );
            })}
          </div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-[#e6defd]">
            {isFinalNight ? `Hết ngày ${report.dayCompleted}` : `Sáng ngày ${nextDay}`}
          </h2>
          <Sticker kind={GRADE_REACTION[grade]} seed={report.dayCompleted} size={140} caption={false} />
          <div className="flex items-center justify-center gap-3">
            <span className={`font-label text-5xl font-extrabold ${gs.text}`} style={{ textShadow: `0 0 20px ${gs.glow}` }}>
              {grade}
            </span>
            <div className="text-left leading-tight">
              <div className={`font-display text-lg font-extrabold ${gs.text}`}>{GRADE_MEME[grade]}</div>
              {recap && (
                <div className="text-sm text-[#d8c3ad]">
                  {recap.emoji} {recap.title} · {recap.score}/100
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6 chỉ số: icon + số + mũi tên */}
        {recap && (
          <div className="px-5 grid grid-cols-3 gap-2">
            {STAT_ROWS.map((s) => {
              const d = recap.statChanges[s.key] ?? 0;
              const value = report.newStats[s.key];
              const chip = d > 0 ? 'text-emerald-300' : d < 0 ? 'text-rose-300' : 'text-[#d8c3ad]';
              return (
                <div key={s.key} className="bg-[#0f0b21]/70 py-2 rounded-2xl border border-white/5 text-center">
                  <div className="text-xl" aria-label={s.label}>{s.icon}</div>
                  <div className="font-label text-sm font-bold text-[#e6defd] tabular-nums">{s.key === 'money' ? fmtMoney(value) : value}</div>
                  <div className={`font-label text-[11px] font-bold ${chip}`}>{d === 0 ? '±0' : `${d > 0 ? '↑' : '↓'}${fmtDelta(s.key, d)}`}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quyết định tốt / tệ nhất: 1 dòng mỗi cái */}
        {recap && (recap.best || recap.worst) && (
          <div className="px-5 pt-3 space-y-1.5 text-sm">
            {recap.best && (
              <div className="flex gap-2 items-center bg-emerald-400/10 border border-emerald-300/25 rounded-xl px-3 py-1.5 text-emerald-100">
                <span aria-hidden>🏆</span>
                <span className="font-semibold truncate">{recap.best.title}</span>
              </div>
            )}
            {recap.worst && (
              <div className="flex gap-2 items-center bg-rose-400/10 border border-rose-300/25 rounded-xl px-3 py-1.5 text-rose-100">
                <span aria-hidden>💀</span>
                <span className="font-semibold truncate">{recap.worst.title}</span>
              </div>
            )}
          </div>
        )}

        {report.revealedMechanics.length > 0 && !more && (
          <div className="px-5 pt-2 text-center text-xs font-bold text-amber-300">💡 Có quy luật mới vừa lộ ra, bấm "Chi tiết"</div>
        )}

        {more && (
          <div className="px-5 pt-3 space-y-2 text-sm text-[#d8c3ad] leading-relaxed">
            <div className="text-xs text-right">Tiền trọ -{report.rentPaid}k</div>
            {report.notes.map((note, idx) => (
              <div key={idx} className="bg-[#0f0b21]/60 p-2.5 rounded-xl border border-white/5">{note}</div>
            ))}
            {report.revealedMechanics.map((mech, idx) => (
              <div key={idx} className="bg-amber-400/10 p-2.5 rounded-xl border border-amber-300/25 text-amber-100">💡 {mech}</div>
            ))}
            {recap && !isFinalNight && <div className="bg-indigo-400/10 p-2.5 rounded-xl border border-indigo-300/25 text-[#e6defd]">🎯 {recap.tip}</div>}
            {report.philosophicalQuote && (
              <blockquote className="italic text-[#e6defd] pl-3 border-l-2 border-amber-300/60">
                &ldquo;{report.philosophicalQuote.quote}&rdquo; <span className="not-italic text-xs">— {report.philosophicalQuote.author}</span>
              </blockquote>
            )}
          </div>
        )}

        <div className="p-5 flex gap-2">
          {hasMore && (
            <button
              onClick={() => setMore((v) => !v)}
              aria-expanded={more}
              className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/15 text-[#e6defd] font-label text-sm font-bold"
            >
              {more ? 'Gọn lại' : 'Chi tiết'}
            </button>
          )}
          <button
            onClick={onContinue}
            className="flex-1 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#120e24] font-label text-sm font-bold flex items-center justify-center gap-2 transition-all active:translate-y-px"
            style={{ boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}
          >
            <span>{isFinalNight ? 'Xem kết cục 🎬' : `Ngày ${nextDay} thôi!`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
