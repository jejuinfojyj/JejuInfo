/** 점수·판 크기·블록 모양·색을 여기서 바꿉니다. */
export const CONFIG = {
  title: '블락블라스트',
  gridSize: 8,
  cell: 46,
  boardGap: 3,
  boardX: 40,
  boardY: 78,
  trayY: 520,
  traySlotW: 140,
  traySlotH: 120,
  trayPadX: 30,
  placePointsPerCell: 1,
  lineBase: 10,
  multiLineBonus: 20,
  comboBonus: 15,
  palette: {
    background: '#2b1d14',
    surface: '#4a3424',
    board: '#1f150f',
    primary: '#e8a85a',
    text: '#fff6e8',
    muted: '#c9b09a',
    ghostOk: '#9dffb855',
    ghostBad: '#ff6b6b44',
  },
  blockColors: [
    { fill: '#d4a574', edge: '#e8c49a', deep: '#8a5a32' },
    { fill: '#b07a45', edge: '#c99662', deep: '#6b4423' },
    { fill: '#c48a4a', edge: '#dbab72', deep: '#7a4f28' },
    { fill: '#a86f3a', edge: '#c08a55', deep: '#5e3a1c' },
    { fill: '#e0b070', edge: '#f0cc98', deep: '#9a6430' },
    { fill: '#8f5e32', edge: '#b07a4a', deep: '#5a3518' },
    { fill: '#c99a5c', edge: '#e0b87a', deep: '#7f5228' },
    { fill: '#b8884c', edge: '#d0a66a', deep: '#6e4522' },
  ],
};

/** 조각 모양 목록. 각 칸은 [행, 열]이며 플레이 중 시계 방향으로 회전할 수 있다. */
export const SHAPES = [
  { id: 'dot', cells: [[0, 0]] },
  { id: 'domino-h', cells: [[0, 0], [0, 1]] },
  { id: 'domino-v', cells: [[0, 0], [1, 0]] },
  { id: 'tri-h', cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'tri-v', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'square2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'line4-h', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'line4-v', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 'line5-h', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'line5-v', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 'L3-a', cells: [[0, 0], [1, 0], [1, 1]] },
  { id: 'L3-b', cells: [[0, 1], [1, 0], [1, 1]] },
  { id: 'L3-c', cells: [[0, 0], [0, 1], [1, 0]] },
  { id: 'L3-d', cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'L4-a', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'L4-b', cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
  { id: 'L4-c', cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: 'L4-d', cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: 'T4-a', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'T4-b', cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: 'T4-c', cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { id: 'T4-d', cells: [[0, 0], [1, 0], [1, 1], [2, 0]] },
  { id: 'S4-a', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: 'S4-b', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: 'plus', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { id: 'corner3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
  { id: 'square3', cells: [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ] },
  { id: 'U', cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },
];

export function boardPixelSize() {
  const { gridSize, cell, boardGap } = CONFIG;
  return gridSize * cell + (gridSize - 1) * boardGap;
}

export function traySlotX(index) {
  return CONFIG.trayPadX + index * CONFIG.traySlotW;
}
