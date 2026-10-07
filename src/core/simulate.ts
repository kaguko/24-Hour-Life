import { PlayerStats, INITIAL_STATS, evaluateLifeState } from './stats';
import { GAME_ACTIONS, ActionDefinition, calculateActionEffect } from './actions';
import { processNightConsequences } from './consequence';

export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  pickAction: (
    currentStats: PlayerStats,
    hoursLeft: number,
    actionsToday: ActionDefinition[]
  ) => ActionDefinition;
}

export interface SimulationResult {
  strategyId: string;
  strategyName: string;
  runs: number;
  daysPerRun: number;
  survivalRate: number;       // % số lượt không bị burnout hoặc bankrupt
  burnoutRate: number;        // % sụp đổ do kiệt quệ năng lượng / tinh thần
  bankruptRate: number;       // % phá sản âm tiền
  avgFinalDopamine: number;
  avgFinalEnergy: number;
  avgFinalMental: number;
  avgFinalSocial: number;
  avgFinalMoney: number;
  avgFinalWillpower: number;
  avgSurvivalDays: number;
  dayByDayHistory: Array<{
    day: number;
    avgEnergy: number;
    avgMental: number;
    avgMoney: number;
    avgWillpower: number;
    avgDopamine: number;
  }>;
}

/**
 * 5 Chiến lược mô phỏng tiêu biểu
 */
