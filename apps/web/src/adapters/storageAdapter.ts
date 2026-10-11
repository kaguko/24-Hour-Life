/**
 * STORAGE ADAPTER (Clean Architecture Lite)
 * Plugs localStorage into domain primitives.
 */

import { PlayerStatsPrimitive } from '@24h/domain';

export interface SerializedGameState {
  day: number;
  hoursUsed: number;
  stats: PlayerStatsPrimitive;
  sleepDebt: number;
  actionsTodayIds: string[];
  soundEnabled: boolean;
  /** Hành vi đã làm của các ngày đã qua (để tính kết cục) */
  history?: string[][];
  /** Nhân vật người chơi đã chọn */
  avatarId?: string;
  /** Ván đã kết thúc (sụp đổ hoặc đủ 7 ngày) */
  finished?: boolean;
  /** Chỉ số lúc bắt đầu ngày hiện tại (để tổng kết thay đổi cả ngày) */
  dayStartStats?: PlayerStatsPrimitive;
  /** Hạng S/A/B/C/D của các ngày đã qua */
  dayGrades?: string[];
  /** Mục tiêu đã bốc cho ván này */
  goalIds?: string[];
  /** Tính cách của ván này (ván cũ không có) */
  traitIds?: string[];
  /** Mạch truyện của ván và nhật ký lựa chọn (ván cũ không có) */
  storyIds?: string[];
  storyLog?: Array<{ beat: string; day: number; choice: string }>;
  /** Địa điểm hiện tại của nhân vật */
  location?: string;
  /** Sự kiện lớn của tuần: loại, độ khó ẩn, kết quả (nếu đã diễn ra) */
  bigEvent?: { id: string; difficulty: number; result?: { tier: string; score: number } };
}

const INTRO_KEY = '24h_life_intro_seen_v1';
const COACH_KEY = '24h_life_room_coach_seen_v1';
const STORAGE_KEY ='24h_life_clean_architecture_state_v2';

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

  hasSeenIntro(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(INTRO_KEY) === '1';
    } catch {
      return false;
    }
  },

  markIntroSeen(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(INTRO_KEY, '1');
    } catch {
      // ignore
    }
  },

  /** Hướng dẫn "chạm vào đồ vật" trong phòng 3D: chỉ hiện đến khi người chơi làm hành vi đầu tiên */
  hasSeenCoach(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem(COACH_KEY) === '1';
    } catch {
      return true;
    }
  },

  markCoachSeen(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(COACH_KEY, '1');
    } catch {
      // ignore
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
