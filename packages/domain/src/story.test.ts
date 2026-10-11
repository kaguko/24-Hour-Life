import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng.js';
import { INITIAL_STATS } from './stats.js';
import {
  STORYLINES,
  STORIES_PER_RUN,
  STORY_BEATS_PER_LINE,
  buildStoryEvent,
  dueStoryEvent,
  isStoryEventId,
  pickStoryIds,
  resolveStoryChoice,
  storyEpilogues,
  storyProgress,
  type StoryLog,
} from './story.js';
import { applyEventChoice, createPlayerState, newPlayerState, rollDayEvents } from './gameState.js';
import { BIG_EVENT_IDS } from './bigEvents.js';

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

/** Duyệt mọi đường đi của một mạch: gọi `visit` với nhật ký đầy đủ ở cuối mỗi đường */
function walk(lineId: string, visit: (log: StoryLog) => void, log: StoryLog = []) {
  const line = STORYLINES.find((s) => s.id === lineId)!;
  const beat = line.beats[log.length];
  if (!beat) return visit(log);
  const view = beat.build(log);
  for (const ch of view.choices) walk(lineId, visit, [...log, { beat: beat.id, day: beat.minDay, choice: ch.id }]);
}

test('pickStoryIds: cùng seed => cùng mạch, khác nhau, đúng số lượng', () => {
  for (const seed of SEEDS) {
    const a = pickStoryIds(mulberry32(seed));
    assert.deepEqual(a, pickStoryIds(mulberry32(seed)));
    assert.equal(a.length, STORIES_PER_RUN);
    assert.equal(new Set(a).size, a.length);
  }
  assert.ok(new Set(SEEDS.map((s) => pickStoryIds(mulberry32(s)).join())).size > 3);
});

test('mọi chương của mọi mạch dựng được trên mọi đường đi, lựa chọn hợp lệ', () => {
  for (const line of STORYLINES) {
    assert.equal(line.beats.length, STORY_BEATS_PER_LINE);
    assert.deepEqual(line.beats.map((b) => b.minDay), [...line.beats.map((b) => b.minDay)].sort((a, b) => a - b), 'ngày tăng dần');
    let paths = 0;
    walk(line.id, () => paths++);
    assert.ok(paths >= 6, `${line.id} cần đủ nhánh, có ${paths}`);
    // duyệt kỹ từng chương trên mọi nhật ký có thể có
    const check = (log: StoryLog) => {
      const beat = line.beats[log.length];
      if (!beat) return;
      const ev = buildStoryEvent(beat.id, log)!;
      assert.ok(ev.id.startsWith('story:') && isStoryEventId(ev.id));
      assert.ok(ev.title && ev.description);
      assert.ok(ev.choices.length >= 2, `${beat.id} cần ít nhất 2 lựa chọn`);
      assert.equal(new Set(ev.choices.map((c) => c.id)).size, ev.choices.length, `${beat.id} id lựa chọn trùng`);
      for (const c of ev.choices) {
        assert.ok(c.label && c.feedback);
        assert.ok(Number.isFinite(c.timeHours) && c.timeHours >= 0 && c.timeHours <= 4);
        for (const v of Object.values(c.deltas)) assert.ok(Number.isFinite(v));
        check([...log, { beat: beat.id, day: beat.minDay, choice: c.id }]);
      }
    };
    check([]);
  }
});

test('mỗi mạch tới được mọi kết cục đã viết, và mọi đường đi đều có phần kết', () => {
  for (const line of STORYLINES) {
    const reached = new Set<string>();
    walk(line.id, (log) => {
      const o = line.outcome(log);
      assert.ok(line.epilogues[o], `${line.id} thiếu phần kết '${o}'`);
      reached.add(o);
    });
    assert.deepEqual([...reached].sort(), Object.keys(line.epilogues).sort(), `${line.id}: kết cục không tới được hoặc thiếu`);
  }
});

