import type { Rng } from '@24h/domain';
import {
  STROLLERS,
  STROLLER_BUMP_PAIR_COOLDOWN_MS,
  STROLLER_BUMP_RADIUS,
  STROLLER_BUMP_STOP_MS,
  type StrollerBumpMessage,
  type StrollerDef,
  type StrollerState,
} from './protocol.js';

export interface StrollerRuntime {
  def: StrollerDef;
  x: number;
  z: number;
  state: StrollerState;
  /** Điểm của lộ trình đang đi tới / đang đứng */
  idx: number;
  nextMoveAt: number;
  /** Đứng lại chửi cho tới mốc này (ms) */
  busyUntil: number;
}

/** Một người chơi để kiểm tra va chạm (vị trí do server giữ) */
export interface BumpTarget {
  id: string;
  name: string;
  x: number;
  z: number;
}

/** Mỗi câu có bản chửi tục (che chữ) và bản lịch sự cùng ý, để người chơi tắt được chế độ chửi tục. */
export interface Swear {
  raw: string;
  clean: string;
}

/**
 * Lời của từng con: hài hước, chửi người đụng phải nhưng không nhắm vào ai ngoài việc "đi đứng vô ý".
 * Chữ nặng đều che bằng dấu *.
 */
export const SWEARS: Record<string, Swear[]> = {
  'cut-beo': [
    { raw: 'Đ** má! Cánh tao to thế này mà không thấy à?!', clean: 'Này! Cánh tôi to thế này mà không thấy à?!' },
    { raw: 'Mắt để dưới đít hả?! Đi đứng kiểu gì đấy!', clean: 'Mắt để đâu thế?! Đi đứng cẩn thận chứ!' },
    { raw: 'Con m* nó, tao ướp lạnh mày bây giờ!', clean: 'Trời đất, tôi đóng băng bạn bây giờ!' },
    { raw: 'Đồ ngu! Tao cụt cánh chứ không cụt não!', clean: 'Tôi cụt cánh chứ đâu có cụt óc!' },
  ],
  'ga-nong': [
    { raw: 'Cái đồ khốn! Giẫm lên chân tao rồi!', clean: 'Ái! Bạn giẫm lên chân tôi rồi!' },
    { raw: 'Tao bé chứ tao không điếc nhé! Mày đi như trâu hả?!', clean: 'Tôi bé chứ không điếc nhé! Đi như trâu vậy?!' },
    { raw: 'Đ** m* đau quá! Cút ra chỗ khác cho tao!', clean: 'Đau quá! Tránh ra chỗ khác giùm!' },
    { raw: 'Cục tức của tao to hơn cả người tao đấy, biết chưa?!', clean: 'Cục tức của tôi to hơn cả người tôi đấy, biết chưa?!' },
  ],
  'ga-li': [
    { raw: 'Ờ đụng đi, đụng nữa đi! Tao không sợ mày đâu!', clean: 'Ừ đụng đi, đụng nữa đi! Tôi không sợ đâu!' },
    { raw: 'Mẹ kiếp, mù hay sao mà đâm vào người ta?!', clean: 'Trời ơi, mù hay sao mà đâm vào người ta?!' },
    { raw: 'Đồ vô duyên! Biến! Biến cho khuất mắt tao!', clean: 'Đồ vô duyên! Đi đi! Đi cho khuất mắt tôi!' },
    { raw: 'Tao mà lớn thì mày chết với tao rồi!', clean: 'Tôi mà lớn thì bạn biết tay tôi rồi!' },
  ],
  'vet-be': [
    { raw: 'Đ** MÁ! Đ** MÁ! Mắt để đâu hả?!', clean: 'ỐI TRỜI! ỐI TRỜI! Mắt để đâu hả?!' },
    { raw: 'Đồ ngốc! Đồ ngốc! Đi đứng thế à?!', clean: 'Đồ vụng! Đồ vụng! Đi đứng thế à?!' },
    { raw: 'Khốn nạn! Tao mách cả phố nhé!', clean: 'Hư quá! Tôi mách cả phố nhé!' },
    { raw: 'Con điên! Con điên! Tránh ra cho người ta đi!', clean: 'Quá đáng! Quá đáng! Tránh ra cho người ta đi!' },
  ],
};

