// Direct domain call: headless balance simulation, no browser/React.
// Usage: npx tsx .claude/skills/run-24-hour-life/sim.ts [strategyId] [runs] [traits] [items]
// 3rd arg "traits": each run draws random personality traits like a real game.
// 4th arg "items": every run starts owning ALL shop items (best case, ignores cost).
import { DOMAIN_STRATEGIES, runDomainSimulation } from '../../../packages/domain/src/simulate';
import { SHOP_ITEMS } from '../../../packages/domain/src/shop';

const [id, runs, traits] = [process.argv[2], Number(process.argv[3] ?? 200), process.argv[4] === 'traits'];
const itemIds = process.argv[5] === 'items' ? SHOP_ITEMS.map((i) => i.id) : [];
const ids = id ? [id] : DOMAIN_STRATEGIES.map((s) => s.id);
for (const sid of ids) {
  const r = runDomainSimulation(sid, runs, 7, Math.random, traits, itemIds);
  console.log(`${r.strategyName.padEnd(22)} survive=${r.survivalRate}% burnout=${r.burnoutRate}% bankrupt=${r.bankruptRate}% avgMoney=${r.avgFinalMoney}`);
}
