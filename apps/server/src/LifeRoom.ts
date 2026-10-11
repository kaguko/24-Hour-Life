import { randomBytes } from 'node:crypto';
import { CloseCode, Room, ServerError, matchMaker, type AuthContext, type Client, type Delayed } from '@colyseus/core';
import { LAST_DAY, applyGroupEvent, evaluateGoals, evaluateLifeStatus, jointActionDef, rollGroupEvent } from '@24h/domain';
import { AVATAR_IDS, animForAction, isAvatarId } from '@24h/protocol';
import { generateRoomCode } from './code.js';
import { sanitizeText } from './chat.js';
import { DEFAULT_LIMITS, RateLimiter, sanitizeName, scrubLinks, type Limits } from './limits.js';
import { LifeEngine, type PlayerSession } from './engine.js';
import { JointBoard, type Offer } from './joint.js';
import { AnimalBoard } from './playground.js';
import { ResidentBoard } from './residents.js';
import {
  CHAT_HISTORY,
  CHAT_MIN_INTERVAL_MS,
  DEFAULT_TIMING,
  EMOTE_MIN_INTERVAL_MS,
  EMOTE_REACH,
  MAX_MESSAGES_PER_SECOND,
  MAX_PLAYERS,
  TARGETED_EMOTES,
  isAnimalOp,
  isResidentOp,
  RESIDENT_MIN_INTERVAL_MS,
  isEmoteKind,
  type ActionResultMessage,
  type AnimalEventMessage,
  type AnimalResultMessage,
  type ResidentEventMessage,
  type ResidentResultMessage,
  type EmoteMessage,
  type EmoteResultMessage,
  type InviteMessage,
  type JointResultMessage,
  type MorningReportMessage,
  type NudgeResultMessage,
  type PrivateStateMessage,
  type Phase,
  type Timing,
} from './protocol.js';
import { AnimalSchema, ChatMessageSchema, LifeState, OfferSchema, PlayerSchema, ResidentSchema } from './schema.js';

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
  protected limits: Limits = DEFAULT_LIMITS;

  private engine!: LifeEngine;
  private board!: JointBoard;
  private animals!: AnimalBoard;
  private lastEmoteAt = new Map<string, number>();
  private residents!: ResidentBoard;
  private lastResidentAt = new Map<string, number>();
  private lastResidentTick = 0;
  private lastChatAt = new Map<string, number>();
  private started = false;
  private phaseTimer?: Delayed;
  private reports = new Map<string, MorningReportMessage>();
  /** Chuyện xã hội trong ngày của từng người (đưa vào báo cáo sáng) */
  private story = new Map<string, string[]>();
  /** Lời mời đã nhận trong ngày: playerId -> offerId -> dòng kể */
  private invitedBy = new Map<string, Map<string, string>>();

  /** Giới hạn lượt tạo/vào phòng theo IP (dùng chung cho mọi phòng trong tiến trình) */
  private static joinLimiter?: RateLimiter;

  onAuth(_client: Client, _options: unknown, context: AuthContext): boolean {
    const ctor = this.constructor as typeof LifeRoom;
    ctor.joinLimiter ??= new RateLimiter(this.limits.joinsPerMinute);
    if (!ctor.joinLimiter.hit(context.ip ?? 'unknown')) throw new ServerError(429, 'Bạn thao tác quá nhanh, thử lại sau một phút.');
    return true;
  }

  async onCreate(): Promise<void> {
    if (matchMaker.stats.local.roomCount > this.limits.maxRooms) throw new ServerError(503, 'Máy chủ đang đầy, thử lại sau.');
    // Mã phòng = roomId: người chơi vào bằng joinById(code). Phòng riêng tư nên không liệt kê.
    this.roomId = await uniqueRoomCode();
    await this.setPrivate(true);

    // roomSeed do server tự sinh và giữ kín (lộ seed là đoán được kết quả ngẫu nhiên)
    this.engine = new LifeEngine(randomBytes(16).toString('hex'));
    this.board = new JointBoard(this.engine);
    this.animals = new AnimalBoard(this.engine.rngForLabel('animals', 0));
    this.residents = new ResidentBoard(this.engine.rngForLabel('residents', 0), Date.now());
    const state = new LifeState();
    state.code = this.roomId;
    state.phase = 'planning';
    state.day = 1;
    state.phaseEndsAt = 0;
    this.setState(state);
    for (const a of this.animals.animals.values()) {
      const s = new AnimalSchema();
      s.id = a.def.id;
      s.kind = a.def.kind;
      s.name = a.def.name;
      this.state.animals.set(s.id, s);
    }
    this.syncAnimals();
    for (const r of this.residents.residents.values()) {
      const s = new ResidentSchema();
      s.id = r.def.id;
      s.name = r.def.name;
      this.state.residents.set(s.id, s);
    }
    this.syncResidents();
    this.lastResidentTick = Date.now();
    this.clock.setInterval(() => {
      if (this.animals.tick(Date.now()).length > 0) this.syncAnimals();
      const now = Date.now();
      const dt = Math.min(2000, now - this.lastResidentTick);
      this.lastResidentTick = now;
      if (this.residents.tick(now, dt).length > 0) this.syncResidents();
    }, 500);

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
      if (target) {
        target.lastActionId = id;
        target.anim = animForAction(id);
      }

      const reply: ActionResultMessage = { ok: true, actionId: id, notice: outcome.notice };
      client.send('action_result', reply);
      this.pushPrivate(client.sessionId);
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
      this.note(client.sessionId, `Bạn đã động viên ${this.nameOf(targetId)}.`);
      this.note(targetId, `${sender.name} đã động viên bạn.`);
      this.clients.getById(targetId)?.send('nudged', { fromId: sender.id, fromName: sender.name });
    });

    this.onMessage('animal', (client, message: unknown) => {
      const m = message as { animalId?: unknown; op?: unknown } | null;
      const animalId = typeof m?.animalId === 'string' ? m.animalId : '';
      const reply = (r: AnimalResultMessage) => client.send('animal_result', r);
      const session = this.engine.players.get(client.sessionId);
      if (!session) return;
      if ((this.state.phase !== 'planning' && this.state.phase !== 'morning') || !isAnimalOp(m?.op)) {
        return reply({ ok: false, animalId, reason: 'Lúc này chưa chơi với con vật được.' });
      }
      const res = this.animals.interact(animalId, m.op, session.x, session.z, Date.now());
      if (!res.ok) return reply({ ok: false, animalId, reason: res.reason });
      const gained = this.engine.grantPlay(client.sessionId, res.deltas);
      if (gained) this.syncSession(client.sessionId);
      this.syncAnimals();
      reply({ ok: true, animalId, gained });
      const def = this.animals.animals.get(animalId)!.def;
      const event: AnimalEventMessage = { animalId, animalName: def.name, byId: session.id, byName: session.name, op: m.op, mood: res.mood, line: res.line };
      this.broadcast('animal_event', event);
    });

    this.onMessage('resident', (client, message: unknown) => {
      const m = message as { residentId?: unknown; op?: unknown } | null;
      const residentId = typeof m?.residentId === 'string' ? m.residentId : '';
      const reply = (r: ResidentResultMessage) => client.send('resident_result', r);
      const session = this.engine.players.get(client.sessionId);
      if (!session) return;
      if ((this.state.phase !== 'planning' && this.state.phase !== 'morning') || !isResidentOp(m?.op)) {
        return reply({ ok: false, residentId, reason: 'Lúc này chưa trò chuyện được.' });
      }
      const now = Date.now();
      if (now - (this.lastResidentAt.get(client.sessionId) ?? 0) < RESIDENT_MIN_INTERVAL_MS) return reply({ ok: false, residentId, reason: 'Từ từ thôi, đừng dồn dập.' });
      const res = this.residents.interact(residentId, m.op, client.sessionId, session.state.day, session.x, session.z, now);
      if (!res.ok) return reply({ ok: false, residentId, reason: res.reason });
      const granted = this.engine.grantResident(client.sessionId, res.deltas, res.pairKey);
      if (!granted.ok) return reply({ ok: false, residentId, reason: granted.reason });
      this.lastResidentAt.set(client.sessionId, now);
      res.commit(granted.gained !== null);
      // Nói chuyện còn là lúc nhận / nhắc / trả việc nhờ (độc lập với lượt thưởng trò chuyện trong ngày)
      const quest = m.op === 'talk' ? this.engine.questTalk(client.sessionId, residentId) : null;
      if (quest?.completed) res.level = this.residents.addBond(client.sessionId, residentId, 3);
      this.syncSession(client.sessionId);
      this.syncResidents();
      this.pushPrivate(client.sessionId);
      reply({ ok: true, residentId, gained: granted.gained, level: res.level, ...(quest ? { quest: { kind: quest.kind, text: quest.text, reward: quest.reward } } : {}) });
      const def = this.residents.residents.get(residentId)!.def;
      const event: ResidentEventMessage = { residentId, residentName: def.name, byId: session.id, byName: session.name, op: m.op, line: res.line, level: res.level };
      this.broadcast('resident_event', event);
    });

    this.onMessage('emote', (client, message: unknown) => {
      const m = message as { kind?: unknown; targetId?: unknown } | null;
      const reply = (r: EmoteResultMessage) => client.send('emote_result', r);
      const from = this.engine.players.get(client.sessionId);
      if (!from) return;
      if (!isEmoteKind(m?.kind)) return reply({ ok: false, reason: 'Biểu cảm không hợp lệ.' });
      const now = Date.now();
      if (now - (this.lastEmoteAt.get(client.sessionId) ?? 0) < EMOTE_MIN_INTERVAL_MS) return reply({ ok: false, reason: 'Từ từ thôi.' });
      const targeted = TARGETED_EMOTES.includes(m.kind);
      const targetId = typeof m.targetId === 'string' ? m.targetId : undefined;
      const to = targetId ? this.engine.players.get(targetId) : undefined;
      if (targeted && !to) return reply({ ok: false, reason: 'Chọn một người để làm điều này cùng.' });
      if (to && to.id === from.id) return reply({ ok: false, reason: 'Không thể tự làm với mình.' });
      if (to && Math.hypot(to.x - from.x, to.z - from.z) > EMOTE_REACH) return reply({ ok: false, reason: `Đứng gần ${to.name} hơn nhé.` });
      this.lastEmoteAt.set(client.sessionId, now);

      let gained: string | null = null;
      if (targeted && to) {
        const ok = (this.state.phase === 'planning' || this.state.phase === 'morning');
        if (ok) {
          gained = this.engine.grantPlay(from.id, { social: 1.5 }, `${m.kind}:${to.id}`);
          this.engine.grantPlay(to.id, { social: 1.5 }, `${m.kind}:${from.id}`);
          this.syncSession(from.id);
          this.syncSession(to.id);
        }
      }
      reply({ ok: true, gained });
      const event: EmoteMessage = { fromId: from.id, fromName: from.name, kind: m.kind, targetId: to?.id, targetName: to?.name };
      this.broadcast('emote', event);
    });

    this.onMessage('move', (client, message: unknown) => {
      const m = message as { x?: unknown; z?: unknown } | null;
      if (!this.engine.handleMove(client.sessionId, m?.x, m?.z, Date.now())) return;
      this.syncSession(client.sessionId);
      const moved = this.state.players.get(client.sessionId);
      if (moved && moved.anim !== 'idle') moved.anim = 'idle';
    });

    this.onMessage('chat', (client, message: unknown) => {
      const raw = sanitizeText((message as { text?: unknown } | null)?.text);
      const text = raw ? scrubLinks(raw) : null;
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

  onJoin(client: Client, options?: { name?: unknown; avatar?: unknown }): void {
    const name = sanitizeName(options?.name) ?? `Người chơi ${this.state.players.size + 1}`;
    const session = this.engine.addPlayer(client.sessionId, name, Date.now());

    const player = new PlayerSchema();
    player.id = session.id;
    player.name = session.name;
    // avatar do client chọn nhưng chỉ nhận id hợp lệ; không có thì chia theo thứ tự vào phòng
    player.avatar = isAvatarId(options?.avatar) ? options.avatar : AVATAR_IDS[this.state.players.size % AVATAR_IDS.length];
    player.lastActionId = '';
    player.anim = 'idle';
    syncPlayer(player, session, '');
    this.state.players.set(session.id, player);
    this.pushPrivate(session.id);

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
    this.pushPrivate(client.sessionId);
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

  private note(id: string, line: string): void {
    const list = this.story.get(id) ?? [];
    list.push(line);
    this.story.set(id, list);
  }

  /** Bạn bè đang chật vật (ý chí / tinh thần / tiền thấp): gợi ý ai có thể cần một lời động viên */
  private strugglingFriends(selfId: string): string[] {
    const out: string[] = [];
    for (const s of this.engine.players.values()) {
      if (s.id === selfId || s.state.finished) continue;
      const { willpower, mental, money } = s.state.stats;
      const why = [willpower < 35 ? `ý chí ${willpower}` : '', mental < 30 ? `tinh thần ${mental}` : '', money < 300 ? 'gần hết tiền' : ''].filter(Boolean);
      if (why.length > 0) out.push(`${s.name} đang chật vật (${why.join(', ')}). Một lời động viên có thể giúp.`);
    }
    return out;
  }

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
          const title = jointActionDef(res.offer.actionId)?.title ?? res.offer.actionId;
          const byHost = this.invitedBy.get(other.id) ?? new Map<string, string>();
          byHost.set(res.offer.id, `${host.name} rủ bạn: ${title}${pressure < 0 ? ` (bạn thấy hơi bị cuốn, ${pressure} ý chí)` : ''}. Bạn không đi.`);
          this.invitedBy.set(other.id, byHost);
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
    const title = jointActionDef(res.offer.actionId)?.title ?? res.offer.actionId;
    for (const r of res.results) {
      if (!r.ok) continue;
      this.invitedBy.get(r.playerId)?.delete(res.offer.id); // đã đi thì không còn là lời mời bị bỏ qua
      const mates = names.filter((n) => n !== this.nameOf(r.playerId));
      this.note(r.playerId, `${title} cùng ${mates.join(', ')}${r.fellForPressure ? ' (cả nhóm kéo nhau ở lại thêm)' : ''}.`);
    }
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
      if (target && r.ok) {
        target.lastActionId = res.offer.actionId;
        target.anim = animForAction(res.offer.actionId);
      }
      if (r.ok) this.pushPrivate(r.playerId);
    }
    this.syncOffers();
    this.checkAdvance();
  }

  // ---- Vòng đời ngày ----

  /** Gửi trạng thái riêng (hành vi đã làm, khóa, nợ ngủ) cho đúng người này nếu đang kết nối */
  private pushPrivate(id: string): void {
    const client = this.clients.getById(id);
    const session = this.engine.players.get(id);
    if (!client || !session) return;
    this.engine.refreshNpcQuest(id);
    const message: PrivateStateMessage = {
      npcQuest: this.engine.npcQuestViewOf(id),
      actionsToday: [...session.state.actionsTodayIds],
      locks: this.engine.locksFor(id),
      sleepDebt: session.state.sleepDebt,
      dayGrades: [...session.state.dayGrades],
      goals: evaluateGoals(session.state.goalIds, {
        history: session.state.history,
        todayIds: session.state.actionsTodayIds,
        stats: session.state.stats,
        final: session.state.finished,
      }),
    };
    client.send('private_state', message);
  }

  private syncSession(id: string): void {
    const session = this.engine.players.get(id);
    const target = this.state.players.get(id);
    if (session && target) syncPlayer(target, session, this.board.offerOf(id)?.id ?? '');
  }

  /** Ghi vị trí và tâm trạng con vật vào state công khai */
  private syncAnimals(): void {
    for (const a of this.animals.animals.values()) {
      const s = this.state.animals.get(a.def.id);
      if (!s) continue;
      s.x = a.x;
      s.z = a.z;
      s.mood = a.mood;
    }
  }

  /** Ghi vị trí và trạng thái cư dân vào state công khai */
  private syncResidents(): void {
    for (const r of this.residents.residents.values()) {
      const s = this.state.residents.get(r.def.id);
      if (!s) continue;
      s.x = r.x;
      s.z = r.z;
      s.state = r.state;
    }
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
    this.story.clear();
    this.invitedBy.clear();
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
    for (const offer of this.board.clear()) {
      this.expireOffer(offer);
      const title = jointActionDef(offer.actionId)?.title ?? offer.actionId;
      for (const m of offer.members) this.note(m, `Lời rủ "${title}" không thành (không đủ người trước khi hết ngày).`);
    }
    this.syncOffers();

    const day = this.state.day;
    this.reports.clear();
    this.applyNightlyGroupEvent(day);
    for (const s of this.engine.players.values()) {
      const night = this.engine.runNight(s.id);
      if (night) {
        const finished = evaluateLifeStatus(night.newStats).isGameOver || day >= LAST_DAY;
        this.reports.set(s.id, { day, report: night, finished, friends: [] });
      }
      this.syncSession(s.id);
    }
    // "Bạn bè hôm qua": cần chỉ số sau đêm của cả phòng nên dựng sau khi mọi người đã qua đêm
    for (const [id, message] of this.reports) {
      const lines = [...(this.story.get(id) ?? []), ...(this.invitedBy.get(id)?.values() ?? []), ...this.strugglingFriends(id)];
      message.friends = lines.length > 0 ? lines : ['Hôm qua bạn chủ yếu sống một mình. Thử rủ ai đó làm gì chung xem sao.'];
    }
    this.schedule(this.timing.nightMs, () => this.enterMorning());
  }

  /**
   * Biến cố nhóm của đêm nay (nếu có): tính trước khi qua đêm để chỉ số thay đổi được tính vào báo cáo.
   * Rng riêng theo roomSeed + ngày, nên kết quả tất định theo phòng.
   */
  private applyNightlyGroupEvent(day: number): void {
    const players = [...this.engine.players.values()];
    const active = players.filter((s) => !s.state.finished);
    const rng = this.engine.rngForLabel('group-event', day);
    const eventId = rollGroupEvent(active.length, rng);
    if (!eventId) return;
    const out = applyGroupEvent(
      eventId,
      players.map((s) => s.state),
      players.map((s) => s.name),
      (i, victim) => this.engine.hasSupported(players[i].id, players[victim].id),
      rng
    );
    this.engine.setStates(players.map((s, i) => ({ id: s.id, state: out.states[i] })));
    players.forEach((s, i) => out.notes[i].forEach((line) => this.note(s.id, `🎲 ${out.title}: ${line}`)));
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
    for (const id of this.engine.players.keys()) this.pushPrivate(id);
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

/** Tạo lớp phòng với thời gian tùy chỉnh (mặc định 240s lên kế hoạch, giữ chỗ 60s). Chỉ server quyết định, client không đổi được. */
export function createLifeRoom(timing: Partial<Timing> = {}, limits: Partial<Limits> = {}): typeof LifeRoom {
  const mergedTiming: Timing = { ...DEFAULT_TIMING, ...timing };
  const mergedLimits: Limits = { ...DEFAULT_LIMITS, ...limits };
  return class ConfiguredLifeRoom extends LifeRoom {
    protected override timing = mergedTiming;
    protected override limits = mergedLimits;
  };
}
