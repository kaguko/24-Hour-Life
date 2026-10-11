import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng.js';
import { INITIAL_STATS } from './stats.js';
import { DOMAIN_ACTIONS, executeActionById } from './actions.js';
import { TRAITS, TRAITS_PER_RUN, applyTraits, combineTraitMods, isTraitId, pickTraitIds } from './traits.js';
import { cravingActionIds, cravingLevel } from './craving.js';
import { intrusionChance } from './intrusion.js';
import { createPlayerState, newPlayerState, rollDayEvents } from './gameState.js';
import { BIG_EVENT_IDS } from './bigEvents.js';

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

test('pickTraitIds: cùng seed => cùng nét, đủ số lượng, không trùng, không mâu thuẫn', () => {
  const conflict = [['night_owl', 'early_bird'], ['introvert', 'extrovert'], ['addictive', 'disciplined']];
  for (const seed of SEEDS) {
    const a = pickTraitIds(mulberry32(seed));
    assert.deepEqual(a, pickTraitIds(mulberry32(seed)));
    assert.equal(a.length, TRAITS_PER_RUN);
    assert.equal(new Set(a).size, a.length);
    assert.ok(a.every(isTraitId));
    for (const g of conflict) assert.ok(!(g.every((id) => a.includes(id))), `mâu thuẫn: ${a.join(',')}`);
  }
  assert.ok(new Set(SEEDS.map((s) => pickTraitIds(mulberry32(s)).join())).size > 5, 'phải có nhiều tổ hợp khác nhau');
});

test('mọi nét đều có cả mặt lợi lẫn mặt hại (mod khác trung tính theo cả hai hướng)', () => {
  for (const t of TRAITS) {
    assert.ok(t.upside && t.downside, t.id);
    assert.ok(Object.keys(t.mods).length >= 2, `${t.id} nên đổi ít nhất 2 thứ`);
  }
});

test('không có tính cách => không đổi gì (tương thích ván cũ)', () => {
  for (const a of DOMAIN_ACTIONS.slice(0, 40)) {
    const d = { dopamine: 10, energy: -8, mental: -3, social: 5, money: 40, willpower: -2 };
    assert.deepEqual(applyTraits(a, d, 12, []), d);
  }
  for (const seed of SEEDS) {
    const base = executeActionById('work_focused', INITIAL_STATS, 24, [], 1, [], mulberry32(seed));
    assert.deepEqual(base, executeActionById('work_focused', INITIAL_STATS, 24, [], 1, [], mulberry32(seed), []));
  }
});

test('applyTraits: từng nét đúng hướng', () => {
  const fastAct = DOMAIN_ACTIONS.find((a) => a.dopaminePathway === 'fast')!;
  const d = { dopamine: 20, energy: -10 };
  assert.ok((applyTraits(fastAct, d, 12, ['addictive']).dopamine ?? 0) > 20);
  assert.ok((applyTraits(fastAct, d, 12, ['disciplined']).dopamine ?? 0) < 20);

  // Cú đêm: khuya đỡ tốn sức, sáng tốn hơn; Chim sớm ngược lại
  assert.ok((applyTraits(fastAct, d, 23, ['night_owl']).energy ?? 0) > -10);
  assert.ok((applyTraits(fastAct, d, 8, ['night_owl']).energy ?? 0) < -10);
  assert.ok((applyTraits(fastAct, d, 8, ['early_bird']).energy ?? 0) > -10);
  assert.ok((applyTraits(fastAct, d, 23, ['early_bird']).energy ?? 0) < -10);

  const work = DOMAIN_ACTIONS.find((a) => a.category === 'work' && (a.baseMoney ?? 0) > 0)!;
  assert.ok((applyTraits(work, { money: 100 }, 12, ['hustler']).money ?? 0) > 100);

  const rest = DOMAIN_ACTIONS.find((a) => a.category === 'rest')!;
  assert.ok((applyTraits(rest, { mental: 5 }, 12, ['introvert']).mental ?? 0) > 5);
  assert.ok((applyTraits(rest, { mental: 5 }, 12, ['extrovert']).mental ?? 0) < 5);
});

