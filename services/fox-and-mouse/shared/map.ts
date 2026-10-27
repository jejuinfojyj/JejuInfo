import {
  HOLE_ENTRANCE_OFFSET,
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_RADIUS,
} from './constants';
import type { Vec2 } from './types';

export type ObstacleKind = 'tree' | 'rock' | 'pond' | 'stump';

/** 모든 충돌 장애물은 원으로 판정한다 */
export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  r: number;
}

export interface HoleDef {
  id: number;
  x: number;
  y: number;
  entrance: Vec2;
}

export type DecorationKind = 'bush' | 'flower' | 'mushroom' | 'grass' | 'pebble';

export interface Decoration {
  kind: DecorationKind;
  x: number;
  y: number;
  s: number;
  v: number;
}

export interface GameMap {
  width: number;
  height: number;
  obstacles: Obstacle[];
  holes: HoleDef[];
  foxSpawns: Vec2[];
  mouseSpawns: Vec2[];
  decorations: Decoration[];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 장애물 사이 최소 간격: 캐릭터 지름보다 충분히 커서 맵 전체가 하나로 연결된다 */
export const MIN_OBSTACLE_GAP = PLAYER_RADIUS * 2 + 34;

const HOLE_POSITIONS: Vec2[] = [
  { x: 430, y: 380 },
  { x: 1990, y: 400 },
  { x: 470, y: 1230 },
  { x: 1950, y: 1210 },
];

function makeHoles(): HoleDef[] {
  const cx = MAP_WIDTH / 2;
  const cy = MAP_HEIGHT / 2;
  return HOLE_POSITIONS.map((p, id) => {
    const dx = cx - p.x;
    const dy = cy - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      id,
      x: p.x,
      y: p.y,
      entrance: {
        x: Math.round(p.x + (dx / len) * HOLE_ENTRANCE_OFFSET),
        y: Math.round(p.y + (dy / len) * HOLE_ENTRANCE_OFFSET),
      },
    };
  });
}

const FOX_SPAWNS: Vec2[] = [
  { x: 1160, y: 800 },
  { x: 1240, y: 800 },
];

const MOUSE_SPAWNS: Vec2[] = [
  { x: 760, y: 560 },
  { x: 1200, y: 470 },
  { x: 1640, y: 560 },
  { x: 1760, y: 820 },
  { x: 1640, y: 1080 },
  { x: 1200, y: 1150 },
  { x: 760, y: 1080 },
  { x: 640, y: 820 },
];

const PONDS: Array<Omit<Obstacle, 'id' | 'kind'>> = [
  { x: 1210, y: 230, r: 96 },
  { x: 1180, y: 1400, r: 84 },
];

function generateMap(seed: number): GameMap {
  const rng = mulberry32(seed);
  const holes = makeHoles();
  const obstacles: Obstacle[] = [];
  let nextId = 0;
  for (const p of PONDS) obstacles.push({ id: nextId++, kind: 'pond', ...p });

  const clearZones: Array<{ x: number; y: number; r: number }> = [
    ...holes.map((h) => ({ x: h.x, y: h.y, r: 130 })),
    ...holes.map((h) => ({ x: h.entrance.x, y: h.entrance.y, r: 90 })),
    ...FOX_SPAWNS.map((s) => ({ ...s, r: 120 })),
    ...MOUSE_SPAWNS.map((s) => ({ ...s, r: 85 })),
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, r: 170 },
  ];

  const cell = 165;
  const edgeMargin = 70;
  for (let gy = 0; gy * cell < MAP_HEIGHT; gy++) {
    for (let gx = 0; gx * cell < MAP_WIDTH; gx++) {
      if (rng() > 0.66) continue;
      const roll = rng();
      const kind: ObstacleKind = roll < 0.62 ? 'tree' : roll < 0.87 ? 'rock' : 'stump';
      const r =
        kind === 'tree' ? 28 + rng() * 16 : kind === 'rock' ? 22 + rng() * 14 : 18 + rng() * 6;
      const x = gx * cell + cell / 2 + (rng() - 0.5) * cell * 0.7;
      const y = gy * cell + cell / 2 + (rng() - 0.5) * cell * 0.7;
      if (x - r < edgeMargin || y - r < edgeMargin) continue;
      if (x + r > MAP_WIDTH - edgeMargin || y + r > MAP_HEIGHT - edgeMargin) continue;
      if (clearZones.some((z) => Math.hypot(z.x - x, z.y - y) < z.r + r)) continue;
      if (obstacles.some((o) => Math.hypot(o.x - x, o.y - y) - o.r - r < MIN_OBSTACLE_GAP)) continue;
      obstacles.push({ id: nextId++, kind, x: Math.round(x), y: Math.round(y), r: Math.round(r) });
    }
  }

  const decorations: Decoration[] = [];
  const kinds: DecorationKind[] = ['grass', 'grass', 'grass', 'flower', 'flower', 'bush', 'mushroom', 'pebble'];
  for (let i = 0; i < 260; i++) {
    const x = 20 + rng() * (MAP_WIDTH - 40);
    const y = 20 + rng() * (MAP_HEIGHT - 40);
    if (obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 14)) continue;
    if (holes.some((h) => Math.hypot(h.x - x, h.y - y) < 46)) continue;
    decorations.push({
      kind: kinds[Math.floor(rng() * kinds.length)],
      x: Math.round(x),
      y: Math.round(y),
      s: 0.7 + rng() * 0.6,
      v: rng(),
    });
  }

  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    obstacles,
    holes,
    foxSpawns: FOX_SPAWNS,
    mouseSpawns: MOUSE_SPAWNS,
    decorations,
  };
}

export const MAP_SEED = 20261014;
export const FOREST_MAP: GameMap = generateMap(MAP_SEED);
