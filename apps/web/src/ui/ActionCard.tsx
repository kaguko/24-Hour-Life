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
      className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 ${
        !isAffordableTime
          ? 'bg-stone-50/70 border-stone-200 opacity-50 grayscale'
          : isTemptationIllusion
          ? 'bg-gradient-to-br from-fuchsia-50 via-pink-50 to-white border-fuchsia-300 ring-2 ring-fuchsia-300/60 shadow-md'
          : isHealthyFriction
          ? 'bg-stone-50 border-stone-200'
          : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'
      }`}
    >
      <div className="absolute top-2 left-2.5 text-[11px] font-bold tabular-nums text-stone-500">⏱ {action.hours}h</div>
      <button
        type="button"
        onClick={() => setShowInfo((v) => !v)}
        aria-label="Xem chi tiết"
        aria-expanded={showInfo}
        className="absolute top-1.5 right-2 w-6 h-6 rounded-full text-[11px] font-bold text-stone-500 hover:bg-stone-100"
      >
        ⓘ
      </button>

      <div className={`text-5xl leading-none mt-4 ${isTemptationIllusion ? 'animate-bounce' : ''}`} aria-hidden>
        {meme.e}
      </div>
      <div className="text-sm font-extrabold text-stone-900 leading-snug min-h-[2.5rem] flex items-center">{meme.line}</div>

      <div className="flex flex-wrap justify-center gap-1 text-[11px] tabular-nums font-semibold">
        {chips.map(([key, value, suffix]) =>
          value ? (
            <span
              key={key}
              className={`px-1.5 py-0.5 rounded-full ${
                value > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              } ${key === 'dopamine' && isTemptationIllusion ? 'ring-1 ring-fuchsia-400 font-extrabold' : ''}`}
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
        <div className="text-[11px] font-semibold text-fuchsia-700">{isTemptationIllusion ? '🔥 Cực cuốn!' : habitTag}</div>
      )}

      {showInfo && (
        <div className="text-xs text-stone-600 leading-snug text-left bg-stone-50 rounded-lg p-2 w-full">
          <b>{action.title}</b>
          <p className="mt-0.5">{action.description}</p>
          {habitTag && <p className="mt-0.5 text-emerald-700 font-medium">{habitTag}</p>}
        </div>
      )}

      <button
        disabled={!isAffordableTime}
        onClick={() => onSelect(action.id)}
        aria-label={`Chọn hành vi này: ${action.title}`}
        className={`w-full py-2 rounded-xl text-sm font-extrabold transition-all ${
          !isAffordableTime
            ? 'bg-stone-200 text-stone-400 cursor-not-allowed text-xs font-semibold'
            : isTemptationIllusion
            ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white'
            : 'bg-stone-900 hover:bg-stone-800 text-white'
        }`}
      >
        {!isAffordableTime ? lockReason ?? 'Hết giờ' : isTemptationIllusion ? 'Lướt liền!' : isHealthyFriction ? 'Cố lên 💪' : 'Làm!'}
      </button>
    </div>
  );
};
