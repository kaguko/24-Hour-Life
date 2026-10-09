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
  evaluateEnding,
  buildJourney,
  DayGrade,
  pickGoalIds,
  isGoalId,
  GOAL_COUNT_PER_RUN,
  LocationId,
  isLocationId,
  planAction,
  planTravel,
  rollPlaceEvent,
} from '../domain';
import { storageAdapter } from './storageAdapter';
import { audioAdapter } from './audioAdapter';
import { AvatarId, DEFAULT_AVATAR, isAvatarId } from '../lib/avatars';

export function useGameAdapter() {
  const [day, setDay] = useState<number>(1);
  const [hoursUsed, setHoursUsed] = useState<number>(0);
  const [stats, setStats] = useState<PlayerStatsPrimitive>(INITIAL_STATS);
  const [sleepDebt, setSleepDebt] = useState<number>(0);
  const [actionsTodayIds, setActionsTodayIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [history, setHistory] = useState<string[][]>([]);
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR);
  // Hành vi vừa chọn (cho cảnh 3D); n tăng dần để lặp lại cùng hành vi vẫn kích hoạt hiệu ứng
  const [lastAction, setLastAction] = useState<{ id: string; n: number } | null>(null);
  const [finished, setFinished] = useState<boolean>(false);
  // Chỉ số lúc đầu ngày (để tổng kết cả ngày) và hạng của các ngày đã qua
  const [dayStartStats, setDayStartStats] = useState<PlayerStatsPrimitive>(INITIAL_STATS);
  const [dayGrades, setDayGrades] = useState<DayGrade[]>([]);
  // Mục tiêu của ván này (bốc ngẫu nhiên khi bắt đầu ván mới)
  const [goalIds, setGoalIds] = useState<string[]>(() => pickGoalIds());
  // Nhân vật đang ở đâu trong thành phố (mỗi sáng thức dậy ở nhà)
  const [location, setLocation] = useState<LocationId>('home');
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(() => !storageAdapter.hasSeenIntro());

  // Transient UX states
  const [notice, setNotice] = useState<string | null>(null);
  const [morningReport, setMorningReport] = useState<NightResultPrimitive | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventPrimitive | null>(null);

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
      setHistory(saved.history ?? []);
      setFinished(saved.finished ?? false);
      setDayStartStats(saved.dayStartStats ?? saved.stats);
      setDayGrades((saved.dayGrades ?? []) as DayGrade[]);
      if (isAvatarId(saved.avatarId)) setAvatarId(saved.avatarId);
      const savedGoals = (saved.goalIds ?? []).filter(isGoalId);
      if (savedGoals.length === GOAL_COUNT_PER_RUN) setGoalIds(savedGoals);
      if (isLocationId(saved.location)) setLocation(saved.location);
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
      history,
      finished,
      avatarId,
      dayStartStats,
      dayGrades,
      goalIds,
      location,
    });
  }, [day, hoursUsed, stats, sleepDebt, actionsTodayIds, soundEnabled, history, finished, avatarId, dayStartStats, dayGrades, goalIds, location]);

  const hoursRemaining = Math.max(0, 24 - hoursUsed);

  const lifeStatus = useMemo(() => evaluateLifeStatus(stats), [stats]);

  // Kết cục chỉ có ý nghĩa khi ván đã kết thúc
  const ending = useMemo(() => (finished ? evaluateEnding(history, stats) : null), [finished, history, stats]);
  const journey = useMemo(() => (finished ? buildJourney(history) : null), [finished, history]);

  const actionsToday = useMemo(() => {
    return actionsTodayIds
      .map((id) => DOMAIN_ACTIONS.find((a) => a.id === id))
      .filter((a): a is (typeof DOMAIN_ACTIONS)[number] => a !== undefined);
  }, [actionsTodayIds]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      audioAdapter.enabled = next;
      if (next) audioAdapter.startMusic();
      else audioAdapter.stopMusic();
      return next;
    });
  }, []);

  // Nhạc nền: trình duyệt chỉ cho phát sau thao tác đầu tiên của người chơi
  useEffect(() => {
    const start = () => {
      if (audioAdapter.enabled) audioAdapter.startMusic();
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, []);

  // Nhạc đổi sắc thái theo giờ trong game (ngày bắt đầu lúc 07:00)
  useEffect(() => {
    const clock = (hoursUsed + 7) % 24;
    audioAdapter.setMusicNight(clock >= 19 || clock < 6);
  }, [hoursUsed]);

  // Trigger day end transition
  const endDay = useCallback(
    (customEndStats = stats, customActionIds = actionsTodayIds) => {
      audioAdapter.playCue('night');
      const nightResult = processOvernightCycle(
        customEndStats,
        customActionIds,
        sleepDebt,
        day,
        dayStartStats
      );
      const grade = nightResult.recap?.grade;
      if (grade) setDayGrades((prev) => [...prev, grade]);

      setHistory((prev) => [...prev, customActionIds]);
      setStats(nightResult.newStats);
      setSleepDebt(nightResult.newSleepDebt);
      setMorningReport(nightResult);
    },
    [stats, actionsTodayIds, sleepDebt, day, dayStartStats]
  );

  // Chạy lần lượt các bước (đi đường rồi làm) và cập nhật trạng thái một lần
  const runSteps = useCallback(
    (steps: string[], realActionId: string | null, endLocation: LocationId) => {
      let s = stats;
      let ids = actionsTodayIds;
      let left = Math.max(0, 24 - hoursUsed);
      let last: ReturnType<typeof executeActionById> | null = null;
      let traveled = false;
      let blocked: string | null = null;

      for (const stepId of steps) {
        const r = executeActionById(stepId, s, left, ids, day, history);
        if (!r.success) {
          blocked = r.notice;
          break;
        }
        s = r.newStats;
        ids = [...ids, stepId];
        left -= r.hoursSpent;
        last = r;
        if (stepId !== realActionId) traveled = true;
      }

      if (!last) {
        setNotice(blocked);
        audioAdapter.playCue('neutral');
        return;
      }

      audioAdapter.playCue(last.soundCue);
      const nextHoursUsed = 24 - left;
      setStats(s);
      setHoursUsed(nextHoursUsed);
      setActionsTodayIds(ids);
      setLocation(blocked ? location : endLocation);
      if (realActionId) setLastAction((prev) => ({ id: realActionId, n: (prev?.n ?? 0) + 1 }));
      setNotice(realActionId ? last.notice : null);

      // Sự kiện: trên đường đi, tại địa điểm, hoặc ngẫu nhiên chung (chỉ một sự kiện mỗi lần)
      let rolled: EventPrimitive | null = null;
      if (!activeEvent && !blocked) {
        if (traveled && Math.random() < 0.3) rolled = rollPlaceEvent('road', day);
        if (!rolled && realActionId && endLocation !== 'home' && Math.random() < 0.2) rolled = rollPlaceEvent(endLocation, day);
        if (!rolled && nextHoursUsed >= 8 && nextHoursUsed <= 18 && Math.random() < 0.35) rolled = rollDomainEvent(day);
      }
      if (rolled) {
        const ev = rolled;
        setTimeout(() => {
          audioAdapter.playCue('event');
          setActiveEvent(ev);
        }, 300);
      }

      // Hết 24h: qua đêm
      if (nextHoursUsed >= 24) {
        setTimeout(() => endDay(s, ids), 400);
      }
    },
    [stats, actionsTodayIds, hoursUsed, day, history, location, activeEvent, endDay]
  );

  // Action dispatcher: tự đi đến nơi diễn ra hành vi nếu đang ở chỗ khác
  const takeAction = useCallback(
    (actionId: string) => {
      const plan = planAction(actionId, location, Math.max(0, 24 - hoursUsed), { day, actionsTodayIds, history });
      if (!plan.ok) {
        setNotice(plan.reason);
        audioAdapter.playCue('neutral');
        return;
      }
      runSteps(plan.steps, actionId, plan.endLocation);
    },
    [location, hoursUsed, day, actionsTodayIds, history, runSteps]
  );

  // Chỉ di chuyển đến một nơi (ví dụ về nhà)
  const travelTo = useCallback(
    (to: LocationId) => {
      const plan = planTravel(location, to, Math.max(0, 24 - hoursUsed));
      if (!plan.ok) {
        setNotice(plan.reason);
        audioAdapter.playCue('neutral');
        return;
      }
      runSteps(plan.steps, null, plan.endLocation);
    },
    [location, hoursUsed, runSteps]
  );

  const advanceToNextDay = useCallback(() => {
    setMorningReport(null);
    setNotice(null);
    setActionsTodayIds([]);
    setHoursUsed(0);
    setLocation('home');
    setDayStartStats(stats); // chỉ số buổi sáng = mốc so sánh cho ngày mới

    // Kết thúc ván khi sụp đổ giữa chừng hoặc đã đủ 7 ngày
    const collapsed = evaluateLifeStatus(stats).isGameOver;
    if (collapsed || day >= 7) {
      setFinished(true);
      audioAdapter.playCue(collapsed ? 'defeat' : 'victory');
    } else {
      setDay((prev) => prev + 1);
    }
  }, [day, stats]);

  const selectAvatar = useCallback((id: AvatarId) => {
    audioAdapter.prime();
    setAvatarId(id);
  }, []);

  const dismissIntro = useCallback(() => {
    storageAdapter.markIntroSeen();
    setIsIntroOpen(false);
  }, []);

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
    setHistory([]);
    setDayStartStats(INITIAL_STATS);
    setDayGrades([]);
    setGoalIds(pickGoalIds());
    setLocation('home');
    setFinished(false);
  }, []);

  // Hướng dẫn trong phòng 3D: tắt sau hành vi đầu tiên
  const [showCoach, setShowCoach] = useState(() => !storageAdapter.hasSeenCoach());
  useEffect(() => {
    if (lastAction && showCoach) {
      storageAdapter.markCoachSeen();
      setShowCoach(false);
    }
  }, [lastAction, showCoach]);

  const playRoomSfx = useCallback((name: string, volume?: number) => audioAdapter.playRoomSfx(name, volume), []);

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
    ending,
    journey,
    avatarId,
    lastAction,
    setAvatarId: selectAvatar,
    isIntroOpen,
    soundEnabled,
    takeAction,
    endDayEarly: () => endDay(stats, actionsTodayIds),
    advanceToNextDay,
    resolveEvent,
    resetGame,
    toggleSound,
    setNotice,
    dismissIntro,
    playRoomSfx,
    showCoach,
    dayGrades,
    history,
    actionsTodayIds,
    goalIds,
    finished,
    location,
    travelTo,
  };
}
