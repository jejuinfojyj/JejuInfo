(function () {
  'use strict';
  const cfg = window.GAME_CONFIG || {};
  const rules = cfg.rules || {};
  const TIME = (rules.timeSec || 90) * 1000;
  const NEED1 = rules.phaseOneClears || 10;
  const NEED2 = rules.phaseTwoClears || 12;
  const COLS = rules.columns || 6;
  const ROWS = rules.rows || 6;
  const KINDS1 = ['plain', 'pine', 'berry'];
  const KINDS2 = ['plain', 'pine', 'berry', 'bell', 'gift'];
  const NAMES = {
    plain: '하얀 눈덩이',
    pine: '솔잎 눈덩이',
    berry: '열매 눈덩이',
    bell: '방울 눈덩이',
    gift: '선물 눈덩이'
  };
  const HATS = ['assets/snowman-done.png', 'assets/snowman-top.png', 'assets/snowman-party.png'];

  const app = document.getElementById('app');
  const board = document.getElementById('board');
  const hero = document.getElementById('hero');
  const timerEl = document.getElementById('timer');
  const goal = document.getElementById('goal-label');
  const hint = document.getElementById('hint');
  const announce = document.getElementById('announce');
  const screens = {
    start: document.getElementById('screen-start'),
    pause: document.getElementById('screen-pause'),
    result: document.getElementById('screen-result')
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cells = [];
  let phase = 1;
  let clears = 0;
  let remain = TIME;
  let lastTick = 0;
  let running = false;
  let lock = false;
  let soundOn = true;
  let audio;
  let hat = HATS[0];

  function roll(list) { return list[Math.floor(Math.random() * list.length)]; }
  function kinds() { return phase === 1 ? KINDS1 : KINDS2; }
  function index(x, y) { return y * COLS + x; }

  function neighbors(i) {
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    const found = [];
    if (x > 0) found.push(i - 1);
    if (x < COLS - 1) found.push(i + 1);
    if (y > 0) found.push(i - COLS);
    if (y < ROWS - 1) found.push(i + COLS);
    return found;
  }

  function flood(start) {
    const kind = cells[start];
    if (!kind) return [];
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      for (const next of neighbors(cur)) {
        if (!seen.has(next) && cells[next] === kind) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    return [...seen];
  }

  function hasMove() {
    const seen = new Set();
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i] || seen.has(i)) continue;
      const group = flood(i);
      group.forEach((n) => seen.add(n));
      if (group.length >= 3) return true;
    }
    return false;
  }

  function ensureTrio(kind) {
    if (hasMove()) return;
    cells[0] = kind;
    cells[1] = kind;
    cells[2] = kind;
  }

  function fillBoard() {
    cells = Array.from({ length: COLS * ROWS }, () => roll(kinds()));
    ensureTrio(kinds()[0]);
  }

  function settle() {
    const born = [];
    const list = kinds();
    for (let x = 0; x < COLS; x++) {
      const old = [];
      for (let y = 0; y < ROWS; y++) if (cells[index(x, y)]) old.push(cells[index(x, y)]);
      const missing = ROWS - old.length;
      const col = [];
      for (let n = 0; n < missing; n++) col.push(roll(list));
      col.push(...old);
      for (let y = 0; y < ROWS; y++) {
        const i = index(x, y);
        cells[i] = col[y];
        if (y < missing) born.push(i);
      }
    }
    ensureTrio(list[0]);
    return born;
  }

  function render(born) {
    const drop = new Set(born || []);
    board.style.gridTemplateColumns = 'repeat(' + COLS + ', minmax(0, 1fr))';
    board.style.gridTemplateRows = 'repeat(' + ROWS + ', minmax(0, 1fr))';
    board.replaceChildren();
    cells.forEach((kind, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile' + (drop.has(i) && !reduce ? ' drop' : '');
      button.dataset.i = String(i);
      button.style.backgroundImage = 'url("assets/snow-' + kind + '.png")';
      button.setAttribute('aria-label', NAMES[kind]);
      button.addEventListener('click', () => onTap(i, button));
      board.appendChild(button);
    });
  }

  function paintHero() {
    let src = 'assets/snowman-lump.png';
    let grow = 0.62 + 0.38 * Math.min(1, clears / NEED1);
    if (phase === 2) {
      grow = 1;
      const step = clears / NEED2;
      src = step >= 1 ? hat : step >= 0.66 ? 'assets/snowman-body.png' : step >= 0.33 ? 'assets/snowman-mid.png' : 'assets/snowman-lump.png';
    }
    hero.style.setProperty('--grow', grow.toFixed(3));
    if (hero.getAttribute('src') !== src) hero.src = src;
    app.dataset.phase = String(phase);
  }

  function showTimer() {
    const sec = Math.max(0, Math.ceil(remain / 1000));
    const text = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    if (timerEl.textContent !== text) timerEl.textContent = text;
    timerEl.classList.toggle('danger', sec <= 20 && sec > 0);
  }

  function say(text) { announce.textContent = text; }

  function beep(freq, length) {
    if (!soundOn || !audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + length);
    osc.stop(audio.currentTime + length);
  }

  function setState(name) {
    app.dataset.state = name;
    screens.start.hidden = name !== 'start';
    screens.pause.hidden = name !== 'pause';
    screens.result.hidden = name !== 'result';
    document.getElementById('pause-btn').disabled = name !== 'play';
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(100, now - lastTick);
    lastTick = now;
    remain -= dt;
    if (remain <= 0) {
      remain = 0;
      showTimer();
      finish(false);
      return;
    }
    showTimer();
    requestAnimationFrame(frame);
  }

  function startClock() {
    running = true;
    lastTick = performance.now();
    requestAnimationFrame(frame);
  }

  function stopClock() { running = false; }

  function begin() {
    phase = 1;
    clears = 0;
    remain = TIME;
    lock = false;
    hat = HATS[Math.floor(Math.random() * HATS.length)];
    fillBoard();
    goal.textContent = '같은 눈을 모아 하나로';
    hint.classList.remove('gone');
    showTimer();
    paintHero();
    render();
    setState('play');
    say('같은 눈덩이 3칸을 모아 하나로 만드세요. 제한 시간은 1분 30초입니다.');
    startClock();
  }

  function enterPhaseTwo() {
    phase = 2;
    clears = 0;
    goal.textContent = '어려운 퍼즐, 몸을 맞춰';
    say('어려운 퍼즐입니다. 눈사람 몸을 맞추세요.');
    fillBoard();
    paintHero();
    render();
    beep(520, 0.12);
  }

  function finish(won) {
    stopClock();
    lock = true;
    setState('result');
    const title = document.getElementById('result-title');
    const copy = document.getElementById('result-copy');
    if (won) {
      hero.src = hat;
      hero.style.setProperty('--grow', '1');
      title.textContent = '눈사람을 만들었어';
      copy.textContent = '목도리와 모자가 붙었어. 남은 시간 ' + timerEl.textContent;
      say('눈사람을 만들었습니다.');
      beep(660, 0.08);
      setTimeout(() => beep(880, 0.12), 90);
    } else {
      title.textContent = '눈이 녹기 시작했어';
      copy.textContent = phase === 1 ? '하나로 모으기 전에 시간이 끝났어.' : '몸을 다 맞추기 전에 시간이 끝났어.';
      say('시간이 끝나 눈사람을 완성하지 못했습니다.');
      beep(180, 0.16);
    }
  }

  function onTap(i, button) {
    if (app.dataset.state !== 'play' || lock) return;
    const group = flood(i);
    if (group.length < 3) {
      button.classList.remove('shake');
      void button.offsetWidth;
      button.classList.add('shake');
      beep(140, 0.06);
      return;
    }
    lock = true;
    hint.classList.add('gone');
    group.forEach((n) => { cells[n] = null; });
    clears += 1;
    beep(phase === 1 ? 440 : 560, 0.07);
    const born = settle();
    paintHero();
    const wait = reduce ? 0 : 90;
    setTimeout(() => {
      if (app.dataset.state !== 'play') return;
      if (phase === 1 && clears >= NEED1) enterPhaseTwo();
      else if (phase === 2 && clears >= NEED2) {
        paintHero();
        render(born);
        finish(true);
        return;
      } else render(born);
      lock = false;
    }, wait);
  }

  function togglePause() {
    if (app.dataset.state === 'play') {
      stopClock();
      setState('pause');
      say('잠시 멈췄습니다.');
    } else if (app.dataset.state === 'pause') {
      setState('play');
      startClock();
    }
  }

  document.getElementById('start-btn').addEventListener('click', () => {
    if (!audio) audio = new AudioContext();
    if (audio.state === 'suspended') audio.resume();
    begin();
  });
  document.getElementById('pause-btn').addEventListener('click', togglePause);
  document.getElementById('resume-btn').addEventListener('click', togglePause);
  document.getElementById('restart-btn').addEventListener('click', begin);
  document.getElementById('again-btn').addEventListener('click', begin);
  document.getElementById('sound-btn').addEventListener('click', (event) => {
    soundOn = !soundOn;
    event.currentTarget.textContent = soundOn ? '소리 끄기' : '소리 켜기';
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (app.dataset.state === 'play' || app.dataset.state === 'pause')) {
      event.preventDefault();
      togglePause();
    } else if (event.key === 'Enter' && app.dataset.state === 'pause') {
      togglePause();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && app.dataset.state === 'play') togglePause();
  });

  showTimer();
  paintHero();
  fillBoard();
  render();
  setState('start');
})();
