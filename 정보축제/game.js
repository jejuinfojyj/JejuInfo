'use strict';
// 픽셀 아트 생성 유틸리티
const PX = (() => {
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }

  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function shade(c, k) {
    const f = v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
    return '#' + hex(c).map(f).join('');
  }

  function fromRows(rows, pal) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const [c, g] = canvas(w, h);
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) {
        const col = pal[r[x]];
        if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    });
    return c;
  }

  function outline(src, color = '#2a1a2e') {
    const w = src.width + 2, h = src.height + 2;
    const [c, g] = canvas(w, h);
    g.drawImage(src, 1, 1);
    const img = g.getImageData(0, 0, w, h), d = img.data;
    const a = new Uint8ClampedArray(d);
    const [r, gg, b] = hex(color);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (a[i + 3] > 0) continue;
        let n = false;
        if (x > 0 && a[i - 4 + 3] > 0) n = true;
        else if (x < w - 1 && a[i + 4 + 3] > 0) n = true;
        else if (y > 0 && a[i - w * 4 + 3] > 0) n = true;
        else if (y < h - 1 && a[i + w * 4 + 3] > 0) n = true;
        if (n) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function flip(src) {
    const [c, g] = canvas(src.width, src.height);
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }

  function tint(src, color) {
    const [c, g] = canvas(src.width, src.height);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function rect(g, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function px(g, x, y, col) {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function ellipse(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      let x0 = null, x1 = null;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) { if (x0 === null) x0 = x; x1 = x; }
      }
      if (x0 !== null) g.fillRect(x0, y, x1 - x0 + 1, 1);
    }
  }

  // 아래쪽 절반 타원 (그릇 모양)
  function halfEllipse(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let y = Math.floor(cy); y <= Math.ceil(cy + ry); y++) {
      let x0 = null, x1 = null;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) { if (x0 === null) x0 = x; x1 = x; }
      }
      if (x0 !== null) g.fillRect(x0, y, x1 - x0 + 1, 1);
    }
  }

  function diamond(g, cx, cy, r, c1, c2) {
    for (let dy = -r; dy <= r; dy++) {
      const w = r - Math.abs(dy);
      rect(g, cx - w, cy + dy, w * 2 + 1, 1, dy < 0 ? c1 : c2);
    }
  }

  function make(w, h, fn, ol = true) {
    const [c, g] = canvas(w, h);
    fn(g);
    return ol ? outline(c) : c;
  }

  const urlCache = new Map();
  function url(c) {
    if (!urlCache.has(c)) urlCache.set(c, c.toDataURL());
    return urlCache.get(c);
  }

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return n >>> 0;
  }

  return { canvas, hex, shade, fromRows, outline, flip, tint, rect, px, ellipse, halfEllipse, diamond, make, url, rng, hash };
})();

'use strict';
// 게임 데이터 정의

const ING = {
  mushroom: { name: '버섯', desc: '던전 초입에서 나는 고소한 버섯', price: 8 },
  jelly:    { name: '슬라임 젤리', desc: '새콤달콤 탱글탱글한 젤리', price: 8 },
  sugar:    { name: '설탕 결정', desc: '젤리 동굴의 반짝이는 단맛', price: 6 },
  meat:     { name: '햄 고기', desc: '햄 멧돼지에게서 얻은 두툼한 고기', price: 12 },
  chili:    { name: '불꽃 고추', desc: '입에서 불이 나는 매운 향신료', price: 15 },
  berry:    { name: '던전 베리', desc: '보랏빛 새콤한 열매', price: 7 },
  water:    { name: '깨끗한 샘물', desc: '모든 요리의 기본', price: 3 },
  herb:     { name: '향긋한 허브', desc: '풍미를 살려주는 잎사귀', price: 6 },
  milk:     { name: '우유', desc: '마을 목장의 신선한 우유', price: 10 },
  egg:      { name: '달걀', desc: '마을 닭이 낳은 달걀', price: 8 },
  flour:    { name: '밀가루', desc: '빵과 반죽의 기본', price: 6 },
  rice:     { name: '쌀', desc: '윤기 흐르는 마을 쌀', price: 8 },
  bubble:   { name: '버블 버섯', desc: '화산 온천에서 자라는 공기방울 버섯', price: 18 },
  crab:     { name: '게살', desc: '꼬마 게의 부드러운 살', price: 20 },
  seaweed:  { name: '반짝 해초', desc: '심해에서 빛나는 해초', price: 12 },
  lobster:  { name: '킹 랍스터 살', desc: '전설의 레시피에 필요한 최고급 재료', price: 120 },
};

const BUFFS = {
  atk:         { name: '공격력 증가', desc: '공격력 +50%', color: '#e04a3a' },
  def:         { name: '방어력 증가', desc: '받는 피해 -30%', color: '#4a7ad8' },
  spd:         { name: '이동속도 증가', desc: '이동속도 +30%', color: '#e8b020' },
  regen:       { name: '체력 재생', desc: '초당 HP 2 회복', color: '#4ab04a' },
  fireRes:     { name: '화염 저항', desc: '화염 피해 -70%, B3 화산 진입 가능', color: '#ff8a30' },
  waterBreath: { name: '수중 호흡', desc: 'B4 심해 둥지 진입 가능', color: '#3aa0e8' },
  legend:      { name: '전설의 맛', desc: '모든 능력 대폭 상승', color: '#a050e0' },
};

const RECIPES = [
  { id: 'mush_soup', name: '고소한 버섯 스프', ing: ['mushroom', 'water'], price: 30, heal: 30, buff: 'regen', dur: 60,
    tpl: 'bowl', c1: '#d8b070', c2: '#8a5030', hint: '버섯을 물에 푹 끓인 기본 스프' },
  { id: 'pudding', name: '탱글 젤리 푸딩', ing: ['jelly', 'milk', 'sugar'], price: 45, heal: 20, buff: 'spd', dur: 90,
    tpl: 'pudding', c1: '#ffd860', c2: '#a05a20', hint: '젤리에 우유와 단맛을 더한 디저트' },
  { id: 'omelet', name: '버섯 오믈렛', ing: ['egg', 'mushroom'], price: 35, heal: 35,
    tpl: 'omelet', c1: '#ffd84a', c2: '#d0402a', hint: '달걀로 무언가를 폭신하게 감싼 요리' },
  { id: 'ade', name: '베리 젤리 에이드', ing: ['berry', 'jelly', 'water'], price: 40, heal: 15, buff: 'spd', dur: 120,
    tpl: 'glass', c1: '#b05ad8', c2: '#ff7eb6', hint: '보랏빛 열매로 만든 시원한 음료' },
  { id: 'steak', name: '허브 햄 스테이크', ing: ['meat', 'herb'], price: 60, heal: 45, buff: 'def', dur: 120,
    tpl: 'steak', c1: '#a0482a', c2: '#5ab04a', hint: '두툼한 고기에 향긋한 잎을 곁들인 요리' },
  { id: 'bingsu', name: '시원한 젤리 빙수', ing: ['jelly', 'water', 'sugar'], price: 50, heal: 10, buff: 'fireRes', dur: 150,
    tpl: 'bingsu', c1: '#ff7eb6', c2: '#7ad8ff', hint: '몸을 차갑게 식혀주는 디저트. 화산 공략의 열쇠!' },
  { id: 'pancake', name: '폭신 팬케이크', ing: ['flour', 'egg', 'milk'], price: 40, heal: 25,
    tpl: 'pancake', c1: '#e8a850', c2: '#fff0a0', hint: '마을 재료 3가지로 굽는 아침 메뉴' },
  { id: 'berrypie', name: '던전 베리 파이', ing: ['berry', 'flour', 'sugar'], price: 55, heal: 25, buff: 'regen', dur: 90,
    tpl: 'pie', c1: '#d89850', c2: '#8a3ac0', hint: '열매를 반죽에 넣고 달콤하게 구운 디저트' },
  { id: 'bulgogi', name: '매콤한 버섯 불고기', ing: ['meat', 'mushroom', 'chili'], price: 90, heal: 40, buff: 'atk', dur: 150,
    tpl: 'plate', c1: '#b8402a', c2: '#e8b070', hint: '고기, 버섯, 그리고 화끈한 무언가' },
  { id: 'chili_stir', name: '불꽃 고추 볶음', ing: ['chili', 'meat'], price: 65, heal: 30, buff: 'atk', dur: 90,
    tpl: 'plate', c1: '#e0402a', c2: '#ffb040', hint: '고기를 매운 향신료로 볶아낸 요리' },
  { id: 'risotto', name: '버블 버섯 리조또', ing: ['bubble', 'rice', 'water'], price: 80, heal: 30, buff: 'waterBreath', dur: 150,
    tpl: 'bowl', c1: '#f0ead0', c2: '#5ab0ff', hint: '공기방울 버섯으로 물속에서 숨쉬게 해주는 요리' },
  { id: 'seaweed_salad', name: '반짝 해초 샐러드', ing: ['seaweed', 'herb'], price: 50, heal: 25, buff: 'regen', dur: 120,
    tpl: 'salad', c1: '#3aa060', c2: '#a0ff80', hint: '심해의 빛나는 잎으로 만든 샐러드' },
  { id: 'crab_rice', name: '게살 볶음밥', ing: ['crab', 'rice', 'egg'], price: 110, heal: 50, buff: 'def', dur: 150,
    tpl: 'rice', c1: '#ffd860', c2: '#ff7050', hint: '바다의 살과 쌀, 달걀을 함께 볶은 요리' },
  { id: 'legend', name: '전설의 랍스터 테르미도르', ing: ['lobster', 'milk', 'herb'], price: 500, heal: 999, buff: 'legend', dur: 300,
    tpl: 'legend', c1: '#e8402a', c2: '#ffd040', legendary: true, hint: '전설의 레시피. 킹 랍스터 크랩을 쓰러뜨려야 한다' },
];

const MYSTERY = { id: 'mystery', name: '정체불명의 요리', ing: [], price: 5, heal: 5, tpl: 'mystery', hint: '' };

function recipeById(id) {
  if (id === 'mystery') return MYSTERY;
  return RECIPES.find(r => r.id === id) || MYSTERY;
}

function matchRecipe(ings) {
  const key = ings.slice().sort().join('+');
  return RECIPES.find(r => r.ing.slice().sort().join('+') === key) || null;
}

const MONS = {
  mush:   { name: '버섯돌이', hp: 24, dmg: 6, spd: 32, r: 7, drops: [['mushroom', 1, 1, 2], ['herb', 0.25, 1, 1]], gold: [1, 3] },
  slime:  { name: '슬라임 젤리', hp: 18, dmg: 5, spd: 0, r: 7, drops: [['jelly', 1, 1, 2], ['sugar', 0.45, 1, 1]], gold: [1, 2] },
  boar:   { name: '햄 멧돼지', hp: 40, dmg: 10, spd: 30, r: 8, drops: [['meat', 1, 1, 2]], gold: [2, 5] },
  lizard: { name: '불꽃 고추 도마뱀', hp: 36, dmg: 8, spd: 40, r: 8, drops: [['chili', 1, 1, 2], ['meat', 0.3, 1, 1]], gold: [3, 6] },
  crab:   { name: '꼬마 게', hp: 45, dmg: 10, spd: 45, r: 7, drops: [['crab', 1, 1, 1], ['seaweed', 0.3, 1, 1]], gold: [3, 7] },
  boss:   { name: '킹 랍스터 크랩', hp: 650, dmg: 14, spd: 26, r: 20, drops: [['lobster', 1, 2, 2], ['crab', 1, 2, 3]], gold: [150, 200] },
};

const GATHER = {
  mushroom_patch: { name: '버섯 군락', drop: ['mushroom', 1, 2] },
  berry_bush:     { name: '베리 덤불', drop: ['berry', 1, 3] },
  spring:         { name: '맑은 샘물', drop: ['water', 2, 3] },
  herb:           { name: '허브 풀', drop: ['herb', 1, 2] },
  sugar_crystal:  { name: '설탕 결정', drop: ['sugar', 1, 2] },
  chili_plant:    { name: '불꽃 고추 나무', drop: ['chili', 1, 2] },
  bubble_shroom:  { name: '버블 버섯', drop: ['bubble', 1, 2] },
  seaweed:        { name: '반짝 해초', drop: ['seaweed', 1, 2] },
};

const ZONES = [
  null,
  { name: 'B1 버섯 숲', theme: 'forest', req: null,
    mons: { mush: 6, slime: 3 }, gather: { mushroom_patch: 3, berry_bush: 2, spring: 2, herb: 2 } },
  { name: 'B2 젤리 동굴', theme: 'jelly', req: null,
    mons: { slime: 6, boar: 4 }, gather: { sugar_crystal: 3, spring: 2, berry_bush: 2, herb: 1 } },
  { name: 'B3 불꽃 고추 화산', theme: 'volcano', req: 'fireRes', lava: true,
    mons: { lizard: 6, boar: 2 }, gather: { chili_plant: 4, bubble_shroom: 3, herb: 1 } },
  { name: 'B4 심해 해초 둥지', theme: 'sea', req: 'waterBreath', boss: true,
    mons: { crab: 4 }, gather: { seaweed: 4, spring: 1 } },
];

const SHOP = {
  ingredients: [['milk', 15], ['egg', 12], ['flour', 10], ['rice', 12], ['sugar', 10], ['water', 5]],
  weapon: { names: ['나무 뒤집개', '강철 뒤집개', '셰프의 식칼', '미스릴 식칼', '전설의 식칼'], cost: [0, 80, 220, 480, 1000] },
  pan:    { names: ['낡은 프라이팬', '무쇠 프라이팬', '구리 프라이팬', '미스릴 프라이팬'], cost: [0, 100, 260, 600] },
  tool:   { names: ['기본 냄비', '구리 냄비', '장인의 웍', '황금 조리도구'], cost: [0, 120, 300, 700] },
  hpMax: 5,
  decor: [
    { id: 'table', name: '테이블 추가', desc: '손님 좌석 +1 (최대 6석)', cost: [100, 180, 300, 450], max: 4 },
    { id: 'plant', name: '화분 장식', desc: '팁 +10%', cost: [80], max: 1 },
    { id: 'rug', name: '포근한 카펫', desc: '손님 인내심 +12초', cost: [120], max: 1 },
    { id: 'painting', name: '요리 명화', desc: '팁 +15%', cost: [200], max: 1 },
    { id: 'chandelier', name: '반짝 샹들리에', desc: '요리 판매가 +15%', cost: [350], max: 1 },
    { id: 'sign', name: '황금 간판', desc: '손님 방문 빈도 증가', cost: [250], max: 1 },
  ],
};

const TIPS = [
  '요리 품질(★)이 높을수록 손님이 돈을 더 내고, 버프도 오래 간다냥.',
  '우클릭이나 Space로 프라이팬 방패를 들면 앞에서 날아오는 불꽃과 거품을 막을 수 있다냥.',
  '조리도구를 강화하면 타이밍 판정 구간이 넓어진다냥. 잡화점에 가 보거라.',
  '레스토랑 인테리어를 꾸미면 팁이 오르고 손님이 더 자주 온다냥.',
  '이상한 조합으로 요리하면 정체불명의 요리가 나온다냥. 먹어보면... 글쎄다냥?',
  '채집 포인트는 커서를 올리고 클릭하면 된다냥. 던전에 다시 들어가면 다시 자란다냥.',
];

'use strict';
// 모든 도트 스프라이트 생성
const SPR = {};

