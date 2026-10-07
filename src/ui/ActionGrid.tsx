import React, { useState } from 'react';
import { ActionPrimitive, ActionCategory, PlayerStatsPrimitive } from '../domain';
import { ActionCard } from './ActionCard';
import { AlertCircle } from 'lucide-react';

interface ActionGridProps {
  actions: ActionPrimitive[];
  currentStats: PlayerStatsPrimitive;
  hoursRemaining: number;
  onSelectAction: (actionId: string) => void;
}

export const ActionGrid: React.FC<ActionGridProps> = ({
  actions,
  currentStats,
  hoursRemaining,
  onSelectAction,
}) => {
  const [activeCategory, setActiveCategory] = useState<ActionCategory | 'all'>('all');

  const categories: Array<{ id: ActionCategory | 'all'; label: string }> = [
    { id: 'all', label: 'Tất cả (15)' },
    { id: 'rest', label: 'Nghỉ ngơi' },
    { id: 'work', label: 'Công việc' },
    { id: 'wellness', label: 'Rèn luyện' },
    { id: 'social', label: 'Kết nối' },
    { id: 'temptation', label: 'Cám dỗ' },
  ];

  const filteredActions =
    activeCategory === 'all'
      ? actions
      : actions.filter((a) => a.category === activeCategory);

  const isLowWillpower = currentStats.willpower < 35;

  return (
    <div className="space-y-4">
      {/* Cảnh báo suy kiệt ý chí & ảo giác dopamine */}
      {isLowWillpower && (
        <div className="p-3 bg-fuchsia-50 border border-fuchsia-200 rounded-xl flex items-start gap-2.5 text-fuchsia-900">
          <AlertCircle className="w-4 h-4 text-fuchsia-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Bẫy suy kiệt ý chí ({currentStats.willpower}%): </span>
            Khi năng lượng ý chí thấp, não bộ tự động tìm kiếm đường tắt dopamine. Các hành vi giải trí ngắn hạn (TikTok, game, đồ ăn nhanh) sẽ trông cực kỳ bắt mắt và hứa hẹn khoái cảm lớn, trong khi các thói quen tốt bị phóng đại sức ì!
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-stone-900 text-white font-semibold shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
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
