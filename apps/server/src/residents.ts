import type { Rng } from '@24h/domain';
import { RESIDENTS, RESIDENT_BUSY_MS, RESIDENT_LEVEL_AT, RESIDENT_REACH, type ResidentDef, type ResidentOp, type ResidentState } from './protocol.js';

/** Chỉ số thay đổi khi tương tác với cư dân (tiền chỉ âm: mời quà) */
export type ResidentDeltas = Partial<{ mental: number; social: number; willpower: number; money: number }>;

export interface ResidentRuntime {
  def: ResidentDef;
  x: number;
  z: number;
  state: ResidentState;
  /** Điểm của lộ trình đang đi tới / đang đứng */
  idx: number;
  nextMoveAt: number;
  /** Đứng lại nói chuyện cho tới mốc này (ms) */
  busyUntil: number;
}

export type ResidentOutcome =
  | { ok: false; reason: string }
  | {
      ok: true;
      line: string;
      /** Mức thân quen sau lần này */
      level: number;
      /** Chỉ số sẽ cộng nếu còn lượt thưởng hôm nay (rỗng khi cư dân đã "mệt") */
      deltas: ResidentDeltas;
      /** Khoá duy nhất cho lượt này (engine dùng để đếm giới hạn thưởng mỗi ngày) */
      pairKey: string;
      /** Gọi sau khi engine đã xử lý: `rewarded` = đã nhận thưởng thật. Cập nhật lượt dùng, độ thân và cho cư dân đứng lại. */
      commit: (rewarded: boolean) => void;
    };

/** Số lượt có thưởng mỗi ngày cho mỗi (người chơi, cư dân, hành động) */
const DAILY_LIMIT: Record<ResidentOp, number> = { talk: 2, help: 1, treat: 2 };
/** Độ thân quen cộng thêm mỗi lần có thưởng */
const BOND_GAIN: Record<ResidentOp, number> = { talk: 1, help: 2, treat: 2 };

interface Persona {
  /** Lời nói theo mức thân quen 0 / 1 / 2 */
  talk: [string[], string[], string[]];
  help: string[];
  treat?: string[];
  tired: string[];
  gain: { talk: ResidentDeltas; help: ResidentDeltas; treat?: ResidentDeltas };
}

