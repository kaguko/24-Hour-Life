import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ENCOURAGEMENTS_PER_DAY, applyStatDeltas, jointSocialGain } from '@24h/domain';
import { LifeEngine } from './engine.js';
import { JointBoard } from './joint.js';

/** Phòng với n người chơi; mọi người đang ở nhà lúc 7h, nên dùng run_together (công viên mở 5-19) */
function setup(n: number, seed = 'seed') {
  const engine = new LifeEngine(seed);
  const ids = Array.from({ length: n }, (_, i) => `p${i + 1}`);
  ids.forEach((id) => engine.addPlayer(id, id.toUpperCase(), 0));
  return { engine, board: new JointBoard(engine), ids };
}
const stats = (engine: LifeEngine, id: string) => engine.players.get(id)!.state.stats;

test('rủ -> vào -> bắt đầu: cả nhóm nhận Kết nối và tốn giờ, lời rủ biến mất', () => {
  const { engine, board } = setup(3);
  const before = { ...stats(engine, 'p1') };
  const offer = board.create('p1', 'run_together');
  assert.ok(offer.ok);
  assert.ok(board.join('p2', offer.offer.id).ok);
  const res = board.start('p1');
  assert.ok(res.ok && 'results' in res);
  assert.equal(res.results.filter((r) => r.ok).length, 2);
  for (const id of ['p1', 'p2']) {
    const p = engine.players.get(id)!;
    assert.equal(p.state.location, 'park');
    assert.ok(p.state.hoursUsed >= 1.5);
    assert.ok(p.state.actionsTodayIds.includes('run_together'));
    assert.equal(p.state.stats.social, Math.min(100, before.social + jointSocialGain('run_together', 2)));
  }
  assert.deepEqual(stats(engine, 'p3'), before, 'người ngoài nhóm không đổi gì');
  assert.equal(board.list().length, 0);
});

test('chỉ nhận hành vi chung hợp lệ; không rủ khi đang ở lời rủ khác hoặc đã ready', () => {
  const { engine, board } = setup(2);
  for (const bad of ['sleep_nap', 'khong_ton_tai', '', null, 5, undefined]) assert.equal(board.create('p1', bad).ok, false);
  assert.ok(board.create('p1', 'run_together').ok);
  assert.equal(board.create('p1', 'study_group').ok, false, 'đang ở lời rủ khác');
  engine.setReady('p2', true);
  assert.equal(board.create('p2', 'run_together').ok, false, 'đã ready');
  // action thường qua engine cũng không nhận hành vi chung
  assert.equal(engine.handleAction('p1', 'run_together').ok, false);
});

test('vào lời rủ: không tồn tại, đã đủ chỗ, đang ở lời rủ khác', () => {
  const { board } = setup(6);
  const o = board.create('p1', 'heart_to_heart'); // tối đa 3 (cần cafe mở 8h: 7h chưa được)
  assert.equal(o.ok, false, 'cafe lúc 7h sáng: heart_to_heart chỉ từ 8h');

  const run = board.create('p1', 'run_together');
  assert.ok(run.ok);
  assert.equal(board.join('p2', 'khong_co').ok, false);
  for (const id of ['p2', 'p3', 'p4']) assert.ok(board.join(id, run.offer.id).ok);
  assert.equal(board.join('p5', run.offer.id).ok, false, 'tối đa 4 người');
  assert.equal(board.join('p2', run.offer.id).ok, false, 'đã ở trong nhóm');
});

test('thiếu người thì chưa bắt đầu và lời rủ vẫn mở; host rời thì hủy cả lời rủ', () => {
  const { engine, board } = setup(3);
  const before = JSON.stringify(engine.players.get('p1')!.state);
  const o = board.create('p1', 'run_together');
  assert.ok(o.ok);
  const early = board.start('p1');
  assert.equal(early.ok, false);
  assert.equal(JSON.stringify(engine.players.get('p1')!.state), before, 'chưa ai bị đổi gì');
  assert.equal(board.list().length, 1);
  assert.equal(board.start('p2').ok, false, 'người không phải host không bắt đầu được');

  assert.ok(board.join('p2', o.offer.id).ok);
  assert.deepEqual(board.leave('p2').left?.members, ['p1']);
  const host = board.leave('p1');
  assert.equal(host.cancelled?.id, o.offer.id);
  assert.equal(board.list().length, 0);
});

