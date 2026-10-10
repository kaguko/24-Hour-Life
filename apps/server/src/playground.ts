import type { Rng } from '@24h/domain';
import {
  ANIMALS,
  ANIMAL_MOOD_MS,
  ANIMAL_REACH,
  type AnimalDef,
  type AnimalKind,
  type AnimalMood,
  type AnimalOp,
} from './protocol.js';

/** Chỉ số thay đổi nhỏ khi chơi với con vật / bạn bè (không đụng tiền, năng lượng) */
export type PlayDeltas = Partial<{ mental: number; social: number; willpower: number }>;

export interface AnimalState {
  def: AnimalDef;
  mood: AnimalMood;
  x: number;
  z: number;
  /** Hết mốc này (ms) thì về calm và quay lại chỗ ngồi */
  moodUntil: number;
}

export type AnimalOutcome =
  | { ok: false; reason: string }
  | { ok: true; mood: AnimalMood; line: string; deltas: PlayDeltas };

interface Reaction {
  mood: AnimalMood;
  lines: string[];
  deltas?: PlayDeltas;
}

/** Mỗi con vật có "tính cách": xác suất vuốt ve được tiếp nhận, và phản ứng khi bị chọc. */
interface Personality {
  /** Xác suất vuốt ve thành công (con vật hạnh phúc) */
  petOk: number;
  petOkReaction: Reaction;
  petFailReaction: Reaction;
  poke: Reaction;
}

const PERSONALITY: Record<AnimalKind, Personality> = {
  cat: {
    petOk: 0.45,
    petOkReaction: { mood: 'happy', lines: ['Grừ grừ… (bạn được phép, lần này thôi)', 'Mèo nheo mắt và nằm ngửa ra. Bạn đã được chấp thuận.'], deltas: { mental: 2, social: 1 } },
    petFailReaction: { mood: 'angry', lines: ['HÀ! Mèo cào bạn một phát rồi bỏ đi.', '“Ai cho phép?” Mèo xù lông và chạy mất.', 'Mèo nhìn bạn như nhìn nợ chưa trả, rồi biến mất.'], deltas: { mental: -2 } },
    poke: { mood: 'angry', lines: ['MEOOOW! Mèo cáu thật sự và phóng đi.', 'Mèo ghi tên bạn vào sổ đen.', 'Mèo xù lông to gấp đôi rồi chạy mất.'] },
  },
  capybara: {
    petOk: 1,
    petOkReaction: { mood: 'happy', lines: ['Capybara nhắm mắt. Cả thế giới bỗng dịu lại.', 'Capybara không phản ứng gì, nhưng bạn thấy bình yên lạ.', 'Một quả quýt trên đầu Capybara khẽ nảy. Bạn bình tâm hơn.'], deltas: { mental: 3, willpower: 1 } },
    petFailReaction: { mood: 'calm', lines: [] },
    poke: { mood: 'calm', lines: ['Capybara nhìn bạn bằng ánh mắt thương hại. Rồi nhắm mắt lại.', 'Capybara không quan tâm. Hoàn toàn không.', 'Bạn chọc. Capybara chill. Bạn là người căng thẳng hơn.'] },
  },
  duck: {
    petOk: 0.6,
    petOkReaction: { mood: 'happy', lines: ['QUẠC! (đây là tiếng khen)', 'Vịt lắc mông vui vẻ.'], deltas: { mental: 1, social: 1 } },
    petFailReaction: { mood: 'flee', lines: ['Vịt kêu quạc quạc rồi chạy lạch bạch đi.', 'Vịt: “QUẠC.” Nghĩa là: đừng.'] },
    poke: { mood: 'angry', lines: ['QUẠC QUẠC QUẠC! Vịt rượt bạn rồi tự mệt.', 'Vịt phồng ngực và quạc vào mặt bạn.'] },
  },
  shiba: {
    petOk: 0.85,
    petOkReaction: { mood: 'happy', lines: ['Cheems: “Vâng ạ, em thích được xoa đầu~”', 'Cheems vẫy đuôi, mắt híp lại. Bạn thấy đỡ cô đơn.', 'Cheems rên ư ử. Khoảng cách xã hội giảm đi một chút.'], deltas: { social: 2, mental: 1 } },
    petFailReaction: { mood: 'happy', lines: ['Cheems nghiêng đầu: “Hôm nay em hơi ngại ạ…”'] },
    poke: { mood: 'happy', lines: ['Cheems: “Bonk!” Bạn bị chọc lại bằng cái mũi.', 'Cheems nhảy bật lên rồi ngồi xuống như không có chuyện gì.'] },
  },
  frog: {
    petOk: 0.35,
    petOkReaction: { mood: 'happy', lines: ['Ếch đứng yên cho bạn sờ. Lạnh nhưng dễ thương.', 'Ếch phồng má một cái, coi như đồng ý.'], deltas: { mental: 1, social: 1 } },
    petFailReaction: { mood: 'flee', lines: ['Ếch búng người nhảy đi xa ba mét. Bạn đứng ngơ ngác.', 'Ếch “ộp” một tiếng và biến mất.'] },
    poke: { mood: 'flee', lines: ['Ộp! Ếch nhảy một phát qua đầu bạn.', 'Ếch bật đi như lò xo. Không ai bắt được nó.'] },
  },
};

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length) % items.length];

