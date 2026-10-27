export type Role = 'fox' | 'mouse';
export type Phase = 'prep' | 'playing' | 'ended';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type RoomStatus = 'lobby' | 'in-game' | 'ended';
export type Winner = Role;
/** 도망자 아이템: 여우 덫 / 매운 간식 / 먹물 */
export type ItemKind = 'trap' | 'snack' | 'ink';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  role: Role;
  isBot: boolean;
  connected: boolean;
  x: number;
  y: number;
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
  /** 여우: 스프레이 스턴이 끝나는 시각 / 다시 스턴될 수 있는 시각 */
  stunnedUntil: number;
  stunImmuneUntil: number;
  /** 쥐: 여우 스프레이 보유 여부 (여우 화면에는 항상 false) */
  spray: boolean;
  /** 사람 플레이어가 이번 라운드 역할 추첨에서 뽑은 역할 (AI·테스트 지정은 null) */
  rolledRole: Role | null;
  slowUntil: number;
  inkedUntil: number;
  /** 여우 능력: 쥐 둔갑(H)·순간 가속(F)이 끝나는 시각과 재사용 가능 시각 */
  disguisedUntil: number;
  disguiseReadyAt: number;
  dashUntil: number;
  dashReadyAt: number;
  /** 쥐: 보너스로 빨라진 시간 */
  boostUntil: number;
  /** 쥐: 가위바위보가 진행 중이면 이번 판 마감 시각(그동안 잡히지 않고 움직이지 않음), 아니면 0 */
  rpsUntil: number;
  /** 쥐: 새 가위바위보에 다시 참여할 수 있는 시각 */
  rpsReadyAt: number;
  /** 쥐: 쟁탈전 뒤 보호막(잡히지 않음)이 끝나는 시각 */
  rpsGuardUntil: number;
  /** 쥐: 쟁탈전 뒤 이동 속도 버프(+20%)가 끝나는 시각 (보호막과 동시에 끝남) */
  rpsBoostUntil: number;
  /** 쥐: 쟁탈전에서 진 도전자의 감속이 끝나는 시각 */
  rpsSlowUntil: number;
  /** 쥐가 고른 아이템 (아직 안 골랐으면 null) */
  item: ItemKind | null;
  itemUsed: boolean;
  /** 서버가 마지막으로 처리한 이동 입력 번호 (클라이언트 예측 보정용) */
  ack: number;
}

export type RpsChoice = 'scissors' | 'rock' | 'paper';

/** 진행 중인 쥐구멍 쟁탈전 한 판. 선택 내용은 결과가 나올 때까지 공개하지 않는다 */
export interface RpsSnapshot {
  /** [도전자(밖), 방어자(안)] */
  ids: string[];
  challengerId: string;
  defenderId: string;
  /** 이미 고른 쥐 */
  chosen: string[];
  deadline: number;
  /** 몇 번째 판인지 (비기면 1씩 늘어난다) */
  round: number;
}

export interface HoleSnapshot {
  id: number;
  x: number;
  y: number;
  /** 첫 번째로 숨은 쥐 (빈 구멍이면 null) */
  occupantId: string | null;
  hideEndsAt: number;
  /** 지금 숨어 있는 쥐 전부 (최대 HOLE_CAPACITY) */
  occupants: string[];
  rps: RpsSnapshot | null;
}

export interface TrapSnapshot {
  id: number;
  ownerId: string;
  x: number;
  y: number;
  expiresAt: number;
}

export interface SnackSnapshot {
  id: number;
  ownerId: string;
  x: number;
  y: number;
}

