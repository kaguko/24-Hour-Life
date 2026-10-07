import { PlayerStatsPrimitive, SimulationResultPrimitive } from './types';
import { INITIAL_STATS, evaluateLifeStatus } from './stats';
import { DOMAIN_ACTIONS, executeActionById } from './actions';
import { processOvernightCycle } from './consequence';

export interface DomainStrategy {
  id: string;
  name: string;
  description: string;
  decideActionId: (stats: PlayerStatsPrimitive, hoursLeft: number, actionsToday: string[]) => string;
}

export const DOMAIN_STRATEGIES: DomainStrategy[] = [
  {
    id: 'dopamine_chaser',
    name: 'Nghiện kích thích (Dopamine Chaser)',
    description: 'Ưu tiên lướt mạng, cày game, đồ ăn nhanh. Chỉ ngủ khi không còn giờ.',
    decideActionId: (stats, hoursLeft) => {
      if (stats.money < 200 && hoursLeft >= 4) return 'work_focused';
      if (hoursLeft >= 3) return 'binge_gaming';
      if (hoursLeft >= 2) return 'scroll_social';
      if (hoursLeft >= 0.5) return 'fast_food';
      return 'sleep_nap';
    },
  },
  {
    id: 'workaholic',
    name: 'Cuồng công việc (Workaholic)',
    description: 'Cày cuốc tối đa, làm thêm đêm, chỉ ngủ 4-5 tiếng và cắt bỏ mọi thứ khác.',
    decideActionId: (stats, hoursLeft, actionsToday) => {
      const workDone = actionsToday.filter((id) => id.startsWith('work_')).length;
      if (workDone < 2 && hoursLeft >= 4) return 'work_focused';
      if (hoursLeft >= 4 && stats.energy > 20) return 'work_overtime';
      if (hoursLeft >= 8 && stats.energy < 30) return 'sleep_deep';
      if (hoursLeft >= 1.5) return 'sleep_nap';
      return 'fast_food';
    },
  },
  {
    id: 'pure_sleeper',
    name: 'Trốn tránh thực tại (Chỉ ngủ & nằm)',
    description: 'Ngủ tối đa 8h, chợp mắt tiếp, rất ngại làm việc và giao tiếp.',
    decideActionId: (_stats, hoursLeft, actionsToday) => {
      if (!actionsToday.includes('sleep_deep') && hoursLeft >= 8) return 'sleep_deep';
      if (hoursLeft >= 1.5) return 'sleep_nap';
      if (hoursLeft >= 1) return 'meditate_walk';
      return 'fast_food';
    },
  },
  {
    id: 'party_animal',
    name: 'Tiệc tùng & Hướng ngoại',
    description: 'Ưu tiên nhậu, cà phê bạn bè, làm việc cầm chừng đủ chi trả.',
    decideActionId: (stats, hoursLeft, actionsToday) => {
      if (stats.money < 500 && hoursLeft >= 4) return 'work_focused';
      const hadSocial = actionsToday.some((id) => ['beer_party', 'meet_friend'].includes(id));
      if (!hadSocial && hoursLeft >= 3.5 && stats.money >= 500) return 'beer_party';
      if (hoursLeft >= 2.5) return 'meet_friend';
      if (hoursLeft >= 8) return 'sleep_deep';
      return 'sleep_nap';
    },
  },
  {
    id: 'balanced',
    name: 'Cân bằng có kỷ luật (Balanced Realist)',
    description: 'Ngủ đủ 8h, làm việc 4h, tập thể dục/nấu ăn, kết nối bạn bè vừa phải.',
    decideActionId: (stats, hoursLeft, actionsToday) => {
      const slept = actionsToday.includes('sleep_deep');
      const worked = actionsToday.some((id) => id.startsWith('work_'));
      const wellness = actionsToday.some((id) => ['exercise', 'cook_healthy'].includes(id));

      if (!slept && hoursLeft >= 8) return 'sleep_deep';
      if (!worked && hoursLeft >= 4) return 'work_focused';
      if (!wellness && hoursLeft >= 1.5 && stats.energy > 35) return 'exercise';
      if (hoursLeft >= 1.5 && stats.energy < 50) return 'cook_healthy';
      if (stats.social < 50 && hoursLeft >= 1) return 'call_family';
      if (hoursLeft >= 2 && stats.willpower >= 30) return 'learn_skill';
      if (hoursLeft >= 1.5) return 'sleep_nap';
      return 'meditate_walk';
    },
  },
];

