import {
  CATCH_DISTANCE,
  FOX_SPEED,
  HOLE_CAPACITY,
  HOLE_ENTER_RANGE,
  HOLE_HIDE_MS,
  HOLE_RPS_RANGE,
  INK_VISION_RADIUS,
  MOUSE_SPEED,
  RPS_CHOICES,
  SPRAY_RANGE,
  SPRINT_MAX_MS,
} from '../../../shared/constants';
import { distance } from '../../../shared/physics';
import { inSprayCone, isDashing, isDisguised, isImmobilized, isInRps, isProtected } from '../../../shared/rules';
import type { Difficulty, Vec2 } from '../../../shared/types';
import type { Game, GamePlayer, HoleState } from './Game';

export interface DifficultyProfile {
  /** 판단(방향 재계산) 주기 */
  thinkMs: number;
  /** 쥐가 여우를 위협으로 인식하는 거리 */
  awareness: number;
  /** 위험할 때 쥐구멍을 선택할 확률 */
  holeChance: number;
  /** 도주 방향 후보 수 */
  fleeSamples: number;
  /** 여우가 쥐의 이동을 예측하는 시간(초) */
  leadSeconds: number;
  /** 울음소리 사용 가능 후 실제 사용까지의 지연 범위 */
  howlDelayMs: [number, number];
  /** 쥐구멍 은신 종료 몇 ms 전부터 입구에서 매복할지 (0이면 매복 안 함) */
  campLeadMs: number;
  /** 추격 대상을 유지하는 최소 시간 */
  targetStickMs: number;
  /** 판단 노이즈 (0~1) */
  noise: number;
  /** 두 여우가 서로 다른 쥐를 노리도록 협동하는지 */
  coordinate: boolean;
  /** 여우가 근거리 추격 중 조준 방향을 다시 잡는 반응 시간 */
  aimMs: number;
  /** 여우 AI의 입력 세기(0~1). 사람이 스틱을 끝까지 밀지 않는 것과 같아 규칙 안에서의 난이도 조절이다 */
  foxThrottle: number;
  /** 여우가 이 거리 안의 목표에게 달리기(N)를 쓴다 */
  sprintRange: number;
  /** 여우가 접촉 후 잡기(E)를 누르기까지의 반응 시간 */
  catchReactMs: number;
  /** 쥐가 이 거리 안에 여우가 오면 아이템을 쓴다 */
  itemRange: number;
  /** 쥐가 쥐구멍에서 스스로 나오기 전 최소 은신 시간 */
  minHideMs: number;
  /** 쥐의 도주 방향 재계산 주기 (평소 / 여우가 바짝 붙었을 때) */
  fleeThinkMs: number;
  fleePanicMs: number;
  /** 여우가 쫓던 쥐가 이 거리 안에 오면 순간 가속(F)을 쓴다 */
  dashRange: number;
  /** 여우가 이 거리 안의 쥐에게 둔갑(H)해서 다가간다 (0 이면 쓰지 않음) */
  disguiseRange: number;
  /** 쥐 AI 가 둔갑한 여우를 알아채는 거리 */
  disguiseSpotRange: number;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    thinkMs: 650,
    awareness: 420,
    holeChance: 0.35,
    fleeSamples: 8,
    leadSeconds: 0,
    howlDelayMs: [4000, 12000],
    campLeadMs: 0,
    targetStickMs: 4000,
    noise: 0.5,
    coordinate: false,
    aimMs: 550,
    foxThrottle: 0.665,
    sprintRange: 140,
    catchReactMs: 250,
    itemRange: 140,
    minHideMs: 12_000,
    fleeThinkMs: 600,
    fleePanicMs: 300,
    dashRange: 140,
    disguiseRange: 0,
    disguiseSpotRange: 220,
  },
  normal: {
    thinkMs: 400,
    awareness: 600,
    holeChance: 0.7,
    fleeSamples: 12,
    leadSeconds: 0.05,
    howlDelayMs: [1500, 5000],
    campLeadMs: 2000,
    targetStickMs: 3000,
    noise: 0.25,
    coordinate: false,
    aimMs: 550,
    foxThrottle: 0.764,
    sprintRange: 115,
    catchReactMs: 220,
    itemRange: 200,
    minHideMs: 8_000,
    fleeThinkMs: 300,
    fleePanicMs: 100,
    dashRange: 130,
    disguiseRange: 520,
    disguiseSpotRange: 160,
  },
  hard: {
    thinkMs: 300,
    awareness: 820,
    holeChance: 0.95,
    fleeSamples: 16,
    leadSeconds: 0.08,
    howlDelayMs: [0, 1000],
    campLeadMs: 2500,
    targetStickMs: 3000,
    noise: 0.08,
    coordinate: false,
    aimMs: 520,
    foxThrottle: 0.895,
    sprintRange: 120,
    catchReactMs: 170,
    itemRange: 260,
    minHideMs: 5_000,
    fleeThinkMs: 180,
    fleePanicMs: 60,
    dashRange: 140,
    disguiseRange: 600,
    disguiseSpotRange: 200,
  },
};