const PERSONA: Record<string, Persona> = {
  'ba-tu': {
    talk: [
      ['Bà Tư: “Con ngồi xuống chút đi. Cả ngày chạy đi đâu mà vội thế?”', 'Bà Tư: “Bà sống bảy mươi năm rồi. Điều bà tiếc nhất là những ngày mình vội.”'],
      ['Bà Tư: “Lại là con à! Hôm nay con ngủ đủ chưa? Đừng thức khuya nữa nhé.”', 'Bà Tư: “Hồi trẻ bà cũng hay hẹn ngày mai. Ngày mai thành ngày kia, ngày kia thành cả đời.”'],
      ['Bà Tư: “Cháu ngoan của bà. Nhớ nhé: một giờ ngủ ngon quý hơn mười giờ cố thức.”', 'Bà Tư vỗ nhẹ tay bạn: “Cái gì quan trọng thì làm trước, cái gì vui thì để sau. Dễ mà khó.”'],
    ],
    help: ['Bà Tư cười móm mém: “Giỏi quá, tay con khoẻ hơn bà tưởng. Bà quý con rồi đấy.”', 'Bà Tư: “Cảm ơn con. Giúp người khác xong, tự nhiên mình thấy nhẹ người, đúng không?”'],
    treat: ['Bà Tư nhấp trà đá, mắt sáng lên: “Ngon! Thứ nhỏ nhoi mà làm người ta vui cả buổi.”', 'Bà Tư: “Bà không đòi hỏi gì đâu, nhưng ly trà này bà nhớ.”'],
    tired: ['Bà Tư: “Hôm nay con giúp bà nhiều rồi. Đi chơi đi, đừng ngồi với bà già mãi.”'],
    gain: { talk: { mental: 2, social: 1 }, help: { willpower: 1, social: 2 }, treat: { social: 2, mental: 2 } },
  },
  hung: {
    talk: [
      ['Anh Hùng vừa thở vừa nói: “Chạy… hai mươi phút thôi. Khó nhất là buộc dây giày!”', 'Anh Hùng: “Đừng đợi có hứng mới chạy. Hứng đến SAU khi mình bắt đầu.”'],
      ['Anh Hùng đập tay bạn: “Quay lại rồi à? Dopamine từ chạy bộ không crash đâu, thử đi!”', 'Anh Hùng: “Sáng nay tôi cũng lười lắm. Nhưng tôi thương cái tôi của tối nay hơn.”'],
      ['Anh Hùng: “Bạn bè mà! Mai sáng chạy chung nhé, tôi không chờ đâu đấy.”', 'Anh Hùng: “Ý chí như bắp tay: tập nhẹ mỗi ngày là to lên.”'],
    ],
    help: ['Bạn chạy cùng Anh Hùng một đoạn, thở như cá mắc cạn. Anh Hùng: “Đấy! Còn đứng được tức là còn chạy tiếp được!”', 'Hai người sải bước song song. Anh Hùng: “Nhịp thở, nhịp thở! Rất tốt!”'],
    tired: ['Anh Hùng: “Hôm nay chạy với tôi đủ rồi, nghỉ đi kẻo đau chân, mai tiếp!”'],
    gain: { talk: { willpower: 1, social: 1 }, help: { willpower: 2, mental: 1 } },
  },
  lan: {
    talk: [
      ['Cô Lan lau ly: “Cà phê giúp tỉnh, chứ không thay được giấc ngủ đâu nhé.”', 'Cô Lan: “Khách nào cũng bảo cần một ly để sống qua deadline. Cô chỉ pha, còn deadline thì tự lo.”'],
      ['Cô Lan: “Ơ, khách quen! Hôm nay uống ít đường nhé? Đường cũng là dopamine rẻ đấy.”', 'Cô Lan: “Cô thích nhất lúc quán vắng, nghe tiếng máy xay và nghĩ vu vơ.”'],
      ['Cô Lan nháy mắt: “Cho cưng ly đặc biệt, không tính tiền… đùa thôi! Nhưng cô quý cưng thật.”', 'Cô Lan: “Có người ngồi hàng giờ lướt điện thoại ở quán. Cưng đừng làm vậy, ra ngoài đi dạo ấy.”'],
    ],
    help: ['Bạn bưng giúp mấy ly. Cô Lan: “Khéo tay ghê! Có muốn xin việc không?”', 'Cô Lan: “Cảm ơn cưng, đỡ cô một nửa buổi sáng rồi!”'],
    treat: ['Bạn nhận ly cà phê nóng. Cô Lan: “Của cưng đây. Uống chậm thôi, nhấm nháp mới ngon.”', 'Thơm lừng. Bạn thấy tỉnh táo hơn một chút. Cô Lan: “Nhớ, đừng lấy cà phê thay cho giấc ngủ nhé.”'],
    tired: ['Cô Lan: “Cưng uống nhiều cà phê hôm nay rồi, cho tim nghỉ chút nhé.”'],
    gain: { talk: { mental: 1, social: 1 }, help: { willpower: 1, social: 1 }, treat: { mental: 3, social: 1 } },
  },
  tam: {
    talk: [
      ['Chú Tám: “Bánh mì nóng giòn đây! Ăn no mới có sức làm việc chứ cháu.”', 'Chú Tám: “Hồi chú bán ở góc này, cả khu chỉ có ba nhà. Giờ thì đông vui thế này.”'],
      ['Chú Tám: “Cháu đến rồi! Chú để dành ổ bánh ngon nhất đấy.”', 'Chú Tám: “Tiền chú kiếm chẳng nhiều, nhưng ngày nào cũng có người chào, thế là đủ.”'],
      ['Chú Tám vỗ vai bạn: “Cháu chú cứ yên tâm, đói thì ghé, chú không để cháu đói đâu.”', 'Chú Tám: “Chi tiêu cũng như bánh mì: vừa đủ ăn là ngon, ăn quá thì ngán.”'],
    ],
    help: ['Bạn phụ chú Tám xếp bánh vào giỏ. Chú: “Nhanh tay lắm! Cháu có tố chất bán hàng đấy.”', 'Chú Tám: “Cảm ơn cháu. Có người phụ, chú đỡ mỏi lưng hẳn.”'],
    treat: ['Ổ bánh mì nóng, giòn rụm, thơm bơ. Chú Tám: “Của cháu đây, chú cho thêm chút ruốc.”', 'Bạn cắn một miếng bánh mì. Chú Tám cười: “Ngon chứ? Ăn đàng hoàng, đừng vừa ăn vừa lướt điện thoại.”'],
    tired: ['Chú Tám: “Cháu mua đủ rồi, ăn nhiều quá lại no nặng người, đi dạo cho tiêu đi.”'],
    gain: { talk: { social: 1, mental: 1 }, help: { willpower: 1, social: 2 }, treat: { mental: 2, social: 1 } },
  },
  minh: {
    talk: [
      ['Minh ôm cặp: “Em có bài kiểm tra mai mà chưa ôn gì cả… Em cứ định ôn mà mở TikTok.”', 'Minh: “Em biết mình nên học, nhưng mỗi lần mở sách là tay lại tự cầm điện thoại.”'],
      ['Minh: “Anh chị ơi, hôm qua em ôn được 25 phút liền đấy! Rồi em thưởng mình… 3 tiếng lướt video.”', 'Minh: “Thầy bảo học ít mà đều hơn học nhiều mà dồn. Nghe có lý ghê.”'],
      ['Minh: “Nhờ anh chị mà em dám đặt điện thoại ở phòng khác khi học. Hiệu quả thật!”', 'Minh tự hào khoe vở: “Em xong chương ba rồi, không cần thức đêm nữa!”'],
    ],
    help: ['Bạn ngồi ôn bài cùng Minh. Cậu bé gật gù: “À, giải thế này dễ hiểu hơn thầy ạ!”', 'Hai người chia nhỏ bài thành từng phần 20 phút. Minh: “Có đích gần, em đỡ sợ hẳn.”'],
    tired: ['Minh: “Em ôn đủ hôm nay rồi ạ, giờ phải nghỉ để não nhớ bài. Cảm ơn anh chị!”'],
    gain: { talk: { mental: 1, social: 1 }, help: { willpower: 1, mental: 1 } },
  },
  phong: {
    talk: [
      ['Phong không ngẩng lên: “Ừ… đợi em xem nốt cái này đã…” (nốt cái này kéo dài đã 2 tiếng).', 'Phong: “Hả? Anh nói gì? Em đang bận.” (màn hình vẫn cuộn lia lịa.)'],
      ['Phong ngẩng lên được một giây: “À, anh. Em… em định nghỉ, mà video sau hay quá.”', 'Phong: “Lúc nào em cũng thấy trống rỗng sau khi lướt. Lạ nhỉ?”'],
      ['Phong cất điện thoại vào túi: “Thôi, nói chuyện với anh vui hơn. Với lại mắt em mỏi quá rồi.”', 'Phong: “Hôm nay em cố chỉ lướt 30 phút thôi. Em làm được đấy!”'],
    ],
    help: ['Bạn rủ Phong đi dạo 5 phút. Cậu bé miễn cưỡng đứng dậy, rồi bắt đầu nói huyên thuyên về game. Phong: “Hoá ra ra ngoài cũng đỡ ngộp…”', 'Phong úp điện thoại xuống, đi theo bạn một vòng. Phong: “Bầu trời hôm nay xanh thật.”'],
    tired: ['Phong: “Em đi dạo đủ rồi, giờ để em… chỉ xem một video thôi nhé.” (Bạn thở dài.)'],
    gain: { talk: { social: 1, willpower: 1 }, help: { mental: 1, social: 2 } },
  },
  binh: {
    talk: [
      ['Thầy Bình: “Tập thể dục không phải để đẹp, mà để đầu óc nhẹ. Bắt đầu bằng mười phút thôi.”', 'Thầy Bình: “Người ta bỏ cuộc vì kỳ vọng quá cao ngày đầu. Chậm mà đều mới thắng.”'],
      ['Thầy Bình: “Em quay lại là thầy mừng rồi. Hôm nay tập gì nhẹ nhàng thôi nhé.”', 'Thầy Bình: “Ngủ đủ, ăn đủ, tập đủ. Ba cái đó mà thiếu một thì hỏng cả.”'],
      ['Thầy Bình nắm vai bạn: “Em tiến bộ rõ lắm! Thầy tự hào, đừng nản nhé.”', 'Thầy Bình: “Thân thể là chiếc xe duy nhất em có. Bảo dưỡng nó đi.”'],
    ],
    help: ['Bạn đỡ tạ giúp thầy. Thầy Bình: “Cảm ơn em! Có người đỡ lưng, thầy tập tự tin hơn nhiều.”', 'Thầy Bình: “Một, hai, ba… đẩy! Đấy, em thấy chưa, sức mạnh đến từ sự đều đặn.”'],
    tired: ['Thầy Bình: “Hôm nay em đỡ thầy nhiều rồi, cơ bắp cần được nghỉ ngơi nữa chứ.”'],
    gain: { talk: { willpower: 1, mental: 1 }, help: { willpower: 2, social: 1 } },
  },
  nam: {
    talk: [
      ['Cậu Nam gảy đàn: “Bài này tôi viết lúc không ngủ được. Nghe thử không?”', 'Cậu Nam: “Nhạc hay không cần nhiều người nghe. Một người dừng lại là đủ vui.”'],
      ['Cậu Nam: “Anh chị quay lại! Để tôi hát bài hôm qua, tôi sửa lời rồi.”', 'Cậu Nam: “Có hôm cả buổi chẳng ai dừng. Nhưng tôi vẫn hát. Vì hát làm tôi thấy mình sống.”'],
      ['Cậu Nam: “Bạn bè thì hát chung đi! Tôi đệm đàn, bạn cứ hát sai cũng được.”', 'Cậu Nam: “Dopamine từ chơi nhạc thì không crash. Tôi chơi mười năm vẫn mê.”'],
    ],
    help: ['Bạn vỗ tay và hát theo, lệch tông rõ rệt. Cậu Nam cười phá lên: “Tuyệt! Cứ tự nhiên!”', 'Vài người qua đường dừng lại nghe cùng. Cậu Nam: “Thấy chưa, có bạn là phố sôi động hẳn!”'],
    treat: ['Tiền lẻ rơi vào hộp đàn lách cách. Cậu Nam cúi đầu: “Cảm ơn! Tối nay tôi sẽ có một bữa ngon.”', 'Cậu Nam: “Bạn là khán giả tốt nhất hôm nay!” Rồi gảy một khúc dành riêng cho bạn.'],
    tired: ['Cậu Nam: “Tôi nghỉ tay một lát, giữ giọng cho buổi tối nhé!”'],
    gain: { talk: { mental: 2, social: 1 }, help: { mental: 1, social: 2 }, treat: { mental: 2, social: 1 } },
  },
};

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length) % items.length];
const levelOf = (bond: number): number => RESIDENT_LEVEL_AT.reduce<number>((lv, at, i) => (bond >= at ? i : lv), 0);