test('combineTraitMods: nhân dồn khi nhiều nét cùng đổi một thứ', () => {
  const m = combineTraitMods(['hustler', 'night_owl']);
  assert.ok(Math.abs(m.energyDrainMult - 1.1) < 1e-9);
  assert.ok(Math.abs(m.nightEnergyMult - 0.7) < 1e-9);
  assert.equal(combineTraitMods(['id_khong_ton_tai']).fastDopamineMult, 1);
});

test('createPlayerState: có tính cách, cùng seed => cùng ván', () => {
  const s = createPlayerState(mulberry32(3));
  assert.equal(s.traitIds.length, TRAITS_PER_RUN);
  assert.deepEqual(s, createPlayerState(mulberry32(3)));
});

test('cơn thèm: chỉ khi cám dỗ nhanh đã thành nếp mà hôm nay chưa làm', () => {
  const tempt = DOMAIN_ACTIONS.find((a) => a.dopaminePathway === 'fast' && a.isTemptation)!;
  const h2 = [[tempt.id], [tempt.id]];
  assert.deepEqual(cravingActionIds([], []), []);
  assert.deepEqual(cravingActionIds([[tempt.id]], []), []); // mới 1 ngày
  assert.ok(cravingActionIds(h2, []).includes(tempt.id));
  assert.ok(!cravingActionIds(h2, [tempt.id]).includes(tempt.id)); // hôm nay đã làm rồi
  assert.ok(cravingLevel(h2, []) > 0);
  assert.ok(cravingLevel(h2, [], ['addictive']) > cravingLevel(h2, [], []));
  assert.ok(cravingLevel(h2, [], ['disciplined']) === cravingLevel(h2, [], []));
});

test('intrusionChance: không thèm + ý chí cao => 0 như cũ; có thèm thì cám dỗ tìm tới', () => {
  const ctx = { clock: 14, hoursLeft: 8, intrusionsToday: 0 };
  const calm = { ...INITIAL_STATS, willpower: 60 };
  assert.equal(intrusionChance(calm, ctx), 0);
  assert.ok(intrusionChance(calm, { ...ctx, craving: 1 }) > 0);
  assert.equal(intrusionChance({ ...calm, willpower: 80 }, { ...ctx, craving: 2 }), 0); // ý chí rất cao thì thoát
  const low = { ...INITIAL_STATS, willpower: 20 };
  assert.ok(intrusionChance(low, { ...ctx, craving: 1 }) > intrusionChance(low, ctx));
  assert.ok(intrusionChance(low, { ...ctx, intrusionMult: 1.4 }) > intrusionChance(low, ctx));
  assert.ok(intrusionChance(low, { ...ctx, intrusionMult: 0.7 }) < intrusionChance(low, ctx));
  assert.ok(intrusionChance(low, { ...ctx, craving: 2, intrusionMult: 5 }) <= 0.7);
});

test('rollDayEvents: cơn thèm làm cám dỗ xuất hiện với người ý chí 60', () => {
  const tempt = DOMAIN_ACTIONS.find((a) => a.dopaminePathway === 'fast' && a.isTemptation)!;
  const base = newPlayerState([], { id: BIG_EVENT_IDS[0], difficulty: 1 }, []);
  const craving = {
    ...base,
    stats: { ...base.stats, willpower: 60 },
    hoursUsed: 4,
    history: [[tempt.id], [tempt.id], [tempt.id]],
  };
  const ctx = { traveled: false, realActionId: 'work_focused', endLocation: 'home' as const, blocked: null, hasActiveEvent: true, hasIntrusion: false };
  const open = { ...ctx, hasActiveEvent: false };
  const hits = SEEDS.filter((s) => rollDayEvents(craving, open, mulberry32(s)).intrusion).length;
  const none = SEEDS.filter((s) => rollDayEvents({ ...craving, history: [] }, open, mulberry32(s)).intrusion).length;
  assert.ok(hits > none, `thèm=${hits} vs không=${none}`);
  assert.equal(none, 0);
});
