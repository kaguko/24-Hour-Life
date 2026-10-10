import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ColyseusTestServer } from '@colyseus/testing';
import { bootOn } from './test-utils.js';
import { createServer } from './server.js';
import { ROOM_NAME, type MorningReportMessage } from './protocol.js';

// Thời gian rút ngắn để test chạy nhanh. Cổng riêng vì node --test chạy các file song song.
const TIMING = { planningMs: 1500, nightMs: 150, morningMs: 600, reconnectMs: 500 };
let colyseus: ColyseusTestServer;

before(async () => {
  colyseus = await bootOn(createServer({ timing: TIMING }), 2570);
});
after(async () => {
  await colyseus.shutdown();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(pred: () => boolean, ms = 5000, what = 'điều kiện'): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > ms) throw new Error(`hết thời gian chờ ${what}`);
    await sleep(15);
  }
}
const collectMorning = (client: any): MorningReportMessage[] => {
  const got: MorningReportMessage[] = [];
  client.onMessage('morning', (m: MorningReportMessage) => got.push(m));
  return got;
};

test('đủ vòng đời: planning -> (mọi người ready) -> night -> morning, báo cáo sáng riêng từng client', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  const gotA = collectMorning(a);
  const gotB = collectMorning(b);
  await waitUntil(() => room.state.players.size === 2);

  assert.equal(room.state.phase, 'planning');
  assert.equal(room.state.day, 1);
  assert.ok(room.state.phaseEndsAt > Date.now());

  // An làm vài việc khác Binh để báo cáo hai người khác nhau
  a.send('action', { actionId: 'sleep_nap' });
  a.send('ready');
  await sleep(150);
  assert.equal(room.state.phase, 'planning', 'còn Binh chưa ready thì chưa qua đêm');
  b.send('ready');

  const phases: string[] = [];
  const seen = () => phases[phases.length - 1] !== room.state.phase && phases.push(room.state.phase);
  await waitUntil(() => (seen(), room.state.phase === 'morning'), 3000, 'sang morning');
  assert.ok(phases.includes('night') || room.state.phase === 'morning');

  await waitUntil(() => gotA.length === 1 && gotB.length === 1, 3000, 'báo cáo sáng');
  assert.equal(gotA[0].day, 1);
  assert.equal(gotA[0].report.dayCompleted, 1);
  assert.notDeepEqual(gotA[0].report, gotB[0].report, 'mỗi người nhận báo cáo riêng của mình');
  assert.equal(gotA[0].report.newStats.energy, room.state.players.get(a.sessionId)!.energy, 'báo cáo khớp state công khai');

  // Hết morning (hoặc mọi người ready) -> ngày 2, planning mới, ready được đặt lại
  a.send('ready');
  b.send('ready');
  await waitUntil(() => room.state.phase === 'planning' && room.state.day === 2, 3000, 'sang ngày 2');
  assert.equal(room.state.players.get(a.sessionId)!.ready, false);
  assert.equal(room.state.players.get(a.sessionId)!.hoursUsed, 0);
  await Promise.all([a.leave(), b.leave()]);
});

test('hết thời gian planning thì tự qua đêm dù không ai ready; không hành động ngoài planning', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const got = collectMorning(a);
  const t0 = Date.now();
  await waitUntil(() => room.state.phase !== 'planning', 4000, 'hết giờ planning');
  assert.ok(Date.now() - t0 >= TIMING.planningMs - 200, 'chờ đủ thời gian planning');
  assert.equal(room.state.phase, 'night');

  const rejected = new Promise<any>((resolve) => a.onMessage('action_result', resolve));
  a.send('action', { actionId: 'sleep_nap' });
  const reply = await rejected;
  assert.equal(reply.ok, false);

  await waitUntil(() => got.length === 1, 3000, 'báo cáo sáng');
  await a.leave();
});

test('đã qua đêm 1 thì phòng khóa: người mới không vào được', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  a.send('ready');
  await waitUntil(() => room.state.phase === 'morning', 3000);
  await assert.rejects(colyseus.sdk.joinById(room.roomId, { name: 'Muộn' }));
  await a.leave();
});

test('mất kết nối: giữ chỗ, vào lại được trong hạn và nhận lại báo cáo sáng', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  const sid = a.sessionId;
  const token = a.reconnectionToken;
  a.reconnection.enabled = false;
  const player = room.state.players.get(sid)!;

  a.connection.close(4500);
  await waitUntil(() => !player.connected, 2000, 'ghi nhận ngắt kết nối');
  assert.equal(player.bot, false, 'chưa quá hạn thì chưa phải bot');
  assert.equal(room.state.players.size, 2, 'vẫn giữ chỗ');

  // người ngắt kết nối không chặn phòng: Binh ready một mình là qua đêm
  b.send('ready');
  await waitUntil(() => room.state.phase === 'morning', 3000, 'qua đêm khi chỉ còn Binh');

  const a2 = await colyseus.sdk.reconnect(token);
  const got = collectMorning(a2);
  await waitUntil(() => player.connected, 2000, 'vào lại');
  assert.equal(a2.sessionId, sid);
  assert.equal(player.bot, false);
  await waitUntil(() => got.length === 1, 2000, 'nhận lại báo cáo sáng');
  assert.equal(got[0].day, 1);
  await Promise.all([a2.leave(), b.leave()]);
});

test('quá hạn giữ chỗ: bot Balanced điều khiển, tự chơi trong planning và không chặn phòng', { timeout: 30000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  const player = room.state.players.get(a.sessionId)!;
  assert.equal(player.hoursUsed, 0);

  a.reconnection.enabled = false;
  a.connection.close(4500);
  await waitUntil(() => player.bot, 3000, 'bot tiếp quản sau hạn giữ chỗ');
  assert.equal(player.connected, false);
  assert.equal(player.ready, true, 'bot chơi xong ngày là sẵn sàng');
  assert.ok(player.hoursUsed >= 20, `bot đã dùng gần hết ngày (đã dùng ${player.hoursUsed}h)`);
  assert.ok(player.lastActionId === '' || typeof player.lastActionId === 'string');

  // bot đã ready nên chỉ cần Binh ready là qua đêm; sang ngày 2 bot tiếp tục tự chơi
  b.send('ready');
  await waitUntil(() => room.state.phase === 'morning', 3000, 'qua đêm');
  b.send('ready');
  await waitUntil(() => room.state.phase === 'planning' && room.state.day === 2, 3000, 'sang ngày 2');
  await waitUntil(() => player.hoursUsed >= 20 && player.ready, 3000, 'bot chơi ngày 2');
  assert.equal(player.day, 2);
  await b.leave();
});
