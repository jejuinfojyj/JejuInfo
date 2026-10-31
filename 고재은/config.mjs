// 자주 바꾸는 값을 모아 둔 파일이다. 이름·색·규칙 숫자를 여기서 바꾼다.
export const CONFIG = {
  title: '프리셸 카드 파티',
  palette: { background: '#3d2a1c', primary: '#ffd23f', text: '#fff8e7' },
  table: { felt: '#c4a574', feltDark: '#8b6914', rim: '#6b4423', ink: '#fff8e7' },

  // 하트·다이아=빨강, 클로버·스페이드=검정 — 색종이 시트 색에 맞춰 표시
  suits: {
    hearts: { name: '하트', symbol: '♥', color: 'red', paint: '#e24b3b', sheetRow: 0 },
    diamonds: { name: '다이아', symbol: '♦', color: 'red', paint: '#e8b01c', sheetRow: 1 },
    clubs: { name: '클로버', symbol: '♣', color: 'black', paint: '#2f8f4e', sheetRow: 2 },
    spades: { name: '스페이드', symbol: '♠', color: 'black', paint: '#2a6fbf', sheetRow: 3 },
  },
  suitOrder: ['hearts', 'diamonds', 'clubs', 'spades'],
  rankNames: { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' },

  rules: {
    cascades: 8,
    freecells: 4,
    foundations: 4,
  },

  timing: { flight: 0.28 },

  // 색종이를 오려 붙인 카드 시트 (공용 variants/04_종이공예_겹친면.png)
  IMAGES: {
    cardSheet: 'assets/cards-paper.png',
    cardBack: '',
    table: '',
  },

  // 시트 격자: 4열×5행 (마지막 행은 와일드·뒷면)
  sheet: { cols: 4, rows: 5, blankCol: 0, backCol: 2, backRow: 4 },
};
