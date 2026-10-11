import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ColyseusTestServer } from '@colyseus/testing';
import { mulberry32 } from '@24h/domain';
import { StrollerBoard, SWEARS } from './strollers.js';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';
import { ROOM_NAME, STROLLERS, STROLLER_BUMP_PAIR_COOLDOWN_MS, STROLLER_BUMP_RADIUS, STROLLER_BUMP_STOP_MS, STROLLER_KINDS, type StrollerBumpMessage } from './protocol.js';

let colyseus: ColyseusTestServer;
before(async () => {
  colyseus = await bootOn(createServer({ timing: { planningMs: 5000, nightMs: 100, morningMs: 500, reconnectMs: 500 } }), 2587);
});
after(async () => {
  await colyseus.shutdown();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(pred: () => boolean, ms = 4000, what = 'điều kiện'): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > ms) throw new Error(`hết thời gian chờ ${what}`);
    await sleep(15);
  }
}
const inbox = <T>(client: any, type: string): T[] => {
  const got: T[] = [];
  client.onMessage(type, (m: T) => got.push(m));
  return got;
};

test('thú đi tuần: mọi đoạn lộ trình đều đi được trên lưới city_nav.json', () => {
  const nav = JSON.parse(readFileSync(fileURLToPath(new URL('../../web/public/models/city_nav.json', import.meta.url)), 'utf8')) as { width: number; height: number; walk: string[] };
  const ok = (x: number, z: number) => nav.walk[Math.floor(z + nav.height / 2)]?.[Math.floor(x + nav.width / 2)] === '1';
  for (const r of STROLLERS) {
    for (let k = 0; k < r.route.length; k++) {
      const a = r.route[k];
      const b = r.route[(k + 1) % r.route.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      for (let t = 0; t <= len; t += 0.2) {
        const f = len ? t / len : 0;
        const x = a.x + (b.x - a.x) * f;
        const z = a.z + (b.z - a.z) * f;
        assert.ok(ok(x, z), `${r.id}: (${x.toFixed(1)}, ${z.toFixed(1)}) bị chặn`);
      }
    }
  }
});

test('thú đi tuần: id duy nhất, loại hợp lệ, có lộ trình, ít nhất ba con và có đủ ba loài', () => {
  assert.equal(new Set(STROLLERS.map((r) => r.id)).size, STROLLERS.length);
  assert.ok(STROLLERS.length >= 3);
  for (const r of STROLLERS) {
    assert.ok((STROLLER_KINDS as readonly string[]).includes(r.kind), r.id);
    assert.ok(r.route.length >= 2 && r.speed > 0 && r.name && r.emoji, r.id);
  }
  assert.deepEqual([...new Set(STROLLERS.map((r) => r.kind))].sort(), [...STROLLER_KINDS].sort());
});

test('lời chửi: mỗi con có nhiều câu, bản tục che chữ, bản lịch sự không còn chữ tục', () => {
  const dirty = /\*|đ\*\*|m\*|mẹ kiếp|khốn|con điên|ngu|đồ ngốc/i;
  for (const r of STROLLERS) {
    const list = SWEARS[r.id];
    assert.ok(list && list.length >= 3, `${r.id} cần ít nhất 3 câu`);
    assert.equal(new Set(list.map((x) => x.raw)).size, list.length, `${r.id}: câu trùng`);
    for (const x of list) {
      assert.ok(x.raw.length > 8 && x.clean.length > 8, r.id);
      assert.notEqual(x.raw, x.clean, `${r.id}: bản lịch sự phải khác bản tục`);
      assert.ok(!dirty.test(x.clean), `${r.id}: bản lịch sự còn chữ tục: ${x.clean}`);
      assert.ok(!/\b(đ[ịi]t|đ[ụu]|lồn|cặc|buồi)\b/i.test(x.raw), `${r.id}: không để chữ nặng chưa che: ${x.raw}`);
    }
  }
  assert.deepEqual(Object.keys(SWEARS).sort(), STROLLERS.map((r) => r.id).sort(), 'mỗi con có bộ lời riêng, không thừa');
});

test('StrollerBoard: đi dọc lộ trình rồi quay lại, không rời khỏi hành lang', () => {
  const board = new StrollerBoard(mulberry32(7), 0);
  const penguin = board.strollers.get('cut-beo')!;
  const [a, b] = STROLLERS.find((s) => s.id === 'cut-beo')!.route;
  let sawFar = false;
  for (let t = 0; t < 400_000; t += 250) {
    board.tick(t, 250);
    assert.ok(Math.abs(penguin.z - a.z) < 1e-6, 'đi thẳng dọc hành lang');
    assert.ok(penguin.x >= Math.min(a.x, b.x) - 1e-6 && penguin.x <= Math.max(a.x, b.x) + 1e-6);
    if (penguin.x > b.x - 1) sawFar = true;
  }
  assert.ok(sawFar, 'đi tới đầu kia của lộ trình');
});

test('StrollerBoard: đụng phải thì chửi, mỗi cặp có thời gian hồi, người ở xa thì không', () => {
  const board = new StrollerBoard(mulberry32(3), 0);
  const r = board.strollers.get('vet-be')!;
  const near = { id: 'p1', name: 'An', x: r.x + 0.4, z: r.z };
  const far = { id: 'p2', name: 'Binh', x: r.x + STROLLER_BUMP_RADIUS + 3, z: r.z };

  assert.deepEqual(board.bumps([far], 1000), []);
  const first = board.bumps([near, far], 1000);
  assert.equal(first.length, 1);
  assert.equal(first[0].strollerId, 'vet-be');
  assert.equal(first[0].byName, 'An');
  assert.ok(first[0].line.startsWith('Vẹt Bẻm Mép: '));
  assert.ok(first[0].cleanLine.startsWith('Vẹt Bẻm Mép: ') && first[0].cleanLine !== first[0].line);
  assert.equal(r.state, 'talk', 'đứng lại chửi');

  // đang chửi thì không chửi thêm; hết lúc chửi nhưng chưa hết thời gian hồi của cặp này cũng không
  assert.deepEqual(board.bumps([near], 1000 + STROLLER_BUMP_STOP_MS - 1), []);
  assert.deepEqual(board.bumps([near], 1000 + STROLLER_BUMP_STOP_MS + 1), []);
  // hết thời gian hồi thì chửi lại; người khác thì chửi được ngay
  const other = { id: 'p3', name: 'Cuong', x: r.x - 0.5, z: r.z };
  assert.equal(board.bumps([other], 1000 + STROLLER_BUMP_STOP_MS + 1).length, 1, 'cặp khác không bị chặn bởi cặp trước');
  const later = board.bumps([near], 1000 + STROLLER_BUMP_PAIR_COOLDOWN_MS + STROLLER_BUMP_STOP_MS + 10);
  assert.equal(later.length, 1);
});

test('StrollerBoard: nhiều người cùng đụng thì chỉ chửi người gần nhất, và đi tiếp sau khi chửi xong', () => {
  const board = new StrollerBoard(mulberry32(5), 0);
  const r = board.strollers.get('ga-nong')!;
  const close = { id: 'a', name: 'An', x: r.x + 0.2, z: r.z };
  const mid = { id: 'b', name: 'Binh', x: r.x + 0.9, z: r.z };
  const out = board.bumps([mid, close], 500);
  assert.equal(out.length, 1);
  assert.equal(out[0].byName, 'An');

  // sau khi chửi xong, tick lại thì không còn kẹt ở trạng thái talk
  board.tick(500 + STROLLER_BUMP_STOP_MS + 100, 250);
  for (let t = 0; t < 20_000; t += 250) board.tick(500 + STROLLER_BUMP_STOP_MS + 100 + t, 250);
  assert.notEqual(r.state, 'talk');
});

test('phòng: state có đủ thú đi tuần; đứng đụng thú thì cả phòng nghe chửi đúng người', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  assert.equal(room.state.strollers.size, STROLLERS.length);
  const heardByB = inbox<StrollerBumpMessage>(b, 'stroller_bump');
  const heardByA = inbox<StrollerBumpMessage>(a, 'stroller_bump');

  // đặt An đúng chỗ con vẹt đang đứng (ghi thẳng vị trí phía server như các test khác)
  const sess = (room as any).engine.players.get(a.sessionId);
  const spot = room.state.strollers.get('vet-be')!;
  sess.x = spot.x;
  sess.z = spot.z;
  await waitUntil(() => heardByB.length >= 1 && heardByA.length >= 1, 4000, 'tiếng chửi');
  assert.equal(heardByB[0].strollerId, 'vet-be');
  assert.equal(heardByB[0].byId, a.sessionId);
  assert.equal(heardByB[0].byName, 'An');
  assert.ok(heardByB[0].line.length > 10 && heardByB[0].cleanLine.length > 10);
  await a.leave();
  await b.leave();
});
