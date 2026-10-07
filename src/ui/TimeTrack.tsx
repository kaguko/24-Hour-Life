import React from 'react';
import { Clock, Moon, CheckCircle2 } from 'lucide-react';

interface ActivitySegment {
  id: string;
  title: string;
  hours: number;
  timeLabel: string;
}

interface TimeTrackProps {
  hoursUsed: number;
  actionsToday: ActivitySegment[];
  onEndDayEarly: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  sleep_deep: 'bg-indigo-600 text-white',
  sleep_nap: 'bg-indigo-400 text-white',
  work_focused: 'bg-amber-600 text-white',
  work_overtime: 'bg-amber-700 text-white',
  learn_skill: 'bg-teal-600 text-white',
  exercise: 'bg-emerald-600 text-white',
  cook_healthy: 'bg-green-600 text-white',
  meditate_walk: 'bg-teal-500 text-white',
  clean_room: 'bg-slate-500 text-white',
  meet_friend: 'bg-cyan-600 text-white',
  call_family: 'bg-sky-600 text-white',
  beer_party: 'bg-rose-600 text-white',
  scroll_social: 'bg-fuchsia-600 text-white',
  binge_gaming: 'bg-purple-600 text-white',
  fast_food: 'bg-orange-500 text-white',
};

export const TimeTrack: React.FC<TimeTrackProps> = ({
  hoursUsed,
  actionsToday,
  onEndDayEarly,
}) => {
  const hoursRemaining = Math.max(0, 24 - hoursUsed);
  const percentUsed = Math.min(100, (hoursUsed / 24) * 100);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-600" />
          <span className="text-sm font-semibold text-stone-800">
            Quỹ Thời Gian 24 Giờ Trong Ngày
          </span>
          <span className="text-xs text-stone-400">·</span>
          <span className="text-xs text-stone-600">
            Đã dùng: <strong className="tabular-nums text-stone-900">{hoursUsed.toFixed(1)}h</strong> / 24h
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-stone-600">
            Còn lại: <strong className="tabular-nums text-emerald-700 text-sm">{hoursRemaining.toFixed(1)}h</strong>
          </span>

          {hoursUsed >= 16 && (
            <button
              onClick={onEndDayEarly}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Chuyển sang ngày mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="space-y-1.5">
        <div className="h-6 w-full bg-stone-100 rounded-lg overflow-hidden flex border border-stone-200/80">
          {actionsToday.map((act, idx) => {
            const widthPct = (act.hours / 24) * 100;
            const colorClass = CATEGORY_COLORS[act.id] || 'bg-stone-600 text-white';
            return (
              <div
                key={`${act.id}-${idx}`}
                style={{ width: `${widthPct}%` }}
                className={`h-full ${colorClass} flex items-center justify-center text-[10px] font-medium px-1 truncate border-r border-white/20 transition-all`}
                title={`${act.title} (${act.hours}h)`}
              >
                {widthPct > 5 && <span className="truncate">{act.title.split('(')[0]}</span>}
              </div>
            );
          })}
          {hoursRemaining > 0 && (
            <div
              style={{ width: `${(hoursRemaining / 24) * 100}%` }}
              className="h-full bg-stone-50 flex items-center justify-center text-[10px] text-stone-400 font-medium"
            >
              {hoursRemaining >= 2 && <span>{hoursRemaining.toFixed(1)}h trống</span>}
            </div>
          )}
        </div>

        {/* 24h tick marks */}
        <div className="flex justify-between text-[10px] text-stone-400 font-mono px-0.5">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      {/* Activities list for today */}
      {actionsToday.length > 0 && (
        <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1.5 text-xs">
          <span className="text-stone-400 text-xs py-0.5">Hành vi hôm nay:</span>
          {actionsToday.map((act, idx) => (
            <span
              key={`${act.id}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[11px]"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{act.title.split('(')[0].trim()}</span>
              <span className="text-stone-400 font-mono">({act.hours}h)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
