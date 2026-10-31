/** 쿠키·펫·보물·모드·점수 수치를 여기서 바꿉니다. */
export const CONFIG = {
  title: '쿠키런 오븐브레이크',
  width: 780,
  height: 440,
  groundY: 320,
  runnerX: 120,
  baseSpeed: 420,
  gravity: 2100,
  jumpVelocity: -720,
  slideDuration: 0.55,
  maxHp: 3,
  jellyScore: 80,
  coinScore: 40,
  palette: {
    background: '#2a1520',
    skyTop: '#5b2a3a',
    skyBottom: '#f4a574',
    ground: '#6b3b28',
    groundTop: '#c47a45',
    surface: '#3d1f2c',
    primary: '#ffb347',
    accent: '#ff6b9d',
    text: '#fff6e8',
    muted: '#e8c4b0',
    danger: '#ff5a5a',
    shield: '#7ad7ff',
    jelly: '#ff5ec8',
    coin: '#ffd447',
  },
};

export const COOKIES = [
  {
    id: 'butter',
    name: '솜사탕 마동석',
    color: '#ffb7d5',
    icing: '#fff0f8',
    hair: '#ff8ec8',
    ability: 'airSmash',
    blurb: '이단 점프 + 공중 강타로 장애 파괴',
  },
  {
    id: 'choco',
    name: '초코 마동석',
    color: '#6b3a2a',
    icing: '#d9895b',
    hair: '#3d2118',
    ability: 'chargeBreak',
    blurb: '주기적으로 초코 돌진해 앞 장애 파괴',
    chargeCooldown: 4.5,
  },
  {
    id: 'milk',
    name: '우유 마동석',
    color: '#e8d8c8',
    icing: '#f5f0e6',
    hair: '#5a4638',
    ability: 'ironBash',
    blurb: '보호막으로 부딪히면 장애물 박살',
    shieldCooldown: 8,
  },
  {
    id: 'lemon',
    name: '번개 마동석',
    color: '#f0d060',
    icing: '#fff8b0',
    hair: '#6b5420',
    ability: 'powerSmash',
    blurb: '몸통박치기·슬라이드로 장애 파괴',
  },
];

export const PETS = [
  {
    id: 'jellycat',
    name: '젤리냥',
    color: '#ff7eb9',
    effect: 'magnet',
    blurb: '근처 젤리를 끌어당김',
    magnetRange: 110,
  },
  {
    id: 'shieldmon',
    name: '방패몽',
    color: '#7ad7ff',
    effect: 'petShield',
    blurb: '일정 시간마다 보호막',
    cooldown: 10,
  },
  {
    id: 'starcandy',
    name: '별사탕',
    color: '#ffd447',
    effect: 'scorePulse',
    blurb: '주기적으로 보너스 점수',
    cooldown: 7,
    amount: 500,
  },
  {
    id: 'bombpig',
    name: '폭탄피그',
    color: '#ff8a65',
    effect: 'blast',
    blurb: '앞쪽 장애물을 주기적으로 폭파',
    cooldown: 9,
    range: 160,
  },
];

export const COMBOS = [
  {
    cookieId: 'butter',
    petId: 'jellycat',
    name: '솜사탕 젤리비',
    blurb: '점프할 때마다 작은 젤리비',
    effect: 'jumpJelly',
  },
  {
    cookieId: 'choco',
    petId: 'starcandy',
    name: '초코 폭풍',
    blurb: '점수 배율 +35%',
    effect: 'scoreStorm',
    mult: 1.35,
  },
  {
    cookieId: 'milk',
    petId: 'shieldmon',
    name: '철벽 마동석',
    blurb: '보호막 지속 + 피격 무시 1회',
    effect: 'ironWall',
  },
  {
    cookieId: 'lemon',
    petId: 'bombpig',
    name: '번개 폭파',
    blurb: '폭파 범위와 빈도 강화',
    effect: 'megaBlast',
  },
];

export const TREASURES = [
  { id: 'sweetBoost', name: '달콤부스터', blurb: '전체 점수 +20%', effect: 'scorePct', value: 0.2 },
  { id: 'hammer', name: '장애부수개', blurb: '충돌 시 장애 1회 파괴', effect: 'breakOnHit', value: 1 },
  { id: 'magnetBand', name: '자석팔찌', blurb: '젤리 자석 범위 확대', effect: 'magnetPlus', value: 70 },
  { id: 'bandage', name: '응급붕대', blurb: '체력 +1', effect: 'extraHp', value: 1 },
  { id: 'speedShoes', name: '스피드슈즈', blurb: '이동 속도 +12%', effect: 'speedPct', value: 0.12 },
  { id: 'goldOven', name: '골드오븐', blurb: '코인·자원 점수 2배', effect: 'coinDouble', value: 2 },
];

export const MODES = [
  {
    id: 'arena',
    name: '경기장',
    blurb: '다른 마동석과 실시간 점수 경쟁! 60초 안에 더 높은 점수를 노려 봐.',
    duration: 60,
  },
  {
    id: 'pack',
    name: '떼탈출',
    blurb: '마동석 3명이 이어 달려. 쓰러지면 다음 마동석이 이어받고 자원을 모은다.',
    cookieCount: 3,
  },
  {
    id: 'challenge',
    name: '마동석의 도전',
    blurb: '지정된 마동석과 펫만으로 목표 점수에 도전하고 보상을 받아.',
    targetScore: 12000,
    fixedCookieId: 'choco',
    fixedPetId: 'starcandy',
  },
  {
    id: 'story',
    name: '스토리 모드',
    blurb: '오븐 왕국의 에피소드를 따라가며 목표를 달성해.',
  },
];

export const STORY_EPISODES = [
  {
    id: 'ep1',
    title: '1. 오븐에서 탈출',
    text: '뜨거운 오븐이 문을 열었어! 젤리를 모으며 앞으로 달려.',
    targetScore: 5000,
    duration: 45,
    cookieId: 'butter',
    petId: 'jellycat',
  },
  {
    id: 'ep2',
    title: '2. 수호의 방패',
    text: '어두운 통로에는 장애물이 가득해. 보호막으로 헤쳐 나가자.',
    targetScore: 8000,
    duration: 50,
    cookieId: 'milk',
    petId: 'shieldmon',
  },
  {
    id: 'ep3',
    title: '3. 번개의 결전',
    text: '마지막 관문이야. 번개와 폭파로 길을 열고 고득점을 노려!',
    targetScore: 12000,
    duration: 55,
    cookieId: 'lemon',
    petId: 'bombpig',
  },
];
