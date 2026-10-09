import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BigEventOutcome, BigEventState, BigEventTier, PlayerStatsPrimitive, TIER_LABEL, bigEventDef } from '../domain';

interface BigEventModalProps {
  state: BigEventState;
  outcome: BigEventOutcome;
  onContinue: () => void;
}

const TIER_STYLE: Record<BigEventTier, { emoji: string; text: string; ring: string; glow: string }> = {
  great: { emoji: '🏆', text: 'text-amber-300', ring: 'border-amber-300/60', glow: 'rgba(252,211,77,0.4)' },
  pass: { emoji: '✅', text: 'text-emerald-300', ring: 'border-emerald-300/60', glow: 'rgba(110,231,183,0.35)' },
  close: { emoji: '😬', text: 'text-orange-300', ring: 'border-orange-300/60', glow: 'rgba(253,186,116,0.35)' },
  fail: { emoji: '💥', text: 'text-rose-300', ring: 'border-rose-300/60', glow: 'rgba(253,164,175,0.35)' },
};

const STAT_LABEL: Record<keyof PlayerStatsPrimitive, string> = {
  energy: '⚡ Năng lượng',
  mental: '🧠 Tinh thần',
  willpower: '🛡️ Ý chí',
  dopamine: '✨ Dopamine',
  social: '👥 Kết nối',
  money: '💰 Tiền',
};

const fmt = (k: keyof PlayerStatsPrimitive, d: number) => (k === 'money' ? `${d > 0 ? '+' : '-'}${Math.abs(d)}k` : `${d > 0 ? '+' : ''}${d}`);

const Meter: React.FC<{ label: string; pct: number; color: string }> = ({ label, pct, color }) => (
  <div>
    <div className="flex justify-between font-label text-[11px] text-[#d8c3ad] mb-1">
      <span>{label}</span>
      <span className="tabular-nums">{pct}%</span>
    </div>
    <div className="h-2 rounded-full bg-[#363249] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  </div>
);

/** Khoảnh khắc cả tuần chuẩn bị: cho thấy bạn đã chuẩn bị ra sao, thể trạng thế nào và kết quả. */
export const BigEventModal: React.FC<BigEventModalProps> = ({ state, outcome, onContinue }) => {
  const def = bigEventDef(state.id);
  const ts = TIER_STYLE[outcome.tier];
  const deltas = (Object.entries(outcome.deltas) as Array<[keyof PlayerStatsPrimitive, number]>).filter(([, v]) => v);

  return (
    <div role="dialog" aria-modal="true" aria-label="Sự kiện lớn của tuần" className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 overflow-y-auto bg-[#0b0817]/85 backdrop-blur-md font-nocturne">
      <div
        className={`relative w-full max-w-md my-auto rounded-[1.75rem] bg-[#18132f] border ${ts.ring} p-6 text-center animate-in zoom-in-95 duration-200`}
        style={{ boxShadow: `0 0 50px -4px ${ts.glow}, 0 24px 60px -12px rgba(0,0,0,0.7)` }}
      >
        <div className="font-label text-[11px] font-bold tracking-[0.14em] uppercase text-amber-300">Sự kiện lớn của tuần</div>
        <div className="text-5xl mt-2" aria-hidden>
          {def.emoji}
        </div>
        <h3 className="font-display text-xl font-extrabold text-[#e6defd] mt-1">{def.title}</h3>
        <p className="text-xs text-[#d8c3ad] mt-1">Bạn đã chuẩn bị: {outcome.prepSummary}</p>

        <div className="mt-4 space-y-2.5 text-left">
          <Meter label="Mức chuẩn bị cho sự kiện" pct={outcome.prepPct} color="#f59e0b" />
          <Meter label="Thể trạng lúc đó (năng lượng, tinh thần, ý chí)" pct={outcome.bodyPct} color="#38bdf8" />
        </div>

        <div
          className={`mx-auto mt-5 w-28 h-28 rounded-3xl bg-[#363249] flex flex-col items-center justify-center border-2 ${ts.ring}`}
          style={{ boxShadow: `inset 0 0 18px ${ts.glow}, 0 0 24px ${ts.glow}` }}
        >
          <span className="text-4xl" aria-hidden>
            {ts.emoji}
          </span>
          <span className={`font-label text-sm font-extrabold mt-1 ${ts.text}`}>{TIER_LABEL[outcome.tier]}</span>
          <span className="font-label text-[11px] text-[#d8c3ad]">{outcome.score}/100</span>
        </div>

        <p className="text-sm text-[#e6defd] leading-relaxed mt-4">{outcome.text}</p>

        {deltas.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {deltas.map(([k, v]) => (
              <span key={k} className={`font-label text-[11px] font-bold px-2.5 py-1 rounded-full ${v > 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>
                {STAT_LABEL[k]} {fmt(k, v)}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onContinue}
          className="mt-6 w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#120e24] font-label text-sm font-bold flex items-center justify-center gap-2 active:translate-y-px transition-all"
          style={{ boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}
        >
          <span>Tiếp tục</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
