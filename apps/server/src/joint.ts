import { jointActionDef, resolveJointAction, type SoundCue } from '@24h/domain';
import type { LifeEngine } from './engine.js';

/**
 * Bảng lời rủ (hành vi chung). Một người rủ (host), người khác vào, host bấm bắt đầu (hoặc đầy chỗ thì tự chạy).
 * Chỉ giữ ai đang chờ ai; mọi tính toán chỉ số nằm ở resolveJointAction của @24h/domain.
 * Người đang ở trong một lời rủ không làm hành vi khác được, nên trạng thái của họ không đổi trong lúc chờ.
 */
export interface Offer {
  id: string;
  actionId: string;
  hostId: string;
  members: string[];
  seq: number;
}

export type OfferResult = { ok: true; offer: Offer } | { ok: false; reason: string };

export interface JointMemberResult {
  playerId: string;
  ok: boolean;
  reason?: string;
  notice: string | null;
  soundCue: SoundCue;
  fellForPressure: boolean;
}

export type StartResult =
  | { ok: true; offer: Offer; results: JointMemberResult[] }
  | { ok: false; reason: string; offer: Offer; dropped: string[]; cancelled: boolean };

export class JointBoard {
  private offers = new Map<string, Offer>();
  private seq = 0;

  constructor(private readonly engine: LifeEngine) {}

  list(): Offer[] {
    return [...this.offers.values()];
  }

  offerOf(playerId: string): Offer | undefined {
    return this.list().find((o) => o.members.includes(playerId));
  }

  /** Lý do người này chưa thể tham gia hành vi chung, hoặc null nếu được. Dùng đúng luật lên kế hoạch của domain. */
  private blocker(playerId: string, actionId: string): string | null {
    const reason = this.engine.canPlanJoint(playerId, actionId);
    if (reason) return reason;
    if (this.offerOf(playerId)) return 'Bạn đang ở trong một lời rủ khác.';
    return null;
  }

  create(hostId: string, actionId: unknown): OfferResult {
    const def = typeof actionId === 'string' ? jointActionDef(actionId) : undefined;
    if (!def?.joint || typeof actionId !== 'string') return { ok: false, reason: 'Không phải hành vi chung.' };
    const reason = this.blocker(hostId, actionId);
    if (reason) return { ok: false, reason };
    const seq = ++this.seq;
    const offer: Offer = { id: `o${seq}`, actionId, hostId, members: [hostId], seq };
    this.offers.set(offer.id, offer);
    return { ok: true, offer };
  }

  join(playerId: string, offerId: unknown): OfferResult {
    const offer = typeof offerId === 'string' ? this.offers.get(offerId) : undefined;
    if (!offer) return { ok: false, reason: 'Lời rủ không còn.' };
    const def = jointActionDef(offer.actionId)!;
    if (offer.members.length >= def.joint!.maxPlayers) return { ok: false, reason: 'Đã đủ người.' };
    const reason = this.blocker(playerId, offer.actionId);
    if (reason) return { ok: false, reason };
    offer.members.push(playerId);
    return { ok: true, offer };
  }

  /** Rời lời rủ. Host rời thì lời rủ bị hủy. */
  leave(playerId: string): { left: Offer | null; cancelled: Offer | null } {
    const offer = this.offerOf(playerId);
    if (!offer) return { left: null, cancelled: null };
    if (offer.hostId === playerId) {
      this.offers.delete(offer.id);
      return { left: null, cancelled: offer };
    }
    offer.members = offer.members.filter((id) => id !== playerId);
    return { left: offer, cancelled: null };
  }

  /** Hủy hết (hết giờ lên kế hoạch). Trả các lời rủ đã hủy để thông báo. */
  clear(): Offer[] {
    const all = this.list();
    this.offers.clear();
    return all;
  }

  /** Host bắt đầu (hoặc tự chạy khi đầy chỗ). Thành công thì áp kết quả vào từng người chơi và xóa lời rủ. */
  start(hostId: string): StartResult | { ok: false; reason: string } {
    const offer = this.list().find((o) => o.hostId === hostId);
    if (!offer) return { ok: false, reason: 'Bạn chưa rủ ai.' };
    const def = jointActionDef(offer.actionId)!.joint!;
    if (offer.members.length < def.minPlayers) {
      return { ok: false, reason: `Cần ít nhất ${def.minPlayers} người.`, offer, dropped: [], cancelled: false };
    }

    const sessions = offer.members.map((id) => this.engine.players.get(id)!);
    const day = sessions[0].state.day;
    const rng = this.engine.rngForLabel(`${offer.hostId}#joint${offer.seq}`, day);
    const res = resolveJointAction(sessions.map((s) => s.state), offer.actionId, rng);

    if (!res.ok) {
      // người không làm được nữa thì bị loại; host bị loại thì hủy cả lời rủ
      const dropped = res.outcomes.filter((o) => o.reason && o.reason !== 'Nhóm chưa đủ người.').map((o) => offer.members[o.index]);
      offer.members = offer.members.filter((id) => !dropped.includes(id));
      const cancelled = dropped.includes(offer.hostId) || offer.members.length === 0;
      if (cancelled) this.offers.delete(offer.id);
      return { ok: false, reason: res.reason ?? 'Không bắt đầu được.', offer, dropped, cancelled };
    }

    const results: JointMemberResult[] = res.outcomes.map((o) => {
      const session = sessions[o.index];
      if (o.ok) session.state = o.state;
      return {
        playerId: session.id,
        ok: o.ok,
        reason: o.reason,
        notice: o.notice,
        soundCue: o.soundCue,
        fellForPressure: o.fellForPressure,
      };
    });
    this.offers.delete(offer.id);
    return { ok: true, offer, results };
  }
}
