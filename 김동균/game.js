(() => {
  "use strict";

  const LANES = 4;
  const KEYS = ["d", "f", "j", "k"];
  const KEY_LABELS = ["D", "F", "J", "K"];
  const FALL_MS = 1800;
  const PERFECT_MS = 70;
  const GOOD_MS = 140;
  const MAX_LIFE = 100;

  const el = {
    body: document.body,
    start: document.getElementById("screen-start"),
    play: document.getElementById("screen-play"),
    pause: document.getElementById("screen-pause"),
    result: document.getElementById("screen-result"),
    startBtn: document.getElementById("start-game"),
    pauseBtn: document.getElementById("pause-game"),
    resumeBtn: document.getElementById("resume-game"),
    restartPause: document.getElementById("restart-from-pause"),
    retryBtn: document.getElementById("retry-game"),
    soundToggle: document.getElementById("sound-toggle"),
    score: document.getElementById("score"),
    combo: document.getElementById("combo"),
    lifeFill: document.getElementById("life-fill"),
    lanes: document.getElementById("lanes"),
    keys: document.getElementById("keys"),
    hitLine: document.getElementById("hit-line"),
    judge: document.getElementById("judge-pop"),
    playfield: document.getElementById("playfield"),
    resultTitle: document.getElementById("result-title"),
    resultCopy: document.getElementById("result-copy"),
    resultKicker: document.getElementById("result-kicker"),
  };

  const state = {
    phase: "start",
    sound: true,
    score: 0,
    combo: 0,
    maxCombo: 0,
    life: MAX_LIFE,
    perfect: 0,
    good: 0,
    miss: 0,
    notes: [],
    chart: [],
    songStart: 0,
    pausedAt: 0,
    pausedAccum: 0,
    raf: 0,
    hitY: 0,
    laneH: 0,
    audio: null,
    master: null,
    musicTimer: 0,
    musicBeat: 0,
    musicPaused: false,
  };

  const NOTE_FREQS = [196.0, 246.94, 293.66, 349.23];
  const BPM = 120;
  const BEAT_SEC = 60 / BPM;

  function buildChart() {
    const notes = [];
    const beat = 60000 / BPM;
    let t = 2200;
    const pattern = [
      [0], [1], [2], [3],
      [0, 2], [1, 3],
      [0], [2], [1], [3],
      [0, 1], [2, 3],
      [0], [1], [2], [3],
      [0, 3], [1, 2],
      [0, 1, 2], [1, 2, 3],
      [0], [2], [1], [3],
      [0, 1, 2, 3],
      [0], [1], [2], [3],
      [0, 2], [1, 3],
      [0, 3], [1], [2],
      [0, 1], [2, 3],
      [0], [3],
    ];
    pattern.forEach((lanes, i) => {
      const gap = i > 14 && i < 22 ? beat * 0.5 : beat;
      t += gap;
      lanes.forEach((lane) => {
        notes.push({ time: t, lane, hit: false, missed: false, el: null });
      });
    });
    return notes;
  }

  function ensureAudio() {
    if (!state.audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      state.audio = new Ctx();
      state.master = state.audio.createGain();
      state.master.gain.value = 0.85;
      state.master.connect(state.audio.destination);
    }
    if (state.audio?.state === "suspended") state.audio.resume();
    applyMasterMute();
  }

  function applyMasterMute() {
    if (!state.master) return;
    state.master.gain.setTargetAtTime(state.sound ? 0.85 : 0.0001, state.audio.currentTime, 0.03);
  }

  function makePluckBuffer(ctx, freq, seconds, brightness) {
    const sr = ctx.sampleRate;
    const n = Math.max(2, Math.floor(sr / freq));
    const frames = Math.floor(sr * seconds);
    const buffer = ctx.createBuffer(1, frames, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * brightness;
    for (let i = n; i < frames; i++) {
      const avg = (data[i - n] + data[i - n + 1]) * 0.5;
      data[i] = avg * 0.996;
    }
    return buffer;
  }

  function playGuitarNote(lane, kind) {
    if (!state.audio || !state.master) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const freq = NOTE_FREQS[lane] || 262;
    const dur = kind === "miss" ? 0.18 : kind === "perfect" ? 0.7 : 0.5;

    if (kind === "miss") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 55;
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(state.master);
      osc.start(now);
      osc.stop(now + dur);
      return;
    }

    const bright = kind === "perfect" ? 0.95 : 0.75;
    const source = ctx.createBufferSource();
    source.buffer = makePluckBuffer(ctx, freq, dur + 0.15, bright);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = Math.min(4200, freq * 3.2);
    filter.Q.value = 1.1;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(freq * 8, now);
    tone.frequency.exponentialRampToValueAtTime(freq * 2.2, now + dur);
    const gain = ctx.createGain();
    const peak = kind === "perfect" ? 0.55 : 0.42;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    source.connect(filter);
    filter.connect(tone);
    tone.connect(gain);
    gain.connect(state.master);
    source.start(now);
    source.stop(now + dur + 0.05);
  }

  function playDrum(kind) {
    if (!state.audio || !state.master) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    if (kind === "kick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(state.master);
      osc.start(now);
      osc.stop(now + 0.2);
      return;
    }
    if (kind === "snare") {
      const frames = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      noise.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(state.master);
      noise.start(now);
      noise.stop(now + 0.09);
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 7800;
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(state.master);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  function playBass(freq) {
    if (!state.audio || !state.master) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = makePluckBuffer(ctx, freq, 0.35, 0.55);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(state.master);
    source.start(now);
    source.stop(now + 0.35);
  }

  function playLead(freq) {
    if (!state.audio || !state.master) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = makePluckBuffer(ctx, freq, 0.4, 0.85);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = Math.min(3800, freq * 2.8);
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(state.master);
    source.start(now);
    source.stop(now + 0.4);
  }

  function stopMusic() {
    if (state.musicTimer) {
      clearInterval(state.musicTimer);
      state.musicTimer = 0;
    }
    state.musicBeat = 0;
    state.musicPaused = false;
  }

  function startMusic() {
    stopMusic();
    ensureAudio();
    if (!state.audio) return;
    const bassLine = [98, 98, 110, 98, 87.3, 87.3, 110, 123.5];
    const leadLine = [392, 0, 349, 330, 294, 0, 330, 349, 392, 440, 392, 349, 330, 294, 262, 0];
    state.musicTimer = setInterval(() => {
      if (state.musicPaused || !state.sound) {
        state.musicBeat += 1;
        return;
      }
      const beat = state.musicBeat % 16;
      if (beat % 4 === 0) playDrum("kick");
      if (beat % 4 === 2) playDrum("snare");
      if (beat % 2 === 1) playDrum("hat");
      playBass(bassLine[beat % bassLine.length]);
      const lead = leadLine[beat % leadLine.length];
      if (lead) playLead(lead);
      state.musicBeat += 1;
    }, BEAT_SEC * 1000);
  }

  function playClick() {
    ensureAudio();
    if (!state.audio || !state.master) return;
    const ctx = state.audio;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(state.master);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  function setPhase(phase) {
    state.phase = phase;
    el.body.dataset.state = phase;
    el.start.hidden = phase !== "start";
    el.play.hidden = phase !== "play" && phase !== "pause";
    el.pause.hidden = phase !== "pause";
    el.result.hidden = phase !== "result";
  }

  function layoutKeys() {
    el.lanes.innerHTML = "";
    el.keys.innerHTML = "";
    for (let i = 0; i < LANES; i++) {
      const lane = document.createElement("div");
      lane.className = "lane";
      lane.dataset.lane = String(i);
      el.lanes.appendChild(lane);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key";
      btn.dataset.lane = String(i);
      btn.setAttribute("aria-label", `건반 ${i + 1}`);
      btn.innerHTML = `${i + 1}<span class="sub">${KEY_LABELS[i]}</span>`;
      el.keys.appendChild(btn);
    }
  }

  function measure() {
    const pf = el.playfield.getBoundingClientRect();
    const keysH = el.keys.getBoundingClientRect().height;
    state.laneH = Math.max(80, pf.height - keysH);
    state.hitY = state.laneH - 18;
    el.hitLine.style.top = `${state.hitY}px`;
  }

  function songTime() {
    return performance.now() - state.songStart - state.pausedAccum;
  }

  function updateHud() {
    el.score.textContent = String(state.score);
    el.combo.textContent = String(state.combo);
    el.lifeFill.style.transform = `scaleX(${Math.max(0, state.life) / MAX_LIFE})`;
  }

  function showJudge(kind, text) {
    el.judge.textContent = text;
    el.judge.className = `judge-pop show ${kind}`;
    clearTimeout(showJudge._t);
    showJudge._t = setTimeout(() => {
      el.judge.className = "judge-pop";
    }, 420);
  }

  function hitLane(lane) {
    if (state.phase !== "play") return;
    const btn = el.keys.querySelector(`[data-lane="${lane}"]`);
    if (btn) {
      btn.classList.add("pressed", "flash");
      setTimeout(() => btn.classList.remove("pressed", "flash"), 100);
    }

    const t = songTime();
    let best = null;
    let bestAbs = Infinity;
    for (const note of state.notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      const abs = Math.abs(note.time - t);
      if (abs < bestAbs) {
        bestAbs = abs;
        best = note;
      }
    }

    if (!best || bestAbs > GOOD_MS) {
      playGuitarNote(lane, "good");
      return;
    }

    best.hit = true;
    if (best.el) {
      best.el.remove();
      best.el = null;
    }

    if (bestAbs <= PERFECT_MS) {
      state.perfect += 1;
      state.combo += 1;
      state.score += 300 + state.combo * 10;
      state.life = Math.min(MAX_LIFE, state.life + 2);
      showJudge("perfect", "PERFECT");
      playGuitarNote(lane, "perfect");
    } else {
      state.good += 1;
      state.combo += 1;
      state.score += 150 + state.combo * 5;
      state.life = Math.min(MAX_LIFE, state.life + 1);
      showJudge("good", "GOOD");
      playGuitarNote(lane, "good");
    }
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    updateHud();
  }

  function missNote(note) {
    note.missed = true;
    if (note.el) {
      note.el.remove();
      note.el = null;
    }
    state.miss += 1;
    state.combo = 0;
    state.life -= 8;
    showJudge("miss", "MISS");
    playGuitarNote(note.lane, "miss");
    el.body.classList.add("shake");
    setTimeout(() => el.body.classList.remove("shake"), 180);
    updateHud();
    if (state.life <= 0) endSong(false);
  }

  function tick() {
    if (state.phase !== "play") return;
    const t = songTime();
    measure();

    for (const note of state.notes) {
      if (note.hit || note.missed) continue;
      const appear = note.time - FALL_MS;
      if (t < appear) continue;

      if (!note.el) {
        const node = document.createElement("div");
        node.className = `note${note.lane % 2 ? " lane-cool" : ""}`;
        const laneEl = el.lanes.children[note.lane];
        if (laneEl) laneEl.appendChild(node);
        note.el = node;
      }

      const progress = (t - appear) / FALL_MS;
      const y = progress * state.hitY;
      note.el.style.top = `${y}px`;

      if (t - note.time > GOOD_MS) missNote(note);
    }

    const allDone = state.notes.every((n) => n.hit || n.missed);
    if (allDone && t > state.notes[state.notes.length - 1].time + 600) {
      endSong(true);
      return;
    }

    state.raf = requestAnimationFrame(tick);
  }

  function resetRun() {
    cancelAnimationFrame(state.raf);
    state.notes.forEach((n) => n.el?.remove());
    state.chart = buildChart();
    state.notes = state.chart.map((n) => ({ ...n }));
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.life = MAX_LIFE;
    state.perfect = 0;
    state.good = 0;
    state.miss = 0;
    state.pausedAccum = 0;
    state.pausedAt = 0;
    updateHud();
    el.judge.className = "judge-pop";
  }

  function startSong() {
    ensureAudio();
    playClick();
    resetRun();
    layoutKeys();
    setPhase("play");
    startMusic();
    requestAnimationFrame(() => {
      measure();
      state.songStart = performance.now();
      state.raf = requestAnimationFrame(tick);
    });
  }

  function pauseSong() {
    if (state.phase !== "play") return;
    state.pausedAt = performance.now();
    cancelAnimationFrame(state.raf);
    state.musicPaused = true;
    setPhase("pause");
  }

  function resumeSong() {
    if (state.phase !== "pause") return;
    state.pausedAccum += performance.now() - state.pausedAt;
    state.musicPaused = false;
    ensureAudio();
    setPhase("play");
    state.raf = requestAnimationFrame(tick);
  }

  function endSong(cleared) {
    cancelAnimationFrame(state.raf);
    stopMusic();
    state.phase = "result";
    setPhase("result");
    const total = state.perfect + state.good + state.miss;
    const rate = total ? Math.round(((state.perfect + state.good) / total) * 100) : 0;
    if (!cleared) {
      el.resultKicker.textContent = "줄이 끊겼어";
      el.resultTitle.textContent = "텐션 오버";
    } else if (rate >= 90) {
      el.resultKicker.textContent = "앵콜!";
      el.resultTitle.textContent = "기타루맨!";
    } else {
      el.resultKicker.textContent = "공연 끝";
      el.resultTitle.textContent = "멋진 연주!";
    }
    el.resultCopy.textContent =
      `점수 ${state.score} · 최고 콤보 ${state.maxCombo} · Perfect ${state.perfect} · Good ${state.good} · Miss ${state.miss} (${rate}%)`;
  }

  function bindInput() {
    el.keys.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".key");
      if (!btn) return;
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      hitLane(Number(btn.dataset.lane));
    });

    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (key === "escape") {
        if (state.phase === "play") pauseSong();
        else if (state.phase === "pause") resumeSong();
        return;
      }
      if (key === " " || key === "enter") {
        if (state.phase === "start" || state.phase === "result") startSong();
        return;
      }
      const idx = KEYS.indexOf(key);
      if (idx >= 0) {
        e.preventDefault();
        hitLane(idx);
      }
    });

    window.addEventListener("blur", () => {
      if (state.phase === "play") pauseSong();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.phase === "play") pauseSong();
    });
    window.addEventListener("resize", () => {
      if (state.phase === "play" || state.phase === "pause") measure();
    });
  }

  el.startBtn.addEventListener("click", startSong);
  el.pauseBtn.addEventListener("click", pauseSong);
  el.resumeBtn.addEventListener("click", resumeSong);
  el.restartPause.addEventListener("click", startSong);
  el.retryBtn.addEventListener("click", startSong);
  el.soundToggle.addEventListener("click", () => {
    state.sound = !state.sound;
    el.soundToggle.textContent = state.sound ? "소리 켜짐" : "소리 꺼짐";
    el.soundToggle.setAttribute("aria-pressed", state.sound ? "true" : "false");
    ensureAudio();
    applyMasterMute();
  });

  layoutKeys();
  bindInput();
  setPhase("start");
})();
