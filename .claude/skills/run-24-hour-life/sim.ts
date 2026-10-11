// Direct domain call: headless balance simulation, no browser/React.
// Usage: npx tsx .claude/skills/run-24-hour-life/sim.ts [strategyId] [runs] [traits]
// 3rd arg "traits": each run draws random personality traits like a real game.
import { DOMAIN_STRATEGIES, runDomainSimulation } from '../../../packages/domain/src/simulate';

const [id, runs, traits] = [process.argv[2], Number(process.argv[3] ?? 200), process.argv[4] === 'traits'];
const ids = id ? [id] : DOMAIN_STRATEGIES.map((s) => s.id);
for (const sid of ids) {
  const r = runDomainSimulation(sid, runs, 7, Math.random, traits);
  console.log(`${r.strategyName.padEnd(22)} survive=${r.survivalRate}% burnout=${r.burnoutRate}% bankrupt=${r.bankruptRate}% avgMoney=${r.avgFinalMoney}`);
}