(function () {
  const E = PX.ellipse, R = PX.rect, P = PX.px, HE = PX.halfEllipse;

  // ---------------- 캐릭터 ----------------
  // 방향(down/up/side) x 프레임으로 그리는 사람 캐릭터 (16x26, 외곽선 후 18x28, 발바닥 = 25행)
  const CHEF_PAL = {
    hat: true, hair: '#7a4a2a', hairL: '#a06a3a', hairD: '#5a3418',
    skin: '#f7cfa0', skinD: '#e0aa7a', eye: '#2a1a2e', cheek: '#f29a9a', mouth: '#c0504a',
    scarf: '#e04a3a', scarfD: '#b0322a', coat: '#f8f5ee', coatD: '#d8d0c0', coatS: '#bfb6a6',
    btn: '#d0a040', belt: '#8a5a30', pants: '#3e4f86', pantsD: '#2c3866', boot: '#6a4228', bootD: '#4a2c1a',
  };
  const opt = (g, x, y, w, h, c) => { if (c) R(g, x, y, w, h, c); };

  function paintHuman(g, dir, f, pal, idle) {
    const walk = !idle;
    const oy = walk ? f % 2 : f;
    const L = walk ? [0, 1, 0, -1][f] : 0;
    const side = dir === 'side';

    // 다리 (발 기준선 24행, 앞발 +1 / 뒷발 -1)
    if (!side) {
      for (const [x, s] of [[5, L], [9, -L]]) {
        const len = 3 + s;
        R(g, x, 21, 2, len, pal.pants);
        P(g, x + 1, 21, pal.pantsD);
        R(g, x, 21 + len, 2, 1, s < 0 ? pal.bootD : pal.boot);
        if (s > 0) P(g, x, 21 + len, PX.shade(pal.boot, 1.3));
      }
    } else {
      const s = L * 2;
      R(g, 7 - s, 21, 2, 3 - Math.abs(L), pal.pantsD); R(g, 7 - s, 24 - Math.abs(L), 3, 1, pal.bootD);
      R(g, 7 + s, 21, 2, 3, pal.pants); R(g, 7 + s, 24, 3, 1, pal.boot);
    }

    // 몸통 + 팔
    const ty = 16 + oy;
    if (!side) {
      const lh = L > 0 ? 1 : 0, rh = L < 0 ? 1 : 0;
      R(g, 2, ty, 2, 4 - lh, pal.coatD); R(g, 2, ty + 4 - lh, 2, 1, pal.skin);
      R(g, 12, ty, 2, 4 - rh, pal.coatD); R(g, 12, ty + 4 - rh, 2, 1, pal.skin);
      R(g, 4, ty, 8, 5 - oy, pal.coat); R(g, 10, ty, 2, 5 - oy, pal.coatD);
      if (dir === 'down') {
        if (pal.btn) { P(g, 6, ty + 1, pal.btn); P(g, 9, ty + 1, pal.btn); P(g, 6, ty + 3, pal.btn); P(g, 9, ty + 3, pal.btn); }
        else R(g, 6, ty, 4, 1, PX.shade(pal.coat, 0.85));
      } else R(g, 7, ty + 1, 1, 3, pal.coatD);
      opt(g, 4, ty + 4 - oy, 8, 1, pal.belt);
      if (pal.scarf) {
        R(g, 5, ty - 1, 6, 2, pal.scarf); R(g, 5, ty, 6, 1, pal.scarfD);
        if (dir === 'down') { R(g, 9, ty + 1, 2, 2, pal.scarf); P(g, 10, ty + 2, pal.scarfD); }
        else { R(g, 7, ty + 1, 2, 3, pal.scarf); P(g, 8, ty + 3, pal.scarfD); }
      }
    } else {
      R(g, 7 - L * 2, ty, 2, 4, pal.coatS); R(g, 7 - L * 2, ty + 4, 2, 1, pal.skinD);
      R(g, 5, ty, 6, 5 - oy, pal.coat); R(g, 5, ty, 1, 5 - oy, pal.coatD);
      opt(g, 5, ty + 4 - oy, 6, 1, pal.belt);
      if (pal.btn) { P(g, 10, ty + 1, pal.btn); P(g, 10, ty + 3, pal.btn); }
      if (pal.scarf) {
        R(g, 6, ty - 1, 5, 2, pal.scarf); R(g, 6, ty, 5, 1, pal.scarfD);
        R(g, 4, ty, 2, 1, pal.scarf); P(g, 3, ty + 1 - (walk ? f % 2 : 0), pal.scarf);
      }
      const ax = 7 + L * 2;
      R(g, ax, ty, 2, 4, pal.coatD); R(g, ax + 1, ty, 1, 3, pal.coat); R(g, ax, ty + 4, 2, 1, pal.skin);
    }

    // 머리
    const hy = 11 + oy;
    if (dir === 'down') {
      E(g, 8, hy, 5, 4.3, pal.skin);
      R(g, 3, hy - 3, 10, 2, pal.hair); R(g, 3, hy - 1, 1, 3, pal.hair); R(g, 12, hy - 1, 1, 3, pal.hair);
      P(g, 5, hy - 1, pal.hair); P(g, 6, hy - 1, pal.hair); P(g, 10, hy - 1, pal.hair); P(g, 4, hy - 3, pal.hairL); P(g, 5, hy - 3, pal.hairL);
      R(g, 5, hy, 2, 2, pal.eye); R(g, 9, hy, 2, 2, pal.eye); P(g, 5, hy, '#ffffff'); P(g, 9, hy, '#ffffff');
      P(g, 4, hy + 2, pal.cheek); P(g, 11, hy + 2, pal.cheek);
      R(g, 7, hy + 2, 2, 1, pal.mouth);
    } else if (dir === 'up') {
      E(g, 8, hy, 5, 4.3, pal.hair);
      E(g, 6.5, hy - 1.5, 2.5, 1.6, pal.hairL);
      R(g, 6, hy + 3, 4, 1, pal.hairD);
      P(g, 2, hy + 1, pal.skinD); P(g, 13, hy + 1, pal.skinD);
    } else {
      E(g, 8.5, hy, 4.6, 4.3, pal.skin);
      E(g, 6, hy - 0.5, 3, 3.6, pal.hair); R(g, 4, hy - 3, 8, 2, pal.hair); P(g, 11, hy - 1, pal.hair); P(g, 10, hy - 1, pal.hair);
      P(g, 5, hy - 3, pal.hairL); P(g, 4, hy - 1, pal.hairL);
      P(g, 7, hy + 1, pal.skinD);
      R(g, 10, hy, 1, 2, pal.eye);
      P(g, 13, hy + 1, pal.skin);
      P(g, 10, hy + 2, pal.cheek); P(g, 12, hy + 2, pal.mouth);
    }

    // 모자 / 머리 윗부분
    const hx = side ? 8.5 : 8, bx = side ? 4 : 3;
    if (pal.hat) {
      E(g, hx, 3.5 + oy, 5.5, 3.5, '#ffffff');
      E(g, hx - 3, 4.5 + oy, 2.6, 2.2, '#ffffff'); E(g, hx + 3, 4.5 + oy, 2.6, 2.2, '#ffffff');
      E(g, hx + 2, 5 + oy, 3, 1.4, '#e4e7f1');
      P(g, hx - 3, 2 + oy, '#ffffff'); P(g, hx - 2, 1 + oy, '#ffffff');
      R(g, bx, 6 + oy, 10, 2, '#eceef5'); R(g, bx, 7 + oy, 10, 1, '#c8ccdc');
      if (dir === 'down') P(g, 8, 6 + oy, '#e04a3a');
    } else {
      E(g, hx, hy - 3, 5.3, 3.2, pal.hair);
      E(g, hx - 1.5, hy - 4.5, 2.4, 1.1, pal.hairL);
      if (dir === 'up') R(g, 4, hy - 1, 8, 3, pal.hair);
    }
  }

  function humanSet(pal) {
    const set = {};
    for (const dir of ['down', 'up', 'side']) {
      set[dir] = {
        walk: [0, 1, 2, 3].map(f => PX.make(16, 26, g => paintHuman(g, dir, f, pal, false))),
        idle: [0, 1].map(f => PX.make(16, 26, g => paintHuman(g, dir, f, pal, true))),
      };
    }
    set.right = set.side;
    set.left = { walk: set.side.walk.map(PX.flip), idle: set.side.idle.map(PX.flip) };
    return set;
  }

  const CAT_PAL = {
    W: '#ffffff', w: '#d6d9e8', o: '#f0a040', O: '#c87a28', e: '#2a1a2e', y: '#fff1d6', n: '#f07a8a',
    k: '#6a4020', A: '#f4f1ea', b: '#d04a3a', r: '#d04a3a',
  };
  const CAT_ROWS = [
    '...WWWWWW...',
    '..WWWWWWWW..',
    '..WWWWWWWW..',
    '.owwwwwwwwo.',
    '.oooOooOooo.',
    '.ooeooooeoo.',
    'kooyynnyyook',
    '..oyyyyyyo..',
    '...oooooo...',
    '..rrrrrrrr..',
    '.AAAAAAAAAA.',
    'oAAAbAAbAAAo',
    '.AAAAAAAAAA.',
    '.AAAAAAAAAAo',
    '..AAAAAAAA.o',
    '..OO....OO..',
  ];

  const VILL_VARIANTS = [
    ['#3a2a1a', '#4a9a5a', '#5a4a3a'], ['#e0c060', '#d06a8a', '#3a4a7a'], ['#a03a2a', '#4a7ac0', '#4a3a2a'],
    ['#6a4aa0', '#e0a040', '#3a3a4a'], ['#2a2a2a', '#8a5ac0', '#6a5a4a'], ['#f0f0f0', '#c04a4a', '#4a4a6a'],
  ];

  // ---------------- 재료 아이콘 ----------------
  const ING_PAINT = {
    mushroom(g) { R(g, 5, 7, 4, 6, '#f3e3c3'); R(g, 5, 11, 4, 2, '#d8c098'); E(g, 7, 6, 6.5, 4, '#c8503a'); E(g, 7, 5, 5, 2.6, '#e46a4a'); R(g, 2, 9, 10, 1, '#9a3a28'); R(g, 4, 3, 2, 2, '#fff'); P(g, 9, 4, '#fff'); P(g, 10, 6, '#fff'); },
    jelly(g) { E(g, 7, 8, 6.5, 5, '#ff6fae'); E(g, 7, 9.5, 5.5, 3, '#e8509a'); E(g, 6, 6.5, 4, 2, '#ff9ccc'); R(g, 3, 5, 2, 2, '#fff'); P(g, 5, 4, '#fff'); },
    sugar(g) { PX.diamond(g, 4, 7, 3, '#ffffff', '#b8d4f0'); PX.diamond(g, 10, 6, 3, '#f0f8ff', '#a8c4e8'); PX.diamond(g, 7, 10, 3, '#ffffff', '#c8dcf0'); },
    meat(g) { R(g, 9, 9, 4, 2, '#f4f0e0'); E(g, 12.5, 8.5, 1.5, 1.5, '#f4f0e0'); E(g, 12.5, 11.5, 1.5, 1.5, '#f4f0e0'); E(g, 6, 7, 5.5, 5, '#c8483a'); E(g, 6, 6.5, 4, 3.4, '#e8706a'); R(g, 4, 4, 2, 1, '#ffb0a0'); P(g, 7, 8, '#fff2ee'); P(g, 5, 9, '#fff2ee'); },
    chili(g) { R(g, 9, 1, 2, 3, '#3a9a3a'); R(g, 8, 3, 4, 1, '#4ab04a'); E(g, 9, 6, 2.6, 2.6, '#e0302a'); E(g, 7.5, 8.5, 2.4, 2.4, '#e0302a'); E(g, 5.5, 10.5, 2, 2, '#e0302a'); E(g, 3.5, 12, 1.4, 1.2, '#e0302a'); P(g, 9, 5, '#ff8a70'); P(g, 8, 7, '#ff8a70'); P(g, 6, 9, '#ff8a70'); },
    berry(g) { R(g, 6, 1, 2, 3, '#3a8a3a'); E(g, 9, 3, 2.5, 1.5, '#5ac04a'); E(g, 4.5, 8, 3, 3, '#7a3ab0'); E(g, 9.5, 8, 3, 3, '#8a4ac8'); E(g, 7, 11, 3, 2.6, '#6a2aa0'); P(g, 3, 7, '#d0a0ff'); P(g, 8, 7, '#d0a0ff'); P(g, 6, 10, '#d0a0ff'); },
    water(g) { for (let y = 1; y < 7; y++) { const w = Math.floor(y / 1.6); R(g, 7 - w, y, w * 2 + 1, 1, '#4aa8f0'); } E(g, 7, 9, 5, 4.5, '#4aa8f0'); E(g, 7.5, 10, 4, 3, '#2a88d8'); R(g, 4, 7, 2, 3, '#c8ecff'); P(g, 5, 6, '#c8ecff'); },
    herb(g) { R(g, 6, 4, 1, 9, '#3a7a2a'); E(g, 4, 5, 2.5, 1.6, '#5ac04a'); E(g, 9, 4, 2.5, 1.6, '#4ab03a'); E(g, 4, 9, 2.5, 1.6, '#4ab03a'); E(g, 9, 8, 2.5, 1.6, '#5ac04a'); E(g, 6.5, 2, 1.5, 1.8, '#7ad85a'); P(g, 3, 5, '#a0f080'); P(g, 9, 8, '#a0f080'); },
    milk(g) { R(g, 4, 4, 6, 9, '#f8f8ff'); R(g, 5, 1, 4, 3, '#f8f8ff'); R(g, 5, 0, 4, 2, '#4a7ad8'); R(g, 4, 7, 6, 3, '#7ab0f0'); P(g, 6, 8, '#fff'); R(g, 9, 4, 1, 9, '#d8d8e8'); },
    egg(g) { E(g, 7, 8, 4.5, 5.5, '#fff4dc'); E(g, 8, 9.5, 3.2, 3.2, '#f0dcb8'); R(g, 5, 5, 2, 2, '#ffffff'); },
    flour(g) { E(g, 7, 9, 5.5, 4.5, '#f0e0c0'); R(g, 3, 4, 8, 6, '#f0e0c0'); R(g, 4, 2, 6, 3, '#e0cca0'); R(g, 4, 4, 6, 1, '#a07a4a'); E(g, 7, 9, 2.5, 2, '#fff8e8'); R(g, 10, 6, 1, 6, '#d8c098'); },
    rice(g) { HE(g, 7, 7, 6, 5.5, '#e8a040'); R(g, 3, 11, 8, 1, '#c07a28'); E(g, 7, 7, 6, 2, '#ffffff'); E(g, 7, 5.5, 4.5, 2.5, '#ffffff'); P(g, 5, 5, '#e0e0ea'); P(g, 8, 4, '#e0e0ea'); P(g, 9, 6, '#e0e0ea'); },
    bubble(g) { R(g, 5, 8, 4, 5, '#e0f0ff'); E(g, 7, 6, 6.5, 4, '#3a8ae0'); E(g, 7, 5, 5, 2.5, '#6ab0ff'); R(g, 2, 9, 10, 1, '#2a5ab0'); E(g, 2.5, 2, 1.5, 1.5, '#c8f0ff'); E(g, 11.5, 1.5, 1.2, 1.2, '#c8f0ff'); P(g, 9, 4, '#fff'); P(g, 4, 5, '#fff'); },
    crab(g) { E(g, 7, 8, 5.5, 4, '#fff0e0'); E(g, 7, 6.5, 5.5, 2.5, '#ff7a50'); R(g, 3, 6, 8, 1, '#ffa080'); P(g, 5, 9, '#f0d8c0'); P(g, 9, 10, '#f0d8c0'); },
    seaweed(g) { for (let y = 1; y < 13; y++) { const o = Math.round(Math.sin(y * 0.8) * 1.5); R(g, 4 + o, y, 2, 1, '#2a9a5a'); R(g, 8 - o, Math.min(12, y + 1), 2, 1, '#3ab86a'); } P(g, 4, 3, '#c0ffd0'); P(g, 9, 6, '#c0ffd0'); P(g, 6, 10, '#fff'); },
    lobster(g) { E(g, 8, 6, 5.5, 5, '#e0402a'); E(g, 7, 5, 3.5, 3, '#ff6a4a'); g.clearRect(9, 0, 6, 4); R(g, 2, 9, 4, 4, '#c0301e'); R(g, 1, 11, 3, 2, '#c0301e'); P(g, 5, 3, '#ffd0c0'); },
  };

  // ---------------- 요리 아이콘 ----------------
  function plate(g, rim = '#f4f4f8', inner = '#dcdce8') { E(g, 8, 11.5, 7.5, 3.5, rim); E(g, 8, 11.5, 5.5, 2.3, inner); }
  function bowl(g, col = '#5a8ad8', rim = '#f0f0ff', soup = '#d8b070') {
    HE(g, 8, 8, 7.5, 6.5, col); R(g, 4, 13, 8, 1, 'rgba(0,0,0,0.25)');
    E(g, 8, 8, 7.5, 2.2, rim); E(g, 8, 8, 6.2, 1.5, soup);
  }
  const DISH_PAINT = {
    bowl(g, r) { bowl(g, '#5a8ad8', '#f0f0ff', r.c1); P(g, 6, 8, r.c2); P(g, 9, 7, r.c2); P(g, 11, 8, r.c2); P(g, 4, 8, '#5ab04a'); },
    pudding(g, r) { plate(g); for (let y = 4; y <= 11; y++) { const w = 6 + Math.floor((y - 4) * 0.6); R(g, 8 - w / 2, y, w, 1, y < 6 ? r.c2 : r.c1); } R(g, 6, 7, 1, 3, '#fff8c0'); E(g, 8, 3, 1.3, 1.3, '#e8303a'); },
    omelet(g, r) { plate(g); E(g, 8, 9.5, 6, 3, r.c1); E(g, 7, 8.5, 4, 1.5, '#ffe890'); for (let i = 0; i < 5; i++) P(g, 5 + i, 8 + (i % 2), r.c2); },
    glass(g, r) { R(g, 4, 4, 8, 11, '#d8f0ff'); R(g, 4, 7, 8, 8, r.c1); R(g, 5, 9, 2, 2, r.c2); R(g, 8, 11, 2, 2, r.c2); R(g, 5, 4, 1, 10, 'rgba(255,255,255,0.6)'); R(g, 9, 0, 1, 7, '#ff5a5a'); E(g, 11.5, 4, 1.8, 1.8, '#8a3ac0'); },
    steak(g, r) { plate(g); E(g, 8, 9.5, 5.5, 3.2, r.c1); E(g, 7.5, 9, 4, 2, '#c0603a'); R(g, 5, 8, 6, 1, '#6a2a1a'); R(g, 5, 10, 6, 1, '#6a2a1a'); R(g, 12, 9, 2, 1, '#f4f0e0'); P(g, 3, 10, r.c2); P(g, 4, 9, r.c2); P(g, 12, 12, r.c2); },
    bingsu(g, r) { HE(g, 8, 9, 7, 5.5, '#b8e0ff'); E(g, 8, 9, 7, 1.5, '#e0f4ff'); E(g, 8, 7, 6, 4, '#ffffff'); E(g, 8, 5.5, 4, 2.5, '#f4faff'); P(g, 6, 4, r.c1); P(g, 7, 5, r.c1); P(g, 9, 6, r.c1); P(g, 10, 5, r.c1); R(g, 4, 7, 2, 2, r.c1); R(g, 10, 8, 2, 2, r.c2); R(g, 7, 2, 2, 2, r.c2); },
    pancake(g, r) { plate(g); for (let i = 0; i < 3; i++) { E(g, 8, 10 - i * 2.2, 5.5, 2, '#b8783a'); E(g, 8, 9.5 - i * 2.2, 5.5, 1.6, r.c1); } R(g, 7, 3, 3, 2, r.c2); R(g, 10, 6, 1, 3, '#d88a20'); R(g, 5, 7, 1, 2, '#d88a20'); },
    pie(g, r) { E(g, 8, 9, 7.5, 5, r.c1); E(g, 8, 8.5, 5.5, 3.5, r.c2); for (let i = 0; i < 3; i++) { R(g, 4 + i * 3, 5, 1, 7, r.c1); } R(g, 3, 8, 11, 1, r.c1); P(g, 6, 7, '#d080ff'); P(g, 10, 9, '#d080ff'); },
    plate(g, r) { plate(g); E(g, 8, 9.5, 5.5, 3, r.c1); E(g, 7, 8.5, 3.5, 1.5, r.c2); P(g, 5, 9, '#5ab04a'); P(g, 9, 8, '#5ab04a'); P(g, 11, 10, '#5ab04a'); P(g, 7, 10, '#ffe060'); },
    salad(g, r) { bowl(g, '#b07a40', '#d8a060', r.c1); E(g, 6, 6.5, 2.5, 2, r.c1); E(g, 10, 6.5, 2.5, 2, '#2a8a50'); E(g, 8, 5.5, 2, 1.8, r.c2); P(g, 5, 6, '#ffffff'); P(g, 11, 6, '#fff'); },
    rice(g, r) { plate(g); E(g, 8, 9, 5.5, 3.5, r.c1); E(g, 7.5, 8, 3.5, 2, '#ffe890'); P(g, 6, 8, r.c2); P(g, 9, 9, r.c2); P(g, 10, 7, r.c2); P(g, 7, 10, '#5ab04a'); P(g, 11, 9, '#5ab04a'); },
    legend(g, r) { E(g, 8, 11.5, 7.5, 3.5, '#ffd040'); E(g, 8, 11.5, 6, 2.5, '#fff4c0'); E(g, 8, 8, 4.5, 3, r.c1); E(g, 8, 7.5, 3, 1.6, '#ff8a6a'); E(g, 3, 6, 2, 2, r.c1); E(g, 13, 6, 2, 2, r.c1); R(g, 4, 7, 2, 1, r.c1); R(g, 11, 7, 2, 1, r.c1); P(g, 7, 4, '#fff8a0'); P(g, 8, 3, '#ffffff'); P(g, 1, 2, '#fff'); P(g, 14, 1, '#fff8a0'); P(g, 12, 3, '#ffffff'); },
    mystery(g) { bowl(g, '#7a6a8a', '#a898b0', '#6a8a3a'); E(g, 6, 6, 1.5, 1.5, '#9ac060'); E(g, 10, 5, 1.2, 1.2, '#9ac060'); P(g, 8, 3, '#b0e080'); P(g, 5, 2, '#b0e080'); },
  };

  // ---------------- 몬스터 ----------------
  function paintSlime(g, f) {
    const cy = f ? 9 : 8, ry = f ? 4.3 : 5, rx = f ? 7.6 : 7;
    E(g, 8, cy, rx, ry, '#ff6fae'); E(g, 8, cy + 1.5, rx - 1, ry - 2, '#e8509a'); E(g, 7.5, cy - 1.5, rx - 2.5, ry - 2.6, '#ff8fc4');
    R(g, 4, cy - 3, 2, 2, '#fff'); P(g, 6, cy - 4, '#fff');
    R(g, 5, cy, 1, 2, '#2a1a2e'); R(g, 10, cy, 1, 2, '#2a1a2e'); P(g, 7, cy + 2, '#2a1a2e'); P(g, 8, cy + 2, '#2a1a2e');
    P(g, 4, cy + 2, '#ff3f80'); P(g, 11, cy + 2, '#ff3f80');
  }
  function paintMush(g, f) {
    const by = f ? -1 : 0;
    R(g, f ? 4 : 5, 14, 3, 2, '#8a5a3a'); R(g, f ? 9 : 8, 14, 3, 2, '#8a5a3a');
    R(g, 4, 8 + by, 8, 6, '#f6e6c6'); R(g, 4, 12 + by, 8, 2, '#e0c8a0');
    R(g, 6, 9 + by, 1, 2, '#2a1a2e'); R(g, 9, 9 + by, 1, 2, '#2a1a2e'); P(g, 5, 11 + by, '#f29a9a'); P(g, 10, 11 + by, '#f29a9a');
    E(g, 8, 5.5 + by, 7.5, 4.5, '#d0503a'); E(g, 8, 4.5 + by, 6, 3, '#e8684a'); R(g, 2, 8 + by, 12, 1, '#a83a2a');
    R(g, 4, 2 + by, 2, 2, '#fff'); R(g, 9, 3 + by, 2, 1, '#fff'); P(g, 12, 5 + by, '#fff'); P(g, 6, 6 + by, '#fff');
  }
  function paintLizard(g, f) {
    E(g, 4, 10, 4, 1.6, '#c83a2a'); P(g, 0, 9, '#c83a2a');
    const l = f ? 1 : 0;
    R(g, 7 + l, 11, 2, 3, '#a02a20'); R(g, 12 - l, 11, 2, 3, '#a02a20');
    E(g, 10, 9, 5, 3, '#e04a30'); E(g, 10, 10.5, 4, 1.4, '#ffb060');
    E(g, 15, 7, 4, 3, '#e04a30'); R(g, 16, 5, 2, 2, '#fff'); P(g, 17, 6, '#2a1a2e'); R(g, 17, 8, 2, 1, '#7a1a1a');
    R(g, 11, 4, 5, 1, '#ff8a20'); P(g, 12, 3, '#ffd040'); P(g, 14, 2 + l, '#ffd040'); P(g, 13, 3, '#ff8a20'); P(g, 15, 3, '#ff8a20');
  }
  function paintBoar(g, f) {
    const l = f ? 1 : 0;
    R(g, 5 + l, 11, 2, 3, '#b8606a'); R(g, 9 - l, 11, 2, 3, '#b8606a'); R(g, 12 + l, 11, 2, 3, '#b8606a'); R(g, 15 - l, 11, 2, 3, '#b8606a');
    E(g, 10, 8, 8, 4.5, '#f0a0a0'); E(g, 9, 6.5, 6, 2.5, '#ffc0c0'); R(g, 6, 8, 5, 1, '#fff0f0'); R(g, 10, 10, 4, 1, '#fff0f0');
    E(g, 16, 7, 3.5, 3.5, '#f0a0a0'); E(g, 18.5, 8, 1.8, 1.6, '#e07a8a'); P(g, 19, 8, '#7a2a3a');
    R(g, 14, 2, 2, 2, '#e07a8a'); P(g, 17, 6, '#2a1a2e'); P(g, 18, 10, '#ffffff'); P(g, 1, 6, '#e07a8a'); P(g, 2, 5, '#e07a8a');
  }
  function paintCrab(g, f) {
    const o = f ? 1 : 0;
    for (let i = 0; i < 3; i++) { R(g, 3 + i * 2, 10 + ((i + o) % 2), 1, 2, '#c04a2a'); R(g, 14 - i * 2, 10 + ((i + o) % 2), 1, 2, '#c04a2a'); }
    E(g, 2.5, 5 - o, 2.5, 2.2, '#e0603a'); E(g, 15.5, 5 - o, 2.5, 2.2, '#e0603a'); g.clearRect(1, 2 - o, 2, 2); g.clearRect(15, 2 - o, 2, 2);
    E(g, 9, 8, 6, 3.5, '#e8603a'); E(g, 9, 7, 4, 1.5, '#ff8a5a');
    R(g, 7, 3, 1, 2, '#c04a2a'); R(g, 10, 3, 1, 2, '#c04a2a'); P(g, 7, 2, '#fff'); P(g, 10, 2, '#fff');
    P(g, 8, 9, '#7a1a1a'); P(g, 9, 9, '#7a1a1a');
  }
  function paintBoss(g, f) {
    const o = f ? 2 : 0;
    for (let i = 0; i < 3; i++) { R(g, 14 + i * 4, 28, 2, 8 + (i % 2), '#a83020'); R(g, 36 - i * 4, 28, 2, 8 + ((i + 1) % 2), '#a83020'); }
    R(g, 11, 17, 8, 4, '#c0381e'); R(g, 33, 17, 8, 4, '#c0381e');
    E(g, 8, 13 - o, 8, 6.5, '#d8402e'); E(g, 7, 11 - o, 5, 3.5, '#f06a4a'); g.clearRect(1, 7 - o - (f ? 2 : 0), 7, 3 + (f ? 2 : 0));
    E(g, 44, 13 - o, 8, 6.5, '#d8402e'); E(g, 43, 11 - o, 5, 3.5, '#f06a4a'); g.clearRect(44, 7 - o - (f ? 2 : 0), 7, 3 + (f ? 2 : 0));
    E(g, 26, 23, 13, 10, '#d8402e'); E(g, 26, 20, 10, 6, '#f0604a'); E(g, 26, 29, 9, 3, '#b8301e');
    R(g, 16, 24, 20, 1, '#a82a1a'); R(g, 17, 27, 18, 1, '#a82a1a');
    R(g, 21, 9, 2, 5, '#a83020'); R(g, 29, 9, 2, 5, '#a83020'); E(g, 22, 8, 2.5, 2.5, '#fff'); E(g, 30, 8, 2.5, 2.5, '#fff'); R(g, 22, 8, 1, 2, '#2a1a2e'); R(g, 30, 8, 1, 2, '#2a1a2e');
    for (let i = 0; i < 10; i++) { P(g, 20 - i, 7 - Math.floor(i * 0.7), '#c0381e'); P(g, 32 + i, 7 - Math.floor(i * 0.7), '#c0381e'); }
    R(g, 21, 2, 10, 4, '#ffd040'); P(g, 21, 1, '#ffd040'); P(g, 26, 0, '#ffd040'); P(g, 26, 1, '#ffd040'); P(g, 30, 1, '#ffd040'); R(g, 25, 3, 2, 2, '#e03050'); R(g, 21, 5, 10, 1, '#c89820');
    R(g, 24, 15, 4, 1, '#6a1a10'); P(g, 18, 16, '#ff8a8a'); P(g, 33, 16, '#ff8a8a');
  }

  // ---------------- 채집 포인트 ----------------
  const GATHER_PAINT = {
    mushroom_patch(g) { E(g, 8, 13, 7, 2, '#3f8a30'); for (const [x, y] of [[4, 8], [9, 6], [12, 9]]) { R(g, x - 1, y, 2, 5, '#f3e3c3'); E(g, x, y, 3, 2, '#c8503a'); P(g, x - 1, y - 1, '#fff'); } },
    berry_bush(g) { E(g, 8, 10, 7.5, 5.5, '#2f7a30'); E(g, 7, 8.5, 5.5, 4, '#3f9a3a'); E(g, 6, 7, 3, 2, '#5ab84a'); for (const [x, y] of [[4, 10], [8, 7], [11, 11], [12, 8], [6, 12], [9, 10]]) { R(g, x, y, 2, 2, '#7a3ab0'); P(g, x, y, '#d0a0ff'); } },
    spring(g) { E(g, 8, 10, 7.5, 4.5, '#8a8a90'); E(g, 8, 10, 6, 3.2, '#3a8ae0'); E(g, 7, 9, 3.5, 1.6, '#6ab8ff'); P(g, 5, 9, '#fff'); P(g, 10, 11, '#c8f0ff'); P(g, 2, 8, '#b0b0b8'); P(g, 13, 11, '#6a6a70'); },
    herb(g) { for (const [x, h] of [[4, 7], [8, 10], [12, 6]]) { R(g, x, 15 - h, 1, h, '#3a7a2a'); E(g, x - 1.5, 15 - h + 1, 2, 1.3, '#5ac04a'); E(g, x + 2, 15 - h + 3, 2, 1.3, '#4ab03a'); } P(g, 8, 4, '#a0f080'); },
    sugar_crystal(g) { const C = ['#ffffff', '#d8ecff', '#a8c8f0']; for (const [x, h, w] of [[4, 8, 2], [8, 12, 3], [12, 7, 2]]) { for (let y = 0; y < h; y++) { const ww = y < 2 ? 1 : w; R(g, x - Math.floor(ww / 2), 15 - h + y, ww, 1, C[y < h / 2 ? 0 : 1]); } R(g, x, 15 - h + 2, 1, h - 3, C[2]); } },
    chili_plant(g) { R(g, 7, 6, 2, 10, '#3a7a2a'); E(g, 8, 6, 6, 4.5, '#3f9a3a'); E(g, 7, 5, 4, 2.5, '#5ab84a'); for (const [x, y] of [[3, 8], [12, 9], [6, 11], [10, 4]]) { R(g, x, y, 2, 3, '#e0302a'); P(g, x, y, '#ff8a70'); } },
    bubble_shroom(g) { E(g, 8, 14, 6, 1.5, '#5a3a3a'); for (const [x, y, r] of [[5, 9, 3], [11, 7, 3.5]]) { R(g, x - 1, y, 2, 15 - y, '#e0f0ff'); E(g, x, y, r, r * 0.65, '#3a8ae0'); P(g, x - 1, y - 1, '#a0d8ff'); } E(g, 3, 3, 1.5, 1.5, '#c8f0ff'); E(g, 13, 2, 1, 1, '#c8f0ff'); E(g, 8, 1.5, 1.2, 1.2, '#c8f0ff'); },
    seaweed(g) { for (const [x0, h, c] of [[4, 12, '#2a9a5a'], [8, 15, '#3ab86a'], [12, 10, '#2a8a4a']]) { for (let y = 0; y < h; y++) { const o = Math.round(Math.sin((y + x0) * 0.7) * 1.2); R(g, x0 + o, 15 - y, 2, 1, c); } } P(g, 8, 3, '#c0ffd0'); P(g, 4, 6, '#c0ffd0'); },
  };

  // ---------------- 던전 타일 ----------------
  const THEMES = {
    forest:  { floor: '#5a8f3e', f2: '#4e7f36', f3: '#6aa04a', wall: '#24401f', wallTop: '#3f6a35', bg: '#16260f', block: 'shroom' },
    jelly:   { floor: '#7a5a8f', f2: '#6a4a7f', f3: '#8f70a8', wall: '#34243f', wallTop: '#5a4070', bg: '#1c1424', block: 'crystal' },
    volcano: { floor: '#5a3a30', f2: '#4a2e26', f3: '#6a463a', wall: '#24140f', wallTop: '#4a2a22', bg: '#140a08', block: 'basalt' },
    sea:     { floor: '#2f5f8f', f2: '#2a5280', f3: '#4a7cae', wall: '#132b44', wallTop: '#1f4466', bg: '#0a1626', block: 'coral' },
  };
  SPR.THEMES = THEMES;

  function floorTile(th, theme, rnd, variant) {
    return PX.make(16, 16, g => {
      R(g, 0, 0, 16, 16, th.floor);
      for (let i = 0; i < 14; i++) P(g, rnd() * 16 | 0, rnd() * 16 | 0, th.f2);
      for (let i = 0; i < 7; i++) P(g, rnd() * 16 | 0, rnd() * 16 | 0, th.f3);
      if (variant === 3) {
        const x = 3 + (rnd() * 9 | 0), y = 4 + (rnd() * 8 | 0);
        if (theme === 'forest') { P(g, x, y, '#8ad860'); P(g, x + 1, y - 1, '#8ad860'); P(g, x + 2, y, '#8ad860'); P(g, x + 5, y + 2, '#ffe060'); }
        else if (theme === 'jelly') { P(g, x, y, '#ffd0f0'); P(g, x + 1, y + 1, '#ff9ad8'); P(g, x + 4, y + 3, '#ffd0f0'); }
        else if (theme === 'volcano') { R(g, x, y, 3, 1, '#9a3a1a'); R(g, x + 2, y + 1, 2, 1, '#9a3a1a'); P(g, x + 3, y + 1, '#ff7a20'); }
        else { R(g, x, y, 3, 2, '#f0d8c8'); P(g, x + 1, y, '#ffffff'); }
      }
    }, false);
  }
  function wallTile(th, theme, rnd) {
    return PX.make(16, 16, g => {
      R(g, 0, 0, 16, 16, th.wall);
      if (theme === 'forest') {
        for (let i = 0; i < 6; i++) E(g, rnd() * 16, rnd() * 16, 3 + rnd() * 2, 2.6, th.wallTop);
        for (let i = 0; i < 5; i++) P(g, rnd() * 16 | 0, rnd() * 16 | 0, '#5a8f45');
      } else {
        for (let y = 0; y < 16; y += 5) {
          R(g, 0, y, 16, 1, 'rgba(0,0,0,0.35)');
          const off = (y / 5) % 2 ? 4 : 0;
          for (let x = off; x < 16; x += 8) R(g, x, y, 1, 5, 'rgba(0,0,0,0.35)');
          R(g, off + 1, y + 1, 5, 1, th.wallTop);
        }
      }
    }, false);
  }
  function blockTile(kind) {
    return PX.make(16, 16, g => {
      if (kind === 'shroom') {
        E(g, 8, 14, 6, 2, 'rgba(0,0,0,0.3)'); R(g, 6, 7, 4, 8, '#e8d8b0'); R(g, 8, 7, 2, 8, '#d0c098');
        E(g, 8, 5, 7.5, 4.5, '#9a4ac8'); E(g, 7, 4, 5, 2.5, '#b86ae0'); R(g, 4, 3, 2, 2, '#f0d8ff'); P(g, 10, 2, '#f0d8ff'); P(g, 12, 5, '#f0d8ff');
      } else if (kind === 'crystal') {
        for (const [x, h, w] of [[4, 9, 3], [9, 14, 4], [13, 7, 2]]) {
          for (let y = 0; y < h; y++) { const ww = y < 2 ? Math.max(1, w - 2) : w; R(g, x - Math.floor(ww / 2), 15 - h + y, ww, 1, y < h * 0.4 ? '#ffd0f0' : '#ff8ad8'); }
          R(g, x, 15 - h + 2, 1, h - 3, '#c050a0');
        }
      } else if (kind === 'basalt') {
        E(g, 8, 9, 7.5, 6.5, '#3a3030'); E(g, 7, 7, 5, 4, '#4f4444'); R(g, 4, 9, 4, 1, '#ff7a20'); R(g, 7, 10, 1, 3, '#ff7a20'); P(g, 11, 6, '#ff9a40'); P(g, 5, 5, '#6a6060');
      } else {
        for (const [x, h, c, t] of [[4, 10, '#ff6a8a', '#ffa0b8'], [9, 14, '#ff8a5a', '#ffc090'], [13, 8, '#e85ab0', '#ff9ad8']]) {
          R(g, x, 16 - h, 2, h, c); R(g, x - 2, 16 - h + 3, 2, 1, c); R(g, x - 2, 16 - h + 1, 1, 2, c); R(g, x + 2, 16 - h + 5, 2, 1, c); R(g, x + 3, 16 - h + 3, 1, 2, c);
          P(g, x, 16 - h, t); P(g, x - 2, 16 - h + 1, t); P(g, x + 3, 16 - h + 3, t);
        }
      }
    }, true);
  }
  function lavaTile(f) {
    return PX.make(16, 16, g => {
      R(g, 0, 0, 16, 16, '#d8401a');
      const rnd = PX.rng(11 + f * 7);
      for (let i = 0; i < 5; i++) E(g, rnd() * 16, rnd() * 16, 2 + rnd() * 2, 1.5 + rnd(), '#ff8a20');
      for (let i = 0; i < 4; i++) P(g, rnd() * 16 | 0, rnd() * 16 | 0, '#ffe060');
    }, false);
  }
  function stairsDown(th) {
    return PX.make(16, 16, g => {
      R(g, 0, 0, 16, 16, th.floor); R(g, 1, 1, 14, 14, '#7a6a5a'); R(g, 2, 2, 12, 12, '#120a10');
      const C = ['#8a7a6a', '#6a5a50', '#4a3e38', '#2e2420'];
      for (let i = 0; i < 4; i++) R(g, 2 + i, 3 + i * 3, 12 - i * 2, 2, C[i]);
    }, false);
  }
  function stairsUp(th) {
    return PX.make(16, 16, g => {
      R(g, 0, 0, 16, 16, th.floor); R(g, 1, 1, 14, 14, '#5a4a3a');
      const C = ['#e8dcc8', '#d0c4ac', '#b8ac94', '#a0947c'];
      for (let i = 0; i < 4; i++) R(g, 2, 2 + i * 3, 12, 3, C[i]);
      R(g, 7, 4, 2, 6, '#3a8a3a'); R(g, 5, 6, 6, 1, '#3a8a3a'); R(g, 6, 5, 4, 1, '#3a8a3a');
    }, false);
  }

  // ---------------- 기타 ----------------
  function weaponSprite(l) {
    return PX.make(5, 16, g => {
      R(g, 2, 10, 1, 6, l >= 4 ? '#ffd040' : '#7a4a24'); R(g, 1, 10, 3, 1, '#5a5a60');
      if (l === 0) { R(g, 0, 1, 5, 8, '#c89a5a'); R(g, 1, 2, 1, 5, '#e8c080'); }
      else if (l === 1) { R(g, 0, 1, 5, 8, '#b8c0c8'); R(g, 0, 1, 1, 8, '#e8f0f8'); P(g, 2, 3, '#3a3a40'); P(g, 2, 5, '#3a3a40'); P(g, 2, 7, '#3a3a40'); }
      else {
        const blade = l === 2 ? '#d8e0e8' : l === 3 ? '#9ae8f8' : '#ffe880';
        R(g, 1, 0, 3, 10, blade); R(g, 1, 1, 1, 9, '#ffffff'); g.clearRect(3, 0, 1, 2);
      }
    }, true);
  }
  function panSprite(l) {
    const cols = [['#4a4a52', '#6a6a74'], ['#2a2a30', '#4a4a56'], ['#b8683a', '#e09060'], ['#5ab8d0', '#a8ecf8']][l] || ['#4a4a52', '#6a6a74'];
    return PX.make(20, 12, g => { R(g, 12, 5, 8, 2, '#5a3a24'); E(g, 6, 6, 6, 5.5, cols[0]); E(g, 6, 5.5, 4.5, 4, cols[1]); P(g, 4, 3, '#ffffff'); }, true);
  }
  function buffIcon(id) {
    const col = BUFFS[id].color;
    return PX.make(10, 10, g => {
      E(g, 5, 5, 5, 5, col);
      const W = '#ffffff';
      if (id === 'atk') { R(g, 5, 1, 1, 5, W); R(g, 3, 6, 5, 1, '#ffe060'); R(g, 5, 7, 1, 2, '#6a3a1a'); }
      else if (id === 'def') { R(g, 3, 2, 5, 4, W); R(g, 4, 6, 3, 1, W); P(g, 5, 7, W); }
      else if (id === 'spd') { for (let i = 0; i < 3; i++) { P(g, 2 + i, 3 + i, W); P(g, 2 + i, 7 - i, W); P(g, 5 + i, 3 + i, W); P(g, 5 + i, 7 - i, W); } }
      else if (id === 'regen') { R(g, 2, 3, 2, 2, W); R(g, 6, 3, 2, 2, W); R(g, 2, 4, 6, 2, W); R(g, 3, 6, 4, 1, W); P(g, 4, 7, W); P(g, 5, 7, W); }
      else if (id === 'fireRes') { R(g, 5, 1, 1, 8, W); R(g, 1, 5, 8, 1, W); P(g, 3, 3, W); P(g, 7, 3, W); P(g, 3, 7, W); P(g, 7, 7, W); }
      else if (id === 'waterBreath') { E(g, 4, 6, 2, 2, W); E(g, 4, 6, 1, 1, col); E(g, 7, 3, 1.4, 1.4, W); }
      else { for (let i = 0; i < 9; i++) P(g, 1 + i, 4, W); R(g, 3, 2, 4, 5, W); P(g, 5, 1, W); P(g, 2, 7, W); P(g, 7, 7, W); }
    }, true);
  }
  function cursorSprites() {
    const pal = { X: '#2a1a2e', W: '#ffffff', Y: '#ffd860' };
    SPR.cursor = {
      arrow: PX.fromRows(['X.......', 'XX......', 'XWX.....', 'XWWX....', 'XWWWX...', 'XWWWWX..', 'XWWWWWX.', 'XWWXXXX.', 'XXX.....'], pal),
      hand: PX.fromRows(['..XX......', '.XWWX.....', '.XWWXXXX..', '.XWWWWWWX.', 'XXWWWWWWWX', 'XWWWWWWWWX', '.XWWWWWWX.', '..XYYYYX..', '..XXXXXX..'], pal),
    };
  }

  SPR.init = function () {
    SPR.chef = humanSet(CHEF_PAL);
    SPR.cat = PX.outline(PX.fromRows(CAT_ROWS, CAT_PAL));
    const catTail = CAT_ROWS.slice(); catTail[13] = '.AAAAAAAAAA.'; catTail[14] = '..AAAAAAAAoo';
    const catBlink = CAT_ROWS.slice(); catBlink[5] = '.ooOooooOoo.';
    SPR.catFrames = [SPR.cat, PX.outline(PX.fromRows(catTail, CAT_PAL)), PX.outline(PX.fromRows(catBlink, CAT_PAL))];
    SPR.villagers = VILL_VARIANTS.map(([hair, shirt, pants]) => humanSet({
      hat: false, hair, hairL: PX.shade(hair, 1.35), hairD: PX.shade(hair, 0.7),
      skin: '#f7cfa0', skinD: '#e0aa7a', eye: '#2a1a2e', cheek: '#f29a9a', mouth: '#c0504a',
      coat: shirt, coatD: PX.shade(shirt, 0.78), coatS: PX.shade(shirt, 0.62),
      pants, pantsD: PX.shade(pants, 0.7), boot: '#4a2a1a', bootD: '#2e1a10',
    }));

    SPR.ing = {};
    for (const id in ING_PAINT) SPR.ing[id] = PX.make(14, 14, ING_PAINT[id]);
    SPR.dish = {};
    for (const r of RECIPES.concat([MYSTERY])) SPR.dish[r.id] = PX.make(16, 16, g => DISH_PAINT[r.tpl](g, r));
    SPR.coin = PX.make(8, 8, g => { E(g, 4, 4, 3.6, 3.6, '#e8a820'); E(g, 4, 4, 2.6, 2.8, '#ffd040'); R(g, 4, 2, 1, 4, '#e8a820'); P(g, 2, 2, '#fff8c0'); });
    SPR.heart = PX.make(7, 6, g => { R(g, 0, 1, 3, 2, '#ff5a7a'); R(g, 4, 1, 3, 2, '#ff5a7a'); R(g, 1, 0, 1, 1, '#ff5a7a'); R(g, 5, 0, 1, 1, '#ff5a7a'); R(g, 1, 3, 5, 1, '#ff5a7a'); R(g, 2, 4, 3, 1, '#ff5a7a'); P(g, 3, 5, '#ff5a7a'); P(g, 1, 1, '#ffd0dc'); });
    SPR.fireball = PX.make(8, 8, g => { E(g, 4, 4, 3.6, 3.6, '#ff5a20'); E(g, 4, 4, 2.2, 2.2, '#ffb030'); P(g, 3, 3, '#fff8a0'); P(g, 4, 3, '#fff8a0'); }, false);
    SPR.bubble = PX.make(9, 9, g => { E(g, 4.5, 4.5, 4, 4, '#4aa8e8'); E(g, 4.5, 4.5, 3, 3, '#bfeaff'); R(g, 2, 2, 2, 1, '#ffffff'); P(g, 2, 3, '#ffffff'); }, false);
    SPR.leaf = PX.make(12, 7, g => { E(g, 6, 3.5, 6, 3, '#5ab83a'); E(g, 5, 2.5, 4, 1.5, '#8ae060'); R(g, 1, 3, 10, 1, '#3a8a2a'); }, true);

    SPR.mon = {};
    const MON_PAINT = { slime: [16, 14, paintSlime], mush: [16, 16, paintMush], lizard: [20, 14, paintLizard], boar: [21, 15, paintBoar], crab: [18, 13, paintCrab], boss: [52, 40, paintBoss] };
    for (const t in MON_PAINT) {
      const [w, h, fn] = MON_PAINT[t];
      const r = [0, 1].map(f => PX.make(w, h, g => fn(g, f)));
      SPR.mon[t] = { r, l: r.map(PX.flip), w: r.map(c => PX.tint(c, '#ffffff')), wl: r.map(c => PX.tint(PX.flip(c), '#ffffff')), o: r.map(c => PX.tint(c, 'rgba(255,120,40,0.6)')), ol: r.map(c => PX.tint(PX.flip(c), 'rgba(255,120,40,0.6)')) };
    }

    SPR.gather = {};
    for (const t in GATHER_PAINT) {
      const on = PX.make(16, 16, GATHER_PAINT[t]);
      SPR.gather[t] = { on, off: PX.tint(on, 'rgba(40,30,30,0.6)'), hi: PX.outline(PX.make(16, 16, GATHER_PAINT[t], false), '#fff8a0') };
    }

    SPR.tiles = {};
    for (const theme in THEMES) {
      const th = THEMES[theme], rnd = PX.rng(theme.length * 99 + 3);
      SPR.tiles[theme] = {
        floor: [0, 1, 2, 3].map(v => floorTile(th, theme, rnd, v)),
        wall: [0, 1].map(() => wallTile(th, theme, rnd)),
        block: blockTile(th.block),
        lava: [lavaTile(0), lavaTile(1)],
        up: stairsUp(th), down: stairsDown(th),
      };
    }

    SPR.weapon = [0, 1, 2, 3, 4].map(weaponSprite);
    SPR.pan = [0, 1, 2, 3].map(panSprite);
    SPR.buff = {};
    for (const id in BUFFS) SPR.buff[id] = buffIcon(id);
    cursorSprites();
  };
})();

