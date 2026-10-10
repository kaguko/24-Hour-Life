import { randomBytes } from 'node:crypto';
import { CloseCode, Room, matchMaker, type Client, type Delayed } from '@colyseus/core';
import { LAST_DAY, evaluateLifeStatus } from '@24h/domain';
import { generateRoomCode } from './code.js';
import { sanitizeText } from './chat.js';
import { LifeEngine, type PlayerSession } from './engine.js';
import {
  CHAT_HISTORY,
  CHAT_MIN_INTERVAL_MS,
  DEFAULT_TIMING,
  MAX_MESSAGES_PER_SECOND,
  MAX_PLAYERS,
  type ActionResultMessage,
  type MorningReportMessage,
  type Phase,
  type Timing,
} from './protocol.js';
import { ChatMessageSchema, LifeState, PlayerSchema } from './schema.js';

/** Sinh mã 4 ký tự chưa có phòng nào dùng */
async function uniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const code = generateRoomCode();
    let existing: unknown;
    try {
      existing = await matchMaker.getRoomById(code);
    } catch {
      existing = undefined;
    }
    if (!existing) return code;
  }
  throw new Error('Không tạo được mã phòng duy nhất.');
}

/** Ghi phần công khai của session vào schema (client chỉ đọc) */
function syncPlayer(target: PlayerSchema, p: PlayerSession): void {
  const { state } = p;
  target.connected = p.connected;
  target.bot = p.bot;
  target.ready = p.ready;
  target.x = p.x;
  target.z = p.z;
  target.day = state.day;
  target.hoursUsed = state.hoursUsed;
  target.location = state.location;
  target.finished = state.finished;
  target.dopamine = state.stats.dopamine;
  target.energy = state.stats.energy;
  target.mental = state.stats.mental;
  target.social = state.stats.social;
  target.money = state.stats.money;
  target.willpower = state.stats.willpower;
}

/**
 * Phòng chơi nhiều người. Mỗi ngày: planning -> night -> morning.
 * - planning: người chơi hành động; hết `planningMs` hoặc mọi người (đang kết nối) ready thì qua đêm.
 * - night: server chạy processOvernightCycle (qua endDay của domain) cho từng người.
 * - morning: gửi báo cáo sáng riêng cho từng client; hết `morningMs` hoặc mọi người ready thì sang ngày mới.
 * Người ngắt kết nối được giữ chỗ `reconnectMs`, sau đó bot Balanced chơi thay.
 */
export class LifeRoom extends Room<{ state: LifeState }> {
  maxClients = MAX_PLAYERS;
  maxMessagesPerSecond = MAX_MESSAGES_PER_SECOND;

  /** Ghi đè ở lớp con (xem createLifeRoom). Không bao giờ lấy từ client. */
  protected timing: Timing = DEFAULT_TIMING;

  private engine!: LifeEngine;
  private lastChatAt = new Map<string, number>();
  private started = false;
  private phaseTimer?: Delayed;
  private reports = new Map<string, MorningReportMessage>();

