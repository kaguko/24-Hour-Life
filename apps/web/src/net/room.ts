/**
 * Kết nối phòng multiplayer (Colyseus) và biến state schema thành snapshot thuần để React dựng giao diện.
 * Client chỉ gửi ý định (hành vi, vị trí, chat...); mọi chỉ số do server tính (xem apps/server).
 */
import { Client, type Room } from '@colyseus/sdk';
import type {
  ActionResultMessage,
  AnimalEventMessage,
  AnimalKind,
  AnimalMood,
  AnimalOp,
  AnimalResultMessage,
  Anim,
  EmoteKind,
  EmoteMessage,
  EmoteResultMessage,
  ClientMessages,
  GroupQuestDoneMessage,
  InviteMessage,
  JointResultMessage,
  JoinOptions,
  MorningReportMessage,
  NudgedMessage,
  NudgeResultMessage,
  Phase,
  PrivateStateMessage,
  ResidentEventMessage,
  ResidentOp,
  ResidentResultMessage,
  ResidentState,
} from '@24h/protocol';
import { ROOM_NAME } from '@24h/protocol';

export interface PlayerStatsView {
  dopamine: number;
  energy: number;
  mental: number;
  social: number;
  money: number;
  willpower: number;
}

export interface PlayerView {
  id: string;
  name: string;
  avatar: string;
  connected: boolean;
  bot: boolean;
  ready: boolean;
  x: number;
  z: number;
  day: number;
  hoursUsed: number;
  location: string;
  finished: boolean;
  stats: PlayerStatsView;
  lastActionId: string;
  offerId: string;
  anim: Anim;
}

export interface OfferView {
  id: string;
  actionId: string;
  hostId: string;
  members: string[];
  minPlayers: number;
  maxPlayers: number;
}

export interface ChatView {
  playerId: string;
  name: string;
  text: string;
  at: number;
}

export interface AnimalView {
  id: string;
  kind: AnimalKind;
  name: string;
  x: number;
  z: number;
  mood: AnimalMood;
}

export interface ResidentView {
  id: string;
  name: string;
  x: number;
  z: number;
  state: ResidentState;
}

export interface RoomSnapshot {
  code: string;
  phase: Phase;
  day: number;
  phaseEndsAt: number;
  players: PlayerView[];
  offers: OfferView[];
  chat: ChatView[];
  animals: AnimalView[];
  residents: ResidentView[];
  sessionId: string;
  me: PlayerView | null;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'closed';

/** Message server -> client và kiểu payload */
export interface ServerEvents {
  private_state: PrivateStateMessage;
  action_result: ActionResultMessage;
  morning: MorningReportMessage;
  invite: InviteMessage;
  joint_result: JointResultMessage;
  nudge_result: NudgeResultMessage;
  nudged: NudgedMessage;
  animal_event: AnimalEventMessage;
  animal_result: AnimalResultMessage;
  resident_event: ResidentEventMessage;
  resident_result: ResidentResultMessage;
  emote: EmoteMessage;
  emote_result: EmoteResultMessage;
  group_quest_done: GroupQuestDoneMessage;
}

type Listener = () => void;

const EMPTY_STATS: PlayerStatsView = { dopamine: 0, energy: 0, mental: 0, social: 0, money: 0, willpower: 0 };

/** state schema (đã giải mã động) -> snapshot thuần. Tách riêng để test được. */
export function buildSnapshot(state: any, sessionId: string): RoomSnapshot {
  const players: PlayerView[] = [];
  state.players?.forEach((p: any, id: string) => {
    players.push({
      id,
      name: p.name ?? '',
      avatar: p.avatar ?? 'male-a',
      connected: !!p.connected,
      bot: !!p.bot,
      ready: !!p.ready,
      x: p.x ?? 0,
      z: p.z ?? 0,
      day: p.day ?? 1,
      hoursUsed: p.hoursUsed ?? 0,
      location: p.location ?? 'home',
      finished: !!p.finished,
      stats: {
        dopamine: p.dopamine ?? EMPTY_STATS.dopamine,
        energy: p.energy ?? EMPTY_STATS.energy,
        mental: p.mental ?? EMPTY_STATS.mental,
        social: p.social ?? EMPTY_STATS.social,
        money: p.money ?? EMPTY_STATS.money,
        willpower: p.willpower ?? EMPTY_STATS.willpower,
      },
      lastActionId: p.lastActionId ?? '',
      offerId: p.offerId ?? '',
      anim: (p.anim ?? 'idle') as Anim,
    });
  });
  const offers: OfferView[] = [];
  state.offers?.forEach((o: any, id: string) => {
    offers.push({ id, actionId: o.actionId, hostId: o.hostId, members: Array.from(o.members ?? []) as string[], minPlayers: o.minPlayers, maxPlayers: o.maxPlayers });
  });
  const chat: ChatView[] = [];
  state.chat?.forEach((c: any) => chat.push({ playerId: c.playerId, name: c.name, text: c.text, at: c.at }));
  const animals: AnimalView[] = [];
  state.animals?.forEach((a: any, id: string) =>
    animals.push({ id, kind: a.kind as AnimalKind, name: a.name ?? '', x: a.x ?? 0, z: a.z ?? 0, mood: (a.mood ?? 'calm') as AnimalMood })
  );
  const residents: ResidentView[] = [];
  state.residents?.forEach((r: any, id: string) => residents.push({ id, name: r.name ?? '', x: r.x ?? 0, z: r.z ?? 0, state: (r.state ?? 'idle') as ResidentState }));
  return {
    code: state.code ?? '',
    phase: (state.phase ?? 'planning') as Phase,
    day: state.day ?? 1,
    phaseEndsAt: state.phaseEndsAt ?? 0,
    players,
    offers,
    chat,
    animals,
    residents,
    sessionId,
    me: players.find((p) => p.id === sessionId) ?? null,
  };
}

const TOKEN_KEY = '24h_life_room_reconnect_v1';

export class RoomConnection {
  private snapshot: RoomSnapshot;
  private status: ConnectionStatus = 'connected';
  private priv: PrivateStateMessage | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly handlers = new Map<string, Set<(payload: any) => void>>();

