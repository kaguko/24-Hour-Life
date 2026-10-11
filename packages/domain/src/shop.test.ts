import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng.js';
import { INITIAL_STATS } from './stats.js';
import { DOMAIN_ACTIONS, executeActionById } from './actions.js';
import { SHOP_ITEMS, SHOP_RESERVE, applyItems, combineItemMods, isItemId, itemBuyBlock, itemById } from './shop.js';
import { buyItem, createPlayerState, newPlayerState } from './gameState.js';
import { BIG_EVENT_IDS } from './bigEvents.js';

const act = (id: string) => DOMAIN_ACTIONS.find((a) => a.id === id)!;
const fresh = () => newPlayerState([], { id: BIG_EVENT_IDS[0], difficulty: 1 });
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

test('danh mục: id duy nhất, giá hợp lý, có mặt lợi; món có hại thì ghi rõ', () => {
  assert.equal(new Set(SHOP_ITEMS.map((i) => i.id)).size, SHOP_ITEMS.length);
  for (const i of SHOP_ITEMS) {
    assert.ok(i.cost >= 100 && i.cost <= 2000, i.id);
    assert.ok(i.name && i.upside && i.emoji, i.id);
    assert.ok(Object.keys(i.mods).length >= 1, i.id);
    assert.ok(isItemId(i.id));
  }
  // Món vừa tăng dopamine nhanh vừa tăng cám dỗ phải nói rõ cái giá
  for (const i of SHOP_ITEMS) if ((i.mods.intrusionMult ?? 1) > 1) assert.ok(i.downside, `${i.id} cần ghi mặt hại`);
});

test('không thể mua hết mọi món ngay từ đầu (phải chọn)', () => {
  const total = SHOP_ITEMS.reduce((s, i) => s + i.cost, 0);
  assert.ok(total + SHOP_RESERVE > INITIAL_STATS.money, `tổng ${total}k`);
});

test('chưa mua gì => không đổi gì (tương thích ván cũ)', () => {
  for (const a of DOMAIN_ACTIONS.slice(0, 40)) {
    const d = { dopamine: 10, energy: -8, mental: 4, social: 5, money: 40, willpower: -2 };
    assert.deepEqual(applyItems(a, d, []), d);
  }
  for (const seed of SEEDS) {
    const base = executeActionById('sleep_deep', INITIAL_STATS, 24, [], 1, [], mulberry32(seed));
    assert.deepEqual(base, executeActionById('sleep_deep', INITIAL_STATS, 24, [], 1, [], mulberry32(seed), [], []));
  }
});

test('từng món đúng hướng', () => {
  const sleep = { energy: 30, mental: 5 };
  assert.ok((applyItems(act('sleep_deep'), sleep, ['pillow']).energy ?? 0) > 30);
  assert.equal(applyItems(act('work_focused'), { energy: 10 }, ['pillow']).energy, 10, 'gối chỉ ảnh hưởng giấc ngủ');

  const study = DOMAIN_ACTIONS.find((a) => a.id === 'study_deep')!;
  assert.ok((applyItems(study, { mental: 10 }, ['bookcase']).mental ?? 0) > 10);
  assert.ok((applyItems(study, { mental: 10 }, ['desk_lamp', 'bookcase']).mental ?? 0) > (applyItems(study, { mental: 10 }, ['bookcase']).mental ?? 0));

  const work = DOMAIN_ACTIONS.find((a) => a.category === 'work')!;
  assert.ok((applyItems(work, { energy: -20 }, ['desk_lamp']).energy ?? 0) > -20);

  const rest = DOMAIN_ACTIONS.find((a) => a.category === 'rest' && !a.id.startsWith('sleep'));
  if (rest) {
    assert.ok((applyItems(rest, { mental: 5 }, ['small_plant']).mental ?? 0) > 5);
    assert.equal(applyItems(act('sleep_deep'), { mental: 5 }, ['small_plant']).mental, 5, 'ngủ không tính là nghỉ ngơi');
  }

  const fast = DOMAIN_ACTIONS.find((a) => a.dopaminePathway === 'fast')!;
  assert.ok((applyItems(fast, { dopamine: 20 }, ['tv']).dopamine ?? 0) > 20);
  assert.ok(combineItemMods(['tv']).intrusionMult > 1 && combineItemMods(['small_fridge']).intrusionMult < 1);
  assert.ok((applyItems(act('cook_tyrosine'), { mental: 4 }, ['small_fridge']).mental ?? 0) > 4);

  const social = DOMAIN_ACTIONS.find((a) => (a.baseSocial ?? 0) > 0)!;
  assert.ok((applyItems(social, { social: 10 }, ['coffee_table']).social ?? 0) > 10);
});

test('executeActionById thật sự dùng đồ đã mua (cùng seed, có gối => ngủ hồi nhiều hơn)', () => {
  const low = { ...INITIAL_STATS, energy: 20 };
  for (const seed of SEEDS) {
    const a = executeActionById('sleep_deep', low, 24, [], 1, [], mulberry32(seed));
    const b = executeActionById('sleep_deep', low, 24, [], 1, [], mulberry32(seed), [], ['pillow']);
    assert.ok(b.newStats.energy > a.newStats.energy);
  }
});

test('itemBuyBlock và buyItem: đủ tiền, đã có, thiếu tiền, ván đã xong', () => {
  assert.equal(itemBuyBlock('khong_co', [], 9999), 'unknown');
  assert.equal(itemBuyBlock('pillow', ['pillow'], 9999), 'owned');
  assert.equal(itemBuyBlock('tv', [], 1600 + SHOP_RESERVE - 1), 'poor');
  assert.equal(itemBuyBlock('tv', [], 1600 + SHOP_RESERVE), null);

  const s = fresh();
  const r = buyItem(s, 'pillow');
  assert.ok(r.ok);
  assert.equal(r.state.stats.money, s.stats.money - itemById('pillow')!.cost);
  assert.deepEqual(r.state.ownedItemIds, ['pillow']);
  assert.equal(s.ownedItemIds.length, 0, 'không sửa state cũ');

  assert.equal(buyItem(r.state, 'pillow').ok, false);
  const poor = { ...s, stats: { ...s.stats, money: 1000 } };
  const pr = buyItem(poor, 'tv');
  assert.equal(pr.ok, false);
  assert.equal(pr.state, poor);
  assert.equal(buyItem({ ...s, finished: true }, 'pillow').ok, false);
  assert.equal(buyItem(s, 'khong_co').ok, false);
});

test('createPlayerState: chưa có đồ', () => {
  const s = createPlayerState(mulberry32(4));
  assert.deepEqual(s.ownedItemIds, []);
});
