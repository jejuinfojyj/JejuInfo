import { CONFIG } from './config.mjs';
import { getBallSkin } from './game.mjs';

const HR = CONFIG.hoop.radius;
const RT = CONFIG.hoop.rimThickness;

let ART = null;

export function setArt(art) {
  ART = art;
}

function withPixel(ctx, draw) {
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  draw();
  ctx.imageSmoothingEnabled = prev;
}

function drawCentered(ctx, img, cx, cy, dw, dh) {
  if (!img) return false;
  withPixel(ctx, () => {
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  });
  return true;
}

function drawCourt(ctx, w, h, cameraY) {
  if (ART?.court) {
    withPixel(ctx, () => {
      const img = ART.court;
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const ox = (w - dw) / 2;
      const oy = (h - dh) / 2 - (cameraY % Math.max(48, dh * 0.08)) * 0.2;
      ctx.drawImage(img, ox, oy, dw, dh);
    });
    return;
  }

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#152238');
  g.addColorStop(0.45, CONFIG.palette.background);
  g.addColorStop(1, '#0f1a2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawHoop(ctx, hoop, cameraY, target) {
  const x = hoop.x;
  const y = hoop.y - cameraY;
  const rimW = HR * 2.55;
  const rimH = rimW * (285 / 512);
  const boardW = 72;
  const boardH = boardW * (422 / 512);
  const netW = HR * 2.2;
  const netH = 58;
  const netDrop = 34 + Math.sin((hoop.netPulse || 0) / 0.4 * Math.PI) * 15;

  if (ART?.backboard) {
    drawCentered(ctx, ART.backboard, x, y - 34, boardW, boardH);
    if (target) {
      ctx.strokeStyle = 'rgba(255,212,71,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - boardW / 2 - 2, y - 34 - boardH / 2 - 2, boardW + 4, boardH + 4);
    }
  } else {
    ctx.fillStyle = 'rgba(244,247,255,0.18)';
    ctx.fillRect(x - 28, y - 52, 56, 36);
    ctx.strokeStyle = target ? 'rgba(255,212,71,0.8)' : 'rgba(244,247,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 28, y - 52, 56, 36);
    ctx.strokeRect(x - 12, y - 40, 24, 16);
  }

  if (ART?.rimBack) {
    drawCentered(ctx, ART.rimBack, x, y, rimW, rimH);
  } else if (ART?.rim) {
    drawCentered(ctx, ART.rim, x, y, rimW, rimH);
  }

  if (ART?.net) {
    const bounce = netDrop - 34;
    drawCentered(ctx, ART.net, x, y + 18 + bounce * 0.35, netW, netH + bounce * 0.4);
  } else {
    ctx.strokeStyle = 'rgba(244,247,255,0.55)';
    ctx.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (i * (HR - 5)) / 3, y + 2);
      ctx.quadraticCurveTo(x + i * 7, y + netDrop * 0.65, x + i * 4, y + netDrop);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - HR + 4, y + 2);
    ctx.quadraticCurveTo(x, y + 18, x + HR - 4, y + 2);
    ctx.stroke();
  }

  if (!ART?.rimBack && !ART?.rim) {
    ctx.strokeStyle = CONFIG.palette.rim;
    ctx.lineWidth = RT;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(x, y, HR, HR * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,200,160,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 1, HR - 4, HR * 0.2, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRimFront(ctx, hoop, cameraY) {
  const x = hoop.x;
  const y = hoop.y - cameraY;
  const rimW = HR * 2.55;
  const rimH = rimW * (285 / 512);
  if (ART?.rimFront) {
    drawCentered(ctx, ART.rimFront, x, y, rimW, rimH);
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
  const size = 26 * pulse;
  if (ART?.star) {
    drawCentered(ctx, ART.star, x, y, size, size);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.rotate(star.pulse * 0.15);
  ctx.fillStyle = CONFIG.palette.star;
  ctx.shadowColor = CONFIG.palette.accent;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const b = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
    ctx.lineTo(Math.cos(b) * 5, Math.sin(b) * 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx, state) {
  const ball = state.ball;
  const skin = getBallSkin(state);
  const x = ball.x;
  const y = ball.y - state.cameraY;
  const r = CONFIG.physics.ballRadius;

  if (state.flames > 0.15 && !ball.resting) {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      ctx.globalAlpha = (0.4 - t * 0.06) * state.flames;
      if (ART?.flame) {
        const s = r * (2.2 - t * 0.35);
        drawCentered(
          ctx,
          ART.flame,
          x - ball.vx * t * 0.02,
          y - ball.vy * t * 0.02 + 8 + i * 4,
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

  const ballImg = ART?.balls?.[skin.id];
  if (ballImg) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ball.spinning);
    withPixel(ctx, () => {
      ctx.drawImage(ballImg, -r, -r, r * 2, r * 2);
    });
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ball.spinning);
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, skin.colors[0]);
  grad.addColorStop(1, skin.colors[1] || skin.colors[0]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r + 2, 0);
  ctx.quadraticCurveTo(0, -6, r - 2, 0);
  ctx.moveTo(0, -r + 2);
  ctx.quadraticCurveTo(4, 0, 0, r - 2);
  ctx.stroke();
  ctx.restore();
}

function drawAim(ctx, state) {
  if (!state.aim.pulling || !state.aim.path.length) return;
  const hoop = state.hoops[state.currentIndex];
  ctx.strokeStyle = 'rgba(255,212,71,0.55)';
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
    ctx.fillStyle = `rgba(255,244,214,${0.15 + a * 0.55})`;
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
  ctx.fillStyle = 'rgba(10,16,28,0.45)';
  ctx.fillRect(12, 12, w - 24, 54);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeRect(12.5, 12.5, w - 25, 53);

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 22px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score), 24, 48);

  ctx.font = '600 13px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = 'rgba(255,247,234,0.7)';
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
  ctx.fillStyle = 'rgba(255,247,234,0.55)';
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
  drawCourt(ctx, w, h, state.cameraY);

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
  for (const hoop of visible) drawHoop(ctx, hoop, cam, hoop.index === state.currentIndex + 1);

  drawAim(ctx, state);
  drawBall(ctx, state);
  for (const hoop of visible) drawRimFront(ctx, hoop, cam);

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
    ctx.fillStyle = `rgba(255,138,61,${state.flash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
  drawHud(ctx, state, w);
}
