import React from 'react';
import { getWeekdayLabel } from '@24h/domain';
import { AvatarId, avatarUrl } from '../lib/avatars';
import { Volume2, VolumeX, RotateCcw, Activity, Gamepad2, HelpCircle, Users } from 'lucide-react';

type Tab = 'game' | 'multi' | 'simulate' | 'guide';

interface TopNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  day: number;
  avatarId: AvatarId;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetGame: () => void;
}

const TABS: Array<{ id: Tab; icon: React.ElementType; short: string; label: string; testId?: string }> = [
  { id: 'game', icon: Gamepad2, short: 'Chơi', label: 'Chơi thực tế' },
  { id: 'multi', icon: Users, short: 'Nhóm', label: 'Chơi cùng bạn', testId: 'tab-multi' },
  { id: 'simulate', icon: Activity, short: 'Thí nghiệm', label: 'Mô phỏng 1000 lần' },
  { id: 'guide', icon: HelpCircle, short: 'Luật', label: 'Luật & Bài học' },
];

/** 7 chấm = 7 ngày: đã qua sáng hổ phách, hôm nay nhấp nháy, còn lại mờ */
const DayPips: React.FC<{ day: number }> = ({ day }) => (
  <div className="flex items-center gap-1" role="img" aria-label={`Ngày ${day} trên 7`}>
    {Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      const state = n < day ? 'done' : n === day ? 'now' : 'next';
      return (
        <span
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            state === 'done' ? 'w-3 bg-amber-400' : state === 'now' ? 'w-5 bg-gradient-to-r from-amber-300 to-orange-500 anim-glow' : 'w-1.5 bg-white/20'
          }`}
        />
      );
    })}
  </div>
);

export const TopNav: React.FC<TopNavProps> = ({ currentTab, onTabChange, day, avatarId, soundEnabled, onToggleSound, onResetGame }) => {
  return (
    <>
    <header className="w-full sticky top-0 z-40 border-b border-white/10 bg-[#0b0a1f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 land:h-11 flex items-center gap-3">
        {/* Thương hiệu + ngày */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/40 to-pink-500/30 ring-1 ring-white/20 flex items-center justify-center shadow-[0_0_18px_-4px_rgba(139,92,246,.8)]">
            <img src={avatarUrl(avatarId)} alt="" width={30} height={30} className="w-7 h-7" draggable={false} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="hidden sm:block text-[15px] font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-white to-pink-200 bg-clip-text text-transparent">
              Cuộc Sống 24 Giờ
            </div>
            <div className="flex items-center gap-2">
              <DayPips day={day} />
              <span className="text-[11px] font-semibold text-[var(--ink-dim)] whitespace-nowrap">
                Ngày {day}/7<span className="hidden sm:inline"> · {getWeekdayLabel(day)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            className="btn btn-soft w-9 h-9"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[var(--ink-faint)]" />}
          </button>
          <button onClick={onResetGame} title="Bắt đầu lại tuần mới" className="btn btn-soft h-9 px-2.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Chơi lại</span>
          </button>
        </div>
      </div>
    </header>
    {/* Điều hướng: thanh tab dưới đáy trên điện thoại, viên thuốc ở giữa trên máy tính */}
        <nav
          aria-label="Chế độ chơi"
          className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-4 gap-1 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#0b0a1f]/92 backdrop-blur-xl border-t border-white/10
                   sm:bottom-auto sm:top-[9px] land:!top-[5px] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:inline-flex sm:gap-1 sm:p-1 sm:rounded-2xl sm:bg-[#171436]/85 sm:border sm:border-white/12 sm:shadow-lg"
        >
          {TABS.map(({ id, icon: Icon, short, label, testId }) => {
            const active = currentTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                data-testid={testId}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-2 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 land:!py-1 rounded-xl text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all ${
                  active ? 'text-white sm:bg-gradient-to-br sm:from-violet-500/80 sm:to-fuchsia-500/70 sm:shadow-[0_6px_18px_-6px_rgba(139,92,246,.9)]' : 'text-[var(--ink-dim)] hover:text-white sm:hover:bg-white/8'
                }`}
              >
                {active && <span className="sm:hidden absolute -top-1.5 h-0.5 w-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" />}
                <Icon className={`w-5 h-5 sm:w-4 sm:h-4 ${active ? 'text-amber-300 sm:text-white' : ''}`} />
                <span className="lg:hidden">{short}</span>
                <span className="hidden lg:inline">{label}</span>
              </button>
            );
          })}
        </nav>

    </>
  );
};