test('dueStoryEvent: chỉ giữa buổi, đúng ngày, tối đa một chương mỗi ngày', () => {
  const ids = ['friend', 'project'];
  assert.equal(dueStoryEvent(ids, [], 1, 6), null, 'chưa tới ngày');
  assert.equal(dueStoryEvent(ids, [], 2, 1), null, 'quá sớm trong ngày');
  assert.equal(dueStoryEvent(ids, [], 2, 22), null, 'quá muộn trong ngày');
  assert.equal(dueStoryEvent([], [], 5, 6), null, 'không có mạch');
  const first = dueStoryEvent(ids, [], 2, 6)!;
  assert.equal(first.id, 'story:friend:1');
  const log1: StoryLog = [{ beat: 'friend:1', day: 2, choice: 'meet' }];
  assert.equal(dueStoryEvent(ids, log1, 2, 6), null, 'một chương mỗi ngày');
  assert.equal(dueStoryEvent(ids, log1, 3, 6)!.id, 'story:project:1', 'mạch kế tiếp ở ngày sau');
  const log2: StoryLog = [...log1, { beat: 'project:1', day: 3, choice: 'note' }];
  assert.equal(dueStoryEvent(ids, log2, 3, 6), null);
  assert.equal(dueStoryEvent(ids, log2, 4, 6)!.id, 'story:friend:2', 'chương 2 chưa tới ngày 3 nên chờ ngày 4');
});

test('chương sau đổi theo lựa chọn trước', () => {
  const a = buildStoryEvent('friend:2', [{ beat: 'friend:1', day: 2, choice: 'meet' }])!;
  const b = buildStoryEvent('friend:2', [{ beat: 'friend:1', day: 2, choice: 'ignore' }])!;
  assert.notEqual(a.title, b.title);
  assert.notDeepEqual(a.choices.map((c) => c.id), b.choices.map((c) => c.id));
});

test('resolveStoryChoice: áp chỉ số, ghi nhật ký, từ chối id sai', () => {
  const ok = resolveStoryChoice('story:friend:1', 'meet', INITIAL_STATS, [], 2)!;
  assert.equal(ok.timeHours, 2);
  assert.ok(ok.newStats.social > INITIAL_STATS.social);
  assert.deepEqual(ok.log, [{ beat: 'friend:1', day: 2, choice: 'meet' }]);
  assert.equal(resolveStoryChoice('story:friend:1', 'khong_co', INITIAL_STATS, [], 2), null);
  assert.equal(resolveStoryChoice('story:khong:1', 'meet', INITIAL_STATS, [], 2), null);
  assert.equal(resolveStoryChoice('deadline_rush', 'take_it', INITIAL_STATS, [], 2), null, 'không phải sự kiện truyện');
});

test('createPlayerState có mạch truyện, nhật ký rỗng, cùng seed => cùng ván', () => {
  const s = createPlayerState(mulberry32(9));
  assert.equal(s.storyIds.length, STORIES_PER_RUN);
  assert.deepEqual(s.storyLog, []);
  assert.deepEqual(s, createPlayerState(mulberry32(9)));
});

test('rollDayEvents + applyEventChoice: chạy trọn 7 ngày với lựa chọn ngẫu nhiên, mọi mạch khép lại', () => {
  for (const seed of SEEDS) {
    const rng = mulberry32(seed);
    let s = { ...createPlayerState(rng), stats: { ...INITIAL_STATS, energy: 100, mental: 100, willpower: 100 } };
    for (let day = 1; day <= 7; day++) {
      s = { ...s, day, hoursUsed: 0, actionsTodayIds: [] };
      for (let step = 0; step < 6; step++) {
        s = { ...s, hoursUsed: s.hoursUsed + 3 };
        const ctx = { traveled: false, realActionId: 'work_focused', endLocation: 'home' as const, blocked: null, hasActiveEvent: false, hasIntrusion: false };
        const ev = rollDayEvents(s, ctx, rng).event;
        if (ev && isStoryEventId(ev.id)) {
          const ch = ev.choices[Math.floor(rng() * ev.choices.length)];
          const before = s.storyLog.length;
          s = applyEventChoice(s, ev.id, ch.id);
          assert.equal(s.storyLog.length, before + 1);
        }
      }
    }
    const progress = storyProgress(s.storyIds, s.storyLog);
    assert.ok(progress.every((p) => p.played === p.total), `seed ${seed}: ${JSON.stringify(progress)}`);
    const eps = storyEpilogues(s.storyIds, s.storyLog);
    assert.ok(eps.length === STORIES_PER_RUN && eps.every((e) => e.finished && e.text && e.headline));
  }
});