export const SIMULATION_STRATEGIES: StrategyDefinition[] = [
  // 1. NGHIỆN DOPAMINE (DOPAMINE CHASER)
  {
    id: 'dopamine_chaser',
    name: 'Nghiện kích thích (Dopamine Chaser)',
    description: 'Ưu tiên lướt mạng, cày game, đồ ăn nhanh. Chỉ ngủ khi không còn giờ.',
    pickAction: (stats, hoursLeft) => {
      // Nếu hết tiền thì mới miễn cưỡng làm việc chút
      if (stats.money < 200 && hoursLeft >= 4) {
        return GAME_ACTIONS.find((a) => a.id === 'work_focused')!;
      }
      // Ưu tiên lướt FB và game
      if (hoursLeft >= 3) {
        return GAME_ACTIONS.find((a) => a.id === 'binge_gaming')!;
      }
      if (hoursLeft >= 2) {
        return GAME_ACTIONS.find((a) => a.id === 'scroll_social')!;
      }
      if (hoursLeft >= 0.5) {
        return GAME_ACTIONS.find((a) => a.id === 'fast_food')!;
      }
      return GAME_ACTIONS.find((a) => a.id === 'sleep_nap')!;
    },
  },

  // 2. CUỒNG CÔNG VIỆC (WORKAHOLIC)
  {
    id: 'workaholic',
    name: 'Cuồng công việc (Workaholic)',
    description: 'Cày cuốc tối đa, làm thêm đêm, chỉ ngủ 4-5 tiếng và cắt bỏ mọi thứ khác.',
    pickAction: (stats, hoursLeft, actionsToday) => {
      const workDone = actionsToday.filter((a) => a.category === 'work').length;
      if (workDone < 2 && hoursLeft >= 4) {
        return GAME_ACTIONS.find((a) => a.id === 'work_focused')!;
      }
      if (hoursLeft >= 4 && stats.energy > 20) {
        return GAME_ACTIONS.find((a) => a.id === 'work_overtime')!;
      }
      if (hoursLeft >= 8 && stats.energy < 30) {
        return GAME_ACTIONS.find((a) => a.id === 'sleep_deep')!;
      }
      if (hoursLeft >= 1.5) {
        return GAME_ACTIONS.find((a) => a.id === 'sleep_nap')!;
      }
      return GAME_ACTIONS.find((a) => a.id === 'fast_food')!;
    },
  },

  // 3. LUÔN NGỦ (PURE SLEEPER)
  {
    id: 'pure_sleeper',
    name: 'Trốn tránh thực tại (Chỉ ngủ & nằm)',
    description: 'Ngủ tối đa 8h, chợp mắt tiếp, rất ngại làm việc và giao tiếp.',
    pickAction: (_stats, hoursLeft, actionsToday) => {
      const slept = actionsToday.some((a) => a.id === 'sleep_deep');
      if (!slept && hoursLeft >= 8) {
        return GAME_ACTIONS.find((a) => a.id === 'sleep_deep')!;
      }
      if (hoursLeft >= 1.5) {
        return GAME_ACTIONS.find((a) => a.id === 'sleep_nap')!;
      }
      if (hoursLeft >= 1) {
        return GAME_ACTIONS.find((a) => a.id === 'meditate_walk')!;
      }
      return GAME_ACTIONS.find((a) => a.id === 'fast_food')!;
    },
  },

  // 4. TIỆC TÙNG HƯỚNG NGOẠI (PARTY ANIMAL)
  {
    id: 'party_animal',
    name: 'Tiệc tùng & Hướng ngoại',
    description: 'Ưu tiên nhậu, cà phê bạn bè, làm việc cầm chừng đủ chi trả.',
    pickAction: (stats, hoursLeft, actionsToday) => {
      if (stats.money < 500 && hoursLeft >= 4) {
        return GAME_ACTIONS.find((a) => a.id === 'work_focused')!;
      }
      const hadSocial = actionsToday.some((a) => a.category === 'social');
      if (!hadSocial && hoursLeft >= 3.5 && stats.money >= 500) {
        return GAME_ACTIONS.find((a) => a.id === 'beer_party')!;
      }
      if (hoursLeft >= 2.5) {
        return GAME_ACTIONS.find((a) => a.id === 'meet_friend')!;
      }
      if (hoursLeft >= 8) {
        return GAME_ACTIONS.find((a) => a.id === 'sleep_deep')!;
      }
      return GAME_ACTIONS.find((a) => a.id === 'sleep_nap')!;
    },
  },

  // 5. CÂN BẰNG KỶ LUẬT (BALANCED REALIST)
  {
    id: 'balanced',
    name: 'Cân bằng có kỷ luật (Balanced Realist)',
    description: 'Ngủ đủ 8h, làm việc 4h, tập thể dục/nấu ăn, kết nối bạn bè vừa phải.',
    pickAction: (stats, hoursLeft, actionsToday) => {
      const slept = actionsToday.some((a) => a.id === 'sleep_deep');
      const worked = actionsToday.some((a) => a.category === 'work');
      const wellness = actionsToday.some((a) => a.category === 'wellness');

      // 1. Phải ngủ đủ 8h
      if (!slept && hoursLeft >= 8) {
        return GAME_ACTIONS.find((a) => a.id === 'sleep_deep')!;
      }
      // 2. Phải làm việc kiếm sống
      if (!worked && hoursLeft >= 4) {
        return GAME_ACTIONS.find((a) => a.id === 'work_focused')!;
      }
      // 3. Phải rèn luyện thể chất nếu năng lượng cho phép
      if (!wellness && hoursLeft >= 1.5 && stats.energy > 35) {
        return GAME_ACTIONS.find((a) => a.id === 'exercise')!;
      }
      // 4. Nấu ăn tiết kiệm tiền và bổ sung năng lượng
      if (hoursLeft >= 1.5 && stats.energy < 50) {
        return GAME_ACTIONS.find((a) => a.id === 'cook_healthy')!;
      }
      // 5. Giữ kết nối xã hội
      if (stats.social < 50 && hoursLeft >= 1) {
        return GAME_ACTIONS.find((a) => a.id === 'call_family')!;
      }
      // 6. Học kỹ năng
      if (hoursLeft >= 2 && stats.willpower >= 30) {
        return GAME_ACTIONS.find((a) => a.id === 'learn_skill')!;
      }
      // Cuối cùng chợp mắt nếu còn dư giờ
      if (hoursLeft >= 1.5) {
        return GAME_ACTIONS.find((a) => a.id === 'sleep_nap')!;
      }
      return GAME_ACTIONS.find((a) => a.id === 'meditate_walk')!;
    },
  },
];

/**
 * Chạy mô phỏng N lần cho 1 chiến lược
 */
