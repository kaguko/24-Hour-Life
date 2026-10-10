import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ColyseusTestServer } from '@colyseus/testing';
import { MAX_ENCOURAGEMENTS_PER_DAY, jointSocialGain } from '@24h/domain';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';
import { ROOM_NAME, type InviteMessage, type JointResultMessage } from './protocol.js';

let colyseus: ColyseusTestServer;
before(async () => {
  colyseus = await bootOn(createServer({ timing: { planningMs: 3000, nightMs: 100, morningMs: 500, reconnectMs: 500 } }), 2573);
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

async function twoPlayers() {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  return { room, a, b, pa: room.state.players.get(a.sessionId)!, pb: room.state.players.get(b.sessionId)! };
}

test('rủ nhau chạy bộ: mời, vào nhóm, bắt đầu; cả hai nhận kết quả riêng và state công khai cập nhật', { timeout: 20000 }, async () => {
  const { room, a, b, pa, pb } = await twoPlayers();
  const invites = inbox<InviteMessage>(b, 'invite');
  const resA = inbox<JointResultMessage>(a, 'joint_result');
  const resB = inbox<JointResultMessage>(b, 'joint_result');
  const socialBefore = pa.social;

  a.send('joint', { op: 'offer', actionId: 'run_together' });
  await waitUntil(() => invites.length === 1, 3000, 'lời mời');
  assert.equal(invites[0].hostId, a.sessionId);
  assert.equal(invites[0].hostName, 'An');
  assert.equal(room.state.offers.size, 1);
  const offer = [...room.state.offers.values()][0];
  assert.equal(offer.actionId, 'run_together');
  assert.deepEqual([...offer.members], [a.sessionId]);
  assert.equal(pa.offerId, offer.id);

  // đang chờ nhóm thì không làm việc khác
  const rejected = new Promise<any>((resolve) => a.onMessage('action_result', resolve));
  a.send('action', { actionId: 'sleep_nap' });
  assert.equal((await rejected).ok, false);

  // chưa đủ người
  a.send('joint', { op: 'start' });
  await waitUntil(() => resA.some((r) => !r.ok && /ít nhất/.test(r.reason ?? '')), 3000, 'báo thiếu người');

  b.send('joint', { op: 'join', offerId: invites[0].offerId });
  await waitUntil(() => [...room.state.offers.values()][0]?.members.length === 2, 3000, 'vào nhóm');
  a.send('joint', { op: 'start' });
  await waitUntil(() => resA.some((r) => r.ok && r.withNames) && resB.some((r) => r.ok && r.withNames), 3000, 'kết quả hành vi chung');

  const doneA = resA.find((r) => r.withNames)!;
  assert.deepEqual([...doneA.withNames!].sort(), ['An', 'Binh']);
  assert.equal(room.state.offers.size, 0);
  assert.equal(pa.offerId, '');
  assert.equal(pa.location, 'park');
  assert.equal(pb.location, 'park');
  assert.equal(pa.social, Math.min(100, socialBefore + jointSocialGain('run_together', 2)));
  assert.equal(pa.lastActionId, 'run_together');
  assert.ok(pa.hoursUsed >= 1.5 && pb.hoursUsed >= 1.5);
  await Promise.all([a.leave(), b.leave()]);
});

test('hành vi chung không thể gọi bằng action, và chỉ rủ được trong planning', { timeout: 20000 }, async () => {
  const { a, pa } = await twoPlayers();
  const results = inbox<any>(a, 'action_result');
  a.send('action', { actionId: 'run_together' });
  await waitUntil(() => results.length === 1);
  assert.equal(results[0].ok, false);
  assert.match(results[0].reason, /rủ/);
  assert.equal(pa.hoursUsed, 0);

  const joint = inbox<JointResultMessage>(a, 'joint_result');
  a.send('joint', { op: 'offer', actionId: 'sleep_nap' });
  a.send('joint', { op: 'wtf' });
  a.send('joint', null);
  await waitUntil(() => joint.length === 3);
  assert.ok(joint.every((r) => !r.ok));
  await a.leave();
});

test('động viên: người nhận hồi ý chí và được báo, người gửi có giới hạn mỗi ngày', { timeout: 20000 }, async () => {
  const { a, b, pa, pb } = await twoPlayers();
  const nudged = inbox<any>(b, 'nudged');
  const results = inbox<any>(a, 'nudge_result');
  const w0 = pb.willpower;
  const s0 = pa.social;

  a.send('nudge', { targetId: b.sessionId });
  await waitUntil(() => nudged.length === 1 && results.length === 1);
  assert.equal(nudged[0].fromName, 'An');
  assert.equal(results[0].ok, true);
  assert.ok(pb.willpower > w0);
  assert.ok(pa.social >= s0);

  for (let i = 1; i < MAX_ENCOURAGEMENTS_PER_DAY; i++) a.send('nudge', { targetId: b.sessionId });
  a.send('nudge', { targetId: b.sessionId }); // lần thứ 4: vượt giới hạn
  a.send('nudge', { targetId: a.sessionId }); // tự động viên mình
  a.send('nudge', { targetId: 42 }); // sai kiểu
  await waitUntil(() => results.length === MAX_ENCOURAGEMENTS_PER_DAY + 3);
  assert.equal(results.filter((r) => r.ok).length, MAX_ENCOURAGEMENTS_PER_DAY);
  assert.equal(nudged.length, MAX_ENCOURAGEMENTS_PER_DAY);
  await Promise.all([a.leave(), b.leave()]);
});

test('hết giờ lên kế hoạch mà lời rủ chưa thành: hủy, không ai bị tốn gì', { timeout: 20000 }, async () => {
  const { room, a, pa } = await twoPlayers();
  const results = inbox<JointResultMessage>(a, 'joint_result');
  a.send('joint', { op: 'offer', actionId: 'run_together' });
  await waitUntil(() => room.state.offers.size === 1);

  await waitUntil(() => results.some((r) => !r.ok && /Hết giờ/.test(r.reason ?? '')), 6000, 'lời rủ hết hạn');
  assert.equal(room.state.offers.size, 0);
  assert.equal(pa.offerId, '');
  await a.leave();
});

test('private_state: hành vi đã làm và lý do khóa do server tính, gửi riêng cho từng người', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const states: any[] = [];
  a.onMessage('private_state', (m: any) => states.push(m));
  await waitUntil(() => states.length >= 1, 3000, 'private_state đầu tiên');
  const first = states[0];
  assert.deepEqual(first.actionsToday, []);
  assert.ok(typeof first.locks.eat_together === 'string' && first.locks.eat_together.length > 0, 'ăn cùng chưa mở cửa lúc 7h');
  assert.equal(first.locks.sleep_nap, undefined, 'ngủ chợp làm được');
  assert.equal(first.sleepDebt, 0);

  a.send('action', { actionId: 'sleep_nap' });
  await waitUntil(() => states.length >= 2, 3000, 'private_state sau hành động');
  assert.deepEqual(states[states.length - 1].actionsToday, ['sleep_nap']);
  await a.leave();
});

test('báo cáo sáng có "bạn bè hôm qua": ai đi cùng ai, ai động viên, ai đang chật vật; không xếp hạng', { timeout: 30000 }, async () => {
  const { room, a, b } = await twoPlayers();
  const morningA = inbox<any>(a, 'morning');
  const morningB = inbox<any>(b, 'morning');
  const invites = inbox<InviteMessage>(b, 'invite');

  a.send('joint', { op: 'offer', actionId: 'run_together' });
  await waitUntil(() => invites.length === 1);
  b.send('joint', { op: 'join', offerId: invites[0].offerId });
  await waitUntil(() => [...room.state.offers.values()][0]?.members.length === 2);
  a.send('joint', { op: 'start' });
  await waitUntil(() => room.state.offers.size === 0);
  b.send('nudge', { targetId: a.sessionId });
  await sleep(200);

  a.send('ready');
  b.send('ready');
  await waitUntil(() => morningA.length === 1 && morningB.length === 1, 6000, 'báo cáo sáng');
  const friendsA: string[] = morningA[0].friends;
  const friendsB: string[] = morningB[0].friends;
  assert.ok(friendsA.some((l) => /cùng Binh/.test(l)), `An thấy mình đi cùng Binh: ${friendsA.join(' | ')}`);
  assert.ok(friendsB.some((l) => /cùng An/.test(l)), `Binh thấy mình đi cùng An: ${friendsB.join(' | ')}`);
  assert.ok(friendsA.some((l) => /Binh đã động viên bạn/.test(l)));
  assert.ok(friendsB.some((l) => /Bạn đã động viên An/.test(l)));
  assert.ok([...friendsA, ...friendsB].every((l) => !/xếp hạng|leaderboard|top/i.test(l)), 'không có xếp hạng');
  await Promise.all([a.leave(), b.leave()]);
});