'use strict';
// 배경(타이틀, 마을, 레스토랑) 도트 페인터
const SCN = (() => {
  const E = PX.ellipse, R = PX.rect, P = PX.px, HE = PX.halfEllipse;
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const SKY_NIGHT = ['#0f1c58', '#16287a', '#1f3a96', '#2a52b0', '#3a6cc4', '#4f88d4', '#68a4e0', '#88c0ea'];
  const SKY_DAY = ['#2f5cc0', '#3a70d0', '#4a88dc', '#5ea0e6', '#78b8ee', '#96ccf2', '#b4def6'];
  const MT_FAR = { ridge: '#c4e4dc', light: '#8cc0bc', mid: '#6a9eaa', dark: '#56899a' };
  const MT_MID = { ridge: '#b4ec78', light: '#6cc04a', mid: '#3f9445', dark: '#2f7a3a' };
  const MT_NEAR = { ridge: '#8ad85a', light: '#4fa83e', mid: '#2f8a3a', dark: '#236a2e' };

  function sky(w, h, cols) {
    const [c, g] = PX.canvas(w, h);
    const id = g.createImageData(w, h), d = id.data;
    const rgb = cols.map(PX.hex), n = cols.length - 1;
    for (let y = 0; y < h; y++) {
      const t = y / (h - 1) * n, i = Math.min(n - 1, Math.floor(t)), f = t - i;
      for (let x = 0; x < w; x++) {
        const th = (BAYER[y & 3][x & 3] + 0.5) / 16;
        const col = f > th ? rgb[i + 1] : rgb[i];
        const k = (y * w + x) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    return c;
  }

  function stars(g, w, h, rnd, n) {
    for (let i = 0; i < n; i++) P(g, rnd() * w | 0, rnd() * h * (0.3 + rnd() * 0.7) | 0, rnd() < 0.6 ? '#ffffff' : '#bcd0ff');
    for (let i = 0; i < 6; i++) {
      const x = rnd() * w | 0, y = rnd() * h * 0.6 | 0;
      P(g, x, y, '#fff'); P(g, x - 1, y, '#a8c0ff'); P(g, x + 1, y, '#a8c0ff'); P(g, x, y - 1, '#a8c0ff'); P(g, x, y + 1, '#a8c0ff');
    }
  }

  function cloud(w, rnd) {
    const h = Math.round(w * 0.42);
    const [c, g] = PX.canvas(w, h);
    const puffs = [];
    const n = 5 + (rnd() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const r = h * (0.18 + rnd() * 0.2);
      puffs.push([w * 0.2 + rnd() * w * 0.6, h * 0.62 - r * 0.4 - rnd() * h * 0.12, r]);
    }
    puffs.push([w * 0.5, h * 0.55, h * 0.3]);
    for (const [x, y, r] of puffs) E(g, x, y + 2, r * 1.3, r, '#a8c0e8');
    for (const [x, y, r] of puffs) E(g, x, y, r * 1.3, r, '#e2ecff');
    for (const [x, y, r] of puffs) E(g, x - r * 0.3, y - r * 0.35, r * 0.75, r * 0.5, '#ffffff');
    g.clearRect(0, Math.round(h * 0.82), w, h);
    return c;
  }

  function mountains(g, w, baseY, bottom, o, rnd) {
    const peaks = [];
    for (let i = 0; i < o.n; i++) {
      peaks.push({ x: (i + 0.5) * w / o.n + (rnd() - 0.5) * w / o.n * 0.7, h: o.hMin + rnd() * (o.hMax - o.hMin), s: o.sMin + rnd() * (o.sMax - o.sMin) });
    }
    const seed = rnd() * 1000;
    for (let x = 0; x < w; x++) {
      let best = -1e9, bp = peaks[0];
      for (const p of peaks) { const hh = p.h - Math.abs(x - p.x) * p.s; if (hh > best) { best = hh; bp = p; } }
      const noise = Math.sin(x * 0.35 + seed) * 1.0 + Math.sin(x * 0.13 + seed * 1.7) * 1.8;
      const top = Math.round(baseY - Math.max(best, 4) - noise);
      const lit = x < bp.x;
      const hs = PX.hash(x * 13 + (seed | 0));
      const streak = hs % 4 === 0, sl = 4 + (hs >>> 4) % 24;
      let cur = null;
      for (let y = Math.max(0, top); y < bottom; y++) {
        const dy = y - top;
        let col;
        if (lit) col = dy < 2 ? o.ridge : (streak && dy > 3 && dy < sl ? o.mid : o.light);
        else col = dy < 1 ? o.light : (streak && dy > 3 && dy < sl ? o.dark : o.mid);
        if (col !== cur) { g.fillStyle = col; cur = col; }
        g.fillRect(x, y, 1, 1);
      }
    }
  }

  function treeline(g, w, y, rnd, dark, light) {
    for (let x = -6; x < w + 6; x += 6 + rnd() * 5) {
      const r = 4 + rnd() * 5;
      E(g, x, y, r, r * 0.8, dark);
      E(g, x - 1, y - 2, r * 0.65, r * 0.45, light);
    }
  }

  function grass(g, x, y, w, h, rnd) {
    R(g, x, y, w, h, '#5cb043');
    for (let i = 0; i < w * h / 22; i++) {
      const gx = x + rnd() * w | 0, gy = y + rnd() * h | 0;
      const c = rnd() < 0.5 ? '#72c652' : '#4a9a38';
      P(g, gx, gy, c);
      if (rnd() < 0.35) { P(g, gx - 1, gy + 1, c); P(g, gx + 1, gy + 1, c); }
    }
  }

  function dirt(g, x, y, w, h, rnd) {
    R(g, x, y, w, h, '#e2b46c');
    for (let i = 0; i < w * h / 16; i++) P(g, x + rnd() * w | 0, y + rnd() * h | 0, rnd() < 0.5 ? '#cf9c56' : '#f0cc8a');
    for (let xx = x; xx < x + w; xx++) {
      const a = rnd() * 3 | 0, b = rnd() * 3 | 0;
      R(g, xx, y, 1, a, '#5cb043');
      R(g, xx, y + h - b, 1, b, '#5cb043');
    }
  }

  function fence(g, x0, x1, y) {
    R(g, x0, y + 4, x1 - x0, 2, '#b07a40'); R(g, x0, y + 6, x1 - x0, 1, '#6a3a1a');
    R(g, x0, y + 10, x1 - x0, 2, '#b07a40'); R(g, x0, y + 12, x1 - x0, 1, '#6a3a1a');
    for (let x = x0 + 2; x < x1; x += 12) {
      R(g, x, y, 4, 16, '#9a6430'); R(g, x, y, 1, 16, '#c8904a'); R(g, x + 3, y, 1, 16, '#6a3a1a'); R(g, x, y, 4, 1, '#d8a060');
    }
  }

  function tree(g, x, by) {
    E(g, x, by - 1, 12, 3, 'rgba(0,0,0,0.25)');
    R(g, x - 3, by - 24, 7, 24, '#7a4a2a'); R(g, x - 3, by - 24, 2, 24, '#9a6a3a'); R(g, x + 2, by - 24, 2, 24, '#5a3418');
    const blobs = [[0, -40, 17], [-13, -31, 12], [13, -31, 12], [-8, -50, 11], [8, -49, 11], [0, -28, 11]];
    for (const [bx, b, r] of blobs) E(g, x + bx, by + b, r, r * 0.9, '#2a6a2c');
    for (const [bx, b, r] of blobs) E(g, x + bx - 1, by + b - 2, r * 0.82, r * 0.7, '#3f9a3a');
    for (const [bx, b, r] of blobs) E(g, x + bx - 4, by + b - 5, r * 0.4, r * 0.32, '#72c650');
    for (const [ax, ay] of [[-10, -34], [6, -44], [12, -30], [-4, -26], [-14, -46]]) { R(g, x + ax, by + ay, 2, 2, '#e8403a'); P(g, x + ax, by + ay, '#ffa0a0'); }
  }

  function pine(g, x, by, s = 1) {
    R(g, x - 2, by - 12 * s, 4, 12 * s, '#6a3a1a');
    for (let i = 0; i < 4; i++) {
      const ty = by - 10 * s - i * 9 * s, hw = Math.round((15 - i * 3) * s), rows = Math.round(14 * s);
      for (let r = 0; r < rows; r++) {
        const w = Math.max(1, Math.round(hw * (r + 1) / rows));
        R(g, x - w, ty - rows + r, w, 1, '#3a8a4a');
        R(g, x, ty - rows + r, w, 1, '#24603a');
        if (r === rows - 1) { R(g, x - w, ty - 1, w * 2, 1, '#1a4a2c'); }
      }
    }
    P(g, x - 1, by - 10 * s - 3 * 9 * s - 13 * s, '#5ab86a');
  }

  function bush(g, x, by, flower) {
    E(g, x, by - 6, 11, 7, '#2a6a2c'); E(g, x - 1, by - 8, 9, 5, '#3f9a3a'); E(g, x - 4, by - 10, 4, 2, '#72c650');
    if (flower) for (const [fx, fy] of [[-6, -8], [2, -11], [6, -6], [-2, -5], [8, -9]]) { R(g, x + fx, by + fy, 2, 2, flower); P(g, x + fx, by + fy, '#ffffff'); }
  }

  function sunflower(g, x, by, h) {
    R(g, x, by - h, 1, h, '#3a8a2a');
    E(g, x - 3, by - h / 2, 2.5, 1.2, '#4aa03a'); E(g, x + 3, by - h / 2 + 3, 2.5, 1.2, '#4aa03a');
    const cy = by - h;
    E(g, x + 0.5, cy, 4.6, 4.6, '#f0a020'); E(g, x + 0.5, cy - 0.5, 4, 4, '#ffd030');
    E(g, x + 0.5, cy, 2, 2, '#7a4a1a'); P(g, x, cy - 1, '#a87a3a');
  }

  function crop(g, x, y, rnd) {
    const t = rnd();
    if (t < 0.33) { E(g, x, y, 3, 2, '#5ab84a'); E(g, x, y - 1, 2, 1.2, '#8ae060'); }
    else if (t < 0.66) { R(g, x, y - 4, 1, 4, '#3a8a2a'); E(g, x - 1, y - 3, 1.5, 1, '#5ab84a'); E(g, x + 1.5, y - 4, 1.5, 1, '#5ab84a'); E(g, x, y - 5, 1.6, 1.6, '#e04a2a'); }
    else { R(g, x - 1, y - 3, 1, 3, '#4ab03a'); R(g, x + 1, y - 4, 1, 4, '#4ab03a'); E(g, x, y, 2, 1.5, '#f08a20'); }
  }

  function roof(g, cx, ry0, rh, rw, C) {
    for (let i = 0; i < rh; i++) {
      const y = ry0 + i, half = Math.round(4 + (rw - 4) * i / (rh - 1)), row = Math.floor(i / 4), inRow = i % 4;
      for (let x = cx - half; x <= cx + half; x++) {
        const k = (x - cx + 300 + (row % 2) * 3) % 6;
        let col;
        if (x <= cx - half + 1 || x >= cx + half - 1) col = C.edge;
        else if (inRow === 3) col = C.line;
        else if (k === 0) col = C.line;
        else if (inRow === 0) col = C.hi;
        else col = x < cx ? C.l : C.r;
        P(g, x, y, col);
      }
    }
  }

  function house(g, cx, by, gold) {
    const ww = 88, wh = 44, x0 = cx - ww / 2, y0 = by - wh;
    const chx = cx + 24, chy = y0 - 34;
    R(g, chx, chy, 10, 30, '#9a8a7a');
    for (let y = chy; y < chy + 30; y += 4) { R(g, chx, y, 10, 1, '#7a6a5a'); R(g, chx + ((y / 4) % 2 ? 5 : 2), y, 1, 4, '#7a6a5a'); }
    R(g, chx - 1, chy - 3, 12, 3, '#5a4a40');

    R(g, x0, y0, ww, wh, '#b0703c');
    for (let x = x0; x < x0 + ww; x += 6) { R(g, x, y0, 1, wh, '#7a4624'); R(g, x + 1, y0, 1, wh, '#c88a52'); }
    R(g, x0, y0, 3, wh, '#6a3a1c'); R(g, x0 + ww - 3, y0, 3, wh, '#6a3a1c');
    R(g, x0 - 2, by - 5, ww + 4, 5, '#8a8a90'); R(g, x0 - 2, by - 5, ww + 4, 1, '#a8a8b0');
    for (let x = x0 - 2; x < x0 + ww + 2; x += 7) R(g, x, by - 5, 1, 5, '#5a5a62');

    for (const wx of [x0 + 8, x0 + ww - 24]) {
      R(g, wx - 1, y0 + 9, 18, 16, '#5a3418'); R(g, wx, y0 + 10, 16, 14, '#e8d8b0'); R(g, wx + 2, y0 + 12, 12, 10, '#8ad0f8');
      R(g, wx + 2, y0 + 12, 12, 3, '#c4ecff'); R(g, wx + 7, y0 + 12, 2, 10, '#e8d8b0'); R(g, wx + 2, y0 + 16, 12, 1, '#e8d8b0');
      R(g, wx - 2, y0 + 25, 20, 3, '#8a4a24');
      const fl = ['#ff5a7a', '#ffd84a', '#ff8ad8', '#ffffff'];
      for (let i = 0; i < 6; i++) { P(g, wx - 1 + i * 3, y0 + 24, fl[i % 4]); P(g, wx + i * 3, y0 + 23, '#4ab03a'); }
    }
    R(g, cx - 9, by - 30, 18, 25, '#4a2a10'); R(g, cx - 7, by - 28, 14, 23, '#8a4c22');
    for (let y = by - 28; y < by - 5; y += 4) R(g, cx - 7, y, 14, 1, '#6a3816');
    R(g, cx - 1, by - 28, 1, 23, '#5a3014'); R(g, cx + 3, by - 17, 2, 2, '#ffd84a');

    const sc = gold ? '#ffd040' : '#d8a050', sd = gold ? '#a87a10' : '#7a4a20';
    R(g, cx - 16, by - 42, 32, 11, sd); R(g, cx - 15, by - 41, 30, 9, sc);
    R(g, cx - 11, by - 40, 1, 3, '#fff'); R(g, cx - 9, by - 40, 1, 3, '#fff'); R(g, cx - 7, by - 40, 1, 3, '#fff'); R(g, cx - 11, by - 37, 5, 1, '#fff'); R(g, cx - 9, by - 37, 1, 4, '#fff');
    E(g, cx + 9, by - 38.5, 2, 2, '#fff'); R(g, cx + 9, by - 37, 1, 4, '#fff');
    R(g, cx - 3, by - 39, 2, 2, '#e04a3a'); R(g, cx + 1, by - 39, 2, 2, '#e04a3a'); R(g, cx - 3, by - 38, 6, 2, '#e04a3a'); R(g, cx - 2, by - 36, 4, 1, '#e04a3a'); P(g, cx - 1, by - 35, '#e04a3a'); P(g, cx, by - 35, '#e04a3a');
    if (gold) { P(g, cx - 17, by - 44, '#fff'); P(g, cx + 17, by - 44, '#fff'); }

    const rh = 42, rw = ww / 2 + 12, ry0 = y0 - rh + 2;
    roof(g, cx, ry0, rh, rw, { hi: '#ee7a50', l: '#d4532f', r: '#bf4428', line: '#8a2a1a', edge: '#5a1a12' });
    R(g, cx - rw - 1, y0, rw * 2 + 3, 3, '#5a1a12');
    E(g, cx, y0 - 14, 5.5, 5.5, '#5a3418'); E(g, cx, y0 - 14, 4.2, 4.2, '#8ad0f8'); R(g, cx, y0 - 18, 1, 9, '#5a3418'); R(g, cx - 4, y0 - 14, 9, 1, '#5a3418');
    R(g, cx, ry0 - 8, 1, 8, '#3a3a3a'); R(g, cx - 2, ry0 - 10, 5, 2, '#ffffff'); E(g, cx + 0.5, ry0 - 12, 3, 2, '#ffffff'); R(g, cx - 4, ry0 - 6, 9, 1, '#3a3a3a');
    return [chx + 5, chy - 3];
  }

  function cottage(g, cx, by) {
    const ww = 60, wh = 34, x0 = cx - 30, y0 = by - wh;
    const chx = cx - 20, chy = y0 - 26;
    R(g, chx, chy, 8, 22, '#8a7a6a'); R(g, chx - 1, chy - 2, 10, 2, '#5a4a40');
    R(g, x0, y0, ww, wh, '#c8b898');
    const rnd = PX.rng(5);
    for (let y = y0 + 2; y < by - 2; y += 5) {
      for (let x = x0 + ((y / 5 | 0) % 2) * 4; x < x0 + ww - 2; x += 8) {
        R(g, x, y, 7, 4, rnd() < 0.5 ? '#b8a888' : '#d4c4a4'); R(g, x, y + 4, 7, 1, '#9a8a6a');
      }
    }
    E(g, cx + 8, by - 20, 7, 5, '#3a2a5a'); R(g, cx + 1, by - 20, 14, 20, '#3a2a5a');
    E(g, cx + 8, by - 20, 6, 4, '#6a4aa0'); R(g, cx + 2, by - 20, 12, 19, '#6a4aa0'); R(g, cx + 8, by - 22, 1, 21, '#4a3a7a'); P(g, cx + 11, by - 10, '#ffd84a');
    E(g, cx - 14, y0 + 14, 6, 6, '#5a3418'); E(g, cx - 14, y0 + 14, 5, 5, '#ffd890'); R(g, cx - 14, y0 + 9, 1, 10, '#5a3418'); R(g, cx - 19, y0 + 14, 10, 1, '#5a3418');
    const rh = 30, rw = 38;
    roof(g, cx, y0 - rh + 2, rh, rw, { hi: '#8aa8ff', l: '#5a78e0', r: '#4a66c8', line: '#2a3a8a', edge: '#1a2460' });
    R(g, cx - rw - 1, y0, rw * 2 + 3, 2, '#1a2460');
    R(g, x0 + ww + 2, y0 + 2, 1, 8, '#5a3a24'); R(g, x0 + ww - 2, y0 + 2, 6, 1, '#5a3a24');
    E(g, x0 + ww + 2, y0 + 13, 4, 2.4, '#7ab0e0'); P(g, x0 + ww + 6, y0 + 12, '#7ab0e0'); P(g, x0 + ww + 6, y0 + 14, '#7ab0e0'); P(g, x0 + ww, y0 + 12, '#2a1a2e');
    // 바깥 솥단지
    E(g, x0 - 6, by - 6, 7, 6, '#3a3a44'); E(g, x0 - 6, by - 10, 7, 2, '#5a5a66'); E(g, x0 - 6, by - 10, 5.5, 1.3, '#8ad060');
  }

  function shop(g, cx, by) {
    const w = 76, x0 = cx - 38;
    R(g, x0 + 4, by - 50, w - 8, 32, '#8a5a30');
    for (let x = x0 + 4; x < x0 + w - 4; x += 6) R(g, x, by - 50, 1, 32, '#6a4020');
    R(g, x0 + 6, by - 38, w - 12, 2, '#5a3418');
    const jc = ['#e0402a', '#ffd040', '#6ac04a', '#a050e0', '#4aa8f0', '#f08a20', '#ff7eb6'];
    for (let i = 0; i < 7; i++) { R(g, x0 + 8 + i * 9, by - 46, 5, 8, jc[i]); R(g, x0 + 8 + i * 9, by - 47, 5, 2, '#d8c8a8'); P(g, x0 + 9 + i * 9, by - 44, '#ffffff'); }
    R(g, x0 + 1, by - 62, 4, 62, '#6a3a1a'); R(g, x0 + w - 5, by - 62, 4, 62, '#6a3a1a');
    for (let x = x0 - 4; x < x0 + w + 4; x++) { const s = Math.floor((x - x0 + 4) / 8) % 2; R(g, x, by - 68, 1, 12, s ? '#fff0e0' : '#e04a4a'); }
    for (let k = 0; k < (w + 8) / 8; k++) E(g, x0 - 4 + k * 8 + 4, by - 56, 4, 2.6, k % 2 ? '#fff0e0' : '#e04a4a');
    R(g, x0 - 4, by - 69, w + 8, 2, '#a02a2a');
    R(g, x0, by - 22, w, 22, '#b07a40');
    for (let x = x0; x < x0 + w; x += 8) R(g, x, by - 20, 1, 20, '#8a5a2a');
    R(g, x0 - 2, by - 24, w + 4, 3, '#d89a5a'); R(g, x0 - 2, by - 21, w + 4, 1, '#8a5a2a');
    R(g, x0 + 4, by - 30, 17, 7, '#9a6a3a'); for (let i = 0; i < 4; i++) { E(g, x0 + 7 + i * 4, by - 31, 2.2, 2.2, '#e0402a'); P(g, x0 + 6 + i * 4, by - 32, '#ffa0a0'); }
    R(g, x0 + 25, by - 30, 15, 7, '#9a6a3a'); for (let i = 0; i < 3; i++) E(g, x0 + 29 + i * 4, by - 31, 2.4, 2.3, '#6ac04a');
    for (let i = 0; i < 3; i++) { R(g, x0 + 45 + i * 4, by - 31, 3, 7, '#f8f8ff'); R(g, x0 + 45 + i * 4, by - 32, 3, 2, '#4a7ad8'); }
    E(g, x0 + 64, by - 26, 7, 3, '#a8703a'); for (let i = 0; i < 3; i++) E(g, x0 + 61 + i * 3, by - 29, 1.6, 2, '#fff4dc');
    R(g, cx - 16, by - 82, 32, 13, '#7a4a24'); R(g, cx - 15, by - 81, 30, 11, '#f0d8a0');
    E(g, cx - 6, by - 75.5, 3.5, 3.5, '#e8a820'); E(g, cx - 6, by - 75.5, 2.4, 2.4, '#ffd040'); R(g, cx - 6, by - 78, 1, 5, '#e8a820');
    E(g, cx + 6, by - 74.5, 4, 3.4, '#c08a4a'); R(g, cx + 4, by - 79, 4, 2, '#c08a4a'); R(g, cx + 3, by - 78, 6, 1, '#8a5a24');
    R(g, cx - 1, by - 86, 2, 4, '#5a3a24');
  }

  function giantShroom(g, cx, by) {
    E(g, cx, by - 2, 30, 5, 'rgba(0,0,0,0.2)');
    R(g, cx - 22, by - 52, 44, 50, '#f0e0c0'); R(g, cx + 10, by - 52, 12, 50, '#d8c098'); R(g, cx - 22, by - 52, 5, 50, '#fff4dc');
    E(g, cx, by - 4, 26, 6, '#e8d4b0');
    E(g, cx, by - 30, 13, 10, '#8a5a30'); R(g, cx - 13, by - 30, 26, 30, '#8a5a30');
    E(g, cx, by - 30, 10.5, 8, '#22142a'); R(g, cx - 10, by - 30, 21, 30, '#22142a');
    for (let i = 0; i < 5; i++) P(g, cx - 6 + i * 3, by - 20 + (i % 2) * 6, '#6a3aa0');
    R(g, cx - 10, by - 6, 21, 2, '#5a3a2a'); R(g, cx - 12, by - 3, 25, 3, '#7a5a40');
    for (const lx of [cx - 19, cx + 16]) { R(g, lx, by - 34, 1, 6, '#3a2a1a'); R(g, lx - 2, by - 28, 5, 6, '#3a2a1a'); R(g, lx - 1, by - 27, 3, 4, '#ffd860'); E(g, lx, by - 25, 6, 6, 'rgba(255,220,100,0.18)'); }
    E(g, cx, by - 62, 43, 22, '#a8302a'); E(g, cx, by - 65, 40, 18, '#d04a3a'); E(g, cx - 14, by - 74, 13, 5, '#f07a5a');
    E(g, cx, by - 46, 34, 5, '#e8cfa8'); for (let x = cx - 30; x < cx + 30; x += 4) R(g, x, by - 48, 1, 4, '#c8a888');
    for (const [sx, sy, rx, ry] of [[-22, -66, 6, 4], [8, -76, 5, 3.5], [26, -62, 5, 4], [-4, -60, 4, 3], [-32, -56, 3, 2.5], [18, -54, 3, 2]]) E(g, cx + sx, by + sy, rx, ry, '#fff4ea');
    for (let i = 0; i < 12; i++) P(g, cx - 22 + (i % 2) * 2, by - 44 + i * 3, '#4ab03a');
    for (let i = 0; i < 8; i++) P(g, cx + 20 - (i % 2), by - 40 + i * 4, '#4ab03a');
    R(g, cx + 30, by - 20, 2, 20, '#7a4a24'); R(g, cx + 24, by - 26, 15, 9, '#7a4a24'); R(g, cx + 25, by - 25, 13, 7, '#d8a050');
    R(g, cx + 30, by - 24, 2, 3, '#e04a3a'); R(g, cx + 28, by - 21, 6, 1, '#e04a3a'); R(g, cx + 29, by - 20, 4, 1, '#e04a3a');
  }

  function garden(g, x, y, w, h, rnd) {
    R(g, x, y, w, h, '#7a4a28');
    for (let yy = y + 3; yy < y + h - 4; yy += 9) {
      R(g, x + 3, yy, w - 6, 5, '#9a6034'); R(g, x + 3, yy + 5, w - 6, 1, '#5a3418');
      for (let xx = x + 8; xx < x + w - 5; xx += 10) crop(g, xx, yy + 3, rnd);
    }
    R(g, x - 2, y - 3, w + 4, 2, '#b07a40'); R(g, x - 2, y + h + 1, w + 4, 2, '#b07a40');
    for (let xx = x - 2; xx <= x + w; xx += 10) { R(g, xx, y - 6, 3, 10, '#9a6430'); R(g, xx, y + h - 3, 3, 8, '#9a6430'); P(g, xx, y - 6, '#d8a060'); }
  }

  function pond(g, cx, cy) {
    E(g, cx, cy, 50, 22, '#7a7a82'); E(g, cx, cy - 1, 48, 20, '#a8a8b0');
    E(g, cx, cy + 1, 45, 17, '#2a6ab8'); E(g, cx, cy, 43, 15, '#3a8ad8');
    for (const [rx, ry, rw] of [[-24, -5, 10], [6, -8, 14], [-10, 4, 8], [20, 2, 6]]) R(g, cx + rx, cy + ry, rw, 1, '#8ac8ff');
    E(g, cx + 20, cy + 6, 5, 2.6, '#3a9a3a'); E(g, cx - 26, cy + 2, 4, 2, '#3a9a3a'); R(g, cx + 19, cy + 4, 2, 2, '#ff8ad8');
    for (let i = 0; i < 4; i++) { R(g, cx - 40 + i * 2, cy - 10 - i * 2, 1, 6 + i, '#4a9a38'); }
  }

  function title() {
    const rnd = PX.rng(42);
    const skyC = sky(480, 215, SKY_NIGHT);
    stars(skyC.getContext('2d'), 480, 120, rnd, 90);
    const [land, g] = PX.canvas(480, 270);
    mountains(g, 480, 178, 225, Object.assign({ n: 6, hMin: 55, hMax: 88, sMin: 0.75, sMax: 1.15 }, MT_FAR), rnd);
    mountains(g, 480, 196, 230, Object.assign({ n: 6, hMin: 40, hMax: 76, sMin: 0.8, sMax: 1.25 }, MT_MID), rnd);
    mountains(g, 480, 212, 236, Object.assign({ n: 9, hMin: 14, hMax: 32, sMin: 0.45, sMax: 0.8 }, MT_NEAR), rnd);
    treeline(g, 480, 214, rnd, '#25622c', '#3a8a3a');
    grass(g, 0, 214, 480, 30, rnd);
    fence(g, 0, 480, 206);
    dirt(g, 0, 240, 480, 30, rnd);
    tree(g, 62, 240); pine(g, 430, 240);
    bush(g, 22, 242, '#ff6a8a'); bush(g, 150, 242, '#ff6a8a'); bush(g, 340, 242, '#ffd84a'); bush(g, 470, 240, null);
    const ch = house(g, 240, 244, false);
    for (let i = 0; i < 4; i++) crop(g, 168 + i * 9, 262, rnd);
    for (let i = 0; i < 4; i++) crop(g, 292 + i * 9, 264, rnd);
    for (let i = 0; i < 7; i++) sunflower(g, 384 + i * 13, 270, 16 + (i % 3) * 3);
    return { sky: skyC, land, chimney: ch };
  }

  function village(decor) {
    const rnd = PX.rng(77);
    const skyC = sky(480, 125, SKY_DAY);
    const [land, g] = PX.canvas(480, 270);
    mountains(g, 480, 80, 112, Object.assign({ n: 6, hMin: 30, hMax: 58, sMin: 0.8, sMax: 1.2 }, MT_FAR), rnd);
    mountains(g, 480, 96, 116, Object.assign({ n: 6, hMin: 22, hMax: 44, sMin: 0.8, sMax: 1.25 }, MT_MID), rnd);
    mountains(g, 480, 108, 120, Object.assign({ n: 9, hMin: 8, hMax: 18, sMin: 0.45, sMax: 0.8 }, MT_NEAR), rnd);
    treeline(g, 480, 111, rnd, '#25622c', '#3a8a3a');
    grass(g, 0, 111, 480, 159, rnd);
    fence(g, 0, 480, 106);
    tree(g, 24, 150); pine(g, 184, 151, 0.85); bush(g, 276, 150, '#ff6a8a'); bush(g, 382, 150, null);
    const ch = house(g, 110, 150, decor && decor.sign);
    cottage(g, 230, 150);
    shop(g, 330, 150);
    giantShroom(g, 435, 150);
    dirt(g, 0, 151, 480, 27, rnd);
    for (const dx of [110, 238, 330, 435]) R(g, dx - 10, 150, 20, 3, '#e2b46c');
    garden(g, 24, 194, 100, 46, rnd);
    pond(g, 410, 232);
    for (let i = 0; i < 14; i++) sunflower(g, 150 + i * 14, 270, 15 + (i % 3) * 3);
    for (let i = 0; i < 26; i++) {
      const fx = 140 + rnd() * 210 | 0, fy = 185 + rnd() * 55 | 0;
      R(g, fx, fy, 2, 2, ['#ff6a8a', '#ffffff', '#ffd84a', '#a8a0ff'][i % 4]); P(g, fx, fy + 2, '#3a8a2a');
    }
    bush(g, 140, 250, '#ffffff'); bush(g, 352, 252, '#ff6a8a');
    return { sky: skyC, land, chimney: ch };
  }

  // 레스토랑 테이블 좌표 (게임 로직과 공유)
  const TABLES = [[230, 140], [330, 140], [430, 140], [230, 212], [330, 212], [430, 212]];

  function restaurant(decor) {
    const [c, g] = PX.canvas(480, 270);
    const rnd = PX.rng(3);
    for (let x = 0; x < 480; x += 8) { R(g, x, 0, 4, 80, '#f2dcaa'); R(g, x + 4, 0, 4, 80, '#e8cc94'); }
    for (let x = 2; x < 480; x += 16) for (let y = 12; y < 56; y += 14) P(g, x + ((y / 14) % 2) * 8, y, '#d8b070');
    R(g, 0, 0, 480, 6, '#8a5a30'); R(g, 0, 6, 480, 1, '#5a3418');
    R(g, 0, 58, 480, 22, '#a8643a');
    for (let x = 0; x < 480; x += 12) R(g, x, 60, 1, 18, '#7a4424');
    R(g, 0, 58, 480, 2, '#c88a52'); R(g, 0, 78, 480, 2, '#6a3a1c');

    for (const wx of [196, 296, 396]) {
      R(g, wx - 2, 12, 40, 36, '#6a3a1c'); R(g, wx, 14, 36, 32, '#8ad0f8'); R(g, wx, 14, 36, 8, '#c4ecff');
      E(g, wx + 10, 42, 12, 6, '#5ab040'); E(g, wx + 30, 44, 10, 5, '#4a9a38');
      R(g, wx + 17, 14, 2, 32, '#6a3a1c'); R(g, wx, 29, 36, 2, '#6a3a1c');
      R(g, wx - 4, 47, 44, 3, '#8a4a24');
      for (let i = 0; i < 7; i++) P(g, wx - 2 + i * 6, 46, ['#ff5a7a', '#ffd84a', '#ffffff'][i % 3]);
    }
    // 메뉴판
    R(g, 160, 18, 28, 32, '#6a3a1c'); R(g, 162, 20, 24, 28, '#2a3a2e');
    for (let i = 0; i < 5; i++) { R(g, 165, 24 + i * 5, 10 + (i * 7) % 8, 1, '#e8e8d8'); P(g, 181, 24 + i * 5, '#ffd84a'); }

    // 바닥
    for (let y = 80; y < 270; y += 8) {
      const odd = (y / 8) % 2;
      R(g, 0, y, 480, 8, odd ? '#c8884a' : '#bf7f44');
      R(g, 0, y + 7, 480, 1, '#8a5228');
      for (let x = -(odd * 24); x < 480; x += 48) R(g, x, y, 1, 7, '#8a5228');
    }
    for (let i = 0; i < 40; i++) P(g, rnd() * 480 | 0, 82 + rnd() * 186 | 0, '#a86a38');

    if (decor.rug) {
      R(g, 186, 112, 276, 128, '#a83838'); R(g, 190, 116, 268, 120, '#c84a4a'); R(g, 194, 120, 260, 112, '#a83838'); R(g, 196, 122, 256, 108, '#d05a50');
      for (let x = 200; x < 450; x += 12) for (let y = 126; y < 228; y += 12) P(g, x, y, '#ffd860');
    }

    // 주방 카운터
    R(g, 14, 12, 140, 3, '#7a4a24'); R(g, 14, 32, 140, 3, '#7a4a24');
    const jc = ['#e0402a', '#ffd040', '#6ac04a', '#a050e0', '#4aa8f0', '#f08a20', '#ff7eb6', '#f4f4f4'];
    for (let i = 0; i < 14; i++) { const h = 6 + (i * 5) % 5; R(g, 18 + i * 10, 12 - h, 6, h, jc[i % 8]); R(g, 18 + i * 10, 11 - h, 6, 1, '#d8c8a8'); }
    for (let i = 0; i < 6; i++) { E(g, 24 + i * 22, 26, 6, 4, '#9a9aa8'); R(g, 24 + i * 22 - 1, 20, 2, 3, '#5a5a66'); }
    R(g, 12, 66, 144, 8, '#ece4d4'); R(g, 12, 73, 144, 1, '#c8c0b0');
    R(g, 14, 74, 140, 30, '#8a5a30'); for (let x = 14; x < 154; x += 14) R(g, x, 76, 1, 28, '#6a4020');
    R(g, 14, 102, 140, 2, '#5a3418');
    R(g, 36, 66, 48, 8, '#34343c'); E(g, 48, 70, 6, 2.2, '#e04a2a'); E(g, 72, 70, 6, 2.2, '#e04a2a');
    E(g, 48, 64, 9, 5, '#5a5a66'); E(g, 48, 61, 8, 2, '#8a8a96'); E(g, 48, 61, 6.5, 1.3, '#d8b070');
    E(g, 72, 66, 8, 3, '#2a2a30'); R(g, 80, 65, 10, 2, '#5a3a24');
    R(g, 100, 64, 22, 9, '#b8c0c8'); R(g, 102, 66, 18, 5, '#7ab0e0'); R(g, 109, 60, 2, 5, '#9aa0a8');
    R(g, 130, 62, 16, 8, '#e8d8b0'); for (let i = 0; i < 3; i++) E(g, 134 + i * 4, 62, 1.6, 1.6, ['#e0402a', '#ffd040', '#6ac04a'][i]);
    R(g, 84, 76, 12, 22, '#3a3a44'); R(g, 86, 78, 8, 8, '#ff8a30');

    // 출입문
    R(g, 222, 262, 36, 8, '#5a3418'); R(g, 224, 264, 32, 6, '#8a4c22');
    R(g, 226, 250, 28, 10, '#c84a3a'); R(g, 228, 252, 24, 6, '#e06a5a');

    const n = Math.min(6, 2 + decor.table);
    for (let i = 0; i < n; i++) {
      const [tx, ty] = TABLES[i];
      R(g, tx - 26, ty - 8, 8, 12, '#9a5a2a'); R(g, tx - 26, ty - 8, 8, 2, '#c07a40'); R(g, tx - 26, ty + 4, 2, 6, '#6a3a1a'); R(g, tx - 20, ty + 4, 2, 6, '#6a3a1a');
      E(g, tx, ty + 9, 14, 3, 'rgba(0,0,0,0.2)');
      R(g, tx - 1, ty, 3, 9, '#6a3a1a'); R(g, tx - 5, ty + 8, 11, 2, '#6a3a1a');
      E(g, tx, ty, 15, 6.5, '#c83a3a'); E(g, tx, ty - 0.5, 13, 5, '#f8f4ec');
      for (let k = -12; k <= 12; k += 4) P(g, tx + k, ty + 4, '#ffffff');
      R(g, tx + 4, ty - 6, 3, 4, '#a8d8f0'); P(g, tx + 5, ty - 8, '#ff5a7a'); P(g, tx + 4, ty - 7, '#4ab03a');
    }

    if (decor.plant) {
      for (const [px_, py_] of [[24, 248], [460, 110], [460, 252], [176, 104]]) {
        R(g, px_ - 5, py_ - 6, 10, 8, '#b85a3a'); R(g, px_ - 6, py_ - 7, 12, 2, '#d8784a');
        E(g, px_, py_ - 12, 7, 6, '#2f7a30'); E(g, px_ - 1, py_ - 14, 5, 4, '#4aa83a'); P(g, px_ - 3, py_ - 16, '#8ae060');
      }
    }
    if (decor.painting) {
      R(g, 438, 14, 34, 28, '#c8902a'); R(g, 441, 17, 28, 22, '#3a5a8a');
      E(g, 455, 32, 10, 5, '#f4f4f8'); E(g, 455, 29, 6, 3, '#e8402a'); R(g, 441, 17, 28, 6, '#5a7ab0'); P(g, 448, 20, '#ffe060');
    }
    if (decor.sign) {
      R(g, 4, 18, 4, 30, '#ffd040'); R(g, 472, 18, 4, 30, '#ffd040');
    }
    return c;
  }

  return { title, village, restaurant, cloud, TABLES };
})();

'use strict';
// DOM 기반 UI (HUD, 패널, 요리 미니게임, 대화창)
const UI = (() => {
  const $ = id => document.getElementById(id);
  let openKind = null, tab = null, hudT = 0, promptText = null, bossVal = null;
  let dlg = null;
  const cook = { phase: 'select', slots: [null, null, null] };
  let cookCtx = null;

  const img = (c, cls = 'ico') => `<img class="${cls}" src="${PX.url(c)}" alt="">`;
  const ingIcon = id => img(SPR.ing[id]);
  const dishIcon = (id, cls) => img(SPR.dish[id], cls);
  const stars = q => `<span class="stars">${'★'.repeat(q)}<span class="dim">${'★'.repeat(3 - q)}</span></span>`;

  function init() {
    $('panel').addEventListener('click', onPanelClick);
    // 버튼 포커스가 남아 있으면 Space(방패) 입력이 버튼을 다시 누르게 된다
    document.addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.blur(); });
    $('panel').addEventListener('mousedown', e => {
      if (e.target.id === 'cook-cv' && e.button === 0) { e.preventDefault(); cookPress(); }
    });
    $('dialog').addEventListener('click', dialogNext);
    document.querySelectorAll('.hbtn').forEach(b => b.addEventListener('click', () => toggle(b.dataset.act)));
    $('btn-new').addEventListener('click', () => { SFX.init(); Game.newGame(); });
    $('btn-continue').addEventListener('click', () => { SFX.init(); Game.continueGame(); });
    $('btn-help').addEventListener('click', () => { SFX.init(); open('help'); });
    $('btn-continue').disabled = !Game.hasSave();
    $('coin-ico').src = PX.url(SPR.coin);
    // 로고 장식 잎
    const leaves = [[-6, 8, -30], [92, 2, 25], [10, 78, 160], [86, 70, -150]];
    const logo = document.querySelector('.logo');
    for (const [x, y, r] of leaves) {
      const l = document.createElement('img');
      l.src = PX.url(SPR.leaf); l.className = 'leaf';
      l.style.left = x + '%'; l.style.top = y + '%'; l.style.transform = `rotate(${r}deg)`;
      logo.appendChild(l);
    }
    const pc = $('dlg-portrait').getContext('2d');
    pc.imageSmoothingEnabled = false;
    pc.drawImage(SPR.cat, 9, 7);
  }

  function showTitle(b) { $('title-ui').classList.toggle('hidden', !b); if (b) $('btn-continue').disabled = !Game.hasSave(); }
  function showHUD(b) { $('hud').classList.toggle('hidden', !b); }

  function updateHUD(force) {
    hudT -= 1 / 60;
    if (!force && hudT > 0) return;
    hudT = 0.1;
    const G = Game.G; if (!G) return;
    const mh = Game.maxHp();
    $('hp-fill').style.width = Math.max(0, G.hp / mh * 100) + '%';
    $('hp-text').textContent = `${Math.ceil(G.hp)} / ${mh}`;
    $('gold-text').textContent = G.gold;
    $('zone-name').textContent = Game.zoneLabel();
    const html = Object.keys(G.buffs).map(k =>
      `<div class="buff" title="${BUFFS[k].name}: ${BUFFS[k].desc}">${img(SPR.buff[k], '')}<span>${Math.ceil(G.buffs[k])}s</span></div>`).join('');
    const bf = $('buffs');
    if (bf.dataset.h !== html) { bf.innerHTML = html; bf.dataset.h = html; }
  }

  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    const box = $('toasts');
    box.appendChild(t);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  function prompt(text) {
    if (text === promptText) return;
    promptText = text;
    const p = $('prompt');
    if (!text) p.classList.add('hidden');
    else { p.textContent = text; p.classList.remove('hidden'); }
  }

  function bossBar(v) {
    if (v === bossVal) return;
    bossVal = v;
    if (v === null) { $('boss-bar').classList.add('hidden'); return; }
    $('boss-bar').classList.remove('hidden');
    $('boss-fill').style.width = Math.max(0, v * 100) + '%';
  }

  function fade(on) { $('fade').style.opacity = on ? 1 : 0; }

  // ---------------- 패널 ----------------
  function isOpen() { return openKind !== null; }
  function toggle(kind) {
    if (Game.scene() === 'title' && kind !== 'help') return;
    if (openKind === kind) close(); else open(kind);
  }
  function open(kind, t) {
    if (dlg) return;
    if (openKind === 'cook' && (cook.phase === 'heat' || cook.phase === 'flip')) return;
    openKind = kind;
    tab = t || { bag: 'ing', shop: 'buy' }[kind] || null;
    if (kind === 'cook') { cook.phase = 'select'; cook.slots = [null, null, null]; }
    $('panel-bg').classList.remove('hidden');
    render();
    SFX.play('pick');
  }
  function close() {
    if (!openKind) return;
    if (openKind === 'cook' && (cook.phase === 'heat' || cook.phase === 'flip')) return;
    openKind = null;
    $('panel-bg').classList.add('hidden');
    $('panel').innerHTML = '';
    cookCtx = null;
    Game.onPanelClosed();
  }

  function head(title, tabs) {
    let h = `<div class="pn-head"><span class="pn-title">${title}</span><button class="x" data-act="close">닫기 [ESC]</button></div>`;
    if (tabs) h += `<div class="tabs">${tabs.map(([id, label]) => `<button class="tab ${tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}">${label}</button>`).join('')}</div>`;
    return h;
  }

  function render() {
    const p = $('panel');
    p.className = 'pn-' + openKind;
    if (openKind === 'bag') p.innerHTML = renderBag();
    else if (openKind === 'book') p.innerHTML = renderBook();
    else if (openKind === 'shop') p.innerHTML = renderShop();
    else if (openKind === 'help') p.innerHTML = renderHelp();
    else if (openKind === 'cook') renderCook();
  }

  function ingCells(clickAct) {
    const G = Game.G;
    const ids = Object.keys(ING).filter(id => (G.inv[id] || 0) > 0);
    if (!ids.length) return '<div class="empty">재료가 없어요. 던전에서 몬스터를 사냥하고 채집해 보세요!</div>';
    return `<div class="grid">${ids.map(id => `<div class="cell" ${clickAct ? `data-act="${clickAct}" data-arg="${id}"` : ''} title="${ING[id].desc}">
      ${ingIcon(id)}<span class="cnt">${G.inv[id]}</span><div class="nm">${ING[id].name}</div></div>`).join('')}</div>`;
  }

  function dishGroups() {
    const map = new Map();
    for (const d of Game.G.dishes) {
      const k = d.id + '|' + d.q;
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1);
  }

  function effectText(r) {
    if (r.id === 'mystery') return '먹어보기 전엔 알 수 없다...';
    let s = r.heal >= 999 ? 'HP 전부 회복' : `HP +${r.heal}`;
    if (r.buff) s += ` · ${BUFFS[r.buff].name} ${r.dur}초`;
    return s;
  }

  function renderBag() {
    const G = Game.G;
    let body = '';
    if (tab === 'ing') body = ingCells(null);
    else if (tab === 'dish') {
      const groups = dishGroups();
      body = groups.length ? groups.map(([k, n]) => {
        const [id, q] = k.split('|'); const r = recipeById(id);
        return `<div class="row">${dishIcon(id)}<div class="grow"><b>${r.name}</b> ${stars(+q)} <span class="cnt2">x${n}</span>
          <div class="desc">${effectText(r)} · 판매가 ${r.price}G~</div></div>
          <button class="sbtn" data-act="eat" data-arg="${k}">먹기</button></div>`;
      }).join('') : '<div class="empty">만든 요리가 없어요. 레스토랑 주방에서 요리해 보세요!</div>';
    } else {
      const atk = Game.playerAtkBase();
      body = `<div class="row"><img class="ico" src="${PX.url(SPR.weapon[G.up.weapon])}"><div class="grow"><b>무기: ${SHOP.weapon.names[G.up.weapon]}</b><div class="desc">공격력 ${atk}</div></div></div>
        <div class="row"><img class="ico" src="${PX.url(SPR.pan[G.up.pan])}"><div class="grow"><b>방패: ${SHOP.pan.names[G.up.pan]}</b><div class="desc">방패 막기 피해 감소 ${Math.round((0.5 + 0.12 * G.up.pan) * 100)}% · 기본 피해 감소 ${G.up.pan * 5}%</div></div></div>
        <div class="row">${ingIcon('meat')}<div class="grow"><b>최대 체력 ${Game.maxHp()}</b><div class="desc">체력 단련 Lv.${G.up.hp}</div></div></div>
        <div class="row">${dishIcon('mush_soup')}<div class="grow"><b>조리도구: ${SHOP.tool.names[G.up.tool]}</b><div class="desc">타이밍 판정 구간 +${G.up.tool * 15}%</div></div></div>
        <div class="row"><div class="grow"><b>기록</b><div class="desc">요리 ${G.stats.cooked}회 · 서빙 ${G.stats.served}회 · 총 수입 ${G.stats.earned}G · 레시피 ${G.known.length}/${RECIPES.length}</div></div></div>`;
    }
    return head('가방', [['ing', '재료'], ['dish', '요리'], ['stat', '장비/능력치']]) + `<div class="pn-body">${body}</div>`;
  }

  function renderBook() {
    const G = Game.G;
    const cards = RECIPES.map(r => {
      const known = G.known.includes(r.id);
      if (known) {
        return `<div class="rcard ${r.legendary ? 'legend' : ''}">${dishIcon(r.id, 'big')}<div class="rname">${r.name}</div>
          <div class="ings">${r.ing.map(i => `<span title="${ING[i].name}">${ingIcon(i)}</span>`).join('<span class="plus">+</span>')}</div>
          <div class="desc">${effectText(r)}</div><div class="desc">판매가 ${r.price}G</div></div>`;
      }
      return `<div class="rcard unknown ${r.legendary ? 'legend' : ''}"><img class="big" src="${PX.url(PX.tint(SPR.dish[r.id], '#3a2a3a'))}">
        <div class="rname">???</div><div class="desc">재료 ${r.ing.length}가지</div><div class="desc hint">${r.hint}</div></div>`;
    }).join('');
    return head(`레시피 북 (${G.known.length}/${RECIPES.length})`) + `<div class="pn-body"><div class="rgrid">${cards}</div></div>`;
  }

  function renderShop() {
    const G = Game.G;
    let body = '';
    if (tab === 'buy') {
      body = SHOP.ingredients.map(([id, cost]) => `<div class="row">${ingIcon(id)}<div class="grow"><b>${ING[id].name}</b> <span class="cnt2">보유 ${G.inv[id] || 0}</span><div class="desc">${ING[id].desc}</div></div>
        <span class="price">${cost}G</span><button class="sbtn" data-act="buy" data-arg="${id}|1">1개</button><button class="sbtn" data-act="buy" data-arg="${id}|5">5개</button></div>`).join('');
    } else if (tab === 'sell') {
      const ids = Object.keys(ING).filter(id => (G.inv[id] || 0) > 0);
      body = ids.length ? ids.map(id => `<div class="row">${ingIcon(id)}<div class="grow"><b>${ING[id].name}</b> <span class="cnt2">x${G.inv[id]}</span></div>
        <span class="price">${ING[id].price}G</span><button class="sbtn" data-act="sell" data-arg="${id}|1">1개 팔기</button><button class="sbtn" data-act="sell" data-arg="${id}|all">전부</button></div>`).join('')
        : '<div class="empty">팔 재료가 없어요.</div>';
    } else if (tab === 'gear') {
      const up = (kind, names, cost, info) => {
        const lv = G.up[kind];
        const max = lv >= names.length - 1;
        return `<div class="row"><div class="grow"><b>${names[lv]}</b> ${max ? '<span class="max">MAX</span>' : `→ <b class="next">${names[lv + 1]}</b>`}<div class="desc">${info}</div></div>
          ${max ? '' : `<span class="price">${cost[lv + 1]}G</span><button class="sbtn" data-act="upgrade" data-arg="${kind}">강화</button>`}</div>`;
      };
      body = up('weapon', SHOP.weapon.names, SHOP.weapon.cost, `공격력 ${Game.playerAtkBase()} → 강화 시 +6`)
        + up('pan', SHOP.pan.names, SHOP.pan.cost, '프라이팬 방패 막기 성능과 기본 방어력 증가')
        + (() => {
          const lv = G.up.hp, max = lv >= SHOP.hpMax, cost = 120 * (lv + 1);
          return `<div class="row"><div class="grow"><b>체력 단련 Lv.${lv}</b> ${max ? '<span class="max">MAX</span>' : ''}<div class="desc">최대 체력 +20 (현재 ${Game.maxHp()})</div></div>
            ${max ? '' : `<span class="price">${cost}G</span><button class="sbtn" data-act="upgrade" data-arg="hp">강화</button>`}</div>`;
        })();
    } else if (tab === 'tool') {
      const lv = G.up.tool, max = lv >= SHOP.tool.names.length - 1;
      body = `<div class="row">${dishIcon('mush_soup')}<div class="grow"><b>${SHOP.tool.names[lv]}</b> ${max ? '<span class="max">MAX</span>' : `→ <b class="next">${SHOP.tool.names[lv + 1]}</b>`}
        <div class="desc">요리 미니게임의 성공 구간이 넓어지고 품질 보너스가 붙어요.</div></div>
        ${max ? '' : `<span class="price">${SHOP.tool.cost[lv + 1]}G</span><button class="sbtn" data-act="upgrade" data-arg="tool">구매</button>`}</div>`;
    } else if (tab === 'decor') {
      body = SHOP.decor.map(d => {
        const lv = G.decor[d.id] || 0, max = lv >= d.max;
        return `<div class="row"><div class="grow"><b>${d.name}</b> ${d.max > 1 ? `<span class="cnt2">${lv}/${d.max}</span>` : ''} ${max ? '<span class="max">보유</span>' : ''}<div class="desc">${d.desc}</div></div>
          ${max ? '' : `<span class="price">${d.cost[lv]}G</span><button class="sbtn" data-act="decor" data-arg="${d.id}">구매</button>`}</div>`;
      }).join('');
    }
    return head(`냠냠 잡화점 <span class="goldtag">${img(SPR.coin, 'mini')} ${G.gold}G</span>`,
      [['buy', '재료 구매'], ['sell', '재료 판매'], ['gear', '장비 강화'], ['tool', '조리도구'], ['decor', '인테리어']]) + `<div class="pn-body">${body}</div>`;
  }

  function renderHelp() {
    return head('조작법 & 게임 방법') + `<div class="pn-body help">
      <h3>조작</h3>
      <ul>
        <li><b>WASD / 방향키</b> 이동</li>
        <li><b>마우스 좌클릭</b> 뒤집개/식칼 공격 (커서 방향) · 채집물 클릭 시 채집 · 손님 클릭 시 서빙</li>
        <li><b>마우스 우클릭 / Space 꾹</b> 거대 프라이팬 방패 (앞쪽 투사체 완벽 방어, 근접 피해 감소)</li>
        <li><b>E</b> 상호작용 (건물 입장, 대화, 주방) · <b>I</b> 가방 · <b>R</b> 레시피 북 · <b>ESC</b> 닫기</li>
      </ul>
      <h3>게임 순환</h3>
      <ol>
        <li><b>던전 탐험</b>: 거대 버섯 동굴에서 식재료 몬스터를 쓰러뜨리고 채집 포인트를 클릭해 재료를 모아요.</li>
        <li><b>레시피 연구</b>: 레스토랑 주방에서 재료 2~3개를 조합해 새 레시피를 발견해요.</li>
        <li><b>요리 미니게임</b>: 마우스를 꾹 눌러 불 조절 → 타이밍 맞춰 클릭으로 뒤집기! 결과에 따라 ★1~3 품질.</li>
        <li><b>레스토랑 운영</b>: 만든 요리를 들고 레스토랑에 있으면 손님이 와요. 가까이 가서 손님을 클릭해 서빙!</li>
        <li><b>성장</b>: 골드로 장비·조리도구·인테리어를 강화하고, 버프 요리를 먹고 더 깊은 던전으로!</li>
      </ol>
      <h3>던전 구역</h3>
      <ul>
        <li>B1 버섯 숲 · B2 젤리 동굴 — 자유롭게 입장</li>
        <li>B3 불꽃 고추 화산 — <b>화염 저항</b> 버프 필요</li>
        <li>B4 심해 해초 둥지 — <b>수중 호흡</b> 버프 필요, 보스 <b>킹 랍스터 크랩</b></li>
      </ul>
      <p class="desc">진행은 자동 저장돼요. 목표: 전설의 랍스터 테르미도르 완성!</p></div>`;
  }

  // ---------------- 요리 ----------------
  function renderCook() {
    const p = $('panel');
    const G = Game.G;
    if (cook.phase === 'select') {
      const used = {};
      cook.slots.forEach(s => { if (s) used[s] = (used[s] || 0) + 1; });
      const ids = Object.keys(ING).filter(id => (G.inv[id] || 0) > 0);
      const ingGrid = ids.length ? `<div class="grid">${ids.map(id => {
        const left = G.inv[id] - (used[id] || 0);
        return `<div class="cell ${left <= 0 ? 'off' : ''}" data-act="addSlot" data-arg="${id}" title="${ING[id].desc}">${ingIcon(id)}<span class="cnt">${left}</span><div class="nm">${ING[id].name}</div></div>`;
      }).join('')}</div>` : '<div class="empty">재료가 없어요!<br>던전에서 모아오거나 잡화점에서 사 오세요.</div>';
      const filled = cook.slots.filter(Boolean);
      const m = filled.length >= 2 ? matchRecipe(filled) : null;
      let preview = '<div class="desc">재료를 2~3개 넣어 보세요</div>';
      if (filled.length) {
        if (m && G.known.includes(m.id)) preview = `${dishIcon(m.id)}<b>${m.name}</b>`;
        else preview = '<div class="desc">어떤 요리가 될까...?</div>';
      }
      const knownList = G.known.map(id => {
        const r = recipeById(id);
        const need = {}; r.ing.forEach(i => need[i] = (need[i] || 0) + 1);
        const ok = Object.keys(need).every(i => (G.inv[i] || 0) >= need[i]);
        return `<div class="krow ${ok ? '' : 'off'}" data-act="fill" data-arg="${id}">${dishIcon(id, 'mini')}<span>${r.name}</span><span class="kings">${r.ing.map(i => img(SPR.ing[i], 'mini')).join('')}</span></div>`;
      }).join('') || '<div class="desc">아직 아는 레시피가 없어요.<br>냥셰프 스승에게 배워 보세요!</div>';

      p.innerHTML = head('주방 - 요리 연구') + `<div class="pn-body"><div class="cook-wrap">
        <div><h4>재료 (클릭해서 넣기)</h4>${ingGrid}</div>
        <div class="cook-mid"><h4>냄비</h4>
          <div class="slots">${cook.slots.map((s, i) => `<div class="slot" data-act="removeSlot" data-arg="${i}">${s ? ingIcon(s) : '<span class="plus">+</span>'}</div>`).join('')}</div>
          <div class="preview">${preview}</div>
          <button class="pbtn small" data-act="startCook" ${filled.length ? '' : 'disabled'}>요리 시작!</button>
          <div class="desc">조리도구: ${SHOP.tool.names[G.up.tool]}</div></div>
        <div><h4>아는 레시피 (클릭: 자동 채우기)</h4><div class="klist">${knownList}</div></div>
      </div></div>`;
    } else if (cook.phase === 'heat' || cook.phase === 'flip') {
      p.innerHTML = `<div class="pn-head"><span class="pn-title">요리 중...</span></div><div class="pn-body cook-game">
        <div id="cook-info" class="cook-info"></div>
        <canvas id="cook-cv" width="240" height="120"></canvas>
        <div class="desc">마우스 왼쪽 버튼(캔버스 위) 또는 Space 키를 사용하세요</div></div>`;
      cookCtx = $('cook-cv').getContext('2d');
      cookCtx.imageSmoothingEnabled = false;
      updateCookInfo();
    } else if (cook.phase === 'result') {
      const res = cook.result, r = recipeById(res.id);
      let note = '';
      if (res.id === 'mystery') note = '<div class="note bad">레시피에 없는 조합이었어요... 정체불명의 요리가 완성됐다!</div>';
      else if (res.isNew) note = '<div class="note good">새 레시피 발견! 레시피 북에 기록되었어요.</div>';
      if (r.legendary) note += '<div class="note legend">전설의 레시피 완성!!</div>';
      p.innerHTML = head('요리 완성!') + `<div class="pn-body cook-result">
        ${dishIcon(res.id, 'huge')}<div class="rname">${r.name}</div>${stars(res.q)}
        <div class="desc">점수 ${Math.round(res.score * 100)} · ${effectText(r)} · 판매가 ${r.price}G~</div>${note}
        <div class="btns"><button class="pbtn small" data-act="cookAgain">한 번 더 요리</button><button class="pbtn small" data-act="close">닫기</button></div></div>`;
    }
  }

  function startCook() {
    const G = Game.G;
    const filled = cook.slots.filter(Boolean);
    if (!filled.length) return;
    for (const id of filled) if (!Game.useIng(id, 1)) { toast('재료가 부족해요!', 'bad'); return; }
    cook.ings = filled;
    cook.recipe = filled.length >= 2 ? matchRecipe(filled) : null;
    cook.phase = 'heat';
    cook.time = 0; cook.heat = 0.1; cook.prog = 0; cook.burn = 0; cook.hold = false;
    cook.zw = 0.24 + 0.05 * G.up.tool;
    cook.label = ''; cook.labelT = 0; cook.flipAnim = 0; cook.res = []; cook.round = 0; cook.wait = 0;
    renderCook();
    SFX.play('cook');
  }

  function setupFlip() {
    cook.needle = 0; cook.dir = 1;
    cook.speed = 0.9 + cook.round * 0.35;
    cook.fw = 0.2 + 0.035 * Game.G.up.tool;
    cook.zpos = 0.2 + Math.random() * 0.6;
    cook.perfect = cook.fw * 0.35;
    updateCookInfo();
  }

  function updateCookInfo() {
    const el = $('cook-info'); if (!el) return;
    if (cook.phase === 'heat') el.innerHTML = '<b>1단계: 불 조절</b> — 마우스를 <b>꾹 누르면</b> 불이 세지고, 떼면 약해져요. 오른쪽 게이지를 <span class="g">초록 구간</span>에 유지해 익히세요! (너무 세면 타요)';
    else el.innerHTML = `<b>2단계: 뒤집기 ${Math.min(3, cook.round + 1)}/3</b> — 바늘이 <span class="g">초록(PERFECT)</span> / <span class="y">노랑(GOOD)</span> 구간에 올 때 <b>클릭!</b>`;
  }

  function cookPress() {
    if (openKind !== 'cook') return;
    if (cook.phase === 'heat') cook.hold = true;
    else if (cook.phase === 'flip' && cook.wait <= 0) {
      const d = Math.abs(cook.needle - cook.zpos);
      let s;
      if (d <= cook.perfect / 2) { s = 1; cook.label = 'PERFECT!'; SFX.play('good'); }
      else if (d <= cook.fw / 2) { s = 0.7; cook.label = 'GOOD'; SFX.play('pick'); }
      else { s = 0.2; cook.label = 'MISS...'; SFX.play('bad'); }
      cook.res.push(s); cook.labelT = 0.8; cook.flipAnim = 0.6; cook.round++; cook.wait = 0.75;
    }
  }
  function cookRelease() { cook.hold = false; }
  function cookActive() { return openKind === 'cook' && (cook.phase === 'heat' || cook.phase === 'flip'); }

  function finishCook() {
    const G = Game.G;
    const flips = cook.res.reduce((a, b) => a + b, 0) / 3;
    const score = Math.min(1, 0.4 * cook.s1 + 0.6 * flips + 0.03 * G.up.tool);
    const q = score >= 0.85 ? 3 : score >= 0.55 ? 2 : 1;
    const r = cook.recipe;
    const id = r ? r.id : 'mystery';
    G.dishes.push({ id, q });
    G.stats.cooked++;
    let isNew = false;
    if (r && !G.known.includes(r.id)) { G.known.push(r.id); isNew = true; }
    cook.result = { id, q, isNew, score };
    cook.phase = 'result';
    if (r && r.legendary && !G.flags.legend) { G.flags.legend = true; G.flags.legendPending = true; }
    SFX.play(q >= 2 ? 'cook' : 'bad');
    renderCook();
    Game.save();
  }

  function update(dt) {
    if (dlg && dlg.shown < dlg.lines[dlg.i].length) {
      dlg.shown = Math.min(dlg.lines[dlg.i].length, dlg.shown + dt * 45);
      $('dlg-text').textContent = dlg.lines[dlg.i].slice(0, Math.floor(dlg.shown));
    }
    if (!cookActive() || !cookCtx) return;
    const c = cook;
    c.time += dt;
    if (c.labelT > 0) c.labelT -= dt;
    if (c.phase === 'heat') {
      c.zc = 0.55 + 0.17 * Math.sin(c.time * 1.4);
      c.heat = Math.max(0, Math.min(1, c.heat + (c.hold ? 0.8 : -0.55) * dt));
      if (Math.abs(c.heat - c.zc) <= c.zw / 2) c.prog += dt / 2.6;
      if (c.heat > 0.93) c.burn += dt;
      if (c.prog >= 1 || c.time >= 8) {
        c.s1 = Math.max(0, Math.min(1, c.prog - c.burn * 0.25));
        c.label = c.s1 > 0.8 ? '잘 익었다!' : c.s1 > 0.4 ? '그럭저럭' : '설익었다...';
        c.labelT = 0.9;
        c.phase = 'flip'; c.round = 0; c.wait = 0.6;
        setupFlip();
      }
    } else if (c.phase === 'flip') {
      if (c.flipAnim > 0) c.flipAnim -= dt;
      if (c.wait > 0) {
        c.wait -= dt;
        if (c.wait <= 0) { if (c.round >= 3) { finishCook(); return; } setupFlip(); }
      } else {
        c.needle += c.dir * c.speed * dt;
        if (c.needle > 1) { c.needle = 1; c.dir = -1; }
        if (c.needle < 0) { c.needle = 0; c.dir = 1; }
      }
    }
    drawCook();
  }

  function drawCook() {
    const g = cookCtx, c = cook;
    const E = PX.ellipse, R = PX.rect;
    for (let y = 0; y < 120; y += 12) for (let x = 0; x < 240; x += 12) R(g, x, y, 12, 12, ((x + y) / 12) % 2 ? '#f4e4c4' : '#ead6b0');
    R(g, 0, 90, 240, 30, '#8a5a30'); R(g, 0, 90, 240, 3, '#c88a52');
    R(g, 60, 82, 110, 10, '#3a3a44'); R(g, 60, 82, 110, 2, '#5a5a66');
    const h = c.phase === 'heat' ? c.heat : 0.45;
    for (let i = 0; i < 8; i++) {
      const fx = 70 + i * 13, fh = 3 + h * 16 + Math.sin(c.time * 22 + i * 1.7) * 2;
      E(g, fx, 83 - fh / 2, 3.2, fh / 2, '#ff6a20'); E(g, fx, 83 - fh / 3, 1.7, fh / 3, '#ffe040');
    }
    // 팬
    E(g, 115, 74, 36, 9, '#1f1f26'); E(g, 115, 72, 32, 7, '#43434e'); R(g, 148, 70, 44, 5, '#5a3a24'); R(g, 148, 70, 44, 1, '#7a5a3a');
    // 재료
    const jump = c.flipAnim > 0 ? Math.sin((1 - c.flipAnim / 0.6) * Math.PI) * 42 : 0;
    const burnt = c.phase === 'heat' && c.heat > 0.93;
    const n = c.ings.length;
    c.ings.forEach((id, i) => {
      const ic = SPR.ing[id];
      const x = 115 - (n - 1) * 10 + i * 20 - 8, y = 60 - jump - (c.phase === 'heat' ? Math.abs(Math.sin(c.time * 8 + i)) * c.heat * 3 : 0);
      if (jump > 0) {
        g.save(); g.translate(x + 8, y + 8); g.rotate((1 - c.flipAnim / 0.6) * Math.PI * 2 * (i % 2 ? -1 : 1)); g.drawImage(ic, -8, -8); g.restore();
      } else g.drawImage(ic, x, y);
      if (burnt) { g.globalAlpha = 0.35; g.drawImage(PX.tint(ic, '#000'), x, y); g.globalAlpha = 1; }
    });
    if (c.phase === 'heat' && c.heat > 0.8) {
      for (let i = 0; i < 4; i++) {
        const t = (c.time * 0.8 + i * 0.25) % 1;
        g.globalAlpha = (1 - t) * 0.5;
        E(g, 100 + i * 10 + Math.sin(t * 6 + i) * 4, 56 - t * 40, 4 + t * 5, 3 + t * 4, '#8a8a90');
      }
      g.globalAlpha = 1;
    }
    if (c.phase === 'heat') {
      // 불 게이지
      R(g, 210, 10, 16, 80, '#2a1a10'); R(g, 212, 12, 12, 76, '#5a3a2a');
      const zTop = 12 + (1 - (c.zc + c.zw / 2)) * 76, zH = c.zw * 76;
      R(g, 212, zTop, 12, zH, '#4ac04a');
      R(g, 212, 12, 12, 76 * 0.07, '#e03a2a');
      const my = 12 + (1 - c.heat) * 76;
      R(g, 206, my - 1, 24, 3, '#ffffff'); R(g, 204, my - 2, 3, 5, '#ffe060');
      // 익힘 진행도
      R(g, 20, 8, 160, 10, '#2a1a10'); R(g, 22, 10, 156 * Math.min(1, c.prog), 6, '#ffb030');
      R(g, 22, 10, 156 * Math.min(1, c.prog), 2, '#ffe080');
      R(g, 20, 20, 160 * (1 - c.time / 8), 2, '#a07050');
    } else {
      R(g, 18, 10, 204, 16, '#2a1a10'); R(g, 20, 12, 200, 12, '#7a5a4a');
      const zx = 20 + (c.zpos - c.fw / 2) * 200;
      R(g, zx, 12, c.fw * 200, 12, '#ffd040');
      R(g, 20 + (c.zpos - c.perfect / 2) * 200, 12, c.perfect * 200, 12, '#4ac04a');
      const nx = 20 + c.needle * 200;
      R(g, nx - 1, 6, 3, 24, '#ffffff'); R(g, nx - 3, 4, 7, 3, '#e04a3a');
      for (let i = 0; i < 3; i++) {
        const s = c.res[i];
        R(g, 96 + i * 16, 30, 12, 6, s === undefined ? '#5a4a3a' : s >= 1 ? '#4ac04a' : s >= 0.7 ? '#ffd040' : '#e04a3a');
      }
    }
    if (c.labelT > 0 && c.label) {
      g.font = 'bold 16px Galmuri11, monospace';
      g.textAlign = 'center';
      g.lineWidth = 4; g.strokeStyle = '#3a1a08';
      g.strokeText(c.label, 115, 52);
      g.fillStyle = c.label.startsWith('PERFECT') ? '#7aff6a' : c.label.startsWith('MISS') ? '#ff8a7a' : '#ffe060';
      g.fillText(c.label, 115, 52);
    }
  }

  // ---------------- 패널 클릭 처리 ----------------
  function onPanelClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, arg = b.dataset.arg;
    const G = Game.G;
    switch (act) {
      case 'close': close(); break;
      case 'tab': tab = arg; render(); SFX.play('pick'); break;
      case 'eat': { const [id, q] = arg.split('|'); Game.eatDish(id, +q); render(); break; }
      case 'addSlot': {
        const used = cook.slots.filter(s => s === arg).length;
        if ((G.inv[arg] || 0) - used <= 0) { SFX.play('bad'); break; }
        const i = cook.slots.indexOf(null);
        if (i < 0) { toast('냄비가 가득 찼어요! (최대 3개)'); break; }
        cook.slots[i] = arg; SFX.play('pick'); renderCook(); break;
      }
      case 'removeSlot': cook.slots[+arg] = null; renderCook(); break;
      case 'fill': {
        const r = recipeById(arg);
        const need = {}; r.ing.forEach(i => need[i] = (need[i] || 0) + 1);
        if (!Object.keys(need).every(i => (G.inv[i] || 0) >= need[i])) { toast('재료가 부족해요: ' + r.ing.map(i => ING[i].name).join(', '), 'bad'); break; }
        cook.slots = [r.ing[0] || null, r.ing[1] || null, r.ing[2] || null];
        SFX.play('pick'); renderCook(); break;
      }
      case 'startCook': startCook(); break;
      case 'cookAgain': cook.phase = 'select'; cook.slots = [null, null, null]; renderCook(); break;
      case 'buy': {
        const [id, n] = arg.split('|'); const cost = SHOP.ingredients.find(x => x[0] === id)[1] * +n;
        if (G.gold < cost) { toast('골드가 부족해요!', 'bad'); SFX.play('bad'); break; }
        G.gold -= cost; Game.addIng(id, +n); SFX.play('coin'); toast(`${ING[id].name} ${n}개 구매!`); render(); Game.save(); break;
      }
      case 'sell': {
        const [id, n] = arg.split('|'); const cnt = n === 'all' ? G.inv[id] : 1;
        Game.useIng(id, cnt); G.gold += ING[id].price * cnt; SFX.play('coin'); toast(`${ING[id].name} ${cnt}개 판매 (+${ING[id].price * cnt}G)`); render(); Game.save(); break;
      }
      case 'upgrade': {
        let cost;
        if (arg === 'hp') { if (G.up.hp >= SHOP.hpMax) break; cost = 120 * (G.up.hp + 1); }
        else { const S = SHOP[arg]; if (G.up[arg] >= S.names.length - 1) break; cost = S.cost[G.up[arg] + 1]; }
        if (G.gold < cost) { toast('골드가 부족해요!', 'bad'); SFX.play('bad'); break; }
        G.gold -= cost; G.up[arg]++;
        if (arg === 'hp') G.hp += 20;
        SFX.play('good'); toast('강화 완료!', 'good'); render(); Game.save(); break;
      }
      case 'decor': {
        const d = SHOP.decor.find(x => x.id === arg); const lv = G.decor[arg] || 0;
        if (lv >= d.max) break;
        if (G.gold < d.cost[lv]) { toast('골드가 부족해요!', 'bad'); SFX.play('bad'); break; }
        G.gold -= d.cost[lv]; G.decor[arg] = lv + 1;
        Game.refreshDecor();
        SFX.play('good'); toast(`${d.name} 설치 완료!`, 'good'); render(); Game.save(); break;
      }
    }
    updateHUD(true);
  }

  // ---------------- 대화창 ----------------
  function dialog(name, lines, onEnd) {
    dlg = { lines, i: 0, shown: 0, onEnd };
    $('dlg-name').textContent = name;
    $('dlg-text').textContent = '';
    $('dialog').classList.remove('hidden');
  }
  function dialogOpen() { return !!dlg; }
  function dialogNext() {
    if (!dlg) return;
    const line = dlg.lines[dlg.i];
    if (dlg.shown < line.length) { dlg.shown = line.length; $('dlg-text').textContent = line; return; }
    dlg.i++;
    SFX.play('pick');
    if (dlg.i >= dlg.lines.length) {
      const cb = dlg.onEnd; dlg = null;
      $('dialog').classList.add('hidden');
      if (cb) cb();
    } else { dlg.shown = 0; $('dlg-text').textContent = ''; }
  }

  return {
    init, showTitle, showHUD, updateHUD, toast, prompt, bossBar, fade, isOpen, open, close, toggle,
    update, cookPress, cookRelease, cookActive, dialog, dialogOpen, dialogNext, openKind: () => openKind,
  };
})();