export function runSimulation(
  strategy: StrategyDefinition,
  totalRuns = 500,
  daysPerRun = 7
): SimulationResult {
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

  // Lịch sử theo ngày
  const dayStatsMap: Array<{
    day: number;
    energies: number[];
    mentals: number[];
    moneys: number[];
    willpowers: number[];
    dopamines: number[];
  }> = Array.from({ length: daysPerRun }, (_, i) => ({
    day: i + 1,
    energies: [],
    mentals: [],
    moneys: [],
    willpowers: [],
    dopamines: [],
  }));

  for (let run = 0; run < totalRuns; run++) {
    let currentStats: PlayerStats = { ...INITIAL_STATS };
    let sleepDebt = 0;
    let survivedDays = 0;
    let runEndedPrematurely = false;

    for (let day = 1; day <= daysPerRun; day++) {
      let hoursLeft = 24;
      const actionsToday: ActionDefinition[] = [];

      // Vòng lặp hành vi trong 24 giờ
      while (hoursLeft > 0) {
        const candidate = strategy.pickAction(currentStats, hoursLeft, actionsToday);
        if (!candidate || candidate.hours > hoursLeft) {
          // Thử tìm hành động ngắn hơn khớp với số giờ còn lại
          const fallback = GAME_ACTIONS.filter((a) => a.hours <= hoursLeft).sort(
            (a, b) => b.hours - a.hours
          )[0];
          if (!fallback) {
            break; // Hết giờ hoặc không còn hành động nào vừa
          }
          const effect = calculateActionEffect(fallback, currentStats);
          currentStats = applyDeltas(currentStats, effect.statDeltas);
          actionsToday.push(fallback);
          hoursLeft -= fallback.hours;
        } else {
          const effect = calculateActionEffect(candidate, currentStats);
          currentStats = applyDeltas(currentStats, effect.statDeltas);
          actionsToday.push(candidate);
          hoursLeft -= candidate.hours;
        }
      }

      // Xử lý chuyển ngày & hậu quả trễ
      const nightRes = processNightConsequences(currentStats, actionsToday, sleepDebt, day);
      currentStats = nightRes.newStats;
      sleepDebt = nightRes.newSleepDebt;

      // Lưu tracking chỉ số ngày
      dayStatsMap[day - 1].energies.push(currentStats.energy);
      dayStatsMap[day - 1].mentals.push(currentStats.mental);
      dayStatsMap[day - 1].moneys.push(currentStats.money);
      dayStatsMap[day - 1].willpowers.push(currentStats.willpower);
      dayStatsMap[day - 1].dopamines.push(currentStats.dopamine);

      const state = evaluateLifeState(currentStats);
      if (state.status === 'burnout') {
        burnouts++;
        runEndedPrematurely = true;
        survivedDays = day;
        break;
      }
      if (state.status === 'bankrupt') {
        bankruptcies++;
        runEndedPrematurely = true;
        survivedDays = day;
        break;
      }

      survivedDays = day;
    }

    if (!runEndedPrematurely) {
      survivals++;
    }

    sumSurvivalDays += survivedDays;
    sumDopamine += currentStats.dopamine;
    sumEnergy += currentStats.energy;
    sumMental += currentStats.mental;
    sumSocial += currentStats.social;
    sumMoney += currentStats.money;
    sumWillpower += currentStats.willpower;
  }

  const dayByDayHistory = dayStatsMap.map((d) => ({
    day: d.day,
    avgEnergy: avg(d.energies),
    avgMental: avg(d.mentals),
    avgMoney: avg(d.moneys),
    avgWillpower: avg(d.willpowers),
    avgDopamine: avg(d.dopamines),
  }));

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
    dayByDayHistory,
  };
}

function applyDeltas(base: PlayerStats, deltas: Partial<PlayerStats>): PlayerStats {
  return {
    dopamine: Math.max(0, Math.min(100, Math.round(base.dopamine + (deltas.dopamine ?? 0)))),
    energy: Math.max(0, Math.min(100, Math.round(base.energy + (deltas.energy ?? 0)))),
    mental: Math.max(0, Math.min(100, Math.round(base.mental + (deltas.mental ?? 0)))),
    social: Math.max(0, Math.min(100, Math.round(base.social + (deltas.social ?? 0)))),
    money: Math.round(base.money + (deltas.money ?? 0)),
    willpower: Math.max(0, Math.min(100, Math.round(base.willpower + (deltas.willpower ?? 0)))),
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
