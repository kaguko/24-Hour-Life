import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useGameAdapter } from './adapters/useGameAdapter';
import { shareAdapter } from './adapters/shareAdapter';
import {
  PLAYABLE_ACTIONS,
  planAction,
  locationDef,
  PlanResult,
  INTRUSIONS,
  bigEventPrepDisplay,
  bigEventRumor,
  bigEventDef,
  summarizeFastDopamine,
  computeSkillXp,
  habitTag,
  evaluateGoals,
} from '@24h/domain';
import { SkillsPanel } from './ui/SkillsPanel';
import { GoalsPanel } from './ui/GoalsPanel';
import { CityMap } from './ui/CityMap';
import { FeedPanel } from './ui/FeedPanel';
import { IntrusionModal } from './ui/IntrusionModal';
import { BigEventPanel } from './ui/BigEventPanel';
import { BigEventModal } from './ui/BigEventModal';

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
// Chơi nhiều người (colyseus + thành phố 3D) cũng tải lười
const MultiplayerView = lazy(() => import('./ui/multi/MultiplayerView'));

export default function App() {
  const [currentTab, setCurrentTab] = useState<'game' | 'multi' | 'simulate' | 'guide'>('game');
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
    showCoach,
    dayGrades,
    history,
    goalIds,
    finished,
    location,
    travelTo,
    intrusion,
    answerIntrusion,
    bigEvent,
    pendingBigEvent,
    confirmBigEvent,
  } = useGameAdapter();

  // Thông báo ngắn: tự tắt sau 5 giây
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  // Chuyển ngày: nhân vật lên giường, phòng tối ("Ngày N khép lại"), rồi bình minh, rồi mới hiện báo cáo sáng
  const [nightPhase, setNightPhase] = useState<'none' | 'dusk' | 'dawn'>('none');
  // Báo cáo sáng chỉ hiện sau khi màn chuyển đêm chạy xong (tránh chớp modal ở khung hình đầu)
  const [revealedReport, setRevealedReport] = useState<typeof morningReport>(null);
  useEffect(() => {
    if (!morningReport) {
      setNightPhase('none');
      return;
    }
    setNightPhase('dusk');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const t1 = setTimeout(() => setNightPhase('dawn'), 2600);
    const t2 = setTimeout(() => {
      setNightPhase('none');
      setRevealedReport(morningReport);
    }, 4300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [morningReport]);

  // Chỉ dopamine NHANH trong ngày mới gây sụp; dopamine cao nhờ hoạt động lành mạnh thì không
  const crashRisk = summarizeFastDopamine(actionsToday.map((a) => a.id)).atRisk;

  // Kế hoạch cho từng hành vi: đi đường (nếu ở xa), nơi đó còn mở cửa, hành vi có đang bị khóa không
  const skillXp = useMemo(() => computeSkillXp(history, actionsToday.map((a) => a.id)), [history, actionsToday]);
  const plans = useMemo(() => {
    const ctx = { day, actionsTodayIds: actionsToday.map((a) => a.id), history };
    const out: Record<string, PlanResult> = {};
    for (const a of PLAYABLE_ACTIONS) out[a.id] = planAction(a.id, location, hoursRemaining, ctx);
    return out;
  }, [location, hoursRemaining, day, actionsToday, history]);
  const lockReasons = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [id, p] of Object.entries(plans)) if (!p.ok) out[id] = p.reason;
    return out;
  }, [plans]);

  // Sự kiện lớn của tuần: thanh chuẩn bị (không lộ con số) và tin đồn về độ khó
  const bigEventCtx = { history, todayIds: actionsToday.map((a) => a.id), stats };
  const bigPrep = bigEventPrepDisplay(bigEvent, bigEventCtx);
  const bigRumor = bigEventRumor(bigEvent, day);

  // Mục tiêu trong tuần: tiến độ tính từ lịch sử + chỉ số hiện tại
  const goals = useMemo(
    () => evaluateGoals(goalIds, { history, todayIds: actionsToday.map((a) => a.id), stats, final: finished }),
    [goalIds, history, actionsToday, stats, finished]
  );

  // Báo khi vừa hoàn thành một mục tiêu (bỏ qua lần dựng đầu)
  const doneGoalsRef = useRef<Set<string> | null>(null);
  const goalKeyRef = useRef('');
  useEffect(() => {
    const done = new Set(goals.filter((g) => g.state === 'done').map((g) => g.id));
    const key = goalIds.join(',');
    if (goalKeyRef.current !== key) {
      // Bộ mục tiêu mới (nạp save hoặc ván mới): lấy mốc, không báo
      goalKeyRef.current = key;
      doneGoalsRef.current = null;
    }
    if (doneGoalsRef.current) {
      const fresh = goals.find((g) => g.state === 'done' && !doneGoalsRef.current!.has(g.id));
      if (fresh && !finished) setNotice(`🎯 Hoàn thành mục tiêu: ${fresh.title}! Giữ vững tới hết tuần nhé.`);
    }
    doneGoalsRef.current = done;
  }, [goals, goalIds, finished, setNotice]);

  // Nhãn phụ trên mỗi hành vi: tốn bao nhiêu giờ đi đường, và thói quen (đang tạo / đã thành nếp / đã nhờn)
  const habitTags = useMemo(() => {
    const out: Record<string, string> = {};
    for (const a of PLAYABLE_ACTIONS) {
      const p = plans[a.id];
      const travel = p && p.ok && p.travelHours > 0 ? `🚶 +${p.travelHours}h đi đường` : null;
      const tag = [travel, habitTag(a, history)].filter(Boolean).join(' · ');
      if (tag) out[a.id] = tag;
    }
    return out;
  }, [history, plans]);

  // Tự chuyển giữa phòng (ở nhà) và bản đồ (đang ở ngoài)
  const [view, setView] = useState<'feed' | 'room' | 'map'>('feed');
  useEffect(() => {
    setView(location === 'home' ? 'feed' : 'map');
  }, [location]);
  const here = locationDef(location);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-indigo-50/60 to-stone-100 text-stone-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
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
                <span>{notice.split(/(?<=[.!?…])\s/)[0]}</span>
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
                {/* Căn phòng 3D: bấm đồ vật để hành động */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    {([
                      ['feed', '🔥 Feed'],
                      ['room', '🏠 Phòng'],
                      ['map', '🗺️ Thành phố'],
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setView(id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          view === id ? 'bg-stone-900 text-white shadow-sm' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <span className="ml-auto text-[11px] font-semibold text-stone-600">
                      📍 {here.emoji} {here.name}
                    </span>
                  </div>
                  {view === 'feed' ? (
                    <FeedPanel
                      day={day}
                      hoursUsed={hoursUsed}
                      hoursRemaining={hoursRemaining}
                      stats={stats}
                      actions={PLAYABLE_ACTIONS}
                      lastActionId={lastAction?.id ?? null}
                      lastActionN={lastAction?.n ?? 0}
                      lockReasons={lockReasons}
                      habitTags={habitTags}
                      onSelectAction={takeAction}
                      onShowAll={() => setShowCards(true)}
                    />
                  ) : view === 'map' ? (
                    <CityMap
                      location={location}
                      avatarId={avatarId}
                      actions={PLAYABLE_ACTIONS}
                      plans={plans}
                      tags={habitTags}
                      hoursRemaining={hoursRemaining}
                      onSelectAction={takeAction}
                      onTravel={travelTo}
                    />
                  ) : (
                  <Suspense fallback={<div className="h-[19rem] sm:h-80 lg:h-[30rem] rounded-2xl bg-indigo-950/90 animate-pulse" />}>
                    <RoomScene
                      avatarId={avatarId}
                      stats={stats}
                      hoursUsed={hoursUsed}
                      lastAction={lastAction}
                      crashRisk={crashRisk}
                      actions={PLAYABLE_ACTIONS}
                      hoursRemaining={hoursRemaining}
                      onSelectAction={takeAction}
                      lockReasons={lockReasons}
                      habitTags={habitTags}
                      onSound={playRoomSfx}
                      coach={showCoach && !isIntroOpen}
                      sleeping={!!morningReport}
                    />
                  </Suspense>
                  )}
                </div>

                <BigEventPanel state={bigEvent} day={day} hoursUsed={hoursUsed} prep={bigPrep} rumor={bigRumor} />

                <GoalsPanel goals={goals} />

                {/* Visual 24h Time Track */}
                <TimeTrack
                  hoursUsed={hoursUsed}
                  actionsToday={actionsToday.map((a) => ({
                    id: a.id,
                    title: a.title,
                    hours: a.hours,
                    timeLabel: `${a.hours}h`,
                    kind:
                      a.dopaminePathway === 'fast'
                        ? ('fast' as const)
                        : a.category === 'rest'
                        ? ('rest' as const)
                        : a.category === 'work'
                        ? ('work' as const)
                        : a.dopaminePathway === 'slow'
                        ? ('slow' as const)
                        : ('other' as const),
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
                    📋 Danh sách hành vi ({PLAYABLE_ACTIONS.length})
                  </button>
                </div>

                {showStats && <SkillsPanel xp={skillXp} />}

                {showStats && <StatsHUD stats={stats} lifeStatus={lifeStatus} sleepDebt={sleepDebt} crashRisk={crashRisk} />}

                {showCards && (
                  <ActionGrid
                    actions={PLAYABLE_ACTIONS}
                    currentStats={stats}
                    hoursRemaining={hoursRemaining}
                    onSelectAction={takeAction}
                    lockReasons={lockReasons}
                    habitTags={habitTags}
                  />
                )}
            </div>
          </>
        )}

        {currentTab === 'multi' && (
          <Suspense fallback={<div className="h-64 rounded-2xl bg-white/60 animate-pulse" />}>
            <MultiplayerView />
          </Suspense>
        )}

        {currentTab === 'simulate' && <SimulationBench />}

        {currentTab === 'guide' && <GuideModal />}
      </main>

      {/* Modals */}
      {/* Màn chuyển đêm -> bình minh (phòng 3D phía sau vẫn thấy nhân vật đang ngủ) */}
      {morningReport && morningReport !== revealedReport && (
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center transition-colors duration-1000 ${
            nightPhase === 'dawn' ? 'bg-amber-200/45' : 'bg-indigo-950/55'
          }`}
          role="status"
          aria-live="polite"
        >
          <div key={nightPhase} className="text-center animate-in fade-in zoom-in-95 duration-700 px-6">
            <div className="text-5xl mb-2">{nightPhase !== 'dawn' ? '💤' : '☀️'}</div>
            <div className={`text-2xl sm:text-3xl font-extrabold drop-shadow ${nightPhase !== 'dawn' ? 'text-white' : 'text-stone-900'}`}>
              {nightPhase !== 'dawn' ? `Ngày ${morningReport.dayCompleted} khép lại` : 'Bình minh'}
            </div>
            <div className={`text-sm mt-1 ${nightPhase !== 'dawn' ? 'text-indigo-100' : 'text-stone-800'}`}>
              {nightPhase !== 'dawn' ? 'Cơ thể và tâm trí bắt đầu "tính sổ" qua đêm…' : 'Xem điều gì đã thay đổi sau một đêm'}
            </div>
          </div>
        </div>
      )}

      {morningReport && morningReport === revealedReport && (
        <MorningModal report={morningReport} dayGrades={dayGrades} onContinue={advanceToNextDay} />
      )}

      {pendingBigEvent && !morningReport && !activeEvent && !intrusion && (
        <BigEventModal state={bigEvent} outcome={pendingBigEvent} onContinue={confirmBigEvent} />
      )}

      {intrusion && !activeEvent && (
        <IntrusionModal
          def={INTRUSIONS[intrusion.kind]}
          round={intrusion.round}
          chunks={intrusion.chunks}
          hoursSpent={intrusion.hoursSpent}
          willpower={stats.willpower}
          note={intrusion.note}
          onAnswer={answerIntrusion}
        />
      )}

      {activeEvent && (
        <EventModal event={activeEvent} onResolveChoice={resolveEvent} />
      )}

      {ending && journey && (
        <EndingModal
          ending={ending}
          journey={journey}
          goals={goals}
          bigEvent={
            bigEvent.result
              ? { emoji: bigEventDef(bigEvent.id).emoji, title: bigEventDef(bigEvent.id).title, tier: bigEvent.result.tier, score: bigEvent.result.score }
              : undefined
          }
          stats={stats}
          avatarId={avatarId}
          onRestart={resetGame}
          onShare={(heroImage) => shareAdapter.share(ending, stats, avatarId, journey, heroImage)}
          onCopy={() => shareAdapter.copy(ending)}
        />
      )}

      {isIntroOpen && !ending && <IntroModal avatarId={avatarId} onSelectAvatar={setAvatarId} onStart={dismissIntro} />}
    </div>
  );
}
