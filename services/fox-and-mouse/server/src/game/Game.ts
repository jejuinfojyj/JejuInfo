import {
  BONUS_BOOST_MS,
  BONUS_LIFETIME_MS,
  BONUS_PICK_RANGE,
  BONUS_SPAWN_AFTER_MS,
  CATCH_COOLDOWN_MS,
  CATCH_DISTANCE,
  CATCH_WAIT_MAX_MS,
  DASH_COOLDOWN_MS,
  DASH_MS,
  DISGUISE_COOLDOWN_MS,
  DISGUISE_MS,
  DISGUISE_NAME,
  FOX_COUNT,
  FOX_MIN_SEPARATION,
  FOX_ROLE_CHANCE,
  GAME_MS,
  HOLE_COOLDOWN_MS,
  HOLE_REENTRY_BLOCK_MS,
  HOLE_ENTER_RANGE,
  HOLE_EXIT_FOX_CLEARANCE,
  HOLE_EXIT_INVULN_MS,
  HOLE_EXIT_MAX_OFFSET,
  HOLE_CAPACITY,
  HOLE_HIDE_MS,
  HOLE_RPS_RANGE,
  HOWL_COOLDOWN_MS,
  INK_MS,
  INPUT_TOKEN_CAP,
  ITEM_TRIGGER_RANGE,
  MAX_INPUTS_PER_TICK,
  MAX_INPUT_QUEUE,
  PLAYER_RADIUS,
  PREP_MS,
  RPS_CHOICE_MS,
  RPS_CHOICES,
  RPS_GUARD_MS,
  RPS_LOSE_SLOW_MS,
  RPS_MAX_ROUNDS,
  RPS_RETRY_MS,
  SNACK_SLOW_MS,
  SPRAY_CHANCE,
  SPRAY_CHECK_MAX_MS,
  SPRAY_CHECK_MIN_MS,
  SPRAY_FIRST_CHECK_MS,
  SPRAY_MAX_PER_ROUND,
  SPRAY_MIN_BY_REMAIN_MS,
  SPRAY_MIN_PER_ROUND,
  SPRAY_STUN_IMMUNE_MS,
  SPRAY_STUN_MS,
  SPRINT_MAX_MS,
  TELEPORT_MOUSE_DISTANCE,
  TICK_MS,
  TOTAL_PLAYERS,
  TRAP_LIFETIME_MS,
  TRAP_STUN_MS,
} from '../../../shared/constants';
import { FOREST_MAP, type GameMap, type HoleDef } from '../../../shared/map';
import {
  clampToMap,
  distance,
  findSafeSpot,
  moveStep,
  normalizeInput,
  type SpotConstraint,
} from '../../../shared/physics';
import {
  canSprint,
  inSprayCone,
  isDashing,
  isDisguised,
  isImmobilized,
  isInRps,
  isProtected,
  isStunned,
  isTrapped,
  moveSpeed,
  regenStamina,
  sprintStep,
} from '../../../shared/rules';
import type {
  AckResult,
  BonusSnapshot,
  Difficulty,
  GameEvent,
  GameResult,
  GameSnapshot,
  ItemKind,
  Phase,
  Role,
  RpsChoice,
  SnackSnapshot,
  TrapSnapshot,
  Vec2,
  Winner,
} from '../../../shared/types';
import { BotBrain } from './ai';
import { getNavGrid, type NavGrid } from './nav';

export interface HumanSeat {
  id: string;
  name: string;
}

export interface GameOptions {
  humans: HumanSeat[];
  difficulty?: Difficulty;
  now: number;
  rng?: () => number;
  map?: GameMap;
  /** 테스트용: 특정 플레이어의 역할 고정 */
  forcedRoles?: Record<string, Role>;
}

interface QueuedInput {
  seq: number;
  dx: number;
  dy: number;
  sprint: boolean;
}

/** E 를 누른 순간까지 보낸 이동 입력(afterSeq)을 처리한 직후에 판정할 잡기 요청 */
interface CatchRequest {
  afterSeq: number;
  requestedAt: number;
  done: (res: AckResult<{ mouseId: string }>) => void;
}

export interface GamePlayer {
  id: string;
  name: string;
  role: Role;
  isBot: boolean;
  connected: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  moving: boolean;
  sprinting: boolean;
  alive: boolean;
  hiddenIn: number | null;
  holeReadyAt: number;
  howlReadyAt: number;
  invulnUntil: number;
  catchReadyAt: number;
  stamina: number;
  sprintReadyAt: number;
  trappedUntil: number;
  stunnedUntil: number;
  stunImmuneUntil: number;
  /** 쥐: 이벤트로 받은 여우 스프레이 (한 번 쓰면 사라진다) */
  spray: boolean;
  /** 사람 플레이어의 이번 라운드 역할 추첨 결과 (AI·테스트 지정은 null) */
  rolledRole: Role | null;
  /** 마지막으로 누른 이동 방향 (스프레이 분사 방향). 멈춰 있어도 유지된다 */
  aimX: number;
  aimY: number;
  slowUntil: number;
  inkedUntil: number;
  disguisedUntil: number;
  /** 둔갑 중 흉내 내는 쥐 플레이어 (이름·AI 표시를 빌려 온다) */
  disguiseAsId: string | null;
  disguiseReadyAt: number;
  dashUntil: number;
  dashReadyAt: number;
  boostUntil: number;
  /** 가위바위보 이번 판 마감 시각 (진행 중일 때만, 결과가 나오면 0) */
  rpsUntil: number;
  /** 새 가위바위보(보호 포함)에 다시 참여할 수 있는 시각 */
  rpsReadyAt: number;
  /** 쟁탈전 뒤 보호막 / 속도 버프 / (진 도전자) 감속이 끝나는 시각 */
  rpsGuardUntil: number;
  rpsBoostUntil: number;
  rpsSlowUntil: number;
  /** 마지막 틱 이동 구간 (시작 → 끝). 현재 위치가 끝점과 다르면 순간이동·위치 지정으로 본다 */
  segSx: number;
  segSy: number;
  segEx: number;
  segEy: number;
  item: ItemKind | null;
  itemUsed: boolean;
  caughtAt: number;
  caughtBy: string | null;
  disconnectedAt: number | null;
  inputQueue: QueuedInput[];
  inputTokens: number;
  lastQueuedSeq: number;
  ackSeq: number;
  botDir: Vec2;
  botSprint: boolean;
  catchRequest: CatchRequest | null;
}

/** 쥐구멍 쟁탈전 한 판: 밖의 도전자 vs 안의 방어자 */
export interface RpsRound {
  ids: [string, string];
  challengerId: string;
  defenderId: string;
  choices: Map<string, RpsChoice>;
  deadline: number;
  round: number;
}

export interface HoleState extends HoleDef {
  occupants: { id: string; hideEndsAt: number }[];
  rps: RpsRound | null;
  /** 첫 번째로 숨은 쥐 (읽기 전용) */
  readonly occupantId: string | null;
  readonly hideEndsAt: number;
}

export const ITEM_KINDS: readonly ItemKind[] = ['trap', 'snack', 'ink'];
const RPS_BEATS: Record<RpsChoice, RpsChoice> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

function makeHole(def: HoleDef): HoleState {
  const h: Omit<HoleState, 'occupantId' | 'hideEndsAt'> = {
    ...def,
    entrance: { ...def.entrance },
    occupants: [],
    rps: null,
  };
  return Object.defineProperties(h, {
    occupantId: { enumerable: true, get: () => h.occupants[0]?.id ?? null },
    hideEndsAt: { enumerable: true, get: () => h.occupants[0]?.hideEndsAt ?? 0 },
  }) as HoleState;
}

/** 두 사람 가위바위보: a 가 이기면 1, 지면 -1, 비기면 0 */
export function rpsDuel(a: RpsChoice, b: RpsChoice): 1 | 0 | -1 {
  if (a === b) return 0;
  return RPS_BEATS[a] === b ? 1 : -1;
}

