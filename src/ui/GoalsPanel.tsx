import React from 'react';
import { GoalResultPrimitive } from '../domain';

interface GoalsPanelProps {
  goals: GoalResultPrimitive[];
}

/** Mục tiêu của tuần này: luôn hiện gọn dưới phòng để người chơi có đích đến. */
export const GoalsPanel: React.FC<GoalsPanelProps> = ({ goals }) => {
  if (goals.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {goals.map((g) => {
        const done = g.state === 'done';
        const failed = g.state === 'failed';
        return (
          <div
            key={g.id}
            className={`rounded-xl border p-2.5 text-xs ${
              done ? 'bg-emerald-50 border-emerald-200' : failed ? 'bg-rose-50 border-rose-200' : 'bg-white border-stone-200'
            }`}
            title={g.description}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-900 truncate">
                🎯 {g.emoji} {g.title}
              </span>
              <span className={`shrink-0 tabular-nums font-semibold ${done ? 'text-emerald-700' : failed ? 'text-rose-700' : 'text-stone-500'}`}>
                {done ? 'Đạt ✓' : failed ? 'Hỏng' : g.label}
              </span>
            </div>
            <p className="text-[11px] text-stone-600 leading-snug mt-0.5">{g.description}</p>
            <div className="h-1 rounded-full bg-stone-100 overflow-hidden mt-1.5">
              <div
                className={`h-full transition-[width] duration-500 ${done ? 'bg-emerald-500' : failed ? 'bg-rose-400' : 'bg-indigo-400'}`}
                style={{ width: `${Math.round(g.progress * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
