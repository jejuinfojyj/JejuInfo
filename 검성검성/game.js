(function () {
  "use strict";

  const rules = (window.GAME_CONFIG && window.GAME_CONFIG.rules) || {};
  const GRID = Number(rules.grid) || 3;
  const MAX_LIVES = Number(rules.lives) || 3;
  const CELL = GRID * GRID;

  const board = document.getElementById("board");
  const livesEl = document.getElementById("lives");
  const statusEl = document.getElementById("play-status");
  const resultTitle = document.getElementById("result-title");
  const resultCopy = document.getElementById("result-copy");
  const resultKicker = document.getElementById("result-kicker");
  const resultVeil = document.getElementById("screen-result");
  const soundButton = document.getElementById("sound-toggle");

  const rowNames = ["위", "가운데", "아래"];
  const colNames = ["왼쪽", "가운데", "오른쪽"];

  const state = {
    mode: "start",
    order: [],
    locked: [],
    selected: null,
    lives: MAX_LIVES,
    busy: false,
    sound: true,
    hint: true
  };

  let audioCtx = null;

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tone(steps) {
    if (!state.sound) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const start = audioCtx.currentTime + 0.01;
    steps.forEach((step, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = step.type || "sine";
      osc.frequency.value = step.freq;
      const at = start + index * 0.09;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.06, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(at);
      osc.stop(at + 0.17);
    });
  }

  function setMode(mode) {
    state.mode = mode;
    document.body.dataset.state = mode;
    document.getElementById("screen-start").hidden = mode !== "start";
    document.getElementById("screen-play").hidden = mode === "start";
    document.getElementById("screen-play").inert = mode !== "play";
    document.getElementById("screen-pause").hidden = mode !== "pause";
    resultVeil.hidden = mode !== "result";
  }

  function say(text, kind) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-bad", kind === "bad");
    statusEl.classList.toggle("is-good", kind === "good");
  }

  function cellName(index) {
    const row = Math.floor(index / GRID);
    const col = index % GRID;
    if (GRID === 3 && row === 1 && col === 1) return "한가운데 칸";
    if (GRID === 3) return rowNames[row] + " " + colNames[col] + " 칸";
    return (row + 1) + "줄 " + (col + 1) + "칸";
  }

  function shuffled() {
    const order = Array.from({ length: CELL }, function (_, index) { return index; });
    for (let i = CELL - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = order[i];
      order[i] = order[j];
      order[j] = swap;
    }
    const wrong = order.filter(function (piece, index) { return piece !== index; }).length;
    if (wrong < Math.max(4, Math.floor(CELL * 0.55))) return shuffled();
    return order;
  }

  function renderLives() {
    livesEl.replaceChildren();
    for (let i = 0; i < MAX_LIVES; i += 1) {
      const mark = document.createElement("span");
      mark.className = i < state.lives ? "life is-on" : "life";
      livesEl.appendChild(mark);
    }
    livesEl.setAttribute("aria-label", "남은 기회 " + state.lives);
  }

  function render(focusCell) {
    board.style.gridTemplateColumns = "repeat(" + GRID + ", 1fr)";
    board.replaceChildren();
    state.order.forEach(function (piece, cell) {
      const button = document.createElement("button");
      const col = piece % GRID;
      const row = Math.floor(piece / GRID);
      const x = GRID === 1 ? 0 : (col / (GRID - 1)) * 100;
      const y = GRID === 1 ? 0 : (row / (GRID - 1)) * 100;
      button.type = "button";
      button.className = "tile";
      if (state.locked[cell]) button.classList.add("is-locked");
      if (state.selected === cell) button.classList.add("is-selected");
      button.style.backgroundSize = (GRID * 100) + "% " + (GRID * 100) + "%";
      button.style.backgroundPosition = x + "% " + y + "%";
      button.dataset.cell = String(cell);
      button.dataset.piece = String(piece);
      button.setAttribute("aria-pressed", state.selected === cell ? "true" : "false");
      button.setAttribute("aria-label", cellName(cell) + (state.locked[cell] ? ", 맞춰짐" : ""));
      button.addEventListener("click", function () { onTile(cell); });
      board.appendChild(button);
    });
    renderLives();
    if (focusCell != null && board.children[focusCell]) board.children[focusCell].focus();
  }

  function begin() {
    state.order = shuffled();
    state.locked = state.order.map(function (piece, index) { return piece === index; });
    state.selected = null;
    state.lives = MAX_LIVES;
    state.busy = false;
    state.hint = true;
    board.classList.remove("is-whole", "is-wrong");
    resultVeil.classList.remove("is-win");
    say("조각을 누르고, 놓을 자리를 눌러");
    setMode("play");
    render(0);
  }

  function finish(won) {
    state.selected = null;
    state.busy = false;
    board.classList.toggle("is-whole", won);
    resultVeil.classList.toggle("is-win", won);
    resultKicker.textContent = won ? "달이 이어졌어" : "밤의 끝";
    resultTitle.textContent = won ? "고래가 달에 닿았어" : "세 번 빗나갔어";
    resultCopy.textContent = won ? "밤하늘이 한 장으로 모였다." : "흩어진 조각을 다시 모아 보자.";
    setMode("result");
    render();
    tone(won
      ? [{ freq: 523 }, { freq: 659 }, { freq: 784 }]
      : [{ freq: 220, type: "triangle" }, { freq: 160, type: "triangle" }]);
  }

  function swap(a, b) {
    const hold = state.order[a];
    state.order[a] = state.order[b];
    state.order[b] = hold;
  }

  function onTile(cell) {
    if (state.mode !== "play" || state.busy) return;
    if (state.locked[cell]) {
      if (state.selected != null) say("이미 맞춰진 자리야");
      return;
    }
    if (state.hint) {
      state.hint = false;
      say("");
    }
    if (state.selected == null) {
      state.selected = cell;
      say(cellName(cell) + "을 골랐어");
      tone([{ freq: 520 }]);
      render(cell);
      return;
    }
    if (state.selected === cell) {
      state.selected = null;
      say("다시 골라");
      render(cell);
      return;
    }
    const from = state.selected;
    swap(from, cell);
    const placedHome = state.order[cell] === cell;
    if (placedHome) {
      state.locked[cell] = true;
      if (state.order[from] === from) state.locked[from] = true;
      state.selected = null;
      say("제자리", "good");
      tone([{ freq: 660 }, { freq: 880 }]);
      render(cell);
      if (state.order.every(function (piece, index) { return piece === index; })) finish(true);
      return;
    }
    swap(from, cell);
    state.selected = null;
    state.lives -= 1;
    state.busy = true;
    say("거기가 아니야", "bad");
    tone([{ freq: 180, type: "triangle" }]);
    render(cell);
    const missed = board.children[cell];
    if (missed) missed.classList.add("is-miss");
    board.classList.add("is-wrong");
    window.setTimeout(function () {
      board.classList.remove("is-wrong");
      state.busy = false;
      if (state.lives <= 0) finish(false);
    }, reducedMotion() ? 0 : 180);
  }

  function onKey(event) {
    if (event.key === "Escape") {
      if (state.mode === "play") setMode("pause");
      else if (state.mode === "pause") setMode("play");
      return;
    }
    if (state.mode !== "play") return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -GRID, ArrowDown: GRID }[event.key];
    if (!step) return;
    const buttons = Array.from(board.children);
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    const col = current % GRID;
    if (event.key === "ArrowLeft" && col === 0) return;
    if (event.key === "ArrowRight" && col === GRID - 1) return;
    const next = current + step;
    if (next < 0 || next >= buttons.length) return;
    event.preventDefault();
    buttons[next].focus();
  }

  document.getElementById("start-game").addEventListener("click", begin);
  document.getElementById("pause-game").addEventListener("click", function () { setMode("pause"); });
  document.getElementById("resume-game").addEventListener("click", function () { setMode("play"); });
  document.getElementById("restart-from-pause").addEventListener("click", begin);
  document.getElementById("retry-game").addEventListener("click", begin);
  soundButton.addEventListener("click", function () {
    state.sound = !state.sound;
    soundButton.setAttribute("aria-pressed", state.sound ? "true" : "false");
    soundButton.textContent = state.sound ? "소리 켜짐" : "소리 꺼짐";
  });
  document.addEventListener("keydown", onKey);
  setMode("start");
})();
