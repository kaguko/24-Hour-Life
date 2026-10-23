// Drives the running 24-Hour-Life dev server (http://localhost:3000) with Playwright + system Edge.
//   node driver.mjs smoke [outDir] [--mobile]   fresh game -> start day 1 -> do one action -> screenshots + assertions
//   node driver.mjs shot  <file.png> [--mobile]  fresh game, intro dismissed, screenshot only
// Exit code 0 = all assertions passed. Prints JSON summary on the last line.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GAME_URL ?? 'http://localhost:3000/';
const [cmd = 'smoke', arg1] = process.argv.slice(2);
const mobile = process.argv.includes('--mobile');
const outDir = cmd === 'smoke' ? (arg1 && !arg1.startsWith('--') ? arg1 : '.') : '.';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? 'msedge', // on Linux: omit channel & `npx playwright install chromium`
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'], // three.js room needs WebGL
});
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const hud = () => page.evaluate(() => {
  const t = document.body.innerText;
  // Đồng hồ ở dòng "Ngày N · HH:MM" (thẻ Mục tiêu có "Thứ Bảy 14:00" nên không lấy giờ đầu tiên trên trang)
  return { clock: (t.match(/Ngày \d+ · (\d\d:\d\d)/i) ?? t.match(/(\d\d:\d\d)\s*\n\s*(?:Buổi|Đêm)/))?.[1], remaining: t.match(/(\d+(?:\.\d+)?)h\s*\n?\s*$/m)?.[0], day: t.match(/Ngày \d+ \/ \d+/)?.[0] };
});
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByRole('button', { name: 'Bắt đầu ngày 1' }).click(); // intro modal (aria-label 'Giới thiệu trò chơi')
await page.waitForTimeout(1500);

if (cmd === 'shot') {
  await page.screenshot({ path: arg1 ?? 'shot.png' });
} else {
  const before = await hud();
  check('day 1 starts at 07:00', before.clock === '07:00', JSON.stringify(before));
  await page.screenshot({ path: join(outDir, 'smoke-1-room.png') });

  await page.getByRole('button', { name: /Danh sách hành vi/ }).click();
  const cards = page.getByRole('button', { name: 'Chọn hành vi này' });
  check('action list shows cards', (await cards.count()) > 10, `count=${await cards.count()}`);
  // Locked cards render as separate "Chỉ 21h–04h" style buttons, so every 'Chọn hành vi này' is enabled-or-disabled; pick first enabled.
  const first = cards.locator(':scope:not([disabled])').first();
  await first.scrollIntoViewIfNeeded();
  await first.click();
  await page.waitForTimeout(1500);
  // a random event / intrusion dialog may pop up; dismiss it by clicking its first button
  const dlg = page.getByRole('dialog');
  if (await dlg.count()) { await dlg.first().getByRole('button').first().click().catch(() => {}); await page.waitForTimeout(500); }
  const after = await hud();
  check('clock advanced after action', !!after.clock && after.clock !== '07:00', JSON.stringify(after));
  await page.screenshot({ path: join(outDir, 'smoke-2-after-action.png') });

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('24h_life_clean_architecture_state_v2') ?? 'null'));
  check('state persisted to localStorage', !!saved && saved.actionsTodayIds?.length >= 1 && saved.hoursUsed > 0, saved ? `actions=${saved.actionsTodayIds} hoursUsed=${saved.hoursUsed} stats=${JSON.stringify(saved.stats)}` : 'null');
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
}
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ cmd, mobile, failed, results: results.length }));
process.exit(failed ? 1 : 0);