'use strict';
// 던전 요리사 - 메인 게임 로직
const W = 480, H = 270, TS = 16, MW = 40, MH = 24;
const SAVE_KEY = 'dungeonChefSave_v1';

const SFX = {
  ctx: null,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } } },
  play(type) {
    const a = this.ctx; if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    const t = a.currentTime;
    let f = 440, f2 = null, d = 0.1, w = 'square', v = 0.04;
    switch (type) {
      case 'swing': w = 'triangle'; f = 320; f2 = 120; d = 0.08; v = 0.05; break;
      case 'hit': f = 200; f2 = 60; d = 0.1; v = 0.05; break;
      case 'pick': f = 660; f2 = 990; d = 0.07; v = 0.03; break;
      case 'coin': f = 880; f2 = 1500; d = 0.12; v = 0.03; break;
      case 'hurt': w = 'sawtooth'; f = 220; f2 = 70; d = 0.2; v = 0.05; break;
      case 'block': f = 1300; f2 = 800; d = 0.07; v = 0.04; break;
      case 'cook': w = 'triangle'; f = 523; f2 = 1046; d = 0.3; v = 0.06; break;
      case 'good': w = 'triangle'; f = 784; f2 = 1568; d = 0.18; v = 0.06; break;
      case 'bad': w = 'sawtooth'; f = 170; f2 = 100; d = 0.22; v = 0.04; break;
      case 'fire': w = 'sawtooth'; f = 500; f2 = 150; d = 0.15; v = 0.03; break;
      case 'boss': w = 'sawtooth'; f = 110; f2 = 40; d = 0.5; v = 0.07; break;
      case 'eat': w = 'triangle'; f = 400; f2 = 700; d = 0.15; v = 0.05; break;
    }
    o.type = w;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.start(t); o.stop(t + d + 0.02);
  },
};

