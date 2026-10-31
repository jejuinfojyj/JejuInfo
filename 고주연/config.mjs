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
    background: '#2b1d12',
    surface: '#4a3422',
    board: '#1f150d',
    primary: '#e8a85a',
    text: '#fff6e8',
    muted: '#c9b298',
    ghostOk: '#c8e6a855',
    ghostBad: '#ff6b6b44',
  },
  /** 따뜻한 나무 블록 그림. color 인덱스는 이 목록을 순환한다. */
  blockTextures: [
    'assets/블록/17-연한나무판.png',
    'assets/블록/18-진한나무판.png',
    'assets/블록/19-통나무단면.png',
    'assets/블록/20-쪽매나무.png',
    'assets/블록/21-소용돌이나무.png',
  ],
  blockColors: [
    { fill: '#d4a574', edge: '#e8c49a', deep: '#8b5a2b' },
    { fill: '#a67c52', edge: '#c49a6c', deep: '#6b4423' },
    { fill: '#c4a484', edge: '#dcc4a4', deep: '#7a5638' },
    { fill: '#8b6914', edge: '#b8943d', deep: '#5c4510' },
    { fill: '#b8860b', edge: '#daa520', deep: '#7a5a08' },
    { fill: '#cd853f', edge: '#deb887', deep: '#8b5a2b' },
    { fill: '#96694a', edge: '#b88968', deep: '#5e3f2a' },
    { fill: '#a0522d', edge: '#c07848', deep: '#6b3410' },
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
