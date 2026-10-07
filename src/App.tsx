import React, { useState, useEffect } from 'react';
import { PlayerStats, INITIAL_STATS, DailyLog, clampStats, evaluateLifeState } from './core/stats';
import { GAME_ACTIONS, ActionDefinition, calculateActionEffect } from './core/actions';
import { processNightConsequences, NightReport } from './core/consequence';
import { rollRandomEvent, RandomEvent, EventChoice } from './core/events';
import { sound } from './lib/sound';
import { saveGameState, loadGameState, clearGameState, SavedGameState } from './lib/storage';

import { TopNav } from './ui/TopNav';
import { StatsHUD } from './ui/StatsHUD';
import { TimeTrack } from './ui/TimeTrack';
import { ActionGrid } from './ui/ActionGrid';
import { MorningModal } from './ui/MorningModal';
import { EventModal } from './ui/EventModal';
import { WeekReviewModal } from './ui/WeekReviewModal';
import { SimulationBench } from './ui/SimulationBench';
import { GuideModal } from './ui/GuideModal';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'game' | 'simulate' | 'guide'>('game');
  const [day, setDay] = useState<number>(1);
  const [hoursUsed, setHoursUsed] = useState<number>(0);
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [sleepDebt, setSleepDebt] = useState<number>(0);
  const [actionsToday, setActionsToday] = useState<ActionDefinition[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals & Transient states
  const [morningReport, setMorningReport] = useState<NightReport | null>(null);
  const [activeEvent, setActiveEvent] = useState<RandomEvent | null>(null);
  const [isWeekReviewOpen, setIsWeekReviewOpen] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load saved state on initial mount
  useEffect(() => {
    const saved = loadGameState();
    if (saved) {
      setDay(saved.day);
      setHoursUsed(saved.hoursUsed);
      setStats(saved.stats);
      setSleepDebt(saved.sleepDebt);
      // Map back to action objects
      const restoredActions = saved.actionsToday
        .map((a) => GAME_ACTIONS.find((ga) => ga.id === a.id))
        .filter((a): a is ActionDefinition => a !== undefined);
      setActionsToday(restoredActions);
      setDailyLogs(saved.dailyLogs);
      setSoundEnabled(saved.soundEnabled);
      sound.enabled = saved.soundEnabled;
    }
  }, []);

  // Sync sound system
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    sound.enabled = nextState;
  };

  // Auto-save on state change
  useEffect(() => {
    const stateToSave: SavedGameState = {
      day,
      hoursUsed,
      stats,
      sleepDebt,
      actionsToday: actionsToday.map((a) => ({
        id: a.id,
        title: a.title,
        hours: a.hours,
        timeLabel: `${a.hours}h`,
      })),
      dailyLogs,
      soundEnabled,
    };
    saveGameState(stateToSave);
  }, [day, hoursUsed, stats, sleepDebt, actionsToday, dailyLogs, soundEnabled]);

  const hoursRemaining = Math.max(0, 24 - hoursUsed);

  // Chọn hành vi
  const handleSelectAction = (action: ActionDefinition) => {
    if (hoursRemaining < action.hours) return;

    // Âm thanh
    if (action.isTemptation) {
      sound.playTemptation();
    } else if (action.category === 'rest' || action.category === 'wellness') {
      sound.playHealthy();
    } else {
      sound.playClick();
    }

    const effect = calculateActionEffect(action, stats);
    const newStats = clampStats({
      dopamine: stats.dopamine + (effect.statDeltas.dopamine ?? 0),
      energy: stats.energy + (effect.statDeltas.energy ?? 0),
      mental: stats.mental + (effect.statDeltas.mental ?? 0),
      social: stats.social + (effect.statDeltas.social ?? 0),
      money: stats.money + (effect.statDeltas.money ?? 0),
      willpower: stats.willpower + (effect.statDeltas.willpower ?? 0),
    });

    const newHoursUsed = hoursUsed + action.hours;
    const newActionsToday = [...actionsToday, action];

    setStats(newStats);
    setHoursUsed(newHoursUsed);
    setActionsToday(newActionsToday);

    if (effect.penaltyMessage) {
      setActionNotice(effect.penaltyMessage);
    } else if (effect.bonusMessage) {
      setActionNotice(effect.bonusMessage);
    } else {
      setActionNotice(null);
    }

    // Kiểm tra kích hoạt sự kiện ngẫu nhiên
    if (!activeEvent && newHoursUsed >= 8 && newHoursUsed <= 18 && Math.random() < 0.35) {
      const rolled = rollRandomEvent(day);
      if (rolled) {
        setTimeout(() => setActiveEvent(rolled), 300);
      }
    }

    // Nếu hết 24 giờ trong ngày
    if (newHoursUsed >= 24) {
      setTimeout(() => triggerNightTransition(newStats, newActionsToday), 400);
    }
  };

  // Xử lý chuyển ngày qua đêm
  const triggerNightTransition = (currentEndStats: PlayerStats, currentDayActions: ActionDefinition[]) => {
    sound.playNightTransition();
    const result = processNightConsequences(currentEndStats, currentDayActions, sleepDebt, day);

    // Ghi log ngày
    const newLog: DailyLog = {
      day,
      startStats: stats,
      endStats: result.newStats,
      actionsTaken: currentDayActions.map((a) => ({
        id: a.id,
        title: a.title,
        hours: a.hours,
        timeLabel: `${a.hours}h`,
      })),
      nightNotes: result.report.notes,
      isBurnout: result.newStats.energy <= 10 || result.newStats.mental <= 15,
      isBankrupt: result.newStats.money < 0,
    };

    setDailyLogs((prev) => [...prev, newLog]);
    setStats(result.newStats);
    setSleepDebt(result.newSleepDebt);
    setMorningReport(result.report);
  };

  const handleContinueNextDay = () => {
    setMorningReport(null);
    setActionNotice(null);
    setActionsToday([]);
    setHoursUsed(0);

    if (day >= 7) {
      setIsWeekReviewOpen(true);
      sound.playVictory();
    } else {
      setDay((prev) => prev + 1);
    }
  };

  // Giải quyết sự kiện ngẫu nhiên
  const handleResolveEventChoice = (choice: EventChoice) => {
    setActiveEvent(null);
    sound.playClick();

    const newStats = clampStats({
      dopamine: stats.dopamine + (choice.statChanges.dopamine ?? 0),
      energy: stats.energy + (choice.statChanges.energy ?? 0),
      mental: stats.mental + (choice.statChanges.mental ?? 0),
      social: stats.social + (choice.statChanges.social ?? 0),
      money: stats.money + (choice.statChanges.money ?? 0),
      willpower: stats.willpower + (choice.statChanges.willpower ?? 0),
    });

    setStats(newStats);
    setHoursUsed((prev) => Math.min(24, prev + choice.timeHours));
  };

  // Khởi động lại game
  const handleResetGame = () => {
    clearGameState();
    setDay(1);
    setHoursUsed(0);
    setStats(INITIAL_STATS);
    setSleepDebt(0);
    setActionsToday([]);
    setDailyLogs([]);
    setMorningReport(null);
    setActiveEvent(null);
    setIsWeekReviewOpen(false);
    setActionNotice(null);
  };

  const lifeState = evaluateLifeState(stats);
  const isGameOver = lifeState.status === 'burnout' || lifeState.status === 'bankrupt';

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Bar Contract (3 zones) */}
      <TopNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        day={day}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onResetGame={handleResetGame}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {currentTab === 'game' && (
          <>
            {/* Game Over Banner nếu sụp đổ */}
            {isGameOver && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">
                      {lifeState.label}
                    </h4>
                    <p className="text-xs text-rose-700">
                      {lifeState.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetGame}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bắt đầu lại</span>
                </button>
              </div>
            )}

            {/* Thông báo tức thời khi hành vi có hiệu ứng đặc biệt */}
            {actionNotice && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between animate-in fade-in duration-200">
                <span>{actionNotice}</span>
                <button
                  onClick={() => setActionNotice(null)}
                  className="text-amber-700 hover:text-amber-950 text-xs font-bold px-2 py-0.5"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* 6 Stats HUD */}
            <StatsHUD stats={stats} sleepDebt={sleepDebt} />

            {/* Visual 24h Time Track */}
            <TimeTrack
              hoursUsed={hoursUsed}
              actionsToday={actionsToday.map((a) => ({
                id: a.id,
                title: a.title,
                hours: a.hours,
                timeLabel: `${a.hours}h`,
              }))}
              onEndDayEarly={() => triggerNightTransition(stats, actionsToday)}
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
                actions={GAME_ACTIONS}
                currentStats={stats}
                hoursRemaining={hoursRemaining}
                onSelectAction={handleSelectAction}
              />
            </div>
          </>
        )}

        {currentTab === 'simulate' && <SimulationBench />}

        {currentTab === 'guide' && <GuideModal />}
      </main>

      {/* Modals */}
      {morningReport && (
        <MorningModal report={morningReport} onContinue={handleContinueNextDay} />
      )}

      {activeEvent && (
        <EventModal event={activeEvent} onResolveChoice={handleResolveEventChoice} />
      )}

      {isWeekReviewOpen && (
        <WeekReviewModal
          stats={stats}
          dailyLogs={dailyLogs}
          onRestart={handleResetGame}
          onContinueEndless={() => {
            setIsWeekReviewOpen(false);
            setDay((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
