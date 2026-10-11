import React from 'react';
import type { StoryProgressPrimitive } from '@24h/domain';

interface StoryPanelProps {
  stories: StoryProgressPrimitive[];
  day: number;
}

/** Các mạch truyện của ván này: chấm tiến độ theo chương và ngày chương kế có thể xuất hiện. */
export const StoryPanel: React.FC<StoryPanelProps> = ({ stories, day }) => {
  if (stories.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {stories.map((s) => {
        const done = s.played >= s.total;
        const waiting = s.nextDay !== null && s.nextDay > day;
        return (
          <div key={s.id} className="rounded-2xl bg-gradient-to-br from-slate-900 to-violet-950 text-white p-3 ring-1 ring-white/10 shadow-md" title={s.blurb}>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none shrink-0" aria-hidden>{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Cốt truyện</span>
                  <span className="flex gap-1" aria-label={`${s.played}/${s.total} chương`}>
                    {Array.from({ length: s.total }, (_, i) => (
                      <span key={i} className={`h-1.5 w-4 rounded-full ${i < s.played ? 'bg-violet-300' : 'bg-white/15'}`} />
                    ))}
                  </span>
                </div>
                <div className="text-sm font-bold leading-snug truncate">{s.title}</div>
                <div className="text-[11px] text-violet-200/80 truncate">
                  {done ? 'Đã khép lại' : waiting ? `Chương ${s.played + 1} từ ngày ${s.nextDay}` : s.played === 0 ? s.blurb : 'Chương mới sẽ đến trong ngày'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
