import { PLAYER_RADIUS } from '../../../shared/constants';
import type { GameMap } from '../../../shared/map';
import type { Vec2 } from '../../../shared/types';

/** A* 우선순위 큐 (이진 힙) */
class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
    this.prio.length = 0;
  }

  push(item: number, priority: number): void {
    const items = this.items;
    const prio = this.prio;
    let i = items.length;
    items.push(item);
    prio.push(priority);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (prio[parent] <= priority) break;
      items[i] = items[parent];
      prio[i] = prio[parent];
      i = parent;
    }
    items[i] = item;
    prio[i] = priority;
  }

  pop(): number {
    const items = this.items;
    const prio = this.prio;
    const top = items[0];
    const lastItem = items.pop()!;
    const lastPrio = prio.pop()!;
    const n = items.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && prio[r] < prio[l] ? r : l;
        if (prio[c] >= lastPrio) break;
        items[i] = items[c];
        prio[i] = prio[c];
        i = c;
      }
      items[i] = lastItem;
      prio[i] = lastPrio;
    }
    return top;
  }
}

const SQRT2 = Math.SQRT2;
const NEIGHBORS: Array<[number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/**
 * 장애물을 캐릭터 반지름만큼 부풀린 격자. A* 경로와 시야(LOS) 판정을 제공한다.
 * 탐색 버퍼는 세대 번호(stamp)로 재사용해 매번 큰 배열을 초기화하지 않는다.
 */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  readonly blocked: Uint8Array;
  private g: Float64Array;
  private parent: Int32Array;
  private stamp: Uint32Array;
  private closed: Uint32Array;
  private generation = 0;
  private heap = new MinHeap();

  constructor(
    readonly map: GameMap,
    readonly cell = 20,
    clearance = PLAYER_RADIUS + 3,
  ) {
    this.cols = Math.ceil(map.width / cell);
    this.rows = Math.ceil(map.height / cell);
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n);
    this.g = new Float64Array(n);
    this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = (c + 0.5) * cell;
        const y = (r + 0.5) * cell;
        let b = x < clearance || y < clearance || x > map.width - clearance || y > map.height - clearance;
        if (!b) {
          for (const o of map.obstacles) {
            const min = o.r + clearance;
            const dx = x - o.x;
            const dy = y - o.y;
            if (dx * dx + dy * dy < min * min) {
              b = true;
              break;
            }
          }
        }
        this.blocked[r * this.cols + c] = b ? 1 : 0;
      }
    }
  }

  cellOf(x: number, y: number): { c: number; r: number } {
    return {
      c: Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell))),
      r: Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell))),
    };
  }

  center(idx: number): Vec2 {
    const c = idx % this.cols;
    const r = (idx - c) / this.cols;
    return { x: (c + 0.5) * this.cell, y: (r + 0.5) * this.cell };
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    const { c, r } = this.cellOf(x, y);
    return this.blocked[r * this.cols + c] === 0;
  }

  /** 주변에서 가장 가까운 이동 가능한 칸 */
  nearestWalkable(x: number, y: number, maxRing = 8): number {
    const { c, r } = this.cellOf(x, y);
    if (!this.blocked[r * this.cols + c]) return r * this.cols + c;
    for (let ring = 1; ring <= maxRing; ring++) {
      let best = -1;
      let bestD = Infinity;
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
          const cc = c + dc;
          const rr = r + dr;
          if (cc < 0 || rr < 0 || cc >= this.cols || rr >= this.rows) continue;
          const idx = rr * this.cols + cc;
          if (this.blocked[idx]) continue;
          const d = dr * dr + dc * dc;
          if (d < bestD) {
            bestD = d;
            best = idx;
          }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  lineOfSight(a: Vec2, b: Vec2): boolean {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (this.cell * 0.5)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.isWalkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  /** 8방향 A*. 대각선은 양옆 칸이 모두 비어 있을 때만 허용. 결과는 시야 기반으로 단순화된 웨이포인트 */
  findPath(from: Vec2, to: Vec2, maxExpand = 12000): Vec2[] | null {
    const start = this.nearestWalkable(from.x, from.y);
    const goal = this.nearestWalkable(to.x, to.y);
    if (start < 0 || goal < 0) return null;
    if (start === goal) return [this.isWalkable(to.x, to.y) ? { x: to.x, y: to.y } : this.center(goal)];

    this.generation++;
    if (this.generation === 0xffffffff) {
      this.stamp.fill(0);
      this.closed.fill(0);
      this.generation = 1;
    }
    const gen = this.generation;
    const cols = this.cols;
    const goalC = goal % cols;
    const goalR = (goal - goalC) / cols;
    const h = (idx: number) => {
      const c = idx % cols;
      const r = (idx - c) / cols;
      const dx = Math.abs(c - goalC);
      const dy = Math.abs(r - goalR);
      return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
    };

    const heap = this.heap;
    heap.clear();
    this.stamp[start] = gen;
    this.g[start] = 0;
    this.parent[start] = -1;
    heap.push(start, h(start));
    let expanded = 0;
    let found = false;

    while (heap.size > 0) {
      const cur = heap.pop();
      if (this.closed[cur] === gen) continue;
      this.closed[cur] = gen;
      if (cur === goal) {
        found = true;
        break;
      }
      if (++expanded > maxExpand) break;
      const c = cur % cols;
      const r = (cur - c) / cols;
      const gCur = this.g[cur];
      for (const [dc, dr, cost] of NEIGHBORS) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= this.rows) continue;
        const ni = nr * cols + nc;
        if (this.blocked[ni] || this.closed[ni] === gen) continue;
        if (dc !== 0 && dr !== 0) {
          if (this.blocked[r * cols + nc] || this.blocked[nr * cols + c]) continue;
        }
        const ng = gCur + cost;
        if (this.stamp[ni] === gen && this.g[ni] <= ng) continue;
        this.stamp[ni] = gen;
        this.g[ni] = ng;
        this.parent[ni] = cur;
        heap.push(ni, ng + h(ni));
      }
    }
    if (!found) return null;

    const cells: number[] = [];
    for (let i = goal; i !== -1; i = this.parent[i]) cells.push(i);
    cells.reverse();
    const raw = cells.map((i) => this.center(i));
    if (this.isWalkable(to.x, to.y)) raw[raw.length - 1] = { x: to.x, y: to.y };
    return this.smooth(from, raw);
  }

  private smooth(from: Vec2, pts: Vec2[]): Vec2[] {
    const out: Vec2[] = [];
    let anchor = from;
    let i = 0;
    while (i < pts.length) {
      let far = i;
      for (let j = pts.length - 1; j > i; j--) {
        if (this.lineOfSight(anchor, pts[j])) {
          far = j;
          break;
        }
      }
      out.push(pts[far]);
      anchor = pts[far];
      i = far + 1;
    }
    return out;
  }

  randomWalkablePoint(rng: () => number): Vec2 {
    for (let tries = 0; tries < 200; tries++) {
      const idx = Math.floor(rng() * this.blocked.length);
      if (!this.blocked[idx]) return this.center(idx);
    }
    return { x: this.map.width / 2, y: this.map.height / 2 };
  }
}

const cache = new WeakMap<GameMap, NavGrid>();

export function getNavGrid(map: GameMap): NavGrid {
  let nav = cache.get(map);
  if (!nav) {
    nav = new NavGrid(map);
    cache.set(map, nav);
  }
  return nav;
}
