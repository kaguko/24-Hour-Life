import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUP_QUESTS, groupQuestContribution, groupQuestOf, groupQuestTarget, groupQuestView, pickGroupQuest } from './groupQuests.js';
import { DOMAIN_ACTIONS } from './actions.js';
import { LOCATION_IDS } from './map.js';
import { mulberry32 } from './rng.js';

const def = (id: string) => groupQuestOf(id)!;

test('danh mục nhiệm vụ chung: id duy nhất, hành vi và địa điểm có thật, thưởng nhẹ', () => {
  assert.equal(new Set(GROUP_QUESTS.map((q) => q.id)).size, GROUP_QUESTS.length);
  const ids = new Set(DOMAIN_ACTIONS.map((a) => a.id));
  for (const q of GROUP_QUESTS) {
    assert.ok(q.title && q.description && q.doneLine && q.emoji, q.id);
    assert.ok(q.base >= 4 && q.base <= 12, `${q.id}: mục tiêu 1 người làm được trong tuần`);
    assert.ok(q.places.length >= 1 && q.places.every((p) => LOCATION_IDS.includes(p)), q.id);
    assert.ok(q.actionIds.length >= 4, q.id);
    for (const a of q.actionIds) assert.ok(ids.has(a), `${q.id}: hành vi ${a} không có`);
    const r = q.reward;
    assert.ok(r.mental > 0 && r.social > 0 && r.willpower > 0 && r.mental + r.social + r.willpower <= 20, q.id);
  }
});

test('mục tiêu tăng theo số người nhưng không tăng quá nhanh', () => {
  const q = def('g_move');
  assert.equal(groupQuestTarget(q, 1), q.base);
  assert.equal(groupQuestTarget(q, 0), q.base, 'tối thiểu 1 người');
  let prev = 0;
  for (let n = 1; n <= 8; n++) {
    const t = groupQuestTarget(q, n);
    assert.ok(t > prev, `n=${n}`);
    prev = t;
  }
  assert.ok(groupQuestTarget(q, 8) < q.base * 8, 'mỗi người gánh nhẹ hơn khi phòng đông');
  assert.ok(groupQuestTarget(q, 4) / 4 < q.base, 'bình quân mỗi người cần ít hơn khi đi nhóm');
});

test('đóng góp = tổng giờ các hành vi đủ điều kiện, bỏ qua hành vi khác', () => {
  const q = def('g_move');
  const hours = (id: string) => DOMAIN_ACTIONS.find((a) => a.id === id)!.hours;
  assert.equal(groupQuestContribution(q, []), 0);
  assert.equal(groupQuestContribution(q, ['binge_series', 'sleep_deep']), 0);
  assert.equal(groupQuestContribution(q, ['exercise', 'binge_series', 'gym_session']), hours('exercise') + hours('gym_session'));
  assert.equal(groupQuestContribution(q, ['exercise', 'exercise']), hours('exercise') * 2, 'lặp lại vẫn tính');
  assert.ok(groupQuestContribution(q, ['run_together']) > 0, 'hành vi chung cũng tính');
});

test('view: tiến độ, nhãn, người đóng góp nhiều nhất đứng đầu, hoàn thành', () => {
  const q = def('g_study');
  const v0 = groupQuestView(q, [{ name: 'An', amount: 0 }, { name: 'Binh', amount: 0 }], 2);
  assert.equal(v0.progress, 0);
  assert.equal(v0.done, false);
  assert.deepEqual(v0.contributors, [], 'chưa ai đóng góp thì không liệt kê');

  const target = groupQuestTarget(q, 2);
  const half = groupQuestView(q, [{ name: 'An', amount: target * 0.3 }, { name: 'Binh', amount: target * 0.2 }], 2);
  assert.ok(Math.abs(half.progress - 0.5) < 1e-9);
  assert.equal(half.contributors[0].name, 'An');
  assert.ok(half.label.endsWith(`/${target} giờ`), half.label);

  const done = groupQuestView(q, [{ name: 'An', amount: target }, { name: 'Binh', amount: 5 }], 2);
  assert.equal(done.done, true);
  assert.equal(done.progress, 1, 'không vượt quá 100%');

  // đã chốt hoàn thành: giữ nguyên dù có người rời phòng làm tổng tụt
  const kept = groupQuestView(q, [{ name: 'An', amount: 1 }], 1, true);
  assert.equal(kept.done, true);
  assert.equal(kept.progress, 1);
});

test('đếm theo số người từng đóng góp kể cả khi đã rời phòng', () => {
  const q = def('g_calm');
  const entries = [{ name: 'An', amount: 1 }, { name: 'Binh', amount: 1 }, { name: 'Cuong', amount: 1 }];
  const withLeaver = groupQuestView(q, entries, 2);
  assert.ok(withLeaver.label.endsWith(`/${groupQuestTarget(q, 3)} giờ`), 'mục tiêu theo 3 người dù hiện còn 2');
});

test('pickGroupQuest: cùng seed => cùng nhiệm vụ, và có nhiều loại', () => {
  for (let s = 1; s <= 30; s++) assert.equal(pickGroupQuest(mulberry32(s)).id, pickGroupQuest(mulberry32(s)).id);
  assert.ok(new Set(Array.from({ length: 40 }, (_, i) => pickGroupQuest(mulberry32(i + 1)).id)).size >= 2);
});
