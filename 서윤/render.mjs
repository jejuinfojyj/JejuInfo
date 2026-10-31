import { CONFIG } from './config.mjs';
import { getBallSkin } from './game.mjs';
import { ART, ballImage } from './assets.mjs';
import { drawImageCover } from './game-tools.js';

const HR = CONFIG.hoop.radius;
const RT = CONFIG.hoop.rimThickness;

function drawCourt(ctx, w, h, cameraY, time) {
  const court = ART.images.court;
  if (court) {
    ctx.save();
    const shift = ((cameraY * 0.12) % h + h) % h;
    ctx.translate(0, -shift);
    drawImageCover(ctx, court, 0, 0, w, h + 2);
    drawImageCover(ctx, court, 0, h, w, h + 2);
    ctx.restore();
    ctx.fillStyle = 'rgba(8, 28, 48, 0.28)';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a3a55');
  g.addColorStop(0.45, CONFIG.palette.background);
  g.addColorStop(1, '#0c2438');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(0, -cameraY * 0.15);
  ctx.strokeStyle = 'rgba(180,230,255,0.08)';
  ctx.lineWidth = 2;
  for (let y = -200; y < h + 400; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y + (time * 12) % 48);
    ctx.lineTo(w, y + (time * 12) % 48);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHoopBack(ctx, hoop, cameraY, target) {
  const x = hoop.x;
  const y = hoop.y - cameraY;
  const board = ART.images.backboard;
  const rimBack = ART.images.rimBack || ART.images.rim;
  const net = ART.images.net;
  const netDrop = 34 + Math.sin(((hoop.netPulse || 0) / 0.4) * Math.PI) * 15;

  if (board) {
    const bw = 72;
    const bh = 58;
    ctx.save();
    if (target) {
      ctx.shadowColor = 'rgba(120, 220, 255, 0.85)';
      ctx.shadowBlur = 16;
    }
    ctx.drawImage(board, x - bw / 2, y - 58, bw, bh);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(190,235,255,0.22)';
    ctx.fillRect(x - 28, y - 52, 56, 36);
    ctx.strokeStyle = target ? 'rgba(160,230,255,0.9)' : 'rgba(190,235,255,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 28, y - 52, 56, 36);
  }

  if (rimBack) {
    const rw = HR * 2.35;
    const rh = HR * 0.95;
    ctx.drawImage(rimBack, x - rw / 2, y - rh * 0.45, rw, rh);
  }

  if (net) {
    const nw = HR * 1.85;
    const nh = netDrop + 18;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(net, x - nw / 2, y - 2, nw, nh);
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = 'rgba(220,245,255,0.6)';
    ctx.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (i * (HR - 5)) / 3, y + 2);
      ctx.quadraticCurveTo(x + i * 7, y + netDrop * 0.65, x + i * 4, y + netDrop);
      ctx.stroke();
    }
  }
}

function drawHoopFront(ctx, hoop, cameraY) {
  const x = hoop.x;
  const y = hoop.y - cameraY;
  const rimFront = ART.images.rimFront || ART.images.rim;
  if (rimFront) {
    const rw = HR * 2.35;
    const rh = HR * 0.95;
    ctx.drawImage(rimFront, x - rw / 2, y - rh * 0.45, rw, rh);
    return;
  }
  ctx.strokeStyle = CONFIG.palette.rim;
  ctx.lineWidth = RT;
  ctx.beginPath();
  ctx.ellipse(x, y, HR, HR * 0.28, 0, 0, Math.PI);
  ctx.stroke();
}

