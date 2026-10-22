(() => {
  const GOAL = 20;
  const MAX_HEARTS = 3;
  const SCROLL = 172;
  const SWIM = 340;

  const stage = document.querySelector('#stage');
  const canvas = document.querySelector('#sea');
  const g = canvas.getContext('2d');
  const hud = document.querySelector('#hud');
  const shellCount = document.querySelector('#shell-count');
  const heartsEl = document.querySelector('#hearts');
  const hint = document.querySelector('#hint');
  const panelStart = document.querySelector('#panel-start');
  const panelPause = document.querySelector('#panel-pause');
  const panelResult = document.querySelector('#panel-result');
  const resultTitle = document.querySelector('#result-title');
  const resultText = document.querySelector('#result-text');
  const soundBtn = document.querySelector('#sound-btn');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let viewW = 390;
  let viewH = 700;
  let mode = 'start';
  let camera = 0;
  let clock = 0;
  let shells = 0;
  let hearts = MAX_HEARTS;
  let invuln = 0;
  let shake = 0;
  let hintLeft = 0;
  let winTimer = 0;
  let last = performance.now();
  const diver = { x: 180, vx: 0, tilt: 0 };
  let items = [];
  let fish = [];
  const bubbles = [];
  const pops = [];
  let nextY = 600;
  let spawnIndex = 0;
  const keys = new Set();
  const pointers = new Map();
  let audioCtx = null;
  let muted = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.max(1, rect.width);
    viewH = Math.max(1, rect.height);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mode === 'start') diver.x = viewW / 2;
  }

  function spriteScale() {
    return Math.max(1.05, Math.min(viewW, 520) / 380);
  }

  function banks(worldY) {
    const field = Math.min(viewW, 520);
    const edge = (viewW - field) / 2;
    const margin = Math.max(26, field * 0.07);
    const snake = Math.sin(worldY * 0.0056) * field * 0.18
      + Math.sin(worldY * 0.0135 + 0.8) * field * 0.08
      + Math.sin(worldY * 0.029 + 1.6) * 22;
    const pinch = Math.sin(worldY * 0.018) * 12;
    let left = edge + margin + snake - pinch;
    let right = edge + field - margin + snake + pinch;
    const minGap = 172;
    if (right - left < minGap) {
      const mid = (left + right) / 2;
      left = mid - minGap / 2;
      right = mid + minGap / 2;
    }
    if (left < 12) {
      right += 12 - left;
      left = 12;
    }
    if (right > viewW - 12) {
      left -= right - (viewW - 12);
      right = viewW - 12;
    }
    if (right - left < minGap) {
      left = Math.max(12, (viewW - minGap) / 2);
      right = Math.min(viewW - 12, left + minGap);
    }
    return { left, right };
  }

  function diverScreenY() {
    if (mode === 'start') return viewH * 0.5;
    return Math.max(158, Math.min(viewH * 0.34, 250));
  }

  function heartMarkup(filled) {
    const color = filled ? '#e15b64' : 'rgba(215, 238, 248, 0.35)';
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="${color}" d="M16 27.2C13.6 25.2 4 18.6 4 12.2 4 8.6 6.7 6 10.1 6c2.1 0 3.6 1 4.7 2.6C16 7 17.6 6 19.8 6 23.3 6 26 8.6 26 12.2 26 18.6 18.2 25.2 16 27.2z"/></svg>`;
  }

  function renderHud() {
    shellCount.textContent = `조개 ${shells}/${GOAL}`;
    heartsEl.innerHTML = Array.from({ length: MAX_HEARTS }, (_, index) => heartMarkup(index < hearts)).join('');
    heartsEl.setAttribute('aria-label', `하트 ${hearts}개`);
  }

  function setMode(next) {
    mode = next;
    stage.dataset.mode = next;
    panelStart.hidden = next !== 'start';
    panelPause.hidden = next !== 'pause';
    panelResult.hidden = next !== 'result';
    hud.hidden = next === 'start' || next === 'result';
    hint.hidden = next !== 'play' || hintLeft <= 0;
    if (next !== 'play') pointers.clear();
  }

  function resetRun() {
    camera = 0;
    shells = 0;
    hearts = MAX_HEARTS;
    invuln = 0;
    shake = 0;
    winTimer = 0;
    diver.x = viewW / 2;
    diver.vx = 0;
    diver.tilt = 0;
    items = [];
    fish = [];
    bubbles.length = 0;
    pops.length = 0;
    spawnIndex = 0;
    nextY = viewH * 1.05;
    renderHud();
  }

  function ensureAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!audioCtx) audioCtx = new Audio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, duration, type, volume) {
    if (muted || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function startGame() {
    if (mode === 'play') return;
    ensureAudio();
    resetRun();
    hintLeft = 3.4;
    setMode('play');
  }

  function finish(kind) {
    if (mode === 'result') return;
    winTimer = 0;
    if (kind === 'win') {
      resultTitle.textContent = '탐험 성공';
      resultText.textContent = '조개 20개를 모았어.';
      tone(523, 0.12, 'sine', 0.06);
      setTimeout(() => tone(659, 0.12, 'sine', 0.06), 120);
      setTimeout(() => tone(784, 0.18, 'sine', 0.06), 240);
    } else {
      resultTitle.textContent = '하트가 떨어졌어';
      resultText.textContent = `모은 조개는 ${shells}개야. 산호와 성게를 피해서 다시 잠수해 보자.`;
      tone(196, 0.22, 'triangle', 0.05);
    }
    setMode('result');
  }

  function inputDir() {
    let dir = 0;
    if (keys.has('left')) dir -= 1;
    if (keys.has('right')) dir += 1;
    for (const value of pointers.values()) dir += value;
    if (dir > 0) return 1;
    if (dir < 0) return -1;
    return 0;
  }

  function coralSpan(item) {
    const bank = banks(item.y);
    const len = (bank.right - bank.left) * item.reach;
    if (item.side === 'left') return { x0: bank.left, x1: bank.left + len };
    return { x0: bank.right - len, x1: bank.right };
  }

  function shellX(item) {
    const bank = banks(item.y);
    const pad = 36;
    return bank.left + pad + item.lane * (bank.right - bank.left - pad * 2);
  }

  function makeShell(y, lane) {
    return { kind: 'shell', y, lane, pop: 0, taken: false };
  }

  function spawnOne() {
    const index = spawnIndex++;
    const y = nextY;
    nextY += 108;
    if (index < 2) {
      items.push(makeShell(y, 0.35 + Math.random() * 0.3));
      return;
    }
    const roll = index % 5;
    if (roll === 0 || roll === 3) {
      const lane = roll === 0 ? 0.16 + Math.random() * 0.28 : 0.56 + Math.random() * 0.28;
      items.push(makeShell(y, lane));
      return;
    }
    if (roll === 2) {
      items.push({ kind: 'urchin', y, lane: 0.3 + Math.random() * 0.4, struck: false });
      return;
    }
    const side = index % 2 === 0 ? 'left' : 'right';
    items.push({ kind: 'coral', y, side, reach: 0.32 + Math.random() * 0.12, struck: false });
    if (roll === 4) {
      items.push({
        kind: 'coral',
        y: y + 6,
        side: side === 'left' ? 'right' : 'left',
        reach: 0.2 + Math.random() * 0.08,
        struck: false
      });
    }
  }

  function burst(x, y, color) {
    for (let i = 0; i < 8; i += 1) {
      pops.push({
        x, y,
        vx: Math.sin(i) * 40,
        vy: Math.cos(i) * 28 - 20,
        life: 0.35,
        color
      });
    }
  }

  function update(dt) {
    const dir = inputDir();
    if (dir !== 0) hintLeft = Math.min(hintLeft, 0.45);
    hintLeft -= dt;
    hint.hidden = hintLeft <= 0;
    camera += dt * SCROLL;
    diver.vx += (dir * SWIM - diver.vx) * Math.min(1, dt * 8);
    diver.x += diver.vx * dt;
    diver.tilt += (dir * 0.38 - diver.tilt) * Math.min(1, dt * 8);
    const swimY = camera + diverScreenY();
    const bank = banks(swimY);
    const margin = 26 * spriteScale();
    diver.x = Math.max(bank.left + margin, Math.min(bank.right - margin, diver.x));
    while (nextY < camera + viewH + 160) spawnOne();
    if (invuln > 0) invuln -= dt;
    if (shake > 0) shake -= dt;

    for (const item of items) {
      if (item.kind === 'shell' && !item.taken && shells < GOAL && winTimer <= 0) {
        const dx = diver.x - shellX(item);
        const dy = swimY - item.y;
        const grab = 32 * spriteScale();
        if (dx * dx + dy * dy < grab * grab) {
          item.taken = true;
          shells += 1;
          renderHud();
          burst(shellX(item), item.y - camera, '#f6e7c1');
          tone(840 + shells * 12, 0.08, 'sine', 0.05);
          if (shells >= GOAL && !winTimer) winTimer = 0.45;
        }
      }
      if ((item.kind === 'coral' || item.kind === 'urchin') && !item.struck && invuln <= 0 && winTimer <= 0) {
        const body = 22 * spriteScale();
        let hit = false;
        if (item.kind === 'coral') {
          const span = coralSpan(item);
          hit = Math.abs(swimY - item.y) < body + 8 && diver.x > span.x0 - body * 0.35 && diver.x < span.x1 + body * 0.35;
        } else {
          const dx = diver.x - shellX(item);
          const dy = swimY - item.y;
          hit = dx * dx + dy * dy < (body + 4) * (body + 4);
        }
        if (hit) {
          item.struck = true;
          hearts -= 1;
          invuln = 1.15;
          shake = 0.22;
          renderHud();
          burst(diver.x, diverScreenY(), '#e15b64');
          tone(170, 0.16, 'triangle', 0.06);
          if (hearts <= 0) {
            finish('lose');
            return;
          }
        }
      }
      if (item.pop !== undefined && item.taken) item.pop += dt;
    }
    items = items.filter((item) => item.y > camera - 120 && !(item.taken && item.pop > 0.28));

    if (bubbles.length < 18 && Math.random() < dt * (reduceMotion ? 2 : 7)) {
      bubbles.push({
        x: diver.x + (Math.random() * 24 - 12),
        y: diverScreenY() + 16,
        r: 2 + Math.random() * 3.5,
        vy: 28 + Math.random() * 36
      });
    }
    for (const bubble of bubbles) bubble.y -= bubble.vy * dt;
    for (let i = bubbles.length - 1; i >= 0; i -= 1) if (bubbles[i].y < -10) bubbles.splice(i, 1);

    for (const one of fish) if (one.y < camera - 50) one.y = camera + viewH + 80 + Math.random() * 240;

    for (const pop of pops) {
      pop.life -= dt;
      pop.x += pop.vx * dt;
      pop.y += pop.vy * dt;
    }
    for (let i = pops.length - 1; i >= 0; i -= 1) if (pops[i].life <= 0) pops.splice(i, 1);

    if (mode === 'play' && winTimer > 0) {
      winTimer -= dt;
      if (winTimer <= 0) finish('win');
    }
  }

  function stockFish() {
    while (fish.length < 8) {
      const tints = ['#7dcea0', '#5dade2', '#f0a0c0'];
      fish.push({
        y: camera + (mode === 'play' ? viewH + 80 : viewH * 0.18) + fish.length * 90,
        lane: 0.2 + Math.random() * 0.6,
        phase: Math.random() * 6,
        dir: Math.random() < 0.5 ? -1 : 1,
        tint: tints[fish.length % tints.length]
      });
    }
    if (mode === 'start') {
      for (const one of fish) if (one.y < camera - 40) one.y = camera + viewH + 40;
    }
  }

  function drawWater() {
    const wash = g.createLinearGradient(0, 0, 0, viewH);
    wash.addColorStop(0, '#1a8eb8');
    wash.addColorStop(0.45, '#0d628c');
    wash.addColorStop(1, '#08344f');
    g.fillStyle = wash;
    g.fillRect(0, 0, viewW, viewH);
    g.save();
    g.globalAlpha = 0.16;
    g.fillStyle = '#d8f6ff';
    for (let i = 0; i < 4; i += 1) {
      const x = viewW * (0.18 + i * 0.18);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + viewW * 0.08, viewH);
      g.lineTo(x + viewW * 0.14, viewH);
      g.lineTo(x + viewW * 0.04, 0);
      g.fill();
    }
    g.restore();
  }

  function drawRocks() {
    for (const side of ['left', 'right']) {
      g.beginPath();
      if (side === 'left') g.moveTo(0, -12);
      else g.moveTo(viewW, -12);
      for (let sy = -12; sy <= viewH + 12; sy += 8) {
        const bank = banks(camera + sy);
        g.lineTo(side === 'left' ? bank.left : bank.right, sy);
      }
      g.lineTo(side === 'left' ? 0 : viewW, viewH + 12);
      g.closePath();
      g.fillStyle = side === 'left' ? '#0c3f5c' : '#0b3854';
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = 'rgba(186, 230, 240, 0.28)';
      g.stroke();
    }
    const start = Math.floor(camera / 72) * 72;
    for (let y = start; y < camera + viewH + 40; y += 72) {
      const bank = banks(y);
      const sy = y - camera;
      drawSoftPlant(bank.left - 4, sy, 1, y);
      drawSoftPlant(bank.right + 4, sy + 34, -1, y + 20);
      if (Math.sin(y * 0.017) > 0.35) drawStar(bank.left - 18, sy + 16, y);
      if (Math.sin(y * 0.013 + 2) > 0.45) drawStar(bank.right + 18, sy + 28, y + 1);
    }
  }

  function drawStar(x, y, seed) {
    g.save();
    g.translate(x, y);
    g.rotate(seed * 0.01);
    g.fillStyle = '#e7a05a';
    g.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const outer = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const inner = outer + Math.PI / 5;
      g.lineTo(Math.cos(outer) * 8, Math.sin(outer) * 8);
      g.lineTo(Math.cos(inner) * 3.4, Math.sin(inner) * 3.4);
    }
    g.closePath();
    g.fill();
    g.restore();
  }

  function drawSoftPlant(x, y, dir, seed) {
    const wobble = Math.sin(seed) * 6;
    g.fillStyle = '#2a8f98';
    g.beginPath();
    g.ellipse(x + dir * 8, y + wobble, 11, 18, dir * 0.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = seed % 220 > 80 ? '#e7a0c4' : '#f2c14e';
    g.beginPath();
    g.arc(x + dir * 16, y - 10 + wobble, 6, 0, Math.PI * 2);
    g.fill();
  }

  function drawShell(x, y, scale, spin) {
    g.save();
    g.translate(x, y);
    g.rotate(spin);
    g.scale(scale, scale);
    g.fillStyle = '#f6e7c1';
    g.beginPath();
    g.moveTo(0, 12);
    g.bezierCurveTo(-20, 8, -18, -16, 0, -18);
    g.bezierCurveTo(18, -16, 20, 8, 0, 12);
    g.fill();
    g.strokeStyle = '#e0bf78';
    g.lineWidth = 1.6;
    for (let rib = -2; rib <= 2; rib += 1) {
      g.beginPath();
      g.moveTo(0, 8);
      g.quadraticCurveTo(rib * 3.5, -2, rib * 5.5, -14);
      g.stroke();
    }
    g.fillStyle = '#f2c14e';
    g.beginPath();
    g.ellipse(0, 9, 5, 3, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawCoral(item) {
    const span = coralSpan(item);
    const y = item.y - camera;
    const inward = item.side === 'left' ? 1 : -1;
    const base = item.side === 'left' ? span.x0 : span.x1;
    const tip = item.side === 'left' ? span.x1 : span.x0;
    g.fillStyle = item.side === 'left' ? '#e36b4a' : '#d4537e';
    for (const offset of [-20, 0, 18]) {
      g.beginPath();
      g.moveTo(base, y + offset - 12);
      g.lineTo(tip - inward * (offset === 0 ? 0 : 10), y + offset * 0.45);
      g.lineTo(base, y + offset + 12);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#f2c14e';
    g.beginPath();
    g.moveTo(base + inward * 4, y - 2);
    g.lineTo(tip - inward * 6, y - 28);
    g.lineTo(base + inward * 18, y + 6);
    g.closePath();
    g.fill();
  }

  function drawUrchin(item) {
    const x = shellX(item);
    const y = item.y - camera;
    g.save();
    g.translate(x, y);
    g.scale(spriteScale(), spriteScale());
    g.strokeStyle = '#f6e7c1';
    g.lineWidth = 3;
    g.lineCap = 'round';
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + 0.2;
      g.beginPath();
      g.moveTo(Math.cos(angle) * 7, Math.sin(angle) * 7);
      g.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
      g.stroke();
    }
    g.fillStyle = '#6d3d86';
    g.beginPath();
    g.arc(0, 0, 9, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawFish(one) {
    const bank = banks(one.y);
    const x = bank.left + 40 + one.lane * (bank.right - bank.left - 80) + Math.sin(clock * 1.4 + one.phase) * 16;
    const y = one.y - camera + Math.sin(clock * 2 + one.phase) * 4;
    g.save();
    g.translate(x, y);
    g.scale(one.dir, 1);
    g.fillStyle = one.tint;
    g.beginPath();
    g.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-10, 0);
    g.lineTo(-18, -6);
    g.lineTo(-18, 6);
    g.fill();
    g.fillStyle = '#143044';
    g.beginPath();
    g.arc(5, -1, 1.3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawDiver(x, y, tilt, blink) {
    if (blink) return;
    g.save();
    g.translate(x, y);
    g.rotate(tilt);
    g.scale(spriteScale(), spriteScale());
    g.fillStyle = '#f5d34a';
    g.beginPath();
    g.ellipse(-18, 22, 13, 7, -0.6, 0, Math.PI * 2);
    g.ellipse(12, 26, 13, 7, 0.45, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#24345c';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-4, 10);
    g.lineTo(-14, 20);
    g.moveTo(6, 10);
    g.lineTo(10, 22);
    g.stroke();
    g.fillStyle = '#2c3e6b';
    g.beginPath();
    g.ellipse(0, 2, 16, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8ea4cc';
    g.fillRect(-14, -2, 28, 5);
    g.fillRect(-12, 8, 24, 4);
    g.strokeStyle = '#f3c7a1';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(12, 0);
    g.lineTo(24, 8);
    g.stroke();
    g.fillStyle = '#f3c7a1';
    g.beginPath();
    g.arc(0, -22, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f0b429';
    g.beginPath();
    g.arc(-1, -28, 12, Math.PI * 1.05, Math.PI * 1.95);
    g.fill();
    g.beginPath();
    g.ellipse(-9, -30, 5, 7, -0.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#163e78';
    g.beginPath();
    g.ellipse(0, -21, 12, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8fd4f2';
    g.beginPath();
    g.ellipse(-5, -21, 4.5, 3.4, 0, 0, Math.PI * 2);
    g.ellipse(5, -21, 4.5, 3.4, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#9aafc4';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(10, -20);
    g.quadraticCurveTo(20, -20, 20, -38);
    g.stroke();
    g.fillStyle = '#d5e4ef';
    g.beginPath();
    g.arc(20, -38, 3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function draw() {
    const ox = !reduceMotion && shake > 0 ? Math.sin(shake * 90) * 4 : 0;
    g.save();
    g.translate(ox, 0);
    drawWater();
    drawRocks();
    for (const one of fish) {
      const sy = one.y - camera;
      if (sy > -30 && sy < viewH + 30) drawFish(one);
    }
    if (mode === 'start') {
      const lane = banks(camera + viewH * 0.62);
      drawShell(lane.left + (lane.right - lane.left) * 0.3, viewH * 0.64, spriteScale() * 1.2, -0.2);
      drawCoral({ y: camera + viewH * 0.38, side: 'right', reach: 0.38 });
      drawUrchin({ y: camera + viewH * 0.74, lane: 0.68 });
    }
    for (const item of items) {
      const sy = item.y - camera;
      if (sy < -80 || sy > viewH + 80) continue;
      if (item.kind === 'shell') {
        const scale = spriteScale() * (item.taken ? 1 + item.pop * 2 : 1);
        const alpha = item.taken ? Math.max(0, 1 - item.pop * 3) : 1;
        g.save();
        g.globalAlpha = alpha;
        drawShell(shellX(item), sy, scale, Math.sin(item.y * 0.02) * 0.15);
        g.restore();
      } else if (item.kind === 'urchin') {
        drawUrchin(item);
      } else {
        drawCoral(item);
      }
    }
    g.fillStyle = 'rgba(232, 248, 255, 0.75)';
    for (const bubble of bubbles) {
      g.beginPath();
      g.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      g.fill();
    }
    const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0;
    drawDiver(mode === 'start' ? viewW / 2 : diver.x, diverScreenY() + (mode === 'start' && !reduceMotion ? Math.sin(clock * 2) * 6 : 0), mode === 'start' ? Math.sin(clock) * 0.08 : diver.tilt, blink && mode === 'play');
    for (const pop of pops) {
      g.globalAlpha = Math.max(0, pop.life * 3);
      g.fillStyle = pop.color;
      g.beginPath();
      g.arc(pop.x, pop.y, 3.5, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    if (shake > 0) {
      g.strokeStyle = 'rgba(225, 91, 100, 0.4)';
      g.lineWidth = 12;
      g.strokeRect(6, 6, viewW - 12, viewH - 12);
    }
    g.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      if (mode !== 'pause' && mode !== 'result') clock += dt;
      if (mode === 'start' && !reduceMotion) camera += dt * 24;
      if (mode === 'play') update(dt);
      if (mode === 'start' || mode === 'play') stockFish();
    }
    draw();
    requestAnimationFrame(frame);
  }

  function keyName(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') return 'left';
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') return 'right';
    return '';
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if (name) {
      keys.add(name);
      event.preventDefault();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (mode === 'play') setMode('pause');
      else if (mode === 'pause') setMode('play');
    }
    if (event.key === 'Enter' && mode === 'start' && (event.target === document.body || event.target === document.querySelector('#start-btn'))) {
      startGame();
    }
  });
  window.addEventListener('keyup', (event) => {
    const name = keyName(event);
    if (name) keys.delete(name);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    pointers.clear();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'play') setMode('pause');
    last = performance.now();
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (mode !== 'play') return;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    pointers.set(event.pointerId, event.clientX < rect.left + rect.width / 2 ? -1 : 1);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    pointers.set(event.pointerId, event.clientX < rect.left + rect.width / 2 ? -1 : 1);
  });
  function releasePointer(event) { pointers.delete(event.pointerId); }
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  document.querySelector('#start-btn').addEventListener('click', startGame);
  document.querySelector('#pause-btn').addEventListener('click', () => { if (mode === 'play') setMode('pause'); });
  document.querySelector('#resume-btn').addEventListener('click', () => setMode('play'));
  document.querySelector('#restart-btn').addEventListener('click', startGame);
  document.querySelector('#again-btn').addEventListener('click', startGame);
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    soundBtn.textContent = muted ? '소리 켜기' : '소리 끄기';
  });

  window.addEventListener('resize', resize);
  resize();
  renderHud();
  requestAnimationFrame(frame);
})();
