import React from 'react';
import { getWeekdayLabel } from '../domain';
import { AvatarId, avatarUrl } from '../lib/avatars';
import { Volume2, VolumeX, RotateCcw, Activity, Play, HelpCircle } from 'lucide-react';

interface TopNavProps {
  currentTab: 'game' | 'simulate' | 'guide';
  onTabChange: (tab: 'game' | 'simulate' | 'guide') => void;
  day: number;
  avatarId: AvatarId;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetGame: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onTabChange,
  day,
  avatarId,
  soundEnabled,
  onToggleSound,
  onResetGame,
}) => {
  return (
    <header className="w-full border-b border-stone-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Zone 1: Single Brand element */}
        <div className="flex items-center gap-3">
          <img src={avatarUrl(avatarId)} alt="" width={32} height={32} className="w-8 h-8 -ml-1" draggable={false} />
          <span className="hidden sm:inline text-base sm:text-lg font-bold tracking-tight text-stone-900 font-sans">
            Cuộc Sống 24 Giờ
          </span>
          <span className="hidden sm:inline text-xs text-stone-400 font-medium">·</span>
          <span className="hidden sm:inline text-xs text-stone-500 font-medium">
            Ngày {day} / 7 · {getWeekdayLabel(day)}
          </span>
        </div>

        {/* Zone 2: Navigation Links / Mode Switcher */}
        <nav className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg">
          <button
            onClick={() => onTabChange('game')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'game'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-stone-700" />
            <span className="sm:hidden">Chơi</span>
            <span className="hidden sm:inline">Chơi thực tế</span>
          </button>
          <button
            onClick={() => onTabChange('simulate')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'simulate'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span className="sm:hidden">Thí nghiệm</span>
            <span className="hidden sm:inline">Mô phỏng 1000 lần</span>
          </button>
          <button
            onClick={() => onTabChange('guide')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'guide'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span className="sm:hidden">Luật</span>
            <span className="hidden sm:inline">Luật & Bài học</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-stone-700" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-400" />
            )}
          </button>
          <button
            onClick={onResetGame}
            title="Bắt đầu lại tuần mới"
            className="px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Chơi lại</span>
          </button>
        </div>
      </div>
    </header>
  );
};
