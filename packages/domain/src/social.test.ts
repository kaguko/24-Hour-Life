import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN_ACTIONS, PLAYABLE_ACTIONS, executeActionById } from './actions.js';
import { JOINT_ACTIONS, jointActionDef } from './jointActions.js';
import { locationOf } from './map.js';
import { mulberry32 } from './rng.js';
import { runDomainSimulation } from './simulate.js';
import { runGroupSimulation } from './simulateGroup.js';
import { newPlayerState, type PlayerState } from './gameState.js';
import {
  MAX_ENCOURAGEMENTS_PER_DAY,
  encourage,
  jointSocialGain,
  offerPressure,
  peerPressureChance,
  resolveJointAction,
} from './social.js';
import { applyStatDeltas } from './stats.js';

const player = (patch: Partial<PlayerState> = {}): PlayerState => ({ ...newPlayerState([], { id: 'exam', difficulty: 1 }), ...patch });
/** Giữa ngày (11h) và đang ở nhà: mọi hành vi chung (trừ nhậu/phim tối) đang trong khung giờ */
const midday = (patch: Partial<PlayerState> = {}) => player({ hoursUsed: 4, ...patch });
const evening = (patch: Partial<PlayerState> = {}) => player({ hoursUsed: 11, ...patch }); // 18h

test('6 hành vi chung: nằm trong DOMAIN_ACTIONS nhưng không phải hành vi chơi một mình', () => {
  assert.equal(JOINT_ACTIONS.length, 6);
  for (const a of JOINT_ACTIONS) {
    assert.ok(a.joint && a.joint.minPlayers >= 2 && a.joint.maxPlayers >= a.joint.minPlayers, a.id);
    assert.ok(DOMAIN_ACTIONS.some((x) => x.id === a.id), `${a.id} có trong DOMAIN_ACTIONS`);
    assert.ok(!PLAYABLE_ACTIONS.some((x) => x.id === a.id), `${a.id} không có trong PLAYABLE_ACTIONS`);
    const solo = executeActionById(a.id, player().stats, 24, [], 1, [], mulberry32(1));
    assert.equal(solo.success, false, `${a.id} không làm một mình được`);
  }
  assert.equal(locationOf('drinking_group'), 'bar');
  assert.equal(locationOf('movie_night'), 'home');
});

test('cân bằng: hành vi chung lành mạnh cho nhiều Kết nối hơn bản làm một mình và tăng theo số người', () => {
  const analogs: Record<string, string> = {
    eat_together: 'fast_food',
    run_together: 'exercise',
    study_group: 'study_deep',
    heart_to_heart: 'deep_talk',
    movie_night: 'binge_series',
  };
  for (const [jointId, soloId] of Object.entries(analogs)) {
    const solo = PLAYABLE_ACTIONS.find((a) => a.id === soloId)!;
    const max = jointActionDef(jointId)!.joint!.maxPlayers;
    assert.ok(jointSocialGain(jointId, 2) > (solo.baseSocial ?? 0), `${jointId} (n=2) > ${soloId} một mình`);
    for (let n = 3; n <= max; n++) assert.ok(jointSocialGain(jointId, n) > jointSocialGain(jointId, n - 1), `${jointId} tăng theo n`);
  }
});

test('cân bằng: nhậu nhóm tốn hơn nhậu một mình ở mỗi người và tốn thêm khi đông', () => {
  const beer = PLAYABLE_ACTIONS.find((a) => a.id === 'beer_party')!;
  const state = (n: number) => {
    const members = Array.from({ length: n }, () => evening({ stats: applyStatDeltas(player().stats, { willpower: 100, energy: 100, money: 3000 }) }));
    // rng = 0.999 => không ai sa ngã thêm: so sánh thuần công thức
    return resolveJointAction(members, 'drinking_group', () => 0.999).outcomes[0];
  };
  const before = applyStatDeltas(player().stats, { willpower: 100, energy: 100, money: 3000 });
  let prev = { energy: 0, money: 0, willpower: 0 };
  for (let n = 3; n <= 6; n++) {
    const o = state(n);
    assert.ok(o.ok, `n=${n} làm được`);
    const d = { energy: o.state.stats.energy - before.energy, money: o.state.stats.money - before.money, willpower: o.state.stats.willpower - before.willpower };
    assert.ok(d.energy < (beer.baseEnergy ?? 0) || n === 3, `n=${n}: năng lượng`);
    assert.ok(d.money < (beer.baseMoney ?? 0), `n=${n}: tiền tốn hơn nhậu một mình`);
    assert.ok(d.willpower < (beer.baseWillpower ?? 0), `n=${n}: ý chí tốn hơn nhậu một mình`);
    if (n > 3) assert.ok(d.money < prev.money && d.willpower < prev.willpower, `n=${n}: tốn hơn n=${n - 1}`);
    prev = d;
  }
});

