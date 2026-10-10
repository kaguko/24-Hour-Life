import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng.js';
import { INITIAL_STATS } from './stats.js';
import { executeActionById } from './actions.js';
import { rollDomainEvent } from './events.js';
import { processOvernightCycle } from './consequence.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

test('mulberry32: cùng seed => cùng dãy, trong [0,1)', () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  for (let i = 0; i < 50; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('executeActionById: cùng seed => cùng kết quả (tease_dog, lottery_ticket)', () => {
  for (const id of ['tease_dog', 'lottery_ticket']) {
    const run = (seed: number) => executeActionById(id, INITIAL_STATS, 24, [], 1, [], mulberry32(seed));
    for (const seed of SEEDS) assert.deepEqual(run(seed), run(seed));
    assert.ok(run(1).success, `${id} phải làm được ở trạng thái đầu`);
    // Seed khác nhau phải cho kết quả khác nhau (chứng minh rng thật sự được dùng)
    assert.ok(new Set(SEEDS.map((s) => JSON.stringify(run(s).newStats))).size > 1);
  }
});

test('rollDomainEvent: cùng seed => cùng sự kiện', () => {
  const run = (seed: number) => rollDomainEvent(5, mulberry32(seed))?.id ?? null;
  for (const seed of SEEDS) assert.equal(run(seed), run(seed));
  assert.ok(new Set(SEEDS.map(run)).size > 1);
});

test('processOvernightCycle: cùng seed => cùng kết quả (kể cả câu triết lý)', () => {
  const ids = ['work_focused', 'sleep_deep'];
  const run = (seed: number) => processOvernightCycle(INITIAL_STATS, ids, 0, 2, undefined, mulberry32(seed));
  for (const seed of SEEDS) assert.deepEqual(run(seed), run(seed));
  assert.ok(new Set(SEEDS.map((s) => run(s).philosophicalQuote?.quote)).size > 1);
});