export function runDomainSimulation(
  strategyId: string,
  totalRuns = 500,
  daysPerRun = 7
): SimulationResultPrimitive {
  const strategy = DOMAIN_STRATEGIES.find((s) => s.id === strategyId) || DOMAIN_STRATEGIES[4];

  let survivals = 0;
  let burnouts = 0;
  let bankruptcies = 0;

  let sumDopamine = 0;
  let sumEnergy = 0;
  let sumMental = 0;
  let sumSocial = 0;
  let sumMoney = 0;
  let sumWillpower = 0;
  let sumSurvivalDays = 0;

  for (let run = 0; run < totalRuns; run++) {
    let currentStats = { ...INITIAL_STATS };
    let sleepDebt = 0;
    let survivedDays = 0;
    let endedEarly = false;

    for (let day = 1; day <= daysPerRun; day++) {
      let hoursLeft = 24;
      const actionsToday: string[] = [];

      while (hoursLeft > 0) {
        let chosenId = strategy.decideActionId(currentStats, hoursLeft, actionsToday);
        let action = DOMAIN_ACTIONS.find((a) => a.id === chosenId);

        if (!action || action.hours > hoursLeft) {
          const fallback = DOMAIN_ACTIONS.filter((a) => a.hours <= hoursLeft).sort(
            (a, b) => b.hours - a.hours
          )[0];
          if (!fallback) break;
          chosenId = fallback.id;
          action = fallback;
        }

        const res = executeActionById(chosenId, currentStats, hoursLeft);
        if (!res.success) break;

        currentStats = res.newStats;
        actionsToday.push(chosenId);
        hoursLeft -= res.hoursSpent;
      }

      const nightRes = processOvernightCycle(currentStats, actionsToday, sleepDebt, day);
      currentStats = nightRes.newStats;
      sleepDebt = nightRes.newSleepDebt;

      const lifeStatus = evaluateLifeStatus(currentStats);
      if (lifeStatus.status === 'burnout') {
        burnouts++;
        endedEarly = true;
        survivedDays = day;
        break;
      }
      if (lifeStatus.status === 'bankrupt') {
        bankruptcies++;
        endedEarly = true;
        survivedDays = day;
        break;
      }

      survivedDays = day;
    }

    if (!endedEarly) survivals++;

    sumSurvivalDays += survivedDays;
    sumDopamine += currentStats.dopamine;
    sumEnergy += currentStats.energy;
    sumMental += currentStats.mental;
    sumSocial += currentStats.social;
    sumMoney += currentStats.money;
    sumWillpower += currentStats.willpower;
  }

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    runs: totalRuns,
    daysPerRun,
    survivalRate: Math.round((survivals / totalRuns) * 100),
    burnoutRate: Math.round((burnouts / totalRuns) * 100),
    bankruptRate: Math.round((bankruptcies / totalRuns) * 100),
    avgFinalDopamine: Math.round(sumDopamine / totalRuns),
    avgFinalEnergy: Math.round(sumEnergy / totalRuns),
    avgFinalMental: Math.round(sumMental / totalRuns),
    avgFinalSocial: Math.round(sumSocial / totalRuns),
    avgFinalMoney: Math.round(sumMoney / totalRuns),
    avgFinalWillpower: Math.round(sumWillpower / totalRuns),
    avgSurvivalDays: Number((sumSurvivalDays / totalRuns).toFixed(1)),
  };
}
