// 480×800 세로 화면의 위치와 터치 영역. 규칙(game.mjs)과 그림(draw.mjs)이 같은 값을 쓴다.
export const W = 480, H = 800;
export const CARD = { w: 50, h: 74 };
export const STACK_GAP = 22;

const MARGIN = 10;
const GAP = 6;
const TOP_Y = 58;
const CASCADE_Y = 168;

export function freecellRect(i) {
  const { w, h } = CARD;
  return { x: MARGIN + i * (w + GAP), y: TOP_Y, w, h };
}

export function foundationRect(i) {
  const { w, h } = CARD;
  const start = W - MARGIN - 4 * (w + GAP) + GAP;
  return { x: start + i * (w + GAP), y: TOP_Y, w, h };
}

export function cascadeOrigin(i) {
  const { w } = CARD;
  const total = 8 * w + 7 * GAP;
  const x0 = (W - total) / 2;
  return { x: x0 + i * (w + GAP), y: CASCADE_Y };
}

export function cascadeCardRect(colIndex, cardIndex) {
  const o = cascadeOrigin(colIndex);
  return { x: o.x, y: o.y + cardIndex * STACK_GAP, w: CARD.w, h: CARD.h };
}

export const BUTTONS = {
  undo: { x: 16, y: 740, w: 140, h: 44 },
  hint: { x: 170, y: 740, w: 140, h: 44 },
  newGame: { x: 324, y: 740, w: 140, h: 44 },
};

export const hit = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
