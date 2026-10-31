import { mountGame } from './game-shell.js';
import { loadImage, drawImageCover } from './game-tools.js';
import { CONFIG } from './config.mjs';
import {
  createGame,
  updateGame,
  slideCenter,
  slideWidth,
  SHORTCUTS,
  SKINS,
  rankList,
  placeOf,
} from './game.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const P = CONFIG.palette;

const art = {
  ready: false,
  background: null,
  slide: null,
  pool: null,
  boost: null,
  coin: null,
  obstacle: null,
  obstacleHit: null,
  shortcut: null,
  landing: null,
  splash: null,
  jump: null,
  hud: null,
  characters: {},
};

async function loadArt() {
  const base = './assets/';
  const charIds = ['sunny', 'mint', 'coral', 'violet', 'gold', 'wave', 'splash', 'sunbeam'];
  const [background, slide, pool, boost, coin, obstacle, obstacleHit, shortcut, landing, splash, jump, hud, ...chars] =
    await Promise.all([
      loadImage(`${base}background.png`),
      loadImage(`${base}slide_tile.png`),
      loadImage(`${base}objects/pool.png`),
      loadImage(`${base}objects/boost_pad.png`),
      loadImage(`${base}objects/coin.png`),
      loadImage(`${base}objects/obstacle.png`),
      loadImage(`${base}objects/obstacle_hit.png`),
      loadImage(`${base}objects/shortcut_marker.png`),
      loadImage(`${base}objects/landing_ring.png`),
      loadImage(`${base}objects/splash.png`),
      loadImage(`${base}objects/jump_button.png`),
      loadImage(`${base}objects/hud_panel.png`),
      ...charIds.map((id) => loadImage(`${base}characters/${id}.png`)),
    ]);
  Object.assign(art, {
    ready: true,
    background,
    slide,
    pool,
    boost,
    coin,
    obstacle,
    obstacleHit,
    shortcut,
    landing,
    splash,
    jump,
    hud,
  });
  charIds.forEach((id, i) => {
    art.characters[id] = chars[i];
  });
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

function worldToScreen(progress, lane, cameraProgress) {
  const rel = progress - cameraProgress;
  const y = H * 0.62 - rel * 0.92;
  const scale = clamp(1.05 - Math.max(0, rel) * 0.00125, 0.45, 1.1);
  const trackProgress = Math.max(0, progress);
  const half = Math.min(W * 0.5 - 20, slideWidth(trackProgress) * 0.5 * scale);
  const bend = (slideCenter(trackProgress) - slideCenter(cameraProgress)) * W * 0.32;
  const cx = clamp(W * 0.5 + bend, half + 16, W - half - 16);
  return { x: cx + lane * half, y, scale, half, cx };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function drawCentered(ctx, img, x, y, w, h) {
  if (!img) return false;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  return true;
}

function drawSky(ctx, cameraProgress) {
  if (art.background) {
    const drift = ((cameraProgress * 0.02) % 40) - 20;
    ctx.save();
    ctx.translate(drift, 0);
    drawImageCover(ctx, art.background, -20, 0, W + 40, H, 0.5, 0.28);
    ctx.restore();
    ctx.fillStyle = 'rgba(20, 8, 40, 0.28)';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#3a1a5c');
  sky.addColorStop(0.45, '#5b2a86');
  sky.addColorStop(1, '#1a0b2e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

function drawPool(ctx, cameraProgress) {
  const finish = CONFIG.track.length;
  const s = worldToScreen(finish, 0, cameraProgress);
  if (s.y < -40 || s.y > H + 80) return;
  const rw = 170 * s.scale;
  const rh = 90 * s.scale;
  if (!drawCentered(ctx, art.pool, s.cx, s.y + 16 * s.scale, rw * 1.35, rh * 1.45)) {
    ctx.fillStyle = '#1ec8ff';
    ctx.beginPath();
    ctx.ellipse(s.cx, s.y + 20 * s.scale, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.text;
  ctx.font = `800 ${Math.round(16 * s.scale)}px "Pretendard","Malgun Gothic",sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('수영장 골인', s.cx, s.y - 28 * s.scale);
}

function drawSlideRibbon(ctx, cameraProgress, time) {
  const steps = 96;
  const span = 930;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = cameraProgress - 320 + (span * i) / steps;
    if (t > CONFIG.track.length + 40) continue;
    const p = worldToScreen(t, 0, cameraProgress);
    left.push({ x: p.cx - p.half, y: p.y, t });
    right.push({ x: p.cx + p.half, y: p.y, t });
  }
  if (left.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();

  if (art.slide) {
    ctx.save();
    ctx.clip();
    const pattern = ctx.createPattern(art.slide, 'repeat');
    if (pattern) {
      const shift = (cameraProgress * 0.35) % 180;
      ctx.translate(0, -shift);
      ctx.fillStyle = pattern;
      ctx.fillRect(-40, -40, W + 80, H + 220);
    } else {
      ctx.fillStyle = '#c77dff';
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 80, 180, 0.55)';
    ctx.lineWidth = 5;
    ctx.stroke();
  } else {
    const body = ctx.createLinearGradient(0, 0, W, 0);
    body.addColorStop(0, '#f08172');
    body.addColorStop(0.5, '#e5fbf3');
    body.addColorStop(1, '#f08172');
    ctx.fillStyle = body;
    ctx.fill();
  }

  ctx.beginPath();
  for (let i = 0; i < left.length; i++) {
    const mid = worldToScreen(left[i].t, 0, cameraProgress);
    const x = mid.cx - mid.half * 0.72;
    if (i === 0) ctx.moveTo(x, mid.y);
    else ctx.lineTo(x, mid.y);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    const mid = worldToScreen(right[i].t, 0, cameraProgress);
    ctx.lineTo(mid.cx + mid.half * 0.72, mid.y);
  }
  ctx.closePath();
  const water = ctx.createLinearGradient(0, 0, W, 0);
  water.addColorStop(0, 'rgba(80,40,140,0.55)');
  water.addColorStop(0.5, 'rgba(180,120,255,0.35)');
  water.addColorStop(1, 'rgba(80,40,140,0.55)');
  ctx.fillStyle = water;
  ctx.fill();

  for (const edge of [left, right]) {
    ctx.beginPath();
    edge.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.strokeStyle = '#1a0b2eaa';
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = '#ff4db8';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (let i = 0; i < left.length; i += 2) {
    const point = worldToScreen(left[i].t, 0, cameraProgress);
    const wave = Math.sin(left[i].t * 0.08 - time * 3) * 4;
    ctx.strokeStyle = 'rgba(255,240,255,0.45)';
    ctx.lineWidth = 1.8 * point.scale;
    for (const lane of [-0.5, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(point.cx + point.half * lane - 8, point.y + wave);
      ctx.quadraticCurveTo(
        point.cx + point.half * lane,
        point.y + wave + 4,
        point.cx + point.half * lane + 9,
        point.y + wave,
      );
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  for (let i = 0; i < left.length; i++) {
    const mid = worldToScreen(left[i].t, 0, cameraProgress);
    if (i === 0) ctx.moveTo(mid.cx, mid.y);
    else ctx.lineTo(mid.cx, mid.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawShortcuts(ctx, cameraProgress) {
  for (const z of SHORTCUTS) {
    const a = worldToScreen(z.from, 0, cameraProgress);
    const b = worldToScreen(z.to, 0, cameraProgress);
    if (b.y < -20 || a.y > H + 20) continue;
    ctx.fillStyle = 'rgba(255, 255, 120, 0.22)';
    roundRect(ctx, a.cx - a.half * 0.9, Math.min(a.y, b.y), a.half * 1.8, Math.abs(a.y - b.y) + 8, 10);
    ctx.fill();
    if (art.shortcut) {
      drawCentered(ctx, art.shortcut, a.cx, (a.y + b.y) / 2, 36 * a.scale, 54 * a.scale);
    }
    ctx.fillStyle = '#fff7a0';
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↗ 지금 점프! 약 2초 단축', (a.x + b.x) / 2 || a.cx, (a.y + b.y) / 2 - 18);
    const landing = worldToScreen(z.land, z.landLane, cameraProgress);
    if (landing.y > 75 && landing.y < H - 40) {
      if (!drawCentered(ctx, art.landing, landing.x, landing.y, 48 * landing.scale, 32 * landing.scale)) {
        ctx.strokeStyle = '#fff7a0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(landing.x, landing.y, 22 * landing.scale, 10 * landing.scale, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

function drawPickups(ctx, state, cameraProgress) {
  for (const b of state.pickups.boosts) {
    if (b.taken) continue;
    const p = worldToScreen(b.t, b.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    ctx.fillStyle = 'rgba(0,62,85,.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 6 * p.scale, 19 * p.scale, 9 * p.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!drawCentered(ctx, art.boost, p.x, p.y, 38 * p.scale, 26 * p.scale)) {
      ctx.fillStyle = P.boost;
      roundRect(ctx, p.x - 16 * p.scale, p.y - 10 * p.scale, 32 * p.scale, 20 * p.scale, 6);
      ctx.fill();
    }
  }
  for (const o of state.pickups.obstacles) {
    const p = worldToScreen(o.t, o.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    ctx.fillStyle = 'rgba(0,62,85,.28)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 8 * p.scale, 16 * p.scale, 6 * p.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    const img = o.hit ? art.obstacleHit : art.obstacle;
    if (!drawCentered(ctx, img, p.x, p.y, 30 * p.scale, 30 * p.scale)) {
      ctx.fillStyle = o.hit ? '#a3b7b5' : '#ff6a63';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const c of state.pickups.coins) {
    if (c.taken) continue;
    const p = worldToScreen(c.t, c.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    if (!drawCentered(ctx, art.coin, p.x, p.y, 22 * p.scale, 22 * p.scale)) {
      ctx.fillStyle = P.coin;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRacerFallback(ctx, racer, x, y, s, time) {
  ctx.fillStyle = racer.bumpFlash > 0 ? '#fff' : racer.tube;
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = racer.body;
  ctx.beginPath();
  ctx.arc(x, y - 10 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawRacer(ctx, racer, cameraProgress, time) {
  if (racer.fallen && racer.splash <= 0) return;
  const p = worldToScreen(racer.progress, racer.lane, cameraProgress);
  if (p.y < -40 || p.y > H + 50) return;

  const s = p.scale * (racer.airborne ? 1.15 : 1);
  const bob = racer.airborne ? -28 * Math.sin(Math.min(1, racer.airTimer / 0.72) * Math.PI) * s : 0;
  const x = p.x;
  const y = p.y + bob;

  if (racer.fallen) {
    if (!drawCentered(ctx, art.splash, x, y + 4, 56 * s, 56 * s)) {
      ctx.fillStyle = `rgba(120,200,255,${racer.splash})`;
      ctx.beginPath();
      ctx.ellipse(x, y + 10, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (!racer.airborne) {
    ctx.strokeStyle = '#efffffaa';
    ctx.lineWidth = 2 * s;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 15 * s, y + 6 * s);
      ctx.quadraticCurveTo(
        x + side * 26 * s,
        y + 20 * s,
        x + side * 30 * s,
        y + (30 + Math.sin(time * 10) * 3) * s,
      );
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(0,40,70,0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 8 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const sprite = art.characters[racer.sprite];
  ctx.save();
  if (racer.bumpFlash > 0) ctx.globalAlpha = 0.75 + Math.sin(time * 40) * 0.25;
  if (!drawCentered(ctx, sprite, x, y - 4 * s, 72 * s, 72 * s)) {
    drawRacerFallback(ctx, racer, x, y, s, time);
  }
  ctx.restore();

  if (racer.boostTimer > 0) {
    ctx.strokeStyle = `rgba(125,255,154,${0.4 + Math.sin(time * 20) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 34 * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (racer.isPlayer) {
    ctx.fillStyle = P.primary;
    ctx.font = '800 12px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼', x, y - 38 * s);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 11px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(racer.name, x, y - 36 * s);
  }

  if (racer.ceremony > 0) {
    const arms = Math.sin(racer.ceremony * 10) * 8 * s;
    ctx.strokeStyle = racer.body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y - 4 * s);
    ctx.lineTo(x - 22 * s, y - 18 * s - arms);
    ctx.moveTo(x + 14 * s, y - 4 * s);
    ctx.lineTo(x + 22 * s, y - 18 * s + arms);
    ctx.stroke();
  }
}

function drawHud(ctx, state, viewTime) {
  const player = state.racers.find((r) => r.isPlayer);
  const place = player ? placeOf(state, player) : '-';
  const ranks = rankList(state);

  if (art.hud) {
    ctx.drawImage(art.hud, 8, 6, W - 16, 64);
  } else {
    ctx.fillStyle = 'rgba(6,50,80,0.55)';
    roundRect(ctx, 12, 12, W - 24, 54, 14);
    ctx.fill();
  }
  ctx.fillStyle = P.text;
  ctx.font = '800 18px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${place}위`, 26, 46);
  ctx.font = '700 14px "Malgun Gothic",sans-serif';
  ctx.fillText(`코인 ${state.raceCoins}`, 90, 46);
  const pct = player ? Math.round((player.progress / CONFIG.track.length) * 100) : 0;
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(state.raceTime)}초 · ${pct}%`, W - 26, 46);

  ctx.textAlign = 'left';
  ctx.font = '600 12px "Malgun Gothic",sans-serif';
  ranks.slice(0, 4).forEach((r, i) => {
    ctx.fillStyle = r.isPlayer ? P.primary : 'rgba(255,255,255,0.75)';
    ctx.fillText(`${i + 1}. ${r.name}`, 26, 86 + i * 16);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 12, H - 18, W - 24, 8, 4);
  ctx.fill();
  const nextShortcut = player && SHORTCUTS.find((z) => player.progress <= z.to);
  const inShortcut = nextShortcut && player.progress >= nextShortcut.from;
  const jumpReady = player && !player.airborne && player.jumpCooldown <= 0;
  ctx.fillStyle = P.primary;
  roundRect(ctx, 12, H - 18, (W - 24) * clamp(pct / 100, 0, 1), 8, 4);
  ctx.fill();

  const jx = W - 58;
  const jy = H - 78;
  if (art.jump) {
    ctx.save();
    ctx.globalAlpha = jumpReady ? 1 : 0.45;
    drawCentered(ctx, art.jump, jx, jy, 72, 72);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(6,50,80,0.55)';
    ctx.beginPath();
    ctx.arc(jx, jy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = jumpReady ? (inShortcut ? '#a6ff83' : P.primary) : '#a1b9c4';
    ctx.beginPath();
    ctx.arc(jx, jy, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff8e8';
  ctx.font = '800 12px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(jumpReady ? (inShortcut ? '숏컷!' : '점프') : '착지 중', jx, jy + 42);

  ctx.fillStyle = 'rgba(4,40,70,0.82)';
  roundRect(ctx, 16, H - 136, W - 32, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#fff7a0';
  ctx.font = '700 12px "Malgun Gothic",sans-serif';
  const jumpHint = inShortcut
    ? '노란 구간! 지금 점프하면 지름길로 착지'
    : nextShortcut
      ? `장애물은 점프 · 다음 숏컷 ${Math.ceil(Math.max(0, nextShortcut.from - player.progress) / CONFIG.rules.baseSpeed)}초 뒤`
      : '장애물은 점프로 넘고 수영장까지 달려요!';
  ctx.fillText(jumpHint, W / 2, H - 114);

  if (state.toast) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, 40, H * 0.28, W - 80, 40, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 15px "Malgun Gothic",sans-serif';
    ctx.fillText(state.toast, W / 2, H * 0.28 + 26);
  }

  if (state.countdown > 0) {
    ctx.fillStyle = 'rgba(0,30,50,0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.primary;
    ctx.font = '800 64px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    const n = Math.ceil(state.countdown);
    ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.38);
    ctx.fillStyle = 'rgba(4,40,70,0.72)';
    roundRect(ctx, 16, H - 168, W - 32, 140, 16);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.fillText(`약 1분 레이스 · 보유 ${state.save.coins}코인 · 스킨 선택`, W / 2, H - 146);
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.fillText('장애물은 점프! 노란 구간에서는 지름길!', W / 2, H * 0.46);
    SKINS.forEach((skin, i) => {
      const bx = 28 + i * 68;
      const by = H - 130;
      const owned = state.save.unlocked.includes(skin.id);
      const selected = state.save.selected === skin.id;
      ctx.fillStyle = selected ? P.primary : owned ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.38)';
      roundRect(ctx, bx, by, 58, 70, 10);
      ctx.fill();
      const thumb = art.characters[skin.sprite || skin.id];
      if (thumb) {
        ctx.save();
        ctx.globalAlpha = owned ? 1 : 0.45;
        ctx.drawImage(thumb, bx + 5, by + 4, 48, 48);
        ctx.restore();
      } else {
        ctx.fillStyle = skin.body;
        ctx.beginPath();
        ctx.arc(bx + 29, by + 24, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = skin.tube;
        ctx.beginPath();
        ctx.ellipse(bx + 29, by + 40, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#223';
      ctx.font = '700 10px "Malgun Gothic",sans-serif';
      ctx.fillText(owned ? skin.name : `${skin.cost}¢`, bx + 29, by + 62);
    });
  }
}

function render(ctx, state, view) {
  drawSky(ctx, state.cameraProgress);
  drawSlideRibbon(ctx, state.cameraProgress, view.time);
  drawPool(ctx, state.cameraProgress);
  drawShortcuts(ctx, state.cameraProgress);
  drawPickups(ctx, state, state.cameraProgress);

  const sorted = [...state.racers].sort((a, b) => a.progress - b.progress);
  for (const r of sorted) drawRacer(ctx, r, state.cameraProgress, view.time);

  for (const f of state.fx) {
    const a = f.life / f.max;
    ctx.globalAlpha = a;
    if (f.kind === 'boost') {
      ctx.strokeStyle = P.boost;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.62, 40 * (1 - a), 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === 'coin') {
      if (art.coin) drawCentered(ctx, art.coin, W / 2 + 40, H * 0.5, 28 * a, 28 * a);
      else {
        ctx.fillStyle = P.coin;
        ctx.beginPath();
        ctx.arc(W / 2 + 40, H * 0.5, 10 * a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (f.kind === 'land') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(W / 2, H * 0.62, 50 * (1 - a), 14 * (1 - a), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, state, view.time);
}

loadArt()
  .catch((err) => {
    console.warn(err);
    art.ready = false;
  })
  .finally(() => {
    mountGame({
      title: CONFIG.title,
      description:
        '약 1분 동안 워터슬라이드를 달려 수영장으로 골인하세요! 점프로 장애물을 넘고, 노란 점프 구간 6곳에서는 지름길로 약 2초씩 단축할 수 있어요.',
      controls:
        '터치: 좌우 드래그로 이동, 오른쪽 아래 점프 버튼 · PC: ←→ 또는 A/D 이동, 스페이스/↑ 점프 · 빨간 장애물은 점프로 회피, 노란 구간은 점프 지름길, 초록 패드는 가속! 가장자리를 조심하세요.',
      width: W,
      height: H,
      theme: {
        background: P.background,
        primary: P.primary,
        text: P.text,
        surface: P.surface,
      },
      create: createGame,
      update: updateGame,
      render,
    });
  });
