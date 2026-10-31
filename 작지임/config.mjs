/** 탕탕특공대 — 수치·스킬·팔레트. 여기를 바꾸면 난이도와 빌드가 달라집니다. */
export const CONFIG = {
  title: '탕탕특공대',
  width: 480,
  height: 680,
  duration: 240,
  gemLifetime: 90,
  worldSize: 2200,
  player: {
    radius: 16,
    baseSpeed: 160,
    maxHp: 120,
    pickup: 110,
    magnetBonus: 45,
    invulnAfterHit: 0.8,
  },
  // 체력을 깎아 쓰는 강력한 한 방. Space / OP 버튼으로 발동.
  opBlast: {
    hpCost: 40,
    cooldown: 7,
    damage: 220,
    radius: 230,
    knockback: 140,
    invuln: 1.1,
    button: { x: 402, y: 592, r: 38 },
  },
  // 러쉬: 플레이어 주변에 같은 종류 적이 한꺼번에 몰려옴
  rush: {
    stages: [
      { at: 45, count: 20, label: '러쉬 1단계' },
      { at: 110, count: 30, label: '러쉬 2단계' },
      { at: 185, count: 66, label: '러쉬 3단계' },
    ],
    radiusMin: 150,
    radiusMax: 240,
  },
  // 30초마다 등장하는 체력 많은 거대 개체
  giant: {
    interval: 30,
    firstAt: 30,
    hp: 2800,
    radius: 48,
    speed: 38,
    damage: 50,
    xp: 48,
  },
  xp: {
    base: 12,
    perLevel: 12,
  },
  limits: {
    weapons: 4,
    passives: 4,
  },
  palette: {
    background: '#2a1f18',
    surface: '#3b2c22',
    primary: '#ffd166',
    accent: '#ef476f',
    cool: '#06d6a0',
    text: '#fff4e6',
    groundA: '#3a2a1f',
    groundB: '#4a3426',
  },
};

/** type: weapon | passive — evolveWith는 돌파에 필요한 패시브 id */
export const SKILLS = {
  kunai: {
    id: 'kunai',
    name: '쿠나이',
    type: 'weapon',
    max: 5,
    color: '#9ad0ff',
    desc: '가까운 적에게 수리검을 날립니다.',
    evolveWith: 'drink',
    evolveName: '유령 수리검',
    evolveDesc: '관통·유도되는 강력한 수리검',
  },
  molotov: {
    id: 'molotov',
    name: '화염병',
    type: 'weapon',
    max: 5,
    color: '#ff8a5c',
    desc: '발밑에 불꽃 장판을 만듭니다.',
  },
  drone: {
    id: 'drone',
    name: '드론',
    type: 'weapon',
    max: 5,
    color: '#70e0ff',
    desc: '주변을 돌며 적을 향해 쏜다.',
  },
  lightning: {
    id: 'lightning',
    name: '번개',
    type: 'weapon',
    max: 5,
    color: '#ffe66d',
    desc: '가까운 적에게 연쇄 번개를 칩니다.',
  },
  saw: {
    id: 'saw',
    name: '회전톱',
    type: 'weapon',
    max: 5,
    color: '#c7f0ff',
    desc: '몸 주위를 도는 톱날로 벤다.',
  },
  drink: {
    id: 'drink',
    name: '에너지 드링크',
    type: 'passive',
    max: 5,
    color: '#ff6b9d',
    desc: '이동 속도가 빨라집니다. 쿠나이 돌파에 필요.',
  },
  vit: {
    id: 'vit',
    name: '체력 강화',
    type: 'passive',
    max: 5,
    color: '#7bed9f',
    desc: '최대 체력과 회복이 늘어납니다.',
  },
  power: {
    id: 'power',
    name: '공격력 강화',
    type: 'passive',
    max: 5,
    color: '#ffa502',
    desc: '모든 공격 피해가 커집니다.',
  },
  magnet: {
    id: 'magnet',
    name: '자석',
    type: 'passive',
    max: 5,
    color: '#a29bfe',
    desc: '경험치 보석을 멀리서 끌어옵니다.',
  },
  cooldown: {
    id: 'cooldown',
    name: '쿨다운 감소',
    type: 'passive',
    max: 5,
    color: '#74b9ff',
    desc: '무기 공격 주기가 짧아집니다.',
  },
};

export const WEAPON_IDS = Object.keys(SKILLS).filter((id) => SKILLS[id].type === 'weapon');
export const PASSIVE_IDS = Object.keys(SKILLS).filter((id) => SKILLS[id].type === 'passive');
