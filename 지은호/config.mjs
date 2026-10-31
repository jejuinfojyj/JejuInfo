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
    baseSpeed: 168,
    maxHp: 145,
    pickup: 120,
    magnetBonus: 45,
    invulnAfterHit: 0.9,
  },
  xp: {
    base: 10,
    perLevel: 10,
  },
  /** 레벨이 10의 배수일 때 보스 등장. 초반(Lv.10)은 약하게 */
  levelBoss: {
    every: 10,
  },
  limits: {
    weapons: 4,
    passives: 4,
  },
  /** 맵에 떨어져 게임을 쉽게 해 주는 도우미 아이템 */
  helpItems: {
    life: 28,
    dropChance: 0.22,
    eliteDropChance: 0.55,
    bossDropChance: 1,
    spawnEvery: 18,
    maxOnMap: 8,
  },
  palette: {
    background: '#1a2430',
    surface: '#243445',
    primary: '#ffd166',
    accent: '#ef476f',
    cool: '#06d6a0',
    text: '#f8f4e8',
    groundA: '#1e2d3a',
    groundB: '#243646',
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

/** kind: 맵에서 주우면 바로 효과가 나는 쉬운 아이템 */
export const HELP_ITEMS = {
  heart: {
    id: 'heart',
    name: '회복 하트',
    color: '#ff6b81',
    label: '♥',
    desc: '체력을 많이 회복해요',
  },
  shield: {
    id: 'shield',
    name: '보호 방패',
    color: '#74b9ff',
    label: '방',
    desc: '잠깐 동안 피해를 안 받아요',
  },
  magnetOrb: {
    id: 'magnetOrb',
    name: '자석 구슬',
    color: '#a29bfe',
    label: '자',
    desc: '근처 경험치 보석을 확 끌어와요',
  },
  speedSoda: {
    id: 'speedSoda',
    name: '스피드 소다',
    color: '#ff6b9d',
    label: '속',
    desc: '잠깐 아주 빠르게 달려요',
  },
  powerCandy: {
    id: 'powerCandy',
    name: '힘 캔디',
    color: '#ffa502',
    label: '힘',
    desc: '잠깐 공격이 세져요',
  },
  boomStar: {
    id: 'boomStar',
    name: '폭발 별',
    color: '#ffe66d',
    label: '★',
    desc: '주변 적을 한 번에 밀어내요',
  },
};

export const HELP_ITEM_IDS = Object.keys(HELP_ITEMS);