const ZERO: Vec2 = { x: 0, y: 0 };

export interface BotOutput extends Vec2 {
  sprint?: boolean;
}

function norm(x: number, y: number): Vec2 {
  const l = Math.hypot(x, y);
  return l < 1e-6 ? { x: 0, y: 0 } : { x: x / l, y: y / l };
}

/** 맵 가장자리·모서리는 막다른 곳이므로 쥐가 피하도록 감점한다 */
function edgePenalty(p: Vec2, width: number, height: number): number {
  const ex = Math.min(p.x, width - p.x);
  const ey = Math.min(p.y, height - p.y);
  const zone = 340;
  let pen = 0;
  if (ex < zone) pen += ((zone - ex) * (zone - ex)) / 60;
  if (ey < zone) pen += ((zone - ey) * (zone - ey)) / 60;
  if (ex < zone && ey < zone) pen *= 1.8;
  return pen;
}

/**
 * 서버에서 실행되는 봇 하나의 두뇌. 매 틱 이동 방향을 반환하며,
 * 능력은 사람과 똑같이 game.tryEnterHole / tryCatch / tryHowl / useItem 을 호출해 쿨타임·규칙 검증을 그대로 받는다.
 */
export class BotBrain {
  readonly profile: DifficultyProfile;
  targetId: string | null = null;
  campHoleId: number | null = null;
  /** 디버그·시뮬레이션용 현재 행동 */
  mode: 'idle' | 'wander' | 'flee' | 'toHole' | 'chase' | 'camp' = 'idle';
  private targetSince = 0;
  private nextThinkAt = 0;
  private dir: Vec2 = { x: 0, y: 0 };
  private path: Vec2[] = [];
  private pathGoal: Vec2 | null = null;
  private nextRepathAt = 0;
  private wanderGoal: Vec2 | null = null;
  private wanderUntil = 0;
  private stuckCheckAt = 0;
  private stuckFrom: Vec2 | null = null;
  private unstickUntil = 0;
  private unstickDir: Vec2 = ZERO;
  private holeDecision = false;
  private holeDecisionUntil = 0;
  private howlAt: number | null = null;
  private aimDir: Vec2 = ZERO;
  private aimUntil = 0;
  private sprintIntent = false;
  private contactSince: number | null = null;
  /** 가위바위보: 이번 판(마감 시각)과 고를 시각 */
  private rpsDeadline = 0;
  private rpsPickAt = 0;

  constructor(
    readonly id: string,
    readonly difficulty: Difficulty,
    private readonly rng: () => number,
  ) {
    this.profile = DIFFICULTY_PROFILES[difficulty];
  }