test('resolveJointAction: đủ người thì cả nhóm cùng nhận Kết nối và tốn giờ (kể cả đi đường)', () => {
  const states = [midday(), midday()];
  const res = resolveJointAction(states, 'eat_together', mulberry32(1));
  assert.ok(res.ok);
  for (const o of res.outcomes) {
    assert.ok(o.ok);
    assert.equal(o.state.location, 'market');
    assert.ok(o.state.hoursUsed > states[0].hoursUsed + 1.5 - 1e-9, 'tốn giờ làm + đi đường');
    assert.ok(o.state.actionsTodayIds.includes('eat_together'));
    assert.equal(o.state.stats.social, Math.min(100, states[0].stats.social + jointSocialGain('eat_together', 2)));
  }
  assert.equal(states[0].hoursUsed, 4, 'không mutate đầu vào');
});

test('resolveJointAction: thiếu người hoặc quá đông thì không ai bị đổi gì', () => {
  const one = resolveJointAction([midday()], 'eat_together', mulberry32(1));
  assert.equal(one.ok, false);
  assert.equal(one.outcomes[0].ok, false);

  const crowd = resolveJointAction(Array.from({ length: 5 }, () => midday()), 'eat_together', mulberry32(1));
  assert.equal(crowd.ok, false);

  // một người đã xong ván nên không đủ min 2
  const finished = resolveJointAction([midday(), midday({ finished: true })], 'eat_together', mulberry32(1));
  assert.equal(finished.ok, false);
  assert.equal(finished.outcomes[1].reason, 'Ván đã kết thúc.');

  // nhậu cần 3 người
  assert.equal(resolveJointAction([evening(), evening()], 'drinking_group', mulberry32(1)).ok, false);
  assert.equal(resolveJointAction([evening(), evening(), evening()], 'drinking_group', mulberry32(1)).ok, true);
});

test('resolveJointAction: người không làm được bị loại, nhóm còn đủ thì vẫn chạy', () => {
  // study_group (school mở 7-21): người thứ ba đã quá giờ nên bị loại
  const late = player({ hoursUsed: 16 }); // 23h
  const res = resolveJointAction([midday(), midday(), late], 'study_group', mulberry32(1));
  assert.ok(res.ok);
  assert.equal(res.outcomes.filter((o) => o.ok).length, 2);
  assert.equal(res.outcomes[2].ok, false);
  assert.equal(res.outcomes[2].state, late, 'người bị loại giữ nguyên trạng thái');
  // Kết nối tính theo số người thực sự tham gia (2), không phải 3
  assert.equal(res.outcomes[0].state.stats.social, Math.min(100, midday().stats.social + jointSocialGain('study_group', 2)));
});

test('áp lực đồng trang lứa: tăng khi ý chí thấp và khi nhóm đông; sa ngã thì ở lại thêm và tốn thêm', () => {
  assert.equal(peerPressureChance(100, 6, 6), 0);
  assert.equal(peerPressureChance(0, 1, 6), 0);
  assert.ok(peerPressureChance(10, 5, 6) > peerPressureChance(10, 3, 6));
  assert.ok(peerPressureChance(10, 4, 6) > peerPressureChance(40, 4, 6));

  const weak = () => evening({ stats: applyStatDeltas(player().stats, { willpower: -60 }) });
  const members = [weak(), weak(), weak(), weak()];
  const fell = resolveJointAction(members, 'drinking_group', () => 0).outcomes; // rng = 0: luôn sa ngã
  const held = resolveJointAction(members, 'drinking_group', () => 0.999).outcomes; // rng ~ 1: không ai sa ngã
  assert.ok(fell.every((o) => o.fellForPressure));
  assert.ok(held.every((o) => !o.fellForPressure));
  assert.ok(fell[0].hoursSpent > held[0].hoursSpent);
  assert.ok(fell[0].state.stats.money < held[0].state.stats.money);
  assert.ok(fell[0].state.stats.willpower <= held[0].state.stats.willpower);

  const strong = evening({ stats: applyStatDeltas(player().stats, { willpower: 40 }) });
  assert.ok(resolveJointAction([strong, strong, strong], 'drinking_group', () => 0).outcomes.every((o) => !o.fellForPressure), 'ý chí cao không bị kéo');
});

