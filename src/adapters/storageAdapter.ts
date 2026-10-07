/**
 * STORAGE ADAPTER (Clean Architecture Lite)
 * Plugs localStorage into domain primitives.
 */

import { PlayerStatsPrimitive } from '../domain';

export interface SerializedGameState {
  day: number;
  hoursUsed: number;
  stats: PlayerStatsPrimitive;
  sleepDebt: number;
  actionsTodayIds: string[];
  soundEnabled: boolean;
}

const STORAGE_KEY = '24h_life_clean_architecture_state_v2';

export const storageAdapter = {
  save(state: SerializedGameState): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('StorageAdapter save failed:', e);
    }
  },

  load(): SerializedGameState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SerializedGameState;
    } catch (e) {
      console.warn('StorageAdapter load failed:', e);
      return null;
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('StorageAdapter clear failed:', e);
    }
  },
};
