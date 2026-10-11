import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ColyseusTestServer } from '@colyseus/testing';
import { groupQuestTarget } from '@24h/domain';
import { LifeEngine } from './engine.js';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';
import { ROOM_NAME } from './protocol.js';

let colyseus: ColyseusTestServer;
before(async () => {
  colyseus = await bootOn(createServer({ timing: { planningMs: 5000, nightMs: 100, morningMs: 500, reconnectMs: 500 } }), 2586);
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

/** Một hành vi đủ điều kiện của nhiệm vụ chung đang bốc cho phòng này */
const qualifying = (engine: LifeEngine): string => engine.groupQuest.def.actionIds[0];
/** Cho người chơi đã làm đủ giờ hành vi đủ điều kiện (ghi thẳng vào hôm nay) */
function giveHours(engine: LifeEngine, id: string, hours: number): void {
  const p = engine.players.get(id)!;
  const action = qualifying(engine);
  const per = (engine.groupQuestView().label, 1);
  const times = Math.ceil(hours / per);
  p.state = { ...p.state, actionsTodayIds: [...p.state.actionsTodayIds, ...Array(times).fill(action)] };
}

test('nhiệm vụ chung: mỗi phòng có một nhiệm vụ cố định theo seed, ban đầu chưa có tiến độ', () => {
  const a = new LifeEngine('room-seed-1');
  const b = new LifeEngine('room-seed-1');
  assert.equal(a.groupQuest.def.id, b.groupQuest.def.id);
  a.addPlayer('p1', 'An', 0);
  a.updateGroupContributions();
  const v = a.groupQuestView();
  assert.equal(v.progress, 0);
  assert.equal(v.done, false);
  assert.deepEqual(v.contributors, []);
  assert.equal(a.checkGroupQuestDone(), false);
});

test('nhiệm vụ chung: đóng góp của mọi người cộng dồn, rời phòng không làm tụt, bot không đóng góp', () => {
  const engine = new LifeEngine('room-seed-2');
  engine.addPlayer('a', 'An', 0);
  engine.addPlayer('b', 'Binh', 0);
  const action = qualifying(engine);
  const hoursOfOne = engine.groupQuest.def.actionIds.length > 0 ? 1 : 0;
  assert.ok(hoursOfOne);

  const pa = engine.players.get('a')!;
  const pb = engine.players.get('b')!;
  pa.state = { ...pa.state, actionsTodayIds: [action] };
  pb.state = { ...pb.state, actionsTodayIds: [action, action] };
  engine.updateGroupContributions();
  const t1 = engine.groupQuestTotal();
  assert.ok(t1 > 0);
  const v = engine.groupQuestView();
  assert.equal(v.contributors[0].name, 'Binh', 'người đóng góp nhiều nhất đứng đầu');
  assert.equal(v.contributors.length, 2);

  // An rời phòng: phần đã đóng góp vẫn còn
  engine.removePlayer('a');
  engine.updateGroupContributions();
  assert.equal(engine.groupQuestTotal(), t1, 'rời phòng không làm tụt tiến độ');

  // Binh thành bot: không đóng góp thêm
  pb.bot = true;
  pb.state = { ...pb.state, actionsTodayIds: [action, action, action, action] };
  engine.updateGroupContributions();
  assert.equal(engine.groupQuestTotal(), t1, 'bot không đóng góp thêm');
});

test('nhiệm vụ chung: đạt mục tiêu thì chốt đúng một lần, thưởng mọi người chơi thật còn đang chơi', () => {
  const engine = new LifeEngine('room-seed-3');
  engine.addPlayer('a', 'An', 0);
  engine.addPlayer('b', 'Binh', 0);
  engine.addPlayer('c', 'Bot', 0);
  engine.players.get('c')!.bot = true;
  const pb = engine.players.get('b')!;
  pb.state = { ...pb.state, finished: true };
  const target = groupQuestTarget(engine.groupQuest.def, 3);
  giveHours(engine, 'a', target + 2);
  assert.equal(engine.checkGroupQuestDone(), true);
  assert.equal(engine.checkGroupQuestDone(), false, 'chỉ báo hoàn thành một lần');
  assert.equal(engine.groupQuestView().done, true);
  assert.equal(engine.groupQuestView().progress, 1);

  const before = engine.players.get('a')!.state.stats;
  const rewarded = engine.applyGroupQuestReward();
  assert.deepEqual(rewarded, ['a'], 'bot và người đã xong ván không nhận');
  const r = engine.groupQuest.def.reward;
  assert.equal(engine.players.get('a')!.state.stats.mental, Math.min(100, before.mental + r.mental));
});

test('phòng: private_state mang nhiệm vụ chung; tiến độ của người này tới người kia; hoàn thành thì cả phòng nhận thưởng và thông báo', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  const statesA = inbox<any>(a, 'private_state');
  const statesB = inbox<any>(b, 'private_state');
  const doneA = inbox<any>(a, 'group_quest_done');
  const doneB = inbox<any>(b, 'group_quest_done');
  a.send('action', { actionId: 'sleep_nap' });
  await waitUntil(() => statesA.length >= 1 && statesB.length >= 1, 3000, 'private_state đầu tiên');
  assert.ok(statesA[0].groupQuest, 'có nhiệm vụ chung');
  assert.equal(statesA[0].groupQuest.id, statesB[0].groupQuest.id, 'cả phòng cùng một nhiệm vụ');
  assert.equal(statesA[0].groupQuest.done, false);

  // Binh làm hành vi đủ điều kiện (ghi thẳng vào state phía server) rồi gửi lại trạng thái
  const engine = (room as any).engine as LifeEngine;
  const target = groupQuestTarget(engine.groupQuest.def, 2);
  const countB = statesB.length;
  const sessB = engine.players.get(b.sessionId)!;
  sessB.state = { ...sessB.state, actionsTodayIds: [...sessB.state.actionsTodayIds, qualifying(engine)] };
  (room as any).pushPrivate(b.sessionId);
  await waitUntil(() => statesA.some((s) => s.groupQuest.contributors.some((c: any) => c.name === 'Binh')), 3000, 'An thấy đóng góp của Binh');
  assert.ok(statesB.length > countB);
  assert.equal(doneA.length, 0, 'chưa đủ thì chưa báo hoàn thành');

  // Đủ giờ: hoàn thành, thưởng cho cả hai, báo cả phòng đúng một lần
  const mentalBefore = engine.players.get(a.sessionId)!.state.stats.mental;
  giveHours(engine, b.sessionId, target + 2);
  (room as any).pushPrivate(b.sessionId);
  await waitUntil(() => doneA.length === 1 && doneB.length === 1, 3000, 'thông báo hoàn thành');
  assert.ok(doneA[0].reward.includes('Tinh thần'));
  assert.equal(statesA[statesA.length - 1].groupQuest.done, true);
  assert.ok(engine.players.get(a.sessionId)!.state.stats.mental >= Math.min(100, mentalBefore + 1), 'An cũng nhận thưởng dù không đóng góp');
  (room as any).pushPrivate(b.sessionId);
  await sleep(150);
  assert.equal(doneA.length, 1, 'không báo lần hai');
  await a.leave();
  await b.leave();
});

test('phòng: có người vào thì mục tiêu tăng và người đang ở trong phòng cũng thấy ngay (dù chưa ai đóng góp)', { timeout: 15000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const a = await colyseus.sdk.joinById(room.roomId, { name: 'An' });
  const statesA = inbox<any>(a, 'private_state');
  await waitUntil(() => statesA.length >= 1, 3000, 'private_state đầu tiên');
  const def = (room as any).engine.groupQuest.def;
  assert.ok(statesA[0].groupQuest.label.endsWith(`/${groupQuestTarget(def, 1)} giờ`), statesA[0].groupQuest.label);

  const b = await colyseus.sdk.joinById(room.roomId, { name: 'Binh' });
  await waitUntil(() => room.state.players.size === 2);
  await waitUntil(() => statesA.some((s) => s.groupQuest.label.endsWith(`/${groupQuestTarget(def, 2)} giờ`)), 3000, 'An thấy mục tiêu mới cho 2 người');
  await a.leave();
  await b.leave();
});