test('lời rủ cám dỗ chỉ kéo người ý chí thấp; hành vi lành mạnh không kéo ai', () => {
  assert.equal(offerPressure('drinking_group', 80), 0);
  assert.ok(offerPressure('drinking_group', 10) < 0);
  assert.ok(offerPressure('drinking_group', 10) <= offerPressure('drinking_group', 35));
  assert.equal(offerPressure('eat_together', 0), 0);
  assert.equal(offerPressure('beer_party', 0), 0, 'chỉ áp dụng cho hành vi chung');
});

test('tất định: cùng seed => cùng kết quả', () => {
  const run = (seed: number) =>
    JSON.stringify(
      resolveJointAction(
        Array.from({ length: 4 }, () => evening({ stats: applyStatDeltas(player().stats, { willpower: -50 }) })),
        'drinking_group',
        mulberry32(seed)
      )
    );
  for (let seed = 1; seed <= 20; seed++) assert.equal(run(seed), run(seed));
  assert.ok(new Set(Array.from({ length: 20 }, (_, i) => run(i + 1))).size > 1, 'seed khác nhau cho kết quả khác nhau');
});

test('động viên: người nhận hồi ý chí, người gửi thêm Kết nối, có giới hạn mỗi ngày', () => {
  const a = player({ stats: applyStatDeltas(player().stats, { willpower: -40, social: -30 }) });
  const b = player({ stats: applyStatDeltas(player().stats, { willpower: -40 }) });
  const r = encourage(a, b, 0);
  assert.ok(r.ok);
  assert.ok(r.target.stats.willpower > b.stats.willpower);
  assert.ok(r.sender.stats.social > a.stats.social);
  assert.equal(encourage(a, b, MAX_ENCOURAGEMENTS_PER_DAY).ok, false);
  assert.equal(encourage(a, player({ finished: true }), 0).ok, false);
});

// ---- Mô phỏng nhóm: kiểm tra cân bằng tổng thể ----
const RUNS = 1000;

test('mô phỏng: chơi nhóm cho nhiều Kết nối hơn chơi một mình', () => {
  const solo = runDomainSimulation('balanced', RUNS, 7, mulberry32(11));
  const group = runGroupSimulation(['balanced', 'balanced', 'balanced', 'balanced'], RUNS, 7, mulberry32(11));
  assert.ok(group.slots[0].avgFinalSocial >= solo.avgFinalSocial + 15, `nhóm ${group.slots[0].avgFinalSocial} vs một mình ${solo.avgFinalSocial}`);
});

test('mô phỏng: nhóm toàn cám dỗ sụp đổ sớm hơn nhóm lành mạnh', () => {
  const healthy = runGroupSimulation(['balanced', 'balanced', 'balanced', 'balanced'], RUNS, 7, mulberry32(22)).slots[0];
  for (const id of ['party_animal', 'dopamine_chaser']) {
    const tempted = runGroupSimulation([id, id, id, id], RUNS, 7, mulberry32(22)).slots[0];
    assert.ok(tempted.avgSurvivedDays < healthy.avgSurvivedDays, `${id}: ${tempted.avgSurvivedDays} < ${healthy.avgSurvivedDays} ngày`);
    assert.ok(tempted.survivalRate < healthy.survivalRate, `${id}: tỉ lệ sống ${tempted.survivalRate}% < ${healthy.survivalRate}%`);
    assert.ok(tempted.avgFinalMoney < healthy.avgFinalMoney, `${id}: nhậu nhóm tốn tiền hơn`);
  }
});

test('mô phỏng: ngồi một mình không thắng: không chiến lược nào sống tốt hơn Balanced khi cả bàn là Balanced', () => {
  const table = runGroupSimulation(['dopamine_chaser', 'workaholic', 'pure_sleeper', 'party_animal', 'balanced'], RUNS, 7, mulberry32(33));
  const balanced = table.slots.find((s) => s.strategyId === 'balanced')!;
  for (const s of table.slots) {
    assert.ok(s.survivalRate <= balanced.survivalRate, `${s.strategyId} ${s.survivalRate}% > balanced ${balanced.survivalRate}%`);
  }
  const sleeper = table.slots.find((s) => s.strategyId === 'pure_sleeper')!;
  assert.ok(sleeper.avgFinalSocial < balanced.avgFinalSocial, 'người tách biệt có ít Kết nối hơn');
});
