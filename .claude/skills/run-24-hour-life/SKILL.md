---
name: run-24-hour-life
description: Run, start, build, test, drive and screenshot the 24-Hour-Life game (Vite + React 19 + three.js, Vietnamese life-sim). Use to launch the dev server, click through a day in a headless browser, take screenshots, run the headless balance simulation, or confirm a UI/domain change works.
---

# Run 24-Hour-Life

Browser game (Vite dev server on :3000, state in `localStorage`). Agent path = Playwright driver against Edge/Chromium; domain-only changes can skip the browser via `sim.ts`.
All paths below are relative to the unit root `24-Hour-Life/`. Verified on Windows 11 (Git Bash), Node 22.

## Prerequisites
```bash
npm install                                   # game deps
npm install --prefix .claude/skills/run-24-hour-life   # playwright-core only (no browser download)
```
Needs a Chromium-family browser. Verified only with Windows system Edge (`channel: 'msedge'`, the default); override with `BROWSER_CHANNEL=chrome` if you have Chrome instead. Linux not tried.

## Run (agent path)
```bash
# 1. dev server in background (Vite 8, ready in ~2s)
npm run dev > "$TEMP/vite.log" 2>&1 &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/     # expect 200

# 2. smoke: fresh localStorage -> start day 1 -> open action list -> do first action -> assert
node .claude/skills/run-24-hour-life/driver.mjs smoke "$TEMP/smoke"            # desktop 1280x800
node .claude/skills/run-24-hour-life/driver.mjs smoke "$TEMP/smoke-m" --mobile # 390x844

# one-off screenshot of a fresh game (intro dismissed)
node .claude/skills/run-24-hour-life/driver.mjs shot "$TEMP/shot.png"
```
Smoke prints PASS/FAIL lines + a JSON summary, exit 0 on success, and writes `smoke-1-room.png` / `smoke-2-after-action.png` into the out dir. **Open the PNGs** — expect the 3D room + 07:00 HUD, then a timeline bar showing "Lướt TikTok / Reels" 2h and the action grid.
Extend `driver.mjs` for deeper flows; useful selectors: buttons by accessible name `Bắt đầu ngày 1` (intro), `Danh sách hành vi`, `Chọn hành vi này` (one per action card), nav `Thành phố` / `Phòng` / `Mô phỏng 1000 lần`; modals are `role=dialog`.

## Direct domain invocation (no browser)
Game rules are pure TS in `packages/domain/src/` (no React/localStorage), so for balance/logic changes:
```bash
npx tsx .claude/skills/run-24-hour-life/sim.ts "" 200        # all 5 strategies, 200 runs each
npx tsx .claude/skills/run-24-hour-life/sim.ts <strategyId> 500
```
Baseline seen: Balanced Realist 100% survive; Dopamine Chaser / Workaholic / Pure Sleeper ~0% (burnout); Party Animal ~94%.

## Test / check
Monorepo (npm workspaces: `packages/domain`, `apps/web`, `apps/server`). Use `npm test` (domain determinism tests), `npm run lint` (tsc, all workspaces) and `npm run build` (OK; chunk-size warning is expected).

## Run (human path)
`npm run dev` then open http://localhost:3000. Useless headless.

## Stop
Kill the dev server: `powershell -c "Get-NetTCPConnection -LocalPort 3000 | % { Stop-Process -Id \$_.OwningProcess -Force }"`

## Gotchas
- Not a native-app: no `chromium-cli` here; `playwright-core` is installed *inside the skill dir* so the game's `package.json` stays untouched (`node_modules/` is gitignored).
- Needs WebGL for the three.js room: the driver passes `--use-gl=swiftshader --enable-unsafe-swiftshader`. Without it the room is blank.
- First visit shows a blocking intro modal (also picks an avatar); the driver clears `localStorage` and clicks `Bắt đầu ngày 1`. Save key: `24h_life_clean_architecture_state_v2`; intro flag: `24h_life_intro_seen_v1`.
- Console is noisy with benign three.js/WebGL warnings (`THREE.Clock deprecated`, `GPU stall due to ReadPixels`); the driver only fails on `error`-level logs and uncaught page errors.
- The page scrolls; screenshots are viewport-only, so the room may be scrolled off after opening the action list. Use `fullPage: true` if you need everything.
- Many cards are locked by opening hours / day / skill level (rendered as separate "Chỉ 21h–04h" / "Cần Thể lực cấp 2" buttons); the driver picks the first *enabled* `Chọn hành vi này`, which on day 1 is the TikTok action (a fast-dopamine one).
- UI copy is Vietnamese; match selectors on Vietnamese text.
- Vite warns about `__dirname` in `vite.config.ts` (harmless).

## Troubleshooting
- `curl` not 200 / driver `ERR_CONNECTION_REFUSED` -> dev server not up yet; check `$TEMP/vite.log`, port 3000 may be taken.
- `Executable doesn't exist` / channel error -> no Edge installed; set `BROWSER_CHANNEL=chrome` if Chrome is present.
- Missing `playwright-core` -> run the second `npm install --prefix ...` above.
