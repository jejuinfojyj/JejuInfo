(function () {
  "use strict";

  const KIND = { attack: "공격", defense: "방어", heal: "회복", special: "특수" };
  const CARDS = {
    slash: { key: "slash", name: "그림자 베기", kind: "attack", min: 3, max: 7, power: 2, art: "assets/art-slash.jpg", blurb: "이기면 차이+2 피해" },
    guard: { key: "guard", name: "코트 가드", kind: "defense", min: 4, max: 7, art: "assets/art-guard.jpg", blurb: "막으면 공격 무효" },
    page: { key: "page", name: "남은 페이지", kind: "heal", min: 2, max: 5, power: 4, art: "assets/art-page.jpg", blurb: "체력 4. 지면 피격" },
    aim: { key: "aim", name: "정확한 일격", kind: "attack", min: 5, max: 6, power: 3, art: "assets/art-aim.jpg", blurb: "눈 5–6, 차이+3" },
    shelf: { key: "shelf", name: "서고의 방패", kind: "defense", min: 5, max: 8, healOnWin: 2, art: "assets/art-shield.jpg", blurb: "막으면 체력 2 회복" },
    sigil: { key: "sigil", name: "문양 각인", kind: "special", min: 2, max: 6, bonus: 3, power: 2, art: "assets/art-sigil.jpg", blurb: "굴림 +3, 이기면 2 피해" },
    twin: { key: "twin", name: "두 번 굴림", kind: "special", min: 2, max: 6, twin: true, art: "assets/art-dice.jpg", blurb: "높은 눈으로 차이 피해" },
    absorb: { key: "absorb", name: "피의 흡수", kind: "special", min: 2, max: 7, absorb: true, art: "assets/art-absorb.jpg", blurb: "이기면 차이만큼 회복" },
    pact: { key: "pact", name: "피의 계약", kind: "attack", min: 1, max: 9, power: 4, self: 2, art: "assets/art-pact.jpg", blurb: "차이+4, 낼 때 체력 2" }
  };
  const REWARDS = [
    ["aim", "shelf", "sigil"],
    ["twin", "absorb", "pact"],
    ["aim", "shelf", "twin"]
  ];
  const ENEMIES = [
    {
      name: "잉크 서기",
      art: "assets/enemy-scribe.png",
      hp: 18,
      intents: [
        { name: "깃펜 공격", kind: "attack", min: 2, max: 5, power: 0 },
        { name: "깃펜 공격", kind: "attack", min: 3, max: 6, power: 1 },
        { name: "먹물 수비", kind: "guard", min: 2, max: 5, power: 0 }
      ]
    },
    {
      name: "사슬 걸린 책",
      art: "assets/enemy-chain.png",
      hp: 26,
      intents: [
        { name: "사슬 휘두르기", kind: "attack", min: 3, max: 7, power: 1 },
        { name: "무거운 표지", kind: "attack", min: 2, max: 9, power: 2 },
        { name: "쇠사슬 수비", kind: "guard", min: 4, max: 7, power: 0 }
      ]
    },
    {
      name: "서고의 주인",
      art: "assets/enemy-keeper.png",
      hp: 30,
      intents: [
        { name: "금박 베기", kind: "attack", min: 3, max: 7, power: 1 },
        { name: "페이지 봉인", kind: "attack", min: 3, max: 6, power: 1, seal: 2 },
        { name: "장정 수비", kind: "guard", min: 3, max: 7, power: 0 },
        { name: "압도", kind: "attack", min: 4, max: 8, power: 1 }
      ]
    }
  ];

  function clampDie(min, max) {
    min = Math.round(min);
    max = Math.round(max);
    if (max < min) max = min;
    return [min, max];
  }

  function rollDie(min, max, rng) {
    const pair = clampDie(min, max);
    return pair[0] + Math.floor(rng() * (pair[1] - pair[0] + 1));
  }

  function resolveClash(card, playerRoll, intent, enemyRoll) {
    const enemyAttacks = intent.kind === "attack";
    const result = {
      playerRoll: playerRoll,
      enemyRoll: enemyRoll,
      playerDamage: card.self || 0,
      enemyDamage: 0,
      heal: card.kind === "heal" ? card.power : 0,
      nullified: false,
      sealPlayer: 0,
      line: ""
    };
    const win = playerRoll > enemyRoll;
    const tie = playerRoll === enemyRoll;
    const lose = playerRoll < enemyRoll;

    if (card.kind === "attack" || card.twin) {
      if (win) {
        result.enemyDamage += (playerRoll - enemyRoll) + (card.power || 0);
        result.line = card.twin ? "높은 눈이 적중했다" : "공격이 적중했다";
      } else if (lose && enemyAttacks) {
        result.playerDamage += (enemyRoll - playerRoll) + (intent.power || 0);
        result.line = card.twin ? "두 번의 굴림도 밀렸다" : "공격이 밀렸다";
      } else if (tie && enemyAttacks) {
        result.line = "칼이 맞부딪쳤다";
      } else {
        result.line = "수비를 넘지 못했다";
      }
    } else if (card.kind === "defense") {
      if ((win || tie) && enemyAttacks) {
        result.nullified = true;
        result.heal += card.healOnWin || 0;
        result.line = card.healOnWin ? "막고 숨을 골랐다" : "공격을 무효로 막았다";
      } else if (lose && enemyAttacks) {
        result.playerDamage += (enemyRoll - playerRoll) + (intent.power || 0);
        result.line = "막다 밀렸다";
      } else {
        result.line = "적은 공격하지 않았다";
      }
    } else if (card.kind === "heal") {
      if (lose && enemyAttacks) {
        result.playerDamage += (enemyRoll - playerRoll) + (intent.power || 0);
        result.line = "회복했지만 공격을 받았다";
      } else if (enemyAttacks) {
        result.nullified = true;
        result.line = "페이지가 공격을 덮었다";
      } else {
        result.line = "체력을 회복했다";
      }
    } else if (card.absorb) {
      if (win) {
        result.heal += playerRoll - enemyRoll;
        result.line = "차이를 삼켜 회복했다";
      } else if (lose && enemyAttacks) {
        result.playerDamage += (enemyRoll - playerRoll) + (intent.power || 0);
        result.line = "흡수에 실패했다";
      } else {
        result.line = "흡수할 차이가 없다";
      }
    } else if (win) {
      result.enemyDamage += card.power || 0;
      result.line = "문양이 적을 눌렀다";
    } else if (lose && enemyAttacks) {
      result.playerDamage += (enemyRoll - playerRoll) + (intent.power || 0);
      result.line = "문양이 깨졌다";
    } else {
      result.line = "문양이 스쳤다";
    }

    if (lose && enemyAttacks && intent.seal) result.sealPlayer = intent.seal;
    return result;
  }

  function shownRange(card, mark) {
    const pair = clampDie(card.min, card.max - (mark || 0));
    const bonus = card.bonus || 0;
    return (pair[0] + bonus) + "–" + (pair[1] + bonus);
  }

  if (typeof module !== "undefined" && module.exports && typeof window === "undefined") {
    module.exports = { CARDS, ENEMIES, REWARDS, resolveClash, rollDie, shownRange, clampDie };
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const state = {
    screen: "start",
    book: [],
    fight: 0,
    player: { hp: 32, max: 32 },
    enemy: null,
    intentIndex: 0,
    draw: [],
    discard: [],
    hand: [],
    mark: 0,
    busy: false,
    sound: true,
    uid: 1,
    audio: null
  };

  function copyCard(key) {
    return Object.assign({ uid: state.uid++ }, CARDS[key]);
  }

  function shuffle(list) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = next[i];
      next[i] = next[j];
      next[j] = swap;
    }
    return next;
  }

  function wait(ms) {
    if (reduceMotion || document.hidden) return Promise.resolve();
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function tone(freq, dur, type, gain) {
    if (!state.sound) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!state.audio) state.audio = new AudioCtx();
    if (state.audio.state === "suspended") state.audio.resume();
    const osc = state.audio.createOscillator();
    const amp = state.audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, state.audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, state.audio.currentTime + dur);
    osc.connect(amp).connect(state.audio.destination);
    osc.start();
    osc.stop(state.audio.currentTime + dur);
  }

  function setScreen(name) {
    state.screen = name;
    document.body.dataset.screen = name;
    for (const id of ["screen-start", "screen-play", "screen-reward", "screen-result", "screen-pause"]) {
      $(id).hidden = id !== "screen-" + name;
    }
  }

  function currentIntent() {
    const enemy = state.enemy;
    return enemy.intents[state.intentIndex % enemy.intents.length];
  }

  function paintBars() {
    const enemyRatio = Math.max(0, state.enemy.hp) / state.enemy.max;
    const playerRatio = Math.max(0, state.player.hp) / state.player.max;
    $("enemy-hp-bar").style.width = (enemyRatio * 100) + "%";
    $("player-hp-bar").style.width = (playerRatio * 100) + "%";
    $("enemy-hp-text").textContent = "적 체력 " + Math.max(0, state.enemy.hp) + " / " + state.enemy.max;
    $("player-hp-text").textContent = "내 체력 " + Math.max(0, state.player.hp) + " / " + state.player.max;
    $("book-count").textContent = "마법책 " + state.book.length + "장";
    const mark = $("mark");
    if (state.mark > 0) {
      mark.hidden = false;
      mark.textContent = "다음 카드의 최대 눈이 " + state.mark + " 줄어 있다";
    } else mark.hidden = true;
  }

  function paintIntent() {
    const intent = currentIntent();
    const box = $("intent");
    box.className = "intent " + intent.kind;
    $("intent-kind").textContent = intent.kind === "attack" ? "공격" : "수비";
    $("intent-dice").textContent = intent.min + "–" + intent.max;
    const bits = [intent.name];
    if (intent.power) bits.push("맞으면 추가 " + intent.power);
    if (intent.seal) bits.push("맞으면 다음 카드 눈이 줄어든다");
    $("intent-detail").textContent = bits.join(" · ");
  }

  function cardButton(card, onPress) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card " + card.kind;
    button.innerHTML =
      '<img src="' + card.art + '" alt="">' +
      '<span class="reward-copy"><span class="kind">' + KIND[card.kind] + "</span>" +
      "<strong>" + card.name + "</strong>" +
      '<em class="range">' + shownRange(card, state.mark) + "</em>" +
      '<span class="blurb">' + card.blurb + "</span></span>";
    button.addEventListener("click", () => onPress(card, button));
    return button;
  }

  function paintHand() {
    const hand = $("hand");
    hand.replaceChildren();
    state.hand.forEach((card, index) => {
      const button = cardButton(card, () => playCard(index));
      button.setAttribute("aria-label", (index + 1) + "번 " + card.name + " 눈 " + shownRange(card, state.mark));
      if (state.busy) button.disabled = true;
      hand.appendChild(button);
    });
  }

  const POSES = {
    idle: "assets/characters/librarian/idle.png",
    walk: "assets/characters/librarian/idle.png",
    attack: "assets/characters/librarian/attack.png",
    defend: "assets/characters/librarian/defend.png",
    hit: "assets/characters/librarian/hit.png",
    cast: "assets/characters/librarian/cast.png",
    victory: "assets/characters/librarian/victory.png",
    defeat: "assets/characters/librarian/defeat.png"
  };
  let poseTimer = 0;

  function showLibrarian(name) {
    window.clearTimeout(poseTimer);
    const el = $("librarian");
    if (!el) return;
    const pose = POSES[name] ? name : "idle";
    el.dataset.pose = pose;
    el.style.backgroundImage = "url(\"" + POSES[pose] + "\")";
    el.classList.remove("acting");
    void el.offsetWidth;
    if (pose !== "idle" && pose !== "walk") el.classList.add("acting");
  }

  function setDie(el, text, tone) {
    const face = el.querySelector("span");
    if (face) face.textContent = text;
    if (tone) el.dataset.tone = tone;
  }

  function drawTo(count) {
    while (state.hand.length < count) {
      if (!state.draw.length) {
        if (!state.discard.length) break;
        state.draw = shuffle(state.discard);
        state.discard = [];
      }
      state.hand.push(state.draw.pop());
    }
  }

  function startRun() {
    state.book = ["slash", "slash", "guard", "guard", "page"].map(copyCard);
    state.player.hp = state.player.max;
    state.fight = 0;
    state.mark = 0;
    beginFight(false);
  }

  function beginFight(mend) {
    const def = ENEMIES[state.fight];
    state.enemy = { name: def.name, art: def.art, hp: def.hp, max: def.hp, intents: def.intents };
    state.intentIndex = 0;
    state.draw = shuffle(state.book.map((card) => Object.assign({}, card)));
    state.discard = [];
    state.hand = [];
    state.mark = 0;
    if (mend) {
      const before = state.player.hp;
      state.player.hp = Math.min(state.player.max, state.player.hp + 8);
      const gained = state.player.hp - before;
      $("clash-log").textContent = gained ? "낡은 책이 체력을 " + gained + " 돌봤다." : "다음 수를 보고 카드를 누르세요.";
    } else {
      $("clash-log").textContent = "다음 수를 보고 카드를 누르세요.";
    }
    drawTo(3);
    $("enemy-art").src = def.art;
    $("enemy-art").alt = def.name;
    $("enemy-name").textContent = def.name;
    $("fight-label").textContent = "서재 " + (state.fight + 1) + " / " + ENEMIES.length;
    setDie($("player-die"), "–", "neutral");
    setDie($("enemy-die"), "–", "neutral");
    $("clash").className = "clash";
    paintIntent();
    paintBars();
    paintHand();
    showLibrarian("walk");
    poseTimer = window.setTimeout(() => { if (state.screen === "play" && !state.busy) showLibrarian("idle"); }, 600);
    setScreen("play");
  }

  function rollFor(card) {
    const pair = clampDie(card.min, card.max - state.mark);
    const first = rollDie(pair[0], pair[1], Math.random);
    if (card.twin) {
      const second = rollDie(pair[0], pair[1], Math.random);
      const kept = Math.max(first, second);
      return { value: kept + (card.bonus || 0), label: first + "·" + second };
    }
    const value = first + (card.bonus || 0);
    return { value: value, label: card.bonus ? first + "+" + card.bonus : String(first) };
  }

  async function playCard(index) {
    if (state.busy || state.screen !== "play") return;
    const card = state.hand[index];
    if (!card) return;
    state.busy = true;
    paintHand();
    showLibrarian(card.kind === "attack" ? "attack" : card.kind === "defense" ? "defend" : "cast");
    const buttons = $("hand").querySelectorAll(".card");
    if (buttons[index]) buttons[index].classList.add("chosen");
    const intent = currentIntent();
    const player = rollFor(card);
    const enemyRoll = rollDie(intent.min, intent.max, Math.random);
    const playerDie = $("player-die");
    const enemyDie = $("enemy-die");
    const playerTone = card.kind === "attack" ? "attack" : card.kind === "defense" ? "defense" : card.kind === "heal" ? "heal" : "neutral";
    setDie(playerDie, "–", playerTone);
    setDie(enemyDie, "–", intent.kind === "guard" ? "defense" : "attack");
    playerDie.classList.add("spin");
    enemyDie.classList.add("spin");
    tone(640, 0.05, "square", 0.03);
    for (let step = 0; step < 6; step += 1) {
      setDie(playerDie, String(rollDie(1, 9, Math.random)));
      setDie(enemyDie, String(rollDie(1, 9, Math.random)));
      await wait(70);
    }
    playerDie.classList.remove("spin");
    enemyDie.classList.remove("spin");
    setDie(playerDie, player.label);
    setDie(enemyDie, String(enemyRoll));
    const result = resolveClash(card, player.value, intent, enemyRoll);
    state.hand.splice(index, 1);
    state.discard.push(card);
    state.mark = 0;
    state.player.hp = Math.max(0, Math.min(state.player.max, state.player.hp - result.playerDamage + result.heal));
    state.enemy.hp = Math.max(0, state.enemy.hp - result.enemyDamage);
    if (result.sealPlayer) state.mark = result.sealPlayer;
    const clash = $("clash");
    clash.className = "clash";
    const app = $("app");
    app.classList.remove("hit");
    let note = result.line;
    if (result.enemyDamage) note += " · 적 " + result.enemyDamage;
    if (result.playerDamage) note += " · 나 " + result.playerDamage;
    if (result.heal) note += " · 회복 " + result.heal;
    $("clash-log").textContent = note;
    if (result.nullified) {
      clash.classList.add("block");
      tone(520, 0.12, "triangle", 0.05);
    } else if (result.enemyDamage && !result.playerDamage) {
      clash.classList.add("win");
      tone(140, 0.14, "sawtooth", 0.04);
      if (!reduceMotion) app.classList.add("hit");
    } else if (result.heal && !result.playerDamage) {
      clash.classList.add("heal");
      tone(660, 0.12, "sine", 0.05);
    } else if (result.playerDamage) {
      clash.classList.add("hurt");
      tone(90, 0.16, "square", 0.04);
      if (!reduceMotion) app.classList.add("hit");
    }
    paintBars();
    if (state.player.hp <= 0) showLibrarian("defeat");
    else if (state.enemy.hp <= 0) showLibrarian("victory");
    else if (result.playerDamage) showLibrarian("hit");
    await wait(420);
    app.classList.remove("hit");
    state.intentIndex += 1;
    if (state.enemy.hp <= 0) {
      state.busy = false;
      onWinFight();
      return;
    }
    if (state.player.hp <= 0) {
      state.busy = false;
      onLose();
      return;
    }
    paintIntent();
    drawTo(3);
    state.busy = false;
    showLibrarian("idle");
    paintHand();
  }

  function objectMarker(name) {
    const last = name.charCodeAt(name.length - 1);
    const open = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 === 0;
    return name + (open ? "를" : "을");
  }

  function onWinFight() {
    tone(523, 0.1, "triangle", 0.05);
    window.setTimeout(() => tone(784, 0.16, "triangle", 0.05), 110);
    const keys = REWARDS[state.fight];
    const list = $("reward-choices");
    list.replaceChildren();
    $("reward-note").textContent = objectMarker(state.enemy.name) + " 넘겼다. 책에 남길 카드 한 장을 고른다.";
    keys.forEach((key) => {
      const card = CARDS[key];
      list.appendChild(cardButton(card, () => takeReward(key)));
    });
    setScreen("reward");
  }

  function takeReward(key) {
    if (state.screen !== "reward") return;
    state.book.push(copyCard(key));
    state.fight += 1;
    if (state.fight >= ENEMIES.length) {
      showResult(true);
      return;
    }
    beginFight(true);
  }

  function showResult(won) {
    $("result-art").src = won ? "assets/magic-book.jpg" : "assets/characters/librarian/defeat.png";
    $("result-title").textContent = won ? "서재가 조용해졌다" : "책이 닫혔다";
    $("result-body").textContent = won
      ? "세 존재를 넘겼다. 마법책에는 고른 페이지가 남아 있다."
      : state.enemy.name + "의 공격을 넘기지 못했다.";
    const deck = $("result-deck");
    deck.replaceChildren();
    state.book.forEach((card) => {
      const item = document.createElement("li");
      item.textContent = KIND[card.kind] + " · " + card.name;
      deck.appendChild(item);
    });
    setScreen("result");
  }

  function onLose() {
    showResult(false);
  }

  function toggleSound() {
    state.sound = !state.sound;
    $("sound-btn").textContent = state.sound ? "소리 끄기" : "소리 켜기";
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (state.screen === "play" || state.screen === "pause") && !state.busy) {
      setScreen(state.screen === "pause" ? "play" : "pause");
    } else if (state.screen === "play" && !state.busy && /^[1-3]$/.test(event.key)) {
      playCard(Number(event.key) - 1);
    } else if (state.screen === "start" && event.key === "Enter") {
      startRun();
    }
  });

  $("start-btn").addEventListener("click", startRun);
  $("pause-btn").addEventListener("click", () => { if (!state.busy) setScreen("pause"); });
  $("resume-btn").addEventListener("click", () => setScreen("play"));
  $("restart-btn").addEventListener("click", startRun);
  $("retry-btn").addEventListener("click", startRun);
  $("sound-btn").addEventListener("click", toggleSound);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) document.getElementById("app").classList.remove("hit");
  });
})();
