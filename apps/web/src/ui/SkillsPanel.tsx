import React from 'react';
import { SKILLS, SKILL_THRESHOLDS, SkillXp, skillProgress } from '@24h/domain';

interface SkillsPanelProps {
  xp: SkillXp;
}

const BAR: Record<string, string> = {
  mind: 'bg-sky-500',
  body: 'bg-rose-500',
  heart: 'bg-emerald-500',
  craft: 'bg-amber-500',
};

/** Bốn kỹ năng đang luyện: cấp, thanh tiến độ và lợi ích. */
export const SkillsPanel: React.FC<SkillsPanelProps> = ({ xp }) => (
  <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2.5">
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-bold text-stone-900">Kỹ năng</h3>
      <span className="text-[11px] text-stone-500">Luyện đều để mở khóa hành vi nâng cao</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {SKILLS.map((s) => {
        const p = skillProgress(xp[s.id]);
        const maxed = p.need === 0;
        return (
          <div key={s.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-800">
                {s.emoji} {s.name}
              </span>
              <span className="tabular-nums text-stone-600">
                Cấp {p.level}/{SKILL_THRESHOLDS.length}
                {!maxed && <span className="text-stone-400"> · {p.into}/{p.need} XP</span>}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full ${BAR[s.id]} transition-[width] duration-500`}
                style={{ width: `${maxed ? 100 : (p.into / p.need) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-500 leading-snug">{s.perk}</p>
          </div>
        );
      })}
    </div>
  </div>
);
