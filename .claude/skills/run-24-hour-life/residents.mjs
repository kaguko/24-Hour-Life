// E2E cư dân thành phố (NPC) trong phòng nhiều người (server :2567 + web :3000 đang chạy: npm run dev:all).
//   node .claude/skills/run-24-hour-life/residents.mjs [outDir]
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
const waitText = (p, re, ms = 10000) => p.waitForFunction((src) => new RegExp(src).test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), re.source, { timeout: ms }).catch(() => {});
const money = (p) => p.evaluate(() => document.body.innerText.match(/Tiền\s*([\d.,]+)\s*(tr|k)?/i)?.[0] ?? '');

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

// 1. cư dân có mặt trong thành phố
const names = await a.evaluate(() => ['ba-tu', 'hung', 'lan', 'tam', 'minh', 'phong', 'binh', 'nam'].map((id) => !!window.__city.residentPosition(id)));
check('đủ 8 cư dân được dựng trong thành phố', names.every(Boolean), JSON.stringify(names));
await a.screenshot({ path: join(outDir, 'res-1-city.png') });

// 2. Anh Hùng chạy quanh công viên: vị trí đổi theo thời gian
const h0 = await a.evaluate(() => window.__city.residentPosition('hung'));
await a.waitForTimeout(4000);
const h1 = await a.evaluate(() => window.__city.residentPosition('hung'));
check('Anh Hùng đang chạy (vị trí đổi sau 4s)', Math.hypot(h1.x - h0.x, h1.z - h0.z) > 2, `${JSON.stringify(h0)} -> ${JSON.stringify(h1)}`);

// 3. bấm vào Bà Tư: đi tới, hiện bảng; trò chuyện
await a.evaluate(() => window.__city.opts.onResident('ba-tu'));
await a.getByTestId('resident-panel').waitFor({ timeout: 40000 });
check('đi tới Bà Tư rồi hiện bảng cư dân', /Bà Tư/.test(await a.getByTestId('resident-panel').textContent()));
await a.getByRole('button', { name: /Trò chuyện/ }).click();
await waitText(a, /An trò chuyện với Bà Tư/);
check('bảng tin: An trò chuyện với Bà Tư', /An trò chuyện với Bà Tư/.test(await stageText(a)));
await waitText(a, /Bà Tư: /);
check('Bà Tư nói câu thoại (bong bóng)', /Bà Tư: /.test(await stageText(a)));
await waitText(b, /An trò chuyện với Bà Tư/);
check('Binh cũng thấy cuộc trò chuyện', /An trò chuyện với Bà Tư/.test(await stageText(b)));
await a.screenshot({ path: join(outDir, 'res-2-talk.png') });

// 4. giúp đỡ rồi mời trà đá: trừ tiền, mức thân quen tăng
await a.waitForTimeout(800);
const m0 = await money(a);
await a.getByRole('button', { name: /Xách giỏ đồ giúp bà/ }).click();
await waitText(a, /giúp đỡ Bà Tư/);
check('giúp đỡ Bà Tư có phản hồi', /giúp đỡ Bà Tư/.test(await stageText(a)));
await a.waitForTimeout(800);
await a.getByRole('button', { name: /Mời bà ly trà đá/ }).click();
await waitText(a, /Tiền -15k/);
check('mời trà đá: thông báo trừ 15k', /Tiền -15k/.test(await stageText(a)), `${m0} -> ${await money(a)}`);
const panel = await a.getByTestId('resident-panel').textContent();
check('mức thân quen tăng sau khi giúp và mời', /Quen mặt|Bạn bè/.test(panel), panel.slice(0, 80));
await a.screenshot({ path: join(outDir, 'res-3-treat.png') });

// 5. nói chuyện lặp lại nhiều lần trong ngày: cư dân "mệt" chứ không lỗi
for (let i = 0; i < 3; i++) {
  await a.waitForTimeout(750);
  await a.getByRole('button', { name: /Trò chuyện/ }).click();
}
await waitText(a, /đủ rồi|nghỉ|mệt|đi chơi đi/, 6000);
check('nói chuyện quá nhiều trong ngày: cư dân từ chối nhẹ nhàng', /đi chơi đi|nhiều rồi/.test(await stageText(a)), '');

// 6. cư dân ở xa: bấm vào Phong ở sảnh arcade, đi tới và đối thoại
await a.getByRole('button', { name: '✕' }).first().click().catch(() => {});
await a.evaluate(() => window.__city.opts.onResident('phong'));
await a.waitForFunction(() => /Phong/.test(document.querySelector('[data-testid="resident-panel"]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
check('đi tới Phong (xa) rồi hiện bảng', /Phong/.test((await a.getByTestId('resident-panel').textContent().catch(() => '')) ?? ''));
await a.getByRole('button', { name: /Rủ bạn ấy đi dạo/ }).click();
await waitText(a, /giúp đỡ Phong/);
check('rủ Phong đi dạo thành công', /giúp đỡ Phong/.test(await stageText(a)));
await a.waitForTimeout(600);
await a.screenshot({ path: join(outDir, 'res-4-phong.png') });

check('không có lỗi trang', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ failed, results: results.length }));
process.exit(failed ? 1 : 0);
