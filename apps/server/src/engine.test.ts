import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLE_ACTIONS } from '@24h/domain';
import { LifeEngine } from './engine.js';
import { MAX_MOVE_SPEED, WORLD_HALF_SIZE } from './protocol.js';
import { seedFor } from './seed.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => `room-${i}`);

/** Chơi hành vi dùng rng (vé số) rồi trả trạng thái công khai để so sánh */
function playLottery(roomSeed: string, playerId = 'p1') {
  const engine = new LifeEngine(roomSeed);
  engine.addPlayer(playerId, 'A', 0);
  const outcome = engine.handleAction(playerId, 'lottery_ticket');
  return { outcome, state: engine.players.get(playerId)!.state };
}

test('seedFor: tất định theo (roomSeed, playerId, day), đổi một thành phần thì đổi seed', () => {
  assert.equal(seedFor('r', 'p', 1), seedFor('r', 'p', 1));
  assert.notEqual(seedFor('r', 'p', 1), seedFor('r', 'p', 2));
  assert.notEqual(seedFor('r', 'p', 1), seedFor('r', 'q', 1));
  assert.notEqual(seedFor('r', 'p', 1), seedFor('s', 'p', 1));
});

test('cùng roomSeed + playerId => cùng kết quả; khác roomSeed => có kết quả khác', () => {
  for (const seed of SEEDS) assert.deepEqual(playLottery(seed), playLottery(seed));
  assert.ok(new Set(SEEDS.map((s) => JSON.stringify(playLottery(s).state))).size > 1);
});

test('hai người chơi cùng phòng có dòng ngẫu nhiên riêng', () => {
  const results = SEEDS.map((seed) => JSON.stringify([playLottery(seed, 'p1').state, playLottery(seed, 'p2').state]));
  assert.ok(results.some((r) => {
    const [a, b] = JSON.parse(r);
    return JSON.stringify(a) !== JSON.stringify(b);
  }));
});

test('từ chối hành vi không hợp lệ: không tồn tại, không phải hành vi chơi được, sai kiểu', () => {
  const engine = new LifeEngine('seed');
  engine.addPlayer('p1', 'A', 0);
  const before = JSON.stringify(engine.players.get('p1')!.state);
  for (const bad of ['khong_ton_tai', 'big_event', 'travel_home_office', '', null, undefined, 42, { a: 1 }]) {
    const r = engine.handleAction('p1', bad);
    assert.equal(r.ok, false, `phải từ chối ${JSON.stringify(bad)}`);
  }
  assert.equal(engine.handleAction('khong_co_nguoi_nay', 'sleep_nap').ok, false);
  assert.equal(JSON.stringify(engine.players.get('p1')!.state), before, 'state không đổi');
});

test('qua đêm tách khỏi hành động: hết giờ thì chờ runNight; runNight ghi lịch sử, startNextDay sang ngày mới', () => {
  const engine = new LifeEngine('seed');
  const p = engine.addPlayer('p1', 'A', 0);
  for (let i = 0; i < 500 && engine.hasTimeLeft('p1'); i++) {
    for (const a of PLAYABLE_ACTIONS) if (engine.handleAction('p1', a.id).ok) break;
  }
  assert.ok(!engine.hasTimeLeft('p1'), 'đã dùng hết giờ');
  assert.equal(p.state.day, 1, 'hết giờ không tự qua đêm');
  assert.equal(p.state.history.length, 0);

  const night = engine.runNight('p1');
  assert.ok(night);
  assert.equal(night.dayCompleted, 1);
  assert.equal(p.state.history.length, 1);
  assert.equal(p.lastReport, night);

  engine.startNextDay('p1');
  assert.equal(p.state.hoursUsed, 0);
  assert.equal(p.state.actionsTodayIds.length, 0);
  const dayNow: number = p.state.day;
  assert.ok(dayNow === 2 || p.state.finished, 'sang ngày 2, hoặc kết thúc ván nếu đã sụp đổ');

  if (p.state.finished) {
    assert.equal(engine.handleAction('p1', 'sleep_nap').ok, false);
    assert.equal(engine.runNight('p1'), null);
  }
});

test('ready khóa hành động; hủy ready thì làm tiếp được', () => {
  const engine = new LifeEngine('seed');
  engine.addPlayer('p1', 'A', 0);
  engine.setReady('p1', true);
  assert.equal(engine.handleAction('p1', 'sleep_nap').ok, false);
  engine.setReady('p1', false);
  assert.equal(engine.handleAction('p1', 'sleep_nap').ok, true);
});

test('bot Balanced: chơi hết ngày qua đường validate, sẵn sàng, và tất định theo seed', () => {
  const run = (seed: string) => {
    const engine = new LifeEngine(seed);
    const p = engine.addPlayer('p1', 'A', 0);
    engine.runBot('p1');
    return p;
  };
  const a = run('room-1');
  assert.ok(a.ready);
  assert.ok(a.state.actionsTodayIds.length > 0);
  assert.ok(a.state.hoursUsed >= 20, `bot dùng gần hết ngày (đã dùng ${a.state.hoursUsed}h)`);
  assert.deepEqual(a.state, run('room-1').state);
  for (const id of a.state.actionsTodayIds) assert.ok(!id.startsWith('intrusion'), 'bot không dùng hành vi cưỡng bức');

  // nhiều ngày liên tiếp không kẹt và không vượt giới hạn 7 ngày
  const engine = new LifeEngine('room-2');
  const p = engine.addPlayer('p1', 'A', 0);
  for (let day = 1; day <= 8 && !p.state.finished; day++) {
    engine.runBot('p1');
    engine.runNight('p1');
    engine.startNextDay('p1');
  }
  assert.ok(p.state.finished);
  assert.ok(p.state.day <= 7);
});

test('chỉ số thay đổi do domain tính, không có đường nào cho client đặt trực tiếp', () => {
  const engine = new LifeEngine('seed');
  const p = engine.addPlayer('p1', 'A', 0);
  const before = { ...p.state.stats };
  const r = engine.handleAction('p1', { toString: () => 'sleep_nap', stats: { money: 1e9 } });
  assert.equal(r.ok, false);
  assert.deepEqual(p.state.stats, before);
});

test('move: kẹp vào thế giới và vào tốc độ tối đa; payload sai bị bỏ qua', () => {
  const engine = new LifeEngine('seed');
  engine.addPlayer('p1', 'A', 0);
  const p = engine.players.get('p1')!;

  assert.equal(engine.handleMove('p1', 1000, 0, 1000), true);
  assert.ok(Math.hypot(p.x, p.z) <= MAX_MOVE_SPEED * 1 + 1e-9, 'không dịch chuyển tức thời');
  assert.ok(p.x > 0 && p.x <= MAX_MOVE_SPEED + 1e-9);

  // đủ thời gian để đi tới biên, nhưng không vượt biên
  for (let t = 2000; t < 20000; t += 1000) engine.handleMove('p1', 1e9, -1e9, t);
  assert.equal(p.x, WORLD_HALF_SIZE);
  assert.equal(p.z, -WORLD_HALF_SIZE);

  const { x, z } = p;
  for (const [bx, bz] of [[NaN, 0], [0, Infinity], ['1', 2], [null, 0], [undefined, undefined]] as const) {
    assert.equal(engine.handleMove('p1', bx, bz, 99999), false);
  }
  assert.deepEqual([p.x, p.z], [x, z]);
  assert.equal(engine.handleMove('khong_co', 0, 0, 0), false);
});
