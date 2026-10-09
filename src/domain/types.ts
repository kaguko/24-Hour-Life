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
  /** Khung giờ đồng hồ (0-24, có thể vắt qua nửa đêm) mà hành vi mới làm được */
  window?: [number, number];
  /** Chỉ làm được từ ngày này trở đi */
  minDay?: number;
  /** Chỉ làm được vào các ngày này (1 = Thứ 2 ... 7 = Chủ nhật) */
  onlyDays?: number[];
  /** Số lần tối đa mỗi ngày */
  maxPerDay?: number;
  /** Cần kỹ năng đạt cấp này mới làm được (skill: mind | body | heart | craft) */
  requiresSkill?: { skill: string; level: number };
}

export type SoundCue =
  | 'temptation'
  | 'healthy'
  | 'neutral'
  | 'sigh'
  | 'night'
  | 'victory'
  | 'defeat'
  | 'event';

export interface QuotePrimitive {
  quote: string;
  author: string;
  role: string;
  /** Lời dẫn: câu này nói về điều gì của ngày hôm qua */
  context?: string;
}

export interface ActionResultPrimitive {
  success: boolean;
  actionId: string;
  actionTitle: string;
  hoursSpent: number;
  newStats: PlayerStatsPrimitive;
  notice: string | null;
  soundCue: SoundCue;
  philosophicalQuote?: QuotePrimitive;
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
  philosophicalQuote?: QuotePrimitive;
  /** Thẻ tổng kết ngày: danh hiệu, hạng, thay đổi chỉ số, gợi ý */
  recap?: import('./dayRecap').DayRecapPrimitive;
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
  /** Nếu có: chỉ xuất hiện vào các ngày này (1 = Thứ 2 ... 7 = Chủ nhật) */
  onlyDays?: number[];
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

export type EndingId = string;

export type EndingPalette = 'rose' | 'fuchsia' | 'orange' | 'sky' | 'amber' | 'slate' | 'emerald' | 'violet' | 'teal' | 'indigo';

export interface EndingPrimitive {
  id: EndingId;
  emoji: string;
  title: string;
  tagline: string;
  description: string;
  lesson: string;
  palette: EndingPalette;
  outcome: 'survived' | 'bankrupt' | 'burnout';
  daysSurvived: number;
  score: number;
}

export interface JourneyDayPrimitive {
  day: number;
  /** Số giờ theo từng nhóm trong ngày */
  fast: number;
  slow: number;
  work: number;
  rest: number;
  other: number;
}

export interface JourneyPrimitive {
  days: JourneyDayPrimitive[];
  topActions: Array<{ id: string; title: string; count: number }>;
  insights: string[];
}
