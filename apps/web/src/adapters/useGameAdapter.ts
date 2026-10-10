/**
 * UI ADAPTER (Clean Architecture Lite)
 * React Hook Adapter plugging UI views into the pure Domain Facade.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  PlayerState,
  IntrusionState,
  NightResultPrimitive,
  EventPrimitive,
  DOMAIN_ACTIONS,
  evaluateLifeStatus,
  evaluateEnding,
  buildJourney,
  DayGrade,
  isGoalId,
  GOAL_COUNT_PER_RUN,
  LocationId,
  isLocationId,
  planAction,
  planTravel,
  BigEventState,
  BigEventOutcome,
  isBigEventId,
  resolveBigEvent,
  BIG_EVENT_DAY,
  BIG_EVENT_AFTER_HOURS,
  Rng,
  createPlayerState,
  applyAction,
  rollDayEvents,
  registerIntrusion,
  endDay,
  advanceDay,
  applyEventChoice,
  applyIntrusionAnswer,
  applyBigEventOutcome,
  hoursLeftOf,
} from '@24h/domain';
import { storageAdapter } from './storageAdapter';
import { audioAdapter } from './audioAdapter';
import { AvatarId, DEFAULT_AVATAR, isAvatarId } from '../lib/avatars';

/** Nguồn ngẫu nhiên của game thật; domain chỉ nhận qua tham số */
const rng: Rng = Math.random;

/**
 * Hook chỉ giữ PlayerState (tiến trình ván) + trạng thái UI tạm thời và gọi các hàm thuần trong domain/gameState.
 */
