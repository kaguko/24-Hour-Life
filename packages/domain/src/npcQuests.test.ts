import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPC_QUESTS, npcQuestForGiver, npcQuestOf, npcQuestPlaces, npcQuestView, objectiveMet, rewardText, type NpcQuestState } from './npcQuests.js';
import { PLAYABLE_ACTIONS } from './actions.js';
import { LOCATION_IDS, locationOf } from './map.js';

const state = (id: string, extra: Partial<NpcQuestState> = {}): NpcQuestState => ({ id, acceptedCount: 0, met: false, ...extra });

test('danh mục việc nhờ: id và người giao duy nhất, câu chữ đầy đủ, thưởng nhẹ', () => {
  assert.equal(new Set(NPC_QUESTS.map((q) => q.id)).size, NPC_QUESTS.length);
  assert.equal(new Set(NPC_QUESTS.map((q) => q.giverId)).size, NPC_QUESTS.length, 'mỗi cư dân một việc');
  for (const q of NPC_QUESTS) {
    assert.ok(q.title && q.ask && q.reminder && q.thanks && q.giverName && q.giverEmoji, q.id);
    assert.ok(q.ask.startsWith(q.giverName), `${q.id}: lời nhờ nên mở đầu bằng tên người nói`);
    const total = Object.values(q.reward).reduce((s, v) => s + (v ?? 0), 0);
    assert.ok(total > 0 && total <= 60, `${q.id}: thưởng ${total}`);
    for (const [k, v] of Object.entries(q.reward)) assert.ok((v ?? 0) > 0 && (k !== 'money' || (v ?? 0) <= 60), `${q.id}.${k}`);
    assert.equal(npcQuestOf(q.id), q);
    assert.equal(npcQuestForGiver(q.giverId), q);
  }
});

test('mục tiêu trỏ tới hành vi và địa điểm có thật', () => {
  const ids = new Set(PLAYABLE_ACTIONS.map((a) => a.id));
  for (const q of NPC_QUESTS) {
    const o = q.objective;
    assert.ok(o.label, q.id);
    if (o.kind === 'visit') {
      assert.ok(LOCATION_IDS.includes(o.place) && o.place !== 'home', `${q.id}: nơi ghé`);
    } else {
      assert.ok(o.actionIds.length >= 1, q.id);
      for (const a of o.actionIds) assert.ok(ids.has(a), `${q.id}: hành vi ${a} không có`);
    }
    const places = npcQuestPlaces(q);
    assert.ok(places.length >= 1 && places.every((p) => LOCATION_IDS.includes(p) && p !== 'home'), q.id);
  }
});

test('mục tiêu hành vi: chỉ tính hành vi làm SAU lúc nhận việc', () => {
  const q = npcQuestOf('q_hung_run')!;
  const all = ['work_focused', 'exercise', 'sleep_deep'];
  assert.equal(objectiveMet(q, state(q.id, { acceptedCount: 2 }), { location: 'home', allActionIds: all }), false, 'không tính buổi tập cũ');
  assert.equal(objectiveMet(q, state(q.id, { acceptedCount: 0 }), { location: 'home', allActionIds: all }), true);
  assert.equal(objectiveMet(q, state(q.id, { acceptedCount: 3 }), { location: 'home', allActionIds: [...all, 'short_walk'] }), true, 'đi bộ cũng được');
  assert.equal(objectiveMet(q, state(q.id, { acceptedCount: 3 }), { location: 'home', allActionIds: [...all, 'binge_series'] }), false);
});

test('mục tiêu ghé nơi: đúng nơi mới tính; nhận việc đang ở đó thì phải rời đi rồi quay lại; đã chốt thì giữ', () => {
  const q = npcQuestOf('q_batu_market')!;
  assert.equal(objectiveMet(q, state(q.id), { location: 'park', allActionIds: [] }), false);
  assert.equal(objectiveMet(q, state(q.id), { location: 'market', allActionIds: [] }), true);
  assert.equal(objectiveMet(q, state(q.id, { waitLeave: true }), { location: 'market', allActionIds: [] }), false);
  assert.equal(objectiveMet(q, state(q.id, { waitLeave: false }), { location: 'market', allActionIds: [] }), true);
  assert.equal(objectiveMet(q, state(q.id, { met: true }), { location: 'home', allActionIds: [] }), true, 'đã chốt thì không mất');
});

test('npcQuestView và rewardText', () => {
  const q = npcQuestOf('q_tam_school')!;
  const active = npcQuestView(state(q.id))!;
  assert.equal(active.status, 'active');
  assert.deepEqual(active.places, ['school']);
  assert.equal(active.giverId, 'tam');
  assert.ok(/Tiền \+40k/.test(active.reward));
  const ready = npcQuestView(state(q.id, { met: true }))!;
  assert.equal(ready.status, 'ready');
  assert.deepEqual(ready.places, [], 'xong rồi thì không còn nơi cần đi');
  assert.ok(ready.objective.includes('Chú Tám'));
  assert.equal(npcQuestView(state('khong_co')), null);
  assert.equal(rewardText({ mental: 3, money: -10 }), 'Tinh thần +3, Tiền -10k');
  assert.equal(locationOf('gym_session'), 'gym');
});