/** Cư dân thành phố: trạng thái chung của cả phòng. Mọi thay đổi do server quyết định. */
export class ResidentBoard {
  readonly residents = new Map<string, ResidentRuntime>();
  /** Độ thân quen của từng người chơi với từng cư dân (khoá `sessionId|residentId`) */
  private readonly bond = new Map<string, number>();
  /** Lượt có thưởng đã dùng trong ngày (khoá `sessionId|residentId|op`) */
  private readonly used = new Map<string, { day: number; count: number }>();

  constructor(private readonly rng: Rng, now = 0) {
    for (const def of RESIDENTS) {
      const [lo, hi] = def.pauseMs;
      this.residents.set(def.id, { def, x: def.route[0].x, z: def.route[0].z, state: 'idle', idx: 0, nextMoveAt: now + lo + this.rng() * (hi - lo), busyUntil: 0 });
    }
  }

  levelFor(sessionId: string, residentId: string): number {
    return levelOf(this.bond.get(`${sessionId}|${residentId}`) ?? 0);
  }

  /** Kiểm tra và tính phản ứng (chưa đổi trạng thái); gọi `commit` sau khi engine xử lý thưởng. */
  interact(residentId: string, op: ResidentOp, sessionId: string, day: number, px: number, pz: number, now: number): ResidentOutcome {
    const r = this.residents.get(residentId);
    if (!r) return { ok: false, reason: 'Không có người này.' };
    const persona = PERSONA[residentId];
    if (op === 'treat' && (!persona.treat || !r.def.treatCost)) return { ok: false, reason: `${r.def.name} không nhận quà đâu.` };
    if (Math.hypot(r.x - px, r.z - pz) > RESIDENT_REACH) return { ok: false, reason: `Đứng gần ${r.def.name} hơn nhé.` };

    const bondKey = `${sessionId}|${residentId}`;
    const usedKey = `${bondKey}|${op}`;
    const level = levelOf(this.bond.get(bondKey) ?? 0);
    const use = this.used.get(usedKey);
    const count = use && use.day === day ? use.count : 0;
    const limited = count >= DAILY_LIMIT[op];

    let line: string;
    let deltas: ResidentDeltas = {};
    if (limited) line = pick(this.rng, persona.tired);
    else {
      if (op === 'talk') line = pick(this.rng, persona.talk[level]);
      else if (op === 'help') line = pick(this.rng, persona.help);
      else line = pick(this.rng, persona.treat!);
      deltas = { ...persona.gain[op] };
      // bạn bè lâu năm: lời trò chuyện ấm hơn một chút
      if (op === 'talk' && level >= 2) deltas.social = (deltas.social ?? 0) + 1;
      if (op === 'treat') deltas.money = -(r.def.treatCost ?? 0);
    }
    const commit = (rewarded: boolean) => {
      r.busyUntil = now + RESIDENT_BUSY_MS;
      r.state = 'talk';
      if (!rewarded) return;
      this.used.set(usedKey, { day, count: count + 1 });
      this.bond.set(bondKey, (this.bond.get(bondKey) ?? 0) + BOND_GAIN[op]);
    };
    const newLevel = limited ? level : levelOf((this.bond.get(bondKey) ?? 0) + BOND_GAIN[op]);
    return { ok: true, line, level: newLevel, deltas, pairKey: `res:${residentId}:${op}:${count}`, commit };
  }

  /** Gọi định kỳ (~2 lần/giây): đi theo lộ trình, nghỉ ở mỗi điểm. Trả những cư dân vừa đổi vị trí / trạng thái. */
  tick(now: number, dtMs: number): ResidentRuntime[] {
    const changed: ResidentRuntime[] = [];
    for (const r of this.residents.values()) {
      const before = `${r.x}|${r.z}|${r.state}`;
      if (now < r.busyUntil) {
        r.state = 'talk';
      } else {
        const target = r.def.route[r.idx];
        if (r.state === 'talk') {
          // nói chuyện xong: đang dở đường thì đi tiếp tới điểm đó, không thì đứng thêm một chút
          const unfinished = r.x !== target.x || r.z !== target.z;
          r.state = unfinished ? 'walk' : 'idle';
          r.nextMoveAt = now + 1500;
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
}
