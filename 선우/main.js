import { mountGame } from './game-shell.js';
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

const ASSET_PATHS = {
  background: 'assets/background.png',
  slideTile: 'assets/slide_tile.png',
  pool: 'assets/objects/pool.png',
  boost: 'assets/objects/boost_pad.png',
  coin: 'assets/objects/coin.png',
  obstacle: 'assets/objects/obstacle.png',
  obstacleHit: 'assets/objects/obstacle_hit.png',
  jumpButton: 'assets/objects/jump_button.png',
  landing: 'assets/objects/landing_ring.png',
  shortcut: 'assets/objects/shortcut_marker.png',
  splash: 'assets/objects/splash.png',
  hud: 'assets/objects/hud_panel.png',
  sunny: 'assets/characters/sunny.png',
  mint: 'assets/characters/mint.png',
  coral: 'assets/characters/coral.png',
  violet: 'assets/characters/violet.png',
  gold: 'assets/characters/gold.png',
  wave: 'assets/characters/wave.png',
  splashChar: 'assets/characters/splash.png',
  sunbeam: 'assets/characters/sunbeam.png',
};

const images = {};
let assetsReady = false;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadAssets() {
  const entries = Object.entries(ASSET_PATHS);
  await Promise.all(
    entries.map(async ([key, path]) => {
      images[key] = await loadImage(path);
    }),
  );
  assetsReady = true;
}

loadAssets();

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

function drawImg(ctx, img, x, y, w, h, alpha = 1) {
  if (!img) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.restore();
  return true;
}

function racerSprite(racer, state) {
  if (racer.isPlayer) {
    const key = state.save.selected;
    return images[key] || images.sunny;
  }
  const map = { 파도: 'wave', 스플래시: 'splashChar', 썬빔: 'sunbeam' };
  return images[map[racer.name]] || images.sunny;
}

