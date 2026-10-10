// Chụp các màn hình chính của game để rà soát giao diện (dev server :3000 đang chạy).
//   node .claude/skills/run-24-hour-life/uishots.mjs <outDir> [--mobile] [--multi]
// --multi: cần thêm server :2567 (npm run dev:all); chụp sảnh + thành phố nhiều người.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GAME_URL ?? 'http://localhost:3000/';
const outDir = process.argv[2] ?? '.';
const mobile = process.argv.includes('--mobile');
const multi = process.argv.includes('--multi');
const tag = mobile ? 'm' : 'd';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = async (name, full = false) => { await page.waitForTimeout(700); await page.screenshot({ path: join(outDir, `${tag}-${name}.png`), fullPage: full }); console.log('shot', name); };

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(1200);
await shot('1-intro');
await page.getByRole('button', { name: 'Bắt đầu ngày 1' }).click();
await page.waitForTimeout(1500);
await shot('2-room');
await shot('2b-room-full', true);
await page.getByRole('button', { name: /Danh sách hành vi/ }).click().catch(() => {});
await shot('3-actions');
await shot('3b-actions-full', true);
const nav = (name) => page.getByRole('button', { name }).first();
for (const [label, file] of [['Thành phố', '4-city'], ['Mô phỏng 1000 lần', '5-sim'], ['Luật & Bài học', '6-guide']]) {
  if (await nav(label).count()) { await nav(label).click().catch(() => {}); await shot(file); }
}
if (multi) {
  await page.getByTestId('tab-multi').click();
  await shot('7-lobby');
  await page.getByTestId('lobby-name').fill('An');
  await page.getByTestId('lobby-create').click();
  await page.getByTestId('room-game').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !/Đang dựng/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot('8-room-city');
  await shot('8b-room-city-full', true);
}
console.log('errors:', errors.slice(0, 3));
await browser.close();
