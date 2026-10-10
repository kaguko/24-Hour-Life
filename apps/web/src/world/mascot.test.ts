import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '@24h/domain';
import { MASCOT_LINES, MASCOT_POS, MOOD_TAG, QuoteDeck, greeting, moodForTheme, readMs, urgentThemes, type MascotStats } from './mascot';

const fine: MascotStats = { energy: 80, mental: 70, willpower: 70, dopamine: 50, social: 60, money: 4500 };

test('mascot: mọi câu có nội dung, tác giả và nét mặt hợp lệ; id duy nhất', () => {
  assert.ok(MASCOT_LINES.length >= 30);
  assert.equal(new Set(MASCOT_LINES.map((l) => l.id)).size, MASCOT_LINES.length);
  for (const l of MASCOT_LINES) {
    assert.ok(l.quote.length > 10 && l.author.length > 1, l.id);
    assert.ok(l.mood in MOOD_TAG, l.id);
    assert.equal(l.mood, moodForTheme(l.theme as never));
  }
});

test('mascot: đủ cả 5 nét mặt trong kho câu nói', () => {
  assert.deepEqual([...new Set(MASCOT_LINES.map((l) => l.mood))].sort(), ['cooked', 'lockedin', 'loss', 'rizz', 'win']);
});

test('mascot: thời gian đọc nằm trong 8–17 giây và câu dài đọc lâu hơn', () => {
  const lens = MASCOT_LINES.map(readMs);
  assert.ok(Math.min(...lens) >= 8000 && Math.max(...lens) <= 17000);
  const short = MASCOT_LINES.reduce((a, b) => (a.quote.length <= b.quote.length ? a : b));
  const long = MASCOT_LINES.reduce((a, b) => (a.quote.length >= b.quote.length ? a : b));
  assert.ok(readMs(long) > readMs(short));
});

test('mascot: lời chào gọi đúng tên người chơi', () => {
  const g = greeting('An');
  assert.ok(g.quote.startsWith('Chào An!'));
  assert.equal(g.author, 'Blob');
});

test('mascot: chỉ số yếu -> chủ đề tương ứng; ổn hết thì không có', () => {
  assert.deepEqual(urgentThemes(fine), []);
  assert.ok(urgentThemes({ ...fine, willpower: 20 }).includes('discipline_willpower'));
  assert.ok(urgentThemes({ ...fine, energy: 10 }).includes('burnout_rest'));
  assert.ok(urgentThemes({ ...fine, social: 5 }).includes('social_connection'));
  assert.ok(urgentThemes({ ...fine, money: 300 }).includes('financial_freedom'));
  assert.ok(urgentThemes({ ...fine, dopamine: 90 }).includes('fast_dopamine'));
});

test('QuoteDeck: không lặp lại trong 10 câu gần nhất', () => {
  const deck = new QuoteDeck(mulberry32(7));
  const seen: string[] = [];
  for (let i = 0; i < 60; i++) {
    const l = deck.next(fine);
    assert.ok(!seen.slice(-10).includes(l.id), `lặp ${l.id} ở lượt ${i}`);
    seen.push(l.id);
  }
  assert.ok(new Set(seen).size >= 25, 'dùng gần hết kho');
});

test('QuoteDeck: ý chí thấp thì phần lớn câu nói là về kỷ luật / dopamine chậm', () => {
  const deck = new QuoteDeck(mulberry32(11));
  const stats = { ...fine, willpower: 15 };
  let on = 0;
  const N = 40;
  for (let i = 0; i < N; i++) {
    const l = deck.next(stats);
    if (l.theme === 'discipline_willpower' || l.theme === 'slow_dopamine') on++;
  }
  assert.ok(on / N >= 0.4, `chỉ ${on}/${N} câu đúng chủ đề`);
});

test('mascot: bục nằm trong công viên, cách quảng trường và lối đi chữ thập', () => {
  assert.ok(Math.abs(MASCOT_POS.x) < 8 && Math.abs(MASCOT_POS.z) < 8);
  assert.ok(Math.hypot(MASCOT_POS.x, MASCOT_POS.z) > 4.5);
  assert.ok(Math.abs(MASCOT_POS.x) > 2 && Math.abs(MASCOT_POS.z) > 1.5);
});
