import React from 'react';
import { GoalResultPrimitive } from '@24h/domain';

interface GoalsPanelProps {
  goals: GoalResultPrimitive[];
}

/** Mục tiêu của tuần này: nhiệm vụ gọn, đồng bộ phong cách tối với phòng và thanh thời gian. */
export const GoalsPanel: React.FC<GoalsPanelProps> = ({ goals }) => {
  if (goals.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {goals.map((g) => {
        const done = g.state === 'done';
        const failed = g.state === 'failed';
        const ring = done ? 'ring-emerald-400/70' : failed ? 'ring-rose-400/60' : 'ring-white/10';
        const bar = done ? 'from-emerald-300 to-emerald-500' : failed ? 'from-rose-300 to-rose-500' : 'from-amber-300 to-orange-500';
        return (
          <div
            key={g.id}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3 ring-1 ${ring} shadow-md`}
            title={g.description}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none shrink-0" aria-hidden>
                {done ? '🏆' : g.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Nhiệm vụ</span>
                  <span className={`text-[11px] font-bold tabular-nums ${done ? 'text-emerald-300' : failed ? 'text-rose-300' : 'text-indigo-200'}`}>
                    {done ? 'Đang đạt ✓' : failed ? 'Hỏng' : g.label}
                  </span>
                </div>
                <div className="text-sm font-bold leading-snug truncate">{g.title}</div>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${bar} transition-[width] duration-500`}
                style={{ width: `${Math.max(3, Math.round(g.progress * 100))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