/** Các con vật ngoài phố: trạng thái chung của cả phòng. Mọi thay đổi do server quyết định. */
export class AnimalBoard {
  readonly animals = new Map<string, AnimalState>();

  constructor(private readonly rng: Rng) {
    for (const def of ANIMALS) this.animals.set(def.id, { def, mood: 'calm', x: def.home.x, z: def.home.z, moodUntil: 0 });
  }

  /** Người ở (px, pz) vuốt ve hoặc chọc con vật. Trả phản ứng, tâm trạng mới và chỉ số (chưa áp dụng). */
  interact(animalId: string, op: AnimalOp, px: number, pz: number, now: number): AnimalOutcome {
    const a = this.animals.get(animalId);
    if (!a) return { ok: false, reason: 'Không có con vật này.' };
    if (a.x !== a.def.home.x || a.z !== a.def.home.z) return { ok: false, reason: `${a.def.name} đang chạy trốn, đợi một lát.` };
    if (Math.hypot(a.x - px, a.z - pz) > ANIMAL_REACH) return { ok: false, reason: `Đứng gần ${a.def.name} hơn nhé.` };

    const p = PERSONALITY[a.def.kind];
    let reaction: Reaction;
    if (op === 'poke') reaction = p.poke;
    else reaction = this.rng() < p.petOk ? p.petOkReaction : p.petFailReaction;
    const line = reaction.lines.length > 0 ? pick(this.rng, reaction.lines) : `${a.def.name} im lặng.`;
    this.setMood(a, reaction.mood, now);
    return { ok: true, mood: reaction.mood, line, deltas: reaction.deltas ?? {} };
  }

  private setMood(a: AnimalState, mood: AnimalMood, now: number): void {
    a.mood = mood;
    a.moodUntil = now + ANIMAL_MOOD_MS;
    // Cáu hoặc hoảng thì chạy tới chỗ trú (vịt cáu thì đứng lại quạc)
    if ((mood === 'flee' || mood === 'angry') && a.def.kind !== 'duck') {
      a.x = a.def.away.x;
      a.z = a.def.away.z;
    }
  }

  /** Gọi định kỳ: con vật hết hạn tâm trạng thì bình tĩnh lại và về chỗ. Trả những con vừa đổi. */
  tick(now: number): AnimalState[] {
    const changed: AnimalState[] = [];
    for (const a of this.animals.values()) {
      if (a.mood === 'calm' || now < a.moodUntil) continue;
      a.mood = 'calm';
      a.x = a.def.home.x;
      a.z = a.def.home.z;
      changed.push(a);
    }
    return changed;
  }
}
