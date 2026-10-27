/** 게임 전체에서 클라이언트와 서버가 공유하는 규칙 상수 */

export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1600;

export const TOTAL_PLAYERS = 10;
export const FOX_COUNT = 2;
export const MOUSE_COUNT = TOTAL_PLAYERS - FOX_COUNT;
/**
 * 역할 추첨: 사람 플레이어는 라운드마다 각자 독립적으로 여우 50% / 쥐 50% 로 뽑는다.
 * 이전 결과와 무관하게 매번 같은 확률 (연속으로 같은 역할이 나와도 보정하지 않음).
 * 여우 자리(FOX_COUNT)가 이미 찼으면 쥐가 된다. 남은 자리는 AI 가 채운다.
 */
export const FOX_ROLE_CHANCE = 0.5;

export const PLAYER_RADIUS = 18;

/** 속도 배율 1.0 에 해당하는 실제 이동 속도 (px/s) */
export const BASE_SPEED = 320;
/** 역할별 기본 속도 배율: 쥐 1.12, 여우 1.18 */
export const ROLE_SPEED_MULT = { mouse: 1.12, fox: 1.18 } as const;
export const MOUSE_SPEED = BASE_SPEED * ROLE_SPEED_MULT.mouse; // 358.4 px/s
export const FOX_SPEED = BASE_SPEED * ROLE_SPEED_MULT.fox; // 377.6 px/s

export const PREP_MS = 30_000;
/** 본 게임(한 라운드) 제한 시간: 3분 30초 */
export const GAME_MS = 210_000;
/** 남은 시간이 이 이하이면 타이머를 강조한다 */
export const TIMER_WARN_MS = 30_000;
/** 남은 시간이 이 이하이면 추가 경고(깜빡임·안내)를 띄운다 */
export const TIMER_DANGER_MS = 10_000;

export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;

/**
 * 월드 좌표 단위는 px 이고 미터 단위는 따로 없다. 그래서 여우 스프라이트를 기준으로 환산한다:
 * 화면의 여우 머리~몸 길이 (19 + 32.5) × 1.12 ≈ 58px 를 실제 붉은여우의 머리~몸 길이 약 0.7m 로 본다.
 * → 1m ≈ 83px, 1cm ≈ 0.83px. (전체 맵 2400px ≈ 29m, 여우 기본 속도 378px/s ≈ 4.5m/s)
 */
export const FOX_SPRITE_BODY_PX = 58;
export const FOX_BODY_LENGTH_M = 0.7;
export const PX_PER_METER = FOX_SPRITE_BODY_PX / FOX_BODY_LENGTH_M;
/** 충돌 원이 맞닿은 뒤 추가로 허용하는 잡기 거리 (중심 간 거리 기준 25cm ≈ 21px) */
export const CATCH_EXTRA_M = 0.25;
export const CATCH_EXTRA_PX = Math.round(CATCH_EXTRA_M * PX_PER_METER);
/** 여우와 쥐 충돌 원 중심 거리가 이 이하이면 E 키로 잡을 수 있다 (반경 18 + 18 + 21 = 57px) */
export const CATCH_DISTANCE = PLAYER_RADIUS * 2 + CATCH_EXTRA_PX;
/** 잡기 키 연타·중복 입력 방지 간격 */
export const CATCH_COOLDOWN_MS = 400;
/** E 를 누르기 전에 보낸 이동 입력이 서버에 도착하지 않을 때 판정을 더 기다리지 않는 한도 */
export const CATCH_WAIT_MAX_MS = 150;

export const SPRINT_MULT = 1.5;
/** 스태미나 최대치 = 연속으로 달릴 수 있는 최대 시간 */
export const SPRINT_MAX_MS = 4_000;
/** 스태미나를 다 쓰면 이 시간 동안 다시 달릴 수 없다 (그 사이 스태미나는 가득 찬다) */
export const SPRINT_COOLDOWN_MS = 4_000;
/** 달리지 않을 때 스태미나 회복 속도 (ms 당) — 재사용 대기시간 동안 가득 찬다 */
export const STAMINA_REGEN_PER_MS = SPRINT_MAX_MS / SPRINT_COOLDOWN_MS;