  async onCreate(): Promise<void> {
    // Mã phòng = roomId: người chơi vào bằng joinById(code). Phòng riêng tư nên không liệt kê.
    this.roomId = await uniqueRoomCode();
    await this.setPrivate(true);

    // roomSeed do server tự sinh và giữ kín (lộ seed là đoán được kết quả ngẫu nhiên)
    this.engine = new LifeEngine(randomBytes(16).toString('hex'));
    const state = new LifeState();
    state.code = this.roomId;
    state.phase = 'planning';
    state.day = 1;
    state.phaseEndsAt = 0;
    this.setState(state);

    this.onMessage('action', (client, message: unknown) => {
      const actionId = (message as { actionId?: unknown } | null)?.actionId;
      const id = typeof actionId === 'string' ? actionId : '';
      const reject = (reason: string) => {
        const reply: ActionResultMessage = { ok: false, actionId: id, reason };
        client.send('action_result', reply);
      };
      if (this.state.phase !== 'planning') return reject('Chỉ hành động được trong giai đoạn lên kế hoạch.');

      const outcome = this.engine.handleAction(client.sessionId, actionId);
      if (!outcome.ok) return reject(outcome.reason);

      // Hết giờ trong ngày thì không còn gì để làm: tự sẵn sàng
      if (!this.engine.hasTimeLeft(client.sessionId)) this.engine.setReady(client.sessionId, true);
      this.syncSession(client.sessionId);
      const target = this.state.players.get(client.sessionId);
      if (target) target.lastActionId = id;

      const reply: ActionResultMessage = { ok: true, actionId: id, notice: outcome.notice };
      client.send('action_result', reply);
      this.checkAdvance();
    });

    this.onMessage('ready', (client, message: unknown) => {
      const phase = this.state.phase;
      const session = this.engine.players.get(client.sessionId);
      if ((phase !== 'planning' && phase !== 'morning') || !session || session.state.finished) return;
      const value = (message as { ready?: unknown } | null)?.ready;
      this.engine.setReady(client.sessionId, typeof value === 'boolean' ? value : true);
      this.syncSession(client.sessionId);
      this.checkAdvance();
    });

    this.onMessage('move', (client, message: unknown) => {
      const m = message as { x?: unknown; z?: unknown } | null;
      if (!this.engine.handleMove(client.sessionId, m?.x, m?.z, Date.now())) return;
      this.syncSession(client.sessionId);
    });

    this.onMessage('chat', (client, message: unknown) => {
      const text = sanitizeText((message as { text?: unknown } | null)?.text);
      const session = this.engine.players.get(client.sessionId);
      if (!text || !session) return;
      const now = Date.now();
      if (now - (this.lastChatAt.get(client.sessionId) ?? 0) < CHAT_MIN_INTERVAL_MS) return;
      this.lastChatAt.set(client.sessionId, now);

      const entry = new ChatMessageSchema();
      entry.playerId = session.id;
      entry.name = session.name;
      entry.text = text;
      entry.at = now;
      this.state.chat.push(entry);
      while (this.state.chat.length > CHAT_HISTORY) this.state.chat.shift();
    });
  }

  onJoin(client: Client, options?: { name?: unknown }): void {
    const name = sanitizeText(options?.name, 24) ?? `Người chơi ${this.state.players.size + 1}`;
    const session = this.engine.addPlayer(client.sessionId, name, Date.now());

    const player = new PlayerSchema();
    player.id = session.id;
    player.name = session.name;
    player.lastActionId = '';
    syncPlayer(player, session);
    this.state.players.set(session.id, player);

    // Ngày 1 bắt đầu khi có người đầu tiên vào
    if (!this.started) {
      this.started = true;
      this.beginPlanning();
    }
  }

  /** Mất kết nối không chủ ý: giữ chỗ `reconnectMs`; không bắt phòng chờ người này. */
  onDrop(client: Client): void {
    const session = this.engine.players.get(client.sessionId);
    if (!session) return;
    session.connected = false;
    this.syncSession(client.sessionId);
    try {
      // Hết hạn / phòng đóng sẽ reject: Colyseus tự xử lý qua onLeave, ở đây chỉ nuốt để không thành unhandledRejection
      this.allowReconnection(client, this.timing.reconnectMs / 1000).catch(() => undefined);
    } catch {
      // phòng đang đóng: không cần giữ chỗ
    }
    this.checkAdvance();
  }

  onReconnect(client: Client): void {
    const session = this.engine.players.get(client.sessionId);
    if (!session) return;
    session.connected = true;
    this.syncSession(client.sessionId);
    // Vào lại giữa phase morning thì gửi lại báo cáo của mình
    const report = this.reports.get(client.sessionId);
    if (this.state.phase === 'morning' && report) client.send('morning', report);
  }

  /** Rời hẳn: tự rời thì xóa; hết hạn giữ chỗ thì bot Balanced điều khiển. */
  onLeave(client: Client, code?: number): void {
    const session = this.engine.players.get(client.sessionId);
    if (!session) return;

    if (code === CloseCode.CONSENTED) {
      this.engine.removePlayer(client.sessionId);
      this.lastChatAt.delete(client.sessionId);
      this.reports.delete(client.sessionId);
      this.state.players.delete(client.sessionId);
    } else {
      session.connected = false;
      session.bot = true;
      if (this.state.phase === 'planning') this.engine.runBot(session.id);
      else session.ready = true;
      this.syncSession(session.id);
    }
    this.checkAdvance();
  }

