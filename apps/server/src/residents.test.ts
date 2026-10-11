import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ColyseusTestServer } from '@colyseus/testing';
import { NPC_QUESTS, mulberry32 } from '@24h/domain';
import { LifeEngine, MAX_RESIDENT_REWARDS_PER_DAY, RESIDENT_MONEY_FLOOR } from './engine.js';
import { ResidentBoard } from './residents.js';
import { RESIDENTS, RESIDENT_BUSY_MS, RESIDENT_LEVEL_AT, RESIDENT_REACH, ROOM_NAME, type ResidentEventMessage, type ResidentResultMessage } from './protocol.js';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';

const def = (id: string) => RESIDENTS.find((r) => r.id === id)!;
const beside = (id: string) => ({ x: def(id).route[0].x + 1, z: def(id).route[0].z });

test('cư dân: mọi đoạn lộ trình đều đi được trên lưới city_nav.json', () => {
  const nav = JSON.parse(readFileSync(fileURLToPath(new URL('../../web/public/models/city_nav.json', import.meta.url)), 'utf8')) as { width: number; height: number; walk: string[] };
  const ok = (x: number, z: number) => nav.walk[Math.floor(z + nav.height / 2)]?.[Math.floor(x + nav.width / 2)] === '1';
  for (const r of RESIDENTS) {
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

test('cư dân: id duy nhất, có mô hình nhân vật, nhận quà thì có giá', () => {
  assert.equal(new Set(RESIDENTS.map((r) => r.id)).size, RESIDENTS.length);
  for (const r of RESIDENTS) {
    assert.ok(r.route.length >= 2 && r.speed > 0);
    assert.equal(!!r.treatLabel, !!r.treatCost, `${r.id}: treatLabel và treatCost phải đi cùng nhau`);
  }
});

test('ResidentBoard: đứng xa thì không nói chuyện được, người lạ không có', () => {
  const board = new ResidentBoard(mulberry32(1));
  assert.equal(board.interact('ba-tu', 'talk', 's1', 1, 0, 0, 0).ok, false);
  assert.equal(board.interact('khong-co', 'talk', 's1', 1, 0, 0, 0).ok, false);
  const p = beside('ba-tu');
  assert.equal(Math.hypot(p.x - def('ba-tu').route[0].x, p.z - def('ba-tu').route[0].z) <= RESIDENT_REACH, true);
  assert.equal(board.interact('ba-tu', 'talk', 's1', 1, p.x, p.z, 0).ok, true);
});

test('ResidentBoard: chỉ cư dân có nhãn mới nhận quà', () => {
  const board = new ResidentBoard(mulberry32(2));
  const p = beside('hung');
  const res = board.interact('hung', 'treat', 's1', 1, p.x, p.z, 0);
  assert.equal(res.ok, false);
  const q = beside('lan');
  const ok = board.interact('lan', 'treat', 's1', 1, q.x, q.z, 0);
  assert.ok(ok.ok && ok.deltas.money === -30);
});

test('ResidentBoard: hết lượt thưởng trong ngày thì cư dân "mệt" (không thưởng), sang ngày mới được lại', () => {
  const board = new ResidentBoard(mulberry32(3));
  const p = beside('minh');
  const take = (day: number) => {
    const res = board.interact('minh', 'help', 's1', day, p.x, p.z, 0);
    assert.ok(res.ok);
    const rewarded = Object.keys(res.deltas).length > 0;
    res.commit(rewarded);
    return rewarded;
  };
  assert.equal(take(1), true);
  assert.equal(take(1), false);
  assert.equal(take(2), true);
});

test('ResidentBoard: thân quen tăng dần theo lượt có thưởng và mở lời thoại mới', () => {
  const board = new ResidentBoard(mulberry32(4));
  const p = beside('ba-tu');
  assert.equal(board.levelFor('s1', 'ba-tu'), 0);
  let day = 1;
  let level = 0;
  for (let i = 0; i < 12 && level < 2; i++, day++) {
    for (const op of ['talk', 'talk', 'help'] as const) {
      const res = board.interact('ba-tu', op, 's1', day, p.x, p.z, 0);
      assert.ok(res.ok);
      res.commit(Object.keys(res.deltas).length > 0);
      level = res.level;
    }
  }
  assert.equal(level, RESIDENT_LEVEL_AT.length - 1);
  assert.equal(board.levelFor('s1', 'ba-tu'), 2);
  assert.equal(board.levelFor('s2', 'ba-tu'), 0, 'mỗi người chơi có độ thân riêng');
  // bạn bè: trò chuyện được thêm Kết nối
  const talk = board.interact('ba-tu', 'talk', 's1', 99, p.x, p.z, 0);
  assert.ok(talk.ok && (talk.deltas.social ?? 0) >= 2);
});

test('ResidentBoard: nói chuyện xong cư dân đứng lại rồi đi tiếp tới điểm đang dở', () => {
  const board = new ResidentBoard(mulberry32(5), 0);
  const r = board.residents.get('hung')!;
  // chạy tới khi đang đi
  let now = 1000;
  while (r.state !== 'walk' && now < 60_000) board.tick((now += 500), 500);
  assert.equal(r.state, 'walk');
  const target = r.def.route[r.idx];
  const p = { x: r.x, z: r.z };
  const res = board.interact('hung', 'talk', 's1', 1, p.x, p.z, now);
  assert.ok(res.ok);
  res.commit(true);
  board.tick(now + 100, 100);
  assert.equal(r.state, 'talk');
  const frozen = { x: r.x, z: r.z };
  board.tick(now + RESIDENT_BUSY_MS - 100, 500);
  assert.deepEqual({ x: r.x, z: r.z }, frozen, 'đứng yên trong lúc nói chuyện');
  board.tick(now + RESIDENT_BUSY_MS + 1, 500);
  assert.equal(r.state, 'walk', 'xong rồi thì đi tiếp');
  assert.equal(r.def.route[r.idx], target, 'vẫn đi tới điểm đang dở, không bỏ qua');
});

test('ResidentBoard: đi theo lộ trình và dừng ở từng điểm', () => {
  const board = new ResidentBoard(mulberry32(6), 0);
  const r = board.residents.get('tam')!;
  const seen = new Set<number>();
  for (let now = 500; now <= 120_000; now += 500) {
    board.tick(now, 500);
    seen.add(r.idx);
  }
  assert.equal(seen.size, r.def.route.length, 'ghé mọi điểm của lộ trình');
});

test('engine.grantResident: mời quà trừ tiền, không đủ ví thì từ chối, hết lượt thưởng thì không trừ tiền', () => {
  const engine = new LifeEngine('seed-res');
  engine.addPlayer('a', 'An', Date.now());
  const money0 = engine.players.get('a')!.state.stats.money;
  const r = engine.grantResident('a', { social: 2, money: -30 }, 'k1');
  assert.ok(r.ok && r.gained?.includes('Tiền -30k'));
  assert.equal(engine.players.get('a')!.state.stats.money, money0 - 30);
  // cùng khoá: không thưởng lại, không trừ lại
  const again = engine.grantResident('a', { social: 2, money: -30 }, 'k1');
  assert.ok(again.ok && again.gained === null);
  assert.equal(engine.players.get('a')!.state.stats.money, money0 - 30);
  // ví chỉ còn đúng ngưỡng sàn
  const p = engine.players.get('a')!;
  p.state = { ...p.state, stats: { ...p.state.stats, money: RESIDENT_MONEY_FLOOR + 10 } };
  const poor = engine.grantResident('a', { social: 2, money: -30 }, 'k2');
  assert.equal(poor.ok, false);
  assert.equal(p.state.stats.money, RESIDENT_MONEY_FLOOR + 10);
  // hết lượt thưởng trong ngày
  p.state = { ...p.state, stats: { ...p.state.stats, money: 5000 } };
  for (let i = 0; i < MAX_RESIDENT_REWARDS_PER_DAY + 3; i++) engine.grantResident('a', { mental: 1 }, `c${i}`);
  const capped = engine.grantResident('a', { social: 2, money: -30 }, 'cap');
  assert.ok(capped.ok && capped.gained === null);
  assert.equal(p.state.stats.money, 5000);
});

let colyseus: ColyseusTestServer;
before(async () => {
  colyseus = await bootOn(createServer({ timing: { planningMs: 8000, nightMs: 100, morningMs: 500, reconnectMs: 500 } }), 2583);
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

test('phòng: state có đủ cư dân; nói chuyện từ xa bị từ chối', { timeout: 15000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  await waitUntil(() => room.state.players.size === 1);
  assert.equal(room.state.residents.size, RESIDENTS.length);
  const results = inbox<ResidentResultMessage>(a, 'resident_result');
  a.send('resident', { residentId: 'ba-tu', op: 'talk' });
  await waitUntil(() => results.length === 1);
  assert.equal(results[0].ok, false);
  a.send('resident', { residentId: 'ba-tu', op: 'bay-bien' });
  await waitUntil(() => results.length === 2);
  assert.equal(results[1].ok, false);
});

test('phòng: đứng cạnh cư dân thì nói chuyện được, cả phòng nghe, chỉ số đổi, lặp lại thì cư dân mệt', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  const heardByB = inbox<ResidentEventMessage>(b, 'resident_event');
  const resA = inbox<ResidentResultMessage>(a, 'resident_result');
  const pa = room.state.players.get(a.sessionId)!;
  const spot = room.state.residents.get('ba-tu')!;
  // đưa An tới cạnh bà Tư (server kẹp theo tốc độ nên đi từng chặng)
  for (let i = 0; i < 40 && Math.hypot(pa.x - spot.x, pa.z - spot.z) > 2; i++) {
    a.send('move', { x: spot.x + 1, z: spot.z });
    await sleep(120);
  }
  assert.ok(Math.hypot(pa.x - spot.x, pa.z - spot.z) <= RESIDENT_REACH, 'An đã tới gần bà Tư');
  const before = { mental: pa.mental, social: pa.social };

  a.send('resident', { residentId: 'ba-tu', op: 'talk' });
  await waitUntil(() => resA.length === 1 && heardByB.length === 1);
  assert.equal(resA[0].ok, true);
  assert.ok(resA[0].gained, 'có thưởng');
  assert.equal(heardByB[0].residentName, 'Bà Tư');
  assert.equal(heardByB[0].byName, 'An');
  assert.ok(heardByB[0].line.length > 0);
  await waitUntil(() => pa.mental > before.mental || pa.social > before.social, 2000, 'chỉ số tăng');
  assert.equal(room.state.residents.get('ba-tu')!.state, 'talk', 'cư dân đứng lại nghe');

  // gửi dồn dập: bị chặn
  a.send('resident', { residentId: 'ba-tu', op: 'talk' });
  await waitUntil(() => resA.length === 2);
  assert.equal(resA[1].ok, false);

  // lượt thứ hai hợp lệ, lượt thứ ba trong ngày: cư dân mệt, không thưởng
  await sleep(700);
  a.send('resident', { residentId: 'ba-tu', op: 'talk' });
  await waitUntil(() => resA.length === 3);
  assert.equal(resA[2].ok && !!resA[2].gained, true);
  await sleep(700);
  const mentalAfter = pa.mental;
  a.send('resident', { residentId: 'ba-tu', op: 'talk' });
  await waitUntil(() => resA.length === 4);
  assert.equal(resA[3].ok, true);
  assert.equal(resA[3].gained, null);
  assert.equal(pa.mental, mentalAfter);
});

// ───────── Việc nhờ của cư dân (nhiệm vụ riêng, xem packages/domain/src/npcQuests.ts) ─────────

test('việc nhờ: mọi cư dân có đúng một việc, người giao có thật', () => {
  assert.deepEqual(NPC_QUESTS.map((q) => q.giverId).sort(), RESIDENTS.map((r) => r.id).sort());
  for (const q of NPC_QUESTS) assert.equal(q.giverName, def(q.giverId).name, `${q.id}: tên người giao phải khớp cư dân`);
});

function questPlayer() {
  const engine = new LifeEngine('quest-seed');
  engine.addPlayer('p1', 'An', 0);
  return { engine, p: engine.players.get('p1')! };
}

test('việc nhờ: nhận, nhắc, làm, trả việc; thưởng đúng, không giao lại việc đã trả', () => {
  const { engine, p } = questPlayer();
  assert.equal(engine.questTalk('p1', 'hung')!.kind, 'offer');
  assert.equal(p.npcQuest?.id, 'q_hung_run');
  assert.equal(engine.npcQuestViewOf('p1')?.status, 'active');
  assert.equal(engine.questTalk('p1', 'hung')!.kind, 'reminder', 'chưa làm thì nhắc');

  p.state = { ...p.state, actionsTodayIds: [...p.state.actionsTodayIds, 'exercise'] };
  engine.refreshNpcQuest('p1');
  assert.equal(engine.npcQuestViewOf('p1')?.status, 'ready');

  const before = p.state.stats.willpower;
  const done = engine.questTalk('p1', 'hung')!;
  assert.equal(done.kind, 'complete');
  assert.equal(done.completed, true);
  assert.equal(p.state.stats.willpower, Math.min(100, before + 6), 'ý chí +6 (trần 100)');
  assert.equal(p.npcQuest, null);
  assert.deepEqual(p.npcQuestsDone, ['q_hung_run']);
  assert.equal(engine.questTalk('p1', 'hung'), null, 'việc đã trả thì không giao lại');
});

test('việc nhờ: chỉ giữ một việc một lúc, cư dân khác báo bạn đang bận', () => {
  const { engine, p } = questPlayer();
  engine.questTalk('p1', 'hung');
  const busy = engine.questTalk('p1', 'lan')!;
  assert.equal(busy.kind, 'busy');
  assert.ok(busy.text.includes('Anh Hùng'));
  assert.equal(p.npcQuest?.id, 'q_hung_run', 'việc cũ vẫn giữ');
  assert.equal(engine.questTalk('p1', 'khong-co'), null);
});

test('việc nhờ ghé nơi: chốt ngay khi tới nơi dù rời đi sau; nhận việc ngay tại nơi đó thì phải đi rồi quay lại', () => {
  const first = questPlayer();
  first.engine.questTalk('p1', 'ba-tu');
  first.p.state = { ...first.p.state, location: 'market' };
  first.engine.refreshNpcQuest('p1');
  first.p.state = { ...first.p.state, location: 'home' };
  first.engine.refreshNpcQuest('p1');
  assert.equal(first.engine.npcQuestViewOf('p1')?.status, 'ready', 'đã chốt dù đã rời chợ');

  const second = questPlayer();
  second.p.state = { ...second.p.state, location: 'market' };
  second.engine.questTalk('p1', 'ba-tu');
  second.engine.refreshNpcQuest('p1');
  assert.equal(second.engine.npcQuestViewOf('p1')?.status, 'active', 'đang ở chợ lúc nhận thì chưa tính');
  second.p.state = { ...second.p.state, location: 'park' };
  second.engine.refreshNpcQuest('p1');
  second.p.state = { ...second.p.state, location: 'market' };
  second.engine.refreshNpcQuest('p1');
  assert.equal(second.engine.npcQuestViewOf('p1')?.status, 'ready');
});

test('việc nhờ: riêng từng người, ván đã kết thúc thì không nhận', () => {
  const engine = new LifeEngine('quest-seed-2');
  engine.addPlayer('a', 'An', 0);
  engine.addPlayer('b', 'Binh', 0);
  engine.questTalk('a', 'hung');
  assert.equal(engine.players.get('b')!.npcQuest, null, 'người khác không bị ảnh hưởng');
  assert.equal(engine.questTalk('b', 'hung')!.kind, 'offer');
  const b = engine.players.get('b')!;
  b.state = { ...b.state, finished: true };
  assert.equal(engine.questTalk('b', 'lan'), null);
});

test('phòng: nói chuyện nhận việc nhờ, private_state mang npcQuest', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  await waitUntil(() => room.state.players.size === 1);
  const states = inbox<any>(a, 'private_state');
  const results = inbox<ResidentResultMessage>(a, 'resident_result');
  await waitUntil(() => states.length >= 1);
  assert.equal(states[0].npcQuest, null);

  const pa = room.state.players.get(a.sessionId)!;
  const spot = room.state.residents.get('ba-tu')!;
  for (let i = 0; i < 40 && Math.hypot(pa.x - spot.x, pa.z - spot.z) > 2; i++) {
    a.send('move', { x: spot.x + 1, z: spot.z });
    await sleep(120);
  }
  a.send('resident', { residentId: 'ba-tu', op: 'talk' });
  await waitUntil(() => results.length === 1);
  assert.equal(results[0].ok, true);
  assert.equal(results[0].quest?.kind, 'offer');
  await waitUntil(() => states.some((s) => s.npcQuest?.id === 'q_batu_market'));
  const last = states[states.length - 1];
  assert.equal(last.npcQuest.status, 'active');
  assert.equal(last.npcQuest.giverName, 'Bà Tư');
  assert.ok(last.npcQuest.places.includes('market'));
});
