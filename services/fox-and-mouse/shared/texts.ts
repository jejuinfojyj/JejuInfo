import {
  BONUS_BOOST_MS,
  BONUS_BOOST_MULT,
  FOX_COUNT,
  FOX_ROLE_CHANCE,
  GAME_MS,
  RPS_BOOST_MULT,
  RPS_GUARD_MS,
  RPS_LOSE_SLOW_MS,
  RPS_LOSE_SLOW_MULT,
  RPS_RETRY_MS,
  SPRAY_FIRST_CHECK_MS,
  SPRAY_MAX_PER_ROUND,
  SPRAY_MIN_PER_ROUND,
  SPRAY_RANGE_TILES,
  SPRAY_STUN_MS,
  DASH_COOLDOWN_MS,
  DASH_MS,
  DASH_MULT,
  DISGUISE_COOLDOWN_MS,
  DISGUISE_MS,
  HOLE_CAPACITY,
  INK_MS,
  RPS_CHOICE_MS,
  ROLE_SPEED_MULT,
  SNACK_SLOW_MS,
  SNACK_SLOW_MULT,
  SPRINT_MAX_MS,
  SPRINT_MULT,
  TRAP_LIFETIME_MS,
  TRAP_STUN_MS,
} from './constants';
import type { ItemKind, Role, Winner } from './types';

const sec = (ms: number) => `${ms / 1000}초`;
/** 매운 간식 감속률(%) */
export const SNACK_SLOW_PERCENT = Math.round((1 - SNACK_SLOW_MULT) * 100);
/** 보너스 가속률(%) */
export const BONUS_BOOST_PERCENT = Math.round((BONUS_BOOST_MULT - 1) * 100);
/** 쟁탈전 뒤 도주 속도 버프(%) / 진 도전자 감속(%) */
export const RPS_BOOST_PERCENT = Math.round((RPS_BOOST_MULT - 1) * 100);
export const RPS_SLOW_PERCENT = Math.round((1 - RPS_LOSE_SLOW_MULT) * 100);
/** 제한 시간 표기 (예: 3분 30초) */
export const GAME_TIME_TEXT = `${Math.floor(GAME_MS / 60_000)}분${GAME_MS % 60_000 ? ` ${(GAME_MS % 60_000) / 1000}초` : ''}`;

/** 여우 능력 설명 */
export const FOX_ABILITY_TEXT = {
  disguise: `H 쥐 둔갑: ${sec(DISGUISE_MS)} 동안 쥐 모습 + 살아 있는 쥐 플레이어 한 명의 닉네임으로 변신 (E 잡기 가능, 쥐 속도, 달리기·가속·쥐구멍 불가, 재사용 ${sec(DISGUISE_COOLDOWN_MS)})`,
  dash: `F 순간 가속: ${sec(DASH_MS)} 동안 ${DASH_MULT}배 속도 (달리기와 동시 사용 불가, 재사용 ${sec(DASH_COOLDOWN_MS)})`,
};

/** 역할 추첨 설명 */
export const ROLE_DRAW_TEXT =
  `역할은 라운드마다 새로 추첨해요: 여우 ${Math.round(FOX_ROLE_CHANCE * 100)}% · 쥐 ${Math.round((1 - FOX_ROLE_CHANCE) * 100)}% ` +
  `(연속으로 같은 역할이 나와도 확률은 그대로, 여우 ${FOX_COUNT}자리가 차면 쥐로 배정).`;

/** 여우 스프레이 이벤트 설명 */
export const SPRAY_TEXT =
  `🧴 여우 스프레이: 본 게임 ${sec(SPRAY_FIRST_CHECK_MS)} 뒤부터 가끔 쥐에게 1개씩 주어져요(라운드당 ${SPRAY_MIN_PER_ROUND}~${SPRAY_MAX_PER_ROUND}개, 한 마리는 1개까지). ` +
  `G 로 바라보는 방향 약 ${SPRAY_RANGE_TILES}칸 앞에 한 번 뿌리면, 맞은 여우는 ${sec(SPRAY_STUN_MS)} 동안 이동·잡기·달리기·가속 불가. ` +
  `빗나가도 사라지고, 쥐구멍 안에서는 쓸 수 없어요.`;