test('không có mạch truyện => rollDayEvents không đổi (ván cũ)', () => {
  const base = newPlayerState([], { id: BIG_EVENT_IDS[0], difficulty: 1 });
  const ctx = { traveled: false, realActionId: 'work_focused', endLocation: 'home' as const, blocked: null, hasActiveEvent: false, hasIntrusion: false };
  for (const seed of SEEDS) {
    const withIds = { ...base, hoursUsed: 10, day: 5 };
    assert.deepEqual(rollDayEvents(withIds, ctx, mulberry32(seed)), rollDayEvents({ ...withIds, storyIds: [], storyLog: [] }, ctx, mulberry32(seed)));
    assert.ok(!rollDayEvents(withIds, ctx, mulberry32(seed)).event || !isStoryEventId(rollDayEvents(withIds, ctx, mulberry32(seed)).event!.id));
  }
});

test('storyEpilogues: mạch chưa chơi / chưa xong / đã xong nói rõ từng trạng thái', () => {
  const eps0 = storyEpilogues(['friend'], []);
  assert.equal(eps0[0].finished, false);
  assert.equal(eps0[0].headline, 'Chưa kịp bắt đầu');
  const eps1 = storyEpilogues(['friend'], [{ beat: 'friend:1', day: 2, choice: 'meet' }]);
  assert.equal(eps1[0].headline, 'Còn dang dở');
  const full: StoryLog = [
    { beat: 'friend:1', day: 2, choice: 'meet' },
    { beat: 'friend:2', day: 4, choice: 'lend' },
    { beat: 'friend:3', day: 6, choice: 'dinner' },
  ];
  const eps2 = storyEpilogues(['friend'], full);
  assert.equal(eps2[0].finished, true);
  assert.equal(eps2[0].headline, STORYLINES[0].epilogues.warm.title);
});

// ───────── Tiền phòng thật, danh hiệu và điểm cộng ─────────
import { storyBadge, storyRentDelta, storyScoreBonus } from './story.js';
import { DAILY_RENT_COST } from './stats.js';
import { endDay } from './gameState.js';
import { evaluateEnding } from './ending.js';

const entry = (beat: string, day: number, choice: string) => ({ beat, day, choice });

test('storyRentDelta: tăng giá, nửa mức, chuyển phòng, và đúng ngày có hiệu lực', () => {
  assert.equal(storyRentDelta([], 5), 0);
  const raise = [entry('landlord:1', 2, 'accept')];
  assert.equal(storyRentDelta(raise, 1), 0, 'chưa tới ngày');
  assert.equal(storyRentDelta(raise, 2), 18, 'có hiệu lực ngay đêm đó');
  assert.equal(storyRentDelta([entry('landlord:1', 2, 'negotiate'), entry('landlord:2', 4, 'nodeal')], 5), 18);
  assert.equal(storyRentDelta([entry('landlord:1', 2, 'negotiate'), entry('landlord:2', 4, 'prepay')], 3), 18, 'trước khi chốt vẫn tăng đủ');
  assert.equal(storyRentDelta([entry('landlord:1', 2, 'negotiate'), entry('landlord:2', 4, 'prepay')], 4), 9);
  assert.equal(storyRentDelta([entry('landlord:1', 2, 'search'), entry('landlord:2', 4, 'movein')], 6), -12);
  assert.equal(storyRentDelta([entry('landlord:1', 2, 'search'), entry('landlord:2', 4, 'stay')], 6), 18);
  assert.equal(storyRentDelta([entry('friend:1', 2, 'meet')], 6), 0, 'mạch khác không đổi tiền phòng');
});

