// 프리셸용 52장 트럼프 덱과 이동 규칙 판정.
import { CONFIG } from './config.mjs';

let nextId = 1;

export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function buildDeck() {
  const deck = [];
  for (const suit of CONFIG.suitOrder) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: nextId++, suit, rank, arrive: 0 });
    }
  }
  return shuffle(deck);
}

export function rankLabel(rank) {
  return CONFIG.rankNames[rank] || String(rank);
}

export function cardLabel(card) {
  const suit = CONFIG.suits[card.suit];
  return `${suit.symbol}${rankLabel(card.rank)}`;
}

export function isRed(card) {
  return CONFIG.suits[card.suit].color === 'red';
}

export function sameColor(a, b) {
  return CONFIG.suits[a.suit].color === CONFIG.suits[b.suit].color;
}

export function canStackOnCascade(moving, onto) {
  if (!onto) return true;
  return !sameColor(moving, onto) && moving.rank === onto.rank - 1;
}

export function canPlaceOnFoundation(card, foundation) {
  if (!foundation.length) return card.rank === 1;
  const top = foundation.at(-1);
  return card.suit === top.suit && card.rank === top.rank + 1;
}

// 위에서부터 이어진 내림차순·교차색 묶음 길이
export function sequenceLength(column) {
  if (!column.length) return 0;
  let n = 1;
  for (let i = column.length - 1; i > 0; i--) {
    if (!canStackOnCascade(column[i], column[i - 1])) break;
    n++;
  }
  return n;
}

// 빈 프리셀·빈 열 수에 따라 한 번에 옮길 수 있는 최대 장수 (고전 슈퍼무브)
export function maxMovable(emptyFreecells, emptyCascades, destIsEmptyCascade) {
  const freeCols = Math.max(0, emptyCascades - (destIsEmptyCascade ? 1 : 0));
  return (1 + emptyFreecells) * (2 ** freeCols);
}
