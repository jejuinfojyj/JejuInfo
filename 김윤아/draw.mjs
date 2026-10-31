import { CONFIG, ITEMS, itemById } from './config.mjs';
import { layout } from './game.mjs';

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawRoom(ctx, theme, width, height) {
  const [a, b] = theme.bg;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // soft wall panels
  ctx.fillStyle = '#ffffff55';
  roundRect(ctx, 24, 88, width - 48, 390, 28);
  ctx.fill();

  // floor
  ctx.fillStyle = '#00000012';
  ctx.beginPath();
  ctx.ellipse(width / 2, 455, 140, 22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHair(ctx, cx, cy, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'long') {
    roundRect(ctx, cx - 48, cy - 18, 96, 110, 40);
    ctx.fill();
  } else if (item.style === 'bun') {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 44, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 34, 18, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.style === 'cap') {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 46, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = item.color;
    roundRect(ctx, cx - 50, cy - 18, 100, 22, 10);
    ctx.fill();
    ctx.fillStyle = '#ef7a6b';
    roundRect(ctx, cx - 18, cy - 28, 36, 14, 6);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 46, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFace(ctx, cx, cy) {
  ctx.fillStyle = CONFIG.palette.skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 40, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d2a2f';
  ctx.beginPath();
  ctx.arc(cx - 14, cy + 14, 4, 0, Math.PI * 2);
  ctx.arc(cx + 14, cy + 14, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9848a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy + 28, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#f0a0a088';
  ctx.beginPath();
  ctx.ellipse(cx - 22, cy + 28, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 22, cy + 28, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTop(ctx, cx, bodyY, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'dress') {
    ctx.beginPath();
    ctx.moveTo(cx - 42, bodyY);
    ctx.lineTo(cx + 42, bodyY);
    ctx.lineTo(cx + 70, bodyY + 150);
    ctx.lineTo(cx - 70, bodyY + 150);
    ctx.closePath();
    ctx.fill();
    return 'dress';
  }
  if (item.style === 'hoodie') {
    roundRect(ctx, cx - 48, bodyY - 8, 96, 108, 22);
    ctx.fill();
    ctx.fillStyle = '#ffffff55';
    roundRect(ctx, cx - 22, bodyY + 18, 44, 36, 10);
    ctx.fill();
    return null;
  }
  if (item.style === 'tank') {
    roundRect(ctx, cx - 36, bodyY + 4, 72, 96, 16);
    ctx.fill();
    return null;
  }
  if (item.style === 'sweater') {
    roundRect(ctx, cx - 50, bodyY - 4, 100, 110, 18);
    ctx.fill();
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 40, bodyY + 18 + i * 18);
      ctx.lineTo(cx + 40, bodyY + 18 + i * 18);
      ctx.stroke();
    }
    return null;
  }
  // shirt
  roundRect(ctx, cx - 44, bodyY, 88, 100, 16);
  ctx.fill();
  ctx.fillStyle = '#dfe8f5';
  ctx.beginPath();
  ctx.moveTo(cx, bodyY);
  ctx.lineTo(cx - 16, bodyY + 28);
  ctx.lineTo(cx + 16, bodyY + 28);
  ctx.closePath();
  ctx.fill();
  return null;
}

function drawBottom(ctx, cx, hipY, item, skip) {
  if (skip === 'dress') return;
  ctx.fillStyle = item.color;
  if (item.style === 'skirt') {
    ctx.beginPath();
    ctx.moveTo(cx - 36, hipY);
    ctx.lineTo(cx + 36, hipY);
    ctx.lineTo(cx + 58, hipY + 70);
    ctx.lineTo(cx - 58, hipY + 70);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (item.style === 'shorts') {
    roundRect(ctx, cx - 40, hipY, 36, 48, 12);
    ctx.fill();
    roundRect(ctx, cx + 4, hipY, 36, 48, 12);
    ctx.fill();
    return;
  }
  // jeans / sweats
  roundRect(ctx, cx - 40, hipY, 36, 100, 12);
  ctx.fill();
  roundRect(ctx, cx + 4, hipY, 36, 100, 12);
  ctx.fill();
  if (item.style === 'jeans') {
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 22, hipY + 20);
    ctx.lineTo(cx - 22, hipY + 90);
    ctx.moveTo(cx + 22, hipY + 20);
    ctx.lineTo(cx + 22, hipY + 90);
    ctx.stroke();
  }
}

function drawShoes(ctx, cx, footY, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'boots') {
    roundRect(ctx, cx - 48, footY - 36, 40, 50, 10);
    ctx.fill();
    roundRect(ctx, cx + 8, footY - 36, 40, 50, 10);
    ctx.fill();
    return;
  }
  if (item.style === 'heels') {
    roundRect(ctx, cx - 46, footY - 8, 38, 16, 6);
    ctx.fill();
    roundRect(ctx, cx + 8, footY - 8, 38, 16, 6);
    ctx.fill();
    ctx.fillRect(cx - 14, footY + 4, 6, 12);
    ctx.fillRect(cx + 40, footY + 4, 6, 12);
    return;
  }
  if (item.style === 'sandals') {
    roundRect(ctx, cx - 46, footY - 4, 38, 12, 5);
    ctx.fill();
    roundRect(ctx, cx + 8, footY - 4, 38, 12, 5);
    ctx.fill();
    return;
  }
  roundRect(ctx, cx - 48, footY - 10, 40, 18, 8);
  ctx.fill();
  roundRect(ctx, cx + 8, footY - 10, 40, 18, 8);
  ctx.fill();
}

function drawAcc(ctx, cx, cy, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'bag') {
    roundRect(ctx, cx + 56, cy + 110, 34, 44, 8);
    ctx.fill();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx + 73, cy + 110, 14, Math.PI, 0);
    ctx.stroke();
  } else if (item.style === 'umbrella') {
    ctx.beginPath();
    ctx.moveTo(cx - 90, cy + 40);
    ctx.quadraticCurveTo(cx - 50, cy - 10, cx - 10, cy + 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a3a2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 40);
    ctx.lineTo(cx - 50, cy + 150);
    ctx.stroke();
  } else if (item.style === 'scarf') {
    roundRect(ctx, cx - 34, cy + 58, 68, 18, 8);
    ctx.fill();
    roundRect(ctx, cx + 10, cy + 72, 18, 46, 6);
    ctx.fill();
  } else if (item.style === 'bow') {
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy - 8, 16, 12, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 18, cy - 8, 16, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.style === 'shades') {
    ctx.fillStyle = '#222222cc';
    roundRect(ctx, cx - 28, cy + 8, 22, 14, 4);
    ctx.fill();
    roundRect(ctx, cx + 6, cy + 8, 22, 14, 4);
    ctx.fill();
    ctx.fillRect(cx - 6, cy + 12, 12, 4);
  }
}