test('endDay: tiền trọ đêm đó đúng theo truyện, mặc định như cũ', () => {
  const base = { ...newPlayerState([], { id: BIG_EVENT_IDS[0], difficulty: 1 }), stats: { ...INITIAL_STATS }, actionsTodayIds: ['sleep_deep'] };
  const plain = endDay(base, mulberry32(1)).night;
  assert.equal(plain.rentPaid, DAILY_RENT_COST);
  const raised = endDay({ ...base, day: 3, storyLog: [entry('landlord:1', 2, 'accept')] }, mulberry32(1)).night;
  assert.equal(raised.rentPaid, DAILY_RENT_COST + 18);
  const moved = endDay({ ...base, day: 6, storyLog: [entry('landlord:1', 2, 'search'), entry('landlord:2', 4, 'movein')] }, mulberry32(1)).night;
  assert.equal(moved.rentPaid, DAILY_RENT_COST - 12);
  assert.ok(raised.newStats.money < plain.newStats.money);
});

test('mọi phần kết đều có sắc thái; mỗi mạch có kết cục tốt và xấu', () => {
  for (const line of STORYLINES) {
    const tones = Object.values(line.epilogues).map((e) => e.tone);
    assert.ok(tones.every((t) => ['good', 'mixed', 'bad'].includes(t)));
    assert.ok(tones.includes('good'), `${line.id} cần có kết cục tốt`);
  }
  // Mạch có kết cục xấu rõ ràng trừ mạch Chủ trọ (chỉ tiền, không có "buồn")
  for (const id of ['friend', 'project', 'health']) {
    assert.ok(Object.values(STORYLINES.find((s) => s.id === id)!.epilogues).some((e) => e.tone === 'bad'), id);
  }
});

const allGood: StoryLog = [
  entry('friend:1', 2, 'meet'), entry('friend:2', 4, 'lend'), entry('friend:3', 6, 'dinner'),
  entry('project:1', 3, 'start'), entry('project:2', 5, 'push'), entry('project:3', 7, 'share'),
];
const allBad: StoryLog = [
  entry('friend:1', 2, 'ignore'), entry('friend:2', 4, 'scroll'), entry('friend:3', 6, 'distract'),
  entry('project:1', 3, 'drop'), entry('project:2', 5, 'closetab'), entry('project:3', 7, 'closefolder'),
];

test('storyScoreBonus và storyBadge', () => {
  const ids = ['friend', 'project'];
  assert.equal(storyScoreBonus(ids, allGood), 8);
  assert.equal(storyScoreBonus(ids, allBad), 0);
  assert.equal(storyScoreBonus(ids, []), 0);
  assert.equal(storyScoreBonus([], []), 0);
  assert.equal(storyBadge(ids, allGood)?.title, 'Trọn Vẹn Từng Chương');
  assert.equal(storyBadge(ids, allBad)?.title, 'Những Cánh Cửa Chưa Mở');
  assert.equal(storyBadge(ids, [])?.title, 'Bận Đến Mức Quên Sống');
  assert.equal(storyBadge([], []), null, 'không có mạch nào thì không có danh hiệu');
  const mixed = [...allGood.slice(0, 3), ...allBad.slice(3)];
  assert.equal(storyBadge(ids, mixed), null);
  const partial = allGood.slice(0, 2);
  assert.equal(storyBadge(ids, partial), null, 'dang dở thì không có danh hiệu đẹp');
  assert.equal(storyScoreBonus(ids, partial), 0, 'mạch dang dở không có điểm');
});

test('evaluateEnding: có truyện thì cộng điểm (tối đa 100) và gắn danh hiệu, không có truyện thì như cũ', () => {
  const history = [['work_focused', 'sleep_deep'], ['study_deep', 'sleep_deep']];
  const stats = { ...INITIAL_STATS };
  const old = evaluateEnding(history, stats);
  assert.equal(old.badge, undefined);
  assert.equal(old.storyBonus, undefined);
  assert.deepEqual(evaluateEnding(history, stats, [], []), old);

  const withStory = evaluateEnding(history, stats, ['friend', 'project'], allGood);
  assert.equal(withStory.storyBonus, 8);
  assert.equal(withStory.score, Math.min(100, old.score + 8));
  assert.equal(withStory.badge?.emoji, '🌟');
  assert.equal(withStory.id, old.id, 'kết cục chính không đổi');

  const capped = evaluateEnding(history, { ...stats, energy: 100, mental: 100, willpower: 100, social: 100, money: 5000 }, ['friend', 'project'], allGood);
  assert.ok(capped.score <= 100);
});
