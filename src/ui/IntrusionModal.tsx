import React from 'react';
import { IntrusionDef, resistCost } from '../domain';

interface IntrusionModalProps {
  def: IntrusionDef;
  /** 0 = lời mời đầu tiên; mỗi lần chiều theo thì tăng thêm 1 */
  round: number;
  /** Số lần đã chiều theo trong chuỗi này */
  chunks: number;
  hoursSpent: number;
  willpower: number;
  /** Lời nhắn sau lần cố dừng thất bại */
  note: string | null;
  onAnswer: (choice: 'resist' | 'yield') => void;
}

/**
 * Cám dỗ xâm nhập: nút "chiều theo" luôn to và hấp dẫn hơn nút cưỡng lại,
 * và cưỡng lại càng khó sau mỗi lần chiều. Ý chí cạn thì không dừng nổi.
 */
export const IntrusionModal: React.FC<IntrusionModalProps> = ({ def, round, chunks, hoursSpent, willpower, note, onAnswer }) => {
  const cost = resistCost(round);
  const canResist = willpower >= cost;
  const pct = Math.max(0, Math.min(100, willpower));
  const costPct = Math.min(100, cost);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0b0817]/85 backdrop-blur-md font-nocturne">
      <div aria-hidden className="pointer-events-none absolute inset-0 animate-pulse" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(236,72,153,0.22), transparent 60%)' }} />
      <div
        className="relative w-full max-w-md rounded-[1.75rem] bg-[#18132f] border border-pink-400/40 p-6 text-center animate-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 44px -4px rgba(236,72,153,0.45), 0 24px 60px -12px rgba(0,0,0,0.7)' }}
      >
        <div className="font-label text-[11px] font-bold tracking-[0.14em] uppercase text-pink-300">
          {chunks === 0 ? 'Cám dỗ tìm đến bạn' : `Bạn đã mất ${hoursSpent}h`}
        </div>
        <div className="text-6xl my-3 select-none" aria-hidden style={{ animation: 'intrusion-shake 0.6s ease-in-out infinite' }}>
          {def.emoji}
        </div>
        <h3 className="font-display text-xl font-extrabold text-[#e6defd]">{round === 0 ? def.title : `${def.title} · lần ${chunks + 1}`}</h3>
        <p className="text-sm text-[#d8c3ad] leading-relaxed mt-1.5">{round === 0 ? def.prompt : def.againPrompt}</p>

        {/* Thanh ý chí và mức cần để cưỡng lại */}
        <div className="mt-4 text-left">
          <div className="flex items-center justify-between font-label text-[11px] text-[#d8c3ad] mb-1">
            <span>🛡️ Ý chí của bạn</span>
            <span className={canResist ? 'text-emerald-300' : 'text-rose-300'}>
              {Math.round(willpower)} / cần {cost}
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-[#363249] overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${canResist ? 'bg-sky-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${costPct}%` }} aria-hidden />
          </div>
        </div>

        {note && <p className="mt-3 text-xs text-rose-300 leading-relaxed">{note}</p>}

        <div className="mt-5 space-y-2">
          <button
            onClick={() => onAnswer('yield')}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white font-label text-sm font-bold active:translate-y-px transition-all"
            style={{ boxShadow: '0 0 20px rgba(236,72,153,0.5)' }}
          >
            {round === 0 ? def.yieldLabel : def.againLabel}
          </button>
          <button
            onClick={() => onAnswer('resist')}
            className={`w-full py-2 rounded-full text-xs font-semibold border transition-colors ${
              canResist
                ? 'border-emerald-300/50 text-emerald-200 hover:bg-emerald-400/10'
                : 'border-white/10 text-[#d8c3ad]/70 hover:bg-white/5'
            }`}
          >
            {canResist ? `${round === 0 ? 'Cưỡng lại' : 'Dừng lại'} (-${cost} ý chí)` : `Muốn dừng… nhưng ý chí không đủ (cần ${cost})`}
          </button>
        </div>
      </div>
    </div>
  );
};
