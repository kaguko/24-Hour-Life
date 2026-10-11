import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_LOCATION,
  LOCATIONS,
  LOCATION_IDS,
  TRAVEL_ACTIONS,
  isLocationId,
  isLocationOpen,
  locationDef,
  locationOf,
  travelHours,
} from './map.js';
import { DOMAIN_ACTIONS, PLAYABLE_ACTIONS } from './actions.js';
import { planAction, planTravel } from './planner.js';

const NEW_PLACES = ['clinic', 'cinema', 'night_market', 'riverside', 'temple'] as const;

test('mọi địa điểm hợp lệ, id duy nhất, nhà là điểm xuất phát', () => {
  assert.equal(new Set(LOCATION_IDS).size, LOCATION_IDS.length);
  assert.ok(LOCATION_IDS.length >= 13);
  assert.equal(locationDef('home').distHome, 0);
  for (const l of LOCATIONS) {
    assert.ok(l.name && l.emoji && l.tagline, l.id);
    assert.ok(l.distHome >= 0 && l.distHome <= 1.5, l.id);
    assert.ok(isLocationId(l.id));
  }
  for (const id of NEW_PLACES) assert.ok(isLocationId(id), id);
});

test('mọi hành vi gắn địa điểm đều trỏ tới địa điểm có thật và hành vi có thật', () => {
  const actionIds = new Set(DOMAIN_ACTIONS.map((a) => a.id));
  for (const [actionId, loc] of Object.entries(ACTION_LOCATION)) {
    assert.ok(actionIds.has(actionId), `${actionId} không có trong danh mục hành vi`);
    assert.ok(isLocationId(loc), `${actionId} -> ${loc}`);
  }
});

test('mỗi địa điểm ngoài nhà đều có ít nhất một hoạt động làm được', () => {
  for (const l of LOCATIONS) {
    if (l.id === 'home') continue;
    const here = PLAYABLE_ACTIONS.filter((a) => locationOf(a.id) === l.id);
    assert.ok(here.length >= 1, `${l.id} chưa có hoạt động nào`);
  }
});

test('hoạt động có khung giờ riêng vẫn làm được vào lúc địa điểm mở cửa', () => {
  for (const a of PLAYABLE_ACTIONS) {
    if (!a.window) continue;
    const loc = locationOf(a.id);
    const [from, to] = a.window;
    const hours = Array.from({ length: 48 }, (_, i) => i / 2).filter((h) => (from <= to ? h >= from && h < to : h >= from || h < to));
    assert.ok(hours.some((h) => isLocationOpen(loc, h)), `${a.id} (${loc}) không bao giờ vừa trong giờ mở cửa`);
  }
});

test('đi đường: đủ mọi cặp, không bằng 0, nơi xa tốn nhiều giờ hơn nơi gần', () => {
  assert.equal(TRAVEL_ACTIONS.length, LOCATION_IDS.length * (LOCATION_IDS.length - 1));
  for (const a of TRAVEL_ACTIONS) assert.ok(a.hours >= 0.25, a.id);
  assert.ok(travelHours('home', 'riverside') > travelHours('home', 'cafe'));
  assert.ok(travelHours('home', 'temple') > travelHours('home', 'park'));
  for (const a of LOCATION_IDS) for (const b of LOCATION_IDS) assert.equal(travelHours(a, b), travelHours(b, a), `${a}<->${b}`);
});

test('lập kế hoạch tới địa điểm mới: cộng giờ đi đường và đóng cửa đúng giờ', () => {
  const ctx = { day: 3, actionsTodayIds: [], history: [] };
  // 07:00 (còn 24h): rạp phim chưa mở (10h-24h), phòng khám mở (7h-19h)
  const early = planAction('cinema_movie', 'home', 24, ctx);
  assert.equal(early.ok, false);
  const clinic = planAction('health_checkup', 'home', 24, ctx);
  assert.ok(clinic.ok);
  if (clinic.ok) {
    assert.equal(clinic.endLocation, 'clinic');
    assert.equal(clinic.travelHours, 0.75);
    assert.equal(clinic.totalHours, 0.75 + 1.5);
  }
  // Đủ tiết kiệm giờ: 14h còn lại -> 17:00 ... rạp phim mở
  assert.ok(planAction('cinema_movie', 'home', 14, ctx).ok);
  // Chợ đêm chỉ mở từ 17h
  assert.equal(planAction('night_market_stroll', 'home', 20, ctx).ok, false);
  assert.ok(planAction('night_market_stroll', 'home', 12, ctx).ok);
  // Chỉ đi tới đó
  assert.ok(planTravel('home', 'riverside', 24).ok);
  assert.equal(planTravel('riverside', 'riverside', 24).ok, false);
});

test('hành vi địa điểm mới có lợi ích rõ ràng nhưng đều có cái giá', () => {
  for (const id of ['health_checkup', 'counseling', 'cinema_movie', 'night_market_stroll', 'river_sunset_walk', 'fishing', 'temple_meditation']) {
    const a = PLAYABLE_ACTIONS.find((x) => x.id === id)!;
    assert.ok(a, id);
    const gain = (a.baseDopamine ?? 0) + (a.baseMental ?? 0) + (a.baseSocial ?? 0) + (a.baseWillpower ?? 0);
    assert.ok(gain > 0, `${id} cần có lợi`);
    const cost = (a.baseMoney ?? 0) < 0 || (a.baseEnergy ?? 0) < 0 || (a.baseWillpower ?? 0) < 0 || a.hours >= 1.5;
    assert.ok(cost, `${id} cần có cái giá (tiền, sức hoặc thời gian)`);
  }
});
