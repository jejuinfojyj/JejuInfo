// 자주 바꾸는 값을 모아 둔 파일이다. 이름·색·규칙 숫자·AI 성격·속도를 여기서 바꾼다.
export const CONFIG = {
  title: '우노 카드 파티',
  palette: { background: '#0b3d2e', primary: '#ffd23f', text: '#fff8e7' },
  table: { felt: '#17805a', feltDark: '#0a3f2c', rim: '#6b4423', ink: '#fff8e7' },

  cardColors: { red: '#e53935', yellow: '#fbc02d', green: '#43a047', blue: '#1e88e5', wild: '#1d1d1f' },
  colorNames: { red: '빨강', yellow: '노랑', green: '초록', blue: '파랑' },

  // 첫 번째는 항상 나(사람)다. 2~4명까지 쓸 수 있고, 자리는 인원에 맞춰 자동으로 정해진다.
  // skill: 0~1, 높을수록 전략대로 낸다. unoChance: 1장 남았을 때 우노를 잊지 않고 외칠 확률.
  // iconColor: 팀 아이콘은 동물 그림 없이 이 색깔 동그라미로만 구분한다.
  players: [
    { name: '나', kind: 'me', iconColor: '#ffd23f' },
    { name: '빨강', kind: 'red', iconColor: '#e53935', skill: 0.55, unoChance: 0.7 },
    { name: '노랑', kind: 'yellow', iconColor: '#fbc02d', skill: 0.75, unoChance: 0.8 },
    { name: '파랑', kind: 'blue', iconColor: '#1e88e5', skill: 0.95, unoChance: 0.9 },
  ],

  rules: {
    handSize: 7, // 처음 나눠 주는 카드 수
    targetWins: 3, // 라운드를 이 횟수만큼 이기면 무조건 최종 우승 (포인트제 아님)
    maxHand: 24, // 이 장수를 초과하면(25장 이상) 그 사람은 라운드 패배
    unoPenalty: 2, // 우노를 안 외치다 걸리면 뽑는 카드 수
    aiCatchDelay: 2.2, // 내가 우노를 안 외치면 AI가 지적하기까지 걸리는 시간(초)
    catchWindow: 3, // AI가 우노를 잊었을 때 내가 '지적!'을 누를 수 있는 시간(초)
    aiCatchChance: 0.4, // 아무도 지적하지 않았을 때 다른 AI가 대신 지적할 확률
    points: { action: 20, wild: 50 }, // 숫자 카드는 적힌 숫자만큼 (표시용)
  },

  ai: { dangerCards: 2 }, // 다음 사람 카드가 이 수 이하이면 공격 카드를 우선한다

  timing: { humanDelay: 0.45, aiThink: 0.95, aiDrawn: 0.6, pass: 0.9, flight: 0.35, roundEndDelay: 1.4 },

  // 그림 파일로 바꾸고 싶으면 source/assets 폴더에 PNG를 넣고 경로를 적는다. 비우면 코드로 그린다.
  // cardBack: 세로 2:3 비율(240×360 권장), table: 480×800 세로 그림, avatars: 정사각형 투명 PNG(128×128 권장)
  IMAGES: { cardBack: '', table: './assets/table-bg.png', avatars: { rabbit: '', bear: '', fox: '' } },
};
