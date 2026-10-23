// Người chơi mới "nghe lời huấn luyện viên": mỗi lượt làm lá 👍 với xác suất `obey`, còn lại bốc ngẫu nhiên một lá trên feed.
// Kiểm tra: làm theo gợi ý thì có sống qua 7 ngày và qua Boss không.
// Usage: npx tsx .claude/skills/run-24-hour-life/coachsim.ts [runs] [obey 0..1]
import {
  PLAYABLE_ACTIONS, planAction, applyAction, endDay, startNextDay, hoursLeftOf, newPlayerState, pickBigEvent,
  pickTraitIds, evaluateLifeStatus, nextAdvice, bigEventReadinessRatio, resolveBigEvent, applyBigEventOutcome,
  summarizeFastDopamine, pickFeedChoices, planBedtime, isNightSleepId, BIG_EVENT_DAY, BIG_EVENT_AFTER_HOURS, mulberry32,
} from '../../../packages/domain/src/index';

const runs = Number(process.argv[2] ?? 300);
const obey = Number(process.argv[3] ?? 0.8);
const tally = { survive: 0, burnout: 0, bankrupt: 0, boss: { great: 0, pass: 0, close: 0, fail: 0, none: 0 } as Record<string, number> };
const deathDays: number[] = [];
const why: Record<string, number> = {};

for (let r = 0; r < runs; r++) {
  const rng = mulberry32(1000 + r);
  let s = newPlayerState([], pickBigEvent(rng), pickTraitIds(rng));
  let dead: string | null = null;
  for (let day = 1; day <= 7 && !dead; day++) {
    let guard = 0;
    while (hoursLeftOf(s) > 0 && guard++ < 60) {
      if (s.day === BIG_EVENT_DAY && !s.bigEvent.result && s.hoursUsed >= BIG_EVENT_AFTER_HOURS) {
        const out = resolveBigEvent(s.bigEvent, { history: s.history, todayIds: s.actionsTodayIds, stats: s.stats });
        s = applyBigEventOutcome(s, out).state;
        continue;
      }
      const ctx = { day: s.day, actionsTodayIds: s.actionsTodayIds, history: s.history };
      const ok = (id: string) => planAction(id, s.location, hoursLeftOf(s), ctx).ok;
      const adv = nextAdvice({
        stats: s.stats, day: s.day, hoursUsed: s.hoursUsed, todayIds: s.actionsTodayIds, bossId: s.bigEvent.id,
        bossRatio: bigEventReadinessRatio(s.bigEvent, { history: s.history, todayIds: s.actionsTodayIds, stats: s.stats }),
        bossDone: !!s.bigEvent.result, crashRisk: summarizeFastDopamine(s.actionsTodayIds).atRisk,
      });
      if (adv.bedtime && rng() < obey) {
        const b = planBedtime(s.location, hoursLeftOf(s), ctx);
        if (b) s = applyAction(s, b.plan.steps, b.actionId, b.plan.endLocation, rng).state;
        break; // ngủ xong thì qua đêm, giờ thừa bỏ qua
      }
      const feed = pickFeedChoices(PLAYABLE_ACTIONS, ok, s.stats, Math.floor(rng() * 1e9));
      const suggested = adv.actionIds.find(ok);
      const id = suggested && rng() < obey ? suggested : feed[Math.floor(rng() * feed.length)] ?? (ok('sleep_nap') ? 'sleep_nap' : null);
      if (!id) break;
      const plan = planAction(id, s.location, hoursLeftOf(s), ctx);
      if (!plan.ok) break;
      const res = applyAction(s, plan.steps, id, plan.endLocation, rng);
      if (!res.applied) break;
      s = res.state;
    }
    if (dead) break;
    if (process.env.TRACE && r < 3) console.log(`r${r} d${day} E${Math.round(s.stats.energy)} M${Math.round(s.stats.mental)} W${Math.round(s.stats.willpower)} $${s.stats.money} used=${s.hoursUsed}`, s.actionsTodayIds.join(','));
    s = endDay(s, rng).state;
    if (process.env.TRACE && r < 3) console.log(`   morning E${Math.round(s.stats.energy)} M${Math.round(s.stats.mental)}`);
    const st = evaluateLifeStatus(s.stats);
    if (st.isGameOver) {
      dead = st.status; deathDays.push(day);
      const k = s.stats.money < 0 ? 'money' : s.stats.energy <= 10 ? 'energy' : 'mental';
      why[k] = (why[k] ?? 0) + 1;
      break;
    }
    if (day < 7) s = startNextDay(s);
  }
  if (!dead) tally.survive++;
  else if (dead === 'bankrupt') tally.bankrupt++;
  else tally.burnout++;
  tally.boss[s.bigEvent.result?.tier ?? 'none']++;
}
const pct = (n: number) => `${Math.round((n / runs) * 100)}%`;
console.log(`obey=${obey} runs=${runs} survive=${pct(tally.survive)} burnout=${pct(tally.burnout)} bankrupt=${pct(tally.bankrupt)}`);
console.log('boss:', Object.entries(tally.boss).map(([k, v]) => `${k}=${pct(v)}`).join(' '));
console.log('death cause', why);
if (deathDays.length) console.log('avg death day', (deathDays.reduce((a, b) => a + b, 0) / deathDays.length).toFixed(1));
