import { mountGame } from './game-shell.js';
import { CONFIG, KEYS, STAGES, UI_ART } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { renderGame, LAYOUT } from './render.mjs';
import { HEROES, PETS, heroSprite, petSprite, findPet, imageFor } from './characters.mjs';
import { loadProfile, saveProfile } from './profile.mjs';
import { sfx, unlockAudio, setSoundEnabled } from './sound.mjs';

const profile = loadProfile({ heroIds: HEROES.map(h => h.id), petIds: PETS.map(p => p.id) });
setSoundEnabled(profile.sound);

const canvas = document.getElementById('game-canvas');
const primary = document.getElementById('round-primary');
const shop = document.getElementById('shop');
const recordLine = document.getElementById('record-line');
const heroList = document.getElementById('hero-list');
const petList = document.getElementById('pet-list');
const soundToggle = document.getElementById('sound-toggle');
const stepControls = document.getElementById('step-controls');
const overlay = document.getElementById('round-overlay');
const lobbyDock = document.getElementById('lobby-dock');
const panels = {
  modes: document.getElementById('panel-modes'),
  shop,
  records: document.getElementById('panel-records'),
  settings: document.getElementById('panel-settings'),
};
const bestStat = document.getElementById('best-stat');
const coinStat = document.getElementById('coin-stat');
const recordBest = document.getElementById('record-best');
const recordCoins = document.getElementById('record-coins');
const settingsHelp = document.getElementById('settings-help');
const lobbySound = document.getElementById('lobby-sound');

const queue = [];
let runner = null, lastMode = '', resultAt = 0, openPanel = null, playMode = 'normal';

function choice() {
  const pet = findPet(profile.pet);
  return {
    hero: profile.hero,
    pet: pet.id,
    coinMultiplier: pet.coinMultiplier,
    gainBonus: pet.gainBonus,
    practice: playMode === 'practice',
  };
}

function finishRun(state) {
  state.saved = true;
  const previous = profile.best;
  profile.coins += state.coins;
  const practice = !!state.practice;
  if (!practice) profile.best = Math.max(profile.best, state.score);
  saveProfile(profile);
  const newBest = !practice && state.score > previous;
  const why = state.result.reason === 'time' ? '시간 막대가 다 줄었어!' : '방향을 잘못 골라 떨어졌어!';
  state.result.success = newBest || (practice && state.score >= 30);
  if (practice) {
    state.result.message = `연습 결과 ${state.score}계단!\n${why}\n연습 모드는 최고 기록에 안 들어가.\n코인 +${state.coins} · 모은 코인 ${profile.coins}`;
  } else {
    state.result.message = (newBest ? `새 최고 기록! ${state.score}계단` : `${state.score}계단 올랐어 (최고 ${profile.best}계단)`)
      + `\n${why}\n코인 +${state.coins} · 모은 코인 ${profile.coins}`;
  }
  resultAt = performance.now();
  refreshShop();
}

runner = mountGame({
  title: CONFIG.title,
  description: '오른쪽 버튼으로 바라보는 방향의 계단을 올라가!\n다음 계단이 반대쪽으로 꺾이면 왼쪽 버튼으로 방향을 바꾸면서 한 칸 올라가. 시간 막대가 다 줄거나 허공을 밟으면 끝!',
  controls: '왼쪽: 방향 전환하며 오르기 / R\n오른쪽: 계단 오르기 / I\n처음 15계단은 방향을 바꿀 때와 오를 때 해당 버튼이 빛나요. Esc 쉬기',
  width: LAYOUT.width,
  height: LAYOUT.height,
  theme: CONFIG.palette,
  create: () => createGame(choice()),
  update(state, dt) {
    updateGame(state, dt, queue.splice(0));
    for (const event of state.events.splice(0)) sfx[event]?.(state);
    if (state.result && !state.saved) finishRun(state);
  },
  render(ctx, state, view) {
    const mode = runner?.mode || 'start';
    if (mode !== 'play') queue.length = 0;
    renderGame(ctx, state, { ...view, mode });
    if (mode !== lastMode) { lastMode = mode; syncOverlay(mode); }
  },
});

function setLobbyPanel(name) {
  const next = openPanel === name ? null : name;
  openPanel = next;
  for (const [key, el] of Object.entries(panels)) {
    if (el) el.hidden = key !== next;
  }
  for (const button of lobbyDock.querySelectorAll('[data-panel]')) {
    button.classList.toggle('active', button.dataset.panel === next);
  }
}

function syncOverlay(mode) {
  stepControls.hidden = mode !== 'play';
  overlay.classList.toggle('pause-mode', mode === 'pause');
  const lobby = mode === 'start' || mode === 'result';
  recordLine.hidden = !lobby;
  if (!lobby) setLobbyPanel(null);
  if (mode === 'start') primary.textContent = '▶ 시작';
  else if (mode === 'result') primary.textContent = '▶ 다시';
  const help = document.getElementById('game-help');
  const desc = document.getElementById('round-description');
  if (settingsHelp) {
    settingsHelp.textContent = [desc?.textContent, help?.textContent].filter(Boolean).join('\n\n');
  }
  refreshShop();
}

for (const button of lobbyDock.querySelectorAll('[data-panel]')) {
  button.addEventListener('click', () => {
    unlockAudio();
    setLobbyPanel(button.dataset.panel);
  });
}
lobbySound?.addEventListener('click', () => soundToggle.click());
function syncModeCards() {
  for (const item of document.querySelectorAll('.mode-card')) {
    item.classList.toggle('selected', item.dataset.mode === playMode);
  }
  refreshShop();
}

