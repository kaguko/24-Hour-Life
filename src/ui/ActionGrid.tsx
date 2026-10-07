import React, { useState } from 'react';
import { ActionPrimitive, PlayerStatsPrimitive } from '../domain';
import { ActionCard } from './ActionCard';
import { AlertCircle, Sprout, Zap, Briefcase, Moon, LayoutGrid } from 'lucide-react';

interface ActionGridProps {
  actions: ActionPrimitive[];
  currentStats: PlayerStatsPrimitive;
  hoursRemaining: number;
  onSelectAction: (actionId: string) => void;
}

type FilterView = 'all' | 'slow_dopamine' | 'fast_dopamine' | 'work' | 'rest';

export const ActionGrid: React.FC<ActionGridProps> = ({
  actions,
  currentStats,
  hoursRemaining,
  onSelectAction,
}) => {
  const [filter, setFilter] = useState<FilterView>('all');

  const filterTabs: Array<{ id: FilterView; label: string; icon: React.ElementType }> = [
    { id: 'all', label: `Tất cả (${actions.length})`, icon: LayoutGrid },
    { id: 'slow_dopamine', label: '🌱 Dopamine Chậm (Bền vững)', icon: Sprout },
    { id: 'fast_dopamine', label: '⚡ Dopamine Nhanh (Dễ nghiện)', icon: Zap },
    { id: 'work', label: '💼 Công việc & Kỹ năng', icon: Briefcase },
    { id: 'rest', label: '🌙 Giấc ngủ & Nghỉ ngơi', icon: Moon },
  ];

  const filteredActions = actions.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'slow_dopamine') return a.dopaminePathway === 'slow' && a.id !== 'sleep_deep';
    if (filter === 'fast_dopamine') return a.dopaminePathway === 'fast';
    if (filter === 'work') return a.category === 'work';
    if (filter === 'rest') return a.category === 'rest';
    return true;
  });

  const isLowWillpower = currentStats.willpower < 35;

  return (
    <div className="space-y-4">
      {/* Cảnh báo suy kiệt ý chí & ảo giác dopamine */}
      {isLowWillpower && (
        <div className="p-3.5 bg-fuchsia-50 border border-fuchsia-200 rounded-xl flex items-start gap-2.5 text-fuchsia-900 shadow-xs">
          <AlertCircle className="w-4 h-4 text-fuchsia-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Bẫy suy kiệt ý chí ({currentStats.willpower}%): </span>
            Khi năng lượng ý chí cạn, não bộ tự động tìm <strong>con đường Dopamine Nhanh</strong> (TikTok, game, đồ ngọt). Chúng trông cực kỳ hấp dẫn và dễ chịu trong thoáng chốc, trong khi các nguồn <strong>Dopamine Chậm</strong> (chạy bộ, học đàn, trò chuyện sâu) bị não bộ phản kháng vì đòi hỏi nỗ lực!
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredActions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            currentStats={currentStats}
            hoursRemaining={hoursRemaining}
            onSelect={onSelectAction}
          />
        ))}
      </div>
    </div>
  );
};
