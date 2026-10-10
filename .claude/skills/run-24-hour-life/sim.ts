// Direct domain call: headless balance simulation, no browser/React.
// Usage: npx tsx .claude/skills/run-24-hour-life/sim.ts [strategyId] [runs]
import { DOMAIN_STRATEGIES, runDomainSimulation } from '../../../src/domain/simulate';

const [id, runs] = [process.argv[2], Number(process.argv[3] ?? 200)];
const ids = id ? [id] : DOMAIN_STRATEGIES.map((s) => s.id);
for (const sid of ids) {
  const r = runDomainSimulation(sid, runs, 7, Math.random);
  console.log(`${r.strategyName.padEnd(22)} survive=${r.survivalRate}% burnout=${r.burnoutRate}% bankrupt=${r.bankruptRate}% avgMoney=${r.avgFinalMoney}`);
}
