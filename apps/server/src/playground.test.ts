import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ColyseusTestServer } from '@colyseus/testing';
import { mulberry32 } from '@24h/domain';
import { AnimalBoard } from './playground.js';
import { ANIMALS, ANIMAL_MOOD_MS, ANIMAL_REACH, ROOM_NAME, type EmoteMessage, type EmoteResultMessage } from './protocol.js';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';

const near = (id: string) => {
  const d = ANIMALS.find((a) => a.id === id)!;
  return { x: d.home.x + 1, z: d.home.z };
};

test('AnimalBoard: đứng xa thì không chơi được', () => {
  const board = new AnimalBoard(mulberry32(1));
  const res = board.interact('cat', 'pet', 0, 0, 0);
  assert.equal(res.ok, false);
  assert.equal(board.interact('khong-co', 'pet', 0, 0, 0).ok, false);
});

test('AnimalBoard: chọc mèo thì cáu, chạy tới chỗ trú rồi tự về và bình tĩnh lại', () => {
  const board = new AnimalBoard(mulberry32(2));
  const cat = ANIMALS.find((a) => a.id === 'cat')!;
  const p = near('cat');
  const res = board.interact('cat', 'poke', p.x, p.z, 1000);
  assert.ok(res.ok && res.mood === 'angry');
  const state = board.animals.get('cat')!;
  assert.deepEqual({ x: state.x, z: state.z }, cat.away);
  // đang chạy trốn thì không chơi tiếp được
  assert.equal(board.interact('cat', 'pet', p.x, p.z, 1500).ok, false);
  assert.equal(board.tick(1000 + ANIMAL_MOOD_MS - 1).length, 0);
  assert.equal(board.tick(1000 + ANIMAL_MOOD_MS).length, 1);
  assert.equal(state.mood, 'calm');
  assert.deepEqual({ x: state.x, z: state.z }, cat.home);
});

test('AnimalBoard: capybara luôn chill, vuốt ve luôn có thưởng, chọc không cáu', () => {
  const board = new AnimalBoard(mulberry32(3));
  const p = near('capybara');
  for (let i = 0; i < 10; i++) {
    const pet = board.interact('capybara', 'pet', p.x, p.z, i * 100000);
    assert.ok(pet.ok && pet.mood === 'happy' && (pet.deltas.mental ?? 0) > 0);
    board.tick(i * 100000 + ANIMAL_MOOD_MS);
  }
  const poke = board.interact('capybara', 'poke', p.x, p.z, 10_000_000);
  assert.ok(poke.ok && poke.mood === 'calm');
});

test('AnimalBoard: mọi con vật nằm trong tầm vuốt ve của chính chỗ ngồi', () => {
  for (const a of ANIMALS) assert.ok(Math.hypot(a.home.x - near(a.id).x, a.home.z - near(a.id).z) <= ANIMAL_REACH);
});

let colyseus: ColyseusTestServer;
before(async () => {
  colyseus = await bootOn(createServer({ timing: { planningMs: 5000, nightMs: 100, morningMs: 500, reconnectMs: 500 } }), 2581);
});
after(async () => {
  await colyseus.shutdown();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(pred: () => boolean, ms = 3000, what = 'điều kiện'): Promise<void> {
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

test('phòng: state có đủ con vật; vuốt ve từ xa bị từ chối', { timeout: 15000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  await waitUntil(() => room.state.players.size === 1);
  assert.equal(room.state.animals.size, ANIMALS.length);
  const results = inbox<{ ok: boolean }>(a, 'animal_result');
  a.send('animal', { animalId: 'cat', op: 'pet' });
  await waitUntil(() => results.length === 1);
  assert.equal(results[0].ok, false);
});

test('phòng: emote vẫy tay phát cho cả phòng; ôm nhau cho Kết nối cả hai một lần mỗi ngày', { timeout: 15000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  const heardByB = inbox<EmoteMessage>(b, 'emote');
  const resA = inbox<EmoteResultMessage>(a, 'emote_result');
  const pa = room.state.players.get(a.sessionId)!;
  const pb = room.state.players.get(b.sessionId)!;
  const socialA = pa.social;
  const socialB = pb.social;

  a.send('emote', { kind: 'wave' });
  await waitUntil(() => heardByB.length === 1);
  assert.equal(heardByB[0].kind, 'wave');
  assert.equal(heardByB[0].fromName, 'An');

  await sleep(1300);
  a.send('emote', { kind: 'hug', targetId: b.sessionId });
  await waitUntil(() => resA.length === 2);
  assert.equal(resA[1].ok, true);
  await waitUntil(() => pa.social > socialA && pb.social > socialB, 2000, 'Kết nối tăng');

  // ôm lần nữa trong cùng ngày: vẫn diễn ra nhưng không cộng thêm
  const afterA = pa.social;
  await sleep(1300);
  a.send('emote', { kind: 'hug', targetId: b.sessionId });
  await waitUntil(() => resA.length === 3);
  assert.equal(resA[2].ok, true);
  assert.equal(pa.social, afterA);

  // ôm mà không chọn người
  await sleep(1300);
  a.send('emote', { kind: 'hug' });
  await waitUntil(() => resA.length === 4);
  assert.equal(resA[3].ok, false);
});