export const HOLE_COUNT = 4;
/** 쥐구멍 중심에서 이 거리 안(입구 근처)에서만 들어갈 수 있다 */
export const HOLE_ENTER_RANGE = 56;
/** 쥐구멍에 최대로 숨어 있을 수 있는 시간 (지나면 자동으로 나온다) */
export const HOLE_HIDE_MS = 15_000;
/** 쥐구멍에서 나온 뒤 다시 들어갈 수 있을 때까지의 대기시간 (나온 직후 1초 재입장 불가도 이 안에 포함) */
export const HOLE_COOLDOWN_MS = 7_000;
/** 쥐구멍에서 나온 직후 어떤 경우에도 다시 들어갈 수 없는 시간 (HOLE_COOLDOWN_MS 안에 포함) */
export const HOLE_REENTRY_BLOCK_MS = 1_000;
/** 쥐구멍에서 나온 직후 잠깐 잡히지 않는 시간 (입구 매복 즉사 방지) */
export const HOLE_EXIT_INVULN_MS = 1_000;
/** 쥐구멍 출구 위치: 입구에서 이 거리 안에서만 찾는다 (멀리 순간이동 금지) */
export const HOLE_EXIT_MAX_OFFSET = 126;
/** 입구에서 여우가 기다려도 나오자마자 몸이 닿지 않도록 여우와 띄우는 거리 (접촉 거리 + 여유) */
export const HOLE_EXIT_FOX_CLEARANCE = CATCH_DISTANCE + 16;
/** 쥐구멍 중심에서 입구까지 거리 */
export const HOLE_ENTRANCE_OFFSET = 66;

export const HOWL_COOLDOWN_MS = 30_000;
/** 쥐 근처로 순간이동할 때 쥐와의 목표 거리 */
export const TELEPORT_MOUSE_DISTANCE = 140;
/** 두 여우가 순간이동 후 유지해야 하는 최소 간격 */
export const FOX_MIN_SEPARATION = 72;

// ---------- 도망자 아이템 ----------
/** 여우 덫: 설치 후 유지 시간 */
export const TRAP_LIFETIME_MS = 20_000;
/** 여우 덫: 걸린 여우가 아무것도 못 하는 시간 */
export const TRAP_STUN_MS = 6_000;
/** 덫·간식 발동 거리 (여우 중심 기준) */
export const ITEM_TRIGGER_RANGE = PLAYER_RADIUS + 16;
/** 매운 간식: 감속 시간과 배율 (30% 감소) */
export const SNACK_SLOW_MS = 20_000;
export const SNACK_SLOW_MULT = 0.7;
/** 먹물: 시야 제한 시간과 남는 시야 반경 */
export const INK_MS = 10_000;
export const INK_VISION_RADIUS = 190;

// ---------- 여우 전용 능력 ----------
/** 쥐 둔갑(H): 겉모습·이름만 쥐로 바뀐다. 잡기(E)는 가능, 이동 속도는 쥐 기본 속도, 달리기·순간 가속·울음소리 불가 */
export const DISGUISE_MS = 8_000;
export const DISGUISE_COOLDOWN_MS = 30_000;
/** 둔갑한 여우는 살아 있는 쥐 플레이어 한 명의 닉네임으로 보인다. 흉내 낼 쥐가 없을 때만 쓰는 예비 이름 */
export const DISGUISE_NAME = '생존자 쥐';
/** 순간 가속(F): 일반 달리기 대신 적용되는 배율 (둘이 곱해지지 않는다) */
export const DASH_MS = 3_000;
export const DASH_MULT = 1.8;
export const DASH_COOLDOWN_MS = 20_000;

// ---------- 쥐구멍 쟁탈전: 가위바위보 (L) ----------
/** 쥐구멍 하나에 동시에 숨을 수 있는 쥐 수 */
export const HOLE_CAPACITY = 1;
/** 화면 버튼 순서: 가위 · 바위 · 보 */
export const RPS_CHOICES = ['scissors', 'rock', 'paper'] as const;
/** L 쟁탈전을 걸 수 있는 거리 (쥐구멍 중심 기준). Y 입장 거리(56px)보다 넉넉하지만 구멍 주변에서만 */
export const HOLE_RPS_RANGE = 150;
/** 가위바위보 한 판 선택 제한시간. 안 고르면 서버가 무작위로 대신 낸다 */
export const RPS_CHOICE_MS = 5_000;
/** 비겨서 다시 하는 판을 포함한 한 쟁탈전의 최대 판 수 (계속 비겨서 보호를 끄는 것 방지). 넘기면 무작위 승자 */
export const RPS_MAX_ROUNDS = 5;
/** 쟁탈전이 끝난 쥐가 다시 쟁탈전(과 그 보호)에 참여할 수 있을 때까지의 시간 */
export const RPS_RETRY_MS = 10_000;
/** 쟁탈전이 끝난 순간부터 잡히지 않는 보호막 시간 */
export const RPS_GUARD_MS = 5_000;
/** 쟁탈전 뒤 도주용 이동 속도 버프 (기본 속도의 20% 증가, 보호막과 동시에 끝난다) */
export const RPS_BOOST_MULT = 1.2;
/** 쟁탈전에서 진 도전자(밖의 쥐)의 감속 시간과 배율 */
export const RPS_LOSE_SLOW_MS = 3_000;
export const RPS_LOSE_SLOW_MULT = 0.75;

