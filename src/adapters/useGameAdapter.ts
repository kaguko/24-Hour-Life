/**
 * UI ADAPTER (Clean Architecture Lite)
 * React Hook Adapter plugging UI views into the pure Domain Facade.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlayerStatsPrimitive,
  INITIAL_STATS,
  NightResultPrimitive,
  EventPrimitive,
  DOMAIN_ACTIONS,
  executeActionById,
  processOvernightCycle,
  evaluateLifeStatus,
  rollDomainEvent,
  resolveDomainChoice,
} from '../domain';
import { storageAdapter } from './storageAdapter';
import { audioAdapter } from './audioAdapter';

export function useGameAdapter() {
  const [day, setDay] = useState<number>(1);
  const [hoursUsed, setHoursUsed] = useState<number>(0);
  const [stats, setStats] = useState<PlayerStatsPrimitive>(INITIAL_STATS);
  const [sleepDebt, setSleepDebt] = useState<number>(0);
  const [actionsTodayIds, setActionsTodayIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Transient UX states
  const [notice, setNotice] = useState<string | null>(null);
  const [morningReport, setMorningReport] = useState<NightResultPrimitive | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventPrimitive | null>(null);
  const [isWeekReviewOpen, setIsWeekReviewOpen] = useState<boolean>(false);

  // Restore on mount via storageAdapter
  useEffect(() => {
    const saved = storageAdapter.load();
    if (saved) {
      setDay(saved.day);
      setHoursUsed(saved.hoursUsed);
      setStats(saved.stats);
      setSleepDebt(saved.sleepDebt);
      setActionsTodayIds(saved.actionsTodayIds);
      setSoundEnabled(saved.soundEnabled);
      audioAdapter.enabled = saved.soundEnabled;
    }
  }, []);

  // Auto-save on changes
  useEffect(() => {
    storageAdapter.save({
      day,
      hoursUsed,
      stats,
      sleepDebt,
      actionsTodayIds,
      soundEnabled,
    });
  }, [day, hoursUsed, stats, sleepDebt, actionsTodayIds, soundEnabled]);

  const hoursRemaining = Math.max(0, 24 - hoursUsed);

  const lifeStatus = useMemo(() => evaluateLifeStatus(stats), [stats]);

  const actionsToday = useMemo(() => {
    return actionsTodayIds
      .map((id) => DOMAIN_ACTIONS.find((a) => a.id === id))
      .filter((a): a is (typeof DOMAIN_ACTIONS)[number] => a !== undefined);
  }, [actionsTodayIds]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      audioAdapter.enabled = next;
      return next;
    });
  }, []);

  // Trigger day end transition
  const endDay = useCallback(
    (customEndStats = stats, customActionIds = actionsTodayIds) => {
      audioAdapter.playCue('night');
      const nightResult = processOvernightCycle(
        customEndStats,
        customActionIds,
        sleepDebt,
        day
      );

      setStats(nightResult.newStats);
      setSleepDebt(nightResult.newSleepDebt);
      setMorningReport(nightResult);
    },
    [stats, actionsTodayIds, sleepDebt, day]
  );

  // Action dispatcher
  const takeAction = useCallback(
    (actionId: string) => {
      const currentHoursLeft = Math.max(0, 24 - hoursUsed);
      const result = executeActionById(actionId, stats, currentHoursLeft);

      if (!result.success) {
        setNotice(result.notice);
        audioAdapter.playCue('neutral');
        return;
      }

      audioAdapter.playCue(result.soundCue);

      const nextHoursUsed = hoursUsed + result.hoursSpent;
      const nextActionIds = [...actionsTodayIds, actionId];

      setStats(result.newStats);
      setHoursUsed(nextHoursUsed);
      setActionsTodayIds(nextActionIds);
      setNotice(result.notice);

      // Random event trigger check (pure roll)
      if (!activeEvent && nextHoursUsed >= 8 && nextHoursUsed <= 18 && Math.random() < 0.35) {
        const rolled = rollDomainEvent(day);
        if (rolled) {
          setTimeout(() => setActiveEvent(rolled), 300);
        }
      }

      // If full 24h consumed, transition night
      if (nextHoursUsed >= 24) {
        setTimeout(() => {
          endDay(result.newStats, nextActionIds);
        }, 400);
      }
    },
    [hoursUsed, stats, actionsTodayIds, activeEvent, day, endDay]
  );

  const advanceToNextDay = useCallback(() => {
    setMorningReport(null);
    setNotice(null);
    setActionsTodayIds([]);
    setHoursUsed(0);

    if (day >= 7) {
      setIsWeekReviewOpen(true);
      audioAdapter.playCue('victory');
    } else {
      setDay((prev) => prev + 1);
    }
  }, [day]);

  const resolveEvent = useCallback(
    (choiceId: string) => {
      if (!activeEvent) return;
      audioAdapter.playCue('neutral');
      const res = resolveDomainChoice(activeEvent.id, choiceId, stats);
      setStats(res.newStats);
      setHoursUsed((prev) => Math.min(24, prev + res.timeHours));
      setActiveEvent(null);
    },
    [activeEvent, stats]
  );

  const resetGame = useCallback(() => {
    storageAdapter.clear();
    setDay(1);
    setHoursUsed(0);
    setStats(INITIAL_STATS);
    setSleepDebt(0);
    setActionsTodayIds([]);
    setNotice(null);
    setMorningReport(null);
    setActiveEvent(null);
    setIsWeekReviewOpen(false);
  }, []);

  return {
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
    isWeekReviewOpen,
    soundEnabled,
    takeAction,
    endDayEarly: () => endDay(stats, actionsTodayIds),
    advanceToNextDay,
    resolveEvent,
    resetGame,
    toggleSound,
    setNotice,
    setIsWeekReviewOpen,
  };
}
