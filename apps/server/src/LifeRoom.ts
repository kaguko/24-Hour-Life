import { randomBytes } from 'node:crypto';
import { CloseCode, Room, matchMaker, type Client, type Delayed } from '@colyseus/core';
import { LAST_DAY, evaluateLifeStatus, jointActionDef } from '@24h/domain';
import { generateRoomCode } from './code.js';
import { sanitizeText } from './chat.js';
import { LifeEngine, type PlayerSession } from './engine.js';
import { JointBoard, type Offer } from './joint.js';
import {
  CHAT_HISTORY,
  CHAT_MIN_INTERVAL_MS,
  DEFAULT_TIMING,
  MAX_MESSAGES_PER_SECOND,
  MAX_PLAYERS,
  type ActionResultMessage,
  type InviteMessage,
  type JointResultMessage,
  type MorningReportMessage,
  type NudgeResultMessage,
  type Phase,
  type Timing,
} from './protocol.js';
import { ChatMessageSchema, LifeState, OfferSchema, PlayerSchema } from './schema.js';

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
function syncPlayer(target: PlayerSchema, p: PlayerSession, offerId: string): void {
  const { state } = p;
  target.connected = p.connected;
  target.bot = p.bot;
  target.ready = p.ready;
  target.offerId = offerId;
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
 * - planning: người chơi hành động / rủ nhau làm hành vi chung; hết `planningMs` hoặc mọi người (đang kết nối) ready thì qua đêm.
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
  private board!: JointBoard;
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
    this.board = new JointBoard(this.engine);
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
      if (this.board.offerOf(client.sessionId)) return reject('Bạn đang chờ nhóm. Rời lời rủ để làm việc khác.');

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
      const ready = typeof value === 'boolean' ? value : true;
      if (ready) this.leaveOffer(client.sessionId, 'Bạn đã sẵn sàng nên rời lời rủ.');
      this.engine.setReady(client.sessionId, ready);
      this.syncSession(client.sessionId);
      this.checkAdvance();
    });

    this.onMessage('joint', (client, message: unknown) => this.onJointMessage(client, message));

    this.onMessage('nudge', (client, message: unknown) => {
      const reply = (r: NudgeResultMessage) => client.send('nudge_result', r);
      const phase = this.state.phase;
      if (phase !== 'planning' && phase !== 'morning') return reply({ ok: false, reason: 'Chưa phải lúc động viên.' });
      const targetId = (message as { targetId?: unknown } | null)?.targetId;
      if (typeof targetId !== 'string') return reply({ ok: false, reason: 'Thiếu người nhận.' });
      const res = this.engine.encourage(client.sessionId, targetId);
      if (!res.ok) return reply({ ok: false, reason: res.reason });
      this.syncSession(client.sessionId);
      this.syncSession(targetId);
      reply({ ok: true });
      const sender = this.engine.players.get(client.sessionId)!;
      this.clients.getById(targetId)?.send('nudged', { fromId: sender.id, fromName: sender.name });
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
    syncPlayer(player, session, '');
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
    this.leaveOffer(client.sessionId, 'Người rủ mất kết nối.');
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
    this.leaveOffer(client.sessionId, 'Người chơi đã rời.');

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

  // ---- Hành vi chung (lời rủ) ----

  private nameOf(id: string): string {
    return this.engine.players.get(id)?.name ?? '';
  }

  private sendJoint(id: string, message: JointResultMessage): void {
    this.clients.getById(id)?.send('joint_result', message);
  }

  /** Cập nhật state.offers và offerId từng người theo bảng lời rủ hiện tại */
  private syncOffers(): void {
    const offers = this.board.list();
    for (const id of [...this.state.offers.keys()]) {
      if (!offers.some((o) => o.id === id)) this.state.offers.delete(id);
    }
    for (const o of offers) {
      let target = this.state.offers.get(o.id);
      if (!target) {
        target = new OfferSchema();
        const joint = jointActionDef(o.actionId)!.joint!;
        target.id = o.id;
        target.actionId = o.actionId;
        target.hostId = o.hostId;
        target.minPlayers = joint.minPlayers;
        target.maxPlayers = joint.maxPlayers;
        this.state.offers.set(o.id, target);
      }
      // đồng bộ danh sách thành viên
      while (target.members.length > 0) target.members.pop();
      o.members.forEach((m) => target!.members.push(m));
    }
    for (const id of this.engine.players.keys()) this.syncSession(id);
  }

  /** Rời lời rủ (nếu có) và báo cho những người bị ảnh hưởng */
  private leaveOffer(playerId: string, reasonForOthers: string): void {
    const { left, cancelled } = this.board.leave(playerId);
    if (cancelled) {
      for (const m of cancelled.members) {
        if (m !== playerId) this.sendJoint(m, { ok: false, actionId: cancelled.actionId, offerId: cancelled.id, reason: `Lời rủ đã hủy: ${reasonForOthers}` });
      }
    }
    if (left || cancelled) this.syncOffers();
  }

  private onJointMessage(client: Client, message: unknown): void {
    const m = message as { op?: unknown; actionId?: unknown; offerId?: unknown } | null;
    const id = client.sessionId;
    const fail = (reason: string, actionId = '', offerId = '') => client.send('joint_result', { ok: false, actionId, offerId, reason } satisfies JointResultMessage);
    if (this.state.phase !== 'planning') return fail('Chỉ rủ nhau được trong giai đoạn lên kế hoạch.');

    switch (m?.op) {
      case 'offer': {
        const res = this.board.create(id, m.actionId);
        if (!res.ok) return fail(res.reason, typeof m.actionId === 'string' ? m.actionId : '');
        this.syncOffers();
        client.send('joint_result', { ok: true, actionId: res.offer.actionId, offerId: res.offer.id, notice: 'Đã rủ bạn bè, đang chờ người vào nhóm.' } satisfies JointResultMessage);

        // Gửi lời mời cho mọi người còn rảnh; lời rủ cám dỗ kéo nhẹ người ý chí thấp
        const host = this.engine.players.get(id)!;
        for (const other of this.engine.players.values()) {
          if (other.id === id || other.state.finished || other.bot || !other.connected) continue;
          const pressure = this.engine.applyOfferPressure(other.id, res.offer.actionId);
          this.syncSession(other.id);
          const invite: InviteMessage = { offerId: res.offer.id, actionId: res.offer.actionId, hostId: host.id, hostName: host.name, pressure };
          this.clients.getById(other.id)?.send('invite', invite);
        }
        return;
      }
      case 'join': {
        const res = this.board.join(id, m.offerId);
        if (!res.ok) return fail(res.reason, '', typeof m.offerId === 'string' ? m.offerId : '');
        this.syncOffers();
        client.send('joint_result', { ok: true, actionId: res.offer.actionId, offerId: res.offer.id, notice: 'Đã vào nhóm, chờ người rủ bắt đầu.' } satisfies JointResultMessage);
        // Đầy chỗ thì tự chạy
        if (res.offer.members.length >= jointActionDef(res.offer.actionId)!.joint!.maxPlayers) this.startOffer(res.offer.hostId);
        return;
      }
      case 'leave': {
        if (!this.board.offerOf(id)) return fail('Bạn không ở trong lời rủ nào.');
        this.leaveOffer(id, `${this.nameOf(id)} đã rời.`);
        client.send('joint_result', { ok: true, actionId: '', offerId: '', notice: 'Đã rời lời rủ.' } satisfies JointResultMessage);
        return;
      }
      case 'start': {
        if (!this.board.list().some((o) => o.hostId === id)) return fail('Chỉ người rủ mới bắt đầu được.');
        this.startOffer(id);
        return;
      }
      default:
        return fail('Thao tác không hợp lệ.');
    }
  }

  /** Chạy hành vi chung của lời rủ do `hostId` tạo, báo kết quả riêng cho từng người */
  private startOffer(hostId: string): void {
    const res = this.board.start(hostId);
    if (!res.ok) {
      if ('offer' in res) {
        this.sendJoint(hostId, { ok: false, actionId: res.offer.actionId, offerId: res.offer.id, reason: res.reason });
        for (const dropped of res.dropped) {
          this.sendJoint(dropped, { ok: false, actionId: res.offer.actionId, offerId: res.offer.id, reason: 'Bạn không làm được hành vi này lúc này nên bị loại khỏi nhóm.' });
        }
        if (res.cancelled) {
          for (const m of res.offer.members) this.sendJoint(m, { ok: false, actionId: res.offer.actionId, offerId: res.offer.id, reason: 'Lời rủ đã hủy.' });
        }
        this.syncOffers();
      } else {
        this.sendJoint(hostId, { ok: false, actionId: '', offerId: '', reason: res.reason });
      }
      return;
    }

    const names = res.results.filter((r) => r.ok).map((r) => this.nameOf(r.playerId));
    for (const r of res.results) {
      if (r.ok && !this.engine.hasTimeLeft(r.playerId)) this.engine.setReady(r.playerId, true);
      this.sendJoint(r.playerId, {
        ok: r.ok,
        actionId: res.offer.actionId,
        offerId: res.offer.id,
        reason: r.reason,
        notice: r.notice,
        withNames: names,
        fellForPressure: r.fellForPressure,
      });
      const target = this.state.players.get(r.playerId);
      if (target && r.ok) target.lastActionId = res.offer.actionId;
    }
    this.syncOffers();
    this.checkAdvance();
  }

  // ---- Vòng đời ngày ----

  private syncSession(id: string): void {
    const session = this.engine.players.get(id);
    const target = this.state.players.get(id);
    if (session && target) syncPlayer(target, session, this.board.offerOf(id)?.id ?? '');
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

    // Lời rủ chưa thành thì hết hạn, không ai bị tốn gì
    for (const offer of this.board.clear()) this.expireOffer(offer);
    this.syncOffers();

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

  private expireOffer(offer: Offer): void {
    for (const m of offer.members) this.sendJoint(m, { ok: false, actionId: offer.actionId, offerId: offer.id, reason: 'Hết giờ lên kế hoạch, lời rủ không thành.' });
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
