(function () {
  "use strict";

  const rules = (window.GAME_CONFIG && window.GAME_CONFIG.rules) || {};
  const FOODS = [
    { id: "jelly", name: (rules.foods && rules.foods[0]) || "은하 젤리" },
    { id: "skewer", name: (rules.foods && rules.foods[1]) || "운석 꼬치" },
    { id: "soup", name: (rules.foods && rules.foods[2]) || "달빛 수프" }
  ];
  const STEPS = [
    ["별가루", "붓기", "굳히기"],
    ["꼬챙이", "꿰기", "굽기"],
    ["국물", "달조각", "젓기"]
  ];
  const CRAFT = {
    jelly: [
      ["................", "......yyyy......", ".....yooooy.....", "......yyyy......", "................", "................"],
      ["................", "................", "...ooppppPpo....", "..opPPPPPPPPpo..", "...opPPPPPpo....", "....oooooooo...."]
    ],
    skewer: [
      ["................", "................", ".......kk.......", ".......kk.......", ".......kk.......", "......oooo......"],
      ["................", ".....oRRRRo.....", "....oRRwwRo.....", "....oRRRRRo.....", ".......kk.......", "......oooo......"]
    ],
    soup: [
      ["................", "................", "...oooooooooo...", "...ommmmmmmmo...", "...ommmmmmmmo...", "....oooooooo...."],
      ["................", "...oooooooooo...", "..onBBBBBBBBno..", "..onBBBBBBBBno..", "...ommmmmmmmo...", "....oooooooo...."]
    ]
  };
  const ROUND_SECONDS = Number(rules.timeSec) > 0 ? Number(rules.timeSec) : 60;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const INK = {
    o: "#1b1830",
    g: "#62c25a",
    G: "#9be08a",
    d: "#3e8f45",
    w: "#f7f3ea",
    y: "#ffd56a",
    p: "#b56ad4",
    P: "#e4c2f6",
    r: "#8d8378",
    R: "#d5c4ae",
    k: "#5c5148",
    b: "#f2a0c8",
    B: "#e25b6a",
    n: "#f6f1e4",
    m: "#c4a882",
    s: "#9aabc8",
    S: "#d5deee",
    a: "#e7c15a"
  };

  const ALIEN = [
    "................",
    "....oooooooo....",
    "..ooGggggggGoo..",
    ".ogGggggggggGgo.",
    ".oggggggggggggo.",
    ".oggggggggggggo.",
    ".oggggggggggggo.",
    ".oggggggggggggo.",
    "..oggggggggggo..",
    "...oooooooooo...",
    "....oggggggo....",
    "...oggggggggo...",
    "..oggggggggggo..",
    "..ogggoooogggo..",
    "..oggo....oggo..",
    ".ooggo....oggoo.",
    ".oo..........oo.",
    "................"
  ];

  const SPRITES = {
    jelly: [
      "................",
      "......yyyy......",
      ".....yooooy.....",
      "....yoyyyyoy....",
      "...ooppppPpoo...",
      "..opPPPPPPPPpo..",
      "..opPPPwPPPPPpo.",
      "..opPPPPPPPPpo..",
      "...opPPPPPPpo...",
      "....opPPPPpo....",
      ".....oooooo.....",
      "......oooo......",
      "................",
      "................",
      "................",
      "................"
    ],
    skewer: [
      "................",
      "......oooo......",
      ".....oRRRRo.....",
      "....oRRwwRo.....",
      "....oRRRRRo.....",
      ".....ooRRo......",
      ".......kk.......",
      ".......kk.......",
      ".....oRRRRo.....",
      "....oRRRRRRo....",
      "....oRRkRRRo....",
      ".....oRRRRo.....",
      ".......kk.......",
      ".......kk.......",
      "......oooo......",
      "................"
    ],
    soup: [
      "................",
      ".....ww..ww.....",
      "....w......w....",
      "................",
      "...oooooooooo...",
      "..onBBBBBBBBno..",
      ".onBBBByBBBBBno.",
      ".onBBBBBBByBBBo.",
      "..onBBBBBBBBno..",
      "...ommmmmmmmo...",
      "...ommmmmmmmo...",
      "....oooooooo....",
      "................",
      "................",
      "................",
      "................"
    ],
    heart: ["..b.b..", ".bbbbb.", "bbbbbbb", ".bbbbb.", "..bbb..", "...b..."],
    saucer: [
      "..ssssssssssss..",
      ".sSSSSSSSSSSSSs.",
      "..ssssssssssss.."
    ]
  };

  const stage = document.getElementById("stage");
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const live = document.getElementById("live");
  const playHud = document.getElementById("play-hud");
  const hudTime = document.getElementById("hud-time");
  const hudScore = document.getElementById("hud-score");
  const hint = document.getElementById("hint");
  const panelStart = document.getElementById("panel-start");
  const panelPause = document.getElementById("panel-pause");
  const panelResult = document.getElementById("panel-result");
  const resultText = document.getElementById("result-text");
  const dock = document.getElementById("dock");
  const keypad = document.getElementById("keypad");
  const cookKeys = [0, 1, 2].map((i) => document.getElementById("cook-" + i));
  const soundBtn = document.getElementById("sound-btn");
  const safeProbe = document.getElementById("safe-probe");

  const stars = [];
  let seed = 42;
  for (let i = 0; i < 28; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    stars.push({
      x: (seed % 1000) / 1000,
      y: ((seed >> 3) % 1000) / 1000,
      big: seed % 6 === 0,
      pink: seed % 5 === 0
    });
  }

  let mode = "start";
  let score = 0;
  let mistakes = 0;
  let timeLeft = ROUND_SECONDS;
  let order = 0;
  let customerKind = 0;
  let mood = "wait";
  let madUntil = 0;
  let holdUntil = 0;
  let arrivedAt = performance.now();
  let hintOn = false;
  let hintAt = 0;
  let drag = null;
  let taken = -1;
  let ready = [false, false, false];
  let step = [0, 0, 0];
  let returns = [];
  let particles = [];
  let soundOn = true;
  let audioCtx = null;
  let lastTs = 0;
  let backdrop = null;
  let view = null;

  function say(text) {
    live.textContent = text;
  }

  function safeInsets() {
    const style = getComputedStyle(safeProbe);
    return {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0
    };
  }

  function mountDock() {
    const host = mode === "pause" ? panelPause.querySelector(".slip") : mode === "result" ? panelResult.querySelector(".slip") : panelStart;
    if (dock.parentElement !== host) host.appendChild(dock);
    dock.hidden = mode === "play";
  }

  function syncDom() {
    stage.dataset.mode = mode;
    panelStart.hidden = mode !== "start";
    panelPause.hidden = mode !== "pause";
    panelResult.hidden = mode !== "result";
    playHud.hidden = mode !== "play";
    keypad.hidden = mode !== "play";
    hint.hidden = !(mode === "play" && hintOn);
    mountDock();
    if (mode === "play") {
      hudTime.textContent = Math.ceil(timeLeft) + "초";
      hudScore.textContent = score + "개";
    }
  }

  function setMode(next) {
    mode = next;
    if (next !== "play") {
      drag = null;
      returns = [];
    }
    syncDom();
    backdrop = null;
  }

  function pickDifferent(max, prev) {
    let n = Math.floor(Math.random() * (max - 1));
    if (n >= prev) n += 1;
    return n;
  }

  function nextCustomer(first) {
    taken = -1;
    order = first ? Math.floor(Math.random() * FOODS.length) : pickDifferent(FOODS.length, order);
    customerKind = first ? Math.floor(Math.random() * 4) : pickDifferent(4, customerKind);
    mood = "wait";
    arrivedAt = performance.now();
    if (!first) say("주문은 " + FOODS[order].name);
  }

  function begin() {
    score = 0;
    mistakes = 0;
    timeLeft = ROUND_SECONDS;
    drag = null;
    ready = [false, false, false];
    step = [0, 0, 0];
    returns = [];
    particles = [];
    holdUntil = 0;
    madUntil = 0;
    hintOn = true;
    hintAt = performance.now();
    lastTs = 0;
    nextCustomer(true);
    setMode("play");
    say("영업 시작. 주문은 " + FOODS[order].name);
    unlockAudio();
  }

  function finishRound() {
    if (mode !== "play") return;
    const line = score + "개 건넸고, 실수는 " + mistakes + "번이야";
    resultText.textContent = line;
    setMode("result");
    say("영업 끝. " + line);
  }

  function unlockAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function chime(kind) {
    if (!soundOn || !audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = kind === "good" ? [523, 784] : kind === "bad" ? [180, 120] : kind === "cook" ? [440, 660] : [360];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = kind === "bad" ? "sawtooth" : "square";
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + i * 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + 0.16 + i * 0.08);
    });
  }

  function measure() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const safe = safeInsets();
    const reservedTop = mode === "start" ? panelStart.getBoundingClientRect().height + 18 + safe.top : 58 + safe.top;
    const columnW = Math.min(w - safe.left - safe.right - 8, 440);
    const left = safe.left + (w - safe.left - safe.right - columnW) / 2;
    const keyH = mode === "play" ? 64 : 0;
    let plate = Math.max(72, Math.min(104, Math.floor((columnW - 28) / 3)));
    let counterTop = h - safe.bottom - keyH - plate - 10;
    if (counterTop - reservedTop < 96) {
      plate = Math.max(64, plate - 16);
      counterTop = h - safe.bottom - keyH - plate - 8;
    }
    const gap = Math.max(8, Math.floor((columnW - plate * 3) / 4));
    const rowW = plate * 3 + gap * 2;
    const rowX = left + (columnW - rowW) / 2;
    const plates = [0, 1, 2].map((i) => ({
      x: rowX + i * (plate + gap),
      y: counterTop + 14,
      w: plate,
      h: plate,
      index: i
    }));
    const room = Math.max(72, counterTop - reservedTop + 12);
    const alienScale = Math.max(4, Math.min(9, Math.floor(Math.min(room / 18, columnW / 22))));
    const aw = 16 * alienScale;
    const ah = 18 * alienScale;
    const alien = {
      x: left + (columnW - aw) / 2,
      y: Math.max(reservedTop, counterTop - ah + alienScale * 2),
      s: alienScale,
      w: aw,
      h: ah
    };
    const win = {
      x: 16 + safe.left,
      y: 12 + safe.top,
      w: Math.max(40, w - 32 - safe.left - safe.right),
      h: Math.max(40, counterTop - 22 - safe.top)
    };
    return { w, h, safe, columnW, left, plate, counterTop, plates, alien, win };
  }

  function foodPixel(plate) {
    return Math.max(3, Math.floor((plate.w - 18) / 16));
  }

  function foodRect(plate) {
    const s = foodPixel(plate);
    const size = 16 * s;
    return {
      s,
      w: size,
      h: size,
      x: plate.x + (plate.w - size) / 2,
      y: plate.y + (plate.h - size) / 2
    };
  }

  function ghostAt(pointer, rect) {
    return {
      x: pointer.x - rect.w / 2,
      y: pointer.y - rect.h - 34,
      w: rect.w,
      h: rect.h,
      s: rect.s
    };
  }

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      backdrop = null;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function blit(rows, x, y, s) {
    for (let ry = 0; ry < rows.length; ry++) {
      const row = rows[ry];
      for (let rx = 0; rx < row.length; rx++) {
        const color = INK[row[rx]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x + rx * s), Math.round(y + ry * s), s, s);
      }
    }
  }

  function chunkEllipse(cx, cy, rx, ry, fill, outline) {
    const step = 3;
    for (let y = -ry - 3; y <= ry + 3; y += step) {
      for (let x = -rx - 3; x <= rx + 3; x += step) {
        const outer = (x * x) / ((rx + 3) * (rx + 3)) + (y * y) / ((ry + 3) * (ry + 3));
        const inner = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (outer > 1) continue;
        ctx.fillStyle = inner <= 1 ? fill : outline;
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), step, step);
      }
    }
  }

  function paintSpace(g, win) {
    g.fillStyle = "#1a1636";
    g.fillRect(win.x, win.y, win.w, win.h);
    const clouds = [
      [0.08, 0.2, 0.42, 0.28, "#4a3d78"],
      [0.55, 0.08, 0.38, 0.22, "#5c4c86"],
      [0.2, 0.62, 0.5, 0.24, "#3d355f"],
      [0.62, 0.58, 0.3, 0.2, "#6a558f"]
    ];
    clouds.forEach(([px, py, pw, ph, color]) => {
      g.fillStyle = color;
      g.fillRect(win.x + win.w * px, win.y + win.h * py, win.w * pw, win.h * ph);
    });
    const step = 3;
    function planet(px, py, r, light, mid, dark) {
      const cx = win.x + win.w * px;
      const cy = win.y + win.h * py;
      for (let y = -r; y <= r; y += step) {
        for (let x = -r; x <= r; x += step) {
          if (x * x + y * y > r * r) continue;
          const edge = x * x + y * y > (r - step * 2) * (r - step * 2);
          g.fillStyle = edge ? "#1b1830" : x < -r * 0.18 ? light : x > r * 0.32 ? dark : mid;
          g.fillRect(cx + x, cy + y, step, step);
        }
      }
    }
    planet(0.18, 0.22, Math.min(win.w, win.h) * 0.28, "#f7c3dc", "#f2a0c8", "#8d5d92");
    planet(0.78, 0.7, Math.min(win.w, win.h) * 0.16, "#efe6ff", "#c9b6f2", "#6d5d96");
    stars.forEach((star) => {
      const x = win.x + 8 + star.x * (win.w - 16);
      const y = win.y + 8 + star.y * (win.h - 16);
      g.fillStyle = star.pink ? "#f2a0c8" : "#f6f1e4";
      g.fillRect(x, y, step, step);
      if (star.big) {
        g.fillRect(x - step, y, step, step);
        g.fillRect(x + step, y, step, step);
        g.fillRect(x, y - step, step, step);
        g.fillRect(x, y + step, step, step);
      }
    });
    g.fillStyle = "#1b1830";
    g.fillRect(win.x - 6, win.y - 6, win.w + 12, 6);
    g.fillRect(win.x - 6, win.y + win.h, win.w + 12, 6);
    g.fillRect(win.x - 6, win.y, 6, win.h);
    g.fillRect(win.x + win.w, win.y, 6, win.h);
    g.fillStyle = "#d7deee";
    [[win.x + 8, win.y + 8], [win.x + win.w - 14, win.y + 8], [win.x + 8, win.y + win.h - 14], [win.x + win.w - 14, win.y + win.h - 14]].forEach(([x, y]) => {
      g.fillRect(x, y, 6, 6);
    });
  }

  function ensureBackdrop() {
    const key = view.w + "x" + view.h + ":" + Math.round(view.counterTop) + ":" + mode;
    if (backdrop && backdrop.key === key) return;
    const off = document.createElement("canvas");
    off.width = view.w;
    off.height = view.h;
    const g = off.getContext("2d");
    g.fillStyle = "#3a315c";
    g.fillRect(0, 0, view.w, view.h);
    g.fillStyle = "#31284f";
    for (let x = 0; x < view.w; x += 28) g.fillRect(x, 0, 4, view.counterTop);
    paintSpace(g, view.win);
    backdrop = { key, canvas: off };
  }

  function drawAlien(ts) {
    const alien = view.alien;
    const hop = reduceMotion ? 0 : Math.sin(Math.min(1, (ts - arrivedAt) / 240) * Math.PI) * 8;
    const bob = reduceMotion || mode === "pause" ? 0 : Math.sin(ts / 320) * 1.5;
    const shake = mood === "mad" && ts < madUntil ? Math.sin(ts / 18) * 3 : 0;
    const x = alien.x + shake;
    const y = alien.y - hop + bob;
    if (customerKind === 1) {
      blit(["...a....a...", "....o....o.."], x + alien.s * 2, y - alien.s * 2, alien.s);
    }
    blit(ALIEN, x, y, alien.s);
    if (customerKind === 2) blit(SPRITES.saucer, x, y + alien.s * 8, alien.s);
    drawFace(x, y, alien.s);
    if (customerKind === 3) blit(SPRITES.heart, x + alien.s * 12, y + alien.s * 11, Math.max(2, alien.s * 0.45));
    if (mode === "start") {
      ctx.fillStyle = "#9be08a";
      ctx.fillRect(x + alien.s * 14, y + alien.s * 6, alien.s, alien.s * 4);
      ctx.fillStyle = "#1b1830";
      ctx.fillRect(x + alien.s * 15, y + alien.s * 6, alien.s, alien.s);
    }
    return { x, y, w: alien.w, h: alien.h };
  }

  function drawFace(x, y, s) {
    const eyes = mood === "happy"
      ? [[4, 5], [5, 4], [6, 5], [9, 5], [10, 4], [11, 5]]
      : mood === "mad"
        ? [[4, 4], [5, 5], [6, 6], [9, 6], [10, 5], [11, 4]]
        : [[4, 4], [5, 4], [4, 5], [5, 5], [4, 6], [10, 4], [11, 4], [10, 5], [11, 5], [11, 6]];
    eyes.forEach(([cx, cy]) => {
      ctx.fillStyle = "#1b1830";
      ctx.fillRect(x + cx * s, y + cy * s, s, s);
    });
    if (mood === "wait") {
      ctx.fillStyle = "#f7f3ea";
      ctx.fillRect(x + 5 * s, y + 4 * s, s, s);
      ctx.fillRect(x + 11 * s, y + 4 * s, s, s);
    }
    const mouth = mood === "mad" ? [[6, 8], [7, 7], [8, 7], [9, 8]] : mood === "happy" ? [[5, 7], [6, 8], [7, 8], [8, 8], [9, 8], [10, 7]] : [[6, 7], [7, 8], [8, 8], [9, 7]];
    mouth.forEach(([cx, cy]) => {
      ctx.fillStyle = "#1b1830";
      ctx.fillRect(x + cx * s, y + cy * s, s, s);
    });
    if (mood === "happy" || customerKind === 3) {
      ctx.fillStyle = "#f2a0c8";
      ctx.fillRect(x + 3 * s, y + 6 * s, s, s);
      ctx.fillRect(x + 12 * s, y + 6 * s, s, s);
    }
  }

  function drawBubble(alienBox, near, match) {
    const iconScale = Math.max(2, Math.round(view.alien.s * 0.42));
    const icon = 16 * iconScale;
    ctx.font = '700 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    const name = FOODS[order].name;
    const textW = Math.ceil(ctx.measureText(name).width);
    const bw = 12 + icon + 8 + textW + 8;
    const bh = Math.max(icon + 12, 40);
    let bx = alienBox.x + alienBox.w - view.alien.s * 2;
    let by = alienBox.y + view.alien.s;
    let tail = "left";
    if (bx + bw > view.w - 10) {
      bx = alienBox.x - bw + view.alien.s * 2;
      tail = "right";
    }
    if (bx < 8) {
      bx = Math.max(8, alienBox.x + (alienBox.w - bw) / 2);
      by = Math.max(view.safe.top + 52, alienBox.y - bh - 8);
      tail = "down";
    }
    const border = near ? (match ? "#6fcb62" : "#e25b6a") : "#1b1830";
    const fill = near ? (match ? "#d8f5c8" : "#f8d0d6") : "#f6f1e4";
    ctx.fillStyle = border;
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = fill;
    ctx.fillRect(bx, by, bw, bh);
    if (tail === "left") {
      ctx.fillStyle = border;
      ctx.fillRect(bx - 8, by + 14, 8, 8);
    } else if (tail === "right") {
      ctx.fillStyle = border;
      ctx.fillRect(bx + bw, by + 14, 8, 8);
    } else {
      ctx.fillStyle = border;
      ctx.fillRect(bx + bw / 2 - 4, by + bh, 8, 8);
    }
    blit(SPRITES[FOODS[order].id], bx + 6, by + (bh - icon) / 2, iconScale);
    ctx.fillStyle = "#241c3e";
    ctx.textBaseline = "middle";
    ctx.fillText(name, bx + 10 + icon, by + bh / 2);
    return { x: bx - 10, y: by - 8, w: bw + 20, h: bh + 16 };
  }

  function drawCounter() {
    const y = view.counterTop;
    ctx.fillStyle = "#c4a882";
    ctx.fillRect(0, y + 16, view.w, view.h - y);
    ctx.fillStyle = "#e6d3b0";
    ctx.fillRect(0, y, view.w, 20);
    ctx.fillStyle = "#1b1830";
    ctx.fillRect(0, y, view.w, 3);
    ctx.fillStyle = "#a88b66";
    ctx.fillRect(0, y + 16, view.w, 4);
    ctx.fillStyle = "#8d704c";
    for (let x = 18; x < view.w; x += 36) ctx.fillRect(x, y + 28, 8, 5);
  }

  function drawPlate(plate, empty) {
    const cx = plate.x + plate.w / 2;
    const cy = plate.y + plate.h / 2 + 4;
    chunkEllipse(cx, cy, plate.w * 0.42, plate.h * 0.28, empty ? "#efe4cf" : "#f6f1e4", "#1b1830");
    ctx.fillStyle = "rgba(27,24,48,0.18)";
    ctx.fillRect(cx - plate.w * 0.16, cy + plate.h * 0.08, plate.w * 0.32, 3);
  }

  function drawFood(id, x, y, s) {
    blit(SPRITES[id], x, y, s);
  }

  function drawCraft(id, stage, x, y, s) {
    const rows = CRAFT[id][stage - 1];
    blit(rows, x, y + (16 - rows.length) * s, s);
  }

  function drawPips(plate, count, done) {
    const size = 8;
    const gap = 4;
    let x = plate.x + (plate.w - (size * 3 + gap * 2)) / 2;
    const y = Math.max(4, plate.y - 14);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#1b1830";
      ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
      ctx.fillStyle = done || i < count ? "#6fcb62" : "#f6f1e4";
      ctx.fillRect(x, y, size, size);
      x += size + gap;
    }
  }

  function drawSteam(plate, ts) {
    const cx = plate.x + plate.w / 2;
    const bob = reduceMotion ? 0 : Math.sin(ts / 70) * 3;
    ctx.fillStyle = "#ffd56a";
    ctx.fillRect(cx - 10, plate.y + 16 + bob, 5, 5);
    ctx.fillRect(cx, plate.y + 8 - bob, 5, 5);
    ctx.fillRect(cx + 10, plate.y + 14, 5, 5);
    ctx.fillStyle = "#f6f1e4";
    ctx.fillRect(cx - 2, plate.y + 4 - bob, 4, 4);
  }

  function placeKeys() {
    if (mode !== "play" || !view) return;
    view.plates.forEach((plate, i) => {
      const btn = cookKeys[i];
      btn.style.left = Math.round(plate.x) + "px";
      btn.style.top = Math.round(plate.y + plate.h + 6) + "px";
      btn.style.width = Math.round(plate.w) + "px";
      btn.style.height = "54px";
      const making = step[i] > 0 && !ready[i];
      btn.classList.toggle("is-cooking", making);
      btn.classList.toggle("is-ready", ready[i]);
      btn.setAttribute("aria-pressed", ready[i] ? "true" : "false");
      const label = ready[i] ? FOODS[i].name : STEPS[i][Math.min(step[i], 2)];
      btn.querySelector("small").textContent = label;
      btn.setAttribute("aria-label", (i + 1) + "번 " + FOODS[i].name + " " + label);
    });
  }

  function cook(index) {
    if (mode !== "play" || index < 0 || index > 2) return;
    if (ready[index]) return;
    if (drag && drag.index === index) return;
    unlockAudio();
    step[index] += 1;
    hintOn = false;
    hint.hidden = true;
    if (step[index] >= 3) {
      ready[index] = true;
      chime("cook");
      say(FOODS[index].name + " 완성");
    } else {
      chime("pick");
      say(FOODS[index].name + " " + STEPS[index][step[index] - 1]);
    }
  }

  function drawHands() {
    const leftRoom = view.plates[0].x;
    const rightRoom = view.w - (view.plates[2].x + view.plates[2].w);
    if (mode === "play" || (leftRoom < 64 && rightRoom < 64)) return;
    const y = view.h - view.safe.bottom - 28;
    function hand(x, flip) {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = "#f0c7a2";
      ctx.fillRect(0, 0, 34, 16);
      ctx.fillRect(6, -10, 10, 12);
      ctx.fillRect(18, -8, 10, 10);
      ctx.fillStyle = "#1b1830";
      ctx.fillRect(0, 14, 34, 3);
      ctx.fillStyle = "#6f8fbe";
      ctx.fillRect(0, 10, 34, 6);
      ctx.restore();
    }
    if (leftRoom >= 64) hand(view.safe.left + 16, false);
    if (rightRoom >= 64) hand(view.w - view.safe.right - 16, true);
  }

  function drawParticles(ts) {
    particles = particles.filter((p) => ts < p.until);
    particles.forEach((p) => {
      const t = (p.until - ts) / p.life;
      const rise = reduceMotion ? 0 : (1 - t) * 28;
      blit(SPRITES.heart, p.x, p.y - rise, 2);
    });
  }

  function returningPos(item, ts) {
    const t = Math.min(1, (ts - item.t0) / item.dur);
    const e = 1 - Math.pow(1 - t, 3);
    return { x: item.x + (item.hx - item.x) * e, y: item.y + (item.hy - item.y) * e, done: t >= 1 };
  }

  function draw(ts) {
    resizeCanvas();
    view = measure();
    ensureBackdrop();
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.drawImage(backdrop.canvas, 0, 0);
    const alienBox = drawAlien(ts);
    let bubble = null;
    if (mode === "play" || mode === "pause" || mode === "result") {
      const near = drag ? overlaps(drag, expandedAlien(alienBox)) : false;
      const match = drag ? drag.index === order : false;
      bubble = drawBubble(alienBox, near, match);
      view.drop = bubble
        ? union(expandedAlien(alienBox), bubble)
        : expandedAlien(alienBox);
    } else {
      view.drop = expandedAlien(alienBox);
    }
    drawCounter();
    const back = {};
    returns.forEach((item) => {
      const pos = returningPos(item, ts);
      if (!pos.done) back[item.index] = pos;
    });
    returns = returns.filter((item) => !returningPos(item, ts).done);
    view.plates.forEach((plate) => {
      const progress = step[plate.index];
      const crafting = mode === "play" && progress > 0 && !ready[plate.index];
      const hasFood = mode === "start" || (ready[plate.index] && taken !== plate.index);
      const away = (drag && drag.index === plate.index) || back[plate.index];
      drawPlate(plate, (!hasFood && !crafting) || away);
      if (back[plate.index]) {
        const rect = foodRect(plate);
        drawFood(FOODS[plate.index].id, back[plate.index].x, back[plate.index].y, rect.s);
      } else if (crafting && !away) {
        const rect = foodRect(plate);
        drawCraft(FOODS[plate.index].id, progress, rect.x, rect.y, rect.s);
        drawSteam(plate, ts);
      } else if (hasFood && !away) {
        const rect = foodRect(plate);
        drawFood(FOODS[plate.index].id, rect.x, rect.y, rect.s);
      }
      if (mode === "play") drawPips(plate, progress, ready[plate.index]);
    });
    placeKeys();
    if (drag) drawFood(FOODS[drag.index].id, drag.x, drag.y, drag.s);
    drawHands();
    drawParticles(ts);
    if (mode === "pause" || mode === "result") {
      ctx.fillStyle = "rgba(18,12,36,0.28)";
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  function expandedAlien(box) {
    return { x: box.x - 12, y: box.y - 12, w: box.w + 24, h: box.h + 18 };
  }

  function union(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.clientWidth / rect.width),
      y: (event.clientY - rect.top) * (canvas.clientHeight / rect.height)
    };
  }

  function plateAt(x, y) {
    if (!view) return -1;
    for (let i = view.plates.length - 1; i >= 0; i--) {
      const plate = view.plates[i];
      if (x >= plate.x - 8 && y >= plate.y - 8 && x <= plate.x + plate.w + 8 && y <= plate.y + plate.h + 8) return i;
    }
    return -1;
  }

  function sendBack(index, x, y) {
    const home = foodRect(view.plates[index]);
    returns = returns.filter((item) => item.index !== index);
    returns.push({ index, x, y, hx: home.x, hy: home.y, t0: performance.now(), dur: reduceMotion ? 1 : 170 });
  }

  function burstHearts(origin) {
    const x = origin ? origin.x : view.alien.x + view.alien.w * 0.4;
    const y = origin ? origin.y : view.alien.y + 8;
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: x + i * 14,
        y: y,
        until: performance.now() + 520 + i * 40,
        life: 520
      });
    }
  }

  function give(index, x, y) {
    if (mode !== "play" || holdUntil) {
      if (x != null) sendBack(index, x, y);
      return;
    }
    if (index === order) {
      score += 1;
      taken = index;
      ready[index] = false;
      step[index] = 0;
      mood = "happy";
      holdUntil = performance.now() + (reduceMotion ? 180 : 460);
      burstHearts(view.alien);
      chime("good");
      say(FOODS[index].name + " 제공. " + score + "개");
      syncDom();
    } else {
      mistakes += 1;
      mood = "mad";
      madUntil = performance.now() + 460;
      chime("bad");
      say("다른 음식이에요. 주문은 " + FOODS[order].name);
      if (x != null) sendBack(index, x, y);
      syncDom();
    }
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (document.hidden) dt = 0;
    if (mode === "play") {
      timeLeft -= dt;
      if (hintOn && ts - hintAt > 3200) {
        hintOn = false;
        hint.hidden = true;
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        finishRound();
      } else if (holdUntil && ts >= holdUntil) {
        holdUntil = 0;
        nextCustomer(false);
      }
    }
    draw(ts);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (mode !== "play" || holdUntil || drag) return;
    if (event.pointerType !== "mouse") event.preventDefault();
    const pos = pointerPos(event);
    const index = plateAt(pos.x, pos.y);
    if (index < 0 || !ready[index] || index === taken || returns.some((item) => item.index === index)) return;
    unlockAudio();
    hintOn = false;
    hint.hidden = true;
    const rect = foodRect(view.plates[index]);
    const ghost = ghostAt(pos, rect);
    drag = { index, pointerId: event.pointerId, x: ghost.x, y: ghost.y, w: ghost.w, h: ghost.h, s: rect.s };
    canvas.setPointerCapture(event.pointerId);
    chime("pick");
  }, { passive: false });

  canvas.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const pos = pointerPos(event);
    const rect = foodRect(view.plates[drag.index]);
    const ghost = ghostAt(pos, rect);
    drag.x = ghost.x;
    drag.y = ghost.y;
  });

  function releaseDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    drag = null;
    if (view && view.drop && overlaps(current, view.drop)) give(current.index, current.x, current.y);
    else sendBack(current.index, current.x, current.y);
  }

  canvas.addEventListener("pointerup", releaseDrag);
  canvas.addEventListener("pointercancel", releaseDrag);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.getElementById("start-btn").addEventListener("click", begin);
  document.getElementById("again-btn").addEventListener("click", begin);
  document.getElementById("pause-btn").addEventListener("click", () => {
    if (mode === "play") setMode("pause");
  });
  document.getElementById("resume-btn").addEventListener("click", () => {
    if (mode === "pause") {
      lastTs = 0;
      setMode("play");
    }
  });
  document.getElementById("restart-btn").addEventListener("click", begin);
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "소리 끄기" : "소리 켜기";
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    if (soundOn) unlockAudio();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (mode === "play") setMode("pause");
      else if (mode === "pause") {
        lastTs = 0;
        setMode("play");
      }
      return;
    }
    const fromCode = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[event.code];
    const cookIndex = fromCode !== undefined ? fromCode : { "1": 0, "2": 1, "3": 2 }[event.key];
    if (mode === "play" && cookIndex !== undefined && !event.repeat) {
      event.preventDefault();
      cook(cookIndex);
      return;
    }
    if (event.target.closest("button, dialog")) return;
    if ((mode === "start" || mode === "result") && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      begin();
    }
  });

  cookKeys.forEach((btn, index) => {
    btn.querySelector("small").textContent = FOODS[index].name;
    btn.setAttribute("aria-label", (index + 1) + "번 " + FOODS[index].name + " 만들기");
    btn.addEventListener("click", () => cook(index));
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "play") setMode("pause");
  });

  new ResizeObserver(() => {
    backdrop = null;
  }).observe(stage);

  customerKind = 0;
  mood = "wait";
  syncDom();
  requestAnimationFrame(frame);
})();
