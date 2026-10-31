import { mountGame } from './game-shell.js';
import { loadImage, drawImageCover } from './game-tools.js';
import { CONFIG, VEHICLES, DECALS, WHEELS, BOOSTS, PASS_REWARDS } from './config.mjs';
import {
  createGame,
  updateGame,
  MODES,
  passLevel,
  nextPassReward,
  hoopRects,
} from './game.mjs';

const W = CONFIG.viewWidth;
const H = CONFIG.viewHeight;
const P = CONFIG.palette;

/** 크레용 손그림 스타일 에셋 */
const ART = {
  ready: false,
  bg: null,
  ball: null,
  goalBlue: null,
  goalOrange: null,
  hoop: null,
  vehicles: {},
  wheels: null,
};

const WHEEL_SHEET = {
  oem: { col: 0, row: 0 },
  chrome: { col: 1, row: 0 },
  neon: { col: 0, row: 1 },
  gold: { col: 1, row: 1 },
};

loadImage('assets/background.png')
  .then(async (bg) => {
    ART.bg = bg;
    const [ball, goalBlue, goalOrange, hoop, wheels, ...vehicles] = await Promise.all([
      loadImage('assets/objects/ball.png'),
      loadImage('assets/objects/goal_blue.png'),
      loadImage('assets/objects/goal_orange.png'),
      loadImage('assets/objects/hoop.png'),
      loadImage('assets/sprites/wheels.png'),
      ...VEHICLES.map((v) => loadImage(`assets/vehicles/${v.id}.png`).catch(() => null)),
    ]);
    ART.ball = ball;
    ART.goalBlue = goalBlue;
    ART.goalOrange = goalOrange;
    ART.hoop = hoop;
    ART.wheels = wheels;
    VEHICLES.forEach((v, i) => {
      if (vehicles[i]) ART.vehicles[v.id] = vehicles[i];
    });
    ART.ready = true;
  })
  .catch(() => {
    ART.ready = false;
  });

