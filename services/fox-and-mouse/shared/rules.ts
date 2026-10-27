import {
  BASE_SPEED,
  BONUS_BOOST_MULT,
  DASH_MULT,
  PLAYER_RADIUS,
  ROLE_SPEED_MULT,
  RPS_BOOST_MULT,
  RPS_LOSE_SLOW_MULT,
  SNACK_SLOW_MULT,
  SPRAY_HALF_ANGLE_DEG,
  SPRAY_RANGE,
  SPRINT_COOLDOWN_MS,
  SPRINT_MAX_MS,
  SPRINT_MULT,
  STAMINA_REGEN_PER_MS,
  TICK_MS,
} from './constants';
import type { Role, Vec2 } from './types';

/**
 * 스프레이 부채꼴 판정: from 에서 dir 방향으로 사거리 SPRAY_RANGE, 좌우 SPRAY_HALF_ANGLE_DEG.
 * 대상의 충돌 원(반경 PLAYER_RADIUS) 일부라도 부채꼴에 걸리면 맞는다.
 */
export function inSprayCone(from: Vec2, dir: Vec2, target: Vec2): boolean {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d > SPRAY_RANGE + PLAYER_RADIUS) return false;
  if (d <= PLAYER_RADIUS) return true;
  const len = Math.hypot(dir.x, dir.y);
  if (len < 1e-6) return false;
  const cos = Math.min(1, Math.max(-1, (dx * dir.x + dy * dir.y) / (d * len)));
  const allowance = Math.asin(Math.min(1, PLAYER_RADIUS / d));
  return Math.acos(cos) <= (SPRAY_HALF_ANGLE_DEG * Math.PI) / 180 + allowance;
}

export interface SprintState {
  stamina: number;
  sprintReadyAt: number;
}

export interface EffectState {
  trappedUntil: number;
  slowUntil: number;
  /** 보너스로 빨라진 시간 (쥐) */
  boostUntil?: number;
  /** 여우: 쥐 둔갑이 끝나는 시각 */
  disguisedUntil?: number;
  /** 여우: 순간 가속이 끝나는 시각 */
  dashUntil?: number;
  rpsUntil?: number;
  stunnedUntil?: number;
  /** 쥐: 쟁탈전 뒤 속도 버프 / 진 도전자 감속 */
  rpsBoostUntil?: number;
  rpsSlowUntil?: number;
}

/**
 * 이동 한 스텝(TICK_MS)만큼 스태미나를 갱신하고 이번 스텝에 실제로 달리는지 반환한다.
 * 서버 판정과 클라이언트 예측이 같은 함수를 쓴다.
 */
export function sprintStep(s: SprintState, wantSprint: boolean, now: number): boolean {
  if (wantSprint && now >= s.sprintReadyAt && s.stamina > 0) {
    s.stamina -= TICK_MS;
    if (s.stamina <= 0) {
      s.stamina = 0;
      s.sprintReadyAt = now + SPRINT_COOLDOWN_MS;
    }
    return true;
  }
  regenStamina(s, TICK_MS);
  return false;
}

export function regenStamina(s: SprintState, ms: number): void {
  s.stamina = Math.min(SPRINT_MAX_MS, s.stamina + ms * STAMINA_REGEN_PER_MS);
}

export function isTrapped(e: EffectState, now: number): boolean {
  return now < e.trappedUntil;
}

/** 여우 스프레이 스턴 */
export function isStunned(e: { stunnedUntil?: number }, now: number): boolean {
  return now < (e.stunnedUntil ?? 0);
}

/** 덫 또는 스턴: 이동·달리기·잡기·능력 모두 불가 */
export function isImmobilized(e: EffectState, now: number): boolean {
  return isTrapped(e, now) || isStunned(e, now);
}

export function isDisguised(e: EffectState, now: number): boolean {
  return now < (e.disguisedUntil ?? 0);
}

export function isDashing(e: EffectState, now: number): boolean {
  return now < (e.dashUntil ?? 0);
}

/** 쥐구멍 자리 가위바위보 중 (결과가 나올 때까지 제자리에 멈춘다) */
export function isInRps(e: { rpsUntil?: number }, now: number): boolean {
  return now < (e.rpsUntil ?? 0);
}

/** 잡히지 않는 상태: 쥐구멍에서 막 나온 직후, 가위바위보 진행 중, 쟁탈전 뒤 보호막 */
export function isProtected(
  e: { invulnUntil: number; rpsUntil?: number; rpsGuardUntil?: number },
  now: number,
): boolean {
  return now < e.invulnUntil || isInRps(e, now) || now < (e.rpsGuardUntil ?? 0);
}

/**
 * 실제 이동 속도 = 기본 속도 × 역할 배율 × (순간 가속 또는 달리기) × 효과 배율.
 * 순간 가속과 달리기는 동시에 곱해지지 않고, 같은 효과는 여러 번 걸려도 한 번만 곱해진다.
 */
export function moveSpeed(role: Role, e: EffectState, sprinting: boolean, now: number): number {
  if (isImmobilized(e, now) || isInRps(e, now)) return 0;
  // 둔갑한 여우는 쥐 기본 속도로 움직인다
  let mult: number = role === 'fox' && isDisguised(e, now) ? ROLE_SPEED_MULT.mouse : ROLE_SPEED_MULT[role];
  if (role === 'fox' && isDashing(e, now)) mult *= DASH_MULT;
  else if (sprinting) mult *= SPRINT_MULT;
  if (now < e.slowUntil) mult *= SNACK_SLOW_MULT;
  if (role === 'mouse') {
    // 보너스(+10%)와 쟁탈전 버프(+20%)는 곱하지 않고 큰 쪽 하나만
    let boost = 1;
    if (now < (e.boostUntil ?? 0)) boost = BONUS_BOOST_MULT;
    if (now < (e.rpsBoostUntil ?? 0)) boost = Math.max(boost, RPS_BOOST_MULT);
    mult *= boost;
    if (now < (e.rpsSlowUntil ?? 0)) mult *= RPS_LOSE_SLOW_MULT;
  }
  return BASE_SPEED * mult;
}

/** 일반 달리기(N) 가능 여부: 덫·둔갑·순간 가속 중에는 불가 */
export function canSprint(role: Role, e: EffectState, now: number): boolean {
  return role === 'fox' && !isImmobilized(e, now) && !isDisguised(e, now) && !isDashing(e, now);
}