export type GameEvent =
  | { type: 'catch'; foxId: string; mouseId: string; x: number; y: number; at: number }
  | {
      type: 'howl';
      foxId: string;
      from: Vec2;
      to: Vec2;
      targetHoleId: number | null;
      at: number;
    }
  | { type: 'holeEnter'; mouseId: string; holeId: number; at: number }
  | { type: 'holeExit'; mouseId: string; holeId: number; at: number }
  | { type: 'phase'; phase: Phase; at: number }
  | { type: 'botTakeover'; playerId: string; at: number }
  | { type: 'reconnected'; playerId: string; at: number }
  | { type: 'itemPick'; mouseId: string; item: ItemKind; auto: boolean; at: number }
  | { type: 'itemUse'; mouseId: string; item: ItemKind; x: number; y: number; targetId: string | null; at: number }
  | { type: 'trapTriggered'; foxId: string; ownerId: string; x: number; y: number; until: number; at: number }
  | { type: 'trapExpired'; ownerId: string; x: number; y: number; at: number }
  | { type: 'snackEaten'; foxId: string; ownerId: string; x: number; y: number; until: number; at: number }
  /** 여우 팀에게만 전송. foxName = 여우의 진짜 이름, asName = 흉내 낸 쥐 플레이어 이름 */
  | { type: 'disguise'; foxId: string; foxName: string; asId: string | null; asName: string; x: number; y: number; until: number; at: number }
  | { type: 'dash'; foxId: string; x: number; y: number; until: number; at: number }
  | { type: 'bonusSpawn'; x: number; y: number; expiresAt: number; at: number }
  | { type: 'bonusPick'; mouseId: string; x: number; y: number; until: number; at: number }
  | { type: 'bonusExpire'; x: number; y: number; at: number }
  /** 스프레이 지급. 여우 화면에는 누가 받았는지(mouseId) 보내지 않는다 */
  | { type: 'sprayGrant'; mouseId: string | null; x: number; y: number; count: number; at: number }
  | { type: 'sprayUse'; mouseId: string; x: number; y: number; dirX: number; dirY: number; hitIds: string[]; at: number }
  | {
      type: 'rpsStart';
      holeId: number;
      ids: string[];
      challengerId: string;
      defenderId: string;
      deadline: number;
      round: number;
      at: number;
    }
  | {
      type: 'rpsResult';
      holeId: number;
      challengerId: string;
      defenderId: string;
      /** 낸 것 공개 (시간 안에 안 고른 쥐는 서버가 무작위로 낸 것) */
      choices: Record<string, RpsChoice>;
      /** 시간 안에 못 골라 서버가 대신 낸 쥐 */
      autoIds: string[];
      /** 비기면 null (곧바로 재경기) */
      winnerId: string | null;
      /** 비겨서 다시 하는 쥐 (없으면 빈 배열) */
      rematchIds: string[];
      loserIds: string[];
      /** 최대 판 수를 넘겨 무작위로 정해졌는지 */
      random: boolean;
      at: number;
    };

export interface BonusSnapshot {
  x: number;
  y: number;
  expiresAt: number;
}

export interface GameResult {
  winner: Winner;
  endedAt: number;
  caughtCount: number;
  survivorIds: string[];
}

export interface GameSnapshot {
  serverTime: number;
  phase: Phase;
  phaseEndsAt: number;
  prepEndsAt: number;
  endsAt: number;
  difficulty: Difficulty;
  players: PlayerSnapshot[];
  holes: HoleSnapshot[];
  /** 덫은 쥐에게만 보인다 (여우 화면에는 빈 배열) */
  traps: TrapSnapshot[];
  snacks: SnackSnapshot[];
  /** 라운드 중간 보너스 (없으면 null) */
  bonus: BonusSnapshot | null;
  aliveMice: number;
  /** 지금 서버 위치 기준으로 충돌 원이 맞닿아 E 로 잡을 수 있는 [여우 id, 쥐 id] 쌍 */
  contacts: [string, string][];
  events: GameEvent[];
  result: GameResult | null;
}

export interface LobbyMember {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface LobbyState {
  code: string;
  hostId: string;
  difficulty: Difficulty;
  status: RoomStatus;
  members: LobbyMember[];
  humanCount: number;
  botCount: number;
}

export type AckResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface JoinedPayload {
  code: string;
  playerId: string;
  sessionId: string;
  lobby: LobbyState;
}

export interface InputPayload {
  seq: number;
  dx: number;
  dy: number;
  /** 여우 달리기(N) 키를 누르고 있는지 */
  sprint?: boolean;
  /** 아직 확인(ack)되지 않은 직전 입력들 (패킷이 사라져도 서버가 빈 칸을 채울 수 있게) */
  prev?: InputStep[];
}

export interface InputStep {
  seq: number;
  dx: number;
  dy: number;
  sprint?: boolean;
}