export function useGameAdapter() {
  const [game, setGame] = useState<PlayerState>(() => createPlayerState(rng));
  // Bản mới nhất của game: các timeout (qua đêm sau 400ms...) đọc ở đây thay vì closure cũ
  const gameRef = useRef(game);
  const commit = useCallback((next: PlayerState) => {
    gameRef.current = next;
    setGame(next);
  }, []);
  const { day, hoursUsed, stats, sleepDebt, actionsTodayIds, history, dayStartStats, dayGrades, goalIds, location, finished, bigEvent } = game;

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR);
  // Hành vi vừa chọn (cho cảnh 3D); n tăng dần để lặp lại cùng hành vi vẫn kích hoạt hiệu ứng
  const [lastAction, setLastAction] = useState<{ id: string; n: number } | null>(null);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(() => !storageAdapter.hasSeenIntro());

  // Transient UX states (hộp thoại đang chờ người chơi)
  const [notice, setNotice] = useState<string | null>(null);
  const [morningReport, setMorningReport] = useState<NightResultPrimitive | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventPrimitive | null>(null);
  const [intrusion, setIntrusion] = useState<IntrusionState | null>(null);
  const [pendingBigEvent, setPendingBigEvent] = useState<BigEventOutcome | null>(null);

  // Restore on mount via storageAdapter
  useEffect(() => {
    const saved = storageAdapter.load();
    if (saved) {
      const next: PlayerState = {
        ...gameRef.current,
        day: saved.day,
        hoursUsed: saved.hoursUsed,
        stats: saved.stats,
        sleepDebt: saved.sleepDebt,
        actionsTodayIds: saved.actionsTodayIds,
        history: saved.history ?? [],
        finished: saved.finished ?? false,
        dayStartStats: saved.dayStartStats ?? saved.stats,
        dayGrades: (saved.dayGrades ?? []) as DayGrade[],
      };
      setSoundEnabled(saved.soundEnabled);
      if (isAvatarId(saved.avatarId)) setAvatarId(saved.avatarId);
      const savedGoals = (saved.goalIds ?? []).filter(isGoalId);
      if (savedGoals.length === GOAL_COUNT_PER_RUN) next.goalIds = savedGoals;
      if (isLocationId(saved.location)) next.location = saved.location;
      if (saved.bigEvent && isBigEventId(saved.bigEvent.id) && typeof saved.bigEvent.difficulty === 'number') {
        next.bigEvent = { id: saved.bigEvent.id, difficulty: saved.bigEvent.difficulty, result: saved.bigEvent.result as BigEventState['result'] };
      }
      commit(next);
      audioAdapter.enabled = saved.soundEnabled;
    }
  }, [commit]);

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
      bigEvent,
    });
  }, [day, hoursUsed, stats, sleepDebt, actionsTodayIds, soundEnabled, history, finished, avatarId, dayStartStats, dayGrades, goalIds, location, bigEvent]);

  const hoursRemaining = hoursLeftOf(game);

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

  // Qua đêm: tính hậu quả trên bản mới nhất của game; stats/ids có thể truyền vào (mốc ngay sau hành động cuối)
  const finishDay = useCallback(
    (endStats = gameRef.current.stats, endIds = gameRef.current.actionsTodayIds) => {
      audioAdapter.playCue('night');
      const cur = gameRef.current;
      const res = endDay({ ...cur, stats: endStats, actionsTodayIds: endIds }, rng);
      commit(res.state);
      setMorningReport(res.night);
    },
    [commit]
  );

  // Chạy lần lượt các bước (đi đường rồi làm) và cập nhật trạng thái một lần
  const runSteps = useCallback(
    (steps: string[], realActionId: string | null, endLocation: LocationId) => {
      const res = applyAction(game, steps, realActionId, endLocation, rng);
      if (!res.applied || !res.last) {
        setNotice(res.blocked);
        audioAdapter.playCue('neutral');
        return;
      }

      audioAdapter.playCue(res.last.soundCue);
      commit(res.state);
      if (realActionId) setLastAction((prev) => ({ id: realActionId, n: (prev?.n ?? 0) + 1 }));
      setNotice(realActionId ? res.last.notice : null);

      // Sự kiện (tối đa một mỗi lần) rồi cám dỗ xâm nhập khi ý chí thấp
      const rolled = rollDayEvents(
        res.state,
        {
          traveled: res.traveled,
          realActionId,
          endLocation,
          blocked: res.blocked,
          hasActiveEvent: !!activeEvent,
          hasIntrusion: !!intrusion,
        },
        rng
      );
      const def = rolled.intrusion;
      if (def) {
        setTimeout(() => {
          audioAdapter.playCue('temptation');
          setIntrusion({ kind: def.kind, round: 0, chunks: 0, hoursSpent: 0, note: null });
          commit(registerIntrusion(gameRef.current));
        }, 350);
      }
      const ev = rolled.event;
      if (ev) {
        setTimeout(() => {
          audioAdapter.playCue('event');
          setActiveEvent(ev);
        }, 300);
      }

      // Hết 24h: qua đêm
      if (res.state.hoursUsed >= 24) {
        setTimeout(() => finishDay(res.state.stats, res.state.actionsTodayIds), 400);
      }
    },
    [game, activeEvent, intrusion, commit, finishDay]
  );

  // Action dispatcher: tự đi đến nơi diễn ra hành vi nếu đang ở chỗ khác
  const takeAction = useCallback(
    (actionId: string) => {
      const plan = planAction(actionId, location, hoursLeftOf(game), { day, actionsTodayIds, history });
      if (!plan.ok) {
        setNotice(plan.reason);
        audioAdapter.playCue('neutral');
        return;
      }
      runSteps(plan.steps, actionId, plan.endLocation);
    },
    [location, game, day, actionsTodayIds, history, runSteps]
  );

  // Chỉ di chuyển đến một nơi (ví dụ về nhà)
  const travelTo = useCallback(
    (to: LocationId) => {
      const plan = planTravel(location, to, hoursLeftOf(game));
      if (!plan.ok) {
        setNotice(plan.reason);
        audioAdapter.playCue('neutral');
        return;
      }
      runSteps(plan.steps, null, plan.endLocation);
    },
    [location, game, runSteps]
  );

  // Trả lời cám dỗ: cưỡng lại (tốn ý chí, nếu đủ) hoặc chiều theo (mất giờ, có thể bị kéo vào vòng lặp)
  const answerIntrusion = useCallback(
    (choice: 'resist' | 'yield') => {
      if (!intrusion) return;
      const r = applyIntrusionAnswer(game, intrusion, choice, rng);
      if (r.cue) audioAdapter.playCue(r.cue);
      commit(r.state);
      const actionId = r.actionId;
      if (actionId) setLastAction((prev) => ({ id: actionId, n: (prev?.n ?? 0) + 1 }));
      setIntrusion(r.intrusion);
      if (r.notice !== undefined) setNotice(r.notice);
      if (r.endsDay) setTimeout(() => finishDay(r.state.stats, r.state.actionsTodayIds), 400);
    },
    [intrusion, game, commit, finishDay]
  );

  // Đến giờ sự kiện lớn (Thứ Bảy 14:00): tính kết quả khi không còn hộp thoại nào đang mở
  useEffect(() => {
    if (finished || bigEvent.result || pendingBigEvent) return;
    if (morningReport || activeEvent || intrusion) return;
    if (day < BIG_EVENT_DAY) return;
    if (day === BIG_EVENT_DAY && hoursUsed < BIG_EVENT_AFTER_HOURS) return;
    setPendingBigEvent(resolveBigEvent(bigEvent, { history, todayIds: actionsTodayIds, stats }));
  }, [finished, bigEvent, pendingBigEvent, morningReport, activeEvent, intrusion, day, hoursUsed, history, actionsTodayIds, stats]);

  const confirmBigEvent = useCallback(() => {
    if (!pendingBigEvent) return;
    const r = applyBigEventOutcome(game, pendingBigEvent);
    audioAdapter.playCue(r.cue);
    commit(r.state);
    setPendingBigEvent(null);
    setNotice(r.notice);
    if (r.endsDay) setTimeout(() => finishDay(r.state.stats, r.state.actionsTodayIds), 400);
  }, [pendingBigEvent, game, commit, finishDay]);

  const advanceToNextDay = useCallback(() => {
    setMorningReport(null);
    setNotice(null);
    setIntrusion(null);
    const res = advanceDay(game);
    commit(res.state);
    if (res.state.finished) audioAdapter.playCue(res.collapsed ? 'defeat' : 'victory');
  }, [game, commit]);

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
      commit(applyEventChoice(game, activeEvent.id, choiceId));
      setActiveEvent(null);
    },
    [activeEvent, game, commit]
  );

  const resetGame = useCallback(() => {
    storageAdapter.clear();
    commit(createPlayerState(rng));
    setNotice(null);
    setMorningReport(null);
    setActiveEvent(null);
    setIntrusion(null);
    setPendingBigEvent(null);
  }, [commit]);

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
    endDayEarly: () => finishDay(stats, actionsTodayIds),
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
    intrusion,
    answerIntrusion,
    bigEvent,
    pendingBigEvent,
    confirmBigEvent,
  };
}
