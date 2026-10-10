/**
 * Lưới đi bộ của thành phố (city_nav.json sinh bởi art/blender/gen_nav.py) + tìm đường A*.
 * Toạ độ là không gian three.js (x, z). Ô (i, j): i theo x, j theo z, tâm tại origin + (i + 0.5, j + 0.5) * cell.
 */
export interface NavData {
  version: number;
  cell: number;
  origin: [number, number];
  width: number;
  height: number;
  /** Mỗi dòng là một hàng j (theo z); ký tự i theo x: '1' đi được, '0' bị chặn */
  walk: string[];
  doors: Record<string, { x: number; z: number; facing: '+x' | '-x' | '+z' | '-z' }>;
  /** LocationId của domain -> khoá trong `doors` */
  locations: Record<string, string>;
  spawn: { x: number; z: number };
}

export interface Vec2 {
  x: number;
  z: number;
}

const SQRT2 = Math.SQRT2;

export class NavGrid {
  readonly data: NavData;
  private readonly walk: Uint8Array;

  constructor(data: NavData) {
    this.data = data;
    this.walk = new Uint8Array(data.width * data.height);
    for (let j = 0; j < data.height; j++) {
      for (let i = 0; i < data.width; i++) this.walk[j * data.width + i] = data.walk[j]?.[i] === '1' ? 1 : 0;
    }
  }

  inBounds(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.data.width && j < this.data.height;
  }

  isWalkable(i: number, j: number): boolean {
    return this.inBounds(i, j) && this.walk[j * this.data.width + i] === 1;
  }

  cellOf(x: number, z: number): [number, number] {
    const { origin, cell } = this.data;
    return [Math.floor((x - origin[0]) / cell), Math.floor((z - origin[1]) / cell)];
  }

  center(i: number, j: number): Vec2 {
    const { origin, cell } = this.data;
    return { x: origin[0] + (i + 0.5) * cell, z: origin[1] + (j + 0.5) * cell };
  }

  isWalkableAt(x: number, z: number): boolean {
    const [i, j] = this.cellOf(x, z);
    return this.isWalkable(i, j);
  }

  /** Ô đi được gần nhất (theo vòng tròn mở rộng); null nếu không có */
  nearestWalkable(x: number, z: number): [number, number] | null {
    const [ci, cj] = this.cellOf(x, z);
    const maxR = Math.max(this.data.width, this.data.height);
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let r = 0; r <= maxR; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = ci + di;
          const j = cj + dj;
          if (!this.isWalkable(i, j)) continue;
          const c = this.center(i, j);
          const d = (c.x - x) ** 2 + (c.z - z) ** 2;
          if (d < bestD) {
            bestD = d;
            best = [i, j];
          }
        }
      }
      if (best) return best; // vòng gần nhất có ô đi được
    }
    return null;
  }

  /** Có đường thẳng đi được giữa hai điểm không (lấy mẫu dọc đoạn thẳng, kiểm cả ô lân cận khi đi chéo) */
  lineClear(a: Vec2, b: Vec2): boolean {
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(dist / (this.data.cell * 0.25)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      if (!this.isWalkableAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /**
   * Đường đi từ `from` tới `to` (waypoint, không gồm điểm xuất phát). Đích bị chặn thì dời tới ô đi được gần nhất.
   * Trả null nếu không có đường. Đã làm thẳng (string pulling) nên ít gấp khúc.
   */
  findPath(from: Vec2, to: Vec2): Vec2[] | null {
    let start = this.cellOf(from.x, from.z);
    if (!this.isWalkable(start[0], start[1])) {
      const near = this.nearestWalkable(from.x, from.z);
      if (!near) return null;
      start = near;
    }
    let goalCell = this.cellOf(to.x, to.z);
    let goal: Vec2 = to;
    if (!this.isWalkable(goalCell[0], goalCell[1])) {
      const near = this.nearestWalkable(to.x, to.z);
      if (!near) return null;
      goalCell = near;
      goal = this.center(near[0], near[1]);
    }

    const { width } = this.data;
    const idx = (i: number, j: number) => j * width + i;
    const open = new Map<number, number>(); // key -> f
    const g = new Map<number, number>();
    const parent = new Map<number, number>();
    const closed = new Set<number>();
    const h = (i: number, j: number) => {
      const dx = Math.abs(i - goalCell[0]);
      const dz = Math.abs(j - goalCell[1]);
      return dx + dz + (SQRT2 - 2) * Math.min(dx, dz);
    };
    const startKey = idx(start[0], start[1]);
    const goalKey = idx(goalCell[0], goalCell[1]);
    g.set(startKey, 0);
    open.set(startKey, h(start[0], start[1]));

    while (open.size > 0) {
      let cur = -1;
      let curF = Infinity;
      for (const [k, f] of open) {
        if (f < curF) {
          curF = f;
          cur = k;
        }
      }
      if (cur === goalKey) break;
      open.delete(cur);
      closed.add(cur);
      const ci = cur % width;
      const cj = Math.floor(cur / width);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (di === 0 && dj === 0) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (!this.isWalkable(ni, nj)) continue;
          if (di !== 0 && dj !== 0 && (!this.isWalkable(ci + di, cj) || !this.isWalkable(ci, cj + dj))) continue; // không cắt góc
          const nk = idx(ni, nj);
          if (closed.has(nk)) continue;
          const ng = (g.get(cur) ?? 0) + (di !== 0 && dj !== 0 ? SQRT2 : 1);
          if (ng < (g.get(nk) ?? Infinity)) {
            g.set(nk, ng);
            parent.set(nk, cur);
            open.set(nk, ng + h(ni, nj));
          }
        }
      }
    }
    if (!parent.has(goalKey) && startKey !== goalKey) return null;

    const cells: Vec2[] = [];
    for (let k: number | undefined = goalKey; k !== undefined && k !== startKey; k = parent.get(k)) {
      cells.push(this.center(k % width, Math.floor(k / width)));
    }
    cells.reverse();
    if (cells.length > 0) cells[cells.length - 1] = goal; // đích chính xác thay vì tâm ô

    // string pulling: bỏ waypoint thừa nếu đi thẳng được
    const out: Vec2[] = [];
    let anchor: Vec2 = from;
    let i = 0;
    while (i < cells.length) {
      let far = i;
      for (let k = cells.length - 1; k > i; k--) {
        if (this.lineClear(anchor, cells[k])) {
          far = k;
          break;
        }
      }
      out.push(cells[far]);
      anchor = cells[far];
      i = far + 1;
    }
    return out.length > 0 ? out : [goal];
  }
}

/** Độ dài đường đi (m) tính từ `from` */
export function pathLength(from: Vec2, path: Vec2[]): number {
  let len = 0;
  let prev = from;
  for (const p of path) {
    len += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return len;
}
