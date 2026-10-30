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
    background: '#2c1c12',
    surface: '#5a3d28',
    board: '#1f140c',
    primary: '#e8a05a',
    text: '#fff8f0',
    muted: '#d4b896',
    ghostOk: '#7dffb855',
    ghostBad: '#ff6b6b44',
  },
  blockColors: [
    { fill: '#c48a4a', edge: '#e0b078', deep: '#8a5a28' },
    { fill: '#a86f3a', edge: '#c9945e', deep: '#6e4520' },
    { fill: '#d4a060', edge: '#efc890', deep: '#9a6e30' },
    { fill: '#8b5a2b', edge: '#b07a45', deep: '#5a3818' },
    { fill: '#b8894c', edge: '#d4ab72', deep: '#7a5528' },
    { fill: '#9c6b38', edge: '#ba8a55', deep: '#644420' },
    { fill: '#c9a06a', edge: '#e2c090', deep: '#8a6a38' },
    { fill: '#7a4e28', edge: '#a07040', deep: '#4a3018' },
  ],
};

/** 회전 없이 주어진 모양 그대로 쓰는 조각 목록. 각 칸은 [행, 열]. */
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