const BOT_NAMES = ['도토리', '치즈', '솔방울', '클로버', '콩떡', '보리', '호두', '민트', '버섯', '찹쌀'];
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  readonly map: GameMap;
  readonly nav: NavGrid;
  readonly difficulty: Difficulty;
  readonly rng: () => number;
  readonly startedAt: number;
  readonly prepEndsAt: number;
  readonly endsAt: number;
  phase: Phase = 'prep';
  result: GameResult | null = null;
  readonly players = new Map<string, GamePlayer>();
  readonly holes: HoleState[];
  readonly bots = new Map<string, BotBrain>();
  traps: TrapSnapshot[] = [];
  snacks: SnackSnapshot[] = [];
  /** 라운드 중간 보너스 (쥐 전용, 라운드당 한 번) */
  bonus: BonusSnapshot | null = null;
  bonusSpawned = false;
  /** 스프레이 이벤트: 이번 라운드 지급 횟수, 검사 횟수, 다음 검사 시각 (틱에서만 검사하므로 타이머가 겹치지 않는다) */
  sprayGrants = 0;
  sprayChecks = 0;
  nextSprayCheckAt: number;
  private nextObjectId = 1;
  private pendingEvents: GameEvent[] = [];

  constructor(opts: GameOptions) {
    const humans = opts.humans;
    if (humans.length < 1) throw new Error('실제 플레이어가 최소 1명 필요합니다.');
    if (humans.length > TOTAL_PLAYERS) throw new Error(`최대 ${TOTAL_PLAYERS}명까지 참가할 수 있습니다.`);

    this.map = opts.map ?? FOREST_MAP;
    this.nav = getNavGrid(this.map);
    this.difficulty = opts.difficulty ?? 'normal';
    this.rng = opts.rng ?? Math.random;
    this.startedAt = opts.now;
    this.prepEndsAt = opts.now + PREP_MS;
    this.endsAt = this.prepEndsAt + GAME_MS;
    this.nextSprayCheckAt = this.prepEndsAt + SPRAY_FIRST_CHECK_MS;
    this.holes = this.map.holes.map(makeHole);

    const seats: Array<HumanSeat & { isBot: boolean }> = humans.map((h) => ({ ...h, isBot: false }));
    const botCount = TOTAL_PLAYERS - humans.length;
    for (let i = 0; i < botCount; i++) {
      seats.push({ id: `bot-${i + 1}`, name: `AI ${BOT_NAMES[i % BOT_NAMES.length]}`, isBot: true });
    }

    const { roles, rolled } = this.assignRoles(seats, opts.forcedRoles);
    const foxSpawns = [...this.map.foxSpawns];
    const mouseSpawns = shuffle(this.map.mouseSpawns, this.rng);
    let fi = 0;
    let mi = 0;
    for (const seat of seats) {
      const role = roles.get(seat.id)!;
      const spawn = role === 'fox' ? foxSpawns[fi++ % foxSpawns.length] : mouseSpawns[mi++ % mouseSpawns.length];
      this.players.set(seat.id, {
        id: seat.id,
        name: seat.name,
        role,
        isBot: seat.isBot,
        connected: true,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        facing: 1,
        moving: false,
        sprinting: false,
        alive: true,
        hiddenIn: null,
        holeReadyAt: 0,
        howlReadyAt: this.prepEndsAt + HOWL_COOLDOWN_MS,
        invulnUntil: 0,
        catchReadyAt: 0,
        stamina: SPRINT_MAX_MS,
        sprintReadyAt: 0,
        trappedUntil: 0,
        stunnedUntil: 0,
        stunImmuneUntil: 0,
        spray: false,
        rolledRole: rolled.get(seat.id) ?? null,
        aimX: 1,
        aimY: 0,
        slowUntil: 0,
        inkedUntil: 0,
        disguisedUntil: 0,
        disguiseAsId: null,
        disguiseReadyAt: this.prepEndsAt,
        dashUntil: 0,
        dashReadyAt: this.prepEndsAt,
        boostUntil: 0,
        rpsUntil: 0,
        rpsReadyAt: 0,
        rpsGuardUntil: 0,
        rpsBoostUntil: 0,
        rpsSlowUntil: 0,
        segSx: spawn.x,
        segSy: spawn.y,
        segEx: spawn.x,
        segEy: spawn.y,
        // AI 쥐는 시작할 때 아이템을 하나 고른다 (사람은 준비 시간 동안 직접 고른다)
        item: seat.isBot && role === 'mouse' ? ITEM_KINDS[Math.floor(this.rng() * ITEM_KINDS.length)] : null,
        itemUsed: false,
        caughtAt: 0,
        caughtBy: null,
        disconnectedAt: null,
        inputQueue: [],
        inputTokens: 1,
        lastQueuedSeq: 0,
        ackSeq: 0,
        botDir: { x: 0, y: 0 },
        botSprint: false,
        catchRequest: null,
      });
      if (seat.isBot) this.bots.set(seat.id, new BotBrain(seat.id, this.difficulty, this.rng));
    }
  }

  /**
   * 역할 정하기 (라운드마다 새 Game 이 만들어지므로 매 라운드 새로 뽑는다):
   * 1) 테스트용 지정 역할 2) 사람 플레이어는 각자 독립적으로 여우 FOX_ROLE_CHANCE(50%) / 쥐 50% —
   *    이전 라운드 결과와 무관하며 보정하지 않는다. 여우 자리가 이미 다 찼으면 쥐, 쥐 자리가 다 찼으면 여우.
   * 3) 남은 자리는 AI 로 채운다 (여우 FOX_COUNT, 쥐 나머지).
   */
  private assignRoles(
    seats: { id: string; isBot: boolean }[],
    forced?: Record<string, Role>,
  ): { roles: Map<string, Role>; rolled: Map<string, Role> } {
    const roles = new Map<string, Role>();
    const rolled = new Map<string, Role>();
    let foxes = 0;
    let mice = 0;
    const set = (id: string, r: Role) => {
      roles.set(id, r);
      if (r === 'fox') foxes++;
      else mice++;
    };
    if (forced) {
      for (const s of seats) {
        const r = forced[s.id];
        if (!r || (r === 'fox' && foxes >= FOX_COUNT)) continue;
        set(s.id, r);
      }
    }
    const mouseSlots = TOTAL_PLAYERS - FOX_COUNT;
    for (const s of shuffle(
      seats.filter((x) => !x.isBot && !roles.has(x.id)),
      this.rng,
    )) {
      const draw: Role = this.rng() < FOX_ROLE_CHANCE ? 'fox' : 'mouse';
      rolled.set(s.id, draw);
      set(s.id, (draw === 'fox' && foxes < FOX_COUNT) || mice >= mouseSlots ? 'fox' : 'mouse');
    }
    for (const s of shuffle(
      seats.filter((x) => !roles.has(x.id)),
      this.rng,
    )) {
      set(s.id, foxes < FOX_COUNT ? 'fox' : 'mouse');
    }
    return { roles, rolled };
  }

  // ---------- 조회 도우미 ----------

  get phaseEndsAt(): number {
    if (this.phase === 'prep') return this.prepEndsAt;
    if (this.phase === 'playing') return this.endsAt;
    return this.result?.endedAt ?? this.endsAt;
  }

  private foxList: GamePlayer[] | null = null;
  private mouseList: GamePlayer[] | null = null;

  /** 역할은 게임 중 바뀌지 않으므로 목록을 한 번만 만든다 (읽기 전용으로 사용) */
  foxes(): GamePlayer[] {
    return (this.foxList ??= [...this.players.values()].filter((p) => p.role === 'fox'));
  }

  mice(): GamePlayer[] {
    return (this.mouseList ??= [...this.players.values()].filter((p) => p.role === 'mouse'));
  }

  aliveMice(): GamePlayer[] {
    return this.mice().filter((p) => p.alive);
  }

  isEnded(): boolean {
    return this.phase === 'ended';
  }

  private emit(ev: GameEvent): void {
    this.pendingEvents.push(ev);
  }

  drainEvents(): GameEvent[] {
    const ev = this.pendingEvents;
    this.pendingEvents = [];
    return ev;
  }

  // ---------- 입력 ----------

  /** 사람 플레이어의 이동 입력. 서버는 틱마다 정해진 양만 처리하므로 입력을 많이 보내도 빨라지지 않는다. */
  queueInput(id: string, seq: number, dx: number, dy: number, sprint = false): void {
    const p = this.players.get(id);
    if (!p || p.isBot) return;
    if (!Number.isInteger(seq) || seq <= p.lastQueuedSeq) return;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    p.lastQueuedSeq = seq;
    const dir = normalizeInput(dx, dy);
    p.inputQueue.push({ seq, dx: dir.x, dy: dir.y, sprint: sprint === true });
    while (p.inputQueue.length > MAX_INPUT_QUEUE) p.inputQueue.shift();
  }

  /**
   * 이동 입력 묶음. 앞선 패킷이 사라졌어도 함께 실려 온 직전 입력(prev)으로 빈 번호를 채운다.
   * 이미 받은 번호는 무시하므로 같은 입력이 두 번 적용되지 않는다.
   */
  queueInputs(id: string, steps: { seq: number; dx: number; dy: number; sprint?: boolean }[]): void {
    const sorted = steps
      .filter((s) => s && Number.isInteger(s.seq))
      .sort((a, b) => a.seq - b.seq)
      .slice(-MAX_INPUT_QUEUE);
    for (const s of sorted) this.queueInput(id, s.seq, Number(s.dx), Number(s.dy), s.sprint === true);
  }

  setBotInput(id: string, dir: Vec2, sprint = false): void {
    const p = this.players.get(id);
    if (!p) return;
    p.botDir = normalizeInput(dir.x, dir.y);
    p.botSprint = sprint;
  }

  canMove(p: GamePlayer, now: number): boolean {
    if (this.phase === 'ended' || !p.alive || p.hiddenIn !== null) return false;
    if (p.role === 'fox' && this.phase !== 'playing') return false;
    if (isImmobilized(p, now) || isInRps(p, now)) return false;
    return true;
  }

  // ---------- 메인 루프 ----------

  tick(now: number): void {
    if (this.phase === 'ended') return;

    if (this.phase === 'prep' && now >= this.prepEndsAt) {
      this.phase = 'playing';
      this.autoPickItems(now);
      this.emit({ type: 'phase', phase: 'playing', at: this.prepEndsAt });
    }
    if (this.phase === 'playing' && now >= this.endsAt) {
      this.finish('mouse', this.endsAt);
      return;
    }

    for (const [id, brain] of this.bots) {
      const p = this.players.get(id);
      if (!p) continue;
      const out = brain.update(this, p, now);
      this.setBotInput(id, out, out.sprint === true);
      if (this.isEnded()) return;
    }

    for (const p of this.players.values()) this.applyMovement(p, now);

    // 이동을 모두 반영한 같은 위치 정보로 잡기 요청을 판정한다
    for (const p of this.players.values()) {
      const req = p.catchRequest;
      if (!req) continue;
      const waiting = p.inputQueue.length > 0 && p.inputQueue[0].seq <= req.afterSeq;
      if (!waiting || now - req.requestedAt >= CATCH_WAIT_MAX_MS) {
        p.catchRequest = null;
        req.done(this.judgeCatch(p, now));
        if (this.isEnded()) return;
      }
    }

    for (const h of this.holes) {
      // 쟁탈전: 둘 다 골랐거나 5초가 지나면 결과 (안 고른 쪽은 서버가 무작위로 낸다)
      if (h.rps && (now >= h.rps.deadline || h.rps.choices.size === h.rps.ids.length)) this.resolveRps(h, now);
      // 체류 시간 제한. 쟁탈전 중인 방어자는 결과가 날 때까지 기다렸다가 나온다
      for (const o of h.occupants.filter((o) => now >= o.hideEndsAt && h.rps?.defenderId !== o.id)) {
        const p = this.players.get(o.id);
        if (p) this.exitHole(p, now);
        else h.occupants = h.occupants.filter((x) => x !== o);
      }
    }

    if (this.phase === 'playing') {
      this.updateItems(now);
      this.updateBonus(now);
      this.updateSprayEvent(now);
    }
  }

  private applyMovement(p: GamePlayer, now: number): void {
    const px = p.x;
    const py = p.y;
    let sprinted = false;
    if (p.isBot) {
      p.inputQueue.length = 0;
      sprinted = this.step(p, p.botDir, p.botSprint, now);
    } else {
      p.inputTokens = Math.min(INPUT_TOKEN_CAP, p.inputTokens + 1);
      let processed = 0;
      // 잡기 요청이 있으면 E 를 누른 순간까지의 입력만 처리하고 멈춘다 (그 뒤 입력으로 다가가 잡는 것을 막음)
      const stopAt = p.catchRequest ? p.catchRequest.afterSeq : Infinity;
      while (
        p.inputQueue.length > 0 &&
        p.inputQueue[0].seq <= stopAt &&
        p.inputTokens >= 1 &&
        processed < MAX_INPUTS_PER_TICK
      ) {
        const input = p.inputQueue.shift()!;
        p.inputTokens -= 1;
        processed++;
        p.ackSeq = input.seq;
        if (this.step(p, { x: input.dx, y: input.dy }, input.sprint, now)) sprinted = true;
      }
      // 입력이 없던 틱(가만히 있음)에도 스태미나는 회복된다
      if (processed === 0) regenStamina(p, TICK_MS);
    }
    p.sprinting = sprinted;
    p.segSx = px;
    p.segSy = py;
    p.segEx = p.x;
    p.segEy = p.y;
    p.vx = ((p.x - px) * 1000) / TICK_MS;
    p.vy = ((p.y - py) * 1000) / TICK_MS;
    p.moving = Math.abs(p.x - px) + Math.abs(p.y - py) > 0.5;
  }

  /** 이동 한 스텝 (TICK_MS). 달렸으면 true */
  private step(p: GamePlayer, dir: Vec2, wantSprint: boolean, now: number): boolean {
    const wantsMove = Math.abs(dir.x) + Math.abs(dir.y) > 0.01;
    if (!this.canMove(p, now) || !wantsMove) {
      regenStamina(p, TICK_MS);
      return false;
    }
    const sprinting = sprintStep(p, wantSprint && canSprint(p.role, p, now), now);
    const speed = moveSpeed(p.role, p, sprinting, now);
    const next = moveStep(p, dir, speed, TICK_MS, this.map, PLAYER_RADIUS);
    const len = Math.hypot(dir.x, dir.y);
    p.aimX = dir.x / len;
    p.aimY = dir.y / len;
    // 바라보는 방향은 이동 결과가 아니라 입력 방향으로 즉시 결정 (벽에 막혀도 돌아선다)
    if (dir.x < -0.1) p.facing = -1;
    else if (dir.x > 0.1) p.facing = 1;
    p.x = next.x;
    p.y = next.y;
    return sprinting;
  }

  private finish(winner: Winner, at: number): void {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    // 쥐구멍·진행 중인 쟁탈전도 즉시 끝난다
    for (const h of this.holes) {
      h.occupants = [];
      h.rps = null;
    }
    // 라운드 종료: 아이템 효과·덫·간식·스태미나·재사용 대기시간 초기화
    this.traps = [];
    this.snacks = [];
    this.bonus = null;
    for (const p of this.players.values()) {
      if (p.catchRequest) {
        const req = p.catchRequest;
        p.catchRequest = null;
        req.done({ ok: false, error: '게임이 끝났어요.' });
      }
      p.hiddenIn = null;
      p.moving = false;
      p.sprinting = false;
      p.inputQueue.length = 0;
      p.trappedUntil = 0;
      p.slowUntil = 0;
      p.inkedUntil = 0;
      // 둔갑·순간 가속은 라운드가 끝나는 즉시 풀린다
      p.disguisedUntil = 0;
      p.disguiseAsId = null;
      p.dashUntil = 0;
      p.disguiseReadyAt = 0;
      p.dashReadyAt = 0;
      p.boostUntil = 0;
      p.stamina = SPRINT_MAX_MS;
      p.sprintReadyAt = 0;
      p.holeReadyAt = 0;
      p.howlReadyAt = 0;
      p.catchReadyAt = 0;
      p.invulnUntil = 0;
      p.rpsUntil = 0;
      p.rpsReadyAt = 0;
      p.rpsGuardUntil = 0;
      p.rpsBoostUntil = 0;
      p.rpsSlowUntil = 0;
      p.spray = false;
      p.stunnedUntil = 0;
      p.stunImmuneUntil = 0;
    }
    // 스프레이 이벤트 타이머도 멈춘다
    this.nextSprayCheckAt = Infinity;
    const mice = this.mice();
    this.result = {
      winner,
      endedAt: at,
      caughtCount: mice.filter((m) => !m.alive).length,
      survivorIds: mice.filter((m) => m.alive).map((m) => m.id),
    };
    this.bots.clear();
    this.emit({ type: 'phase', phase: 'ended', at });
  }

  // ---------- 잡기 (E) ----------

  /** 잡기 입력 자체가 유효한지 (역할·단계·덫·연타 간격). 통과하면 연타 간격을 시작한다 */
  private acceptCatchPress(p: GamePlayer | undefined, now: number): AckResult | null {
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'fox') return { ok: false, error: '여우만 잡을 수 있어요.' };
    if (!p.alive) return { ok: false, error: '잡을 수 없어요.' };
    if (this.phase !== 'playing') return { ok: false, error: '본 게임이 시작된 뒤에 잡을 수 있어요.' };
    if (isTrapped(p, now)) return { ok: false, error: '덫에 걸려 잡을 수 없어요!' };
    if (isStunned(p, now)) return { ok: false, error: '스프레이에 맞아 잡을 수 없어요!' };
    if (now < p.catchReadyAt || p.catchRequest) return { ok: false, error: '' };
    p.catchReadyAt = now + CATCH_COOLDOWN_MS;
    return null;
  }

  /** 마지막 틱의 이동 시작점. 그 뒤 순간이동·위치 지정으로 바뀌었으면 지금 위치 (구간 없음) */
  private segStart(p: GamePlayer): Vec2 {
    return p.x === p.segEx && p.y === p.segEy ? { x: p.segSx, y: p.segSy } : { x: p.x, y: p.y };
  }

  /**
   * 마지막 틱(50ms) 동안 두 충돌 원 중심이 가장 가까웠던 거리.
   * 둘 다 한 틱에 수십 px 를 움직이므로 틱 끝 위치만 보면 서로 스쳐 지나간 접촉을 놓친다.
   */
  contactDistance(fox: GamePlayer, m: GamePlayer): number {
    const fs = this.segStart(fox);
    const ms = this.segStart(m);
    const r0x = ms.x - fs.x;
    const r0y = ms.y - fs.y;
    const dx = m.x - fox.x - r0x;
    const dy = m.y - fox.y - r0y;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 1e-9 ? Math.min(1, Math.max(0, -(r0x * dx + r0y * dy) / len2)) : 1;
    return Math.hypot(r0x + dx * t, r0y + dy * t);
  }

  /** 여우와 충돌 원이 맞닿은(마지막 틱 이동 포함) 잡을 수 있는 쥐 (가장 가까운 한 마리) */
  touchingMouse(fox: GamePlayer, now: number): GamePlayer | null {
    let best: GamePlayer | null = null;
    let bestD = Infinity;
    for (const m of this.mice()) {
      if (!m.alive || m.hiddenIn !== null || isProtected(m, now)) continue;
      const d = this.contactDistance(fox, m);
      if (d <= CATCH_DISTANCE && d < bestD) {
        best = m;
        bestD = d;
      }
    }
    return best;
  }

  /** 판정 한 번: 맞닿아 있으면 잡고, 아니면 이 입력은 실패로 끝난다 (나중에 다시 시도하지 않는다) */
  private judgeCatch(p: GamePlayer, now: number): AckResult<{ mouseId: string }> {
    if (this.phase !== 'playing' || !p.alive) return { ok: false, error: '잡을 수 없어요.' };
    if (isTrapped(p, now)) return { ok: false, error: '덫에 걸려 잡을 수 없어요!' };
    if (isStunned(p, now)) return { ok: false, error: '스프레이에 맞아 잡을 수 없어요!' };
    // 둔갑은 겉모습·이름만 바꾸므로 둔갑 중에도 실제 충돌 판정으로 잡을 수 있다
    const m = this.touchingMouse(p, now);
    if (!m) return { ok: false, error: '쥐에게 바짝 붙어야 잡을 수 있어요.' };
    this.catchMouse(p, m, now);
    return { ok: true, mouseId: m.id };
  }

  /** 여우가 E 키를 눌렀을 때 즉시 판정 (AI 와 테스트용). 충돌 원이 실제로 맞닿아 있어야 잡힌다. */
  tryCatch(id: string, now: number): AckResult<{ mouseId: string }> {
    const p = this.players.get(id);
    const rejected = this.acceptCatchPress(p, now);
    if (rejected) return rejected as AckResult<{ mouseId: string }>;
    return this.judgeCatch(p!, now);
  }

  /**
   * 사람 여우의 E 키. afterSeq = E 를 누르기 직전까지 보낸 마지막 이동 입력 번호.
   * 그 입력까지 처리된 여우 위치(= 누른 순간 화면의 내 위치)와 같은 틱의 쥐 위치로 단 한 번 판정한다.
   * 이미 처리됐으면 바로 판정한다.
   */
  requestCatch(id: string, afterSeq: number, now: number, done: (res: AckResult<{ mouseId: string }>) => void): void {
    const p = this.players.get(id);
    const rejected = this.acceptCatchPress(p, now);
    if (rejected) return done(rejected as AckResult<{ mouseId: string }>);
    const fox = p!;
    const target = Number.isInteger(afterSeq) ? Math.min(afterSeq, fox.lastQueuedSeq) : fox.ackSeq;
    const waiting = fox.inputQueue.length > 0 && fox.inputQueue[0].seq <= target;
    if (!waiting) return done(this.judgeCatch(fox, now));
    fox.catchRequest = { afterSeq: target, requestedAt: now, done };
  }

  private catchMouse(fox: GamePlayer, m: GamePlayer, now: number): void {
    m.alive = false;
    m.caughtAt = now;
    m.caughtBy = fox.id;
    m.inputQueue.length = 0;
    m.moving = false;
    m.spray = false;
    this.emit({ type: 'catch', foxId: fox.id, mouseId: m.id, x: m.x, y: m.y, at: now });
    if (this.aliveMice().length === 0) this.finish('fox', now);
  }

  // ---------- 쥐구멍 (Y 입장 / O 퇴장 / L 쟁탈전) ----------

  /** range 안에서 가장 가까운 쥐구멍 (쥐구멍 중심 기준) */
  private nearestHole(p: Vec2, range: number): HoleState | null {
    let best: HoleState | null = null;
    let bestD = Infinity;
    for (const h of this.holes) {
      const d = distance(p, h);
      if (d <= range && d < bestD) {
        best = h;
        bestD = d;
      }
    }
    return best;
  }

  private holeUseCheck(p: GamePlayer | undefined): AckResult | null {
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'mouse') return { ok: false, error: '쥐만 쥐구멍을 사용할 수 있어요.' };
    if (!p.alive) return { ok: false, error: '이미 잡혔어요.' };
    if (this.phase !== 'playing') return { ok: false, error: '본 게임이 시작된 뒤에 사용할 수 있어요.' };
    return null;
  }

  /** Y: 입구 근처의 빈 쥐구멍에 들어간다. 자리가 차 있으면 L 쟁탈전을 안내한다 */
  tryEnterHole(id: string, now: number): AckResult<{ holeId: number }> {
    const p = this.players.get(id);
    const rejected = this.holeUseCheck(p);
    if (rejected) return rejected as AckResult<{ holeId: number }>;
    const m = p!;
    if (m.hiddenIn !== null) return { ok: false, error: '이미 쥐구멍 안에 있어요. 나가려면 O' };
    if (isInRps(m, now)) return { ok: false, error: '가위바위보 중이에요. 화면 버튼으로 골라 주세요.' };
    if (now < m.holeReadyAt) {
      return { ok: false, error: `쥐구멍 재입장 대기 ${Math.ceil((m.holeReadyAt - now) / 1000)}초` };
    }
    const best = this.nearestHole(m, HOLE_ENTER_RANGE);
    if (!best) return { ok: false, error: '쥐구멍 입구 가까이에서만 들어갈 수 있어요.' };
    if (best.rps) return { ok: false, error: '이 쥐구멍은 지금 쟁탈전 중이에요.' };
    if (!this.seatFree(best)) {
      return { ok: false, error: '쥐구멍 자리가 차 있어요. L 키로 가위바위보 쟁탈전을 걸 수 있어요.' };
    }
    this.enterHole(m, best, now);
    return { ok: true, holeId: best.id };
  }

  tryExitHole(id: string, now: number): AckResult<{ holeId: number }> {
    const p = this.players.get(id);
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'mouse') return { ok: false, error: '쥐만 쥐구멍을 사용할 수 있어요.' };
    if (p.hiddenIn === null) return { ok: false, error: '쥐구멍 안에 있지 않아요.' };
    if (this.holes[p.hiddenIn].rps) return { ok: false, error: '쟁탈전 결과가 나올 때까지 나갈 수 없어요.' };
    const holeId = p.hiddenIn;
    this.exitHole(p, now);
    return { ok: true, holeId };
  }

  /**
   * L: 쥐구멍 주변(HOLE_RPS_RANGE)에서 그 구멍에 숨은 쥐에게 가위바위보 쟁탈전을 건다.
   * 재입장 대기·재도전 대기 중이거나, 빈 구멍·이미 쟁탈전 중인 구멍이면 거절한다.
   */
  tryChallengeHole(id: string, now: number): AckResult<{ holeId: number; deadline: number }> {
    const p = this.players.get(id);
    const rejected = this.holeUseCheck(p);
    if (rejected) return rejected as AckResult<{ holeId: number; deadline: number }>;
    const m = p!;
    if (m.hiddenIn !== null) return { ok: false, error: '쥐구멍 안에서는 쟁탈전을 걸 수 없어요.' };
    if (isInRps(m, now)) return { ok: false, error: '이미 가위바위보 중이에요.' };
    const h = this.nearestHole(m, HOLE_RPS_RANGE);
    if (!h) return { ok: false, error: '쥐구멍 주변에서만 쟁탈전을 걸 수 있어요.' };
    if (h.rps) return { ok: false, error: '이 쥐구멍은 이미 쟁탈전 중이에요.' };
    const defender = h.occupants[0];
    if (!defender) return { ok: false, error: '빈 쥐구멍이에요. 입구에서 Y 로 들어가세요.' };
    if (now < m.holeReadyAt) {
      return { ok: false, error: `쥐구멍 재입장 대기 ${Math.ceil((m.holeReadyAt - now) / 1000)}초` };
    }
    if (now < m.rpsReadyAt) {
      return { ok: false, error: `쟁탈전 재도전 대기 ${Math.ceil((m.rpsReadyAt - now) / 1000)}초` };
    }
    this.startRps(h, m.id, defender.id, 1, now);
    return { ok: true, holeId: h.id, deadline: h.rps!.deadline };
  }

  private seatFree(h: HoleState): boolean {
    return h.occupants.length < HOLE_CAPACITY;
  }

  /** 숨는다. 체류 시간은 들어갈 때마다 새로 시작한다 (쟁탈전으로 차지한 경우 포함) */
  private enterHole(p: GamePlayer, h: HoleState, now: number): void {
    h.occupants.push({ id: p.id, hideEndsAt: now + HOLE_HIDE_MS });
    p.hiddenIn = h.id;
    p.rpsUntil = 0;
    p.x = h.x;
    p.y = h.y;
    p.moving = false;
    p.inputQueue.length = 0;
    this.emit({ type: 'holeEnter', mouseId: p.id, holeId: h.id, at: now });
  }

  /** 쟁탈전 한 판 시작 (재경기도 같은 5초). 그동안 두 쥐는 잡히지 않고, 도전자는 제자리에 멈춘다 */
  private startRps(h: HoleState, challengerId: string, defenderId: string, round: number, now: number): void {
    const deadline = now + RPS_CHOICE_MS;
    h.rps = { ids: [challengerId, defenderId], challengerId, defenderId, choices: new Map(), deadline, round };
    for (const id of h.rps.ids) {
      const p = this.players.get(id)!;
      p.rpsUntil = deadline;
      p.moving = false;
      p.inputQueue.length = 0;
    }
    this.emit({ type: 'rpsStart', holeId: h.id, ids: [challengerId, defenderId], challengerId, defenderId, deadline, round, at: now });
  }

  /** 가위바위보 선택. 참가자만, 한 판에 한 번, 마감 전까지 */
  tryRpsChoice(id: string, choice: unknown, now: number): AckResult<{ choice: RpsChoice }> {
    const p = this.players.get(id);
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (!RPS_CHOICES.includes(choice as RpsChoice)) return { ok: false, error: '가위·바위·보 중에서 골라 주세요.' };
    const h = this.holes.find((x) => x.rps?.ids.includes(id));
    if (!h || !h.rps || this.phase !== 'playing') return { ok: false, error: '가위바위보 중이 아니에요.' };
    if (now >= h.rps.deadline) return { ok: false, error: '선택 시간이 지났어요.' };
    if (h.rps.choices.has(id)) return { ok: false, error: '이미 골랐어요.' };
    h.rps.choices.set(id, choice as RpsChoice);
    // 둘 다 골랐으면 마감을 기다리지 않고 바로 판정
    if (h.rps.choices.size === h.rps.ids.length) this.resolveRps(h, now);
    return { ok: true, choice: choice as RpsChoice };
  }

  /**
   * 쟁탈전 판정. 안 고른 쪽은 서버가 무작위로 낸다. 비기면 같은 5초로 재경기(최대 RPS_MAX_ROUNDS 판, 넘으면 무작위 승자).
   * 끝나면 두 쥐 모두 RPS_GUARD_MS 동안 보호막, 재도전은 RPS_RETRY_MS 뒤부터.
   * - 도전자 승: 방어자는 안전한 자리로 쫓겨나고(재입장 대기 적용), 도전자가 들어가 체류 시간을 새로 시작. 둘 다 속도 버프.
   * - 도전자 패: 방어자는 그대로(체류 시간 유지), 도전자는 감속 + 쥐구멍 재입장 대기.
   */
  private resolveRps(h: HoleState, now: number): void {
    const r = h.rps!;
    h.rps = null;
    const choices: Record<string, RpsChoice> = {};
    const autoIds: string[] = [];
    for (const id of r.ids) {
      let c = r.choices.get(id);
      if (!c) {
        c = RPS_CHOICES[Math.floor(this.rng() * RPS_CHOICES.length)];
        autoIds.push(id);
      }
      choices[id] = c;
    }
    const { challengerId, defenderId } = r;
    const duel = rpsDuel(choices[challengerId], choices[defenderId]);
    let winnerId: string | null = duel > 0 ? challengerId : duel < 0 ? defenderId : null;
    let random = false;
    if (!winnerId && r.round >= RPS_MAX_ROUNDS) {
      winnerId = this.rng() < 0.5 ? challengerId : defenderId;
      random = true;
    }
    const base = { type: 'rpsResult' as const, holeId: h.id, challengerId, defenderId, choices, autoIds, random, at: now };
    if (!winnerId) {
      this.emit({ ...base, winnerId: null, rematchIds: [...r.ids], loserIds: [] });
      this.startRps(h, challengerId, defenderId, r.round + 1, now);
      return;
    }
    const loserId = winnerId === challengerId ? defenderId : challengerId;
    this.emit({ ...base, winnerId, rematchIds: [], loserIds: [loserId] });

    const challenger = this.players.get(challengerId)!;
    const defender = this.players.get(defenderId)!;
    for (const p of [challenger, defender]) {
      p.rpsUntil = 0;
      p.rpsReadyAt = Math.max(p.rpsReadyAt, now + RPS_RETRY_MS);
      p.rpsGuardUntil = now + RPS_GUARD_MS;
    }
    if (winnerId === challengerId) {
      if (defender.hiddenIn === h.id) this.exitHole(defender, now);
      defender.rpsBoostUntil = now + RPS_GUARD_MS;
      defender.rpsSlowUntil = 0;
      if (challenger.alive && challenger.hiddenIn === null && this.seatFree(h)) this.enterHole(challenger, h, now);
      challenger.rpsBoostUntil = now + RPS_GUARD_MS;
      challenger.rpsSlowUntil = 0;
    } else {
      defender.rpsBoostUntil = now + RPS_GUARD_MS;
      challenger.rpsBoostUntil = 0;
      challenger.rpsSlowUntil = now + RPS_LOSE_SLOW_MS;
      challenger.holeReadyAt = Math.max(challenger.holeReadyAt, now + HOLE_COOLDOWN_MS);
    }
  }

  /** 쥐구멍 입구 바로 앞(맵 안, 장애물 밖)으로 나온다. 멀리 순간이동하지 않는다. */
  private exitHole(p: GamePlayer, now: number): void {
    const hole = p.hiddenIn !== null ? this.holes[p.hiddenIn] : null;
    p.hiddenIn = null;
    p.holeReadyAt = now + Math.max(HOLE_COOLDOWN_MS, HOLE_REENTRY_BLOCK_MS);
    p.invulnUntil = now + HOLE_EXIT_INVULN_MS;
    // 쥐구멍 보호 직후 가위바위보 보호로 이어 붙이지 못하게 한다
    p.rpsReadyAt = Math.max(p.rpsReadyAt, now + RPS_RETRY_MS);
    p.inputQueue.length = 0;
    if (!hole) return;
    hole.occupants = hole.occupants.filter((o) => o.id !== p.id);
    // 입구에 여우가 서 있어도 나올 수 있게: 입구 근처에서 여우 몸과 겹치지 않는 자리를 먼저 찾고,
    // 그런 자리가 없으면(사방이 막힘) 장애물만 피한 입구 바로 앞으로 나온다. 나온 뒤 1초 보호는 그대로.
    const foxAvoid = this.foxes()
      .filter((f) => f.alive)
      .map((f) => ({ x: f.x, y: f.y, minDist: HOLE_EXIT_FOX_CLEARANCE }));
    const spot =
      findSafeSpot(hole.entrance, this.map, foxAvoid, this.rng, PLAYER_RADIUS, HOLE_EXIT_MAX_OFFSET) ??
      findSafeSpot(hole.entrance, this.map, [], this.rng, PLAYER_RADIUS, HOLE_EXIT_MAX_OFFSET) ??
      hole.entrance;
    const clamped = clampToMap(spot.x, spot.y, PLAYER_RADIUS, this.map);
    p.x = clamped.x;
    p.y = clamped.y;
    this.emit({ type: 'holeExit', mouseId: p.id, holeId: hole.id, at: now });
  }

  // ---------- 도망자 아이템 ----------

  /** 준비 시간 동안 쥐가 아이템 하나를 고른다. 한 번 고르면 바꿀 수 없다. */
  selectItem(id: string, item: unknown, now: number): AckResult<{ item: ItemKind }> {
    const p = this.players.get(id);
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'mouse') return { ok: false, error: '쥐만 아이템을 고를 수 있어요.' };
    if (this.phase !== 'prep') return { ok: false, error: '아이템은 게임 시작 전(준비 시간)에만 고를 수 있어요.' };
    if (p.item) return { ok: false, error: '이미 아이템을 골랐어요.' };
    if (!ITEM_KINDS.includes(item as ItemKind)) return { ok: false, error: '알 수 없는 아이템이에요.' };
    p.item = item as ItemKind;
    this.emit({ type: 'itemPick', mouseId: p.id, item: p.item, auto: false, at: now });
    return { ok: true, item: p.item };
  }

  private autoPickItems(now: number): void {
    for (const m of this.mice()) {
      if (m.item) continue;
      m.item = ITEM_KINDS[Math.floor(this.rng() * ITEM_KINDS.length)];
      this.emit({ type: 'itemPick', mouseId: m.id, item: m.item, auto: true, at: now });
    }
  }

  /** 라운드당 한 번 사용 */
  useItem(id: string, now: number): AckResult<{ item: ItemKind }> {
    const p = this.players.get(id);
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'mouse') return { ok: false, error: '쥐만 아이템을 쓸 수 있어요.' };
    if (!p.alive) return { ok: false, error: '이미 잡혔어요.' };
    if (this.phase !== 'playing') return { ok: false, error: '본 게임이 시작된 뒤에 사용할 수 있어요.' };
    if (p.hiddenIn !== null) return { ok: false, error: '쥐구멍 안에서는 쓸 수 없어요.' };
    if (isInRps(p, now)) return { ok: false, error: '가위바위보 중에는 쓸 수 없어요.' };
    if (!p.item) return { ok: false, error: '고른 아이템이 없어요.' };
    if (p.itemUsed) return { ok: false, error: '아이템은 한 판에 한 번만 쓸 수 있어요.' };

    let targetId: string | null = null;
    if (p.item === 'trap') {
      this.traps.push({ id: this.nextObjectId++, ownerId: p.id, x: p.x, y: p.y, expiresAt: now + TRAP_LIFETIME_MS });
    } else if (p.item === 'snack') {
      this.snacks.push({ id: this.nextObjectId++, ownerId: p.id, x: p.x, y: p.y });
    } else {
      // 먹물: 가장 가까운 여우의 시야를 가린다 (겹쳐 써도 시간이 더해지지 않고 다시 INK_MS 로)
      const target = this.nearestFox(p);
      if (!target) return { ok: false, error: '먹물을 뿌릴 여우가 없어요.' };
      target.inkedUntil = Math.max(target.inkedUntil, now + INK_MS);
      targetId = target.id;
    }
    p.itemUsed = true;
    this.emit({ type: 'itemUse', mouseId: p.id, item: p.item, x: p.x, y: p.y, targetId, at: now });
    return { ok: true, item: p.item };
  }

  private nearestFox(from: Vec2): GamePlayer | null {
    let best: GamePlayer | null = null;
    let bestD = Infinity;
    for (const f of this.foxes()) {
      const d = distance(f, from);
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  private updateItems(now: number): void {
    for (const t of this.traps) {
      if (now >= t.expiresAt) this.emit({ type: 'trapExpired', ownerId: t.ownerId, x: t.x, y: t.y, at: now });
    }
    this.traps = this.traps.filter((t) => now < t.expiresAt);

    for (const f of this.foxes()) {
      if (!isTrapped(f, now)) {
        const trap = this.traps.find((t) => distance(t, f) <= ITEM_TRIGGER_RANGE);
        if (trap) {
          // 덫: TRAP_STUN_MS 동안 이동·달리기·잡기 불가. 이미 걸려 있으면 발동하지 않으므로 시간이 겹쳐 늘지 않는다
          f.trappedUntil = now + TRAP_STUN_MS;
          f.sprinting = false;
          f.moving = false;
          this.traps = this.traps.filter((t) => t !== trap);
          this.emit({ type: 'trapTriggered', foxId: f.id, ownerId: trap.ownerId, x: trap.x, y: trap.y, until: f.trappedUntil, at: now });
        }
      }
      const snack = this.snacks.find((s) => distance(s, f) <= ITEM_TRIGGER_RANGE);
      if (snack) {
        // 감속은 배율을 곱하지 않고 '감속 중' 상태만 갱신 → 두 번 먹어도 한 번 분량만 감속, 남은 시간은 SNACK_SLOW_MS 로
        f.slowUntil = Math.max(f.slowUntil, now + SNACK_SLOW_MS);
        this.snacks = this.snacks.filter((s) => s !== snack);
        this.emit({ type: 'snackEaten', foxId: f.id, ownerId: snack.ownerId, x: snack.x, y: snack.y, until: f.slowUntil, at: now });
      }
    }
  }

  // ---------- 여우 울음소리 + 순간이동 ----------

  tryHowl(id: string, now: number): AckResult<{ to: Vec2; targetHoleId: number | null }> {
    const p = this.players.get(id);
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'fox') return { ok: false, error: '여우만 울음소리를 사용할 수 있어요.' };
    if (this.phase !== 'playing') return { ok: false, error: '본 게임이 시작된 뒤에 사용할 수 있어요.' };
    if (isTrapped(p, now)) return { ok: false, error: '덫에 걸려 움직일 수 없어요!' };
    if (isStunned(p, now)) return { ok: false, error: '스프레이에 맞아 움직일 수 없어요!' };
    if (isDisguised(p, now)) return { ok: false, error: '둔갑 중에는 다른 능력을 쓸 수 없어요.' };
    if (now < p.howlReadyAt) {
      return { ok: false, error: `울음소리 쿨타임 ${Math.ceil((p.howlReadyAt - now) / 1000)}초` };
    }

    const otherFoxes = this.foxes().filter((f) => f.id !== p.id);
    // 여우는 쥐구멍 안(중심)에 설 수 없고, 다른 여우와 겹칠 수 없다
    const baseAvoid: SpotConstraint[] = [
      ...otherFoxes.map((f) => ({ x: f.x, y: f.y, minDist: FOX_MIN_SEPARATION })),
      ...this.holes.map((h) => ({ x: h.x, y: h.y, minDist: PLAYER_RADIUS + 26 })),
    ];

    let dest: Vec2 | null = null;
    let targetHoleId: number | null = null;
    const occupied = shuffle(
      this.holes.filter((h) => h.occupantId !== null),
      this.rng,
    );

    if (occupied.length > 0) {
      // 다른 여우가 이미 지키고 있지 않은 쥐구멍을 우선 선택
      const free = occupied.filter((h) => otherFoxes.every((f) => distance(f, h.entrance) >= FOX_MIN_SEPARATION));
      const hole = free[0] ?? occupied[0];
      targetHoleId = hole.id;
      dest = findSafeSpot(hole.entrance, this.map, baseAvoid, this.rng);
    } else {
      const candidates = this.aliveMice().filter((m) => m.hiddenIn === null);
      if (candidates.length === 0) return { ok: false, error: '순간이동할 대상이 없어요.' };
      const target = candidates[Math.floor(this.rng() * candidates.length)];
      const angle = this.rng() * Math.PI * 2;
      const desired = {
        x: target.x + Math.cos(angle) * TELEPORT_MOUSE_DISTANCE,
        y: target.y + Math.sin(angle) * TELEPORT_MOUSE_DISTANCE,
      };
      // 도착하자마자 잡히는 일이 없도록 모든 쥐와 일정 거리 유지
      const avoid = [
        ...baseAvoid,
        ...candidates.map((m) => ({ x: m.x, y: m.y, minDist: CATCH_DISTANCE + 50 })),
      ];
      dest = findSafeSpot(desired, this.map, avoid, this.rng);
    }

    if (!dest) return { ok: false, error: '안전한 순간이동 위치를 찾지 못했어요.' };

    const from = { x: p.x, y: p.y };
    p.x = dest.x;
    p.y = dest.y;
    p.howlReadyAt = now + HOWL_COOLDOWN_MS;
    p.moving = false;
    this.emit({ type: 'howl', foxId: p.id, from, to: { ...dest }, targetHoleId, at: now });
    return { ok: true, to: { ...dest }, targetHoleId };
  }

  // ---------- 여우 능력: 쥐 둔갑(H) / 순간 가속(F) ----------

  private foxAbilityCheck(p: GamePlayer | undefined, readyAt: number, name: string, now: number): AckResult | null {
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'fox') return { ok: false, error: `여우만 ${name}을 쓸 수 있어요.` };
    if (this.phase !== 'playing') return { ok: false, error: '본 게임이 시작된 뒤에 사용할 수 있어요.' };
    if (!p.alive) return { ok: false, error: '사용할 수 없어요.' };
    if (isTrapped(p, now)) return { ok: false, error: '덫에 걸려 움직일 수 없어요!' };
    if (isStunned(p, now)) return { ok: false, error: '스프레이에 맞아 움직일 수 없어요!' };
    if (isDisguised(p, now)) return { ok: false, error: '둔갑 중에는 다른 능력을 쓸 수 없어요.' };
    if (now < readyAt) return { ok: false, error: `${name} 재사용 대기 ${Math.ceil((readyAt - now) / 1000)}초` };
    return null;
  }

  private disguiseTarget(fox: GamePlayer): GamePlayer | null {
    return fox.disguiseAsId ? (this.players.get(fox.disguiseAsId) ?? null) : null;
  }

  /** 둔갑 이름표: 흉내 낸 쥐의 닉네임. 대상이 없으면(쥐가 모두 나간 경우 등) 기본 이름 */
  private disguiseName(fox: GamePlayer): string {
    return this.disguiseTarget(fox)?.name ?? DISGUISE_NAME;
  }

  /**
   * 쥐 둔갑: DISGUISE_MS 동안 겉모습이 쥐로, 이름표가 살아 있는 쥐 플레이어 중 무작위 한 명의 닉네임으로 바뀐다.
   * 역할·충돌 판정은 여우 그대로이고(잡기 가능), 속도는 쥐 기본 속도, 달리기·순간 가속·울음소리는 쓸 수 없다.
   */
  tryDisguise(id: string, now: number): AckResult<{ until: number }> {
    const p = this.players.get(id);
    const rejected = this.foxAbilityCheck(p, p?.disguiseReadyAt ?? 0, '둔갑', now);
    if (rejected) return rejected as AckResult<{ until: number }>;
    const fox = p!;
    if (isDashing(fox, now)) return { ok: false, error: '순간 가속 중에는 둔갑할 수 없어요.' };
    // 다른 여우가 이미 흉내 내고 있는 쥐는 되도록 피한다
    const taken = new Set(this.foxes().filter((f) => f !== fox && isDisguised(f, now)).map((f) => f.disguiseAsId));
    const alive = this.aliveMice();
    const pool = alive.filter((m) => !taken.has(m.id));
    const cands = pool.length > 0 ? pool : alive;
    const as = cands.length > 0 ? cands[Math.floor(this.rng() * cands.length)] : null;
    fox.disguiseAsId = as?.id ?? null;
    fox.disguisedUntil = now + DISGUISE_MS;
    fox.disguiseReadyAt = now + DISGUISE_COOLDOWN_MS;
    fox.sprinting = false;
    this.emit({
      type: 'disguise',
      foxId: fox.id,
      foxName: fox.name,
      asId: fox.disguiseAsId,
      asName: this.disguiseName(fox),
      x: fox.x,
      y: fox.y,
      until: fox.disguisedUntil,
      at: now,
    });
    return { ok: true, until: fox.disguisedUntil };
  }

  /**
   * 순간 가속: DASH_MS 동안 기본 속도의 DASH_MULT 배. 일반 달리기(N)와 동시에 쓸 수 없고
   * 가속 중에는 N 을 눌러도 달리기 배율이 더해지지 않는다. 잡기는 여전히 실제 접촉 + E.
   */
  tryDash(id: string, now: number): AckResult<{ until: number }> {
    const p = this.players.get(id);
    const rejected = this.foxAbilityCheck(p, p?.dashReadyAt ?? 0, '순간 가속', now);
    if (rejected) return rejected as AckResult<{ until: number }>;
    const fox = p!;
    if (fox.sprinting) return { ok: false, error: '달리기(N) 중에는 순간 가속을 쓸 수 없어요.' };
    fox.dashUntil = now + DASH_MS;
    fox.dashReadyAt = now + DASH_COOLDOWN_MS;
    this.emit({ type: 'dash', foxId: fox.id, x: fox.x, y: fox.y, until: fox.dashUntil, at: now });
    return { ok: true, until: fox.dashUntil };
  }

  // ---------- 이벤트: 여우 스프레이 ----------

  /**
   * 본 게임 SPRAY_FIRST_CHECK_MS 뒤 첫 검사, 이후 SPRAY_CHECK_MIN~MAX_MS 마다 한 번씩 검사한다.
   * 검사마다 SPRAY_CHANCE 확률로, 스프레이가 없는 살아 있는 쥐 한 마리에게 1개 지급 (한 번에 1개씩).
   * 라운드 지급량은 최소 SPRAY_MIN_PER_ROUND(남은 검사로 못 채우면 강제 지급) ~ 최대 SPRAY_MAX_PER_ROUND.
   * 틱 안에서 다음 시각만 비교하므로 타이머가 겹치지 않는다.
   */
  private updateSprayEvent(now: number): void {
    if (now < this.nextSprayCheckAt) return;
    if (this.sprayGrants >= SPRAY_MAX_PER_ROUND) {
      this.nextSprayCheckAt = Infinity;
      return;
    }
    this.sprayChecks++;
    this.nextSprayCheckAt += SPRAY_CHECK_MIN_MS + this.rng() * (SPRAY_CHECK_MAX_MS - SPRAY_CHECK_MIN_MS);
    if (this.nextSprayCheckAt <= now) this.nextSprayCheckAt = now + SPRAY_CHECK_MIN_MS;
    // 최소 지급량 보장: 간격이 가장 길게(30초) 잡혀도 남은 1분 전까지의 검사 수로 최소량을 못 채우면 확률과 무관하게 지급
    const need = SPRAY_MIN_PER_ROUND - this.sprayGrants;
    const sureChecksLeft = Math.max(0, Math.ceil((this.endsAt - SPRAY_MIN_BY_REMAIN_MS - now) / SPRAY_CHECK_MAX_MS) - 1);
    const forced = need > 0 && sureChecksLeft < need;
    if (!forced && this.rng() >= SPRAY_CHANCE) return;
    // 한 마리는 1개만 들 수 있다 (이미 든 쥐는 후보에서 뺀다)
    const candidates = this.aliveMice().filter((m) => !m.spray);
    if (candidates.length === 0) return;
    const m = candidates[Math.floor(this.rng() * candidates.length)];
    m.spray = true;
    this.sprayGrants++;
    if (this.sprayGrants >= SPRAY_MAX_PER_ROUND) this.nextSprayCheckAt = Infinity;
    this.emit({ type: 'sprayGrant', mouseId: m.id, x: m.x, y: m.y, count: this.sprayGrants, at: now });
  }

  /**
   * G: 마지막으로 누른 이동 방향(바라보는 방향)으로 좁은 부채꼴 분사. 한 번 쓰면 사라진다 (빗나가도).
   * 부채꼴 안에 있고 장애물에 가리지 않은 여우는 둔갑 중이어도 SPRAY_STUN_MS 동안 스턴.
   * 이미 덫·스턴에 걸려 있거나 스턴이 끝난 직후(SPRAY_STUN_IMMUNE_MS)인 여우에게는 겹쳐 걸리지 않는다.
   */
  trySpray(id: string, now: number): AckResult<{ hitIds: string[] }> {
    const p = this.players.get(id);
    if (!p) return { ok: false, error: '플레이어를 찾을 수 없어요.' };
    if (p.role !== 'mouse') return { ok: false, error: '쥐만 스프레이를 쓸 수 있어요.' };
    if (!p.alive) return { ok: false, error: '이미 잡혔어요.' };
    if (this.phase !== 'playing') return { ok: false, error: '본 게임 중에만 쓸 수 있어요.' };
    if (!p.spray) return { ok: false, error: '여우 스프레이가 없어요.' };
    if (p.hiddenIn !== null) return { ok: false, error: '쥐구멍 안에서는 스프레이가 여우에게 닿지 않아요.' };
    if (isInRps(p, now)) return { ok: false, error: '가위바위보 중에는 쓸 수 없어요.' };
    const dir = { x: p.aimX, y: p.aimY };
    const hitIds: string[] = [];
    for (const f of this.foxes()) {
      if (!f.alive || !inSprayCone(p, dir, f) || !this.nav.lineOfSight(p, f)) continue;
      if (isImmobilized(f, now) || now < f.stunImmuneUntil) continue;
      f.stunnedUntil = now + SPRAY_STUN_MS;
      f.stunImmuneUntil = f.stunnedUntil + SPRAY_STUN_IMMUNE_MS;
      f.sprinting = false;
      f.moving = false;
      hitIds.push(f.id);
    }
    p.spray = false;
    this.emit({ type: 'sprayUse', mouseId: p.id, x: p.x, y: p.y, dirX: dir.x, dirY: dir.y, hitIds, at: now });
    return { ok: true, hitIds };
  }

  // ---------- 라운드 중간 보너스 ----------

  private updateBonus(now: number): void {
    if (!this.bonusSpawned && now >= this.prepEndsAt + BONUS_SPAWN_AFTER_MS) {
      this.bonusSpawned = true;
      const margin = 220;
      const desired = {
        x: margin + this.rng() * (this.map.width - margin * 2),
        y: margin + this.rng() * (this.map.height - margin * 2),
      };
      const avoid: SpotConstraint[] = [
        ...this.holes.map((h) => ({ x: h.x, y: h.y, minDist: 90 })),
        ...this.foxes().map((f) => ({ x: f.x, y: f.y, minDist: 200 })),
      ];
      const spot = findSafeSpot(desired, this.map, avoid, this.rng) ?? findSafeSpot(desired, this.map, [], this.rng);
      if (spot) {
        this.bonus = { x: spot.x, y: spot.y, expiresAt: now + BONUS_LIFETIME_MS };
        this.emit({ type: 'bonusSpawn', x: spot.x, y: spot.y, expiresAt: this.bonus.expiresAt, at: now });
      }
    }
    const b = this.bonus;
    if (!b) return;
    if (now >= b.expiresAt) {
      this.bonus = null;
      this.emit({ type: 'bonusExpire', x: b.x, y: b.y, at: now });
      return;
    }
    // 여우는 보너스를 집을 수 없다 (쥐만 검사)
    for (const m of this.mice()) {
      if (!m.alive || m.hiddenIn !== null || distance(m, b) > BONUS_PICK_RANGE) continue;
      m.boostUntil = now + BONUS_BOOST_MS;
      this.bonus = null;
      this.emit({ type: 'bonusPick', mouseId: m.id, x: b.x, y: b.y, until: m.boostUntil, at: now });
      return;
    }
  }

  // ---------- 연결 상태 ----------

  markDisconnected(id: string, now: number): void {
    const p = this.players.get(id);
    if (!p || p.isBot) return;
    p.connected = false;
    p.disconnectedAt = now;
    p.inputQueue.length = 0;
  }

  /** 재접속 유예 시간이 지나도 돌아오지 않으면 AI가 같은 캐릭터·역할을 이어받는다 */
  convertToBot(id: string, now: number): void {
    const p = this.players.get(id);
    if (!p || p.isBot || this.isEnded()) return;
    p.isBot = true;
    p.connected = false;
    p.inputQueue.length = 0;
    this.bots.set(id, new BotBrain(id, this.difficulty, this.rng));
    this.emit({ type: 'botTakeover', playerId: id, at: now });
  }

  /** 같은 세션으로 돌아오면 (AI가 이어받은 뒤라도) 조작권을 되돌려준다 */
  reclaim(id: string, now: number): boolean {
    const p = this.players.get(id);
    if (!p) return false;
    const wasAway = !p.connected || p.isBot;
    this.bots.delete(id);
    p.isBot = false;
    p.connected = true;
    p.disconnectedAt = null;
    p.inputQueue.length = 0;
    p.inputTokens = 1;
    p.lastQueuedSeq = 0;
    p.ackSeq = 0;
    p.botDir = { x: 0, y: 0 };
    p.botSprint = false;
    if (wasAway) this.emit({ type: 'reconnected', playerId: id, at: now });
    return true;
  }

  // ---------- 직렬화 ----------

  /** 잡기 판정과 같은 기준(서버 위치, 충돌 원)으로 지금 맞닿아 있는 여우-쥐 쌍 */
  contacts(now: number): [string, string][] {
    if (this.phase !== 'playing') return [];
    const out: [string, string][] = [];
    for (const f of this.foxes()) {
      if (!f.alive || isImmobilized(f, now)) continue;
      const m = this.touchingMouse(f, now);
      if (m) out.push([f.id, m.id]);
    }
    return out;
  }

  /** viewer 가 'fox' 이면 숨겨진 덫과 쥐의 아이템 정보를 빼고 보낸다 */
  snapshot(now: number, events: GameEvent[] = [], viewer?: Role): GameSnapshot {
    const base = this.buildSnapshot(now, events);
    return viewer === 'fox' ? this.foxView(base) : viewer === 'mouse' ? this.mouseView(base) : base;
  }

  /** 방송용: 위치·접촉 계산은 한 번만 하고 역할별 화면만 나눈다 */
  snapshotsByRole(now: number, events: GameEvent[] = []): Record<Role, GameSnapshot> {
    const base = this.buildSnapshot(now, events);
    return { mouse: this.mouseView(base), fox: this.foxView(base) };
  }

  /** 쥐에게는 여우가 둔갑하는 순간(이펙트·알림)을 보내지 않는다 */
  private mouseView(base: GameSnapshot): GameSnapshot {
    // 둔갑한 여우의 접촉 표시는 쥐 화면에 보내지 않는다 (누가 여우인지 드러나므로)
    const hideContact = ([fid]: [string, string]) => {
      const f = this.players.get(fid);
      return !!f && isDisguised(f, base.serverTime);
    };
    const hasDisguiseEv = base.events.some((e) => e.type === 'disguise');
    if (!hasDisguiseEv && !base.contacts.some(hideContact)) return base;
    return {
      ...base,
      contacts: base.contacts.filter((c) => !hideContact(c)),
      events: hasDisguiseEv ? base.events.filter((e) => e.type !== 'disguise') : base.events,
    };
  }

  /** 여우에게는 쥐의 아이템·스프레이 보유자, 덫 위치를 보내지 않는다 */
  private foxView(base: GameSnapshot): GameSnapshot {
    return {
      ...base,
      players: base.players.map((p) => (p.item === null && !p.spray ? p : { ...p, item: null, spray: false })),
      traps: [],
      events: base.events.some((e) => e.type === 'sprayGrant')
        ? base.events.map((e) => (e.type === 'sprayGrant' ? { ...e, mouseId: null, x: 0, y: 0 } : e))
        : base.events,
    };
  }

  private buildSnapshot(now: number, events: GameEvent[]): GameSnapshot {
    return {
      serverTime: now,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      prepEndsAt: this.prepEndsAt,
      endsAt: this.endsAt,
      difficulty: this.difficulty,
      players: [...this.players.values()].map((p) => {
        // 둔갑 중에는 모든 화면에서 흉내 낸 쥐 플레이어의 닉네임·AI 표시로 보인다 (내부 이름·역할은 그대로)
        const disguised = isDisguised(p, now);
        const as = disguised ? this.disguiseTarget(p) : null;
        return {
        id: p.id,
        name: disguised ? this.disguiseName(p) : p.name,
        role: p.role,
        isBot: as ? as.isBot : disguised ? false : p.isBot,
        connected: as ? as.connected : disguised ? true : p.connected,
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
        facing: p.facing,
        moving: p.moving,
        sprinting: p.sprinting,
        alive: p.alive,
        hiddenIn: p.hiddenIn,
        holeReadyAt: p.holeReadyAt,
        howlReadyAt: p.howlReadyAt,
        invulnUntil: p.invulnUntil,
        catchReadyAt: p.catchReadyAt,
        stamina: Math.round(p.stamina),
        sprintReadyAt: p.sprintReadyAt,
        trappedUntil: p.trappedUntil,
        stunnedUntil: p.stunnedUntil,
        stunImmuneUntil: p.stunImmuneUntil,
        spray: p.spray,
        rolledRole: p.rolledRole,
        slowUntil: p.slowUntil,
        inkedUntil: p.inkedUntil,
        disguisedUntil: p.disguisedUntil,
        disguiseReadyAt: p.disguiseReadyAt,
        dashUntil: p.dashUntil,
        dashReadyAt: p.dashReadyAt,
        boostUntil: p.boostUntil,
        rpsUntil: p.rpsUntil,
        rpsReadyAt: p.rpsReadyAt,
        rpsGuardUntil: p.rpsGuardUntil,
        rpsBoostUntil: p.rpsBoostUntil,
        rpsSlowUntil: p.rpsSlowUntil,
        item: p.item,
        itemUsed: p.itemUsed,
        ack: p.ackSeq,
        };
      }),
      holes: this.holes.map((h) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        occupantId: h.occupantId,
        hideEndsAt: h.hideEndsAt,
        occupants: h.occupants.map((o) => o.id),
        rps: h.rps
          ? {
              ids: [...h.rps.ids],
              challengerId: h.rps.challengerId,
              defenderId: h.rps.defenderId,
              chosen: [...h.rps.choices.keys()],
              deadline: h.rps.deadline,
              round: h.rps.round,
            }
          : null,
      })),
      traps: this.traps.map((t) => ({ ...t })),
      snacks: this.snacks.map((s) => ({ ...s })),
      bonus: this.bonus ? { ...this.bonus } : null,
      aliveMice: this.aliveMice().length,
      contacts: this.contacts(now),
      events,
      result: this.result,
    };
  }
}
