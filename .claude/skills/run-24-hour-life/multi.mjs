// E2E multiplayer: 2 trình duyệt cùng vào một phòng (server :2567 + web :3000 đang chạy: npm run dev:all).
//   node .claude/skills/run-24-hour-life/multi.mjs [outDir]
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
  page.on('console', (m) => m.type() === 'error' && !/WebGL|GPU stall|ReadPixels/i.test(m.text()) && !(label === 'C' && /Failed to load resource/.test(m.text())) && errors.push(`${label}: ${m.text()}`));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const start = page.getByRole('button', { name: 'Bắt đầu ngày 1' });
  if (await start.count()) await start.click();
  await page.getByTestId('tab-multi').click();
  return page;
}
const waitText = (page, id, re, ms = 15000) => page.waitForFunction(([i, r]) => new RegExp(r).test(document.querySelector(`[data-testid="${i}"]`)?.textContent ?? ''), [id, re.source], { timeout: ms });

const a = await newPlayer('A');
await a.getByTestId('lobby-name').fill('An');
await a.getByTestId('lobby-create').click();
await a.getByTestId('room-game').waitFor({ timeout: 15000 });
const code = (await a.getByTestId('room-code').textContent()).trim();
check('A tạo phòng, nhận mã 4 ký tự', /^[A-Z0-9]{4}$/.test(code), code);

await a.getByTestId('city-stage').waitFor();
await a.waitForFunction(() => !/Đang dựng/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 30000 });
check('thành phố 3D dựng xong (có canvas)', (await a.locator('[data-testid="city-stage"] canvas').count()) === 1);
await a.waitForTimeout(1500);
await a.screenshot({ path: join(outDir, 'multi-1-A-city.png') });

const b = await newPlayer('B');
await b.getByTestId('lobby-name').fill('Binh');
await b.getByTestId('lobby-code').fill(code.toLowerCase());
await b.getByTestId('lobby-join').click();
await b.getByTestId('room-game').waitFor({ timeout: 15000 });
await waitText(a, 'players', /An[\s\S]*Binh|Binh[\s\S]*An/);
await waitText(b, 'players', /An[\s\S]*Binh|Binh[\s\S]*An/);
check('hai người thấy nhau trong danh sách', true);
await b.getByTestId('city-stage').waitFor();
await b.waitForFunction(() => !/Đang dựng/.test(document.querySelector('[data-testid="city-stage"]')?.textContent ?? ''), null, { timeout: 30000 });
await a.waitForTimeout(1500);
await a.screenshot({ path: join(outDir, 'multi-2-A-two-players.png') });

// vào sai mã
const c = await newPlayer('C');
await c.getByTestId('lobby-name').fill('Cuong');
await c.getByTestId('lobby-code').fill('ZZZZ');
await c.getByTestId('lobby-join').click();
await c.getByTestId('lobby-error').waitFor({ timeout: 10000 });
check('mã sai báo lỗi rõ ràng', /Không tìm thấy phòng/.test(await c.getByTestId('lobby-error').textContent()));

// chat
await a.getByTestId('dock-tab-chat').click(); // chat nằm trong tab của bảng hoạt động
await a.getByTestId('chat-input').fill('xin chào Binh');
await a.getByTestId('chat-input').press('Enter');
await waitText(b, 'chat-log', /xin chào Binh/);
check('chat tới người kia', true);

// hành vi chung: An rủ chạy bộ, Binh vào, An bắt đầu
const socialBefore = await a.getByTestId('my-stats').textContent();
await a.getByTestId('dock-tab-joint').click(); // quay lại tab hoạt động chung sau khi dùng chat
await a.getByTestId('offer-run_together').click();
await b.getByTestId('invite').waitFor({ timeout: 10000 });
check('Binh nhận lời mời', /An rủ bạn/.test(await b.getByTestId('invite').textContent()));
await b.getByTestId('invite').getByRole('button', { name: 'Vào' }).click();
await waitText(a, 'offers', /2\/4/);
await a.getByTestId('start-offer').click();
await a.waitForFunction(() => document.querySelector('[data-testid="offers"]') === null, null, { timeout: 10000 });
await a.waitForTimeout(800);
const socialAfter = await a.getByTestId('my-stats').textContent();
check('chạy bộ cùng nhau: chỉ số của An đổi', socialBefore !== socialAfter, `${socialBefore} -> ${socialAfter}`);
await a.screenshot({ path: join(outDir, 'multi-3-A-after-joint.png') });

// hành vi một mình: mở danh sách, chọn hành vi làm được đầu tiên; nhân vật đi tới địa điểm
const posBefore = await a.evaluate(() => window.__city?.debugActors().find((x) => x.id)?.pos);
await a.getByTestId('dock-tab-solo').click();
const firstEnabled = a.getByRole('button', { name: 'Chọn hành vi này' }).locator(':scope:not([disabled])').first();
await firstEnabled.scrollIntoViewIfNeeded();
const hoursBefore = await a.getByTestId('room-game').textContent();
await firstEnabled.click();
await a.waitForTimeout(3000);
const hoursText = (await a.getByTestId('room-game').textContent()).match(/đã dùng ([\d.]+)h/)?.[1];
check('hành vi một mình tốn giờ (server áp dụng)', Number(hoursText) > 1.75, `đã dùng ${hoursText}h`);
const actors = await a.evaluate(() => window.__city?.debugActors());
check('nhân vật 3D có mô hình + 32 clip', actors?.length === 2 && actors.every((x) => x.hasModel && x.clips === 32), JSON.stringify(actors?.map((x) => x.anim)));

// qua đêm: cả hai ready
await a.getByTestId('ready-btn').click();
await b.getByTestId('ready-btn').click();
await a.getByRole('button', { name: /Tiếp tục|Sang|Bắt đầu ngày|Ngày mới/ }).first().waitFor({ timeout: 20000 }).catch(() => {});
await waitText(a, 'phase', /Buổi sáng/, 20000);
check('sang buổi sáng khi cả hai ready', true);
await a.screenshot({ path: join(outDir, 'multi-4-A-morning.png') });
const modalA = await a.locator('[role="dialog"]').count();
check('An thấy báo cáo sáng riêng', modalA >= 1);
const notes = await a.getByTestId('friend-notes').textContent();
check('báo cáo có "Bạn bè hôm qua" (đi cùng Binh)', /cùng Binh/.test(notes ?? ''), notes?.slice(0, 120));

check('không có lỗi trang', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ failed, results: results.length }));
process.exit(failed ? 1 : 0);