function drawSky(ctx, cameraProgress) {
  if (images.background) {
    const drift = ((cameraProgress * 0.04) % H);
    ctx.drawImage(images.background, 0, -drift, W, H);
    ctx.drawImage(images.background, 0, H - drift, W, H);
    ctx.fillStyle = 'rgba(255, 230, 245, 0.18)';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#ffd6ec');
  sky.addColorStop(0.4, '#d8f3ff');
  sky.addColorStop(1, '#b8e8f5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

function drawPool(ctx, cameraProgress) {
  const finish = CONFIG.track.length;
  const s = worldToScreen(finish, 0, cameraProgress);
  if (s.y < -40 || s.y > H + 80) return;
  if (drawImg(ctx, images.pool, s.cx, s.y + 10 * s.scale, 180 * s.scale, 100 * s.scale)) {
    ctx.fillStyle = '#5a4a6a';
    ctx.font = `800 ${Math.round(15 * s.scale)}px "Pretendard","Malgun Gothic",sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('수영장 골인', s.cx, s.y - 24 * s.scale);
    return;
  }
  const rw = 160 * s.scale;
  const rh = 70 * s.scale;
  ctx.fillStyle = '#9adfff';
  ctx.beginPath();
  ctx.ellipse(s.cx, s.y + 20 * s.scale, rw, rh, 0, 0, Math.PI * 2);
  ctx.fill();
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

  const body = ctx.createLinearGradient(0, 0, W, 0);
  body.addColorStop(0, '#ffb8d4');
  body.addColorStop(0.2, '#ffd7e8');
  body.addColorStop(0.5, '#e8fbff');
  body.addColorStop(0.8, '#d4f0ff');
  body.addColorStop(1, '#c5e4ff');
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();

  if (images.slideTile) {
    for (let i = 0; i < left.length; i += 3) {
      const mid = worldToScreen(left[i].t, 0, cameraProgress);
      const tw = mid.half * 1.7;
      const th = 28 * mid.scale;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(images.slideTile, mid.cx - tw / 2, mid.y - th / 2, tw, th);
      ctx.restore();
    }
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
  water.addColorStop(0, '#9ad8f0');
  water.addColorStop(0.4, '#c8f4ff');
  water.addColorStop(1, '#a8e8f8');
  ctx.fillStyle = water;
  ctx.fill();

  for (const edge of [left, right]) {
    ctx.beginPath();
    edge.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.strokeStyle = '#f7a8c8';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.strokeStyle = '#ffe8f2';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  for (let i = 0; i < left.length; i += 2) {
    const point = worldToScreen(left[i].t, 0, cameraProgress);
    const wave = Math.sin(left[i].t * 0.08 - time * 3) * 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
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

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
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
    ctx.fillStyle = 'rgba(255, 210, 230, 0.35)';
    roundRect(ctx, a.cx - a.half * 0.9, Math.min(a.y, b.y), a.half * 1.8, Math.abs(a.y - b.y) + 8, 10);
    ctx.fill();
    drawImg(ctx, images.shortcut, a.cx, (a.y + b.y) / 2, 48 * a.scale, 48 * a.scale, 0.9);
    ctx.fillStyle = '#7a5a88';
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↗ 지금 점프!', a.cx, (a.y + b.y) / 2 - 18);
    const landing = worldToScreen(z.land, z.landLane, cameraProgress);
    if (landing.y > 75 && landing.y < H - 40) {
      drawImg(ctx, images.landing, landing.x, landing.y, 44 * landing.scale, 24 * landing.scale);
    }
  }
}

function drawPickups(ctx, state, cameraProgress) {
  for (const b of state.pickups.boosts) {
    if (b.taken) continue;
    const p = worldToScreen(b.t, b.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    if (!drawImg(ctx, images.boost, p.x, p.y, 36 * p.scale, 24 * p.scale)) {
      ctx.fillStyle = P.boost;
      roundRect(ctx, p.x - 16 * p.scale, p.y - 10 * p.scale, 32 * p.scale, 20 * p.scale, 6);
      ctx.fill();
    }
  }
  for (const o of state.pickups.obstacles) {
    const p = worldToScreen(o.t, o.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    const img = o.hit ? images.obstacleHit : images.obstacle;
    if (!drawImg(ctx, img, p.x, p.y, 30 * p.scale, 30 * p.scale)) {
      ctx.fillStyle = o.hit ? '#c5b8c8' : '#ff9ab8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const c of state.pickups.coins) {
    if (c.taken) continue;
    const p = worldToScreen(c.t, c.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    if (!drawImg(ctx, images.coin, p.x, p.y, 18 * p.scale, 18 * p.scale)) {
      ctx.fillStyle = P.coin;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRacer(ctx, racer, cameraProgress, time, state) {
  if (racer.fallen && racer.splash <= 0) return;
  const p = worldToScreen(racer.progress, racer.lane, cameraProgress);
  if (p.y < -40 || p.y > H + 50) return;

  const s = p.scale * (racer.airborne ? 1.32 : 1);
  const jumpT = CONFIG.rules.jumpDuration;
  const bob = racer.airborne ? -52 * Math.sin(Math.min(1, racer.airTimer / jumpT) * Math.PI) * s : 0;
  const x = p.x;
  const y = p.y + bob;

  if (racer.fallen) {
    drawImg(ctx, images.splash, x, y, 56 * s, 36 * s, racer.splash);
    return;
  }

  ctx.fillStyle = 'rgba(120, 90, 140, 0.18)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 8 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const sprite = racerSprite(racer, state);
  const size = 64 * s;
  if (racer.bumpFlash > 0) ctx.globalAlpha = 0.75 + Math.sin(time * 40) * 0.25;
  if (!drawImg(ctx, sprite, x, y, size, size)) {
    ctx.fillStyle = racer.tube;
    ctx.beginPath();
    ctx.ellipse(x, y + 6 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = racer.body;
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 11 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (racer.boostTimer > 0) {
    ctx.strokeStyle = `rgba(180, 255, 210, ${0.45 + Math.sin(time * 20) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (racer.isPlayer) {
    ctx.fillStyle = P.primary;
    ctx.font = '800 12px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼', x, y - 34 * s);
  } else {
    ctx.fillStyle = '#6a5578';
    ctx.font = '700 11px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(racer.name, x, y - 32 * s);
  }
}

function drawHud(ctx, state) {
  const player = state.racers.find((r) => r.isPlayer);
  const place = player ? placeOf(state, player) : '-';
  const ranks = rankList(state);

  if (images.hud) {
    ctx.drawImage(images.hud, 8, 6, W - 16, 64);
  } else {
    ctx.fillStyle = 'rgba(255, 230, 245, 0.72)';
    roundRect(ctx, 12, 12, W - 24, 54, 14);
    ctx.fill();
  }
  ctx.fillStyle = '#6a4a78';
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
    ctx.fillStyle = r.isPlayer ? '#d48ab8' : '#7a6a88';
    ctx.fillText(`${i + 1}. ${r.name}`, 26, 86 + i * 16);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
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
  if (!drawImg(ctx, images.jumpButton, jx, jy, 72, 72, jumpReady ? 1 : 0.55)) {
    ctx.fillStyle = jumpReady ? (inShortcut ? '#b8f5c8' : P.primary) : '#d0c4d8';
    ctx.beginPath();
    ctx.arc(jx, jy, 28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#6a4a78';
  ctx.font = '800 12px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(jumpReady ? (inShortcut ? '숏컷!' : '점프') : '착지', jx, jy + 38);

  ctx.fillStyle = 'rgba(255, 236, 248, 0.88)';
  roundRect(ctx, 16, H - 136, W - 32, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#8a6a98';
  ctx.font = '700 12px "Malgun Gothic",sans-serif';
  const jumpHint = inShortcut
    ? '분홍 구간! 지금 점프하면 지름길로 착지'
    : nextShortcut
      ? `장애물은 점프 · 다음 숏컷 ${Math.ceil(Math.max(0, nextShortcut.from - player.progress) / CONFIG.rules.baseSpeed)}초 뒤`
      : '장애물은 점프로 넘고 수영장까지 달려요!';
  ctx.fillText(jumpHint, W / 2, H - 114);

  if (state.toast) {
    ctx.fillStyle = 'rgba(120, 90, 140, 0.45)';
    roundRect(ctx, 40, H * 0.28, W - 80, 40, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 15px "Malgun Gothic",sans-serif';
    ctx.fillText(state.toast, W / 2, H * 0.28 + 26);
  }

  if (state.countdown > 0) {
    ctx.fillStyle = 'rgba(255, 220, 240, 0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e89ac8';
    ctx.font = '800 64px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    const n = Math.ceil(state.countdown);
    ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.38);
    ctx.fillStyle = 'rgba(255, 240, 250, 0.9)';
    roundRect(ctx, 16, H - 168, W - 32, 140, 16);
    ctx.fill();
    ctx.fillStyle = '#7a5a88';
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.fillText(`약 1분 레이스 · 보유 ${state.save.coins}코인 · 스킨 선택`, W / 2, H - 146);
    ctx.fillText('장애물은 점프! 분홍 구간에서는 지름길!', W / 2, H * 0.46);
    SKINS.forEach((skin, i) => {
      const bx = 28 + i * 68;
      const by = H - 130;
      const owned = state.save.unlocked.includes(skin.id);
      const selected = state.save.selected === skin.id;
      ctx.fillStyle = selected ? P.primary : owned ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)';
      roundRect(ctx, bx, by, 58, 70, 10);
      ctx.fill();
      const skinImg = images[skin.id];
      if (skinImg) ctx.drawImage(skinImg, bx + 5, by + 4, 48, 48);
      else {
        ctx.fillStyle = skin.body;
        ctx.beginPath();
        ctx.arc(bx + 29, by + 24, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#5a4a68';
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
  for (const r of sorted) drawRacer(ctx, r, state.cameraProgress, view.time, state);

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
      drawImg(ctx, images.coin, W / 2 + 40, H * 0.5, 20 * a, 20 * a);
    } else if (f.kind === 'land') {
      drawImg(ctx, images.splash, W / 2, H * 0.62, 70 * (1 - a), 30 * (1 - a));
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, state);
  if (!assetsReady) {
    ctx.fillStyle = 'rgba(255,240,250,0.5)';
    ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = '#8a6a98';
    ctx.font = '600 12px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('파스텔 그림 불러오는 중…', W / 2, 16);
  }
}

mountGame({
  title: CONFIG.title,
  description:
    '약 1분 동안 워터슬라이드를 달려 수영장으로 골인하세요! 점프로 장애물을 넘고, 노란 점프 구간 6곳에서는 지름길로 약 2초씩 단축할 수 있어요.',
  controls:
    '터치: 좌우 드래그로 이동, 오른쪽 아래 점프 버튼 · PC: ←→ 또는 A/D 이동, 스페이스/↑ 점프 · 빨간 장애물은 점프로 회피, 노란 구간은 점프 지름길, 초록 패드는 가속! 가장자리에 닿으면 튕겨요.',
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
