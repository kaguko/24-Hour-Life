import { randomBytes } from 'node:crypto';
import { CloseCode, Room, matchMaker, type Client } from '@colyseus/core';
import { generateRoomCode } from './code.js';
import { sanitizeText } from './chat.js';
import { LifeEngine, type PlayerSession } from './engine.js';
import {
  CHAT_HISTORY,
  CHAT_MIN_INTERVAL_MS,
  MAX_MESSAGES_PER_SECOND,
  MAX_PLAYERS,
  RECONNECT_SECONDS,
  type ActionResultMessage,
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

export class LifeRoom extends Room<{ state: LifeState }> {
  maxClients = MAX_PLAYERS;
  maxMessagesPerSecond = MAX_MESSAGES_PER_SECOND;

  private engine!: LifeEngine;
  private lastChatAt = new Map<string, number>();

  async onCreate(): Promise<void> {
    // Mã phòng = roomId: người chơi vào bằng joinById(code). Phòng riêng tư nên không liệt kê.
    this.roomId = await uniqueRoomCode();
    await this.setPrivate(true);

    // roomSeed do server tự sinh và giữ kín (lộ seed là đoán được kết quả ngẫu nhiên)
    this.engine = new LifeEngine(randomBytes(16).toString('hex'));
    const state = new LifeState();
    state.code = this.roomId;
    this.setState(state);

    this.onMessage('action', (client, message: unknown) => {
      const actionId = (message as { actionId?: unknown } | null)?.actionId;
      const id = typeof actionId === 'string' ? actionId : '';
      const outcome = this.engine.handleAction(client.sessionId, actionId);
      if (!outcome.ok) {
        const reply: ActionResultMessage = { ok: false, actionId: id, reason: outcome.reason };
        client.send('action_result', reply);
        return;
      }
      const session = this.engine.players.get(client.sessionId);
      const target = this.state.players.get(client.sessionId);
      if (session && target) {
        syncPlayer(target, session);
        target.lastActionId = id;
      }
      const reply: ActionResultMessage = { ok: true, actionId: id, notice: outcome.notice };
      client.send('action_result', reply);
      if (outcome.night) client.send('night', outcome.night);
    });

    this.onMessage('move', (client, message: unknown) => {
      const m = message as { x?: unknown; z?: unknown } | null;
      if (!this.engine.handleMove(client.sessionId, m?.x, m?.z, Date.now())) return;
      const session = this.engine.players.get(client.sessionId);
      const target = this.state.players.get(client.sessionId);
      if (session && target) {
        target.x = session.x;
        target.z = session.z;
      }
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
    player.connected = true;
    player.lastActionId = '';
    syncPlayer(player, session);
    this.state.players.set(session.id, player);
  }

  async onLeave(client: Client, code?: number): Promise<void> {
    const player = this.state.players.get(client.sessionId);
    if (player && code !== CloseCode.CONSENTED) {
      player.connected = false;
      try {
        await this.allowReconnection(client, RECONNECT_SECONDS);
        player.connected = true;
        return;
      } catch {
        // hết hạn chờ: xóa người chơi
      }
    }
    this.engine.removePlayer(client.sessionId);
    this.lastChatAt.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }
}
