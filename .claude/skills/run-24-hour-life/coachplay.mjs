// Chơi trọn 7 ngày trên trình duyệt chỉ bằng cách nghe lời huấn luyện viên (lá 👍 + nút Đi ngủ khi được nhắc).
// Kiểm tra người chơi mới "làm theo gợi ý" có tới được màn kết cục không. Cần dev server :3000.
//   node .claude/skills/run-24-hour-life/coachplay.mjs <outDir> [--mobile]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GAME_URL ?? 'http://localhost:3000/';
const outDir = process.argv[2] ?? '.';
const mobile = process.argv.includes('--mobile');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByRole('button', { name: 'Bắt đầu ngày 1' }).click();
await page.waitForTimeout(800);

const log = [];
const tryClick = async (loc) => {
  if ((await loc.count()) && (await loc.first().isVisible()) && (await loc.first().isEnabled())) {
    await loc.first().click();
    await page.waitForTimeout(450);
    return true;
  }
  return false;
};
let shots = 0;
for (let step = 0; step < 400; step++) {
  const dialog = page.locator('[role=dialog]');
  if (await dialog.count() && (await dialog.first().getByRole('button', { name: /Thử cách khác/ }).count())) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(outDir, 'ending.png') });
    await page.screenshot({ path: join(outDir, 'ending-full.png'), fullPage: true });
    log.push('ENDING');
    break;
  }
  if (await tryClick(page.getByRole('button', { name: /Ngày \d+ thôi!|Xem kết cục/ }))) { log.push('morning'); if (shots++ < 2) await page.screenshot({ path: join(outDir, `morning-${shots}.png`) }); continue; }
  if (await tryClick(page.getByRole('button', { name: /^Tiếp!$|^Tiếp tục/ }))) continue;
  if (await tryClick(page.getByRole('button', { name: /^(Cưỡng lại|Dừng lại)/ }))) { log.push('resist'); continue; }
  if (await dialog.count() && (await dialog.first().isVisible())) {
    if (await tryClick(dialog.locator('button.text-left'))) { log.push('event'); continue; }
    if (await tryClick(dialog.locator('button').first())) { log.push('dialog?'); continue; }
  }
  await tryClick(page.getByRole('button', { name: '🔥 Feed' }));
  const status = (await page.locator('[role=status]').allInnerTexts()).join(' ');
  if (/Đi ngủ ngay|Đến giờ đi ngủ|đi ngủ sớm/.test(status) && (await tryClick(page.getByRole('button', { name: /😴 Đi ngủ/ })))) { log.push('BED'); await page.waitForTimeout(5000); continue; }
  const card = page.locator('div.group', { hasText: '👍 Gợi ý' }).getByRole('button', { name: /Chọn hành vi này/ });
  if (await tryClick(card)) { log.push('👍'); continue; }
  if (await tryClick(page.getByRole('button', { name: /Chọn hành vi này/ }))) { log.push('any'); continue; }
  if (await tryClick(page.getByRole('button', { name: /😴 Đi ngủ|Đi ngủ \(/ }))) { log.push('BED*'); await page.waitForTimeout(5000); continue; }
  await page.waitForTimeout(800);
}
const save = await page.evaluate(() => localStorage.getItem('24h_life_clean_architecture_state_v2'));
const st = save ? JSON.parse(save) : null;
console.log(log.join(' '));
console.log(JSON.stringify({ ended: log.includes('ENDING'), day: st?.game?.day ?? st?.day, stats: st?.game?.stats ?? st?.stats, errors: errors.slice(0, 3) }));
await browser.close();
