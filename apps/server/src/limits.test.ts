import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter, sanitizeName, scrubLinks } from './limits.js';

test('RateLimiter: cửa sổ trượt theo từng khoá; hết cửa sổ thì được lại', () => {
  const rl = new RateLimiter(3, 1000);
  assert.deepEqual([0, 100, 200].map((t) => rl.hit('ip1', t)), [true, true, true]);
  assert.equal(rl.hit('ip1', 300), false, 'lần thứ 4 trong cửa sổ bị chặn');
  assert.equal(rl.hit('ip2', 300), true, 'khoá khác không bị ảnh hưởng');
  assert.equal(rl.hit('ip1', 1001), true, 'lần đầu (t=0) đã trượt ra khỏi cửa sổ');
  assert.equal(rl.hit('ip1', 1002), false, 'còn t=100, t=200, t=1001 trong cửa sổ');
  assert.equal(rl.hit('ip1', 1101), true, 't=100 trượt ra khỏi cửa sổ');
});

test('sanitizeName: bỏ ký tự HTML/điều khiển, gọn khoảng trắng, từ chối đường dẫn', () => {
  assert.equal(sanitizeName('  An   Nguyễn '), 'An Nguyễn');
  assert.equal(sanitizeName('<b>Binh</b>'), 'bBinh/b');
  assert.equal(sanitizeName('Cu\u0000ng'), 'Cu ng');
  assert.equal(sanitizeName('a'.repeat(100))?.length, 24);
  for (const bad of ['', '   ', null, undefined, 42, 'https://spam.example', 'vao www.spam.net ngay', 'ban hang ne ABC.com']) {
    assert.equal(sanitizeName(bad), null, `từ chối ${JSON.stringify(bad)}`);
  }
});

test('scrubLinks: thay đường dẫn trong chat bằng [link], giữ phần còn lại', () => {
  assert.equal(scrubLinks('xem https://a.b/c nè'), 'xem [link] nè');
  assert.equal(scrubLinks('vào www.spam.net đi'), 'vào [link] đi');
  assert.equal(scrubLinks('kiếm tiền ở shop.vn/abc'), 'kiếm tiền ở [link]');
  assert.equal(scrubLinks('chạy bộ lúc 6.5 giờ nha'), 'chạy bộ lúc 6.5 giờ nha');
});
