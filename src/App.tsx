import React, { Suspense, lazy, useState } from 'react';
import { useGameAdapter } from './adapters/useGameAdapter';
import { shareAdapter } from './adapters/shareAdapter';
import { DOMAIN_ACTIONS, summarizeFastDopamine } from './domain';

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

// Cảnh 3D tải lười: three.js không làm chậm lần mở trang đầu
const RoomScene = lazy(() => import('./ui/RoomScene'));

export default function App() {
  const [currentTab, setCurrentTab] = useState<'game' | 'simulate' | 'guide'>('game');
  // Danh sách thẻ chữ: thu gọn mặc định, chọn hành vi chính bằng cách bấm trong phòng 3D
  const [showCards, setShowCards] = useState(false);
  const [showStats, setShowStats] = useState(false);

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
    journey,
    avatarId,
    lastAction,
    setAvatarId,
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
    playRoomSfx,
  } = useGameAdapter();

  // Chỉ dopamine NHANH trong ngày mới gây sụp; dopamine cao nhờ hoạt động lành mạnh thì không
  const crashRisk = summarizeFastDopamine(actionsToday.map((a) => a.id)).atRisk;

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Bar Contract (3 zones) */}
      <TopNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        day={day}
        avatarId={avatarId}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onResetGame={resetGame}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
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

            {/* Bố cục game: phòng 3D là màn hình chính; thời gian bên dưới; chi tiết mở khi cần */}
            <div className="space-y-4">
                {/* Căn phòng 3D: bấm đồ vật để hành động. Trên mobile dính ngay dưới thanh trên */}
                <div className="sticky top-14 z-30 -mx-4 px-4 py-2 bg-stone-100/90 backdrop-blur-sm sm:mx-0 sm:px-0 sm:rounded-2xl lg:static lg:z-auto lg:p-0 lg:bg-transparent lg:backdrop-blur-none">
                  <Suspense fallback={<div className="h-56 sm:h-80 lg:h-[30rem] rounded-2xl bg-indigo-950/90 animate-pulse" />}>
                    <RoomScene
                      avatarId={avatarId}
                      stats={stats}
                      hoursUsed={hoursUsed}
                      lastAction={lastAction}
                      crashRisk={crashRisk}
                      actions={DOMAIN_ACTIONS}
                      hoursRemaining={hoursRemaining}
                      onSelectAction={takeAction}
                      onSound={playRoomSfx}
                    />
                  </Suspense>
                </div>

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

                {/* Chi tiết: mở khi cần */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowStats((v) => !v)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border shadow-xs ${showStats ? 'bg-stone-900 text-white border-stone-900' : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'}`}
                  >
                    📊 Chỉ số chi tiết
                  </button>
                  <button
                    onClick={() => setShowCards((v) => !v)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border shadow-xs ${showCards ? 'bg-stone-900 text-white border-stone-900' : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'}`}
                  >
                    📋 Danh sách hành vi ({DOMAIN_ACTIONS.length})
                  </button>
                </div>

                {showStats && <StatsHUD stats={stats} lifeStatus={lifeStatus} sleepDebt={sleepDebt} crashRisk={crashRisk} />}

                {showCards && (
                  <ActionGrid
                    actions={DOMAIN_ACTIONS}
                    currentStats={stats}
                    hoursRemaining={hoursRemaining}
                    onSelectAction={takeAction}
                  />
                )}
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

      {ending && journey && (
        <EndingModal
          ending={ending}
          journey={journey}
          stats={stats}
          avatarId={avatarId}
          onRestart={resetGame}
          onShare={() => shareAdapter.share(ending, stats, avatarId, journey)}
          onCopy={() => shareAdapter.copy(ending)}
        />
      )}

      {isIntroOpen && !ending && <IntroModal avatarId={avatarId} onSelectAvatar={setAvatarId} onStart={dismissIntro} />}
    </div>
  );
}
