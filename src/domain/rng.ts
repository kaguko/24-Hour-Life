/**
 * PURE DOMAIN: nguồn ngẫu nhiên được tiêm vào (injectable RNG).
 * Domain không bao giờ gọi Math.random; adapter truyền Math.random hoặc mulberry32(seed).
 */

/** Trả số giả ngẫu nhiên trong [0,1) */
export type Rng = () => number;

/** Bộ sinh số giả ngẫu nhiên có seed (mulberry32): cùng seed => cùng dãy số */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