test('người không còn làm được lúc bắt đầu bị loại, nhóm còn đủ thì vẫn chạy', () => {
  const { engine, board } = setup(3);
  const o = board.create('p1', 'run_together');
  assert.ok(o.ok);
  assert.ok(board.join('p2', o.offer.id).ok);
  assert.ok(board.join('p3', o.offer.id).ok);
  // p3 hết giờ trong lúc chờ (state đổi bên ngoài)
  const p3 = engine.players.get('p3')!;
  p3.state = { ...p3.state, hoursUsed: 24 };
  const res = board.start('p1');
  assert.ok(res.ok && 'results' in res);
  assert.equal(res.results.find((r) => r.playerId === 'p3')!.ok, false);
  assert.equal(res.results.filter((r) => r.ok).length, 2);
});

test('nhậu nhóm: tất định theo roomSeed + host + lời rủ, và áp lực kéo người ý chí thấp', () => {
  const run = (seed: string) => {
    const { engine, board } = setup(4, seed);
    for (const id of ['p1', 'p2', 'p3', 'p4']) {
      const p = engine.players.get(id)!;
      // 17h trở đi, ý chí thấp
      p.state = { ...p.state, hoursUsed: 10, stats: applyStatDeltas(p.state.stats, { willpower: -60 }) };
    }
    const o = board.create('p1', 'drinking_group');
    assert.ok(o.ok, o.ok ? '' : o.reason);
    for (const id of ['p2', 'p3', 'p4']) assert.ok(board.join(id, o.offer.id).ok);
    const res = board.start('p1');
    assert.ok(res.ok && 'results' in res);
    return JSON.stringify(res.results);
  };
  for (const seed of ['a', 'b', 'c']) assert.equal(run(seed), run(seed));
  const outcomes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(run);
  assert.ok(new Set(outcomes).size > 1, 'roomSeed khác nhau cho kết quả sa ngã khác nhau');
});

test('lời rủ cám dỗ kéo người ý chí thấp, không kéo người ý chí cao', () => {
  const { engine } = setup(2);
  const weak = engine.players.get('p1')!;
  weak.state = { ...weak.state, stats: applyStatDeltas(weak.state.stats, { willpower: -60 }) };
  const before = weak.state.stats.willpower;
  assert.ok(engine.applyOfferPressure('p1', 'drinking_group') < 0);
  assert.ok(weak.state.stats.willpower < before);
  assert.equal(engine.applyOfferPressure('p2', 'drinking_group'), 0);
  assert.equal(engine.applyOfferPressure('p1', 'run_together'), 0);
});

test('động viên: hồi ý chí người nhận, thêm Kết nối người gửi, tối đa 3 lần mỗi ngày, không tự động viên mình', () => {
  const { engine } = setup(3);
  const target = engine.players.get('p2')!;
  target.state = { ...target.state, stats: applyStatDeltas(target.state.stats, { willpower: -40 }) };
  const w0 = target.state.stats.willpower;
  const s0 = engine.players.get('p1')!.state.stats.social;

  assert.ok(engine.encourage('p1', 'p2').ok);
  assert.ok(target.state.stats.willpower > w0);
  assert.ok(engine.players.get('p1')!.state.stats.social > s0 || s0 === 100);
  assert.equal(engine.encourage('p1', 'p1').ok, false);
  assert.equal(engine.encourage('p1', 'khong_co').ok, false);
  for (let i = 1; i < MAX_ENCOURAGEMENTS_PER_DAY; i++) assert.ok(engine.encourage('p1', 'p3').ok);
  assert.equal(engine.encourage('p1', 'p2').ok, false, 'quá giới hạn mỗi ngày');
});
