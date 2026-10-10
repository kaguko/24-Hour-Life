import React, { useState } from 'react';
import { ActionPrimitive, PlayerStatsPrimitive, memeAction, STAT_EMOJI } from '@24h/domain';

interface ActionCardProps {
  action: ActionPrimitive;
  currentStats: PlayerStatsPrimitive;
  hoursRemaining: number;
  onSelect: (actionId: string) => void;
  /** Lý do đang bị khóa (khung giờ / ngày / số lần), null nếu làm được */
  lockReason?: string | null;
  /** Nhãn thói quen (đang tạo / đã thành nếp / đã nhờn) */
  habitTag?: string | null;
}

type StatKey = keyof typeof STAT_EMOJI;

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  currentStats,
  hoursRemaining,
  onSelect,
  lockReason = null,
  habitTag = null,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const isAffordableTime = hoursRemaining >= action.hours && !lockReason;
  const isLowWillpower = currentStats.willpower < 35;

  // Ảo giác cám dỗ khi ý chí thấp: hành vi nhanh trông hấp dẫn hơn, hành vi chậm bị sức ì
  const isTemptationIllusion = isLowWillpower && action.dopaminePathway === 'fast';
  const isHealthyFriction = isLowWillpower && action.dopaminePathway === 'slow' && action.willpowerCost >= 10;

  const meme = memeAction(action.id, action.title);
  const baseDopamine = action.baseDopamine ?? 0;
  const dopamine = isTemptationIllusion ? baseDopamine + (action.perceivedDopamineBonus ?? 20) : baseDopamine;
  const slow = action.dopaminePathway === 'slow';
  const fast = action.dopaminePathway === 'fast';

  const chips: Array<[StatKey, number | undefined, string]> = [
    ['dopamine', dopamine || undefined, ''],
    ['energy', action.baseEnergy, ''],
    ['mental', action.baseMental, ''],
    ['social', action.baseSocial, ''],
    ['willpower', action.baseWillpower, ''],
    ['money', action.baseMoney, 'k'],
  ];

  return (
    <div
      className={`group relative p-3 pt-2.5 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 overflow-hidden ${
        !isAffordableTime
          ? 'bg-white/[0.03] border-white/10 opacity-55'
          : isTemptationIllusion
          ? 'bg-gradient-to-br from-fuchsia-500/25 via-pink-500/15 to-transparent border-fuchsia-400/70 shadow-[0_0_28px_-8px_rgba(217,70,239,.8)]'
          : isHealthyFriction
          ? 'bg-white/[0.05] border-white/15'
          : 'bg-gradient-to-b from-white/[0.10] to-white/[0.04] border-white/15 hover:border-amber-300/60 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(251,191,36,.45)]'
      }`}
    >
      {/* ánh sáng nền theo loại dopamine */}
      {isAffordableTime && <div aria-hidden className={`pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-3xl opacity-40 ${fast ? 'bg-pink-500' : slow ? 'bg-emerald-400' : 'bg-indigo-400'}`} />}

      <div className="relative w-full flex items-center justify-between">
        <span className="chip tabular-nums">⏱ {action.hours}h</span>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          aria-label="Xem chi tiết"
          aria-expanded={showInfo}
          className="w-6 h-6 rounded-full text-[11px] font-bold text-[var(--ink-dim)] hover:bg-white/15 hover:text-white"
        >
          ⓘ
        </button>
      </div>

      <div className={`relative text-5xl leading-none drop-shadow-[0_6px_10px_rgba(0,0,0,.5)] transition-transform group-hover:scale-110 ${isTemptationIllusion ? 'animate-bounce' : ''}`} aria-hidden>
        {meme.e}
      </div>
      <div className="relative text-sm font-extrabold text-white leading-snug min-h-[2.5rem] flex items-center">{meme.line}</div>

      <div className="relative flex flex-wrap justify-center gap-1 text-[11px] tabular-nums font-bold">
        {chips.map(([key, value, suffix]) =>
          value ? (
            <span
              key={key}
              className={`px-1.5 py-0.5 rounded-full border ${
                value > 0 ? 'bg-emerald-400/15 border-emerald-300/30 text-emerald-200' : 'bg-rose-400/15 border-rose-300/30 text-rose-200'
              } ${key === 'dopamine' && isTemptationIllusion ? 'ring-1 ring-fuchsia-300 font-extrabold' : ''}`}
            >
              {STAT_EMOJI[key]}
              {value > 0 ? '+' : ''}
              {value}
              {suffix}
            </span>
          ) : null
        )}
      </div>

      {(habitTag || isTemptationIllusion) && (
        <div className={`relative text-[11px] font-bold ${isTemptationIllusion ? 'text-fuchsia-200' : 'text-emerald-300'}`}>{isTemptationIllusion ? '🔥 Cực cuốn!' : habitTag}</div>
      )}

      {showInfo && (
        <div className="relative text-xs text-[var(--ink-dim)] leading-snug text-left bg-black/30 border border-white/10 rounded-xl p-2.5 w-full anim-pop">
          <b className="text-white">{action.title}</b>
          <p className="mt-0.5">{action.description}</p>
          {habitTag && <p className="mt-0.5 text-emerald-300 font-semibold">{habitTag}</p>}
        </div>
      )}

      <button
        disabled={!isAffordableTime}
        onClick={() => onSelect(action.id)}
        aria-label={`Chọn hành vi này: ${action.title}`}
        className={`relative w-full py-2 rounded-xl text-sm font-extrabold transition-all active:scale-[.97] ${
          !isAffordableTime
            ? 'bg-white/8 text-[var(--ink-faint)] cursor-not-allowed text-xs font-semibold'
            : isTemptationIllusion
            ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-[0_8px_22px_-8px_rgba(217,70,239,.9)] hover:brightness-110'
            : 'btn-primary'
        }`}
      >
        {!isAffordableTime ? lockReason ?? 'Hết giờ' : isTemptationIllusion ? 'Lướt liền!' : isHealthyFriction ? 'Cố lên 💪' : 'Làm!'}
      </button>
    </div>
  );
};