const pick = <T>(rng: Rng, list: T[]): T => list[Math.floor(rng() * list.length) % list.length];

/** Thú đi bằng hai chân đi tuần và chửi người đụng phải. Chỉ logic thuần, không biết Colyseus. */
export class StrollerBoard {
  readonly strollers = new Map<string, StrollerRuntime>();
  /** Lần cuối (thú, người) bị chửi, theo khoá `thú|người` */
  private readonly lastBump = new Map<string, number>();

  constructor(private readonly rng: Rng, now = 0) {
    for (const def of STROLLERS) {
      const start = def.route[0];
      this.strollers.set(def.id, { def, x: start.x, z: start.z, state: 'idle', idx: 0, nextMoveAt: now + 500 + Math.floor(this.rng() * 3000), busyUntil: 0 });
    }
  }

  /** Gọi định kỳ: đi theo lộ trình, nghỉ ở mỗi điểm. Trả những con vừa đổi vị trí / trạng thái. */
  tick(now: number, dtMs: number): StrollerRuntime[] {
    const changed: StrollerRuntime[] = [];
    for (const r of this.strollers.values()) {
      const before = `${r.x}|${r.z}|${r.state}`;
      if (now < r.busyUntil) {
        r.state = 'talk';
      } else {
        const target = r.def.route[r.idx];
        if (r.state === 'talk') {
          // chửi xong: đang dở đường thì đi tiếp tới điểm đó, không thì đứng thêm một chút
          const unfinished = r.x !== target.x || r.z !== target.z;
          r.state = unfinished ? 'walk' : 'idle';
          r.nextMoveAt = now + 800;
        }
        if (r.state === 'walk') {
          const dx = target.x - r.x;
          const dz = target.z - r.z;
          const d = Math.hypot(dx, dz);
          const step = (r.def.speed * dtMs) / 1000;
          if (d <= step) {
            r.x = target.x;
            r.z = target.z;
            r.state = 'idle';
            const [lo, hi] = r.def.pauseMs;
            r.nextMoveAt = now + lo + this.rng() * (hi - lo);
          } else {
            r.x += (dx / d) * step;
            r.z += (dz / d) * step;
          }
        } else if (now >= r.nextMoveAt) {
          r.idx = (r.idx + 1) % r.def.route.length;
          r.state = 'walk';
        }
      }
      if (before !== `${r.x}|${r.z}|${r.state}`) changed.push(r);
    }
    return changed;
  }

  /**
   * Ai đang đụng phải con nào thì bị chửi (mỗi cặp có thời gian hồi). Con bị đụng đứng lại chửi một lúc.
   * Một con chỉ chửi một người mỗi lần kiểm tra (người gần nhất) để không chửi chồng chéo.
   */
  bumps(targets: BumpTarget[], now: number): StrollerBumpMessage[] {
    const out: StrollerBumpMessage[] = [];
    for (const r of this.strollers.values()) {
      if (now < r.busyUntil) continue;
      let best: { t: BumpTarget; d: number } | null = null;
      for (const t of targets) {
        const d = Math.hypot(t.x - r.x, t.z - r.z);
        if (d > STROLLER_BUMP_RADIUS) continue;
        if (now - (this.lastBump.get(`${r.def.id}|${t.id}`) ?? -Infinity) < STROLLER_BUMP_PAIR_COOLDOWN_MS) continue;
        if (!best || d < best.d) best = { t, d };
      }
      if (!best) continue;
      this.lastBump.set(`${r.def.id}|${best.t.id}`, now);
      r.busyUntil = now + STROLLER_BUMP_STOP_MS;
      r.state = 'talk';
      const swear = pick(this.rng, SWEARS[r.def.id]);
      out.push({ strollerId: r.def.id, strollerName: r.def.name, byId: best.t.id, byName: best.t.name, line: `${r.def.name}: “${swear.raw}”`, cleanLine: `${r.def.name}: “${swear.clean}”` });
    }
    return out;
  }
}
