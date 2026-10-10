// E2E Blob (linh vật nói câu triết lý) trong thành phố nhiều người (server :2567 + web :3000 đang chạy: npm run dev:all).
//   node .claude/skills/run-24-hour-life/mascot.mjs [outDir] [--mobile]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GAME_URL ?? 'http://localhost:3000/';
const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const mobile = process.argv.includes('--mobile');
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const errors = [];

const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/WebGL|GPU stall|ReadPixels/i.test(m.text()) && errors.push(m.text()));
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
const start = page.getByRole('button', { name: 'Bắt đầu ngày 1' });
if (await start.count()) await start.click();
await page.getByTestId('tab-multi').click();
await page.getByTestId('lobby-name').fill('An');
await page.getByTestId('lobby-create').click();
await page.getByTestId('room-game').waitFor({ timeout: 15000 });
await page.getByTestId('city-stage').waitFor();
await page.waitForFunction(() => !/Đang dựng/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 30000 });

const stage = () => page.getByTestId('city-stage').textContent();
const waitText = (re, ms = 8000) => page.waitForFunction((src) => new RegExp(src).test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), re.source, { timeout: ms }).catch(() => {});

// 1. lời chào đầu tiên
await waitText(/Mình là Blob/);
check('Blob chào người chơi bằng tên', /Chào An! Mình là Blob/.test(await stage()));
check('bong bóng có nhãn nét mặt + tên Blob', /CHILL & WIN/.test(await stage()) && /Blob · Triết gia của phố/.test(await stage()));

// 2. đủ 5 sticker nét mặt đã tải
await page.waitForFunction(() => window.__city?.mascot?.textures?.size === 5, null, { timeout: 10000 }).catch(() => {});
const texCount = await page.evaluate(() => window.__city?.mascot?.textures?.size ?? 0);
check('đã tải đủ 5 sticker nét mặt của Blob', texCount === 5, `textures=${texCount}`);

// 3. đưa camera tới chỗ Blob rồi bấm chuột thật vào Blob -> nghe câu khác
await page.evaluate(() => { const c = window.__city; const p = c.mascot.pickPoint(); c.teleportLocal(p.x + 2.5, p.z + 2.5); c.zoom = 0.75; });
await page.waitForTimeout(1200);
const before = await stage();
const quoteOf = (t) => t.match(/“[^”]+”/)?.[0] ?? '';
const pt = await page.evaluate(() => {
  const c = window.__city;
  const v = c.mascot.pickPoint().project(c.camera);
  const r = c.renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
});
await page.screenshot({ path: join(outDir, `blob-1-greeting${mobile ? '-m' : ''}.png`) });
await page.mouse.click(pt.x, pt.y);
await page.waitForFunction((q) => !(document.querySelector('[data-testid="city-stage"]')?.textContent ?? '').includes(q), quoteOf(before), { timeout: 6000 }).catch(() => {});
const after = await stage();
check('bấm vào Blob: câu mới thay câu cũ', quoteOf(after) !== '' && quoteOf(after) !== quoteOf(before), quoteOf(after).slice(0, 70));
check('câu mới có tên tác giả (— ...)', /— [^\s]/.test(after));
await page.waitForTimeout(900);
await page.screenshot({ path: join(outDir, `blob-2-quote${mobile ? '-m' : ''}.png`) });

// 4. bấm tiếp vài lần: luôn có câu, không lặp liên tiếp
const seen = [];
for (let i = 0; i < 4; i++) {
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(450);
  seen.push(quoteOf(await stage()));
}
check('bấm liên tiếp: câu nào cũng có nội dung, không lặp liền nhau', seen.every((q) => q) && seen.every((q, i) => i === 0 || q !== seen[i - 1]), String(new Set(seen).size));

// 5. tự nói câu tiếp theo khi hết giờ đọc (đẩy đồng hồ bằng cách chờ): thanh đếm đang chạy
const barRunning = await page.evaluate(() => { const bar = window.__city.mascot.barEl; return bar.style.width === '0%' && /width \d+ms linear/.test(bar.style.transition); });
check('thanh đếm thời gian của bong bóng đang chạy', barRunning);

check('không có lỗi trang', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ failed, results: results.length }));
process.exit(failed ? 1 : 0);
