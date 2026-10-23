import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_STATS } from './stats.js';
import { DOMAIN_ACTIONS } from './actions.js';
import { BIG_EVENT_IDS } from './bigEvents.js';
import { AdviceInput, bossPrepActionIds, nextAdvice, sleepCutHours } from './coach.js';
import { planBedtime } from './planner.js';

const base = (o: Partial<AdviceInput> = {}): AdviceInput => ({
  stats: { ...INITIAL_STATS },
  day: 1,
  hoursUsed: 0,
  todayIds: [],
  bossId: 'exam',
  bossRatio: 0.5,
  bossDone: false,
  crashRisk: false,
  ...o,
});
const ids = new Set(DOMAIN_ACTIONS.map((a) => a.id));

test('mọi Boss có hành vi chuẩn bị, và đều là hành vi có thật', () => {
  for (const id of BIG_EVENT_IDS) {
    const list = bossPrepActionIds(id);
    assert.ok(list.length >= 3, id);
    for (const a of list) assert.ok(ids.has(a), `${id}: ${a}`);
  }
});

test('lời khuyên luôn trỏ tới hành vi có thật', () => {
  const cases: Partial<AdviceInput>[] = [
    { stats: { ...INITIAL_STATS, energy: 20 } },
    { stats: { ...INITIAL_STATS, mental: 25 } },
    { stats: { ...INITIAL_STATS, money: 100 } },
    { hoursUsed: 16 },
    { crashRisk: true },
    { stats: { ...INITIAL_STATS, willpower: 20 } },
    { day: 4, bossRatio: 0.1 },
    { stats: { ...INITIAL_STATS, social: 20 }, bossRatio: 1 },
    { bossRatio: 1 },
  ];
  for (const c of cases) for (const a of nextAdvice(base(c)).actionIds) assert.ok(ids.has(a), a);
});

test('ưu tiên: sắp thua > giờ ngủ > Boss', () => {
  assert.equal(nextAdvice(base({ stats: { ...INITIAL_STATS, energy: 20 }, hoursUsed: 16 })).tone, 'danger');
  assert.equal(nextAdvice(base({ hoursUsed: 16, bossRatio: 0 })).bedtime, true);
  assert.equal(nextAdvice(base({ day: 4, bossRatio: 0.1 })).tone, 'goal');
  assert.equal(nextAdvice(base({ day: 4, bossRatio: 0.9 })).tone, 'calm');
});

test('đã ngủ thì không nhắc ngủ nữa', () => {
  assert.ok(!nextAdvice(base({ hoursUsed: 20, todayIds: ['sleep_deep'], bossRatio: 1 })).bedtime);
  assert.ok(!nextAdvice(base({ hoursUsed: 20, todayIds: ['sleep_h5'], bossRatio: 1 })).bedtime);
});

test('đi ngủ muộn vẫn ngủ được: ngủ ngắn hơn thay vì thức trắng', () => {
  const ctx = { day: 1, actionsTodayIds: [], history: [] };
  assert.equal(planBedtime('home', 10, ctx)?.actionId, 'sleep_deep');
  assert.equal(planBedtime('home', 5.5, ctx)?.actionId, 'sleep_h5');
  assert.equal(planBedtime('home', 0.5, ctx), null);
  const away = planBedtime('office', 8, ctx);
  assert.ok(away && away.plan.steps.length === 2 && away.actionId !== 'sleep_deep');
});

test('mất giờ ngủ: chỉ tính khi chưa ngủ và lấn vào 8 tiếng cuối', () => {
  assert.equal(sleepCutHours(10, 4, []), 0);
  assert.equal(sleepCutHours(14, 4, []), 2);
  assert.equal(sleepCutHours(14, 4, ['sleep_deep']), 0);
});
