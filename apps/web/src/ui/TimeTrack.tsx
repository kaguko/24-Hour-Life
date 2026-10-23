import React from 'react';
import { Moon } from 'lucide-react';

export type SegmentKind = 'fast' | 'slow' | 'work' | 'rest' | 'other';

interface ActivitySegment {
  id: string;
  title: string;
  hours: number;
  timeLabel: string;
  kind: SegmentKind;
}

interface TimeTrackProps {
  hoursUsed: number;
  actionsToday: ActivitySegment[];
  /** Đi ngủ: ngủ hết giờ còn lại (tối đa 8 tiếng) rồi qua đêm */
  onGoToBed: () => void;
}

const WAKE_HOUR = 7;

const KIND_STYLE: Record<SegmentKind, { bar: string; chip: string; label: string }> = {
  fast: { bar: 'bg-gradient-to-b from-pink-400 to-fuchsia-600', chip: 'bg-pink-500/20 text-pink-200 border-pink-400/30', label: '⚡ Nhanh' },
  slow: { bar: 'bg-gradient-to-b from-emerald-400 to-teal-600', chip: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30', label: '🌱 Chậm' },
  work: { bar: 'bg-gradient-to-b from-amber-300 to-orange-500', chip: 'bg-amber-500/20 text-amber-200 border-amber-400/30', label: '💼 Việc' },
  rest: { bar: 'bg-gradient-to-b from-sky-400 to-indigo-600', chip: 'bg-sky-500/20 text-sky-200 border-sky-400/30', label: '😴 Nghỉ' },
  other: { bar: 'bg-gradient-to-b from-slate-300 to-slate-500', chip: 'bg-slate-500/20 text-slate-200 border-slate-400/30', label: 'Khác' },
};

const clockLabel = (hoursUsed: number) => {
  const c = WAKE_HOUR + hoursUsed;
  const h = Math.floor(c) % 24;
  const m = Math.round((c - Math.floor(c)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
};

const periodOf = (clock: number) => {
  const h = clock % 24;
  if (h >= 5 && h < 11) return { icon: '🌅', text: 'Buổi sáng' };
  if (h >= 11 && h < 14) return { icon: '☀️', text: 'Buổi trưa' };
  if (h >= 14 && h < 18) return { icon: '🌤️', text: 'Buổi chiều' };
  if (h >= 18 && h < 22) return { icon: '🌆', text: 'Buổi tối' };
  return { icon: '🌙', text: 'Đêm khuya' };
};

// Các mốc giờ dọc thanh (ngày bắt đầu 07:00 nên thanh chạy 07 → 07)
const TICKS = [0, 4, 8, 12, 16, 20, 24].map((off) => ({ off, label: `${String((WAKE_HOUR + off) % 24).padStart(2, '0')}h` }));

export const TimeTrack: React.FC<TimeTrackProps> = ({ hoursUsed, actionsToday, onGoToBed }) => {
  const hoursRemaining = Math.max(0, 24 - hoursUsed);
  const percentUsed = Math.min(100, (hoursUsed / 24) * 100);
  const period = periodOf(WAKE_HOUR + hoursUsed);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-white/10 shadow-lg p-3 sm:p-4 space-y-3">
      {/* Đồng hồ + còn lại */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl leading-none" aria-hidden>
            {period.icon}
          </span>
          <div className="leading-tight">
            <div className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight">{clockLabel(hoursUsed)}</div>
            <div className="text-[11px] text-indigo-200">{period.text}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-[11px] text-indigo-200">Còn lại</div>
            <div className="text-lg font-extrabold tabular-nums text-emerald-300">{hoursRemaining.toFixed(1)}h</div>
          </div>
          {hoursUsed >= 12 && (
            <button
              onClick={onGoToBed}
              className="px-3 py-2 text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-md ring-1 ring-white/20"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Đi ngủ ({Math.min(8, Math.floor(hoursRemaining))}h)</span>
            </button>
          )}
        </div>
      </div>

      {/* Thanh ngày: nền đổi màu theo giờ (sáng → trưa → tối → đêm), khối hành vi nổi lên trên */}
      <div className="space-y-1">
        <div
          className="relative h-9 w-full rounded-xl overflow-hidden border border-white/15"
          style={{
            background:
              'linear-gradient(90deg, #f6b57a 0%, #8fd0ff 16%, #bfe3ff 45%, #ffae78 62%, #3a2f6e 78%, #14143c 100%)',
          }}
        >
          <div className="absolute inset-0 flex">
            {actionsToday.map((act, idx) => (
              <div
                key={`${act.id}-${idx}`}
                style={{ width: `${(act.hours / 24) * 100}%` }}
                className={`h-full ${KIND_STYLE[act.kind].bar} flex items-center justify-center text-[10px] font-semibold text-white px-1 truncate border-r border-white/40 shadow-inner animate-in fade-in duration-300`}
                title={`${act.title} (${act.hours}h)`}
              >
                {(act.hours / 24) * 100 > 6 && <span className="truncate drop-shadow">{act.title.split('(')[0].trim()}</span>}
              </div>
            ))}
          </div>
          {/* Vạch "bây giờ" */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.9)] transition-[left] duration-500"
            style={{ left: `${percentUsed}%` }}
          />
        </div>
        <div className="relative h-3 text-[10px] text-indigo-200/80 font-mono">
          {TICKS.map((t) => (
            <span
              key={t.off}
              className="absolute -translate-x-1/2"
              style={{ left: `${(t.off / 24) * 100}%`, ...(t.off === 0 ? { transform: 'none' } : {}), ...(t.off === 24 ? { transform: 'translateX(-100%)' } : {}) }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Hành vi hôm nay */}
      {actionsToday.length > 0 && (
        <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto scrollbar-none gap-1.5 text-xs">
          {actionsToday.map((act, idx) => (
            <span
              key={`${act.id}-${idx}`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] whitespace-nowrap shrink-0 ${KIND_STYLE[act.kind].chip}`}
            >
              <span>{act.title.split('(')[0].trim()}</span>
              <span className="opacity-60 font-mono">{act.hours}h</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
