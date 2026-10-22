(function () {
  'use strict';

  const page = typeof window === 'undefined' ? {} : window;
  const custom = (page.GAME_CONFIG && page.GAME_CONFIG.custom) || {};
  const GRID = num(custom.gridSize, 5, 4, 6);
  const FIRST = num(custom.firstRecipeCells, 4, 3, GRID * GRID);
  const GROWTH = num(custom.recipeGrowth, 1, 0, 3);
  const MAX = num(custom.maxRecipeCells, 8, FIRST, GRID * GRID);
  const LIMIT = num(custom.timeLimitSec, 90, 15, 600) * 1000;
  const KINDS = ['mushroom', 'leaf', 'crystal', 'berry', 'petal'];
  const KIND_NAME = { mushroom: '버섯', leaf: '풀잎', crystal: '수정', berry: '열매', petal: '꽃잎' };
  const LIFT = 36;

  function num(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalize(cells) {
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    return cells.map((c) => ({ x: c.x - minX, y: c.y - minY }));
  }

  function bounds(cells) {
    return {
      w: Math.max(...cells.map((c) => c.x)) + 1,
      h: Math.max(...cells.map((c) => c.y)) + 1
    };
  }

  function rotateCells(cells) {
    return normalize(cells.map((c) => ({ x: c.y, y: -c.x })));
  }

  function keyOf(c) { return c.x + ',' + c.y; }

  function makeBlob(n, rng) {
    const cells = [{ x: 0, y: 0 }];
    const set = new Set(['0,0']);
    let guard = 0;
    while (cells.length < n && guard < 400) {
      guard += 1;
      const base = cells[Math.floor(rng() * cells.length)];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const dir = dirs[Math.floor(rng() * dirs.length)];
      const next = { x: base.x + dir[0], y: base.y + dir[1] };
      if (Math.abs(next.x) > 2 || Math.abs(next.y) > 2) continue;
      const key = keyOf(next);
      if (set.has(key)) continue;
      set.add(key);
      cells.push(next);
    }
    return normalize(cells);
  }

  function fallbackShape(n) {
    const w = Math.min(GRID, Math.ceil(Math.sqrt(n)));
    const cells = [];
    for (let i = 0; i < n; i += 1) cells.push({ x: i % w, y: Math.floor(i / w) });
    return cells;
  }

  function centerOnGrid(cells) {
    const box = bounds(cells);
    const ox = Math.floor((GRID - box.w) / 2);
    const oy = Math.floor((GRID - box.h) / 2);
    return cells.map((c) => ({ x: c.x + ox, y: c.y + oy }));
  }

  function partition(cells, rng) {
    const remaining = new Map(cells.map((c) => [keyOf(c), { x: c.x, y: c.y }]));
    const groups = [];
    while (remaining.size) {
      const keys = [...remaining.keys()];
      const start = remaining.get(keys[Math.floor(rng() * keys.length)]);
      const group = [start];
      remaining.delete(keyOf(start));
      const target = Math.min(remaining.size + group.length, 2 + Math.floor(rng() * 2));
      while (group.length < target) {
        const options = [];
        for (const cell of group) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const key = (cell.x + dx) + ',' + (cell.y + dy);
            if (remaining.has(key)) options.push(key);
          }
        }
        if (!options.length) break;
        const key = options[Math.floor(rng() * options.length)];
        group.push(remaining.get(key));
        remaining.delete(key);
      }
      groups.push(group);
    }
    return groups;
  }

  function makeLevel(count, rng) {
    let shape = [];
    for (let attempt = 0; attempt < 30 && shape.length < count; attempt += 1) shape = makeBlob(count, rng);
    if (shape.length < count || bounds(shape).w > GRID || bounds(shape).h > GRID) shape = fallbackShape(count);
    const recipe = centerOnGrid(shape);
    const pieces = partition(recipe, rng).map((group, index) => {
      const anchor = { col: Math.min(...group.map((c) => c.x)), row: Math.min(...group.map((c) => c.y)) };
      let cells = normalize(group);
      const turns = Math.floor(rng() * 4);
      for (let i = 0; i < turns; i += 1) cells = rotateCells(cells);
      return {
        id: 'p' + index + '-' + count,
        kind: KINDS[index % KINDS.length],
        cells,
        home: 'shelf',
        col: null,
        row: null,
        anchor
      };
    });
    for (let i = pieces.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const swap = pieces[i];
      pieces[i] = pieces[j];
      pieces[j] = swap;
    }
    return { recipe, pieces };
  }

  function canPlace(recipe, pieces, pieceId, col, row, cells) {
    const need = new Set(recipe.map(keyOf));
    const taken = new Set();
    for (const piece of pieces) {
      if (piece.id === pieceId || piece.home !== 'board') continue;
      for (const cell of piece.cells) taken.add((piece.col + cell.x) + ',' + (piece.row + cell.y));
    }
    return cells.every((cell) => {
      const key = (col + cell.x) + ',' + (row + cell.y);
      return need.has(key) && !taken.has(key);
    });
  }

  const state = {
    screen: 'start',
    potions: 0,
    seed: 1,
    recipe: [],
    pieces: [],
    selectedId: null,
    locked: false,
    muted: false,
    hint: true,
    leftMs: LIMIT,
    ending: false,
    lastTick: 0,
    lastSecond: -1
  };
  let drag = null;
  let audioCtx = null;
  const ui = {};

  function pieceById(id) { return state.pieces.find((piece) => piece.id === id); }
  function elOf(piece) { return ui.tray.querySelector('[data-id="' + piece.id + '"]') || ui.grid.querySelector('[data-id="' + piece.id + '"]') || ui.floatLayer.querySelector('[data-id="' + piece.id + '"]'); }

  function cellSize() {
    const rect = ui.grid.getBoundingClientRect();
    return rect.width / GRID;
  }

  function show(screen) {
    state.screen = screen;
    ui.app.dataset.screen = screen;
    ui.start.hidden = screen !== 'start';
    ui.pause.hidden = screen !== 'pause';
    ui.result.hidden = screen !== 'result';
    const host = { start: ui.startHost, pause: ui.pauseHost, result: ui.resultHost }[screen];
    if (host) host.appendChild(ui.ledger);
  }

  function say(text) { ui.live.textContent = text; }

  function tone(freq, dur) {
    if (state.muted || typeof window.AudioContext !== 'function' && typeof window.webkitAudioContext !== 'function') return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }

  function renderSound() {
    ui.sound.textContent = state.muted ? '소리 켜기' : '소리 끄기';
    ui.sound.setAttribute('aria-pressed', String(!state.muted));
  }

  function drawPiece(piece) {
    let el = elOf(piece);
    if (!el) {
      el = document.createElement('div');
      el.className = 'piece';
      el.dataset.id = piece.id;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
    }
    const box = bounds(piece.cells);
    el.style.setProperty('--cols', box.w);
    el.style.setProperty('--rows', box.h);
    el.setAttribute('aria-label', KIND_NAME[piece.kind] + ' 조각');
    el.setAttribute('aria-pressed', String(state.selectedId === piece.id));
    el.classList.toggle('is-selected', state.selectedId === piece.id);
    el.replaceChildren();
    for (const cell of piece.cells) {
      const tile = document.createElement('span');
      tile.className = 'tile tile-' + piece.kind;
      tile.style.gridColumn = String(cell.x + 1);
      tile.style.gridRow = String(cell.y + 1);
      el.appendChild(tile);
    }
    return el;
  }

  function positionBoard(piece) {
    const el = elOf(piece);
    if (!el) return;
    const cell = cellSize();
    el.style.position = 'absolute';
    el.style.left = Math.round(piece.col * cell) + 'px';
    el.style.top = Math.round(piece.row * cell) + 'px';
    el.style.zIndex = '2';
  }

  function park(piece) {
    const el = drawPiece(piece);
    el.classList.remove('is-dragging', 'is-invalid');
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.zIndex = '';
    if (piece.home === 'board') {
      ui.grid.appendChild(el);
      positionBoard(piece);
    } else {
      ui.tray.appendChild(el);
    }
  }

  function renderBoard() {
    ui.grid.replaceChildren();
    ui.grid.style.setProperty('--grid', GRID);
    const recipe = new Set(state.recipe.map(keyOf));
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const cell = document.createElement('div');
        cell.className = 'cell' + (recipe.has(x + ',' + y) ? ' is-socket' : '');
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        ui.grid.appendChild(cell);
      }
    }
    ui.tray.replaceChildren();
    for (const piece of state.pieces) park(piece);
    ui.hint.hidden = !state.hint;
  }

  function renderRack(pop) {
    ui.rack.replaceChildren();
    ui.rack.setAttribute('aria-label', '만든 물약 ' + state.potions + '병');
    const label = document.createElement('span');
    label.textContent = state.potions + '병';
    ui.rack.appendChild(label);
    const shown = Math.min(state.potions, 6);
    for (let i = 0; i < shown; i += 1) {
      const img = document.createElement('img');
      img.src = 'assets/potion.svg';
      img.alt = '';
      if (pop && i === shown - 1) img.className = 'is-new';
      ui.rack.appendChild(img);
    }
  }

  function layout() {
    const rect = ui.grid.getBoundingClientRect();
    if (rect.width < 8) return;
    ui.app.style.setProperty('--cell', (rect.width / GRID) + 'px');
    if (drag && drag.lifted) return;
    for (const piece of state.pieces) if (piece.home === 'board') positionBoard(piece);
  }

  function deal() {
    const rng = mulberry32((state.seed + state.potions * 997) >>> 0);
    const count = Math.min(MAX, FIRST + state.potions * GROWTH);
    const level = makeLevel(count, rng);
    state.recipe = level.recipe;
    state.pieces = level.pieces.map((piece, index) => ({ ...piece, id: 'p' + state.potions + '-' + index }));
    state.selectedId = state.pieces[0] ? state.pieces[0].id : null;
    state.locked = false;
    renderBoard();
    requestAnimationFrame(layout);
  }

  function clockText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minute = Math.floor(total / 60);
    const second = total % 60;
    return minute + ':' + String(second).padStart(2, '0');
  }

  function limitPhrase() {
    const total = Math.round(LIMIT / 1000);
    const minute = Math.floor(total / 60);
    const second = total % 60;
    if (minute && second) return minute + '분 ' + second + '초';
    if (minute) return minute + '분';
    return second + '초';
  }

  function renderClock() {
    const ms = Math.max(0, state.leftMs);
    ui.clock.textContent = clockText(ms);
    ui.clock.classList.toggle('is-low', ms > 0 && ms <= 10000);
    const total = Math.max(0, Math.ceil(ms / 1000));
    ui.clock.setAttribute('aria-label', '남은 시간 ' + Math.floor(total / 60) + '분 ' + (total % 60) + '초');
  }

  function tick(now) {
    state.frame = window.requestAnimationFrame(tick);
    if (state.screen !== 'play' || state.ending || document.hidden) {
      state.lastTick = now;
      return;
    }
    if (!state.lastTick) state.lastTick = now;
    let delta = now - state.lastTick;
    state.lastTick = now;
    if (delta < 0) delta = 0;
    if (delta > 250) delta = 250;
    state.leftMs -= delta;
    const second = Math.max(0, Math.ceil(state.leftMs / 1000));
    if (second !== state.lastSecond && (second === 30 || second === 10)) say('남은 시간 ' + second + '초');
    state.lastSecond = second;
    renderClock();
    if (state.leftMs > 0) return;
    state.leftMs = 0;
    renderClock();
    if (state.locked) {
      state.ending = true;
      return;
    }
    endByTime();
  }

  function begin() {
    state.potions = 0;
    state.seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    state.hint = true;
    state.leftMs = LIMIT;
    state.ending = false;
    state.lastTick = 0;
    state.lastSecond = Math.ceil(LIMIT / 1000);
    show('play');
    renderClock();
    renderRack(false);
    deal();
    say(limitPhrase() + ' 동안 물약을 만들어 봐.');
  }

  function covered() {
    const cells = new Set();
    for (const piece of state.pieces) {
      if (piece.home !== 'board') continue;
      for (const cell of piece.cells) cells.add((piece.col + cell.x) + ',' + (piece.row + cell.y));
    }
    return cells.size === state.recipe.length && state.recipe.every((cell) => cells.has(keyOf(cell)));
  }

  function finishBrew() {
    state.locked = true;
    ui.pot.classList.add('is-bubbling');
    tone(240, 0.18);
    window.setTimeout(() => tone(420, 0.2), 120);
    window.setTimeout(() => {
      state.potions += 1;
      state.locked = false;
      ui.pot.classList.remove('is-bubbling');
      renderRack(true);
      say('물약 ' + state.potions + '병을 만들었어.');
      if (state.ending || state.leftMs <= 0) {
        endByTime();
        return;
      }
      deal();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 160 : 700);
  }

  function wiggle(piece) {
    const el = elOf(piece);
    if (!el) return;
    el.classList.remove('is-wiggle');
    void el.offsetWidth;
    el.classList.add('is-wiggle');
  }

  function select(id) {
    state.selectedId = id;
    for (const piece of state.pieces) {
      const el = elOf(piece);
      if (!el) continue;
      el.classList.toggle('is-selected', piece.id === id);
      el.setAttribute('aria-pressed', String(piece.id === id));
    }
  }

  function rotatePiece(piece) {
    if (!piece || state.locked) return;
    const next = rotateCells(piece.cells);
    if (piece.home === 'board' && !canPlace(state.recipe, state.pieces, piece.id, piece.col, piece.row, next)) {
      wiggle(piece);
      tone(150, 0.1);
      return;
    }
    piece.cells = next;
    if (drag && drag.lifted && drag.id === piece.id) {
      const el = drawPiece(piece);
      const rect = el.getBoundingClientRect();
      const cx = drag.centerX;
      const cy = drag.centerY;
      el.style.position = 'fixed';
      el.style.left = Math.round(cx - el.offsetWidth / 2) + 'px';
      el.style.top = Math.round(cy - el.offsetHeight / 2) + 'px';
      drag.dx = cx - parseFloat(el.style.left);
      drag.dy = cy - parseFloat(el.style.top);
      previewAt(parseFloat(el.style.left), parseFloat(el.style.top));
    } else {
      park(piece);
    }
    tone(340, 0.08);
  }

  function clearPreview() {
    for (const cell of ui.grid.querySelectorAll('.cell')) cell.classList.remove('is-fit', 'is-miss');
  }

  function previewAt(left, top) {
    clearPreview();
    const piece = pieceById(drag.id);
    const rect = ui.grid.getBoundingClientRect();
    const cell = rect.width / GRID;
    const col = Math.round((left - rect.left) / cell);
    const row = Math.round((top - rect.top) / cell);
    const ok = canPlace(state.recipe, state.pieces, piece.id, col, row, piece.cells);
    for (const bit of piece.cells) {
      const socket = ui.grid.querySelector('[data-x="' + (col + bit.x) + '"][data-y="' + (row + bit.y) + '"]');
      if (socket) socket.classList.add(ok ? 'is-fit' : 'is-miss');
    }
    const el = elOf(piece);
    if (el) el.classList.toggle('is-invalid', !ok);
    drag.col = col;
    drag.row = row;
    drag.ok = ok;
  }

  function endDrag(cancel) {
    if (!drag) return;
    const piece = pieceById(drag.id);
    const current = drag;
    drag = null;
    clearPreview();
    if (!piece) return;
    if (!current.lifted) {
      if (!cancel) {
        select(piece.id);
        rotatePiece(piece);
      }
      return;
    }
    const el = elOf(piece);
    const gridRect = ui.grid.getBoundingClientRect();
    const pieceRect = el.getBoundingClientRect();
    const overlaps = !(pieceRect.right < gridRect.left || pieceRect.left > gridRect.right || pieceRect.bottom < gridRect.top || pieceRect.top > gridRect.bottom);
    const shelfRect = ui.shelf.getBoundingClientRect();
    const pieceCenterX = pieceRect.left + pieceRect.width / 2;
    const pieceCenterY = pieceRect.top + pieceRect.height / 2;
    const pieceOnShelf = pieceCenterX >= shelfRect.left && pieceCenterX <= shelfRect.right && pieceCenterY >= shelfRect.top;
    const pieceBelowPot = pieceCenterY > gridRect.bottom;
    if (!cancel && (pieceOnShelf || pieceBelowPot)) {
      piece.home = 'shelf';
      piece.col = null;
      piece.row = null;
      park(piece);
      tone(180, 0.08);
      return;
    }
    if (!cancel && overlaps && current.ok) {
      piece.home = 'board';
      piece.col = current.col;
      piece.row = current.row;
      state.hint = false;
      park(piece);
      tone(210, 0.09);
      if (covered()) finishBrew();
      return;
    }
    piece.home = current.home;
    piece.col = current.col0;
    piece.row = current.row0;
    park(piece);
    if (!cancel && current.lifted) {
      wiggle(piece);
      tone(150, 0.1);
    }
  }

  function onDown(event) {
    if (state.screen !== 'play' || state.locked || state.ending || drag) return;
    const el = event.target.closest('.piece');
    if (!el || event.button > 0) return;
    const piece = pieceById(el.dataset.id);
    if (!piece) return;
    event.preventDefault();
    select(piece.id);
    const rect = el.getBoundingClientRect();
    drag = {
      id: piece.id,
      pointerId: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      lifted: false,
      home: piece.home,
      col0: piece.col,
      row0: piece.row,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      pointerX: event.clientX,
      pointerY: event.clientY
    };
    try { el.setPointerCapture(event.pointerId); } catch (error) { /* 포인터 캡처가 거절돼도 드래그는 이어간다. */ }
  }

  function onMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const piece = pieceById(drag.id);
    const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.lifted && dist > 8) {
      drag.lifted = true;
      piece.home = 'shelf';
      piece.col = null;
      piece.row = null;
      const el = drawPiece(piece);
      ui.floatLayer.appendChild(el);
      el.classList.add('is-dragging');
      try { el.setPointerCapture(event.pointerId); } catch (error) { /* 포인터 캡처가 거절돼도 드래그는 이어간다. */ }
    }
    if (!drag.lifted) return;
    const el = elOf(piece);
    const left = event.clientX - drag.dx;
    const top = event.clientY - drag.dy - LIFT;
    el.style.position = 'fixed';
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
    drag.centerX = left + el.offsetWidth / 2;
    drag.centerY = top + el.offsetHeight / 2;
    drag.pointerX = event.clientX;
    drag.pointerY = event.clientY;
    previewAt(left, top);
  }

  function onUp(event) {
    if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
    endDrag(event.type === 'pointercancel');
  }

  function endByTime() {
    if (state.screen === 'result') return;
    state.ending = true;
    state.leftMs = 0;
    renderClock();
    if (drag) endDrag(true);
    finishDay(true);
  }

  function finishDay(timed) {
    show('result');
    ui.resultTitle.textContent = timed ? '불이 꺼졌어' : '오늘은 여기까지';
    ui.resultCount.textContent = state.potions + '병';
    if (timed) {
      ui.resultText.textContent = state.potions > 0
        ? limitPhrase() + ' 동안 마녀가 물약 ' + state.potions + '병을 만들었어.'
        : limitPhrase() + ' 동안 완성한 물약이 없어.';
    } else {
      ui.resultText.textContent = state.potions > 0
        ? '지금까지 물약 ' + state.potions + '병을 만들었어.'
        : '아직은 완성한 물약이 없어.';
    }
    ui.resultShelf.replaceChildren();
    const shown = Math.min(state.potions, 12);
    for (let i = 0; i < shown; i += 1) {
      const img = document.createElement('img');
      img.src = 'assets/potion.svg';
      img.alt = '';
      ui.resultShelf.appendChild(img);
    }
    if (state.potions > 12) {
      const more = document.createElement('span');
      more.textContent = '+' + (state.potions - 12);
      ui.resultShelf.appendChild(more);
    }
    say(ui.resultText.textContent);
  }

  function bind() {
    ui.startBtn.addEventListener('click', begin);
    ui.again.addEventListener('click', begin);
    ui.restart.addEventListener('click', begin);
    ui.pauseBtn.addEventListener('click', () => { if (state.screen === 'play') show('pause'); });
    ui.resume.addEventListener('click', () => { show('play'); requestAnimationFrame(layout); });
    ui.finish.addEventListener('click', finishDay);
    ui.sound.addEventListener('click', () => { state.muted = !state.muted; renderSound(); });
    ui.rotate.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const piece = pieceById(state.selectedId) || state.pieces[0];
      if (piece) {
        select(piece.id);
        rotatePiece(piece);
      }
    });
    ui.app.addEventListener('pointerdown', onDown);
    ui.app.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', () => endDrag(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(true); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.screen === 'play') show('pause');
      else if (event.key === 'Escape' && state.screen === 'pause') { show('play'); requestAnimationFrame(layout); }
      else if ((event.key === 'r' || event.key === 'R') && state.screen === 'play') {
        const piece = pieceById(state.selectedId);
        if (piece) rotatePiece(piece);
      }
    });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => layout()).observe(ui.grid);
    else window.addEventListener('resize', layout);
  }

  function init() {
    ui.app = document.getElementById('app');
    ui.grid = document.getElementById('grid');
    ui.tray = document.getElementById('tray');
    ui.shelf = document.querySelector('.shelf');
    ui.floatLayer = document.getElementById('float-layer');
    ui.rack = document.getElementById('rack');
    ui.hint = document.getElementById('hint');
    ui.clock = document.getElementById('clock');
    ui.resultTitle = document.getElementById('result-title');
    ui.resultCount = document.getElementById('result-count');
    ui.live = document.getElementById('live');
    ui.pot = document.querySelector('.pot');
    ui.ledger = document.getElementById('ledger');
    ui.start = document.getElementById('screen-start');
    ui.pause = document.getElementById('screen-pause');
    ui.result = document.getElementById('screen-result');
    ui.startHost = document.getElementById('start-host');
    ui.pauseHost = document.getElementById('pause-host');
    ui.resultHost = document.getElementById('result-host');
    ui.startBtn = document.getElementById('start-btn');
    ui.pauseBtn = document.getElementById('pause-btn');
    ui.resume = document.getElementById('resume-btn');
    ui.restart = document.getElementById('restart-btn');
    ui.finish = document.getElementById('finish-btn');
    ui.again = document.getElementById('again-btn');
    ui.sound = document.getElementById('sound-btn');
    ui.rotate = document.getElementById('rotate-btn');
    ui.resultText = document.getElementById('result-text');
    ui.resultShelf = document.getElementById('result-shelf');
    ui.app.style.setProperty('--grid', GRID);
    bind();
    show('start');
    renderClock();
    renderRack(false);
    state.frame = window.requestAnimationFrame(tick);
  }

  if (typeof document !== 'undefined') init();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { makeLevel, canPlace, rotateCells, normalize, GRID, FIRST, GROWTH, MAX };
  }
})();
