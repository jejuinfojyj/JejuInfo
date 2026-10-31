/** 판 크기·보석 색·레벨·토끼 왕국 꾸미기 비용을 여기서 바꿉니다. */
export const CONFIG = {
  title: '그냥게임',
  gridSize: 8,
  cell: 48,
  boardGap: 4,
  boardX: 36,
  boardY: 118,
  colorCount: 6,
  width: 480,
  height: 720,
  storageKey: 'pinkbunny-match-progress-v1',
  palette: {
    background: '#5a2748',
    surface: '#8a3d66',
    board: '#3d1832',
    primary: '#ffb6d9',
    accent: '#ff8fb8',
    text: '#fff5fb',
    muted: '#f0c4d8',
    danger: '#ff6b9d',
  },
  gemColors: [
    { id: 'rose', fill: '#ff6b9d', edge: '#ffb3d1', deep: '#d6336c', label: '장미 토끼' },
    { id: 'blush', fill: '#ff9ecd', edge: '#ffd0e8', deep: '#e64980', label: '복숭아 토끼' },
    { id: 'lavender', fill: '#d0a5ff', edge: '#e8d0ff', deep: '#9b59d0', label: '라벤더 토끼' },
    { id: 'cream', fill: '#ffd6e8', edge: '#fff0f7', deep: '#f783ac', label: '크림 토끼' },
    { id: 'candy', fill: '#ff85c2', edge: '#ffc2e0', deep: '#c2255c', label: '캔디 토끼' },
    { id: 'cherry', fill: '#ff4d8a', edge: '#ff99bb', deep: '#a61e4d', label: '체리 토끼' },
  ],
};

/** 레벨별 이동 수와 목표. type: collect(색 모으기) | clear(특수 발동 횟수) */
export const LEVELS = [
  {
    id: 1,
    moves: 22,
    goals: [{ type: 'collect', color: 0, need: 18 }],
    blurb: '같은 토끼 3개 이상을 맞춰 장미 토끼를 모아요.',
  },
  {
    id: 2,
    moves: 24,
    goals: [
      { type: 'collect', color: 1, need: 16 },
      { type: 'collect', color: 2, need: 16 },
    ],
    blurb: '복숭아 토끼와 라벤더 토끼를 함께 모아요.',
  },
  {
    id: 3,
    moves: 26,
    goals: [
      { type: 'collect', color: 3, need: 20 },
      { type: 'clear', special: 'rocket', need: 2 },
    ],
    blurb: '4개를 맞춰 로켓을 만들고 써 보세요.',
  },
  {
    id: 4,
    moves: 26,
    goals: [
      { type: 'collect', color: 4, need: 18 },
      { type: 'clear', special: 'bomb', need: 2 },
    ],
    blurb: 'L·T 모양으로 폭탄을 만들고 터뜨려요.',
  },
  {
    id: 5,
    moves: 28,
    goals: [
      { type: 'collect', color: 5, need: 22 },
      { type: 'clear', special: 'propeller', need: 2 },
    ],
    blurb: '2×2 네모로 프로펠러를 띄워 보세요.',
  },
  {
    id: 6,
    moves: 30,
    goals: [
      { type: 'collect', color: 0, need: 15 },
      { type: 'collect', color: 1, need: 15 },
      { type: 'clear', special: 'disco', need: 1 },
    ],
    blurb: '5개를 맞춰 디스코 볼을 완성해요.',
  },
  {
    id: 7,
    moves: 28,
    goals: [
      { type: 'collect', color: 2, need: 24 },
      { type: 'collect', color: 3, need: 24 },
    ],
    blurb: '남은 별로 토끼 왕국도 꾸며 보세요.',
  },
  {
    id: 8,
    moves: 32,
    goals: [
      { type: 'collect', color: 4, need: 20 },
      { type: 'collect', color: 5, need: 20 },
      { type: 'clear', special: 'rocket', need: 3 },
    ],
    blurb: '로켓·폭탄을 조합해 한 번에 많이 지워요.',
  },
];

/** 별로 사는 토끼 왕국 꾸미기 목록 */
export const DECORATIONS = [
  { id: 'banner', name: '분홍 깃발', cost: 2, order: 1 },
  { id: 'garden', name: '당근 꽃밭', cost: 3, order: 2 },
  { id: 'fountain', name: '딸기 분수', cost: 4, order: 3 },
  { id: 'gate', name: '토끼 구멍 문', cost: 5, order: 4 },
  { id: 'tower', name: '귀 탑', cost: 6, order: 5 },
  { id: 'throne', name: '토끼 왕좌', cost: 8, order: 6 },
];

export function boardPixelSize() {
  const { gridSize, cell, boardGap } = CONFIG;
  return gridSize * cell + (gridSize - 1) * boardGap;
}

export function boardOrigin() {
  return { x: CONFIG.boardX, y: CONFIG.boardY };
}
