import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng';
import { DOMAIN_STRATEGIES, playOneRun } from './simulate';
import {
  LAST_DAY,
  advanceDay,
  applyAction,
  createPlayerState,
  endDay,
  newPlayerState,
  rollDayEvents,
  startNextDay,
} from './gameState';

const fresh = () => createPlayerState(mulberry32(1));

test('createPlayerState: cùng seed => cùng ván mới', () => {
  assert.deepEqual(createPlayerState(mulberry32(5)), createPlayerState(mulberry32(5)));
});

test('applyAction: hành vi hợp lệ tốn giờ và ghi vào lịch sử ngày; bước bị chặn thì giữ nguyên state', () => {
  const s = fresh();
  const ok = applyAction(s, ['sleep_nap'], 'sleep_nap', 'home', mulberry32(1));
  assert.ok(ok.applied && ok.blocked === null && !ok.traveled);
  assert.deepEqual(ok.state.actionsTodayIds, ['sleep_nap']);
  assert.ok(ok.state.hoursUsed > 0);
  assert.equal(s.hoursUsed, 0, 'không mutate state cũ');

  const bad = applyAction(s, ['khong_ton_tai'], 'khong_ton_tai', 'home', mulberry32(1));
  assert.ok(!bad.applied && bad.blocked);
  assert.equal(bad.state, s);
});

test('rollDayEvents: cùng seed => cùng kết quả, và không bốc khi đang có hộp thoại mở', () => {
  const s = { ...fresh(), hoursUsed: 10, day: 3 };
  const ctx = { traveled: false, realActionId: 'sleep_nap', endLocation: 'home' as const, blocked: null, hasActiveEvent: false, hasIntrusion: false };
  const run = (seed: number) => JSON.stringify(rollDayEvents(s, ctx, mulberry32(seed)));
  for (let seed = 1; seed <= 30; seed++) assert.equal(run(seed), run(seed));
  const busy = rollDayEvents(s, { ...ctx, hasActiveEvent: true, hasIntrusion: true }, mulberry32(1));
  assert.deepEqual(busy, { event: null, intrusion: null });
});

test('endDay: ghi lịch sử + hạng ngày, chưa sang ngày mới; advanceDay đặt lại trường theo ngày', () => {
  const played = applyAction(fresh(), ['sleep_nap'], 'sleep_nap', 'home', mulberry32(1)).state;
  const { state: night, night: report } = endDay(played, mulberry32(2));
  assert.equal(night.day, 1);
  assert.deepEqual(night.history, [['sleep_nap']]);
  assert.equal(night.stats, report.newStats);
  assert.equal(night.dayGrades.length, report.recap ? 1 : 0);

  const next = advanceDay(night);
  assert.ok(!next.state.finished);
  assert.equal(next.state.day, 2);
  assert.deepEqual([next.state.actionsTodayIds, next.state.hoursUsed, next.state.location], [[], 0, 'home']);
  assert.equal(next.state.dayStartStats, night.stats);
});

test('advanceDay: ngày cuối kết thúc ván và không tăng ngày; startNextDay thì luôn tăng', () => {
  const last = { ...fresh(), day: LAST_DAY };
  const res = advanceDay(last);
  assert.ok(res.state.finished);
  assert.equal(res.state.day, LAST_DAY);
  assert.equal(startNextDay(last).day, LAST_DAY + 1);
});

test('playOneRun (dựng trên gameState): cùng seed => cùng diễn biến', () => {
  for (const st of DOMAIN_STRATEGIES) {
    assert.deepEqual(playOneRun(st, 7, mulberry32(42)), playOneRun(st, 7, mulberry32(42)));
  }
  assert.equal(newPlayerState([], { id: fresh().bigEvent.id, difficulty: 1 }).day, 1);
});
