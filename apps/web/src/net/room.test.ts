import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot } from './room.ts';

/** Giả lập MapSchema/ArraySchema của Colyseus: có forEach và Array.from được */
const fakeMap = <T,>(entries: Array<[string, T]>) => ({ forEach: (cb: (v: T, k: string) => void) => entries.forEach(([k, v]) => cb(v, k)) });

test('buildSnapshot: state schema -> snapshot thuần, tìm được "me" và giá trị mặc định', () => {
  const state = {
    code: 'ABCD',
    phase: 'morning',
    day: 3,
    phaseEndsAt: 1234,
    players: fakeMap([
      ['s1', { name: 'An', avatar: 'female-c', connected: true, bot: false, ready: true, x: 1, z: 2, day: 3, hoursUsed: 5.5, location: 'cafe', finished: false, dopamine: 50, energy: 80, mental: 70, social: 61, money: 4400, willpower: 66, lastActionId: 'deep_talk', offerId: '', anim: 'sit' }],
      ['s2', { name: 'Binh', connected: false, bot: true }],
    ]),
    offers: fakeMap([['o1', { actionId: 'run_together', hostId: 's1', members: ['s1', 's2'], minPlayers: 2, maxPlayers: 4 }]]),
    chat: [{ playerId: 's1', name: 'An', text: 'hi', at: 99 }],
  };
  const snap = buildSnapshot(state, 's1');
  assert.equal(snap.code, 'ABCD');
  assert.equal(snap.phase, 'morning');
  assert.equal(snap.day, 3);
  assert.equal(snap.players.length, 2);
  assert.equal(snap.me?.name, 'An');
  assert.equal(snap.me?.stats.social, 61);
  assert.equal(snap.me?.anim, 'sit');
  const binh = snap.players.find((p) => p.id === 's2')!;
  assert.equal(binh.bot, true);
  assert.equal(binh.avatar, 'male-a', 'avatar mặc định khi thiếu');
  assert.equal(binh.stats.money, 0);
  assert.deepEqual(snap.offers[0].members, ['s1', 's2']);
  assert.equal(snap.chat[0].text, 'hi');
});

test('buildSnapshot: state rỗng không ném lỗi', () => {
  const snap = buildSnapshot({}, 'x');
  assert.deepEqual([snap.players.length, snap.offers.length, snap.chat.length, snap.me], [0, 0, 0, null]);
  assert.equal(snap.phase, 'planning');
});
