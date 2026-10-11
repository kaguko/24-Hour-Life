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
