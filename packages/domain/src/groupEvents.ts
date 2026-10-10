/**
 * PURE DOMAIN: BIẾN CỐ NHÓM
 * Mỗi đêm, phòng có thể gặp một biến cố chung (cả nhóm cùng chịu, hoặc một người gặp chuyện còn bạn bè thì sao).
 * Chúng làm cho "sống đúng cách một mình" không còn đủ để chắc chắn sống sót: bạn bè là một phần của cuộc sống,
 * nên cũng là một nguồn rủi ro lẫn nguồn nâng đỡ.
 * Không React, không UI, không Math.random: rng được tiêm vào.
 */
import { applyStatDeltas } from './stats.js';
import { DOMAIN_ACTIONS } from './actions.js';
import type { PlayerState } from './gameState.js';
import type { Rng } from './rng.js';

export type GroupEventId = 'friend_crisis' | 'surprise_party' | 'group_deadline';

/** Xác suất có biến cố nhóm mỗi đêm (khi có từ 2 người còn đang chơi) */
export const GROUP_EVENT_CHANCE = 0.55;

export const GROUP_EVENT_TITLE: Record<GroupEventId, string> = {
  friend_crisis: 'Một người bạn gặp chuyện',
  surprise_party: 'Tiệc bất ngờ',
  group_deadline: 'Deadline chung',
};

/** Có biến cố nhóm đêm nay không, và là biến cố nào. Cần ít nhất 2 người đang chơi. */
export function rollGroupEvent(activePlayers: number, rng: Rng): GroupEventId | null {
  if (activePlayers < 2) return null;
  if (rng() >= GROUP_EVENT_CHANCE) return null;
  const r = rng();
  return r < 0.4 ? 'friend_crisis' : r < 0.75 ? 'surprise_party' : 'group_deadline';
}

/** Tổng giờ làm việc / học trong ngày (đủ 2 giờ là "đã chuẩn bị" cho deadline chung) */
export function workHoursToday(state: PlayerState): number {
  return state.actionsTodayIds.reduce((sum, id) => {
    const a = DOMAIN_ACTIONS.find((x) => x.id === id);
    return a && (a.category === 'work' || id === 'study_group') ? sum + a.hours : sum;
  }, 0);
}

export interface GroupEventOutcome {
  eventId: GroupEventId;
  title: string;
  /** Trạng thái mới, cùng thứ tự với đầu vào (người đã xong ván giữ nguyên) */
  states: PlayerState[];
  /** Dòng kể riêng cho từng người, cùng thứ tự với đầu vào */
  notes: string[][];
  /** Người gặp chuyện (friend_crisis) */
  victim: number | null;
}

/**
 * Áp biến cố cho cả nhóm, TRƯỚC khi qua đêm (chỉ số thay đổi sẽ được tính vào đêm nay).
 * `isSupporter(i, victim)`: người i có ở bên cạnh nạn nhân không (server: đã động viên họ; mô phỏng: còn sức giúp).
 * `names`: tên từng người để kể chuyện.
 */
export function applyGroupEvent(
  eventId: GroupEventId,
  states: PlayerState[],
  names: string[],
  isSupporter: (index: number, victim: number) => boolean,
  rng: Rng
): GroupEventOutcome {
  const next = states.map((s) => ({ ...s }));
  const notes: string[][] = states.map(() => []);
  const alive = states.map((s, i) => (s.finished ? -1 : i)).filter((i) => i >= 0);
  let victim: number | null = null;

  if (eventId === 'friend_crisis' && alive.length >= 2) {
    victim = alive[Math.floor(rng() * alive.length)];
    let comfort = 0;
    for (const i of alive) {
      if (i === victim) continue;
      if (isSupporter(i, victim)) {
        next[i].stats = applyStatDeltas(next[i].stats, { mental: -4, social: 8 });
        notes[i].push(`${names[victim]} gặp chuyện và bạn đã ở bên cạnh (+8 Kết nối, nhưng cũng hơi mệt).`);
        comfort += 1;
      } else {
        notes[i].push(`${names[victim]} gặp chuyện. Bạn không kịp ở bên cạnh.`);
      }
    }
    next[victim].stats = applyStatDeltas(next[victim].stats, { mental: -22 + Math.min(2, comfort) * 8, willpower: -12, social: Math.min(2, comfort) * 6 });
    notes[victim].push(
      comfort > 0 ? `Bạn gặp chuyện, nhưng có ${comfort} người ở bên cạnh nên nhẹ đi nhiều.` : 'Bạn gặp chuyện và không ai ở bên cạnh. Một mình thì nặng hơn nhiều.'
    );
  } else if (eventId === 'surprise_party') {
    for (const i of alive) {
      const weak = next[i].stats.willpower < 45;
      next[i].stats = applyStatDeltas(next[i].stats, weak ? { money: -220, energy: -12, dopamine: 8, mental: -10, willpower: -8 } : { money: -220, energy: -12, dopamine: 8, willpower: -4 });
      notes[i].push(weak ? 'Tiệc bất ngờ: ý chí đang thấp nên bạn không từ chối nổi, ở lại tới khuya.' : 'Tiệc bất ngờ: bạn đủ tỉnh táo để biết điểm dừng (tốn chút ý chí).');
    }
  } else if (eventId === 'group_deadline') {
    for (const i of alive) {
      const prepared = workHoursToday(next[i]) >= 2;
      if (prepared) {
        notes[i].push('Deadline chung: hôm nay bạn đã làm việc đủ nên kịp bàn giao.');
      } else {
        next[i].stats = applyStatDeltas(next[i].stats, { mental: -14, energy: -10, money: -220 });
        notes[i].push('Deadline chung: bạn chưa chuẩn bị nên phải chạy nước rút và đền chút tiền.');
      }
    }
  }

  return { eventId, title: GROUP_EVENT_TITLE[eventId], states: next, notes, victim };
}
