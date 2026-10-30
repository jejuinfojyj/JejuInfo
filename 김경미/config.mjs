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
    background: '#3d2440',
    surface: '#5c3a58',
    board: '#2a1830',
    primary: '#ff7eb3',
    text: '#fff5f8',
    muted: '#e0b8c8',
    ghostOk: '#ff9ec855',
    ghostBad: '#ff6b6b44',
  },
  blockColors: [
    { fill: '#ff6b9d', edge: '#ffb0c8', deep: '#c4456a' },
    { fill: '#ff9f43', edge: '#ffc078', deep: '#c46f1f' },
    { fill: '#ffe066', edge: '#fff3a3', deep: '#c4a820' },
    { fill: '#ff85c8', edge: '#ffc2e0', deep: '#c44f8a' },
    { fill: '#c084fc', edge: '#e0b0ff', deep: '#7c3aed' },
    { fill: '#74b9ff', edge: '#a5d4ff', deep: '#3b82db' },
    { fill: '#da77f2', edge: '#eebefa', deep: '#9c36b5' },
    { fill: '#fb7185', edge: '#fda4af', deep: '#e11d48' },
  ],
};

/** 조각 목록. 각 칸은 [행, 열]. 플레이 중 90°·180° 회전 가능. */
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

/** 보드와 트레이 사이 회전 버튼 영역 */
export function rotateButtonRects() {
  const y = 478;
  const h = 34;
  const w = 100;
  return {
    rot90: { id: 'rot90', label: '↻ 90°', x: 80, y, w, h },
    rot180: { id: 'rot180', label: '180°', x: 300, y, w, h },
  };
}