  private syncSession(id: string): void {
    const session = this.engine.players.get(id);
    const target = this.state.players.get(id);
    if (session && target) syncPlayer(target, session);
  }

  private schedule(ms: number, fn: () => void): void {
    this.phaseTimer?.clear();
    this.phaseTimer = this.clock.setTimeout(fn, ms);
  }

  private setPhase(phase: Phase, durationMs: number): void {
    this.state.phase = phase;
    this.state.phaseEndsAt = durationMs > 0 ? Date.now() + durationMs : 0;
  }

  private beginPlanning(): void {
    this.setPhase('planning', this.timing.planningMs);
    this.reports.clear();
    for (const s of this.engine.players.values()) {
      s.ready = s.state.finished;
      if (s.bot && !s.state.finished) this.engine.runBot(s.id);
      this.syncSession(s.id);
    }
    this.schedule(this.timing.planningMs, () => this.enterNight());
    this.checkAdvance();
  }

  /** Qua đêm: tính cho từng người ngay (kết quả cố định), báo cáo gửi khi sang morning. */
  private enterNight(): void {
    if (this.state.phase !== 'planning') return;
    this.setPhase('night', this.timing.nightMs);
    // Đã qua đêm đầu tiên: khóa phòng, người mới vào sẽ lệch ngày
    if (this.state.day === 1) void this.lock();

    const day = this.state.day;
    this.reports.clear();
    for (const s of this.engine.players.values()) {
      const night = this.engine.runNight(s.id);
      if (night) {
        const finished = evaluateLifeStatus(night.newStats).isGameOver || day >= LAST_DAY;
        this.reports.set(s.id, { day, report: night, finished });
      }
      this.syncSession(s.id);
    }
    this.schedule(this.timing.nightMs, () => this.enterMorning());
  }

  private enterMorning(): void {
    if (this.state.phase !== 'night') return;
    this.setPhase('morning', this.timing.morningMs);
    for (const s of this.engine.players.values()) {
      // Người đã xong ván từ trước (không có báo cáo) và bot không phải xác nhận
      s.ready = s.bot || !this.reports.has(s.id);
      this.syncSession(s.id);
    }
    for (const [id, message] of this.reports) this.clients.getById(id)?.send('morning', message);
    this.schedule(this.timing.morningMs, () => this.leaveMorning());
    this.checkAdvance();
  }

  private leaveMorning(): void {
    if (this.state.phase !== 'morning') return;
    this.phaseTimer?.clear();
    for (const s of this.engine.players.values()) {
      this.engine.startNextDay(s.id);
      this.syncSession(s.id);
    }
    const active = [...this.engine.players.values()].filter((s) => !s.state.finished);
    if (active.length === 0) {
      this.setPhase('ended', 0);
      return;
    }
    this.state.day = Math.max(...active.map((s) => s.state.day));
    this.beginPlanning();
  }

  /**
   * Sang phase kế khi mọi người chơi đang kết nối đã ready. Người ngắt kết nối và bot không chặn.
   * Không có ai kết nối thì chỉ chạy theo đồng hồ.
   */
  private checkAdvance(): void {
    const phase = this.state.phase;
    if (phase !== 'planning' && phase !== 'morning') return;
    const humans = [...this.engine.players.values()].filter(
      (s) => s.connected && !s.bot && (phase === 'planning' ? !s.state.finished : this.reports.has(s.id))
    );
    if (humans.length === 0 || humans.some((s) => !s.ready)) return;
    if (phase === 'planning') this.enterNight();
    else this.leaveMorning();
  }
}

/** Tạo lớp phòng với thời gian tùy chỉnh (mặc định 90s lên kế hoạch, giữ chỗ 60s). Chỉ server quyết định, client không đổi được. */
export function createLifeRoom(timing: Partial<Timing> = {}): typeof LifeRoom {
  const merged: Timing = { ...DEFAULT_TIMING, ...timing };
  return class ConfiguredLifeRoom extends LifeRoom {
    protected override timing = merged;
  };
}
