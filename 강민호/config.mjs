export const CONFIG = {
  title: 'Snake.io',
  width: 480,
  height: 680,
  viewWidth: 430,
  world: 2200,
  margin: 52,
  baseSpeed: 158,
  boostSpeed: 276,
  turn: 7.4,
  minLength: 72,
  startLength: 120,
  maxLength: 860,
  boostInterval: 0.18,
  boostCost: 10,
  startBots: 6,
  maxBots: 10,
  botEvery: 18,
  foodCount: 150,
  specialCount: 4,
  maxFoods: 240,
  palette: {
    background: '#1a2e22',
    surface: '#2a4634',
    primary: '#e8c98a',
    text: '#f3efe4',
  },
  skins: [
    { id: 'sky', name: '하늘 반짝', color: '#6aa8c4' },
    { id: 'mint', name: '민트', color: '#6fad7f' },
    { id: 'orange', name: '오렌지', color: '#d4895a' },
    { id: 'purple', name: '보라', color: '#9a84b8' },
    { id: 'pink', name: '분홍', color: '#d4899c' },
  ],
  playerArt: {
    snake: './assets/snake-sky.png',
    eyes: './assets/eyes-sky.png',
    color: '#6aa8c4',
  },
  botColors: ['#c56b6b', '#d2b56a', '#6f8fbf', '#c98a5c', '#8a74a8', '#5f9e9a', '#c9b56a', '#b86f7c', '#6fa87a', '#c47d4e'],
  botNames: ['코코', '루비', '하늘봇', '별이', '콩이', '두리', '초코', '나리', '뽀송', '젤리', '모아', '하루'],
  foodColors: ['#8fbf5a', '#6aa8c4', '#d4899c', '#d2b56a', '#c56b6b'],
};

export function controlLayout() {
  const stick = { x: 96, y: CONFIG.height - 88, grab: 120, travel: 52, base: 54 };
  return {
    stick,
    boost: { x: CONFIG.width - 168, y: stick.y + stick.base - 78, w: 148, h: 84 },
  };
}