// ---------- 라운드 중간 보너스 (쥐 전용) ----------
/** 본 게임 시작 후 이 시간이 지나면 보너스 하나가 나타난다 (라운드당 한 번) */
export const BONUS_SPAWN_AFTER_MS = 60_000;
export const BONUS_LIFETIME_MS = 10_000;
export const BONUS_BOOST_MS = 10_000;
export const BONUS_BOOST_MULT = 1.1;
export const BONUS_PICK_RANGE = PLAYER_RADIUS + 16;

// ---------- 이벤트 아이템: 여우 스프레이 (쥐 전용, G) ----------
/** 본 게임 시작 후 이 시간 동안은 스프레이 이벤트가 없다. 이 시각에 첫 검사 */
export const SPRAY_FIRST_CHECK_MS = 30_000;
/** 이후 검사 간격 (매번 이 범위에서 무작위) */
export const SPRAY_CHECK_MIN_MS = 20_000;
export const SPRAY_CHECK_MAX_MS = 30_000;
/** 검사 한 번에 이벤트가 일어날 확률 */
export const SPRAY_CHANCE = 0.35;
/** 한 라운드 지급량: 성공할 때마다 1개씩, 최소 2개(남은 검사로 못 채울 것 같으면 확률과 무관하게 지급) ~ 최대 6개. 쥐 한 마리는 1개만 들 수 있다 */
export const SPRAY_MIN_PER_ROUND = 2;
export const SPRAY_MAX_PER_ROUND = 6;
/** 최소 지급량은 라운드가 이만큼 남았을 때까지 채운다 (끝나기 직전에 받아 쓸 수 없는 일이 없도록) */
export const SPRAY_MIN_BY_REMAIN_MS = 60_000;
/**
 * 사거리 '약 3칸': 맵에는 눈에 보이는 칸(격자)이 없으므로 캐릭터 한 마리 몸길이(여우 머리~몸 58px, 미터 환산 기준과 같음)를
 * 1칸으로 본다 → 3칸 = 174px ≈ 2.1m. (AI 길찾기용 20px 격자는 화면에 없고, 3칸=60px 이면 잡기 거리 57px 와 거의 같아 의미가 없다)
 */
export const SPRAY_TILE_PX = FOX_SPRITE_BODY_PX;
export const SPRAY_RANGE_TILES = 3;
export const SPRAY_RANGE = SPRAY_TILE_PX * SPRAY_RANGE_TILES;
/** 좁은 부채꼴: 분사 방향 기준 좌우 25도 (전체 50도) */
export const SPRAY_HALF_ANGLE_DEG = 25;
/** 스프레이에 맞은 여우의 스턴 시간 (이동·잡기·달리기·순간 가속 불가) */
export const SPRAY_STUN_MS = 2_000;
/** 스턴이 끝난 뒤 다시 스턴되지 않는 시간 (연속 무력화 방지) */
export const SPRAY_STUN_IMMUNE_MS = 5_000;

/** 쥐 화면 위험 표시: 여우가 이 거리 안에 오면 화면 가장자리가 붉어진다 (시각 효과 전용) */
export const DANGER_RANGE = 260;

export const RECONNECT_GRACE_MS = 20_000;
export const LOBBY_DISCONNECT_GRACE_MS = 15_000;

export const MAX_INPUT_QUEUE = 8;
/** 패킷 손실 대비: 이동 입력마다 아직 확인되지 않은 직전 입력을 이만큼 함께 보낸다 */
export const INPUT_REDUNDANCY = 4;
export const MAX_INPUTS_PER_TICK = 2;
export const INPUT_TOKEN_CAP = 3;

export const NAME_MAX_LENGTH = 12;
export const ROOM_CODE_LENGTH = 5;

export function speedFor(role: 'fox' | 'mouse'): number {
  return role === 'fox' ? FOX_SPEED : MOUSE_SPEED;
}