/** 보너스 설명 */
export const BONUS_TEXT = `⭐ 본 게임 60초가 지나면 보너스가 한 번 나타나요. 쥐가 먹으면 ${sec(BONUS_BOOST_MS)} 동안 ${BONUS_BOOST_PERCENT}% 빨라져요.`;

/** 쥐구멍 쟁탈전 설명 */
export const HOLE_RPS_TEXT =
  `쥐구멍은 ${HOLE_CAPACITY}마리만 숨을 수 있어요. 다른 쥐가 숨은 구멍 주변에서 L 을 누르면 그 쥐와 가위바위보 쟁탈전! ` +
  `${sec(RPS_CHOICE_MS)} 안에 화면 버튼(✌️✊✋)으로 고르세요 — 안 고르면 무작위로 자동 선택, 비기면 재경기. ` +
  `이기면 구멍을 빼앗고(안의 쥐는 밖으로), 지면 ${sec(RPS_LOSE_SLOW_MS)} 동안 ${RPS_SLOW_PERCENT}% 느려져요. ` +
  `쟁탈전 중에는 잡히지 않고, 끝난 뒤 ${sec(RPS_GUARD_MS)} 동안 보호막(쫓겨난 쥐·승자는 속도 +${RPS_BOOST_PERCENT}%)이 생겨요. 재도전은 ${sec(RPS_RETRY_MS)} 뒤.`;

export const ITEM_INFO: Record<ItemKind, { name: string; emoji: string; desc: string }> = {
  trap: {
    name: '여우 덫',
    emoji: '🪤',
    desc: `바닥에 설치 (${sec(TRAP_LIFETIME_MS)} 유지). 밟은 여우는 ${sec(TRAP_STUN_MS)} 동안 꼼짝 못 해요.`,
  },
  snack: {
    name: '매운 간식',
    emoji: '🌶️',
    desc: `바닥에 설치. 먹은 여우는 ${sec(SNACK_SLOW_MS)} 동안 ${SNACK_SLOW_PERCENT}% 느려져요 (달리기 포함).`,
  },
  ink: { name: '먹물', emoji: '🦑', desc: `가장 가까운 여우의 시야를 ${sec(INK_MS)} 동안 가려요.` },
};

/** 시작 화면 조작 안내에 쓰는 속도·달리기 설명 */
export const SPEED_TEXT = {
  mouse: `속도 ${ROLE_SPEED_MULT.mouse}`,
  fox: `속도 ${ROLE_SPEED_MULT.fox}`,
  sprint: `${SPRINT_MULT}배, 최대 ${sec(SPRINT_MAX_MS)}`,
};

export const RESULT_TITLES: Record<Winner, string> = {
  mouse: '도망자 승리!',
  fox: '술래 승리!',
};

const MESSAGES: Record<Winner, Record<Role, string>> = {
  mouse: {
    mouse: `축하드립니다! ${GAME_TIME_TEXT} 동안 여우를 피하는 데 성공하셨습니다.`,
    fox: '쥐를 다 놓쳐버렸습니다.',
  },
  fox: {
    fox: '축하드립니다! 모든 쥐를 다 잡았습니다.',
    mouse: '모든 쥐가 여우에게 잡혔습니다.',
  },
};

export function resultTitle(winner: Winner): string {
  return RESULT_TITLES[winner];
}

export function resultMessage(winner: Winner, myRole: Role): string {
  return MESSAGES[winner][myRole];
}

/** 받침 유무에 따라 조사를 붙인다. 한글이 아니면 병기한다. 예: withJosa('치즈', '이/가') → '치즈가' */
export function withJosa(word: string, pair: '이/가' | '을/를' | '은/는' | '와/과'): string {
  const [withBatchim, withoutBatchim] = pair.split('/');
  const code = word.charCodeAt(word.length - 1);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return `${word}${withBatchim}(${withoutBatchim})`;
  return word + ((code - 0xac00) % 28 !== 0 ? withBatchim : withoutBatchim);
}

export const ROLE_LABEL: Record<Role, string> = {
  fox: '여우 (술래)',
  mouse: '쥐 (도망자)',
};