export function drawCharacter(ctx, outfit, cx = 240, cy = 160) {
  const hair = itemById('hair', outfit.hair);
  const top = itemById('top', outfit.top);
  const bottom = itemById('bottom', outfit.bottom);
  const shoes = itemById('shoes', outfit.shoes);
  const acc = itemById('acc', outfit.acc);

  if (hair) drawHair(ctx, cx, cy, hair);
  drawFace(ctx, cx, cy);
  // neck
  ctx.fillStyle = CONFIG.palette.skin;
  roundRect(ctx, cx - 12, cy + 54, 24, 18, 6);
  ctx.fill();

  const bodyY = cy + 70;
  const dressFlag = top ? drawTop(ctx, cx, bodyY, top) : null;
  if (bottom) drawBottom(ctx, cx, bodyY + 88, bottom, dressFlag);
  // arms
  ctx.fillStyle = CONFIG.palette.skin;
  roundRect(ctx, cx - 62, bodyY + 10, 18, 70, 9);
  ctx.fill();
  roundRect(ctx, cx + 44, bodyY + 10, 18, 70, 9);
  ctx.fill();
  if (shoes) drawShoes(ctx, cx, bodyY + 188, shoes);
  if (acc) drawAcc(ctx, cx, cy, acc);
}

export function drawHud(ctx, state, theme) {
  const { width } = CONFIG;
  // theme card
  roundRect(ctx, 20, 18, width - 40, 62, 16);
  ctx.fillStyle = CONFIG.palette.surface;
  ctx.fill();
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '700 18px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`오늘의 약속 · ${theme.title}`, 36, 44);
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.font = '600 13px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(`${state.round + 1} / ${state.queue.length} · 별 ${state.totalStars}`, 36, 66);

  if (state.toastLife > 0 && state.toast) {
    const alpha = Math.min(1, state.toastLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    roundRect(ctx, 40, 448, width - 80, 28, 12);
    ctx.fillStyle = '#3d2a2fee';
    ctx.fill();
    ctx.fillStyle = '#fff7f0';
    ctx.font = '600 13px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, width / 2, 467);
    ctx.restore();
  }
}

export function drawPanel(ctx, state) {
  const L = layout();
  const { width } = CONFIG;

  roundRect(ctx, 12, 498, width - 24, 230, 22);
  ctx.fillStyle = CONFIG.palette.surface;
  ctx.fill();

  CONFIG.categories.forEach((cat, i) => {
    const x = 18 + i * L.tabW;
    const active = state.category === cat.id;
    roundRect(ctx, x + 2, L.tabsY, L.tabW - 6, L.tabsH - 4, 12);
    ctx.fillStyle = active ? CONFIG.palette.primary : '#f0e0d4';
    ctx.fill();
    ctx.fillStyle = active ? '#fff7f0' : CONFIG.palette.text;
    ctx.font = '700 14px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cat.label, x + L.tabW / 2, L.tabsY + 28);
  });

  const items = ITEMS[state.category] || [];
  items.forEach((item, i) => {
    const x = 18 + i * (L.itemSlotW + 8);
    const selected = state.outfit[state.category] === item.id;
    roundRect(ctx, x, L.itemY, L.itemSlotW, L.itemH, 14);
    ctx.fillStyle = selected ? '#ffe8df' : '#fff';
    ctx.fill();
    ctx.strokeStyle = selected ? CONFIG.palette.primary : '#e8d2c4';
    ctx.lineWidth = selected ? 3 : 1;
    ctx.stroke();
    // mini swatch
    ctx.fillStyle = item.color;
    roundRect(ctx, x + 18, L.itemY + 10, 50, 34, 10);
    ctx.fill();
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '600 12px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, x + L.itemSlotW / 2, L.itemY + 64);
  });

  const btn = state.phase === 'dress' ? L.finish : L.next;
  const label = state.phase === 'dress' ? '코디 완성!' : (state.round + 1 >= state.queue.length ? '결과 보기' : '다음 약속');
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 14);
  ctx.fillStyle = CONFIG.palette.accent;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 16px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, btn.x + btn.w / 2, btn.y + 26);

  if (state.phase === 'reveal' && state.lastScore) {
    ctx.fillStyle = CONFIG.palette.primary;
    ctx.font = '700 22px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    const stars = '★'.repeat(state.lastScore.stars) + '☆'.repeat(CONFIG.maxStars - state.lastScore.stars);
    ctx.fillText(stars, width / 2, 448);
  }
}

export function drawSparkles(ctx, amount, width) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount);
  ctx.fillStyle = '#ffd27a';
  for (let i = 0; i < 12; i++) {
    const x = 80 + (i * 97) % (width - 120);
    const y = 120 + (i * 53) % 220;
    const s = 4 + (i % 3) * 2;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
