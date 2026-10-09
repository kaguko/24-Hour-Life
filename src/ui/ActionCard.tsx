import React from 'react';
import { ActionPrimitive, PlayerStatsPrimitive } from '../domain';
import { Clock, ArrowRight, AlertTriangle, Flame, Zap, Sprout } from 'lucide-react';

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

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  currentStats,
  hoursRemaining,
  onSelect,
  lockReason = null,
  habitTag = null,
}) => {
  const isAffordableTime = hoursRemaining >= action.hours && !lockReason;
  const isLowWillpower = currentStats.willpower < 35;

  // Ảo giác cám dỗ khi ý chí thấp
  const isTemptationIllusion = isLowWillpower && action.dopaminePathway === 'fast';
  const isHealthyFriction = isLowWillpower && action.dopaminePathway === 'slow' && action.willpowerCost >= 10;

  // Tính số hiển thị Dopamine (nếu có ảo giác thì phóng to)
  const baseDopamine = action.baseDopamine ?? 0;
  const displayDopamine = isTemptationIllusion
    ? baseDopamine + (action.perceivedDopamineBonus ?? 20)
    : baseDopamine;

  return (
    <div
      className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
        !isAffordableTime
          ? 'bg-stone-50/70 border-stone-200 opacity-50 grayscale-20'
          : isTemptationIllusion
          ? 'bg-gradient-to-br from-fuchsia-50 via-pink-50 to-white border-fuchsia-300 ring-2 ring-fuchsia-300/60 shadow-md scale-[1.01]'
          : isHealthyFriction
          ? 'bg-stone-50 border-stone-200/90 text-stone-600'
          : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
      }`}
    >
      <div>
        {/* Top Badges: Category & Dopamine Pathway */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-semibold text-stone-800 tabular-nums">{action.hours}h</span>
            <span>·</span>
            {action.dopaminePathway === 'fast' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
                <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                <span>Dopamine Nhanh</span>
              </span>
            ) : action.dopaminePathway === 'slow' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded">
                <Sprout className="w-2.5 h-2.5 text-emerald-600" />
                <span>Dopamine Chậm</span>
              </span>
            ) : (
              <span className="capitalize text-stone-600">
                {action.category === 'rest'
                  ? 'Nghỉ ngơi'
                  : action.category === 'work'
                  ? 'Công việc'
                  : 'Hoạt động'}
              </span>
            )}
          </div>

          {/* Cảnh báo / ảo giác */}
          {isTemptationIllusion && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-fuchsia-700 bg-fuchsia-100 px-2 py-0.5 rounded-full animate-bounce shrink-0">
              <Flame className="w-3 h-3 text-fuchsia-600 fill-fuchsia-600" />
              <span>Cực hấp dẫn!</span>
            </span>
          )}

          {isHealthyFriction && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Sức ì nỗ lực</span>
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="text-sm font-bold text-stone-900 mb-1 leading-snug">
          {action.title}
        </h4>
        {habitTag && (
          <p className={`text-[11px] font-medium mb-1 ${habitTag.startsWith('⚠️') ? 'text-amber-700' : 'text-emerald-700'}`}>{habitTag}</p>
        )}
        <p className="text-xs text-stone-600 mb-3 line-clamp-2 leading-relaxed">
          {action.description}
        </p>

        {/* Stat Changes Preview */}
        <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
          {/* Dopamine tag */}
          {displayDopamine !== 0 && (
            <span
              className={`px-1.5 py-0.5 rounded tabular-nums font-medium ${
                isTemptationIllusion
                  ? 'bg-fuchsia-200 text-fuchsia-900 font-bold text-xs ring-1 ring-fuchsia-400'
                  : action.dopaminePathway === 'fast'
                  ? 'bg-amber-100 text-amber-900'
                  : action.dopaminePathway === 'slow'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {displayDopamine > 0 ? `+${displayDopamine}` : displayDopamine} Dopamine
              {action.dopaminePathway === 'fast' ? ' ⚡' : action.dopaminePathway === 'slow' ? ' 🌱' : ''}
            </span>
          )}

          {/* Energy */}
          {action.baseEnergy !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded tabular-nums font-medium ${
                action.baseEnergy > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {action.baseEnergy > 0 ? `+${action.baseEnergy}` : action.baseEnergy} Năng lượng
            </span>
          )}

          {/* Mental */}
          {action.baseMental !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded tabular-nums font-medium ${
                action.baseMental > 0
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {action.baseMental > 0 ? `+${action.baseMental}` : action.baseMental} Tinh thần
            </span>
          )}

          {/* Social */}
          {action.baseSocial !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded tabular-nums font-medium ${
                action.baseSocial > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {action.baseSocial > 0 ? `+${action.baseSocial}` : action.baseSocial} Kết nối
            </span>
          )}

          {/* Money */}
          {action.baseMoney !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded tabular-nums font-medium ${
                action.baseMoney > 0
                  ? 'bg-teal-100 text-teal-800 font-bold'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {action.baseMoney > 0 ? `+${action.baseMoney}k` : `${action.baseMoney}k`} VNĐ
            </span>
          )}

          {/* Willpower */}
          {action.baseWillpower !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded tabular-nums font-medium ${
                action.baseWillpower > 0
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {action.baseWillpower > 0 ? `+${action.baseWillpower}` : action.baseWillpower} Ý chí
            </span>
          )}
        </div>
      </div>

      {/* Button Action */}
      <button
        disabled={!isAffordableTime}
        onClick={() => onSelect(action.id)}
        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
          !isAffordableTime
            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
            : isTemptationIllusion
            ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-xs font-bold'
            : isHealthyFriction
            ? 'bg-stone-800 hover:bg-stone-900 text-stone-100'
            : 'bg-stone-900 hover:bg-stone-800 text-white'
        }`}
      >
        <span>
          {!isAffordableTime
            ? lockReason ?? 'Không đủ thời gian'
            : isTemptationIllusion
            ? 'Lướt liền cho sướng!'
            : isHealthyFriction
            ? 'Vượt sức ì để rèn luyện'
            : 'Chọn hành vi này'}
        </span>
        {isAffordableTime && <ArrowRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
