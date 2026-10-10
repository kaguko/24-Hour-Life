import { mulberry32, type Rng } from '@24h/domain';

/** FNV-1a 32-bit: băm chuỗi thành seed số nguyên */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed theo roomSeed + playerId + day: cùng bộ ba => cùng dãy số ngẫu nhiên */
export const seedFor = (roomSeed: string, playerId: string, day: number): number => hashString(`${roomSeed}:${playerId}:${day}`);

export const rngFor = (roomSeed: string, playerId: string, day: number): Rng => mulberry32(seedFor(roomSeed, playerId, day));
