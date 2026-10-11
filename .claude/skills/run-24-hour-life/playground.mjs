// E2E con vật + biểu cảm trong phòng nhiều người (server :2567 + web :3000 đang chạy: npm run dev:all).
//   node .claude/skills/run-24-hour-life/playground.mjs [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GAME_URL ?? 'http://localhost:3000/';
const outDir = process.argv[2] ?? '.';
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const errors = [];

async function newPlayer(label) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(90000); // render phần mềm (không GPU) chỉ ~3 khung hình/giây nên thao tác có thể chậm
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebGL|GPU stall|ReadPixels/i.test(m.text()) && errors.push(`${label}: ${m.text()}`));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const start = page.getByRole('button', { name: 'Bắt đầu ngày 1' });
  if (await start.count()) await start.click();
  await page.getByTestId('tab-multi').click();
  return page;
}
const cityReady = async (p) => {
  await p.getByTestId('city-stage').waitFor();
  await p.waitForFunction(() => !/Đang dựng/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 30000 });
};
const stageText = (p) => p.getByTestId('city-stage').textContent();

const a = await newPlayer('A');
await a.getByTestId('lobby-name').fill('An');
await a.getByTestId('lobby-create').click();
await a.getByTestId('room-game').waitFor({ timeout: 15000 });
const code = (await a.getByTestId('room-code').textContent()).trim();
await cityReady(a);
const b = await newPlayer('B');
await b.getByTestId('lobby-name').fill('Binh');
await b.getByTestId('lobby-code').fill(code.toLowerCase());
await b.getByTestId('lobby-join').click();
await b.getByTestId('room-game').waitFor({ timeout: 15000 });
await cityReady(b);
await a.waitForTimeout(1500);

// biểu cảm có đích: ôm Binh (cả hai đang đứng cùng chỗ xuất phát)
await a.getByTestId('emote-bar').getByTitle('Ôm').click();
await b.waitForFunction(() => /ôm/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
check('Binh thấy An ôm mình (bảng tin)', /An ôm Binh/.test(await stageText(b)), (await stageText(b)).slice(0, 120));
await a.waitForTimeout(500);
await a.screenshot({ path: join(outDir, 'play-1-hug.png') });

// con vật: bấm vào Mèo Cáu -> đi tới -> hiện bảng vuốt ve / chọc
const animals = await a.evaluate(() => window.__city.animalPosition('cat'));
check('thành phố có con vật (mèo ở công viên)', !!animals, JSON.stringify(animals));
await a.evaluate(() => window.__city.opts.onAnimal('cat'));
await a.getByTestId('animal-panel').waitFor({ timeout: 30000 });
check('đi tới mèo rồi hiện bảng Vuốt ve / Chọc', true);
await a.getByRole('button', { name: /Chọc/ }).click();
await a.waitForFunction(() => /chọc Mèo Cáu/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
check('An chọc mèo: bảng tin hiện phản ứng của mèo', /An chọc Mèo Cáu/.test(await stageText(a)));
await b.waitForFunction(() => /chọc Mèo Cáu/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
check('Binh cũng thấy mèo bị chọc', /An chọc Mèo Cáu/.test(await stageText(b)));
await a.waitForTimeout(800);
await a.screenshot({ path: join(outDir, 'play-2-cat-angry.png') });
const bScreen = await b.evaluate(() => window.__city.animalPosition('cat'));
check('mèo chạy tới chỗ trú (-> 10,3) ở máy Binh', bScreen && Math.hypot(bScreen.x - 10, bScreen.z - 3) < 4, JSON.stringify(bScreen));

check('không có lỗi trang', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ failed, results: results.length }));
process.exit(failed ? 1 : 0);