  update(game: Game, me: GamePlayer, now: number): BotOutput {
    if (game.isEnded() || !me.alive) {
      this.mode = 'idle';
      return ZERO;
    }
    // 쟁탈전: 밖의 도전자든 구멍 안의 방어자든 가위바위보부터 낸다
    if (me.role === 'mouse' && isInRps(me, now)) {
      this.mode = 'idle';
      this.playRps(game, me, now);
      return ZERO;
    }
    if (me.hiddenIn !== null) {
      this.mode = 'idle';
      this.maybeLeaveHole(game, me, now);
      return ZERO;
    }
    if (me.role === 'fox' && (game.phase !== 'playing' || isImmobilized(me, now))) {
      this.mode = 'idle';
      this.sprintIntent = false;
      return ZERO;
    }

    if (now < this.unstickUntil) return this.unstickDir;
    if (me.role === 'mouse') return this.watchStuck(me, this.updateMouse(game, me, now), now);
    const d = this.watchStuck(me, this.updateFox(game, me, now), now);
    const k = this.profile.foxThrottle;
    return { x: d.x * k, y: d.y * k, sprint: this.sprintIntent };
  }

  /** 숨은 지 일정 시간이 지났고 입구 근처에 여우가 없으면 O 키로 스스로 나온다 */
  private maybeLeaveHole(game: Game, me: GamePlayer, now: number): void {
    if (me.hiddenIn === null) return;
    const hole = game.holes[me.hiddenIn];
    const hiddenFor = now - (hole.hideEndsAt - HOLE_HIDE_MS);
    if (hiddenFor < this.profile.minHideMs) return;
    const foxNear = game.foxes().some((f) => distance(f, hole.entrance) < 300);
    if (!foxNear) game.tryExitHole(me.id, now);
  }

  /** 사람처럼 잠깐 고민한 뒤 무작위로 낸다 (가끔 제한시간 안에 못 고를 수도 있다) */
  private playRps(game: Game, me: GamePlayer, now: number): void {
    if (this.rpsDeadline !== me.rpsUntil) {
      this.rpsDeadline = me.rpsUntil;
      this.rpsPickAt = now + 400 + this.rng() * 3000;
    }
    if (now < this.rpsPickAt) return;
    this.rpsPickAt = Infinity;
    game.tryRpsChoice(me.id, RPS_CHOICES[Math.floor(this.rng() * RPS_CHOICES.length)], now);
  }

  // ---------- 공통 ----------

  private watchStuck(me: GamePlayer, desired: Vec2, now: number): Vec2 {
    const wantsMove = Math.abs(desired.x) + Math.abs(desired.y) > 0.1;
    if (!wantsMove) {
      this.stuckFrom = null;
      return desired;
    }
    if (!this.stuckFrom) {
      this.stuckFrom = { x: me.x, y: me.y };
      this.stuckCheckAt = now + 700;
    } else if (now >= this.stuckCheckAt) {
      if (distance(me, this.stuckFrom) < 10) {
        const a = this.rng() * Math.PI * 2;
        this.unstickDir = { x: Math.cos(a), y: Math.sin(a) };
        this.unstickUntil = now + 350;
        this.path = [];
        this.pathGoal = null;
        this.wanderGoal = null;
      }
      this.stuckFrom = { x: me.x, y: me.y };
      this.stuckCheckAt = now + 700;
    }
    return desired;
  }

  private followPath(game: Game, me: GamePlayer, goal: Vec2, now: number): Vec2 {
    const needRepath =
      !this.pathGoal || distance(goal, this.pathGoal) > 48 || this.path.length === 0 || now >= this.nextRepathAt;
    if (needRepath) {
      this.path = game.nav.lineOfSight(me, goal) ? [{ ...goal }] : game.nav.findPath(me, goal) ?? [];
      this.pathGoal = { ...goal };
      this.nextRepathAt = now + this.profile.thinkMs * 2 + this.rng() * 200;
    }
    while (this.path.length > 0 && distance(me, this.path[0]) < 12) this.path.shift();
    const next = this.path[0] ?? goal;
    if (distance(me, next) < 4) return ZERO;
    return norm(next.x - me.x, next.y - me.y);
  }

