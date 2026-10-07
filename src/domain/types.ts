/**
 * PURE DOMAIN TYPES & PRIMITIVES
 * Rule 1: NO React, NO UI, NO browser globals, NO localStorage.
 * Rule 2: Pure primitive shapes (numbers, strings, booleans, arrays).
 */

export interface PlayerStatsPrimitive {
  dopamine: number;     // 0 - 100
  energy: number;       // 0 - 100
  mental: number;       // 0 - 100
  social: number;       // 0 - 100
  money: number;        // Nghìn VNĐ (ví dụ 4500 = 4.5 triệu)
  willpower: number;    // 0 - 100
}

export type ActionCategory = 'rest' | 'work' | 'wellness' | 'social' | 'temptation';

export type DopaminePathway = 'fast' | 'slow' | 'none';

export interface ActionPrimitive {
  id: string;
  title: string;
  category: ActionCategory;
  dopaminePathway: DopaminePathway;
  hours: number;
  description: string;
  isTemptation: boolean;
  willpowerCost: number;
  perceivedDopamineBonus?: number;
  baseDopamine?: number;
  baseEnergy?: number;
  baseMental?: number;
  baseSocial?: number;
  baseMoney?: number;
  baseWillpower?: number;
}

export type SoundCue = 'temptation' | 'healthy' | 'neutral' | 'sigh' | 'night' | 'victory';

export interface ActionResultPrimitive {
  success: boolean;
  actionId: string;
  actionTitle: string;
  hoursSpent: number;
  newStats: PlayerStatsPrimitive;
  notice: string | null;
  soundCue: SoundCue;
}

export interface NightResultPrimitive {
  dayCompleted: number;
  rentPaid: number;
  sleepHours: number;
  sleepDebtChange: number;
  newSleepDebt: number;
  newStats: PlayerStatsPrimitive;
  notes: string[];
  revealedMechanics: string[];
}

export type LifeStatus = 'thriving' | 'stable' | 'stressed' | 'burnout' | 'bankrupt';

export interface StatusResultPrimitive {
  status: LifeStatus;
  label: string;
  description: string;
  isGameOver: boolean;
}

export interface EventChoicePrimitive {
  id: string;
  label: string;
  timeHours: number;
  feedback: string;
  deltas: Partial<PlayerStatsPrimitive>;
}

export interface EventPrimitive {
  id: string;
  title: string;
  description: string;
  minDay: number;
  choices: EventChoicePrimitive[];
}

export interface SimulationResultPrimitive {
  strategyId: string;
  strategyName: string;
  runs: number;
  daysPerRun: number;
  survivalRate: number;
  burnoutRate: number;
  bankruptRate: number;
  avgFinalDopamine: number;
  avgFinalEnergy: number;
  avgFinalMental: number;
  avgFinalSocial: number;
  avgFinalMoney: number;
  avgFinalWillpower: number;
  avgSurvivalDays: number;
}