const Game = (() => {
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let G = null;
  const S = {
    scene: 'title', t: 0, cam: { x: 0, y: 0 }, keys: {},
    mouse: { x: 240, y: 135, wx: 0, wy: 0, right: false, inside: false },
    p: { x: 110, y: 170, vx: 0, vy: 0, dir: 'down', face: 1, aim: 0, walk: 0, step: 0, moving: false, inv: 0, atkCd: 0, shield: false },
    mons: [], projs: [], items: [], gathers: [], fx: [], texts: [], tele: [],
    map: null, zone: 0, attack: null, harvest: null, shake: 0, interact: null, hover: null,
    customers: [], spawnT: 3, transit: false, reqCd: 0, envT: 1, lavaT: 0, saveT: 0,
    clouds: [], smoke: [], ambient: [], bg: {},
  };

  // ---------------- 저장 ----------------
  function newState() {
    return {
      gold: 60, hp: 100, inv: { mushroom: 1, water: 2 }, dishes: [], known: [], buffs: {},
      up: { weapon: 0, pan: 0, hp: 0, tool: 0 },
      decor: { table: 0, plant: 0, rug: 0, painting: 0, chandelier: 0, sign: 0 },
      flags: { met: false, boss: false, legend: false, legendPending: false },
      stats: { served: 0, earned: 0, cooked: 0 },
    };
  }
  function save() { if (!G) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* 저장 불가 환경 */ } }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      const base = newState();
      for (const k of ['up', 'decor', 'flags', 'stats']) d[k] = Object.assign(base[k], d[k] || {});
      return Object.assign(base, d);
    } catch (e) { return null; }
  }

  // ---------------- 헬퍼 ----------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function maxHp() { return 100 + 20 * G.up.hp; }
  function hasBuff(b) { return (G.buffs[b] || 0) > 0 || (G.buffs.legend || 0) > 0; }
  function playerAtkBase() { return 8 + G.up.weapon * 6; }
  function addIng(id, n = 1) { G.inv[id] = (G.inv[id] || 0) + n; }
  function useIng(id, n = 1) { if ((G.inv[id] || 0) < n) return false; G.inv[id] -= n; if (G.inv[id] <= 0) delete G.inv[id]; return true; }

  function addText(x, y, txt, col = '#ffffff', big = false) { S.texts.push({ x, y, txt, col, t: 0, big }); }
  function burst(x, y, col, n = 8, sp = 60) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(sp * 0.3, sp);
      S.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, t: 0, life: rand(0.3, 0.6), col, size: Math.random() < 0.5 ? 2 : 1, grav: 120 });
    }
  }

  // ---------------- 입력 ----------------
  function toInternal(e) {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
  }
  function paused() { return UI.isOpen() || UI.dialogOpen() || S.transit; }

  function setupInput() {
    window.addEventListener('mousemove', e => {
      const [x, y] = toInternal(e);
      S.mouse.x = x; S.mouse.y = y;
      S.mouse.inside = x >= 0 && y >= 0 && x < W && y < H;
    });
    cv.addEventListener('mousedown', e => {
      SFX.init();
      const [x, y] = toInternal(e); S.mouse.x = x; S.mouse.y = y;
      S.mouse.wx = x + S.cam.x; S.mouse.wy = y + S.cam.y;
      if (e.button === 0) onLeftClick();
      else if (e.button === 2) S.mouse.right = true;
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 2) S.mouse.right = false;
      if (e.button === 0) UI.cookRelease();
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('contextmenu', e => { if (S.scene === 'dungeon') e.preventDefault(); });
    window.addEventListener('keydown', e => {
      SFX.init();
      const k = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
      if (!S.keys[k]) onKeyPress(k);
      S.keys[k] = true;
    });
    window.addEventListener('keyup', e => { S.keys[e.code] = false; if (e.code === 'Space') UI.cookRelease(); });
    window.addEventListener('blur', () => { S.keys = {}; S.mouse.right = false; UI.cookRelease(); });
  }

  function onKeyPress(k) {
    if (UI.dialogOpen()) { if (k === 'Space' || k === 'Enter' || k === 'KeyE') UI.dialogNext(); return; }
    if (UI.cookActive()) { if (k === 'Space') UI.cookPress(); return; }
    if (k === 'Escape') { UI.close(); return; }
    if (S.scene === 'title') return;
    if (k === 'KeyI') UI.toggle('bag');
    else if (k === 'KeyR') UI.toggle('book');
    else if (k === 'KeyH') UI.toggle('help');
    else if (k === 'KeyE' && !paused()) interact();
  }

  function onLeftClick() {
    if (S.scene === 'title' || paused()) return;
    const wx = S.mouse.wx, wy = S.mouse.wy;
    if (S.scene === 'dungeon') {
      if (S.hover) { tryHarvest(S.hover); return; }
      playerAttack();
      return;
    }
    if (S.scene === 'restaurant') {
      const c = S.customers.find(c => wx > c.x - 8 && wx < c.x + 8 && wy > c.y - 22 && wy < c.y + 3);
      if (c) { serve(c); return; }
    }
    const pts = S.scene === 'village' ? VIL_POINTS : REST_POINTS;
    const it = pts.find(p => dist(wx, wy, p.cx, p.cy) < p.cr);
    if (it) {
      if (dist(S.p.x, S.p.y, it.x, it.y) < 50) doInteract(it.id);
      else addText(wx, wy - 6, '더 가까이!', '#ffffff');
    }
  }

  // ---------------- 장면 ----------------
  const VIL_POINTS = [
    { id: 'restaurant', x: 110, y: 158, cx: 110, cy: 120, cr: 46, label: '레스토랑 들어가기' },
    { id: 'mentor', x: 230, y: 172, cx: 230, cy: 158, cr: 14, label: '냥셰프 스승과 대화하기' },
    { id: 'shop', x: 330, y: 158, cx: 330, cy: 120, cr: 38, label: '냠냠 잡화점 이용하기' },
    { id: 'dungeon', x: 435, y: 158, cx: 435, cy: 110, cr: 40, label: '식재료 던전 입장 (B1 버섯 숲)' },
  ];
  const VIL_SOLID = [[20, 188, 108, 56], [364, 214, 92, 38], [224, 160, 14, 8]];
  const REST_POINTS = [
    { id: 'kitchen', x: 70, y: 112, cx: 80, cy: 84, cr: 40, label: '주방에서 요리하기' },
    { id: 'exit', x: 240, y: 250, cx: 240, cy: 258, cr: 16, label: '마을로 나가기' },
  ];
  function villageSolid(x, y) {
    if (x < 6 || x > 474 || y < 156 || y > 250) return true;
    for (const r of VIL_SOLID) if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return true;
    return false;
  }
  function restSolid(x, y) {
    if (x < 10 || x > 470 || y < 108 || y > 256) return true;
    const n = tableCount();
    for (let i = 0; i < n; i++) { const [tx, ty] = SCN.TABLES[i]; if (x > tx - 15 && x < tx + 15 && y > ty - 5 && y < ty + 8) return true; }
    return false;
  }
  function tableCount() { return Math.min(6, 2 + G.decor.table); }

  function zoneLabel() {
    if (S.scene === 'village') return '냠냠 마을';
    if (S.scene === 'restaurant') return G.dishes.length
      ? `레스토랑 · 진열 요리 ${G.dishes.length}개 · 서빙 ${G.stats.served}회`
      : '레스토랑 · 진열할 요리가 없어 손님이 오지 않아요! 주방에서 요리하세요';
    if (S.scene === 'dungeon') return ZONES[S.zone].name;
    return '';
  }

  function goScene(name, opt = {}) {
    if (S.transit) return;
    S.transit = true;
    UI.fade(true);
    UI.prompt(null);
    setTimeout(() => {
      enterScene(name, opt);
      UI.fade(false);
      setTimeout(() => { S.transit = false; }, 250);
    }, 300);
  }

  function enterScene(name, opt) {
    S.scene = name;
    S.projs = []; S.fx = []; S.texts = []; S.items = []; S.tele = []; S.attack = null; S.harvest = null; S.hover = null; S.ambient = [];
    S.mouse.right = false;
    S.p.vx = 0; S.p.vy = 0; S.p.walk = 0; S.p.moving = false;
    S.p.dir = name === 'restaurant' ? 'up' : name === 'dungeon' ? 'side' : 'down';
    S.p.face = 1;
    UI.bossBar(null);
    if (name === 'village') { S.p.x = opt.x ?? 110; S.p.y = opt.y ?? 172; S.cam.x = 0; S.cam.y = 0; }
    else if (name === 'restaurant') { S.p.x = 240; S.p.y = 238; S.cam.x = 0; S.cam.y = 0; S.customers = []; S.spawnT = 2; }
    else if (name === 'dungeon') { S.zone = opt.zone; buildDungeon(opt.zone, opt.from); UI.toast(ZONES[opt.zone].name + '에 들어왔다!'); }
    UI.showTitle(false);
    UI.showHUD(true);
    UI.updateHUD(true);
    save();
  }

  function newGame() {
    G = newState();
    refreshDecor();
    goScene('village', { x: 200, y: 190 });
    setTimeout(() => UI.toast('냥셰프 스승(고양이)에게 다가가 E 키로 말을 걸어 보세요!', 'good'), 900);
  }
  function continueGame() {
    G = load();
    if (!G) { newGame(); return; }
    G.hp = Math.max(G.hp, 1);
    refreshDecor();
    goScene('village', { x: 110, y: 172 });
  }

  function refreshDecor() {
    const v = SCN.village(G.decor);
    S.bg.village = v;
    S.bg.restaurant = SCN.restaurant(G.decor);
  }

  // ---------------- 상호작용 ----------------
  function interact() {
    if (S.scene === 'dungeon') {
      let best = null, bd = 34;
      for (const g of S.gathers) { if (g.done) continue; const d = dist(g.x, g.y, S.p.x, S.p.y); if (d < bd) { bd = d; best = g; } }
      if (best) tryHarvest(best);
      return;
    }
    if (S.interact) doInteract(S.interact.id);
  }

  function doInteract(id) {
    switch (id) {
      case 'restaurant': goScene('restaurant'); break;
      case 'mentor': talkMentor(); break;
      case 'shop': UI.open('shop'); break;
      case 'dungeon': goScene('dungeon', { zone: 1, from: 'above' }); break;
      case 'kitchen': UI.open('cook'); break;
      case 'exit': goScene('village', { x: 110, y: 164 }); break;
    }
  }

  function talkMentor() {
    const NAME = '냥셰프 버터';
    if (!G.flags.met) {
      UI.dialog(NAME, [
        '어서 오거라, 꼬마 요리사. 나는 한때 "전설의 셰프"라 불리던 냥셰프 버터다냥.',
        '이 마을 아래에는 온갖 희귀 식재료가 살아 움직이는 거대한 식재료 던전이 있지. 저기 거대 버섯이 입구다냥.',
        '던전 가장 깊은 곳 B4 심해 둥지의 "킹 랍스터 크랩"... 그 살로 만드는 "전설의 랍스터 테르미도르"가 바로 전설의 레시피다냥!',
        '우선 기본부터 가르쳐 주마. "고소한 버섯 스프"(버섯+샘물)와 "탱글 젤리 푸딩"(젤리+우유+설탕) 레시피다냥.',
        '재료를 모아 레스토랑 주방에서 요리하고, 손님에게 팔아 골드를 벌거라. 그 골드로 장비와 조리도구를 강화하는 거다냥.',
        '조작은 WASD 이동, 좌클릭 공격, 우클릭(또는 Space) 프라이팬 방패! 채집물은 커서로 클릭하면 된다냥. 자, 첫 재료 선물이다!',
      ], () => {
        G.flags.met = true;
        for (const id of ['mush_soup', 'pudding']) if (!G.known.includes(id)) G.known.push(id);
        addIng('mushroom', 2); addIng('water', 2); addIng('milk', 1); addIng('sugar', 1); addIng('jelly', 1);
        UI.toast('레시피 2개를 배웠다! 버섯, 샘물, 우유, 설탕, 젤리를 받았다!', 'good');
        SFX.play('good');
        save();
      });
      return;
    }
    let hint;
    if (G.stats.cooked === 0) hint = '레스토랑 안쪽 주방(왼쪽 위 카운터)에서 요리할 수 있다냥. 받은 재료로 버섯 스프부터 만들어 보거라!';
    else if (G.stats.served === 0) hint = '요리를 들고 레스토랑에 있으면 손님이 찾아온다냥. 손님 가까이 가서 클릭하면 서빙이다!';
    else if (!G.known.includes('bingsu')) hint = 'B3 화산은 너무 뜨거워서 그냥은 못 들어간다냥. 몸을 식혀주는 "시원한 젤리 빙수"... 젤리와 샘물, 그리고 반짝이는 단맛이면 되지 않을까?';
    else if (!G.known.includes('risotto')) hint = 'B4 심해 둥지는 물속이다냥! 화산 온천에서 자라는 "버블 버섯"에 쌀과 샘물을 넣고 리조또를 만들어 보거라. 쌀은 잡화점에 있다냥.';
    else if (!G.flags.boss) hint = '킹 랍스터 크랩은 집게를 내려찍기 전에 바닥에 붉은 원이 생긴다냥. 돌진하다 벽에 부딪히면 잠시 기절하니 그때를 노려라! 거품은 프라이팬으로 막을 수 있다냥.';
    else if (!G.flags.legend) hint = '킹 랍스터 살을 얻었구나! 전설의 레시피는... 킹 랍스터 살, 우유, 향긋한 허브. 최고의 정성으로 요리하거라!';
    else hint = '네가 만든 전설의 요리, 평생 잊지 못할 거다냥. 이제 너만의 레스토랑을 마을 최고로 만들어 보거라!';
    const lines = [hint, TIPS[Math.random() * TIPS.length | 0]];
    const poor = Object.keys(G.inv).length === 0 && G.dishes.length === 0 && G.gold < 20;
    if (poor) lines.push('배고파 보이는구나. 버섯이랑 샘물을 좀 챙겨 가거라냥.');
    UI.dialog(NAME, lines, () => { if (poor) { addIng('mushroom', 2); addIng('water', 2); UI.toast('버섯 2개, 샘물 2개를 받았다!'); } });
  }

  function onPanelClosed() {
    if (G && G.flags.legendPending) {
      G.flags.legendPending = false;
      save();
      setTimeout(() => {
        UI.dialog('냥셰프 버터', [
          '...이 향기는...! 설마, 진짜 "전설의 랍스터 테르미도르"냐옹?!',
          '바삭한 겉면, 녹아내리는 크림, 바다의 풍미... 내가 젊었을 때 만들던 것보다 훨씬 맛있다냥!',
          '축하한다, 꼬마... 아니, 이제 너는 진정한 "던전 셰프"다냥! 이 요리는 손님에게 500G에 팔 수도, 먹고 전설의 힘을 얻을 수도 있다냥.',
          '던전에는 아직 재료가 많다냥. 레스토랑을 계속 키워 보거라! (게임은 계속됩니다)',
        ]);
        for (let i = 0; i < 40; i++) burst(rand(0, W) + S.cam.x, rand(0, H / 2) + S.cam.y, ['#ffd040', '#ff6a8a', '#7ad8ff', '#a0ff80'][i % 4], 3, 50);
        SFX.play('good');
      }, 300);
    }
  }

  // ---------------- 음식 섭취 ----------------
  function eatDish(id, q) {
    const i = G.dishes.findIndex(d => d.id === id && d.q === q);
    if (i < 0) return;
    G.dishes.splice(i, 1);
    const r = recipeById(id);
    SFX.play('eat');
    if (id === 'mystery') {
      const roll = Math.random();
      if (roll < 0.5) { G.hp = Math.min(maxHp(), G.hp + 5); UI.toast('...음, 먹을 만하다? (HP +5)'); }
      else if (roll < 0.8) { const b = Math.random() < 0.5 ? 'atk' : 'spd'; G.buffs[b] = Math.max(G.buffs[b] || 0, 30); UI.toast(`의외로 맛있다! ${BUFFS[b].name} 30초`, 'good'); }
      else { G.hp = Math.max(1, G.hp - 5); UI.toast('으윽, 배탈이다! (HP -5)', 'bad'); }
      save(); return;
    }
    const heal = r.heal >= 999 ? maxHp() : Math.round(r.heal * (0.8 + 0.2 * q));
    G.hp = Math.min(maxHp(), G.hp + heal);
    if (r.buff) {
      const dur = Math.round(r.dur * (0.75 + 0.25 * q));
      G.buffs[r.buff] = Math.max(G.buffs[r.buff] || 0, dur);
      UI.toast(`${r.name} 냠냠! HP +${heal}, ${BUFFS[r.buff].name} ${dur}초`, 'good');
    } else UI.toast(`${r.name} 냠냠! HP +${heal}`, 'good');
    burst(S.p.x, S.p.y - 10, '#ffe060', 10, 40);
    save();
  }

  // ---------------- 던전 생성 ----------------
  function genMap(z) {
    const Z = ZONES[z];
    const idx = (x, y) => y * MW + x;
    for (let attempt = 0; attempt < 30; attempt++) {
      const t = new Uint8Array(MW * MH), v = new Uint8Array(MW * MH), prot = new Uint8Array(MW * MH);
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        v[idx(x, y)] = Math.random() < 0.15 ? 3 : (Math.random() * 3 | 0);
        if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) t[idx(x, y)] = 1;
      }
      const inside = (x, y) => x > 0 && y > 0 && x < MW - 1 && y < MH - 1;
      const protArea = (px, py, r) => { for (let y = py - r; y <= py + r; y++) for (let x = px - r; x <= px + r; x++) if (inside(x, y)) prot[idx(x, y)] = 1; };
      const up = { x: 2, y: MH / 2 | 0 };
      const down = Z.boss ? null : { x: MW - 3, y: randi(3, MH - 4) };
      const bossPos = Z.boss ? { x: MW - 10, y: MH / 2 | 0 } : null;
      const goal = down || bossPos;
      let cx = up.x, cy = up.y;
      while (cx !== goal.x || cy !== goal.y) {
        protArea(cx, cy, 1);
        if ((Math.random() < 0.6 && cx !== goal.x) || cy === goal.y) cx += Math.sign(goal.x - cx);
        else cy += Math.sign(goal.y - cy);
      }
      protArea(up.x, up.y, 2);
      if (down) protArea(down.x, down.y, 2);
      if (bossPos) protArea(bossPos.x, bossPos.y, 6);
      for (let k = 0; k < 36; k++) {
        const ox = randi(2, MW - 4), oy = randi(2, MH - 4), sw = randi(1, 3), sh = randi(1, 2);
        for (let y = oy; y < oy + sh; y++) for (let x = ox; x < ox + sw; x++) if (inside(x, y) && !prot[idx(x, y)]) t[idx(x, y)] = 2;
      }
      if (Z.lava) {
        for (let k = 0; k < 8; k++) {
          const lx = randi(4, MW - 5), ly = randi(3, MH - 4), r = rand(1, 2.4);
          for (let y = Math.floor(ly - r); y <= ly + r; y++) for (let x = Math.floor(lx - r); x <= lx + r; x++) {
            if (inside(x, y) && Math.hypot(x - lx, y - ly) <= r && !prot[idx(x, y)] && t[idx(x, y)] === 0) t[idx(x, y)] = 3;
          }
        }
      }
      t[idx(up.x, up.y)] = 4;
      if (down) t[idx(down.x, down.y)] = 5;
      const seen = new Uint8Array(MW * MH), q = [[up.x, up.y]], reach = [];
      seen[idx(up.x, up.y)] = 1;
      while (q.length) {
        const [x, y] = q.shift();
        if (t[idx(x, y)] === 0) reach.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (!inside(nx, ny)) continue;
          const i = idx(nx, ny);
          if (seen[i] || t[i] === 1 || t[i] === 2) continue;
          seen[i] = 1; q.push([nx, ny]);
        }
      }
      if (down && !seen[idx(down.x, down.y)]) continue;
      return { t, v, up, down, bossPos, reach };
    }
    return null;
  }

  function buildDungeon(z, from) {
    const Z = ZONES[z];
    const m = genMap(z);
    S.map = m; S.mons = []; S.gathers = [];
    if (from === 'below' && m.down) { S.p.x = (m.down.x - 1) * TS + 8; S.p.y = m.down.y * TS + 10; }
    else { S.p.x = (m.up.x + 1) * TS + 8; S.p.y = m.up.y * TS + 10; }
    const far = m.reach.filter(([x, y]) => Math.hypot(x - m.up.x, y - m.up.y) > 7 && (!m.down || Math.hypot(x - m.down.x, y - m.down.y) > 3));
    shuffle(far);
    let si = 0;
    for (const [type, n] of Object.entries(Z.mons)) for (let i = 0; i < n && si < far.length; i++, si++) S.mons.push(makeMon(type, far[si][0] * TS + 8, far[si][1] * TS + 8));
    if (Z.boss) S.mons.push(makeMon('boss', m.bossPos.x * TS + 8, m.bossPos.y * TS + 8));
    const gs = shuffle(m.reach.filter(([x, y]) => Math.hypot(x - m.up.x, y - m.up.y) > 3));
    let gi = 0;
    for (const [type, n] of Object.entries(Z.gather)) for (let i = 0; i < n && gi < gs.length; i++, gi++) S.gathers.push({ type, x: gs[gi][0] * TS + 8, y: gs[gi][1] * TS + 13, done: false });
    S.envT = 1; S.lavaT = 0;
    updateCamera(true);
  }

  function makeMon(type, x, y) {
    const D = MONS[type];
    const scale = 1 + (S.zone - 1) * 0.15;
    const hp = Math.round(D.hp * (type === 'boss' ? 1 : scale));
    return { type, x, y, hp, maxHp: hp, r: D.r, kx: 0, ky: 0, t: rand(0.3, 1.5), state: 'idle', cd: rand(1, 2.5), hurt: 0, face: 1, anim: Math.random() * 10, wa: Math.random() * 6.28, dead: false, z: 0, dmgScale: type === 'boss' ? 1 : scale };
  }

  function tileAt(px, py) {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return 1;
    return S.map.t[ty * MW + tx];
  }
  function tileSolid(px, py) { const t = tileAt(px, py); return t === 1 || t === 2; }
  function boxHit(x, y, hw, hh, solid) { return solid(x - hw, y - hh) || solid(x + hw, y - hh) || solid(x - hw, y + hh) || solid(x + hw, y + hh); }
  function moveEnt(e, dx, dy, hw, hh, solid) {
    let hit = false;
    if (dx) { if (!boxHit(e.x + dx, e.y, hw, hh, solid)) e.x += dx; else hit = true; }
    if (dy) { if (!boxHit(e.x, e.y + dy, hw, hh, solid)) e.y += dy; else hit = true; }
    return hit;
  }

  // ---------------- 플레이어 ----------------
  function movePlayer(dt, solid) {
    const k = S.keys, p = S.p;
    let mx = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
    let my = ((k.KeyS || k.ArrowDown) ? 1 : 0) - ((k.KeyW || k.ArrowUp) ? 1 : 0);
    p.moving = !!(mx || my);
    if (mx && my) { mx *= 0.7071; my *= 0.7071; }
    const sp = 74 * (hasBuff('spd') ? 1.3 : 1) * (p.shield ? 0.5 : 1);
    const acc = Math.min(1, dt * 16);
    p.vx += (mx * sp - p.vx) * acc;
    p.vy += (my * sp - p.vy) * acc;
    if (!mx && Math.abs(p.vx) < 2) p.vx = 0;
    if (!my && Math.abs(p.vy) < 2) p.vy = 0;
    const ox = p.x, oy = p.y;
    moveEnt(p, p.vx * dt, p.vy * dt, 4, 3, solid);
    if (p.x === ox) p.vx = 0;
    if (p.y === oy) p.vy = 0;
    if (p.moving) {
      p.walk += dt * (sp / 74) * (p.shield ? 1.6 : 1);
      p.dir = dirFromVec(mx, my);
      if (mx) p.face = mx > 0 ? 1 : -1;
      const step = Math.floor(p.walk * 9) % 4;
      if (step !== p.step && (step === 1 || step === 3)) {
        const col = S.scene === 'restaurant' ? 'rgba(230,200,160,0.8)' : S.scene === 'village' ? 'rgba(240,215,160,0.9)' : 'rgba(220,220,220,0.55)';
        S.fx.push({ x: p.x + rand(-2, 2), y: p.y + 1, vx: -p.vx * 0.1 + rand(-6, 6), vy: -rand(3, 8), t: 0, life: 0.35, col, size: 2, grav: 0, dust: true });
      }
      p.step = step;
    } else { p.walk = 0; p.step = 0; }
  }

  function dirFromVec(dx, dy) { return Math.abs(dx) > Math.abs(dy) * 1.05 ? 'side' : (dy < 0 ? 'up' : 'down'); }

  function charFrame(set, dir, face, moving, walk, t) {
    const d = dir === 'side' ? (face < 0 ? set.left : set.right) : set[dir];
    return moving ? d.walk[Math.floor(walk * 9) % 4] : d.idle[Math.floor(t * 1.6) % 2];
  }

  function playerAttack() {
    const p = S.p;
    if (p.atkCd > 0 || p.shield) return;
    p.atkCd = 0.36;
    const a = Math.atan2(S.mouse.wy - (p.y - 8), S.mouse.wx - p.x);
    S.attack = { a, t: 0.18, max: 0.18 };
    SFX.play('swing');
    const reach = 26 + G.up.weapon * 1.5;
    let base = playerAtkBase() * (hasBuff('atk') ? 1.5 : 1);
    for (const m of S.mons) {
      if (m.dead) continue;
      const dx = m.x - p.x, dy = m.y - (p.y - 8), d = Math.hypot(dx, dy);
      if (d > reach + m.r) continue;
      let da = Math.atan2(dy, dx) - a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > 1.15 && d > m.r + 5) continue;
      const crit = Math.random() < 0.12;
      const dmg = Math.round(base * rand(0.9, 1.1) * (crit ? 1.6 : 1));
      damageMon(m, dmg, a, crit);
    }
  }

  function damageMon(m, dmg, a, crit) {
    m.hp -= dmg;
    m.hurt = 0.12;
    const kb = m.type === 'boss' ? 30 : 140;
    m.kx = Math.cos(a) * kb; m.ky = Math.sin(a) * kb;
    addText(m.x + rand(-4, 4), m.y - m.r - 6, (crit ? '!' : '') + dmg, crit ? '#ffe040' : '#ffffff', crit);
    burst(m.x, m.y, '#ffffff', 4, 50);
    SFX.play('hit');
    S.shake = Math.max(S.shake, crit ? 0.12 : 0.06);
    if (m.hp <= 0) killMon(m);
  }

  const MON_COL = { slime: '#ff6fae', mush: '#d0503a', boar: '#f0a0a0', lizard: '#ff8a30', crab: '#e8603a', boss: '#ffd040' };
  function killMon(m) {
    m.dead = true;
    const D = MONS[m.type];
    for (const [id, ch, a, b] of D.drops) if (Math.random() < ch) { const n = randi(a, b); for (let i = 0; i < n; i++) spawnItem(m.x, m.y, id); }
    let gold = randi(D.gold[0], D.gold[1]);
    while (gold > 0) { const v = Math.min(gold, m.type === 'boss' ? 25 : 3); spawnItem(m.x, m.y, 'coin', v); gold -= v; }
    burst(m.x, m.y, MON_COL[m.type], m.type === 'boss' ? 40 : 14, m.type === 'boss' ? 120 : 70);
    if (m.type === 'boss') {
      G.flags.boss = true;
      UI.bossBar(null);
      UI.toast('킹 랍스터 크랩을 쓰러뜨렸다! 전설의 식재료 "킹 랍스터 살" 획득!', 'good');
      S.shake = 0.6;
      SFX.play('boss');
      save();
    }
  }

  function spawnItem(x, y, id, val = 0) {
    const a = Math.random() * Math.PI * 2, s = rand(20, 60);
    S.items.push({ x, y, z: 0, vz: rand(50, 90), vx: Math.cos(a) * s, vy: Math.sin(a) * s, id, val, t: 0 });
  }

  function hurtPlayer(dmg, sx, sy, kind, isProj) {
    const p = S.p;
    if (p.inv > 0 || S.transit) return;
    const toSrc = Math.atan2(sy - (p.y - 8), sx - p.x);
    let da = toSrc - p.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
    const front = Math.abs(da) < 1.25;
    if (p.shield && isProj && front) {
      addText(p.x, p.y - 24, '막았다!', '#9ae8ff');
      burst(p.x + Math.cos(p.aim) * 10, p.y - 8 + Math.sin(p.aim) * 8, '#ffffff', 5, 50);
      SFX.play('block');
      return;
    }
    let f = 1 - 0.05 * G.up.pan;
    if (hasBuff('def')) f *= 0.7;
    if (G.buffs.legend) f *= 0.7;
    if (kind === 'fire' && hasBuff('fireRes')) f *= 0.3;
    if (p.shield && !isProj) { f *= 1 - (0.5 + 0.12 * G.up.pan) * (front ? 1 : 0.5); SFX.play('block'); }
    const d = Math.max(1, Math.round(dmg * f));
    G.hp -= d;
    p.inv = 0.7;
    const ka = toSrc + Math.PI;
    moveEnt(p, Math.cos(ka) * 8, Math.sin(ka) * 8, 4, 3, tileSolid);
    S.shake = Math.max(S.shake, 0.18);
    addText(p.x, p.y - 22, '-' + d, '#ff6a5a');
    SFX.play('hurt');
    if (G.hp <= 0) playerDie();
  }

  function envDamage(d, msg) {
    G.hp -= d;
    addText(S.p.x, S.p.y - 24, msg, '#ffb080');
    S.shake = Math.max(S.shake, 0.08);
    if (G.hp <= 0) playerDie();
  }

  function playerDie() {
    if (S.transit) return;
    const lost = Math.floor(G.gold * 0.1);
    G.gold -= lost;
    G.hp = Math.ceil(maxHp() * 0.6);
    G.buffs = {};
    UI.toast(`기절했다... 냥셰프 스승님이 마을로 데려왔다. (-${lost}G)`, 'bad');
    goScene('village', { x: 230, y: 190 });
  }

  // ---------------- 채집 ----------------
  function tryHarvest(gp) {
    if (gp.done) return;
    if (dist(gp.x, gp.y, S.p.x, S.p.y) > 46) { addText(gp.x, gp.y - 20, '너무 멀어요!', '#ffffff'); return; }
    if (S.harvest) return;
    S.harvest = { g: gp, t: 0 };
  }
  function finishHarvest(gp) {
    gp.done = true;
    const [id, a, b] = GATHER[gp.type].drop;
    const n = randi(a, b);
    for (let i = 0; i < n; i++) spawnItem(gp.x, gp.y - 6, id);
    burst(gp.x, gp.y - 6, '#fff8a0', 8, 40);
    SFX.play('pick');
  }

  // ---------------- 몬스터 AI ----------------
  function updMon(m, dt) {
    const p = S.p, D = MONS[m.type];
    const dx = p.x - m.x, dy = (p.y - 6) - m.y, d = Math.hypot(dx, dy) || 1;
    m.t -= dt; m.cd -= dt; m.anim += dt;
    if (m.hurt > 0) m.hurt -= dt;
    let mvx = 0, mvy = 0, harmless = false;
    const ph2 = m.hp < m.maxHp * 0.5;
    switch (m.type) {
      case 'slime':
        if (m.state === 'hop') {
          mvx = m.vx; mvy = m.vy;
          m.z = Math.sin(clamp(1 - m.t / 0.4, 0, 1) * Math.PI) * 6;
          if (m.t <= 0) { m.state = 'rest'; m.t = rand(0.5, 1.1); m.z = 0; }
        } else if (m.t <= 0) {
          m.state = 'hop'; m.t = 0.4;
          const a = d < 130 ? Math.atan2(dy, dx) + rand(-0.3, 0.3) : Math.random() * Math.PI * 2;
          const sp = d < 130 ? 75 : 35;
          m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        }
        break;
      case 'mush':
        if (d < 110) { mvx = dx / d * D.spd; mvy = dy / d * D.spd; }
        else { if (m.t <= 0) { m.wa = Math.random() * 6.28; m.t = rand(1, 2.5); } mvx = Math.cos(m.wa) * 12; mvy = Math.sin(m.wa) * 12; }
        break;
      case 'crab':
        if (d < 150) { const s = Math.sin(m.anim * 5) * 40; mvx = dx / d * D.spd - dy / d * s; mvy = dy / d * D.spd + dx / d * s; }
        else { if (m.t <= 0) { m.wa = Math.random() * 6.28; m.t = rand(1, 2); } mvx = Math.cos(m.wa) * 20; mvy = Math.sin(m.wa) * 20; }
        break;
      case 'boar':
        if (m.state === 'tele') { if (m.t <= 0) { m.state = 'charge'; m.t = 0.75; } }
        else if (m.state === 'charge') { mvx = Math.cos(m.ca) * 150; mvy = Math.sin(m.ca) * 150; if (m.t <= 0) { m.state = 'idle'; m.t = 1; m.cd = 1.6; } }
        else {
          if (d < 120 && m.cd <= 0) { m.state = 'tele'; m.t = 0.6; m.ca = Math.atan2(dy, dx); m.face = dx < 0 ? -1 : 1; }
          else { if (m.t <= 0) { m.wa = Math.random() * 6.28; m.t = rand(1, 2); } mvx = Math.cos(m.wa) * 16; mvy = Math.sin(m.wa) * 16; }
        }
        break;
      case 'lizard':
        m.face = dx < 0 ? -1 : 1;
        if (m.state === 'tele') {
          if (m.t <= 0) {
            const a0 = Math.atan2(dy, dx);
            for (const o of [-0.28, 0, 0.28]) S.projs.push({ x: m.x + m.face * 6, y: m.y - 2, vx: Math.cos(a0 + o) * 95, vy: Math.sin(a0 + o) * 95, r: 4, dmg: 10 * m.dmgScale, kind: 'fire', life: 3 });
            SFX.play('fire');
            m.state = 'idle'; m.cd = rand(1.8, 2.6);
          }
        } else {
          if (d < 70) { mvx = -dx / d * D.spd; mvy = -dy / d * D.spd; }
          else if (d > 120) { mvx = dx / d * D.spd; mvy = dy / d * D.spd; }
          else { mvx = -dy / d * 20; mvy = dx / d * 20; }
          if (m.cd <= 0 && d < 190) { m.state = 'tele'; m.t = 0.55; }
        }
        break;
      case 'boss': {
        const spdMul = ph2 ? 1.35 : 1;
        if (m.state === 'idle') { m.state = 'chase'; m.t = 2; }
        if (m.state === 'chase') {
          mvx = dx / d * D.spd * spdMul; mvy = dy / d * D.spd * spdMul;
          if (m.t <= 0) {
            if (!m.summoned && ph2) m.state = 'summon';
            else m.state = ['slam', 'bubbles', 'charge'][Math.random() * 3 | 0];
            m.step = 0; m.t = 0.3;
            if (m.state === 'slam') m.slams = ph2 ? 4 : 3;
            if (m.state === 'charge') { m.t = 0.8; }
          }
        } else if (m.state === 'slam') {
          if (m.t <= 0) {
            if (m.slams > 0) { S.tele.push({ x: S.p.x, y: S.p.y - 3, r: 26, t: 0.9, max: 0.9, dmg: 18 }); m.slams--; m.t = ph2 ? 0.45 : 0.6; }
            else { m.state = 'chase'; m.t = ph2 ? 1.6 : 2.2; }
          }
        } else if (m.state === 'bubbles') {
          if (m.t <= 0) {
            const n = ph2 ? 16 : 12, off = m.step * 0.26;
            for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + off; S.projs.push({ x: m.x, y: m.y, vx: Math.cos(a) * 75, vy: Math.sin(a) * 75, r: 4, dmg: 9, kind: 'bubble', life: 4 }); }
            SFX.play('fire');
            m.step++; m.t = 0.55;
            if (m.step >= 3) { m.state = 'chase'; m.t = 2; }
          }
        } else if (m.state === 'charge') {
          m.ca = Math.atan2(dy, dx);
          if (m.t <= 0) { m.state = 'dash'; m.t = 0.9; SFX.play('boss'); }
        } else if (m.state === 'dash') {
          mvx = Math.cos(m.ca) * 175; mvy = Math.sin(m.ca) * 175;
          if (m.t <= 0) { m.state = 'chase'; m.t = 1.8; }
        } else if (m.state === 'stun') {
          harmless = true;
          if (m.t <= 0) { m.state = 'chase'; m.t = 1.5; }
        } else if (m.state === 'summon') {
          m.summoned = true;
          for (let i = 0; i < 3; i++) {
            const a = i / 3 * Math.PI * 2;
            const cx = m.x + Math.cos(a) * 30, cy = m.y + Math.sin(a) * 30;
            if (!tileSolid(cx, cy)) S.mons.push(makeMon('crab', cx, cy));
          }
          UI.toast('킹 랍스터 크랩이 부하 꼬마 게를 불렀다!', 'bad');
          SFX.play('boss');
          m.state = 'chase'; m.t = 1.5;
        }
        break;
      }
    }
    mvx += m.kx; mvy += m.ky;
    const decay = Math.min(1, dt * 9);
    m.kx -= m.kx * decay; m.ky -= m.ky * decay;
    const hw = m.type === 'boss' ? 14 : m.r * 0.7, hh = m.type === 'boss' ? 10 : m.r * 0.5;
    const hit = moveEnt(m, mvx * dt, mvy * dt, hw, hh, tileSolid);
    if (hit && m.type === 'boar' && m.state === 'charge') { m.state = 'idle'; m.t = 1.2; m.cd = 1.6; }
    if (hit && m.type === 'boss' && m.state === 'dash') { m.state = 'stun'; m.t = 1.6; S.shake = 0.4; addText(m.x, m.y - 30, '쿵! 기절!', '#ffe060', true); SFX.play('boss'); }
    if (m.type !== 'lizard' && m.type !== 'boss' && m.state !== 'tele' && Math.abs(mvx) > 1) m.face = mvx < 0 ? -1 : 1;
    if (!harmless && d < m.r + 6 && m.z < 3) hurtPlayer(D.dmg * m.dmgScale, m.x, m.y, 'melee', false);
  }

  // ---------------- 레스토랑 ----------------
  function updateRestaurant(dt) {
    S.spawnT -= dt;
    const n = tableCount();
    if (S.spawnT <= 0) {
      S.spawnT = (G.decor.sign ? 4.5 : 7.5) + Math.random() * 4;
      const used = new Set(S.customers.map(c => c.table));
      const free = []; for (let i = 0; i < n; i++) if (!used.has(i)) free.push(i);
      if (free.length && G.dishes.length > 0) {
        const stock = [...new Set(G.dishes.map(d => d.id))];
        const want = (Math.random() < 0.85 || G.known.length === 0) ? stock[Math.random() * stock.length | 0] : G.known[Math.random() * G.known.length | 0];
        const pat = 35 + (G.decor.rug ? 12 : 0);
        S.customers.push({ x: 240, y: 266, table: free[Math.random() * free.length | 0], want, state: 'walk', pat, maxPat: pat, spr: Math.random() * SPR.villagers.length | 0, t: 0, anim: Math.random() * 10 });
      }
    }
    for (const c of S.customers) {
      c.anim += dt;
      const [tx, ty] = SCN.TABLES[c.table];
      const sx = tx - 22, sy = ty + 6;
      if (c.state === 'walk') {
        const ddx = sx - c.x, ddy = sy - c.y, d = Math.hypot(ddx, ddy);
        if (d < 2) { c.state = 'wait'; c.x = sx; c.y = sy; } else { c.vx = ddx / d; c.vy = ddy / d; c.x += c.vx * 55 * dt; c.y += c.vy * 55 * dt; }
      } else if (c.state === 'wait') {
        c.pat -= dt;
        if (c.pat <= 0) { c.state = 'leave'; c.angry = true; UI.toast('손님이 기다리다 화가 나서 떠났어요...', 'bad'); }
      } else if (c.state === 'eat') {
        c.t -= dt;
        if (Math.random() < dt * 3) S.fx.push({ x: c.x + rand(-4, 4), y: c.y - 22, vx: 0, vy: -20, t: 0, life: 0.8, heart: true, grav: 0 });
        if (c.t <= 0) c.state = 'leave';
      } else if (c.state === 'leave') {
        const ddx = 240 - c.x, ddy = 270 - c.y, d = Math.hypot(ddx, ddy);
        if (d < 3) c.gone = true; else { c.vx = ddx / d; c.vy = ddy / d; c.x += c.vx * 60 * dt; c.y += c.vy * 60 * dt; }
      }
    }
    S.customers = S.customers.filter(c => !c.gone);
  }

  function serve(c) {
    if (c.state !== 'wait') return;
    if (dist(c.x, c.y, S.p.x, S.p.y) > 46) { addText(c.x, c.y - 30, '가까이 가서 서빙!', '#ffffff'); return; }
    const cands = G.dishes.map((d, i) => [d, i]).filter(([d]) => d.id === c.want).sort((a, b) => b[0].q - a[0].q);
    if (!cands.length) { addText(c.x, c.y - 30, '그 요리가 없어요!', '#ff8a7a'); SFX.play('bad'); return; }
    const [d, i] = cands[0];
    G.dishes.splice(i, 1);
    const r = recipeById(d.id);
    let pay = r.price * (1 + 0.3 * (d.q - 1)) * (G.decor.chandelier ? 1.15 : 1);
    const tipRate = (G.decor.plant ? 0.1 : 0) + (G.decor.painting ? 0.15 : 0) + (c.pat / c.maxPat) * 0.2;
    const tip = Math.round(pay * tipRate);
    pay = Math.round(pay);
    G.gold += pay + tip;
    G.stats.served++; G.stats.earned += pay + tip;
    c.state = 'eat'; c.t = 2.5;
    addText(c.x, c.y - 30, `+${pay + tip}G`, '#ffe060', true);
    if (tip > 0) addText(c.x, c.y - 40, `팁 ${tip}G`, '#fff0a0');
    SFX.play('coin');
    save();
  }

  // ---------------- 업데이트 ----------------
  function updateCamera(snap) {
    S.cam.x = clamp(Math.round(S.p.x - W / 2), 0, MW * TS - W);
    S.cam.y = clamp(Math.round(S.p.y - H / 2), 0, MH * TS - H);
  }

  function updateTown(dt, solid, points) {
    movePlayer(dt, solid);
    let best = null, bd = 30;
    for (const it of points) { const d = dist(it.x, it.y, S.p.x, S.p.y); if (d < bd) { bd = d; best = it; } }
    S.interact = best;
    UI.prompt(best ? `[E] ${best.label}` : null);
    G.hp = Math.min(maxHp(), G.hp + 6 * dt);
  }

  function updateDungeon(dt) {
    const p = S.p;
    p.shield = !!(S.mouse.right || S.keys.Space);
    p.aim = Math.atan2(S.mouse.wy - (p.y - 9), S.mouse.wx - p.x);
    movePlayer(dt, tileSolid);
    if (p.shield || S.attack) {
      p.dir = dirFromVec(Math.cos(p.aim), Math.sin(p.aim));
      p.face = Math.cos(p.aim) >= 0 ? 1 : -1;
    }
    if (p.atkCd > 0) p.atkCd -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (S.attack) { S.attack.t -= dt; if (S.attack.t <= 0) S.attack = null; }

    S.hover = null;
    for (const gp of S.gathers) {
      if (gp.done) continue;
      if (Math.abs(S.mouse.wx - gp.x) < 10 && S.mouse.wy > gp.y - 18 && S.mouse.wy < gp.y + 3) { S.hover = gp; break; }
    }
    if (S.harvest) {
      const h = S.harvest;
      if (dist(h.g.x, h.g.y, p.x, p.y) > 52) S.harvest = null;
      else { h.t += dt; if (h.t >= 0.5) { finishHarvest(h.g); S.harvest = null; } }
    }

    for (const m of S.mons) if (!m.dead) updMon(m, dt);
    S.mons = S.mons.filter(m => !m.dead);

    for (const pr of S.projs) {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      if (tileSolid(pr.x, pr.y) || pr.life <= 0) { pr.dead = true; burst(pr.x, pr.y, pr.kind === 'fire' ? '#ff8a30' : '#9ad8ff', 3, 30); continue; }
      if (dist(pr.x, pr.y, p.x, p.y - 7) < pr.r + 5) { pr.dead = true; hurtPlayer(pr.dmg, pr.x, pr.y, pr.kind, true); }
    }
    S.projs = S.projs.filter(pr => !pr.dead);

    for (const tl of S.tele) {
      tl.t -= dt;
      if (tl.t <= 0) {
        tl.dead = true;
        S.shake = Math.max(S.shake, 0.25);
        burst(tl.x, tl.y, '#ff8a6a', 12, 80);
        SFX.play('hit');
        if (dist(tl.x, tl.y, p.x, p.y - 3) < tl.r) hurtPlayer(tl.dmg, tl.x, tl.y - 20, 'slam', false);
      }
    }
    S.tele = S.tele.filter(t => !t.dead);

    for (const it of S.items) {
      it.t += dt;
      const d = dist(it.x, it.y, p.x, p.y - 6);
      if (it.t > 0.45 && d < 44) {
        const a = Math.atan2(p.y - 6 - it.y, p.x - it.x);
        it.x += Math.cos(a) * 150 * dt; it.y += Math.sin(a) * 150 * dt;
        if (d < 9) {
          it.dead = true;
          if (it.id === 'coin') { G.gold += it.val; addText(p.x, p.y - 26, `+${it.val}G`, '#ffe060'); SFX.play('coin'); }
          else { addIng(it.id); addText(p.x, p.y - 26, '+' + ING[it.id].name, '#c8ffb0'); SFX.play('pick'); }
        }
      } else {
        const nx = it.x + it.vx * dt, ny = it.y + it.vy * dt;
        if (!tileSolid(nx, ny)) { it.x = nx; it.y = ny; } else { it.vx = 0; it.vy = 0; }
        it.vz -= 260 * dt; it.z += it.vz * dt;
        if (it.z < 0) { it.z = 0; it.vz = -it.vz * 0.4; it.vx *= 0.5; it.vy *= 0.5; }
      }
    }
    S.items = S.items.filter(i => !i.dead);

    const Z = ZONES[S.zone];
    if (Z.req && !hasBuff(Z.req)) {
      S.envT -= dt;
      if (S.envT <= 0) { S.envT = 1; envDamage(Z.req === 'fireRes' ? 4 : 5, Z.req === 'fireRes' ? '너무 뜨거워!' : '숨이 막혀!'); }
    }
    const tUnder = tileAt(p.x, p.y);
    if (tUnder === 3) {
      S.lavaT -= dt;
      if (S.lavaT <= 0) { S.lavaT = 0.5; envDamage(hasBuff('fireRes') ? 2 : 7, '앗 뜨거!'); }
    }
    if (S.reqCd > 0) S.reqCd -= dt;
    if (tUnder === 4) {
      if (S.zone === 1) goScene('village', { x: 435, y: 166 });
      else goScene('dungeon', { zone: S.zone - 1, from: 'below' });
    } else if (tUnder === 5) {
      const nz = S.zone + 1, req = ZONES[nz].req;
      if (req && !hasBuff(req)) {
        moveEnt(p, -12, 0, 4, 3, tileSolid);
        if (S.reqCd <= 0) {
          S.reqCd = 2;
          UI.toast(req === 'fireRes'
            ? `${ZONES[nz].name}는 너무 뜨거워요! "화염 저항" 버프 요리를 먹고 오세요.`
            : `${ZONES[nz].name}는 물속이에요! "수중 호흡" 버프 요리를 먹고 오세요.`, 'bad');
          SFX.play('bad');
        }
      } else goScene('dungeon', { zone: nz, from: 'above' });
    }

    updateCamera();
    if (S.hover) UI.prompt(dist(S.hover.x, S.hover.y, p.x, p.y) <= 46 ? `[클릭] ${GATHER[S.hover.type].name} 채집하기` : `${GATHER[S.hover.type].name} - 더 가까이 가세요`);
    else UI.prompt(null);
    const boss = S.mons.find(m => m.type === 'boss');
    UI.bossBar(boss ? boss.hp / boss.maxHp : null);

    // 환경 파티클
    if (Math.random() < dt * 8) {
      const th = ZONES[S.zone].theme;
      const col = { forest: '#d8ff9a', jelly: '#ffc8f0', volcano: '#ff9a40', sea: '#bfeaff' }[th];
      S.ambient.push({ x: S.cam.x + rand(0, W), y: S.cam.y + (th === 'forest' || th === 'jelly' ? rand(0, H) : H + 4), vy: th === 'volcano' ? -rand(15, 35) : th === 'sea' ? -rand(10, 25) : -rand(2, 8), vx: rand(-6, 6), t: 0, life: rand(2, 5), col, bubble: th === 'sea' });
    }
  }

  function update(dt) {
    S.t += dt;
    UI.update(dt);
    if (S.shake > 0) S.shake -= dt;
    for (const c of S.clouds) { c.x += c.sp * dt; if (c.x > W + 10) c.x = -c.c.width - 10; }
    S.smoke.forEach(s => { s.t += dt; s.y -= 10 * dt; s.x += 4 * dt; });
    S.smoke = S.smoke.filter(s => s.t < 3);
    if (Math.random() < dt * 3) {
      const src = S.scene === 'title' ? S.bg.title.chimney : S.scene === 'village' ? S.bg.village.chimney : null;
      if (src) S.smoke.push({ x: src[0] + rand(-2, 2), y: src[1], t: 0 });
    }
    for (const f of S.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.grav || 0) * dt; }
    S.fx = S.fx.filter(f => f.t < f.life);
    for (const t of S.texts) t.t += dt;
    S.texts = S.texts.filter(t => t.t < 0.9);
    for (const a of S.ambient) { a.t += dt; a.x += a.vx * dt; a.y += a.vy * dt; }
    S.ambient = S.ambient.filter(a => a.t < a.life);

    S.mouse.wx = S.mouse.x + S.cam.x; S.mouse.wy = S.mouse.y + S.cam.y;
    if (S.scene === 'title' || !G || paused()) { if (G && S.scene !== 'title') UI.updateHUD(); return; }

    for (const k in G.buffs) {
      G.buffs[k] -= dt;
      if (G.buffs[k] <= 0) { delete G.buffs[k]; UI.toast(`${BUFFS[k].name} 효과가 끝났어요`); }
    }
    if (hasBuff('regen')) G.hp = Math.min(maxHp(), G.hp + (G.buffs.legend ? 4 : 2) * dt);
    G.hp = Math.min(G.hp, maxHp());

    if (S.scene === 'village') { S.p.shield = false; S.p.inv = 0; updateTown(dt, villageSolid, VIL_POINTS); }
    else if (S.scene === 'restaurant') { S.p.shield = false; S.p.inv = 0; updateTown(dt, restSolid, REST_POINTS); updateRestaurant(dt); }
    else if (S.scene === 'dungeon') updateDungeon(dt);

    S.saveT += dt;
    if (S.saveT > 15) { S.saveT = 0; save(); }
    UI.updateHUD();
  }

  // ---------------- 렌더링 ----------------
  function shadow(x, y, rx, ry) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawText(t) {
    const k = t.t / 0.9;
    const x = Math.round(t.x - S.cam.x), y = Math.round(t.y - S.cam.y - k * 14);
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    ctx.font = t.big ? 'bold 12px Galmuri11, monospace' : '10px Galmuri9, Galmuri11, monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#2a1a2e';
    ctx.strokeText(t.txt, x, y);
    ctx.fillStyle = t.col; ctx.fillText(t.txt, x, y);
    ctx.globalAlpha = 1;
  }

  function drawFx(dust = false) {
    for (const f of S.fx) {
      if (!!f.dust !== dust) continue;
      const x = Math.round(f.x - S.cam.x), y = Math.round(f.y - S.cam.y);
      const k = f.t / f.life;
      ctx.globalAlpha = 1 - k;
      if (f.heart) ctx.drawImage(SPR.heart, x - 3, y - 3);
      else if (f.dust) { ctx.fillStyle = f.col; const s = 1 + Math.round(k * 2); ctx.fillRect(x - s, y - s + 1, s * 2, s); }
      else { ctx.fillStyle = f.col; ctx.fillRect(x, y, f.size, f.size); }
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(armed) {
    const p = S.p;
    const img = charFrame(SPR.chef, p.dir, p.face, p.moving, p.walk, S.t);
    const x = Math.round(p.x - S.cam.x), y = Math.round(p.y - S.cam.y);
    shadow(x, y + 1, 6.5, 2.2);
    const blink = p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0;
    const behind = [], front = [];
    if (armed) {
      const pan = SPR.pan[G.up.pan], wpn = SPR.weapon[G.up.weapon];
      const step = p.moving ? [0, 1, 0, -1][Math.floor(p.walk * 9) % 4] : 0;
      const bodyY = y - 9 + (p.moving ? Math.floor(p.walk * 9) % 2 : Math.floor(S.t * 1.6) % 2);
      if (!p.shield) {
        if (p.dir === 'up') front.push(() => ctx.drawImage(pan, x - 6, bodyY - 4, 12, 8));
        else if (p.dir === 'down') behind.push(() => ctx.drawImage(pan, x - 1, bodyY - 9, 12, 8));
        else behind.push(() => { ctx.save(); ctx.translate(x - p.face * 5, bodyY - 1); ctx.scale(p.face, 1); ctx.drawImage(pan, -6, -4, 12, 8); ctx.restore(); });
      }
      const items = () => {
        if (p.shield) {
          ctx.save(); ctx.translate(x + Math.cos(p.aim) * 10, bodyY + Math.sin(p.aim) * 7); ctx.rotate(p.aim + Math.PI);
          ctx.drawImage(pan, -7, -6); ctx.restore();
        }
        let ang, hx, hy;
        if (S.attack) {
          const k = 1 - S.attack.t / S.attack.max;
          ang = S.attack.a - 1.3 + k * 2.6;
          hx = x + Math.cos(ang) * 5; hy = bodyY + Math.sin(ang) * 4;
        } else if (p.shield) {
          ang = p.aim + 1.6 * p.face; hx = x + p.face * 5; hy = bodyY + 3;
        } else if (p.dir === 'side') {
          ang = -Math.PI / 2 + p.face * 0.6; hx = x + p.face * (1 + step); hy = bodyY + 4;
        } else {
          const sgn = p.dir === 'down' ? 1 : -1;
          ang = -Math.PI / 2 + sgn * 0.35; hx = x + sgn * 6; hy = bodyY + 4 - (step * sgn < 0 ? 1 : 0);
        }
        ctx.save(); ctx.translate(Math.round(hx), Math.round(hy)); ctx.rotate(ang + Math.PI / 2); ctx.drawImage(wpn, -3, -15); ctx.restore();
        if (S.attack) {
          const k = 1 - S.attack.t / S.attack.max;
          ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - k * 0.6)})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, bodyY, 20 + G.up.weapon, S.attack.a - 1.2, S.attack.a - 1.2 + k * 2.4); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,240,180,0.5)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, bodyY, 24 + G.up.weapon, S.attack.a - 1.1, S.attack.a - 1.1 + k * 2.2); ctx.stroke();
        }
      };
      const itemsBehind = (S.attack || p.shield) ? Math.sin(p.aim) < -0.35 : p.dir === 'up';
      (itemsBehind ? behind : front).push(items);
    }
    behind.forEach(f => f());
    if (!blink) ctx.drawImage(img, x - 9, y - 24);
    front.forEach(f => f());
  }

  function drawSky(bg) {
    ctx.drawImage(bg.sky, 0, 0);
    for (const c of S.clouds) ctx.drawImage(c.c, Math.round(c.x), c.y);
  }

  function drawSmoke() {
    for (const s of S.smoke) {
      ctx.globalAlpha = Math.max(0, 0.55 * (1 - s.t / 3));
      ctx.fillStyle = '#e8e8f0';
      const r = 2 + s.t * 2.2;
      ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function renderTitle() {
    const bg = S.bg.title;
    drawSky(bg);
    for (let i = 0; i < 12; i++) {
      const tw = (Math.sin(S.t * 2 + i * 1.7) + 1) / 2;
      if (tw > 0.7) { const x = (PX.hash(i * 31) % 480), y = (PX.hash(i * 77) % 90); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); ctx.fillStyle = 'rgba(200,220,255,0.7)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
    ctx.drawImage(bg.land, 0, 0);
    drawSmoke();
    const walkX = Math.round(120 + Math.sin(S.t * 0.6) * 30);
    const face = Math.cos(S.t * 0.6) >= 0 ? 1 : -1;
    shadow(walkX, 263, 6.5, 2.2);
    ctx.save(); ctx.translate(walkX - face * 5, 253 + Math.floor(S.t * 9) % 2); ctx.scale(face, 1); ctx.drawImage(SPR.pan[0], -6, -4, 12, 8); ctx.restore();
    ctx.drawImage(charFrame(SPR.chef, 'side', face, true, S.t, S.t), walkX - 9, 238);
    shadow(352, 262, 6, 2);
    ctx.drawImage(catFrame(), 345, 245);
    ctx.drawImage(SPR.mon.slime.r[Math.floor(S.t * 2) % 2], 60, 248);
    ctx.drawImage(SPR.mon.mush.l[Math.floor(S.t * 3) % 2], 300, 246);
  }

  function catFrame() {
    if (S.t % 3.2 < 0.14) return SPR.catFrames[2];
    return SPR.catFrames[Math.floor(S.t * 1.5) % 2];
  }

  function renderVillage() {
    const bg = S.bg.village;
    drawSky(bg);
    ctx.drawImage(bg.land, 0, 0);
    drawSmoke();
    drawFx(true);
    const ents = [{ y: 166, draw: () => {
      shadow(230, 168, 6, 2);
      ctx.drawImage(catFrame(), 223, 150);
      if (!G.flags.met) {
        const by = 138 + Math.round(Math.sin(S.t * 5) * 1.5);
        ctx.fillStyle = '#2a1a2e'; ctx.fillRect(226, by - 1, 9, 11);
        ctx.fillStyle = '#ffe060'; ctx.fillRect(227, by, 7, 9);
        ctx.fillStyle = '#2a1a2e'; ctx.fillRect(230, by + 1, 1, 4); ctx.fillRect(230, by + 6, 1, 1);
      }
    } }, { y: S.p.y, draw: () => drawPlayer(false) }];
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  }

  function renderRestaurant() {
    ctx.drawImage(S.bg.restaurant, 0, 0);
    if (G.decor.chandelier) {
      ctx.fillStyle = 'rgba(255,230,140,0.12)';
      ctx.beginPath(); ctx.arc(330, 40, 70 + Math.sin(S.t * 2) * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8902a'; ctx.fillRect(329, 6, 2, 12); ctx.fillRect(316, 18, 28, 3);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ffe080'; ctx.fillRect(316 + i * 6.5, 14, 2, 4); }
    }
    drawFx(true);
    const ents = S.customers.map(c => ({ y: c.y, draw: () => drawCustomer(c) }));
    ents.push({ y: S.p.y, draw: () => drawPlayer(false) });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
  }

  function drawCustomer(c) {
    const moving = c.state === 'walk' || c.state === 'leave';
    const dir = moving ? dirFromVec(c.vx || 0, c.vy || 1) : 'side';
    const face = moving ? ((c.vx || 0) >= 0 ? 1 : -1) : 1;
    const x = Math.round(c.x), y = Math.round(c.y);
    shadow(x, y + 1, 6, 2);
    ctx.drawImage(charFrame(SPR.villagers[c.spr], dir, face, moving, c.anim * 0.8, S.t + c.spr * 0.37), x - 9, y - 24);
    if (c.state === 'wait') {
      const bx = x - 11, by = y - 47;
      ctx.fillStyle = '#2a1a2e'; ctx.fillRect(bx - 1, by - 1, 24, 22);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, 22, 20);
      ctx.fillStyle = '#2a1a2e'; ctx.fillRect(x - 1, by + 20, 3, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, by + 20, 1, 1);
      ctx.drawImage(SPR.dish[c.want], bx + 2, by + 1);
      const k = c.pat / c.maxPat;
      ctx.fillStyle = '#3a2a2a'; ctx.fillRect(bx, by + 23, 22, 3);
      ctx.fillStyle = k > 0.5 ? '#5ad04a' : k > 0.25 ? '#ffc030' : '#ff4a3a';
      ctx.fillRect(bx, by + 23, Math.round(22 * k), 3);
      const has = G.dishes.some(d => d.id === c.want);
      if (!has) { ctx.fillStyle = '#ff4a3a'; ctx.fillRect(bx + 17, by + 1, 4, 4); }
    } else if (c.angry && c.state === 'leave') {
      ctx.fillStyle = '#ff3a2a'; ctx.fillRect(x + 4, y - 27, 2, 5); ctx.fillRect(x + 8, y - 27, 2, 5); ctx.fillRect(x + 4, y - 20, 2, 1); ctx.fillRect(x + 8, y - 20, 2, 1);
    }
  }

  function renderDungeon() {
    const th = ZONES[S.zone].theme, T = SPR.tiles[th], m = S.map;
    ctx.fillStyle = SPR.THEMES[th].bg; ctx.fillRect(0, 0, W, H);
    const cx = S.cam.x, cy = S.cam.y;
    const x0 = Math.floor(cx / TS), y0 = Math.floor(cy / TS), x1 = Math.min(MW - 1, x0 + Math.ceil(W / TS) + 1), y1 = Math.min(MH - 1, y0 + Math.ceil(H / TS) + 1);
    const lf = Math.floor(S.t * 2) % 2;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = m.t[ty * MW + tx], v = m.v[ty * MW + tx], sx = tx * TS - cx, sy = ty * TS - cy;
      if (t === 1) ctx.drawImage(T.wall[v % 2], sx, sy);
      else if (t === 3) ctx.drawImage(T.lava[(lf + v) % 2], sx, sy);
      else if (t === 4) ctx.drawImage(T.up, sx, sy);
      else if (t === 5) ctx.drawImage(T.down, sx, sy);
      else ctx.drawImage(T.floor[v], sx, sy);
      if (t === 1 && ty + 1 < MH && m.t[(ty + 1) * MW + tx] !== 1) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx, sy + TS, TS, 3); }
    }
    for (const tl of S.tele) {
      const k = 1 - tl.t / tl.max;
      ctx.fillStyle = `rgba(255,40,30,${0.15 + k * 0.25})`;
      ctx.beginPath(); ctx.ellipse(tl.x - cx, tl.y - cy, tl.r, tl.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,60,0.9)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(tl.x - cx, tl.y - cy, tl.r * k, tl.r * 0.6 * k, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawFx(true);
    const ents = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (m.t[ty * MW + tx] === 2) { const sx = tx * TS - cx, sy = ty * TS - cy; ents.push({ y: ty * TS + 14, draw: () => { ctx.drawImage(T.floor[m.v[ty * MW + tx]], sx, sy); ctx.drawImage(T.block, sx - 1, sy - 2); } }); }
    }
    for (const gp of S.gathers) ents.push({ y: gp.y - 2, draw: () => {
      const s = SPR.gather[gp.type];
      const img = gp.done ? s.off : (S.hover === gp ? s.hi : s.on);
      ctx.drawImage(img, Math.round(gp.x - 9 - cx), Math.round(gp.y - 17 - cy));
      if (!gp.done && S.hover !== gp && Math.floor(S.t * 2 + gp.x) % 4 === 0) { ctx.fillStyle = '#fffbd0'; ctx.fillRect(Math.round(gp.x + 4 - cx), Math.round(gp.y - 16 - cy), 1, 1); }
    } });
    for (const mo of S.mons) ents.push({ y: mo.y + mo.r * 0.5, draw: () => drawMon(mo) });
    for (const it of S.items) ents.push({ y: it.y, draw: () => {
      const x = Math.round(it.x - cx), y = Math.round(it.y - cy - it.z - Math.abs(Math.sin(S.t * 4 + it.x)) * (it.t > 1 ? 1.5 : 0));
      shadow(it.x - cx, it.y - cy + 1, 4, 1.5);
      if (it.id === 'coin') ctx.drawImage(SPR.coin, x - 5, y - 8);
      else ctx.drawImage(SPR.ing[it.id], x - 8, y - 14);
    } });
    ents.push({ y: S.p.y, draw: () => drawPlayer(true) });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());

    for (const pr of S.projs) {
      const s = pr.kind === 'fire' ? SPR.fireball : SPR.bubble;
      ctx.drawImage(s, Math.round(pr.x - cx - s.width / 2), Math.round(pr.y - cy - s.height / 2));
    }
    if (S.harvest) {
      const h = S.harvest, k = h.t / 0.5;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.g.x - cx, h.g.y - cy - 24, 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    }
    for (const a of S.ambient) {
      ctx.globalAlpha = Math.min(1, (a.life - a.t) / 1) * 0.8;
      ctx.fillStyle = a.col;
      const ax = Math.round(a.x - cx + Math.sin(a.t * 2 + a.x) * 3), ay = Math.round(a.y - cy);
      if (a.bubble) { ctx.strokeStyle = a.col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ax, ay, 2, 0, Math.PI * 2); ctx.stroke(); }
      else ctx.fillRect(ax, ay, 1, 1);
    }
    ctx.globalAlpha = 1;
    drawFx();
    ctx.drawImage(S.bg.vignette, 0, 0);
    if (th === 'volcano') { ctx.fillStyle = `rgba(255,80,20,${0.06 + Math.sin(S.t * 2) * 0.03})`; ctx.fillRect(0, 0, W, H); }
    if (th === 'sea') { ctx.fillStyle = 'rgba(30,90,200,0.12)'; ctx.fillRect(0, 0, W, H); }
    const Z = ZONES[S.zone];
    if (Z.req && !hasBuff(Z.req)) { ctx.fillStyle = `rgba(255,0,0,${0.12 + Math.sin(S.t * 6) * 0.06})`; ctx.fillRect(0, 0, W, H); }
  }

  function drawMon(m) {
    const set = SPR.mon[m.type];
    const fr = Math.floor(m.anim * (m.type === 'boss' ? 3 : 5)) % 2;
    let img;
    const left = m.type !== 'boss' && m.face < 0;
    const teleFlash = m.state === 'tele' || m.state === 'charge';
    if (m.hurt > 0) img = left ? set.wl[fr] : set.w[fr];
    else if (teleFlash && Math.floor(S.t * 12) % 2 === 0) img = left ? set.ol[fr] : set.o[fr];
    else img = left ? set.l[fr] : set.r[fr];
    let x = m.x - S.cam.x, y = m.y - S.cam.y;
    if (m.state === 'tele' || (m.type === 'boss' && m.state === 'charge')) x += Math.sin(S.t * 60) * 1.2;
    shadow(x, y + img.height / 2 - 2, img.width * 0.35, 2.5);
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2 - (m.z || 0)));
    if (m.type === 'boss' && m.state === 'stun') {
      for (let i = 0; i < 3; i++) { const a = S.t * 4 + i * 2.1; ctx.drawImage(SPR.leaf, Math.round(x + Math.cos(a) * 14 - 6), Math.round(y - 26 + Math.sin(a) * 3)); }
    }
    if (m.type !== 'boss' && m.hp < m.maxHp) {
      const bw = 14, k = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = '#2a1a2e'; ctx.fillRect(Math.round(x - bw / 2) - 1, Math.round(y - img.height / 2 - 5), bw + 2, 4);
      ctx.fillStyle = '#ff5a4a'; ctx.fillRect(Math.round(x - bw / 2), Math.round(y - img.height / 2 - 4), Math.round(bw * k), 2);
    }
  }

  function drawCursor() {
    if (!S.mouse.inside || paused()) return;
    const x = Math.round(S.mouse.x), y = Math.round(S.mouse.y);
    let hand = false;
    if (S.scene === 'dungeon' && S.hover) hand = true;
    if (S.scene === 'village' || S.scene === 'restaurant') {
      const pts = S.scene === 'village' ? VIL_POINTS : REST_POINTS;
      if (pts.some(p => dist(S.mouse.wx, S.mouse.wy, p.cx, p.cy) < p.cr)) hand = true;
      if (S.scene === 'restaurant' && S.customers.some(c => c.state === 'wait' && Math.abs(S.mouse.wx - c.x) < 8 && S.mouse.wy > c.y - 22 && S.mouse.wy < c.y + 3)) hand = true;
    }
    if (S.scene === 'dungeon' && !hand) {
      ctx.fillStyle = '#2a1a2e';
      ctx.fillRect(x - 5, y - 1, 11, 3); ctx.fillRect(x - 1, y - 5, 3, 11);
      ctx.fillStyle = S.p.shield ? '#9ae8ff' : '#ffffff';
      ctx.fillRect(x - 4, y, 3, 1); ctx.fillRect(x + 2, y, 3, 1); ctx.fillRect(x, y - 4, 1, 3); ctx.fillRect(x, y + 2, 1, 3);
      return;
    }
    ctx.drawImage(hand ? SPR.cursor.hand : SPR.cursor.arrow, hand ? x - 3 : x, y);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (S.shake > 0 && S.scene === 'dungeon') ctx.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
    if (S.scene === 'title') renderTitle();
    else if (S.scene === 'village') renderVillage();
    else if (S.scene === 'restaurant') renderRestaurant();
    else if (S.scene === 'dungeon') renderDungeon();
    if (S.scene !== 'dungeon') drawFx();
    for (const t of S.texts) drawText(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawCursor();
  }

  // ---------------- 시작 ----------------
  function makeVignette() {
    const [c, g] = PX.canvas(W, H);
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }

  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    const wrap = document.getElementById('wrap');
    wrap.style.width = Math.floor(W * s) + 'px';
    wrap.style.height = Math.floor(H * s) + 'px';
    wrap.style.fontSize = Math.max(10, Math.min(22, s * 4.4)) + 'px';
  }

  let last = 0;
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function start() {
    SPR.init();
    S.bg.title = SCN.title();
    S.bg.village = SCN.village(null);
    S.bg.vignette = makeVignette();
    const rnd = PX.rng(9);
    S.clouds = [
      { c: SCN.cloud(90, rnd), x: 20, y: 18, sp: 3 },
      { c: SCN.cloud(60, rnd), x: 300, y: 40, sp: 5 },
      { c: SCN.cloud(110, rnd), x: 360, y: 8, sp: 2 },
      { c: SCN.cloud(50, rnd), x: 170, y: 58, sp: 4 },
    ];
    setupInput();
    UI.init();
    fit();
    window.addEventListener('resize', fit);
    UI.showTitle(true);
    requestAnimationFrame(loop);
  }

  return {
    get G() { return G; }, S, start, newGame, continueGame, hasSave, save, maxHp, playerAtkBase, addIng, useIng,
    eatDish, refreshDecor, zoneLabel, onPanelClosed, scene: () => S.scene,
  };
})();

window.addEventListener('load', () => {
  const go = () => Game.start();
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('10px Galmuri9'), document.fonts.load('12px Galmuri11')]),
      new Promise(r => setTimeout(r, 1500)),
    ]).then(go, go);
  } else go();
});