function drawStar(ctx, star, cameraY) {
  if (star.taken) return;
  const x = star.x;
  const y = star.y - cameraY;
  const pulse = 1 + Math.sin(star.pulse) * 0.12;
  const img = ART.images.star;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.rotate(star.pulse * 0.15);
  if (img) {
    ctx.drawImage(img, -14, -14, 28, 28);
  } else {
    ctx.fillStyle = CONFIG.palette.star;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const b = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.lineTo(Math.cos(b) * 5, Math.sin(b) * 5);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBall(ctx, state) {
  const ball = state.ball;
  const skin = getBallSkin(state);
  const x = ball.x;
  const y = ball.y - state.cameraY;
  const r = CONFIG.physics.ballRadius;
  const img = ballImage(skin.id);

  if (state.flames > 0.15 && !ball.resting) {
    const flame = ART.images.flame;
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      ctx.globalAlpha = (0.4 - t * 0.05) * state.flames;
      if (flame) {
        const s = r * (1.6 - t * 0.25);
        ctx.drawImage(
          flame,
          x - ball.vx * t * 0.02 - s / 2,
          y - ball.vy * t * 0.02 + 4 + i * 3 - s / 2,
          s,
          s,
        );
      } else {
        ctx.fillStyle = i % 2 ? CONFIG.palette.accent : CONFIG.palette.flame;
        ctx.beginPath();
        ctx.ellipse(
          x - ball.vx * t * 0.02,
          y - ball.vy * t * 0.02 + 6 + i * 3,
          r * (1 - t * 0.2),
          r * (1.2 - t * 0.1),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ball.spinning);
  if (img) {
    ctx.drawImage(img, -r - 2, -r - 2, r * 2 + 4, r * 2 + 4);
  } else {
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, skin.colors[0]);
    grad.addColorStop(1, skin.colors[1] || skin.colors[0]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAim(ctx, state) {
  if (!state.aim.pulling || !state.aim.path.length) return;
  const hoop = state.hoops[state.currentIndex];
  ctx.strokeStyle = 'rgba(160,230,255,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(hoop.x, hoop.y - state.cameraY);
  ctx.lineTo(state.ball.x, state.ball.y - state.cameraY);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < state.aim.path.length; i++) {
    const p = state.aim.path[i];
    const a = 1 - i / state.aim.path.length;
    ctx.fillStyle = `rgba(210,245,255,${0.15 + a * 0.55})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y - state.cameraY, 2.5 + a * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const power = Math.min(1, Math.hypot(state.aim.pullX, state.aim.pullY) / CONFIG.physics.maxPull);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(18, CONFIG.height - 28, 120, 8);
  ctx.fillStyle = power > 0.85 ? CONFIG.palette.flame : CONFIG.palette.primary;
  ctx.fillRect(18, CONFIG.height - 28, 120 * power, 8);
}

function drawHud(ctx, state, w) {
  ctx.fillStyle = 'rgba(8,24,40,0.5)';
  ctx.fillRect(12, 12, w - 24, 54);
  ctx.strokeStyle = 'rgba(170,230,255,0.15)';
  ctx.strokeRect(12.5, 12.5, w - 25, 53);

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 22px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score), 24, 48);

  ctx.font = '600 13px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = 'rgba(230,248,255,0.75)';
  ctx.fillText(`최고 ${state.highScore}`, 24, 28);

  ctx.textAlign = 'right';
  ctx.fillStyle = CONFIG.palette.star;
  ctx.font = '700 16px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(`★ ${state.totalStars}`, w - 24, 36);

  if (state.combo > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.palette.flame;
    ctx.font = '800 18px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(`클린 ×${state.combo}`, w * 0.5, 48);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(230,248,255,0.55)';
  ctx.font = '12px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText('끌어서 발사 · Q/E 공 바꾸기', 18, CONFIG.height - 40);
}

export function renderGame(ctx, state, view) {
  const w = view.width;
  const h = view.height;
  let shakeX = 0;
  let shakeY = 0;
  if (state.shake > 0) {
    shakeX = (Math.random() - 0.5) * 10 * state.shake * 5;
    shakeY = (Math.random() - 0.5) * 10 * state.shake * 5;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawCourt(ctx, w, h, state.cameraY, state.time);

  const cam = state.cameraY;
  const visible = state.hoops.filter((hoop) => {
    const y = hoop.y - cam;
    return y > -80 && y < h + 80;
  });

  for (const star of state.stars) {
    const y = star.y - cam;
    if (y > -40 && y < h + 40) drawStar(ctx, star, cam);
  }

  visible.sort((a, b) => a.y - b.y);
  for (const hoop of visible) {
    const isTarget =
      hoop.index === state.currentIndex + 1 || hoop.index === state.currentIndex + 2;
    drawHoopBack(ctx, hoop, cam, isTarget);
  }

  drawAim(ctx, state);
  drawBall(ctx, state);

  for (const hoop of visible) drawHoopFront(ctx, hoop, cam);

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - cam, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const t of state.floatTexts) {
    ctx.globalAlpha = Math.max(0, t.life);
    ctx.fillStyle = t.color;
    ctx.font = '800 18px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y - cam);
  }
  ctx.globalAlpha = 1;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(140,210,255,${state.flash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
  drawHud(ctx, state, w);
}
