import React, { useState } from 'react';
import { useGameAdapter } from './adapters/useGameAdapter';
import { shareAdapter } from './adapters/shareAdapter';
import { DOMAIN_ACTIONS } from './domain';

import { TopNav } from './ui/TopNav';
import { StatsHUD } from './ui/StatsHUD';
import { TimeTrack } from './ui/TimeTrack';
import { ActionGrid } from './ui/ActionGrid';
import { MorningModal } from './ui/MorningModal';
import { EventModal } from './ui/EventModal';
import { EndingModal } from './ui/EndingModal';
import { IntroModal } from './ui/IntroModal';
import { SimulationBench } from './ui/SimulationBench';
import { GuideModal } from './ui/GuideModal';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'game' | 'simulate' | 'guide'>('game');

  // Clean Architecture: Adapter hook connects Domain to UI
  const {
    day,
    hoursUsed,
    hoursRemaining,
    stats,
    sleepDebt,
    actionsToday,
    lifeStatus,
    notice,
    morningReport,
    activeEvent,
    ending,
    isIntroOpen,
    dismissIntro,
    soundEnabled,
    takeAction,
    endDayEarly,
    advanceToNextDay,
    resolveEvent,
    resetGame,
    toggleSound,
    setNotice,
  } = useGameAdapter();

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Bar Contract (3 zones) */}
      <TopNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        day={day}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onResetGame={resetGame}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {currentTab === 'game' && (
          <>
            {/* Game Over Banner nếu sụp đổ */}
            {lifeStatus.isGameOver && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">
                      {lifeStatus.label}
                    </h4>
                    <p className="text-xs text-rose-700">
                      {lifeStatus.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bắt đầu lại</span>
                </button>
              </div>
            )}

            {/* Thông báo tức thời khi hành vi có hiệu ứng đặc biệt */}
            {notice && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between animate-in fade-in duration-200">
                <span>{notice}</span>
                <button
                  onClick={() => setNotice(null)}
                  className="text-amber-700 hover:text-amber-950 text-xs font-bold px-2 py-0.5"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* 6 Stats HUD */}
            <StatsHUD stats={stats} lifeStatus={lifeStatus} sleepDebt={sleepDebt} />

            {/* Visual 24h Time Track */}
            <TimeTrack
              hoursUsed={hoursUsed}
              actionsToday={actionsToday.map((a) => ({
                id: a.id,
                title: a.title,
                hours: a.hours,
                timeLabel: `${a.hours}h`,
              }))}
              onEndDayEarly={endDayEarly}
            />

            {/* Action Grid (with low-willpower dopamine illusion) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900">
                  Lựa Chọn Hành Vi Trong 24 Giờ
                </h3>
                <span className="text-xs text-stone-500">
                  Còn lại {hoursRemaining.toFixed(1)} giờ tự do
                </span>
              </div>
              <ActionGrid
                actions={DOMAIN_ACTIONS}
                currentStats={stats}
                hoursRemaining={hoursRemaining}
                onSelectAction={takeAction}
              />
            </div>
          </>
        )}

        {currentTab === 'simulate' && <SimulationBench />}

        {currentTab === 'guide' && <GuideModal />}
      </main>

      {/* Modals */}
      {morningReport && (
        <MorningModal report={morningReport} onContinue={advanceToNextDay} />
      )}

      {activeEvent && (
        <EventModal event={activeEvent} onResolveChoice={resolveEvent} />
      )}

      {ending && (
        <EndingModal
          ending={ending}
          stats={stats}
          onRestart={resetGame}
          onShare={() => shareAdapter.share(ending, stats)}
          onCopy={() => shareAdapter.copy(ending)}
        />
      )}

      {isIntroOpen && !ending && <IntroModal onStart={dismissIntro} />}
    </div>
  );
}
