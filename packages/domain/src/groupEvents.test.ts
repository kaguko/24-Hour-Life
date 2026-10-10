import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUP_EVENT_CHANCE, applyGroupEvent, rollGroupEvent, workHoursToday, type GroupEventId } from './groupEvents.js';
import { newPlayerState, type PlayerState } from './gameState.js';
import { mulberry32 } from './rng.js';
import { applyStatDeltas } from './stats.js';
import { runGroupSimulation } from './simulateGroup.js';

const player = (patch: Partial<PlayerState> = {}): PlayerState => ({ ...newPlayerState([], { id: 'exam', difficulty: 1 }), ...patch });
const names = ['An', 'Binh', 'Cuong'];
const none = () => false;

test('rollGroupEvent: cần ít nhất 2 người; tần suất đúng; đủ 3 loại biến cố', () => {
  assert.equal(rollGroupEvent(1, () => 0), null);
  assert.equal(rollGroupEvent(0, () => 0), null);
  const rng = mulberry32(5);
  const seen = new Map<string, number>();
  let hits = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const e = rollGroupEvent(3, rng);
    if (e) {
      hits++;
      seen.set(e, (seen.get(e) ?? 0) + 1);
    }
  }
  assert.ok(Math.abs(hits / N - GROUP_EVENT_CHANCE) < 0.04, `tần suất ${hits / N}`);
  assert.equal(seen.size, 3);
});

test('friend_crisis: nạn nhân chịu nặng, có bạn ở bên cạnh thì nhẹ hơn và người ở bên cạnh được Kết nối', () => {
  const states = [player(), player(), player()];
  const alone = applyGroupEvent('friend_crisis', states, names, none, mulberry32(1));
  const victim = alone.victim!;
  assert.ok(victim >= 0 && victim < 3);
  const baseMental = states[0].stats.mental;
  assert.ok(alone.states[victim].stats.mental < baseMental - 15, 'không ai bên cạnh: nặng');
  assert.ok(alone.notes[victim][0].includes('không ai ở bên cạnh'));

  const supported = applyGroupEvent('friend_crisis', states, names, () => true, mulberry32(1));
  assert.equal(supported.victim, victim, 'cùng seed => cùng nạn nhân');
  assert.ok(supported.states[victim].stats.mental > alone.states[victim].stats.mental, 'có bạn bên cạnh thì nhẹ hơn');
  const helper = [0, 1, 2].find((i) => i !== victim)!;
  assert.ok(supported.states[helper].stats.social >= states[helper].stats.social, 'người ở bên cạnh được Kết nối (đã chạm trần 100 thì giữ nguyên)');
  assert.ok(supported.notes[helper][0].includes(names[victim]));
  assert.ok(alone.notes[helper][0].includes('không kịp'));
});

test('friend_crisis: người đã xong ván không bị ảnh hưởng, không bị chọn làm nạn nhân', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const states = [player({ finished: true }), player(), player()];
    const out = applyGroupEvent('friend_crisis', states, names, none, mulberry32(seed));
    assert.notEqual(out.victim, 0);
    assert.deepEqual(out.states[0], states[0]);
    assert.deepEqual(out.notes[0], []);
  }
});

test('surprise_party: ai cũng tốn tiền; ý chí thấp thì thiệt hại nặng hơn', () => {
  const strong = player();
  const weak = player({ stats: applyStatDeltas(player().stats, { willpower: -40 }) });
  const out = applyGroupEvent('surprise_party', [strong, weak], names, none, mulberry32(1));
  for (const i of [0, 1]) assert.ok(out.states[i].stats.money < [strong, weak][i].stats.money);
  const dMentalStrong = out.states[0].stats.mental - strong.stats.mental;
  const dMentalWeak = out.states[1].stats.mental - weak.stats.mental;
  assert.ok(dMentalWeak < dMentalStrong, 'ý chí thấp thiệt hại tinh thần nặng hơn');
  assert.ok(out.notes[1][0].includes('không từ chối nổi'));
});

test('group_deadline: ai làm việc đủ 2 giờ trong ngày thì kịp, ai chưa thì bị phạt', () => {
  const prepared = player({ actionsTodayIds: ['work_focused'] }); // 4 giờ
  const unprepared = player();
  assert.ok(workHoursToday(prepared) >= 2);
  assert.equal(workHoursToday(unprepared), 0);
  const out = applyGroupEvent('group_deadline', [prepared, unprepared], names, none, mulberry32(1));
  assert.deepEqual(out.states[0].stats, prepared.stats, 'đã chuẩn bị: không mất gì');
  assert.ok(out.states[1].stats.mental < unprepared.stats.mental && out.states[1].stats.money < unprepared.stats.money);
});

test('không đổi đầu vào, tất định theo seed, mọi biến cố đều kể được chuyện cho từng người còn chơi', () => {
  const states = [player(), player(), player()];
  const frozen = JSON.stringify(states);
  for (const id of ['friend_crisis', 'surprise_party', 'group_deadline'] as GroupEventId[]) {
    const a = applyGroupEvent(id, states, names, none, mulberry32(9));
    const b = applyGroupEvent(id, states, names, none, mulberry32(9));
    assert.deepEqual(a, b);
    assert.ok(a.notes.every((n) => n.length >= 1), `${id}: ai cũng có dòng kể`);
  }
  assert.equal(JSON.stringify(states), frozen);
});

const RUNS = 600;

test('mô phỏng: biến cố nhóm làm khó những ai sống thiếu điều độ, nhưng bạn bè kéo nhau lên', () => {
  const withEv = runGroupSimulation(['party_animal', 'party_animal', 'party_animal', 'party_animal'], RUNS, 7, mulberry32(7)).slots[0];
  const noEv = runGroupSimulation(['party_animal', 'party_animal', 'party_animal', 'party_animal'], RUNS, 7, mulberry32(7), { groupEvents: false }).slots[0];
  assert.ok(withEv.survivalRate < noEv.survivalRate, `có biến cố ${withEv.survivalRate}% < không ${noEv.survivalRate}%`);

  // một mình giữa những người lành mạnh sống tốt hơn cả bàn toàn cám dỗ
  const chaserAlone = runGroupSimulation(['dopamine_chaser', 'dopamine_chaser', 'dopamine_chaser', 'dopamine_chaser'], RUNS, 7, mulberry32(8)).slots[0];
  const chaserWithFriends = runGroupSimulation(['dopamine_chaser', 'balanced', 'balanced', 'balanced'], RUNS, 7, mulberry32(8)).slots[0];
  assert.ok(chaserWithFriends.avgSurvivedDays > chaserAlone.avgSurvivedDays + 0.5, `${chaserWithFriends.avgSurvivedDays} > ${chaserAlone.avgSurvivedDays}`);
});

test('mô phỏng: không chiến lược nào vượt Balanced; Balanced vẫn là cách sống an toàn nhất (ghi nhận, không phải lỗi)', () => {
  const table = runGroupSimulation(['dopamine_chaser', 'workaholic', 'pure_sleeper', 'party_animal', 'balanced'], RUNS, 7, mulberry32(33));
  const balanced = table.slots.find((s) => s.strategyId === 'balanced')!;
  for (const s of table.slots) assert.ok(s.survivalRate <= balanced.survivalRate, `${s.strategyId} ${s.survivalRate}% > balanced ${balanced.survivalRate}%`);
  const lonely = table.slots.find((s) => s.strategyId === 'pure_sleeper')!;
  assert.ok(lonely.avgFinalSocial < balanced.avgFinalSocial);
});