function drawWheelSprite(ctx, wheelId, x, y, radius) {
  const sheet = ART.wheels;
  if (!sheet || !sheet.complete) return false;
  const cell = WHEEL_SHEET[wheelId] || WHEEL_SHEET.oem;
  const cw = sheet.naturalWidth / 2;
  const ch = sheet.naturalHeight / 2;
  const sx = cell.col * cw;
  const sy = cell.row * ch;
  const d = radius * 2;
  ctx.drawImage(sheet, sx, sy, cw, ch, x - radius, y - radius, d, d);
  return true;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function pushUi(state, x, y, w, h, action, value) {
  state.ui.push({ x, y, w, h, action, value });
  return { x, y, w, h };
}

function drawBtn(ctx, box, label, { fill = '#243447', text = P.text, active = false, muted = false } = {}) {
  ctx.save();
  ctx.fillStyle = muted ? '#1a2430' : active ? P.primary : fill;
  roundRect(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fill();
  if (active) {
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = muted ? '#6b7a8a' : active ? '#06241c' : text;
  ctx.font = '700 14px "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2 + 1);
  ctx.restore();
}

function findById(list, id) {
  return list.find((x) => x.id === id) || list[0];
}

function drawCarBody(ctx, car, previewScale = 1) {
  const v = car.vehicle || findById(VEHICLES, car.cosmetics?.vehicle || 'octane');
  const wheel = findById(WHEELS, car.cosmetics?.wheel || 'oem');
  const decal = findById(DECALS, car.cosmetics?.decal || 'none');
  const color = car.cosmetics?.primary || v.color;
  const hw = v.halfW * previewScale;
  const hh = v.halfH * previewScale;
  const bodyImg = ART.vehicles[v.id];
  const useArt = !!(bodyImg && bodyImg.complete && bodyImg.naturalWidth);

  ctx.save();
  if (!previewScale || previewScale === 1) {
    ctx.translate(car.x || 0, car.y || 0);
    ctx.rotate(car.angle || 0);
  }

  const wheelR = 10 * previewScale;
  const wheelY = hh * 0.7;
  const drewWheels =
    drawWheelSprite(ctx, wheel.id, -hw * 0.55, wheelY, wheelR) &&
    drawWheelSprite(ctx, wheel.id, hw * 0.55, wheelY, wheelR);
  if (!drewWheels) {
    ctx.fillStyle = wheel.tire;
    ctx.beginPath();
    ctx.arc(-hw * 0.55, hh * 0.55, 9 * previewScale, 0, Math.PI * 2);
    ctx.arc(hw * 0.55, hh * 0.55, 9 * previewScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = wheel.rim;
    ctx.beginPath();
    ctx.arc(-hw * 0.55, hh * 0.55, 4.5 * previewScale, 0, Math.PI * 2);
    ctx.arc(hw * 0.55, hh * 0.55, 4.5 * previewScale, 0, Math.PI * 2);
    ctx.fill();
  }

  if (useArt) {
    const dw = hw * 2.35;
    const dh = hh * 2.9;
    ctx.drawImage(bodyImg, -dw / 2, -dh / 2 - hh * 0.15, dw, dh);
  } else {
    ctx.fillStyle = color;
    roundRect(ctx, -hw, -hh, hw * 2, hh * 2, 8 * previewScale);
    ctx.fill();
    ctx.fillStyle = '#ffffff55';
    roundRect(ctx, -hw * 0.15, -hh * 0.85, hw * 0.7, hh * 1.1, 5 * previewScale);
    ctx.fill();
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 2 * previewScale;
    if (decal.pattern === 'stripe') {
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(hw, 0);
      ctx.stroke();
    } else if (decal.pattern === 'flame') {
      ctx.strokeStyle = '#ffd27a';
      ctx.beginPath();
      ctx.moveTo(-hw * 0.7, hh * 0.3);
      ctx.quadraticCurveTo(-hw * 0.2, -hh, hw * 0.2, hh * 0.1);
      ctx.stroke();
    } else if (decal.pattern === 'circuit') {
      ctx.strokeStyle = '#46f0ff';
      ctx.strokeRect(-hw * 0.55, -hh * 0.45, hw * 1.1, hh * 0.9);
    } else if (decal.pattern === 'star') {
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(0, 0, 4 * previewScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 우리 팀(파랑) 테두리 — 2대2 등에서 상대와 구분
  const allyMarker = car.team === 0 && (!previewScale || previewScale === 1);
  if (allyMarker) {
    ctx.strokeStyle = '#9fd0ff';
    ctx.lineWidth = 3.5;
    roundRect(ctx, -hw - 4, -hh - 6, hw * 2 + 8, hh * 2 + 10, 12);
    ctx.stroke();
    ctx.strokeStyle = '#e8f6ff';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -hw - 1, -hh - 3, hw * 2 + 2, hh * 2 + 4, 10);
    ctx.stroke();
  }

  ctx.restore();

  // 우리 팀 위 작은 화살표(화면 기준 위→아래, 차가 돌아도 읽기 쉽게)
  if (allyMarker && Number.isFinite(car.x) && Number.isFinite(car.y)) {
    const tipY = car.y - hh - 14;
    ctx.save();
    ctx.fillStyle = '#9fd0ff';
    ctx.strokeStyle = '#e8f6ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(car.x, tipY);
    ctx.lineTo(car.x - 7, tipY - 12);
    ctx.lineTo(car.x + 7, tipY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawArena(ctx, mode) {
  if (ART.bg && ART.bg.complete) {
    drawImageCover(ctx, ART.bg, 0, 0, CONFIG.width, CONFIG.height, 0.5, 0.55);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    g.addColorStop(0, '#10263a');
    g.addColorStop(0.55, '#17324a');
    g.addColorStop(1, '#1c3a2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    ctx.fillStyle = '#2f6b45';
    ctx.fillRect(0, CONFIG.floorY, CONFIG.width, CONFIG.height - CONFIG.floorY);
  }

  // 경기장 선은 배경 위에 살짝만
  ctx.strokeStyle = '#d7ffe266';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CONFIG.width / 2, CONFIG.floorY);
  ctx.lineTo(CONFIG.width / 2, CONFIG.ceilingY + 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CONFIG.width / 2, CONFIG.floorY, 70, Math.PI, 0);
  ctx.stroke();

  if (mode.kind === 'soccer') {
    const gh = CONFIG.goalHalfH * 2;
    const gy = CONFIG.floorY - gh;
    // 상대(주황) 골대가 화면 밖으로 잘리지 않게 크게 안쪽에 배치
    const goalH = gh * 1.7;
    const orangeAspect =
      ART.goalOrange && ART.goalOrange.naturalWidth
        ? ART.goalOrange.naturalWidth / ART.goalOrange.naturalHeight
        : 0.75;
    const blueAspect =
      ART.goalBlue && ART.goalBlue.naturalWidth
        ? ART.goalBlue.naturalWidth / ART.goalBlue.naturalHeight
        : 1.08;
    const orangeW = goalH * orangeAspect;
    const blueW = goalH * blueAspect;

    if (ART.goalOrange && ART.goalOrange.complete) {
      const ox = Math.min(CONFIG.fieldRight - orangeW * 0.55, CONFIG.width - orangeW - 8);
      const oy = CONFIG.floorY - goalH + 10;
      ctx.fillStyle = '#ff8a3d66';
      roundRect(ctx, ox - 10, oy - 10, orangeW + 20, goalH + 16, 14);
      ctx.fill();
      ctx.strokeStyle = '#ffe0b8';
      ctx.lineWidth = 4;
      roundRect(ctx, ox - 10, oy - 10, orangeW + 20, goalH + 16, 14);
      ctx.stroke();
      ctx.drawImage(ART.goalOrange, ox, oy, orangeW, goalH);
    } else {
      ctx.fillStyle = '#ff8a3d55';
      ctx.fillRect(CONFIG.fieldRight - 36, gy, 40, gh);
      ctx.strokeStyle = '#ffc29a';
      ctx.lineWidth = 4;
      ctx.strokeRect(CONFIG.fieldRight - 36, gy, 40, gh);
    }

    if (ART.goalBlue && ART.goalBlue.complete) {
      const bx = Math.max(8, CONFIG.fieldLeft - blueW * 0.15);
      const by = CONFIG.floorY - goalH + 10;
      ctx.fillStyle = '#3aa0ff55';
      roundRect(ctx, bx - 8, by - 8, blueW + 16, goalH + 12, 12);
      ctx.fill();
      ctx.save();
      ctx.translate(bx + blueW, by);
      ctx.scale(-1, 1);
      ctx.drawImage(ART.goalBlue, 0, 0, blueW, goalH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#3aa0ff55';
      ctx.fillRect(CONFIG.fieldLeft - 20, gy, 40, gh);
      ctx.strokeStyle = '#9fd0ff';
      ctx.strokeRect(CONFIG.fieldLeft - 20, gy, 40, gh);
    }

    ctx.font = '800 14px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fd0ff';
    ctx.fillText('내 골대', Math.max(12, CONFIG.fieldLeft), gy - 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe0b8';
    ctx.fillText('공격 골대 →', Math.min(CONFIG.width - 12, CONFIG.fieldRight), gy - 16);
  } else {
    const hoop = hoopRects();
    if (ART.hoop && ART.hoop.complete) {
      const size = hoop.rimR * 2.6;
      ctx.drawImage(ART.hoop, hoop.cx - size / 2, hoop.cy - size * 0.55, size, size);
    } else {
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(hoop.cx, hoop.cy, hoop.rimR, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#c1121f';
      roundRect(ctx, hoop.back.x, hoop.back.y, hoop.back.w, hoop.back.h, 4);
      ctx.fill();
    }
  }
}

function drawHub(ctx, state) {
  state.ui = [];
  const save = state.save;
  ctx.fillStyle = P.background;
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d1b2a');
  bg.addColorStop(1, '#163528');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = P.text;
  ctx.font = '800 34px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('로켓 리그 사이드와이프', 36, 58);
  ctx.font = '600 15px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = '#a9c0d4';
  ctx.fillText('2D 사이드뷰 · 약 2분 한 판 · 축구 & 후프스', 38, 86);

  ctx.fillStyle = '#0006';
  roundRect(ctx, W - 250, 28, 214, 64, 14);
  ctx.fill();
  ctx.fillStyle = P.primary;
  ctx.font = '700 14px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(`크레딧 ${save.credits}`, W - 236, 52);
  ctx.fillStyle = P.text;
  ctx.fillText(`패스 Lv.${passLevel(save.xp)} · XP ${save.xp}`, W - 236, 74);

  // preview car
  ctx.save();
  ctx.translate(180, 250);
  drawCarBody(ctx, {
    vehicle: findById(VEHICLES, save.loadout.vehicle),
    cosmetics: save.loadout,
    angle: -0.12,
  });
  ctx.restore();

  ctx.fillStyle = '#a9c0d4';
  ctx.font = '600 13px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText('모드를 고르면 바로 경기 시작', 420, 140);

  MODES.forEach((mode, i) => {
    const y = 160 + i * 78;
    const box = pushUi(state, 420, y, 500, 66, 'mode', mode.id);
    ctx.fillStyle = '#1c2e42';
    roundRect(ctx, box.x, box.y, box.w, box.h, 14);
    ctx.fill();
    ctx.fillStyle = P.primary;
    ctx.font = '800 18px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(mode.name, box.x + 18, box.y + 28);
    ctx.fillStyle = '#b7c9da';
    ctx.font = '600 13px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(mode.desc, box.x + 18, box.y + 50);
  });

  const garage = pushUi(state, 36, H - 86, 180, 52, 'goto', 'garage');
  const pass = pushUi(state, 232, H - 86, 180, 52, 'goto', 'pass');
  drawBtn(ctx, garage, '차고 · 꾸미기', { fill: '#244056' });
  drawBtn(ctx, pass, '시즌 패스', { fill: '#3a2a55' });

  if (state.toastT > 0) {
    ctx.fillStyle = '#0009';
    roundRect(ctx, W / 2 - 180, H - 150, 360, 40, 10);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 14px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, W / 2, H - 128);
  }
}

function drawGarage(ctx, state) {
  state.ui = [];
  const save = state.save;
  ctx.fillStyle = '#101c28';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = P.text;
  ctx.font = '800 26px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('차고 · 커스터마이징', 28, 42);
  ctx.font = '600 14px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = P.primary;
  ctx.fillText(`크레딧 ${save.credits}`, 28, 68);

  const tabs = [
    { id: 'vehicle', name: '차량' },
    { id: 'decal', name: '데칼' },
    { id: 'wheel', name: '바퀴' },
    { id: 'boost', name: '부스터' },
  ];
  tabs.forEach((tab, i) => {
    const box = pushUi(state, 28 + i * 120, 88, 110, 40, 'goto', `garage:${tab.id}`);
    // reuse goto with special — handle below via tab click hack
    box.action = 'tab';
    box.value = tab.id;
    drawBtn(ctx, box, tab.name, { active: state.garageTab === tab.id, fill: '#243447' });
  });

  // intercept tab actions
  state.ui.forEach((u) => {
    if (u.action === 'tab') {
      /* kept for hit test; handled in update via custom */
    }
  });

  ctx.save();
  ctx.translate(200, 250);
  ctx.scale(1.35, 1.35);
  drawCarBody(ctx, {
    vehicle: findById(VEHICLES, save.loadout.vehicle),
    cosmetics: save.loadout,
    angle: -0.08,
  });
  // boost preview
  const boost = findById(BOOSTS, save.loadout.boost);
  ctx.fillStyle = boost.color;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.lineTo(-80, -10);
  ctx.lineTo(-80, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const catalogs = {
    vehicle: VEHICLES,
    decal: DECALS,
    wheel: WHEELS,
    boost: BOOSTS,
  };
  const ownedKey = {
    vehicle: 'vehicles',
    decal: 'decals',
    wheel: 'wheels',
    boost: 'boosts',
  };
  const list = catalogs[state.garageTab] || VEHICLES;
  const owned = save.owned[ownedKey[state.garageTab]] || [];

  list.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 420 + col * 250;
    const y = 150 + row * 70;
    const have = owned.includes(item.id);
    const equipped = save.loadout[state.garageTab] === item.id;
    const box = pushUi(state, x, y, 230, 58, 'buy', `${state.garageTab}:${item.id}`);
    ctx.fillStyle = equipped ? '#1f4d3d' : '#1c2b3c';
    roundRect(ctx, box.x, box.y, box.w, box.h, 12);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 15px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.name, box.x + 14, box.y + 24);
    ctx.fillStyle = '#9db0c3';
    ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
    const label = have ? (equipped ? '장착 중 · 탭하여 유지' : '보유 · 탭하여 장착') : `${item.price} 크레딧`;
    ctx.fillText(label, box.x + 14, box.y + 44);
  });

  // color presets
  const colors = ['#3aa0ff', '#00e5a8', '#ff6b3d', '#f0c14b', '#ff4d6d', '#e8eef5'];
  colors.forEach((c, i) => {
    const box = pushUi(state, 36 + i * 44, 360, 36, 36, 'color', c);
    ctx.fillStyle = c;
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
  });
  ctx.fillStyle = '#9db0c3';
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('차체 색', 36, 350);

  const back = pushUi(state, 28, H - 70, 140, 46, 'goto', 'hub');
  drawBtn(ctx, back, '로비로', { fill: '#314556' });

  if (state.toastT > 0) {
    ctx.fillStyle = '#000a';
    roundRect(ctx, W / 2 - 160, 20, 320, 36, 10);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.textAlign = 'center';
    ctx.font = '700 14px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(state.toast, W / 2, 42);
  }
}

function drawPass(ctx, state) {
  state.ui = [];
  const save = state.save;
  const level = passLevel(save.xp);
  const next = nextPassReward(save.xp);

  ctx.fillStyle = '#141022';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = P.text;
  ctx.font = '800 26px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('시즌 패스', 28, 42);
  ctx.font = '600 14px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = '#cbb8ff';
  ctx.fillText(`현재 Lv.${level} · XP ${save.xp}` + (next ? ` · 다음 ${next.xp} XP` : ' · 시즌 완료'), 28, 68);

  const barX = 28;
  const barW = W - 56;
  const progress = next
    ? (save.xp - (PASS_REWARDS.find((r) => r.level === level)?.xp || 0)) /
      Math.max(1, next.xp - (PASS_REWARDS.find((r) => r.level === level)?.xp || 0))
    : 1;
  ctx.fillStyle = '#2a2440';
  roundRect(ctx, barX, 88, barW, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#9b7bff';
  roundRect(ctx, barX, 88, barW * clamp01(progress), 18, 9);
  ctx.fill();

  PASS_REWARDS.forEach((r, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 28 + col * 230;
    const y = 130 + row * 78;
    const unlocked = save.xp >= r.xp;
    const claimed = !!save.claimedPass[r.level];
    ctx.fillStyle = unlocked ? '#2a2150' : '#1a1828';
    roundRect(ctx, x, y, 214, 66, 12);
    ctx.fill();
    ctx.fillStyle = unlocked ? '#e8ddff' : '#6d6780';
    ctx.font = '800 13px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(`Lv.${r.level}`, x + 12, y + 24);
    ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(r.label, x + 12, y + 46);
    ctx.fillStyle = claimed ? P.primary : unlocked ? '#ffd27a' : '#555';
    ctx.fillText(claimed ? '수령' : unlocked ? '해금됨' : `${r.xp} XP`, x + 140, y + 24);
  });

  const claim = pushUi(state, W - 220, H - 70, 180, 46, 'claim-pass', '1');
  drawBtn(ctx, claim, '보상 받기', { fill: '#5b3fa6' });
  const back = pushUi(state, 28, H - 70, 140, 46, 'goto', 'hub');
  drawBtn(ctx, back, '로비로', { fill: '#314556' });
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function drawMatch(ctx, state) {
  const m = state.match;
  state.ui = [];
  state.controlZones = [];
  ctx.fillStyle = P.background;
  ctx.fillRect(0, 0, W, H);
  // Only the world is scaled. HUD and input zones stay in viewport coordinates.
  const scale = Math.min(W / CONFIG.width, CONFIG.arenaViewHeight / CONFIG.height);
  ctx.save();
  ctx.translate((W - CONFIG.width * scale) / 2, (CONFIG.arenaViewHeight - CONFIG.height * scale) / 2);
  ctx.scale(scale, scale);
  drawArena(ctx, m.mode);

  for (const t of m.trails) {
    ctx.globalAlpha = Math.max(0, t.life * 2);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const car of m.cars) drawCarBody(ctx, car);

  // ball
  const ball = m.ball;
  ctx.fillStyle = '#0b0d10';
  ctx.beginPath();
  ctx.arc(ball.x + 3, ball.y + 4, ball.r, 0, Math.PI * 2);
  ctx.fill();
  if (ART.ball && ART.ball.complete) {
    const d = ball.r * 2.15;
    ctx.drawImage(ART.ball, ball.x - d / 2, ball.y - d / 2, d, d);
  } else {
    ctx.fillStyle = P.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a2f38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of m.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 5, 5);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // HUD
  ctx.fillStyle = '#0007';
  roundRect(ctx, W / 2 - 120, 12, 240, 48, 14);
  ctx.fill();
  ctx.fillStyle = P.blue;
  ctx.font = '800 24px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(m.score[0]), W / 2 - 70, 44);
  ctx.fillStyle = P.text;
  ctx.fillText(`${Math.ceil(m.timeLeft)}`, W / 2, 44);
  ctx.fillStyle = P.orange;
  ctx.fillText(String(m.score[1]), W / 2 + 70, 44);

  ctx.fillStyle = '#9db0c3';
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(m.mode.name, W / 2, 66);
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(m.mode.kind === 'hoops' ? '후프 쪽으로 공을 밀어 띄우세요 · 위에서 아래로 통과하면 골' : '파랑 = 우리 팀 · 오른쪽 주황 골대를 공격하세요 →', W / 2, 84);

  const player = m.cars.find((c) => c.isPlayer);
  if (player) {
    ctx.fillStyle = '#0007';
    roundRect(ctx, 16, 12, 150, 28, 10);
    ctx.fill();
    ctx.fillStyle = '#1a3344';
    roundRect(ctx, 22, 18, 138, 16, 6);
    ctx.fill();
    ctx.fillStyle = P.boost;
    roundRect(ctx, 22, 18, (138 * player.boost) / CONFIG.boostMax, 16, 6);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 11px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('부스트', 91, 30);
  }

  if (m.kickoff > 0) {
    ctx.fillStyle = '#0008';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.text;
    ctx.font = '800 48px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.kickoff > 0.4 ? String(Math.ceil(m.kickoff)) : 'GO!', W / 2, H / 2);
  }

  if (m.toastT > 0) {
    ctx.fillStyle = '#000a';
    roundRect(ctx, W / 2 - 120, 90, 240, 40, 12);
    ctx.fill();
    ctx.fillStyle = P.primary;
    ctx.font = '800 18px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.toast, W / 2, 116);
  }

  // Controls have their own strip beneath the playable world.
  ctx.fillStyle = '#091725';
  ctx.fillRect(0, CONFIG.arenaViewHeight, W, H - CONFIG.arenaViewHeight);
  ctx.strokeStyle = '#294556';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.arenaViewHeight);
  ctx.lineTo(W, CONFIG.arenaViewHeight);
  ctx.stroke();
  const zones = [
    { x: 24, y: H - 88, w: 96, h: 76, action: 'left', label: '◀' },
    { x: 132, y: H - 88, w: 96, h: 76, action: 'right', label: '▶' },
    { x: W - 356, y: H - 88, w: 100, h: 76, action: 'up', label: '↑ 상승' },
    { x: W - 244, y: H - 88, w: 100, h: 76, action: 'jump', label: '점프' },
    { x: W - 132, y: H - 88, w: 108, h: 76, action: 'boost', label: '부스트' },
  ];
  state.controlZones = zones;
  for (const z of zones) {
    const on =
      (z.action === 'left' && (state._padLeft || false)) ||
      (z.action === 'right' && state._padRight) ||
      (z.action === 'up' && state._padUp) ||
      (z.action === 'jump' && state._padJump) ||
      (z.action === 'boost' && state._padBoost);
    ctx.fillStyle = on ? '#00e5a855' : '#0007';
    roundRect(ctx, z.x, z.y, z.w, z.h, 16);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '800 16px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(z.label, z.x + z.w / 2, z.y + z.h / 2);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#b7c9da';
  ctx.font = '600 13px "Malgun Gothic", sans-serif';
  ctx.fillText('상승: 자동 점프 + 위로 부스트', 414, H - 53);
  ctx.fillText('A/D 이동 · W/↑ 상승 · Space 점프', 414, H - 29);
}

function render(ctx, state) {
  if (state.screen === 'hub') drawHub(ctx, state);
  else if (state.screen === 'garage' || String(state.screen).startsWith('garage')) drawGarage(ctx, state);
  else if (state.screen === 'pass') drawPass(ctx, state);
  else if (state.screen === 'match' && state.match) drawMatch(ctx, state);
  else drawHub(ctx, state);
}

// Extend update to handle garage tabs before shared update
const baseUpdate = updateGame;
function update(state, dt, input) {
  // tab hit handling injected via pending action rewrite
  if (input.pointer.pressed) {
    for (let i = (state.ui || []).length - 1; i >= 0; i -= 1) {
      const b = state.ui[i];
      const p = input.pointer;
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        if (b.action === 'tab') {
          state.garageTab = b.value;
          state.screen = 'garage';
          input.pointer.pressed = false;
          break;
        }
      }
    }
  }
  // visual pad feedback
  state._padLeft = false;
  state._padRight = false;
  state._padUp = false;
  state._padJump = false;
  state._padBoost = false;
  if (state.screen === 'match') {
    const keys = input.keys;
    if (keys.has('arrowleft') || keys.has('a')) state._padLeft = true;
    if (keys.has('arrowright') || keys.has('d')) state._padRight = true;
    if (keys.has(' ')) state._padJump = true;
    if (keys.has('w') || keys.has('arrowup')) state._padUp = state._padBoost = true;
    if (keys.has('shift') || keys.has('e') || keys.has('f')) state._padBoost = true;
    for (const p of input.pointers) {
      for (const z of state.controlZones || []) {
        if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
          if (z.action === 'left') state._padLeft = true;
          if (z.action === 'right') state._padRight = true;
          if (z.action === 'up') state._padUp = state._padBoost = true;
          if (z.action === 'jump') state._padJump = true;
          if (z.action === 'boost') state._padBoost = true;
        }
      }
    }
  }
  baseUpdate(state, dt, input);
}

mountGame({
  title: CONFIG.title,
  description:
    '넓어진 경기장에서 즐기는 2D 로켓카 축구! 파란 차로 오른쪽 주황 골대를 공격하세요. 상승을 누르면 자동으로 점프하고 위로 부스트합니다. 후프스는 중앙 후프에 공을 넣으세요. 한 판 약 2분.',
  controls:
    '터치: ◀▶ 이동 · ↑ 상승(자동 점프+부스트) · 점프(두 번 가능) · 부스트 / 키보드: A·D/←·→ 이동, W/↑ 상승, Space 점프, Shift·E 부스트. 이동과 상승을 함께 누르면 대각선으로 날아갑니다.',
  width: W,
  height: H,
  theme: {
    background: P.background,
    primary: P.primary,
    text: P.text,
  },
  create: createGame,
  update,
  render,
});