  private constructor(private readonly room: Room<any, any>, private readonly url: string) {
    this.snapshot = buildSnapshot(room.state, room.sessionId);
    room.onStateChange(() => {
      this.snapshot = buildSnapshot(room.state, room.sessionId);
      this.notify();
    });
    room.onDrop?.(() => this.setStatus('reconnecting'));
    room.onReconnect?.(() => {
      this.setStatus('connected');
      this.saveToken();
    });
    room.onLeave(() => {
      this.setStatus('closed');
      clearSavedToken();
    });
    for (const type of ['private_state', 'action_result', 'morning', 'invite', 'joint_result', 'nudge_result', 'nudged', 'animal_event', 'animal_result', 'resident_event', 'resident_result', 'emote', 'emote_result', 'group_quest_done'] as const) {
      room.onMessage(type, (payload: any) => {
        if (type === 'private_state') {
          this.priv = payload;
          this.notify();
        }
        this.handlers.get(type)?.forEach((h) => h(payload));
      });
    }
    this.saveToken();
  }

  /** Tạo phòng mới; mã 4 ký tự là `snapshot.code`. */
  static async create(url: string, options: JoinOptions): Promise<RoomConnection> {
    const room = await new Client(url).create(ROOM_NAME, options);
    return new RoomConnection(room, url);
  }

  /** Vào phòng bằng mã 4 ký tự (không phân biệt hoa thường). */
  static async join(url: string, code: string, options: JoinOptions): Promise<RoomConnection> {
    const room = await new Client(url).joinById(code.trim().toUpperCase(), options);
    return new RoomConnection(room, url);
  }

  /** Vào lại phòng vừa rời đột ngột (F5, rớt mạng) nếu token còn hạn; null nếu không có/không còn. */
  static async resume(url: string): Promise<RoomConnection | null> {
    const token = readSavedToken();
    if (!token) return null;
    try {
      const room = await new Client(url).reconnect(token);
      return new RoomConnection(room, url);
    } catch {
      clearSavedToken();
      return null;
    }
  }

  private saveToken(): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, this.room.reconnectionToken);
    } catch {
      /* bỏ qua: chế độ riêng tư / chặn storage */
    }
  }

  private setStatus(s: ConnectionStatus): void {
    this.status = s;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // ---- useSyncExternalStore ----
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): RoomSnapshot => this.snapshot;
  getStatus = (): ConnectionStatus => this.status;
  getPrivate = (): PrivateStateMessage | null => this.priv;

  /** Nghe một loại message của server. Trả hàm huỷ. */
  on<K extends keyof ServerEvents>(type: K, handler: (payload: ServerEvents[K]) => void): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as (p: any) => void);
    return () => set!.delete(handler as (p: any) => void);
  }

  get sessionId(): string {
    return this.room.sessionId;
  }
  get serverUrl(): string {
    return this.url;
  }

  private send<K extends keyof ClientMessages>(type: K, payload?: ClientMessages[K]): void {
    this.room.send(type, payload);
  }
  sendAction = (actionId: string) => this.send('action', { actionId });
  sendMove = (x: number, z: number) => this.send('move', { x, z });
  sendChat = (text: string) => this.send('chat', { text });
  setReady = (ready = true) => this.send('ready', { ready });
  offerJoint = (actionId: string) => this.send('joint', { op: 'offer', actionId });
  joinOffer = (offerId: string) => this.send('joint', { op: 'join', offerId });
  leaveOffer = () => this.send('joint', { op: 'leave' });
  startOffer = () => this.send('joint', { op: 'start' });
  nudge = (targetId: string) => this.send('nudge', { targetId });
  interactAnimal = (animalId: string, op: AnimalOp) => this.send('animal', { animalId, op });
  interactResident = (residentId: string, op: ResidentOp) => this.send('resident', { residentId, op });
  emote = (kind: EmoteKind, targetId?: string) => this.send('emote', { kind, targetId });

  async leave(): Promise<void> {
    clearSavedToken();
    try {
      await this.room.leave(true);
    } catch {
      /* đã đóng */
    }
  }
}

function readSavedToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function clearSavedToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Địa chỉ server từ VITE_SERVER_URL; mặc định cùng máy với trang, cổng 2567. */
export function defaultServerUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SERVER_URL;
  if (env) return env;
  const host = typeof location !== 'undefined' ? location.hostname : 'localhost';
  return `ws://${host}:2567`;
}