document.querySelector('.mode-grid')?.addEventListener('click', event => {
  const card = event.target.closest('.mode-card:not(:disabled)');
  if (!card) return;
  playMode = card.dataset.mode || 'normal';
  unlockAudio();
  syncModeCards();
});
primary.addEventListener('click', () => {
  // Capture before game-shell starts so lobby mode choice is applied.
  if (runner.mode === 'start') {
    runner.state = createGame(choice());
    runner.time = 0;
  }
  setLobbyPanel(null);
}, true);
syncModeCards();

function enqueueAction(action) {
  unlockAudio();
  if (runner.mode !== 'play' || runner.state.phase !== 'play') return;
  queue.push(action);
  canvas.focus({ preventScroll: true });
}

// The left screen half turns and climbs; the right half climbs straight.
canvas.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  enqueueAction((event.clientX - rect.left) / rect.width < 0.5 ? 'turn' : 'climb');
});

for (const button of stepControls.querySelectorAll('[data-action]')) {
  button.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    enqueueAction(button.dataset.action);
  });
  // Keyboard and assistive-technology clicks have no pointer click count.
  button.addEventListener('click', event => {
    if (event.detail === 0) enqueueAction(button.dataset.action);
  });
}

window.addEventListener('keydown', event => {
  if (event.target.closest?.('dialog,input,textarea,select,summary,a,#maker-guide')) return;
  if (event.target.closest?.('button') && !event.target.closest?.('[data-action]')) return;
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (runner.mode === 'play') {
    if (KEYS.turn.includes(key)) { event.preventDefault(); enqueueAction('turn'); }
    else if (KEYS.climb.includes(key)) { event.preventDefault(); enqueueAction('climb'); }
    return;
  }
  if ((key === 'enter' || key === ' ') && runner.mode !== 'pause' && performance.now() - resultAt > 700) {
    event.preventDefault();
    unlockAudio();
    primary.click();
  }
});

for (const id of ['round-primary', 'round-restart']) document.getElementById(id).addEventListener('click', unlockAudio);

function updateSoundButton() {
  soundToggle.textContent = profile.sound ? '소리 켬 🔊' : '소리 끔 🔇';
  soundToggle.setAttribute('aria-pressed', String(profile.sound));
}
soundToggle.addEventListener('click', () => {
  profile.sound = !profile.sound;
  setSoundEnabled(profile.sound);
  saveProfile(profile);
  unlockAudio();
  updateSoundButton();
  canvas.focus({ preventScroll: true });
});

const ownedList = kind => profile.owned[kind === 'hero' ? 'heroes' : 'pets'];

function makeChip(kind, item, sprite) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.dataset.kind = kind;
  button.dataset.id = item.id;
  const art = document.createElement('canvas');
  art.width = 40; art.height = 48;
  const g = art.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (sprite) {
    const scale = Math.min(40 / sprite.width, 48 / sprite.height), w = sprite.width * scale, h = sprite.height * scale;
    g.drawImage(sprite, (40 - w) / 2, 48 - h, w, h);
  } else {
    g.strokeStyle = '#ffffff88'; g.lineWidth = 3; g.setLineDash([5, 4]);
    g.beginPath(); g.arc(20, 26, 13, 0, Math.PI * 2); g.stroke();
  }
  const name = document.createElement('span'); name.className = 'name'; name.textContent = item.name;
  const price = document.createElement('span'); price.className = 'price';
  button.append(art, name, price);
  button.addEventListener('click', () => choose(kind, item));
  return button;
}

function choose(kind, item) {
  const owned = ownedList(kind);
  if (!owned.includes(item.id)) {
    if (profile.coins < item.price) return;
    profile.coins -= item.price;
    owned.push(item.id);
    unlockAudio();
    sfx.buy();
  }
  profile[kind] = item.id;
  saveProfile(profile);
  const state = runner.state;
  if (kind === 'hero') state.hero = item.id;
  else Object.assign(state, { pet: item.id, coinMultiplier: item.coinMultiplier, gainBonus: item.gainBonus });
  refreshShop();
}

function refreshShop() {
  const modeLabel = playMode === 'practice' ? '연습 모드' : '일반 모드';
  recordLine.textContent = `${modeLabel} · 최고 ${profile.best}계단 · 코인 ${profile.coins}`;
  if (bestStat) bestStat.textContent = String(profile.best);
  if (coinStat) coinStat.textContent = String(profile.coins);
  if (recordBest) recordBest.textContent = `${profile.best}계단`;
  if (recordCoins) recordCoins.textContent = String(profile.coins);
  for (const button of shop.querySelectorAll('.chip')) {
    const kind = button.dataset.kind, list = kind === 'hero' ? HEROES : PETS;
    const item = list.find(entry => entry.id === button.dataset.id);
    const owned = ownedList(kind).includes(item.id), selected = profile[kind] === item.id;
    button.classList.toggle('selected', selected);
    button.classList.toggle('locked', !owned);
    button.disabled = !owned && profile.coins < item.price;
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.price').textContent = owned ? (selected ? '선택됨' : (item.perk || '보유')) : `● ${item.price}`;
    button.title = owned ? item.name + (item.perk ? ' · ' + item.perk : '') : `${item.name}: 코인 ${item.price}개로 열기`;
  }
}

for (const hero of HEROES) {
  if (hero.frames) { imageFor(hero.frames.stand); imageFor(hero.frames.step); }
}
for (const pet of PETS) if (pet.image) imageFor(pet.image);
for (const stage of STAGES) { imageFor(stage.skyImage); imageFor(stage.stepImage); }
for (const src of Object.values(UI_ART)) imageFor(src);

heroList.replaceChildren(...HEROES.map(hero => makeChip('hero', hero, heroSprite(hero))));
petList.replaceChildren(...PETS.map(pet => makeChip('pet', pet, petSprite(pet))));
updateSoundButton();
syncOverlay(runner.mode);
