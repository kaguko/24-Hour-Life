import React, { useState } from 'react';
import { ActionPrimitive, PlayerStatsPrimitive } from '@24h/domain';
import { ActionCard } from './ActionCard';
import { Sprout, Zap, Briefcase, Moon, LayoutGrid, Users } from 'lucide-react';

interface ActionGridProps {
  actions: ActionPrimitive[];
  currentStats: PlayerStatsPrimitive;
  hoursRemaining: number;
  onSelectAction: (actionId: string) => void;
  /** Hành vi nào đang bị khóa và vì sao */
  lockReasons?: Record<string, string>;
  /** Nhãn thói quen của từng hành vi */
  habitTags?: Record<string, string>;
}

type FilterView = 'all' | 'slow_dopamine' | 'fast_dopamine' | 'work' | 'social' | 'rest';

export const ActionGrid: React.FC<ActionGridProps> = ({
  actions,
  currentStats,
  hoursRemaining,
  onSelectAction,
  lockReasons = {},
  habitTags = {},
}) => {
  const [filter, setFilter] = useState<FilterView>('all');

  const filterTabs: Array<{ id: FilterView; label: string; icon: React.ElementType }> = [
    { id: 'all', label: `Tất cả ${actions.length}`, icon: LayoutGrid },
    { id: 'slow_dopamine', label: '🌱 Chậm', icon: Sprout },
    { id: 'fast_dopamine', label: '⚡ Nhanh', icon: Zap },
    { id: 'work', label: '💼 Việc', icon: Briefcase },
    { id: 'social', label: '🤝 Hội', icon: Users },
    { id: 'rest', label: '🌙 Nghỉ', icon: Moon },
  ];

  const filteredActions = actions.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'slow_dopamine') return a.dopaminePathway === 'slow' && a.id !== 'sleep_deep';
    if (filter === 'fast_dopamine') return a.dopaminePathway === 'fast';
    if (filter === 'work') return a.category === 'work';
    if (filter === 'social') return a.category === 'social';
    if (filter === 'rest') return a.category === 'rest';
    return true;
  }).sort((a, b) => Number(!!lockReasons[a.id]) - Number(!!lockReasons[b.id])); // hành vi đang khóa xuống cuối

  const isLowWillpower = currentStats.willpower < 35;

  return (
    <div className="space-y-4">
      {/* Ý chí thấp: cảnh báo ngắn */}
      {isLowWillpower && (
        <div className="px-3 py-2 glass !border-fuchsia-400/60 text-fuchsia-200 text-sm font-bold text-center anim-pop">
          🛡️ Ý chí {currentStats.willpower}% — não đang bị brainrot, cẩn thận ⚡
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`btn px-3 py-1.5 text-xs whitespace-nowrap ${isActive ? 'btn-primary' : 'btn-soft'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredActions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            currentStats={currentStats}
            hoursRemaining={hoursRemaining}
            onSelect={onSelectAction}
            lockReason={lockReasons[action.id] ?? null}
            habitTag={habitTags[action.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
};
