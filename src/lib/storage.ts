import { PlayerStats, INITIAL_STATS, DailyLog } from '../core/stats';
import { ActionDefinition } from '../core/actions';

const STORAGE_KEY = '24h_life_game_state_v1';

export interface SavedGameState {
  day: number;
  hoursUsed: number;
  stats: PlayerStats;
  sleepDebt: number;
  actionsToday: Array<{
    id: string;
    title: string;
    hours: number;
    timeLabel: string;
  }>;
  dailyLogs: DailyLog[];
  soundEnabled: boolean;
  activeEventId?: string | null;
}

export function saveGameState(state: SavedGameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

export function loadGameState(): SavedGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedGameState;
  } catch (err) {
    console.warn('Failed to load from localStorage:', err);
    return null;
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear localStorage:', err);
  }
}
