(function () {
  'use strict';

  const W = 256, H = 224, FY = 16, T = 8, COLS = 32, ROWS = 26, FW = 256, FH = 208;
  const GAP0 = 14, GAP1 = 17;
  const GRAV = 620, MAXFALL = 120, JUMPV = -232, SPEED = 78;
  const LAST_ROUND = 100, BOSS_ROUNDS = [50, 100];
  const ANGRY_AT = 22, GHOST_AT = 36, GHOST_TIME = 10;
  const ROUND_PICKS = [1, 10, 25, 50, 75, 100];
  const LETTER_COLORS = ['#ff5fa8', '#ffb020', '#ffd23f', '#3fe04a', '#45c8ff', '#c86bff'];
  const FRUITS = [{ name: 'cherry', pts: 500 }, { name: 'orange', pts: 700 }, { name: 'melon', pts: 1000 }];
  const PALS = [
    ['#ff8a1f', '#ffd08a', '#a8470a'], ['#ff5fa8', '#ffc2de', '#a3245e'], ['#45c8ff', '#c4efff', '#1c6fa3'],
    ['#7be04a', '#d6ffb8', '#3a8a1a'], ['#c86bff', '#ead0ff', '#6a2ca8'], ['#ffd23f', '#fff2b0', '#a8850a'],
    ['#ff4a4a', '#ffb0b0', '#9a1a1a'], ['#2fe0c8', '#c0fff4', '#11806e']
  ];

  const $ = (id) => document.getElementById(id);
  const canvas = $('screen');
  const ctx = canvas.getContext('2d');
  const frame = $('frame');
  const rand = Math.random;
  let SC = 3;

  // ---------- 화면 크기 ----------
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const pad = 28;
    const k = Math.max(1, Math.min((vw - pad) / W, (vh - pad) / H));
    const cw = Math.floor(W * k), ch = Math.floor(H * k);
    frame.style.width = (cw + 12) + 'px';
    frame.style.height = (ch + 12) + 'px';
    frame.style.setProperty('--u', (cw / W).toFixed(3) + 'px');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    SC = Math.max(1, Math.round(k * dpr));
    canvas.width = W * SC;
    canvas.height = H * SC;
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- 소리 ----------
  let actx = null;
  let soundOn = localStorage.getItem('bogle-sound') !== 'off';
  function ensureAudio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function toneAt(t, freq, dur, type, vol, slide) {
    if (!soundOn || !actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function tone(freq, dur, type, vol, slide, delay) {
    if (!actx) return;
    toneAt(actx.currentTime + (delay || 0), freq, dur, type, vol, slide);
  }
  const SFX = {
    shoot: () => tone(520, 0.08, 'square', 0.04, 950),
    jump: () => tone(300, 0.12, 'square', 0.03, 620),
    pop: () => tone(900, 0.06, 'triangle', 0.07, 300),
    kill: () => { tone(660, 0.08, 'square', 0.05); tone(990, 0.1, 'square', 0.05, null, 0.07); },
    item: () => tone(1200, 0.07, 'square', 0.04, 1700),
    letter: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.08, 'square', 0.05, null, i * 0.06)),
    extend: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.06, null, i * 0.09)),
    die: () => tone(620, 0.8, 'sawtooth', 0.05, 70),
    hurry: () => [0, 0.15, 0.3, 0.45].forEach((d) => tone(1400, 0.08, 'square', 0.05, null, d)),
    clear: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.1, 'square', 0.05, null, i * 0.08)),
    bossHit: () => tone(220, 0.08, 'square', 0.06, 110)
  };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const MELODY = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 84, 83, 81, 79, 76, 0, 77, 81, 84, 81, 77, 76, 74, 76, 77, 81, 86, 84, 83, 79, 74, 0];
  const BASS = [48, 55, 45, 52, 41, 48, 43, 50];
  let musicStep = 0, musicTime = 0;
  setInterval(function () {
    if (!actx || !soundOn || mode !== 'play') { musicTime = 0; return; }
    const step = 0.14;
    if (musicTime < actx.currentTime) musicTime = actx.currentTime + 0.05;
    while (musicTime < actx.currentTime + 0.2) {
      const m = MELODY[musicStep % MELODY.length];
      if (m) toneAt(musicTime, midi(m), step * 0.9, 'square', 0.018);
      if (musicStep % 4 === 0) toneAt(musicTime, midi(BASS[(musicStep / 4) % BASS.length]), step * 3.5, 'triangle', 0.05);
      musicStep++;
      musicTime += step;
    }
  }, 50);

  // ---------- 입력 ----------
  const keys = { left: false, right: false, down: false, jump: false, shoot: false };
  const pressed = { jump: false, shoot: false, down: false };
  const KEYMAP = {
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    KeyW: 'jump', ArrowUp: 'jump', KeyK: 'jump', KeyS: 'down', ArrowDown: 'down',
    KeyJ: 'shoot', Space: 'shoot'
  };
  function setKey(k, v) {
    if (v && !keys[k]) pressed[k] = true;
    keys[k] = v;
  }
  function clearKeys() {
    Object.keys(keys).forEach((k) => { keys[k] = false; });
  }

  window.addEventListener('keydown', function (e) {
    if (document.querySelector('dialog[open]')) return;
    if (mode === 'play') {
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); pauseGame(); return; }
      const k = KEYMAP[e.code];
      if (k) { e.preventDefault(); if (!e.repeat) setKey(k, true); }
      return;
    }
    if (mode === 'title') {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { e.preventDefault(); pickRound(-1); }
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') { e.preventDefault(); pickRound(1); }
      else if (e.code === 'Enter') { e.preventDefault(); startGame(); }
    } else if (mode === 'pause') {
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); resumeGame(); }
    } else if (mode === 'result') {
      if (e.code === 'Enter') { e.preventDefault(); startGame(); }
    }
  });
  window.addEventListener('keyup', function (e) {
    const k = KEYMAP[e.code];
    if (k) setKey(k, false);
  });
  window.addEventListener('blur', function () { clearKeys(); if (mode === 'play') pauseGame(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearKeys(); if (mode === 'play') pauseGame(); }
  });
  canvas.addEventListener('pointerdown', function (e) {
    if (mode === 'play' && e.pointerType === 'mouse' && e.button === 0) pressed.shoot = true;
  });

  document.querySelectorAll('#touch-pad button').forEach(function (btn) {
    const k = btn.dataset.key;
    const up = function () { setKey(k, false); btn.classList.remove('on'); };
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      ensureAudio();
      btn.setPointerCapture(e.pointerId);
      setKey(k, true);
      btn.classList.add('on');
    });
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  });

  // ---------- 무대 만들기 ----------
  function rngFor(n) {
    let a = (n * 2654435761) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function genLevel(n) {
    const g = new Uint8Array(COLS * ROWS);
    const rnd = rngFor(n);
    const isBoss = BOSS_ROUNDS.indexOf(n) >= 0;
    for (let r = 0; r < ROWS; r++) {
      g[r * COLS] = g[r * COLS + 1] = g[r * COLS + 30] = g[r * COLS + 31] = 1;
    }
    for (let c = 2; c <= 29; c++) {
      if (c < GAP0 || c > GAP1) { g[c] = 1; g[25 * COLS + c] = 1; }
    }
    const mirror = function (r, c) {
      if (c < 2 || c > 15) return;
      g[r * COLS + c] = 2;
      g[r * COLS + (31 - c)] = 2;
    };
    const rows = [21, 17, 13, 9, 5];
    if (isBoss) {
      [[21, 3, 8], [17, 11, 15], [13, 3, 8], [9, 11, 15]].forEach(function (p) {
        for (let c = p[1]; c <= p[2]; c++) mirror(p[0], c);
      });
    } else {
      const style = n <= 2 ? 0 : Math.floor(rnd() * 5);
      rows.forEach(function (r, k) {
        if (style === 0) {
          let c = 2 + Math.floor(rnd() * 3);
          while (c <= 15) {
            const len = 3 + Math.floor(rnd() * 6);
            for (let i = 0; i < len; i++) mirror(r, c + i);
            c += len + 2 + Math.floor(rnd() * 3);
          }
        } else if (style === 1) {
          const off = (k % 2) * 3;
          for (let c = 2 + off; c <= 15; c += 7) for (let i = 0; i < 4; i++) mirror(r, c + i);
        } else if (style === 2) {
          const start = 2 + ((k * 3 + Math.floor(rnd() * 2)) % 10);
          for (let i = 0; i < 5; i++) mirror(r, start + i);
          if (rnd() < 0.6) for (let i = 0; i < 3; i++) mirror(r, 2 + i);
        } else if (style === 3) {
          if (k % 2 === 0) for (let c = 5; c <= 15; c++) mirror(r, c);
          else for (let c = 2; c <= 4; c++) mirror(r, c);
        } else {
          let on = rnd() < 0.5;
          for (let c = 2; c <= 15; c++) {
            if (rnd() < 0.3) on = !on;
            if (on) mirror(r, c);
          }
        }
      });
    }
    return { grid: g, pal: PALS[(n - 1) % PALS.length], boss: isBoss };
  }

  function buildTiles(lv) {
    const c = document.createElement('canvas');
    c.width = FW;
    c.height = FH;
    const x = c.getContext('2d');
    const base = lv.pal[0], lite = lv.pal[1], dark = lv.pal[2];
    for (let r = 0; r < ROWS; r += 2) {
      [0, 30].forEach(function (col) {
        const px = col * T, py = r * T;
        x.fillStyle = base; x.fillRect(px, py, 16, 16);
        x.fillStyle = lite; x.fillRect(px, py, 16, 2); x.fillRect(px, py, 2, 16);
        x.fillStyle = dark; x.fillRect(px, py + 14, 16, 2); x.fillRect(px + 14, py, 2, 16);
        x.fillStyle = dark; x.fillRect(px + 5, py + 5, 6, 6);
        x.fillStyle = lite; x.fillRect(px + 5, py + 5, 2, 2);
      });
    }
    for (let r = 0; r < ROWS; r++) {
      for (let col = 2; col <= 29; col++) {
        if (!lv.grid[r * COLS + col]) continue;
        const px = col * T, py = r * T;
        x.fillStyle = base; x.fillRect(px, py, 8, 8);
        x.fillStyle = lite; x.fillRect(px, py, 8, 1); x.fillRect(px, py, 1, 7);
        x.fillStyle = dark; x.fillRect(px, py + 7, 8, 1); x.fillRect(px + 7, py + 1, 1, 7);
        x.fillStyle = lite; x.fillRect(px + 2, py + 2, 2, 2);
      }
    }
    return c;
  }

  function tileAt(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    return level.grid[r * COLS + c];
  }
  function solidSpan(r, x0, x1) {
    const c0 = Math.floor((x0 + 1) / T), c1 = Math.floor((x1 - 2) / T);
    for (let c = c0; c <= c1; c++) if (tileAt(r, c)) return true;
    return false;
  }
  function findLand(x0, x1, prevB, newB) {
    if (newB < prevB) return null;
    for (let r = Math.max(1, Math.floor(prevB / T)); r <= Math.floor(newB / T) && r < ROWS; r++) {
      const top = r * T;
      if (top >= prevB - 0.001 && top <= newB && solidSpan(r, x0, x1)) return top;
    }
    return null;
  }

  // ---------- 상태 ----------
  let mode = 'title';
  let phase = 'intro', phaseT = 0;
  let round = 1, pickIdx = 0, score = 0, lives = 3;
  let hi = Number(localStorage.getItem('bogle-hi')) || 0;
  let level = genLevel(1), tileCanvas = buildTiles(level), prevTile = null;
  let player = null, bubbles = [], letterBubs = [], enemies = [], deadOnes = [], items = [];
  let popups = [], sparks = [], shots = [], boss = null, skull = null, banner = null;
  let letters = [false, false, false, false, false, false];
  let stageT = 0, hurry = false, letterT = 6, chainKills = 0, chainIdle = 0;
  let scrollFrom = null, titleT = 0, demoBubbles = [];

  function addScore(n, x, y) {
    score += n;
    if (score > hi) { hi = score; localStorage.setItem('bogle-hi', String(hi)); }
    if (x !== undefined) popups.push({ x: x, y: y, text: String(n), t: 0 });
  }
  function burst(x, y, col, n) {
    sparks.push({ x: x, y: y, t: 0, c: col || '#7cff8a', n: n || 8 });
  }
  function showBanner(text, color, dur) {
    banner = { text: text, color: color, t: 0, dur: dur || 1.8 };
  }

  function resetPlayer() {
    player = { x: 24, y: FH - 8 - 14, w: 12, h: 14, vx: 0, vy: 0, dir: 1, ground: false, inv: 2.2,
      shootCD: 0, shootAnim: 0, anim: 0, ride: null, dead: false, deadT: 0 };
  }

  function makeEnemy(type, x, y, n) {
    return { type: type, x: x, y: y, w: 14, h: 14, vx: 0, vy: 0, dir: rand() < 0.5 ? -1 : 1, vdir: rand() < 0.5 ? -1 : 1,
      ground: false, free: 0, mode: 'normal', ghostT: 0, think: 0.5 + rand(), anim: rand(), trapped: false,
      speed: 32 + Math.min(n, 100) * 0.22, startY: y };
  }

  function spawnEnemies(n) {
    if (level.boss) {
      const hp = n === 100 ? 40 : 24;
      boss = { x: 108, y: 36, w: 40, h: 40, vx: 42, vy: 32, hp: hp, max: hp, hurt: 0, shootT: 2.2, trapped: false, t: 0 };
      return;
    }
    const count = Math.min(3 + Math.floor((n - 1) / 7), 9);
    const spots = [];
    [5, 9, 13, 17, 21].forEach(function (r) {
      for (let c = 3; c <= 27; c += 2) {
        if (tileAt(r, c) && tileAt(r, c + 1) && !tileAt(r - 1, c) && !tileAt(r - 2, c)) spots.push({ x: c * T, y: r * T - 14 });
      }
    });
    if (!spots.length) for (let c = 4; c <= 26; c += 3) spots.push({ x: c * T, y: 200 - 14 });
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = spots[i]; spots[i] = spots[j]; spots[j] = tmp;
    }
    const pool = n < 5 ? ['can'] : n < 12 ? ['can', 'can', 'shroom'] : ['can', 'shroom', 'wing'];
    for (let i = 0; i < count; i++) {
      const s = spots[i % spots.length];
      const type = pool[Math.floor(rand() * pool.length)];
      enemies.push(makeEnemy(type, s.x + (i >= spots.length ? 4 : 0), s.y, n));
    }
  }

  function beginRound(n, scroll) {
    round = n;
    prevTile = tileCanvas;
    level = genLevel(n);
    tileCanvas = buildTiles(level);
    bubbles = []; letterBubs = []; enemies = []; deadOnes = []; items = []; shots = []; sparks = [];
    skull = null; boss = null; banner = null;
    stageT = 0; hurry = false; letterT = 6;
    scrollFrom = player && scroll ? { x: player.x, y: player.y } : null;
    resetPlayer();
    spawnEnemies(n);
    phase = scroll ? 'scroll' : 'intro';
    phaseT = 0;
  }

  // ---------- 방울 ----------
  function newBubble(x, y, dir) {
    return { x: x, y: y, r: 8, vx: dir * 210, state: 'shot', dist: 0, age: 0, life: 9 + rand() * 3,
      trapped: null, seed: rand() * 6, chainPop: -1, dead: false, squish: 0 };
  }

  function popBubble(b, byPlayer) {
    if (b.dead) return;
    b.dead = true;
    if (player.ride === b) { player.ride = null; player.ground = false; }
    burst(b.x, b.y, b.trapped ? '#ff9ac8' : '#7cff8a');
    SFX.pop();
    if (b.trapped) killEnemy(b.trapped);
    if (byPlayer) {
      bubbles.forEach(function (o) {
        if (o.dead || o.chainPop >= 0) return;
        if (Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r + 3) o.chainPop = 0.07;
      });
    }
  }

  function trapEnemy(b, e) {
    b.trapped = e;
    b.state = 'float';
    b.vx = 0;
    b.age = 0;
    b.escapeAt = Math.max(4.5, (e.mode === 'angry' ? 6 : 8.5) - round * 0.02);
    e.trapped = true;
    e.vy = 0;
    tone(1000, 0.08, 'square', 0.04, 1500);
  }

  function killEnemy(e) {
    const i = enemies.indexOf(e);
    if (i >= 0) enemies.splice(i, 1);
    const pts = 1000 * Math.pow(2, Math.min(chainKills, 3));
    chainKills++;
    chainIdle = 0;
    addScore(pts, e.x + 7, e.y);
    deadOnes.push({ x: e.x, y: e.y, vx: (rand() - 0.5) * 170, vy: -230, t: 0, type: e.type });
    SFX.kill();
  }

  // ---------- 업데이트 ----------
  function update(dt) {
    phaseT += dt;
    if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }

    if (phase === 'scroll') {
      if (phaseT > 1.3) { phase = 'intro'; phaseT = 0; }
      return;
    }
    if (phase === 'intro' && phaseT > 1.4) { phase = 'play'; phaseT = 0; }

    updatePlayer(dt);
    if (phase !== 'intro') {
      enemies.forEach(function (e) { updateEnemy(e, dt); });
      updateBoss(dt);
      updateSkull(dt);
    }
    updateBubbles(dt);
    updateLetters(dt);
    updateDead(dt);
    updateItems(dt);
    popups.forEach(function (p) { p.t += dt; });
    popups = popups.filter(function (p) { return p.t < 0.9; });
    sparks.forEach(function (s) { s.t += dt; });
    sparks = sparks.filter(function (s) { return s.t < 0.35; });
    chainIdle += dt;
    if (chainIdle > 0.4) chainKills = 0;

    if (phase === 'play') {
      if (!level.boss) {
        stageT += dt;
        const hurryAt = Math.max(30, 45 - Math.floor(round / 10));
        if (!hurry && stageT > hurryAt) {
          hurry = true;
          showBanner('HURRY UP!', '#ff3b3b', 2);
          SFX.hurry();
          enemies.forEach(function (e) { if (e.mode === 'normal') e.mode = 'angry'; });
        }
        if (hurry && !skull && stageT > hurryAt + 10) {
          skull = { x: 120, y: -16, w: 16, h: 14, speed: 48 };
          showBanner('!!', '#ff3b3b', 1);
        }
      }
      if (!boss && enemies.length === 0 && deadOnes.length === 0) {
        phase = 'clear';
        phaseT = 0;
        skull = null;
        shots = [];
        SFX.clear();
      }
    } else if (phase === 'clear' && phaseT > 3) {
      if (round >= LAST_ROUND) endGame(true);
      else beginRound(round + 1, true);
    }
  }

  function updatePlayer(dt) {
    const p = player;
    if (p.dead) {
      p.deadT += dt;
      if (p.deadT > 1.4) afterDeath();
      return;
    }
    p.inv = Math.max(0, p.inv - dt);
    p.shootCD -= dt;
    p.shootAnim -= dt;
    const mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    p.vx = mv * SPEED;
    if (mv) p.dir = mv;
    p.anim += mv ? dt : 0;
    p.x = Math.max(16, Math.min(240 - p.w, p.x + p.vx * dt));

    if (p.ride) {
      const b = p.ride;
      if (b.dead || Math.abs(p.x + p.w / 2 - b.x) > b.r + 4) {
        p.ride = null;
        p.ground = false;
      } else {
        p.y = b.y - b.r - p.h + 1;
        p.vy = 0;
        p.ground = true;
        if (pressed.down) popBubble(b, true);
      }
    }

    if (pressed.jump && p.ground) {
      p.vy = JUMPV;
      p.ground = false;
      p.ride = null;
      SFX.jump();
    }
    if (pressed.down && p.ground && !p.ride) {
      const r = Math.round((p.y + p.h) / T);
      if (r < 25) { p.y += 2; p.ground = false; }
    }

    if (!p.ride) {
      p.vy = Math.min(p.vy + GRAV * dt, MAXFALL);
      const prevB = p.y + p.h;
      p.y += p.vy * dt;
      if (p.vy < 0 && p.y < 8) { p.y = 8; p.vy = 0; }
      p.ground = false;
      if (p.vy >= 0) {
        const land = findLand(p.x, p.x + p.w, prevB, p.y + p.h);
        if (land !== null) { p.y = land - p.h; p.vy = 0; p.ground = true; }
      }
      if (p.y > FH) p.y -= FH + 16;
    }

    if (pressed.shoot && p.shootCD <= 0 && phase !== 'scroll') {
      p.shootCD = 0.28;
      p.shootAnim = 0.15;
      const bx = Math.max(24, Math.min(232, p.x + p.w / 2 + p.dir * 8));
      bubbles.push(newBubble(bx, p.y + 7, p.dir));
      SFX.shoot();
    }

    // 방울 닿기
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, pb = p.y + p.h;
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (b.dead || b === p.ride) continue;
      if (b.state === 'shot' && b.age < 0.2) continue;
      const dx = pcx - b.x, dy = pcy - b.y;
      if (Math.abs(dx) > b.r + p.w / 2 - 2 || Math.abs(dy) > b.r + p.h / 2 - 2) continue;
      const fromTop = p.vy >= 0 && pb <= b.y - b.r + 6 && Math.abs(dx) < b.r;
      if (fromTop && !b.trapped) {
        if (keys.jump) {
          p.vy = JUMPV * 1.04;
          p.ground = false;
          b.squish = 0.15;
          SFX.jump();
        } else {
          p.ride = b;
          p.y = b.y - b.r - p.h + 1;
          p.vy = 0;
          p.ground = true;
        }
      } else {
        popBubble(b, true);
      }
    }

    // 위험 닿기
    if (p.inv <= 0 && phase !== 'intro') {
      const hit = function (o, inset) {
        return p.x + 2 < o.x + o.w - inset && p.x + p.w - 2 > o.x + inset && p.y + 2 < o.y + o.h - inset && p.y + p.h - 2 > o.y + inset;
      };
      let dead = enemies.some(function (e) { return !e.trapped && hit(e, 2); });
      if (skull && hit(skull, 2)) dead = true;
      if (boss && !boss.trapped && hit(boss, 6)) dead = true;
      if (shots.some(function (s) { return hit({ x: s.x - 2, y: s.y - 2, w: 4, h: 4 }, 0); })) dead = true;
      if (dead) killPlayer();
    }
  }

  function killPlayer() {
    const p = player;
    p.dead = true;
    p.deadT = 0;
    p.ride = null;
    SFX.die();
  }

  function afterDeath() {
    lives--;
    if (lives <= 0) { endGame(false); return; }
    resetPlayer();
    stageT = 0;
    hurry = false;
    skull = null;
    shots = [];
    enemies.forEach(function (e) {
      if (e.trapped) return;
      e.mode = 'normal';
      e.free = 0;
      e.x = Math.max(16, Math.min(240 - e.w, e.x));
      e.y = Math.max(8, Math.min(FH - 40, e.y));
    });
  }

  function updateEnemy(e, dt) {
    if (e.trapped) return;
    e.anim += dt;
    if (e.mode === 'ghost') {
      e.ghostT += dt;
      const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.x += dx / d * 74 * dt;
      e.y += dy / d * 74 * dt;
      e.dir = dx < 0 ? -1 : 1;
      if (e.ghostT > GHOST_TIME) {
        e.mode = 'angry';
        e.free = ANGRY_AT;
        e.x = Math.max(16, Math.min(240 - e.w, e.x));
        e.y = Math.max(8, Math.min(FH - 30, e.y));
        e.vy = 0;
      }
      return;
    }
    e.free += dt;
    if (e.mode === 'normal' && (e.free > ANGRY_AT || hurry)) e.mode = 'angry';
    if (e.free > GHOST_AT) {
      e.mode = 'ghost';
      e.ghostT = 0;
      burst(e.x + 7, e.y + 7, '#ffffff', 6);
      return;
    }
    const spd = e.speed * (e.mode === 'angry' ? 1.55 : 1);

    if (e.type === 'wing') {
      e.x += e.dir * spd * dt;
      e.y += e.vdir * spd * 0.7 * dt;
      if (e.x < 16) { e.x = 16; e.dir = 1; }
      if (e.x > 240 - e.w) { e.x = 240 - e.w; e.dir = -1; }
      if (e.y < 8) { e.y = 8; e.vdir = 1; }
      if (e.y > FH - 8 - e.h) { e.y = FH - 8 - e.h; e.vdir = -1; }
      return;
    }

    e.think -= dt;
    if (e.ground && e.think <= 0) {
      e.think = (e.type === 'shroom' ? 0.7 : 0.8) + rand() * 1.1;
      if (e.type === 'shroom' || (player.y < e.y - 12 && rand() < 0.6)) {
        e.vy = e.type === 'shroom' ? -205 : JUMPV;
        e.ground = false;
      } else if (rand() < 0.5) {
        e.dir = player.x < e.x ? -1 : 1;
      } else if (rand() < 0.3) {
        e.dir = -e.dir;
      }
    }
    e.x += e.dir * spd * dt;
    if (e.x < 16) { e.x = 16; e.dir = 1; }
    if (e.x > 240 - e.w) { e.x = 240 - e.w; e.dir = -1; }
    if (e.ground) {
      const row = Math.round((e.y + e.h) / T);
      const footX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
      if (row < 25 && !tileAt(row, Math.floor(footX / T)) && !(player.y > e.y + 10 && rand() < 0.7)) e.dir = -e.dir;
    }
    e.vy = Math.min(e.vy + GRAV * dt, MAXFALL);
    const prevB = e.y + e.h;
    e.y += e.vy * dt;
    if (e.vy < 0 && e.y < 8) { e.y = 8; e.vy = 0; }
    e.ground = false;
    if (e.vy >= 0) {
      const land = findLand(e.x, e.x + e.w, prevB, e.y + e.h);
      if (land !== null) { e.y = land - e.h; e.vy = 0; e.ground = true; }
    }
    if (e.y > FH) e.y -= FH + 16;
  }

  function updateBoss(dt) {
    if (!boss) return;
    const b = boss;
    b.t += dt;
    b.hurt = Math.max(0, b.hurt - dt);
    if (b.trapped) {
      b.y += (50 - b.y) * Math.min(1, dt * 1.5);
      b.x += Math.sin(b.t * 2) * 10 * dt;
      const cx = b.x + 20, cy = b.y + 20, p = player;
      if (!p.dead && Math.abs(p.x + 6 - cx) < 30 && Math.abs(p.y + 7 - cy) < 30) {
        const pts = round === 100 ? 100000 : 50000;
        addScore(pts, cx, cy);
        for (let i = 0; i < 6; i++) burst(cx + (rand() - 0.5) * 40, cy + (rand() - 0.5) * 40, LETTER_COLORS[i], 10);
        for (let i = 0; i < 8; i++) deadOnes.push({ x: cx - 7, y: cy - 7, vx: (rand() - 0.5) * 220, vy: -150 - rand() * 120, t: 0, type: 'can', fruit: 2 });
        SFX.extend();
        showBanner(round === 100 ? 'YOU WIN!' : 'BOSS DOWN!', '#ffd23f', 2.5);
        boss = null;
      }
      return;
    }
    const mul = 1 + (1 - b.hp / b.max) * 0.8;
    b.x += b.vx * mul * dt;
    b.y += b.vy * mul * dt;
    if (b.x < 16) { b.x = 16; b.vx = Math.abs(b.vx); }
    if (b.x > 240 - b.w) { b.x = 240 - b.w; b.vx = -Math.abs(b.vx); }
    if (b.y < 8) { b.y = 8; b.vy = Math.abs(b.vy); }
    if (b.y > FH - 8 - b.h) { b.y = FH - 8 - b.h; b.vy = -Math.abs(b.vy); }
    b.shootT -= dt;
    if (b.shootT <= 0) {
      b.shootT = 1.9 - (1 - b.hp / b.max) * 0.7;
      const n = round === 100 ? 5 : 3;
      const cx = b.x + 20, cy = b.y + 24;
      const base = Math.atan2(player.y + 7 - cy, player.x + 6 - cx);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.28;
        shots.push({ x: cx, y: cy, vx: Math.cos(a) * 72, vy: Math.sin(a) * 72 });
      }
      tone(160, 0.12, 'sawtooth', 0.04, 90);
    }
    shots.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; });
    shots = shots.filter(function (s) { return s.x > 12 && s.x < 244 && s.y > 0 && s.y < FH; });
  }

  function updateSkull(dt) {
    if (!skull) return;
    const s = skull;
    s.speed = Math.min(92, s.speed + dt * 4);
    const dx = player.x - s.x, dy = player.y - s.y, d = Math.hypot(dx, dy) || 1;
    s.x += dx / d * s.speed * dt;
    s.y += dy / d * s.speed * dt;
    s.dir = dx < 0 ? -1 : 1;
  }

  function updateBubbles(dt) {
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (b.dead) continue;
      b.age += dt;
      b.squish = Math.max(0, b.squish - dt);
      if (b.chainPop >= 0) {
        b.chainPop -= dt;
        if (b.chainPop < 0) { popBubble(b, true); continue; }
      }
      if (b.state === 'shot') {
        const step = b.vx * dt;
        b.x += step;
        b.dist += Math.abs(step);
        if (b.x < 16 + b.r) { b.x = 16 + b.r; b.state = 'float'; }
        if (b.x > 240 - b.r) { b.x = 240 - b.r; b.state = 'float'; }
        if (b.dist >= 64) b.state = 'float';
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (e.trapped || e.mode === 'ghost') continue;
          if (Math.abs(e.x + 7 - b.x) < b.r + 5 && Math.abs(e.y + 7 - b.y) < b.r + 5) { trapEnemy(b, e); break; }
        }
        if (boss && !boss.trapped && b.state === 'shot' &&
          b.x > boss.x - 4 && b.x < boss.x + boss.w + 4 && b.y > boss.y - 4 && b.y < boss.y + boss.h + 4) {
          b.dead = true;
          boss.hp--;
          boss.hurt = 0.12;
          burst(b.x, b.y, '#ffd23f', 6);
          addScore(100);
          SFX.bossHit();
          if (boss.hp <= 0) {
            boss.trapped = true;
            shots = [];
            showBanner('PUSH!', '#7cff8a', 1.5);
          }
        }
      } else {
        const ridden = player.ride === b;
        const top = ridden ? 8 + 14 + b.r + 1 : 8 + b.r + 1;
        if (b.y > top + 0.5) {
          b.y = Math.max(top, b.y - 22 * dt);
          if (!ridden) b.x += Math.sin(b.age * 3 + b.seed) * 7 * dt;
        } else if (!ridden) {
          const dx = 128 - b.x;
          b.x += Math.sign(dx) * Math.min(Math.abs(dx), 14 * dt);
        }
      }
      b.x = Math.max(16 + b.r, Math.min(240 - b.r, b.x));
      if (b.trapped) {
        b.trapped.x = b.x - 7;
        b.trapped.y = b.y - 7;
        if (b.age > b.escapeAt) {
          const e = b.trapped;
          b.dead = true;
          if (player.ride === b) player.ride = null;
          e.trapped = false;
          e.mode = 'angry';
          e.free = ANGRY_AT;
          e.vy = -80;
          e.ground = false;
          burst(b.x, b.y, '#ff3b3b');
        }
      } else if (b.age > b.life) {
        b.dead = true;
        if (player.ride === b) { player.ride = null; player.ground = false; }
        burst(b.x, b.y, '#7cff8a', 4);
      }
    }
    // 떠 있는 방울끼리 밀어내기
    for (let i = 0; i < bubbles.length; i++) {
      const a = bubbles[i];
      if (a.dead || a.state !== 'float') continue;
      for (let j = i + 1; j < bubbles.length; j++) {
        const o = bubbles[j];
        if (o.dead || o.state !== 'float') continue;
        const dx = o.x - a.x, dy = o.y - a.y, d = Math.hypot(dx, dy);
        const min = a.r + o.r - 1;
        if (d < min && d > 0.01) {
          const push = (min - d) / 2 * Math.min(1, dt * 12);
          const ux = dx / d, uy = dy / d;
          if (player.ride !== a) { a.x -= ux * push; a.y -= uy * push * 0.5; }
          if (player.ride !== o) { o.x += ux * push; o.y += uy * push * 0.5; }
        } else if (d <= 0.01) {
          o.x += 1;
        }
      }
    }
    bubbles = bubbles.filter(function (b) { return !b.dead; });
    if (bubbles.length > 28) {
      const old = bubbles.find(function (b) { return !b.trapped && b !== player.ride; });
      if (old) old.dead = true;
    }
  }

  function updateLetters(dt) {
    if (phase === 'play' && !level.boss) {
      letterT -= dt;
      if (letterT <= 0) {
        letterT = 11 + rand() * 6;
        const missing = [];
        letters.forEach(function (got, i) { if (!got) missing.push(i); });
        if (!letterBubs.length && missing.length && rand() < 0.8) {
          const idx = missing[Math.floor(rand() * missing.length)];
          letterBubs.push({ x: 40 + rand() * 176, y: FH - 24, vx: (rand() < 0.5 ? -1 : 1) * 30, vy: -24, idx: idx, t: 0 });
        }
      }
    }
    letterBubs.forEach(function (L) {
      L.t += dt;
      L.x += L.vx * dt;
      L.y += L.vy * dt;
      if (L.x < 26) { L.x = 26; L.vx = Math.abs(L.vx); }
      if (L.x > 230) { L.x = 230; L.vx = -Math.abs(L.vx); }
      if (L.y < 18) { L.y = 18; L.vy = Math.abs(L.vy); }
      if (L.y > FH - 18) { L.y = FH - 18; L.vy = -Math.abs(L.vy); }
      const p = player;
      if (!p.dead && Math.abs(p.x + 6 - L.x) < 14 && Math.abs(p.y + 7 - L.y) < 15) {
        L.got = true;
        letters[L.idx] = true;
        addScore(100, L.x, L.y);
        burst(L.x, L.y, LETTER_COLORS[L.idx], 10);
        SFX.letter();
        if (letters.every(Boolean)) {
          lives++;
          letters = [false, false, false, false, false, false];
          showBanner('EXTEND!', '#ffd23f', 2.2);
          SFX.extend();
        }
      }
    });
    letterBubs = letterBubs.filter(function (L) { return !L.got && L.t < 16; });
  }

  function updateDead(dt) {
    deadOnes.forEach(function (d) {
      d.t += dt;
      d.vy = Math.min(d.vy + GRAV * dt, 160);
      d.x += d.vx * dt;
      if (d.x < 16) { d.x = 16; d.vx = Math.abs(d.vx); }
      if (d.x > 226) { d.x = 226; d.vx = -Math.abs(d.vx); }
      const prevB = d.y + 14;
      d.y += d.vy * dt;
      if (d.y > FH) d.y -= FH + 16;
      if (d.t > 0.45 && d.vy > 0) {
        const land = findLand(d.x, d.x + 14, prevB, d.y + 14);
        if (land !== null || d.t > 4) {
          const kind = d.fruit !== undefined ? d.fruit : Math.floor(rand() * FRUITS.length);
          items.push({ x: d.x + 2, y: (land !== null ? land : d.y + 14) - 10, kind: kind, t: 0 });
          d.done = true;
        }
      }
    });
    deadOnes = deadOnes.filter(function (d) { return !d.done; });
  }

  function updateItems(dt) {
    const p = player;
    items.forEach(function (it) {
      it.t += dt;
      if (!p.dead && p.x < it.x + 10 && p.x + p.w > it.x && p.y < it.y + 10 && p.y + p.h > it.y) {
        it.got = true;
        addScore(FRUITS[it.kind].pts, it.x + 5, it.y);
        SFX.item();
      }
    });
    items = items.filter(function (it) { return !it.got && it.t < 10; });
  }

  // ---------- 그리기 ----------
  const bubbleCache = new Map();
  function bubbleImg(r, col) {
    const key = r + col;
    let c = bubbleCache.get(key);
    if (c) return c;
    const s = r * 2 + 1;
    c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    for (let j = 0; j < s; j++) {
      for (let i = 0; i < s; i++) {
        const d = Math.hypot(i - r, j - r);
        if (d > r + 0.5) continue;
        x.globalAlpha = d > r - 0.9 ? 1 : 0.16;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    x.globalAlpha = 1;
    x.fillStyle = '#ffffff';
    const h = Math.round(r * 0.45);
    x.fillRect(h, h + 1, 1, 2);
    x.fillRect(h + 1, h, 2, 1);
    bubbleCache.set(key, c);
    return c;
  }

  function spr(img, x, y) { ctx.drawImage(img, Math.round(x), Math.round(y)); }
  function text(str, x, y, color, align, size) {
    ctx.font = 'bold ' + (size || 8) + 'px "Courier New", monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }
  const blink = (rate) => Math.floor(performance.now() / (rate || 100)) % 2 === 0;

  function enemyImg(e, struggle) {
    if (e.mode === 'ghost') return Sprites.get('ghost', { flip: e.dir < 0 });
    const f = Math.floor(e.anim * (struggle ? 12 : 5)) % 2 === 0 ? '1' : '2';
    const name = (e.type === 'can' ? 'can' : e.type === 'wing' ? 'wing' : 'shroom') + f;
    return Sprites.get(name, { flip: e.dir < 0, angry: e.mode === 'angry' });
  }

  function drawDino(x, y, dir, frameName) {
    spr(Sprites.get(frameName, { flip: dir < 0 }), x - 2, y - 2);
  }

  function drawHUD() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, FY);
    text('1UP', 6, 0, '#3fe04a');
    text(String(score).padStart(7, ' '), 2, 8, '#ffffff');
    text('HI-SCORE', 70, 0, '#ff3b3b');
    text(String(hi).padStart(7, ' '), 72, 8, '#ffffff');
    text('ROUND', 134, 0, '#45c8ff');
    text(String(round), 146, 8, '#ffffff', 'center');
    const heart = Sprites.get('heart');
    for (let i = 0; i < Math.min(lives, 8); i++) spr(heart, 172 + i * 9, 1);
    'EXTEND'.split('').forEach(function (ch, i) {
      text(ch, 175 + i * 13, 8, letters[i] ? LETTER_COLORS[i] : '#333344');
    });
  }

  function drawField() {
    ctx.drawImage(tileCanvas, 0, 0);
    const k = phase === 'intro' ? Math.min(1, phaseT / 1.2) : 1;

    items.forEach(function (it) {
      if (it.t > 8 && blink(80)) return;
      spr(Sprites.get(FRUITS[it.kind].name), it.x, it.y);
    });

    enemies.forEach(function (e) {
      if (e.trapped) return;
      if (e.mode === 'ghost') ctx.globalAlpha = blink(120) ? 0.85 : 0.55;
      const dy = (1 - k) * -110;
      spr(enemyImg(e), e.x - 1, e.y - 2 + dy);
      ctx.globalAlpha = 1;
    });

    if (boss) {
      const img = Sprites.boss(boss.hurt > 0);
      spr(img, boss.x, boss.y);
      if (boss.trapped) {
        const bimg = bubbleImg(28, blink(150) ? '#7cff8a' : '#ff9ac8');
        spr(bimg, boss.x + 20 - 28, boss.y + 20 - 28);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(68, 2, 120, 5);
        ctx.fillStyle = '#ff3b3b';
        ctx.fillRect(69, 3, Math.round(118 * boss.hp / boss.max), 3);
      }
    }

    bubbles.forEach(function (b) {
      let col = '#7cff8a';
      const sx = b.squish > 0 ? 1 : 0;
      if (b.trapped) {
        const e = b.trapped;
        const left = b.escapeAt - b.age;
        e.anim += 0.016;
        spr(enemyImg(e, true), b.x - 8 + (left < 2 ? (blink(60) ? 1 : -1) : 0), b.y - 8 + sx);
        col = left < 1.2 ? (blink(70) ? '#ff3b3b' : '#ff9ac8') : left < 3 ? '#ff9ac8' : '#7cff8a';
      } else if (b.life - b.age < 1.5 && blink(90)) {
        col = '#d8ffe0';
      }
      spr(bubbleImg(b.r, col), b.x - b.r, b.y - b.r + sx);
    });

    letterBubs.forEach(function (L) {
      if (L.t > 13 && blink(80)) return;
      spr(bubbleImg(9, LETTER_COLORS[L.idx]), L.x - 9, L.y - 9);
      text('EXTEND'[L.idx], L.x + 0.5, L.y - 4, LETTER_COLORS[L.idx], 'center');
    });

    deadOnes.forEach(function (d) {
      ctx.save();
      ctx.translate(Math.round(d.x + 7), Math.round(d.y + 7));
      ctx.rotate(d.t * 14);
      if (d.fruit !== undefined) ctx.drawImage(Sprites.get(FRUITS[d.fruit].name), -5, -5);
      else ctx.drawImage(Sprites.get(d.type === 'wing' ? 'wing1' : d.type === 'shroom' ? 'shroom1' : 'can1'), -8, -8);
      ctx.restore();
    });

    const p = player;
    if (p.dead) {
      ctx.save();
      ctx.translate(Math.round(p.x + 6), Math.round(p.y + 7 - Math.min(p.deadT, 0.4) * 20));
      ctx.rotate(p.deadT * 12);
      ctx.drawImage(Sprites.get('dino1'), -8, -8);
      ctx.restore();
    } else if (!(p.inv > 0 && blink(70))) {
      let f = 'dino1';
      if (p.shootAnim > 0) f = 'dinoShoot';
      else if (!p.ground) f = 'dino2';
      else if (p.vx !== 0) f = Math.floor(p.anim * 9) % 2 ? 'dino2' : 'dino1';
      drawDino(p.x, p.y, p.dir, f);
    }

    if (skull) spr(Sprites.get('skull', { flip: skull.dir < 0 }), skull.x - 2, skull.y - 1);

    shots.forEach(function (s) {
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(Math.round(s.x) - 3, Math.round(s.y) - 2, 6, 4);
      ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 3, 4, 6);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2);
    });

    sparks.forEach(function (s) {
      const d = 3 + s.t * 40;
      ctx.fillStyle = s.c;
      for (let i = 0; i < s.n; i++) {
        const a = i / s.n * Math.PI * 2;
        ctx.fillRect(Math.round(s.x + Math.cos(a) * d), Math.round(s.y + Math.sin(a) * d), 2, 2);
      }
    });

    popups.forEach(function (pp) {
      text(pp.text, pp.x, pp.y - pp.t * 22, '#ffffff', 'center');
    });

    if (phase === 'intro') {
      text('ROUND ' + round, 128, 84, '#ffffff', 'center', 16);
      if (level.boss) text('BOSS!', 128, 104, '#ff3b3b', 'center', 16);
      else text('READY!', 128, 104, '#ffd23f', 'center', 12);
    }
    if (phase === 'clear') {
      text(level.boss ? 'BOSS CLEAR!' : 'ROUND CLEAR!', 128, 92, blink(160) ? '#ffd23f' : '#3fe04a', 'center', 14);
    }
    if (banner && blink(130)) text(banner.text, 128, 64, banner.color, 'center', 16);
  }

  function drawScroll() {
    const k = Math.min(1, phaseT / 1.3);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    if (prevTile) ctx.drawImage(prevTile, 0, Math.round(-e * FH));
    ctx.drawImage(tileCanvas, 0, Math.round(FH - e * FH));
    const from = scrollFrom || { x: 24, y: 186 };
    const x = from.x + (24 - from.x) * e, y = from.y + (186 - from.y) * e;
    drawDino(x, y, 1, 'dino1');
    spr(bubbleImg(11, '#7cff8a'), x + 6 - 11, y + 7 - 11);
    text('ROUND ' + round, 128, 92, '#ffffff', 'center', 16);
  }

  function drawTitle() {
    ctx.drawImage(tileCanvas, 0, 0);
    const t = titleT;
    const px = 24 + (Math.sin(t * 0.7) * 0.5 + 0.5) * 200;
    const dir = Math.cos(t * 0.7) >= 0 ? 1 : -1;
    demoBubbles.forEach(function (b) {
      spr(bubbleImg(8, b.c), b.x - 8, b.y - 8);
    });
    const demoEnemies = [[60, 148, 'can'], [180, 116, 'shroom'], [120, 52, 'wing']];
    demoEnemies.forEach(function (d, i) {
      const e = { type: d[2], dir: Math.sin(t + i) > 0 ? 1 : -1, anim: t, mode: i === 1 && Math.sin(t * 0.5) > 0.6 ? 'angry' : 'normal' };
      spr(enemyImg(e), d[0] + Math.sin(t + i) * 12, d[1] + (d[2] === 'wing' ? Math.sin(t * 2) * 6 : 0));
    });
    drawDino(px, 186, dir, Math.floor(t * 8) % 2 ? 'dino2' : 'dino1');
  }

  function updateTitle(dt) {
    titleT += dt;
    if (rand() < dt * 1.6) {
      demoBubbles.push({ x: 30 + rand() * 196, y: FH - 12, c: rand() < 0.15 ? LETTER_COLORS[Math.floor(rand() * 6)] : '#7cff8a', s: rand() * 6 });
    }
    demoBubbles.forEach(function (b) { b.y -= 20 * dt; b.x += Math.sin(titleT * 2 + b.s) * 8 * dt; });
    demoBubbles = demoBubbles.filter(function (b) { return b.y > 14; });
  }

  function draw() {
    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    drawHUD();
    ctx.save();
    ctx.translate(0, FY);
    ctx.beginPath();
    ctx.rect(0, 0, FW, FH);
    ctx.clip();
    if (mode === 'title') drawTitle();
    else if (phase === 'scroll') drawScroll();
    else drawField();
    ctx.restore();
  }

  // ---------- 화면 전환 ----------
  const screens = { start: $('start-screen'), pause: $('pause-screen'), result: $('result-screen') };
  const extra = $('menu-extra');
  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('hidden', k !== name); });
    if (name && screens[name]) {
      const slot = screens[name].querySelector('.menu-slot');
      if (slot) slot.appendChild(extra);
      const first = screens[name].querySelector('button.big');
      if (first) first.focus({ preventScroll: true });
    }
  }

  function pickRound(d) {
    pickIdx = (pickIdx + d + ROUND_PICKS.length) % ROUND_PICKS.length;
    const n = ROUND_PICKS[pickIdx];
    $('round-value').textContent = n;
    round = n;
    level = genLevel(n);
    tileCanvas = buildTiles(level);
  }

  function startGame() {
    ensureAudio();
    clearKeys();
    score = 0;
    lives = 3;
    letters = [false, false, false, false, false, false];
    player = null;
    mode = 'play';
    show(null);
    beginRound(ROUND_PICKS[pickIdx], false);
    canvas.focus && canvas.focus();
  }
  function pauseGame() {
    if (mode !== 'play') return;
    mode = 'pause';
    clearKeys();
    show('pause');
  }
  function resumeGame() {
    mode = 'play';
    clearKeys();
    show(null);
    ensureAudio();
  }
  function toTitle() {
    mode = 'title';
    pickRound(0);
    show('start');
  }
  function endGame(won) {
    mode = 'result';
    clearKeys();
    $('result-title').textContent = won ? 'ALL CLEAR!' : 'GAME OVER';
    $('result-line').textContent = won ? '100라운드 보스까지 모두 물리쳤어!' : 'ROUND ' + round + '에서 멈췄어. 다시 도전!';
    $('result-score').textContent = score;
    $('result-hi').textContent = hi;
    $('result-round').textContent = round;
    show('result');
  }

  function syncSound() {
    $('sound-button').textContent = soundOn ? '소리 켜짐' : '소리 꺼짐';
  }
  $('round-prev').addEventListener('click', function () { pickRound(-1); });
  $('round-next').addEventListener('click', function () { pickRound(1); });
  $('start-button').addEventListener('click', startGame);
  $('resume-button').addEventListener('click', resumeGame);
  $('restart-button').addEventListener('click', startGame);
  $('again-button').addEventListener('click', startGame);
  $('title-button').addEventListener('click', toTitle);
  $('result-title-button').addEventListener('click', toTitle);
  $('sound-button').addEventListener('click', function () {
    soundOn = !soundOn;
    localStorage.setItem('bogle-sound', soundOn ? 'on' : 'off');
    syncSound();
    if (soundOn) { ensureAudio(); SFX.item(); }
  });
  syncSound();

  // ---------- 루프 ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (mode === 'title') updateTitle(dt);
    else if (mode === 'play') update(dt);
    pressed.jump = pressed.shoot = pressed.down = false;
    draw();
    requestAnimationFrame(loop);
  }
  resetPlayer();
  show('start');
  requestAnimationFrame(loop);
})();
