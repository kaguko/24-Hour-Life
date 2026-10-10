import {
  DOMAIN_STRATEGIES,
  PLAYABLE_ACTIONS,
  advanceDay,
  applyAction,
  chooseStrategyAction,
  createPlayerState,
  endDay,
  hoursLeftOf,
  planAction,
  type DomainStrategy,
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
  connected: boolean;
  /** Bot Balanced điều khiển thay người đã ngắt kết nối quá hạn */
  bot: boolean;
  ready: boolean;
  /** Báo cáo sáng gần nhất (gửi lại khi người chơi vào lại giữa phase morning) */
  lastReport: NightResultPrimitive | null;
}

export type ActionOutcome = { ok: false; reason: string } | { ok: true; notice: string | null };

const PLAYABLE_IDS: ReadonlySet<string> = new Set(PLAYABLE_ACTIONS.map((a) => a.id));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const BOT_STRATEGY: DomainStrategy = (() => {
  const s = DOMAIN_STRATEGIES.find((x) => x.id === 'balanced');
  if (!s) throw new Error('Thiếu chiến lược "balanced" trong @24h/domain.');
  return s;
})();
/** Chặn vòng lặp vô hạn nếu chiến lược trả hành vi không tốn giờ */
const BOT_MAX_STEPS_PER_DAY = 64;

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
      connected: true,
      bot: false,
      ready: false,
      lastReport: null,
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
    if (p.ready) return { ok: false, reason: 'Bạn đã sẵn sàng. Hủy sẵn sàng để làm tiếp.' };
    if (typeof actionId !== 'string' || !PLAYABLE_IDS.has(actionId)) return { ok: false, reason: 'Hành vi không hợp lệ.' };

    const s = p.state;
    const plan = planAction(actionId, s.location, hoursLeftOf(s), { day: s.day, actionsTodayIds: s.actionsTodayIds, history: s.history });
    if (!plan.ok) return { ok: false, reason: plan.reason };

    const res = applyAction(s, plan.steps, actionId, plan.endLocation, this.rngOf(p));
    if (!res.applied || !res.last) return { ok: false, reason: res.blocked ?? 'Không thực hiện được.' };
    p.state = res.state;
    return { ok: true, notice: res.blocked ?? res.last.notice };
  }

  setReady(id: string, ready: boolean): void {
    const p = this.players.get(id);
    if (p) p.ready = ready;
  }

  hasTimeLeft(id: string): boolean {
    const p = this.players.get(id);
    return !!p && !p.state.finished && hoursLeftOf(p.state) > 0;
  }

  /** Bot Balanced chơi hết phần giờ còn lại của ngày (qua đúng đường validate như người chơi) rồi sẵn sàng. */
  runBot(id: string): void {
    const p = this.players.get(id);
    if (!p) return;
    p.ready = false;
    for (let i = 0; i < BOT_MAX_STEPS_PER_DAY && !p.state.finished; i++) {
      const pick = chooseStrategyAction(BOT_STRATEGY, p.state);
      if (!pick || !this.handleAction(id, pick.actionId).ok) break;
    }
    p.ready = true;
  }

  /** Qua đêm cho một người (bỏ qua người đã xong ván). Chưa sang ngày mới: xem startNextDay. */
  runNight(id: string): NightResultPrimitive | null {
    const p = this.players.get(id);
    if (!p || p.state.finished) return null;
    const ended = endDay(p.state, this.rngOf(p));
    p.state = ended.state;
    p.lastReport = ended.night;
    return ended.night;
  }

  /** Sáng hôm sau: sang ngày mới, hoặc kết thúc ván nếu sụp đổ / đủ 7 ngày. */
  startNextDay(id: string): void {
    const p = this.players.get(id);
    if (!p || p.state.finished) return;
    p.state = advanceDay(p.state).state;
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