  private wander(game: Game, me: GamePlayer, now: number, avoid: GamePlayer[]): Vec2 {
    if (!this.wanderGoal || distance(me, this.wanderGoal) < 30 || now > this.wanderUntil) {
      const tries = game.phase === 'prep' ? 8 : this.difficulty === 'easy' ? 1 : this.difficulty === 'normal' ? 4 : 8;
      let best: Vec2 | null = null;
      let bestScore = -Infinity;
      for (let i = 0; i < tries; i++) {
        const p = game.nav.randomWalkablePoint(this.rng);
        const score = avoid.length
          ? Math.min(...avoid.map((a) => Math.min(distance(a, p), 900))) - edgePenalty(p, game.map.width, game.map.height)
          : this.rng();
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
      this.wanderGoal = best;
      this.wanderUntil = now + 6000 + this.rng() * 4000;
    }
    return this.followPath(game, me, this.wanderGoal!, now);
  }

  // ---------- 쥐 ----------

  private updateMouse(game: Game, me: GamePlayer, now: number): Vec2 {
    // 둔갑한 여우는 쥐처럼 보이므로 가까이 와야 알아챈다
    const foxes = game
      .foxes()
      .filter((f) => !isDisguised(f, now) || distance(me, f) < this.profile.disguiseSpotRange);
    let nearest: GamePlayer | null = null;
    let nearestD = Infinity;
    for (const f of foxes) {
      const d = distance(me, f);
      if (d < nearestD) {
        nearestD = d;
        nearest = f;
      }
    }

    const threatened = nearest !== null && nearestD < this.profile.awareness && game.phase === 'playing';
    // 라운드 중간 보너스: 여우가 가깝지 않으면 주우러 간다
    const bonus = game.bonus;
    if (bonus && nearestD > 320 && distance(me, bonus) < 700 && distance(me, bonus) < nearestD) {
      this.mode = 'wander';
      return this.followPath(game, me, bonus, now);
    }
    if (!threatened) {
      this.holeDecisionUntil = 0;
      this.mode = 'wander';
      return this.wander(game, me, now, foxes);
    }

    // 여우가 바짝 쫓아오면 아이템 사용 (덫·간식은 발밑에 두고 도망, 먹물은 가장 가까운 여우에게)
    if (
      me.item &&
      !me.itemUsed &&
      nearest &&
      nearestD < this.profile.itemRange &&
      !isImmobilized(nearest, now) &&
      !(me.item === 'ink' && now < nearest.inkedUntil) &&
      !(me.item === 'snack' && now < nearest.slowUntil)
    ) {
      game.useItem(me.id, now);
    }

    // 여우 스프레이: 여우가 사거리 안까지 쫓아오면 돌아서서 그쪽으로 뿌린다 (사람이 방향키로 돌아본 뒤 G 를 누르는 것과 같음)
    if (
      me.spray &&
      nearest &&
      nearestD < SPRAY_RANGE * 0.8 &&
      !isImmobilized(nearest, now) &&
      now >= nearest.stunImmuneUntil &&
      game.nav.lineOfSight(me, nearest)
    ) {
      const aim = norm(nearest.x - me.x, nearest.y - me.y);
      me.aimX = aim.x;
      me.aimY = aim.y;
      if (inSprayCone(me, aim, nearest)) game.trySpray(me.id, now);
    }

    if (now >= me.holeReadyAt && nearestD < this.profile.awareness * 0.8) {
      if (now >= this.holeDecisionUntil) {
        this.holeDecision = this.rng() < this.profile.holeChance;
        this.holeDecisionUntil = now + 2500;
      }
      if (this.holeDecision) {
        const hole = this.pickHole(game, me, foxes, now);
        if (hole) {
          const occupied = hole.occupants.length >= HOLE_CAPACITY;
          // 자리가 찼으면 구멍 주변(L 범위)에서 쟁탈전을 건다. 비어 있으면 입구까지 가서 Y
          const reach = occupied ? HOLE_RPS_RANGE - 20 : HOLE_ENTER_RANGE - 8;
          if (distance(me, hole) <= reach) {
            const res = occupied ? game.tryChallengeHole(me.id, now) : game.tryEnterHole(me.id, now);
            if (res.ok) {
              this.path = [];
              return ZERO;
            }
          }
          this.mode = 'toHole';
          return this.followPath(game, me, hole, now);
        }
      }
    }

    this.mode = 'flee';
    if (now >= this.nextThinkAt) {
      this.dir = this.computeFlee(game, me, foxes, nearest!);
      const panic = nearestD < 260;
      this.nextThinkAt = now + (panic ? this.profile.fleePanicMs : this.profile.fleeThinkMs);
      this.path = [];
      this.pathGoal = null;
    }
    return this.dir;
  }

  private pickHole(game: Game, me: GamePlayer, foxes: GamePlayer[], now: number): HoleState | null {
    let best: HoleState | null = null;
    let bestD = Infinity;
    const canChallenge = now >= me.rpsReadyAt;
    for (const h of game.holes) {
      if (h.rps) continue;
      // 빈 구멍을 먼저 고르고, 자리가 찼으면 (재도전 대기가 아닐 때) 가위바위보 쟁탈전을 건다
      const free = h.occupants.length < HOLE_CAPACITY;
      if (!free && !canChallenge) continue;
      const dMe = distance(me, h);
      if (dMe > 700) continue;
      const dFox = Math.min(...foxes.map((f) => distance(f, h)));
      if (dMe >= dFox * 0.85) continue;
      const score = free ? dMe : dMe + 200;
      if (score < bestD) {
        bestD = score;
        best = h;
      }
    }
    return best;
  }

  /**
   * 후보 방향마다 1.5초 앞을 시뮬레이션한다: 쥐는 그 방향으로 달리고(벽에서는 미끄러짐)
   * 여우는 곧장 쫓아온다고 가정해 가장 가까워지는 거리를 점수화한다. 막다른 길과 구석을 자연스럽게 피한다.
   */
  private computeFlee(game: Game, me: GamePlayer, foxes: GamePlayer[], nearest: GamePlayer): Vec2 {
    const nav = game.nav;
    const n = this.profile.fleeSamples;
    const offset = this.rng() * ((Math.PI * 2) / n);
    let best: Vec2 | null = null;
    let bestScore = -Infinity;
    const away = norm(me.x - nearest.x, me.y - nearest.y);
    const relevant = foxes.filter((f) => distance(me, f) < this.profile.awareness * 1.3);
    // 예측 거리를 약 290px로 유지 (속도가 빨라져도 너무 먼 미래를 보지 않도록)
    const stepMs = (150 * 195) / MOUSE_SPEED;
    const steps = 10;
    const mouseStep = (MOUSE_SPEED * stepMs) / 1000;
    const foxStep = (FOX_SPEED * stepMs) / 1000;
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      const d = { x: Math.cos(a), y: Math.sin(a) };
      if (!nav.isWalkable(me.x + d.x * 30, me.y + d.y * 30)) continue;
      let mx = me.x;
      let my = me.y;
      const fs = relevant.map((f) => ({ x: f.x, y: f.y }));
      let minD = Infinity;
      let blocked = false;
      for (let s = 0; s < steps; s++) {
        const nx = mx + d.x * mouseStep;
        const ny = my + d.y * mouseStep;
        if (nav.isWalkable(nx, ny)) {
          mx = nx;
          my = ny;
        } else {
          blocked = true;
          if (nav.isWalkable(nx, my)) mx = mx + d.x * mouseStep * 0.7;
          else if (nav.isWalkable(mx, ny)) my = my + d.y * mouseStep * 0.7;
        }
        for (const f of fs) {
          const fd = Math.hypot(mx - f.x, my - f.y);
          if (fd > 1e-6) {
            const k = Math.min(1, foxStep / fd);
            f.x += (mx - f.x) * k;
            f.y += (my - f.y) * k;
          }
          minD = Math.min(minD, Math.hypot(mx - f.x, my - f.y));
        }
      }
      const end = { x: mx, y: my };
      let score = Math.min(minD, 600) * 2;
      for (const f of foxes) score += Math.min(distance(end, f), 800) * (f === nearest ? 0.5 : 0.25);
      score -= edgePenalty(end, game.map.width, game.map.height) * 2;
      if (blocked) score -= 60;
      score += (d.x * away.x + d.y * away.y) * 30;
      score += (d.x * this.dir.x + d.y * this.dir.y) * 40;
      score += (this.rng() - 0.5) * this.profile.noise * 240;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best ?? norm(me.x - nearest.x, me.y - nearest.y);
  }

  // ---------- 여우 ----------

  private updateFox(game: Game, me: GamePlayer, now: number): Vec2 {
    // 먹물에 맞으면 AI도 사람처럼 가까운 쥐만 보인다
    const inked = now < me.inkedUntil;
    const sight = inked ? INK_VISION_RADIUS : Infinity;
    const visibleMice = game.aliveMice().filter((m) => m.hiddenIn === null && distance(me, m) <= sight);
    const disguised = isDisguised(me, now);

    // 잡기(E): 충돌 원이 닿아 있고 반응 시간이 지나면 누른다 (둔갑 중에도 잡을 수 있다)
    const touching = visibleMice.some((m) => !isProtected(m, now) && distance(me, m) <= CATCH_DISTANCE - 1);
    if (touching) {
      if (this.contactSince === null) this.contactSince = now;
      if (now - this.contactSince >= this.profile.catchReactMs && now >= me.catchReadyAt) {
        game.tryCatch(me.id, now);
        if (game.isEnded()) return ZERO;
      }
    } else {
      this.contactSince = null;
    }
    this.sprintIntent = false;

    if (now >= me.howlReadyAt) {
      if (this.howlAt === null) {
        const [lo, hi] = this.profile.howlDelayMs;
        this.howlAt = now + lo + this.rng() * (hi - lo);
      }
      if (now >= this.howlAt) {
        const closest = visibleMice.length ? Math.min(...visibleMice.map((m) => distance(me, m))) : Infinity;
        const occupied = game.holes.some((h) => h.occupantId !== null);
        const shouldHowl = closest > 420 || (this.difficulty === 'hard' && occupied && closest > 260);
        if (shouldHowl) {
          const res = game.tryHowl(me.id, now);
          this.howlAt = null;
          if (res.ok) {
            this.path = [];
            this.pathGoal = null;
            this.nextThinkAt = 0;
            this.aimUntil = 0;
            return ZERO;
          }
        } else {
          this.howlAt = now + 1000;
        }
      }
    } else {
      this.howlAt = null;
    }

    if (now >= this.nextThinkAt) {
      this.chooseFoxGoal(game, me, visibleMice, now);
      this.nextThinkAt = now + this.profile.thinkMs;
    }

    if (this.campHoleId !== null) {
      const hole = game.holes[this.campHoleId];
      if (!hole.occupantId) {
        // 매복하던 구멍에서 쥐가 나왔다: 다음 판단을 기다리지 않고 바로 나온 쥐를 쫓는다
        this.campHoleId = null;
        const out = visibleMice.filter((m) => distance(m, hole.entrance) < 220).sort((a, b) => distance(me, a) - distance(me, b))[0];
        if (out) {
          this.targetId = out.id;
          this.targetSince = now;
          this.aimUntil = 0;
        }
      } else {
        this.mode = 'camp';
        if (distance(me, hole.entrance) < 10) return ZERO;
        return this.followPath(game, me, hole.entrance, now);
      }
    }

    const target = this.targetId ? game.players.get(this.targetId) : undefined;
    if (target && target.alive && target.hiddenIn === null && visibleMice.includes(target)) {
      this.mode = 'chase';
      const d = distance(me, target);
      // 달리기(N): 가까울 때 스태미나가 충분하면 시작하고, 시작했으면 바닥날 때까지 유지
      const sprintingNow = me.sprinting && me.stamina > 0;
      this.sprintIntent =
        !disguised &&
        now >= me.sprintReadyAt &&
        d < this.profile.sprintRange &&
        (sprintingNow || me.stamina >= SPRINT_MAX_MS * 0.6);
      // 순간 가속(F): 달리고 있지 않을 때, 쥐가 가속 거리 안에 있으면 쓴다 (달리기와 동시 사용 불가)
      if (!disguised && !me.sprinting && now >= me.dashReadyAt && d < this.profile.dashRange && d > CATCH_DISTANCE + 20) {
        if (game.tryDash(me.id, now).ok) this.sprintIntent = false;
      }
      if (isDashing(me, now)) this.sprintIntent = false;
      // 쥐 둔갑(H): 조금 떨어진 쥐에게 쥐인 척 다가간다
      if (
        !disguised &&
        !isDashing(me, now) &&
        now >= me.disguiseReadyAt &&
        d > this.profile.sprintRange + 60 &&
        d < this.profile.disguiseRange
      ) {
        game.tryDisguise(me.id, now);
      }
      // 사람처럼 반응 시간이 있어야 공정하다: 근거리 조준 방향은 aimMs 마다만 갱신
      if (now < this.aimUntil) return this.aimDir;
      const lead = this.profile.leadSeconds;
      const aim = { x: target.x + target.vx * lead, y: target.y + target.vy * lead };
      if (d < 320 && game.nav.lineOfSight(me, aim)) {
        this.path = [];
        this.pathGoal = null;
        this.aimDir = norm(aim.x - me.x, aim.y - me.y);
        this.aimUntil = now + (d < 100 ? this.profile.aimMs / 3 : this.profile.aimMs);
        return this.aimDir;
      }
      return this.followPath(game, me, target, now);
    }
    this.mode = 'wander';
    return this.wander(game, me, now, []);
  }

  private chooseFoxGoal(game: Game, me: GamePlayer, visibleMice: GamePlayer[], now: number): void {
    const others = game.foxes().filter((f) => f.id !== me.id);
    const otherBrains = others.map((f) => game.bots.get(f.id)).filter((b): b is BotBrain => !!b);
    const otherTargets = new Set(otherBrains.map((b) => b.targetId).filter(Boolean));
    const otherCamps = new Set(otherBrains.map((b) => b.campHoleId).filter((v) => v !== null));

    // 은신 종료가 임박한 쥐구멍 입구에서 매복
    this.campHoleId = null;
    if (this.profile.campLeadMs > 0) {
      const nearMouse = visibleMice.some((m) => distance(me, m) < 220);
      if (!nearMouse || visibleMice.length === 0) {
        let bestHole: HoleState | null = null;
        let bestD = Infinity;
        for (const h of game.holes) {
          if (!h.occupantId || otherCamps.has(h.id)) continue;
          if (h.hideEndsAt - now > this.profile.campLeadMs) continue;
          const d = distance(me, h.entrance);
          if (d < bestD) {
            bestD = d;
            bestHole = h;
          }
        }
        if (bestHole) {
          this.campHoleId = bestHole.id;
          return;
        }
      }
    }

    if (visibleMice.length === 0) {
      // 모두 숨었으면 점유된 쥐구멍 입구로 이동
      const occ = game.holes.find((h) => h.occupantId && !otherCamps.has(h.id)) ?? game.holes.find((h) => h.occupantId);
      this.campHoleId = occ ? occ.id : null;
      this.targetId = null;
      return;
    }

    const current = this.targetId ? game.players.get(this.targetId) : undefined;
    const currentValid = current && current.alive && current.hiddenIn === null;
    if (currentValid && now - this.targetSince < this.profile.targetStickMs) return;

    const scored = visibleMice
      .map((m) => {
        let s = distance(me, m);
        if (this.profile.coordinate && visibleMice.length > 1 && otherTargets.has(m.id)) s += 320;
        if (isProtected(m, now)) s += 120;
        s += (this.rng() - 0.5) * this.profile.noise * 300;
        return { m, s };
      })
      .sort((a, b) => a.s - b.s);
    const pickFrom = this.difficulty === 'easy' ? Math.min(3, scored.length) : 1;
    const chosen = scored[Math.floor(this.rng() * pickFrom)].m;
    if (chosen.id !== this.targetId) {
      this.targetId = chosen.id;
      this.targetSince = now;
      this.path = [];
      this.pathGoal = null;
    }
  }
}
