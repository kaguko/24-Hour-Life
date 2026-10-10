import {
  DAY_HOURS,
  PLAYABLE_ACTIONS,
  advanceDay,
  applyAction,
  createPlayerState,
  endDay,
  hoursLeftOf,
  planAction,
  type NightResultPrimitive,
  type PlayerState,
  type Rng,
} from '@24h/domain';
import { MAX_MOVE_SPEED, WORLD_HALF_SIZE } from './protocol.js';
import { rngFor } from './seed.js';

/** Mọi thứ server biết về một người chơi. Client không bao giờ ghi trực tiếp vào đây. */
export interface PlayerSession {
  id: string;
  name: string;
  state: PlayerState;
  x: number;
  z: number;
  lastMoveAt: number;
  /** Dòng ngẫu nhiên của (roomSeed, playerId, rngDay); sang ngày mới thì dựng lại */
  rng: Rng;
  rngDay: number;
}

export type ActionOutcome =
  | { ok: false; reason: string }
  | { ok: true; notice: string | null; night: NightResultPrimitive | null };

const PLAYABLE_IDS: ReadonlySet<string> = new Set(PLAYABLE_ACTIONS.map((a) => a.id));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Luật chơi nhiều người, tách khỏi Colyseus để test được: chỉ gọi hàm thuần của @24h/domain.
 * Client chỉ gửi ý định (actionId, vị trí); chỉ số do domain tính.
 */
export class LifeEngine {
  readonly players = new Map<string, PlayerSession>();

  constructor(private readonly roomSeed: string) {}

  addPlayer(id: string, name: string, now: number): PlayerSession {
    const rng = rngFor(this.roomSeed, id, 1);
    const session: PlayerSession = {
      id,
      name,
      state: createPlayerState(rng),
      x: 0,
      z: 0,
      lastMoveAt: now,
      rng,
      rngDay: 1,
    };
    this.players.set(id, session);
    return session;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  private rngOf(p: PlayerSession): Rng {
    if (p.rngDay !== p.state.day) {
      p.rng = rngFor(this.roomSeed, p.id, p.state.day);
      p.rngDay = p.state.day;
    }
    return p.rng;
  }

  /** Validate bằng planAction (đủ giờ, giờ mở cửa, khóa kỹ năng...) rồi áp dụng bằng applyAction. */
  handleAction(id: string, actionId: unknown): ActionOutcome {
    const p = this.players.get(id);
    if (!p) return { ok: false, reason: 'Bạn chưa tham gia phòng.' };
    if (p.state.finished) return { ok: false, reason: 'Ván của bạn đã kết thúc.' };
    if (typeof actionId !== 'string' || !PLAYABLE_IDS.has(actionId)) return { ok: false, reason: 'Hành vi không hợp lệ.' };

    const s = p.state;
    const plan = planAction(actionId, s.location, hoursLeftOf(s), { day: s.day, actionsTodayIds: s.actionsTodayIds, history: s.history });
    if (!plan.ok) return { ok: false, reason: plan.reason };

    const rng = this.rngOf(p);
    const res = applyAction(s, plan.steps, actionId, plan.endLocation, rng);
    if (!res.applied || !res.last) return { ok: false, reason: res.blocked ?? 'Không thực hiện được.' };
    p.state = res.state;

    // Hết 24h: qua đêm rồi sang ngày mới (hoặc kết thúc ván)
    let night: NightResultPrimitive | null = null;
    if (p.state.hoursUsed >= DAY_HOURS) {
      const ended = endDay(p.state, rng);
      night = ended.night;
      p.state = advanceDay(ended.state).state;
    }
    return { ok: true, notice: res.blocked ?? res.last.notice, night };
  }

  /** Kẹp đích vào thế giới và vào quãng đường tối đa theo thời gian trôi qua. Trả false nếu payload sai. */
  handleMove(id: string, x: unknown, z: unknown, now: number): boolean {
    const p = this.players.get(id);
    if (!p || typeof x !== 'number' || typeof z !== 'number' || !Number.isFinite(x) || !Number.isFinite(z)) return false;

    const dt = clamp((now - p.lastMoveAt) / 1000, 0, 1);
    p.lastMoveAt = now;
    const tx = clamp(x, -WORLD_HALF_SIZE, WORLD_HALF_SIZE);
    const tz = clamp(z, -WORLD_HALF_SIZE, WORLD_HALF_SIZE);
    const dx = tx - p.x;
    const dz = tz - p.z;
    const dist = Math.hypot(dx, dz);
    const maxStep = MAX_MOVE_SPEED * dt;
    const k = dist > maxStep && dist > 0 ? maxStep / dist : 1;
    p.x += dx * k;
    p.z += dz * k;
    return true;
  }
}
