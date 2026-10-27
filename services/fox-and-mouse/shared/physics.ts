import { PLAYER_RADIUS } from './constants';
import type { GameMap, Obstacle } from './map';
import type { Vec2 } from './types';

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 입력 벡터를 길이 1 이하로 제한한다 (조이스틱 아날로그 입력 허용, 치트성 과속 차단) */
export function normalizeInput(dx: number, dy: number): Vec2 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return { x: 0, y: 0 };
  if (len > 1) return { x: dx / len, y: dy / len };
  return { x: dx, y: dy };
}

export function clampToMap(x: number, y: number, r: number, map: GameMap): Vec2 {
  return {
    x: Math.min(map.width - r, Math.max(r, x)),
    y: Math.min(map.height - r, Math.max(r, y)),
  };
}

export function collidesWithObstacle(
  x: number,
  y: number,
  r: number,
  obstacles: readonly Obstacle[],
  margin = 0,
): boolean {
  for (const o of obstacles) {
    const min = o.r + r + margin;
    const dx = x - o.x;
    const dy = y - o.y;
    if (dx * dx + dy * dy < min * min) return true;
  }
  return false;
}

/** 원형 캐릭터를 장애물 밖, 맵 안으로 밀어낸다 (벽을 따라 미끄러지는 효과) */
export function resolveCollisions(x: number, y: number, r: number, map: GameMap): Vec2 {
  let px = x;
  let py = y;
  for (let iter = 0; iter < 4; iter++) {
    let pushed = false;
    for (const o of map.obstacles) {
      const min = o.r + r;
      let dx = px - o.x;
      let dy = py - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      let d = Math.sqrt(d2);
      if (d < 1e-6) {
        dx = 1;
        dy = 0;
        d = 1;
      }
      px = o.x + (dx / d) * min;
      py = o.y + (dy / d) * min;
      pushed = true;
    }
    const c = clampToMap(px, py, r, map);
    px = c.x;
    py = c.y;
    if (!pushed) break;
  }
  return { x: px, y: py };
}

/**
 * 한 번의 입력(dtMs 동안)에 대한 이동. 서버와 클라이언트 예측이 같은 함수를 사용한다.
 * 빠른 이동에서도 장애물을 통과하지 않도록 작은 하위 단계로 나눈다.
 */
export function moveStep(
  pos: Vec2,
  input: Vec2,
  speed: number,
  dtMs: number,
  map: GameMap,
  r: number = PLAYER_RADIUS,
): Vec2 {
  const dir = normalizeInput(input.x, input.y);
  if (dir.x === 0 && dir.y === 0) return { x: pos.x, y: pos.y };
  const dist = (speed * dtMs) / 1000;
  const steps = Math.max(1, Math.ceil(dist / 6));
  const sx = (dir.x * dist) / steps;
  const sy = (dir.y * dist) / steps;
  let p = { x: pos.x, y: pos.y };
  for (let i = 0; i < steps; i++) {
    p = resolveCollisions(p.x + sx, p.y + sy, r, map);
  }
  return p;
}

export interface SpotConstraint {
  x: number;
  y: number;
  minDist: number;
}

/**
 * desired 근처에서 장애물·맵 경계·회피 대상과 겹치지 않는 가장 가까운 위치를 찾는다.
 * 나선형(링) 탐색이며, 찾지 못하면 null.
 */
export function findSafeSpot(
  desired: Vec2,
  map: GameMap,
  avoid: readonly SpotConstraint[],
  rng: () => number = Math.random,
  r: number = PLAYER_RADIUS,
  maxRadius = 520,
): Vec2 | null {
  const margin = r + 4;
  const ok = (x: number, y: number) =>
    x >= margin &&
    y >= margin &&
    x <= map.width - margin &&
    y <= map.height - margin &&
    !collidesWithObstacle(x, y, r, map.obstacles, 3) &&
    avoid.every((a) => Math.hypot(a.x - x, a.y - y) >= a.minDist);

  if (ok(desired.x, desired.y)) return { x: desired.x, y: desired.y };
  for (let radius = 18; radius <= maxRadius; radius += 18) {
    const n = Math.max(8, Math.ceil((Math.PI * 2 * radius) / 22));
    const start = rng() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const a = start + (k / n) * Math.PI * 2;
      const x = Math.round(desired.x + Math.cos(a) * radius);
      const y = Math.round(desired.y + Math.sin(a) * radius);
      if (ok(x, y)) return { x, y };
    }
  }
  return null;
}
