import { CONFIG, ITEMS, THEMES, defaultOutfit, itemById } from './config.mjs';

function shuffle(list, random = Math.random) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickThemes(count = CONFIG.totalRounds, random = Math.random) {
  return shuffle(THEMES, random).slice(0, count);
}

export function scoreOutfit(outfit, theme) {
  const wants = new Set(theme.wants);
  let hits = 0;
  let filled = 0;
  for (const category of CONFIG.categories) {
    const item = itemById(category.id, outfit[category.id]);
    if (!item) continue;
    filled += 1;
    if (item.tags.some((tag) => wants.has(tag))) hits += 1;
  }
  // 5칸 중 맞는 개수로 별 0~3
  let stars = 0;
  if (hits >= 5) stars = 3;
  else if (hits >= 3) stars = 2;
  else if (hits >= 1) stars = 1;

  // 같은 색 계열(hex 앞 비슷)은 보너스 없이 단순 유지. 완전 미스면 최소 0.
  if (filled === 0) stars = 0;
  return { stars, hits, filled };
}

function praise(stars, theme) {
  if (stars >= 3) return `${theme.title}에 완벽한 코디야! 최고 스타일리스트!`;
  if (stars === 2) return `분위기랑 잘 맞아! 조금만 더 다듬어 볼까?`;
  if (stars === 1) return `시작은 좋았어. 약속에 맞는 옷을 더 골라 봐!`;
  return `다른 옷을 섞어 보면 더 잘 어울릴 거야!`;
}

export function createGame() {
  const queue = pickThemes();
  return {
    phase: 'dress', // dress | reveal
    round: 0,
    queue,
    outfit: defaultOutfit(),
    category: 'hair',
    totalStars: 0,
    lastScore: null,
    toast: queue[0]?.blurb || '옷을 골라 코디해 봐!',
    toastLife: 2.4,
    sparkle: 0,
    result: null,
  };
}

export function currentTheme(state) {
  return state.queue[state.round] || state.queue[state.queue.length - 1];
}

export function selectCategory(state, categoryId) {
  if (state.phase !== 'dress' || state.result) return;
  if (!CONFIG.categories.some((c) => c.id === categoryId)) return;
  state.category = categoryId;
}

export function selectItem(state, itemId) {
  if (state.phase !== 'dress' || state.result) return;
  const list = ITEMS[state.category] || [];
  if (!list.some((item) => item.id === itemId)) return;
  state.outfit = { ...state.outfit, [state.category]: itemId };
  state.toast = `${list.find((i) => i.id === itemId).name} 골랐어!`;
  state.toastLife = 1.2;
}

export function finishOutfit(state) {
  if (state.phase !== 'dress' || state.result) return;
  const theme = currentTheme(state);
  const score = scoreOutfit(state.outfit, theme);
  state.lastScore = score;
  state.totalStars += score.stars;
  state.phase = 'reveal';
  state.sparkle = 1.2;
  state.toast = praise(score.stars, theme);
  state.toastLife = 2.8;
}

export function nextRound(state) {
  if (state.phase !== 'reveal' || state.result) return;
  if (state.round + 1 >= state.queue.length) {
    const avg = state.totalStars / Math.max(1, state.queue.length);
    const success = state.totalStars >= state.queue.length; // 라운드당 평균 1별 이상
    state.result = {
      success,
      message: success
        ? `총 ${state.totalStars}별! 멋있는 코디 ${state.queue.length}장면을 완성했어.`
        : `총 ${state.totalStars}별이야. 약속에 맞는 옷을 더 맞춰 보면 별이 늘어나!`,
      stars: state.totalStars,
      avg,
    };
    return;
  }
  state.round += 1;
  state.phase = 'dress';
  state.outfit = defaultOutfit();
  state.category = 'hair';
  state.lastScore = null;
  state.toast = currentTheme(state).blurb;
  state.toastLife = 2.2;
}

/** UI 히트 영역: 논리 좌표 기준 */
export function layout() {
  const w = CONFIG.width;
  return {
    tabsY: 558,
    tabsH: 40,
    itemY: 606,
    itemH: 74,
    finish: { x: w / 2 - 78, y: 508, w: 156, h: 38 },
    next: { x: w / 2 - 78, y: 508, w: 156, h: 38 },
    tabW: (w - 36) / CONFIG.categories.length,
    itemSlotW: 86,
  };
}

function hitBox(x, y, box) {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

export function handlePointer(state, pointer) {
  if (!pointer?.pressed || state.result) return;
  const L = layout();
  const { x, y } = pointer;

  if (state.phase === 'dress') {
    // category tabs
    if (y >= L.tabsY && y <= L.tabsY + L.tabsH) {
      const index = Math.floor((x - 18) / L.tabW);
      const cat = CONFIG.categories[index];
      if (cat) selectCategory(state, cat.id);
      return;
    }
    // items
    if (y >= L.itemY && y <= L.itemY + L.itemH) {
      const list = ITEMS[state.category] || [];
      const startX = 18;
      const index = Math.floor((x - startX) / (L.itemSlotW + 8));
      const item = list[index];
      if (item) selectItem(state, item.id);
      return;
    }
    if (hitBox(x, y, L.finish)) finishOutfit(state);
    return;
  }

  if (state.phase === 'reveal' && hitBox(x, y, L.next)) {
    nextRound(state);
  }
}

export function updateGame(state, dt, input = {}) {
  if (state.result) return;
  if (state.toastLife > 0) state.toastLife = Math.max(0, state.toastLife - dt);
  if (state.sparkle > 0) state.sparkle = Math.max(0, state.sparkle - dt);

  const pressed = input.pressed || new Set();
  if (state.phase === 'dress') {
    for (let i = 1; i <= 5; i++) {
      if (pressed.has(String(i))) {
        const cat = CONFIG.categories[i - 1];
        if (cat) selectCategory(state, cat.id);
      }
    }
    if (pressed.has('enter')) finishOutfit(state);
  } else if (state.phase === 'reveal' && pressed.has('enter')) {
    nextRound(state);
  }

  if (input.pointer?.pressed) handlePointer(state, input.pointer);
}
