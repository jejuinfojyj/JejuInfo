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

function drawCatTail(ctx, cx, bodyY) {
  ctx.strokeStyle = CONFIG.palette.furDark;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 40, bodyY + 90);
  ctx.quadraticCurveTo(cx + 95, bodyY + 40, cx + 78, bodyY - 10);
  ctx.stroke();
  ctx.strokeStyle = CONFIG.palette.fur;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(cx + 40, bodyY + 90);
  ctx.quadraticCurveTo(cx + 95, bodyY + 40, cx + 78, bodyY - 10);
  ctx.stroke();
}

function drawCatBody(ctx, cx, bodyY) {
  const fur = CONFIG.palette.fur;
  const furDark = CONFIG.palette.furDark;
  // torso
  ctx.fillStyle = fur;
  roundRect(ctx, cx - 42, bodyY, 84, 108, 28);
  ctx.fill();
  // belly patch
  ctx.fillStyle = '#fff6ec';
  roundRect(ctx, cx - 22, bodyY + 28, 44, 58, 18);
  ctx.fill();
  // legs under clothes
  ctx.fillStyle = fur;
  roundRect(ctx, cx - 38, bodyY + 100, 32, 88, 14);
  ctx.fill();
  roundRect(ctx, cx + 6, bodyY + 100, 32, 88, 14);
  ctx.fill();
  // paws
  ctx.fillStyle = furDark;
  roundRect(ctx, cx - 42, bodyY + 178, 40, 16, 8);
  ctx.fill();
  roundRect(ctx, cx + 2, bodyY + 178, 40, 16, 8);
  ctx.fill();
}

function drawCatArms(ctx, cx, bodyY) {
  ctx.fillStyle = CONFIG.palette.fur;
  roundRect(ctx, cx - 64, bodyY + 18, 20, 72, 10);
  ctx.fill();
  roundRect(ctx, cx + 44, bodyY + 18, 20, 72, 10);
  ctx.fill();
  ctx.fillStyle = CONFIG.palette.furDark;
  roundRect(ctx, cx - 66, bodyY + 78, 24, 16, 8);
  ctx.fill();
  roundRect(ctx, cx + 42, bodyY + 78, 24, 16, 8);
  ctx.fill();
}

function drawCatHead(ctx, cx, cy) {
  const fur = CONFIG.palette.fur;
  // ears behind head
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy + 2);
  ctx.lineTo(cx - 58, cy - 38);
  ctx.lineTo(cx - 12, cy - 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 38, cy + 2);
  ctx.lineTo(cx + 58, cy - 38);
  ctx.lineTo(cx + 12, cy - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4a0b0';
  ctx.beginPath();
  ctx.moveTo(cx - 36, cy - 2);
  ctx.lineTo(cx - 50, cy - 30);
  ctx.lineTo(cx - 18, cy - 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 36, cy - 2);
  ctx.lineTo(cx + 50, cy - 30);
  ctx.lineTo(cx + 18, cy - 8);
  ctx.closePath();
  ctx.fill();

  // head
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, 44, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  // cheeks
  ctx.fillStyle = '#f0a0a066';
  ctx.beginPath();
  ctx.ellipse(cx - 26, cy + 28, 10, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 26, cy + 28, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#3d2a2f';
  ctx.beginPath();
  ctx.ellipse(cx - 15, cy + 12, 5, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 15, cy + 12, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 13, cy + 9, 2, 0, Math.PI * 2);
  ctx.arc(cx + 17, cy + 9, 2, 0, Math.PI * 2);
  ctx.fill();

  // nose + mouth
  ctx.fillStyle = CONFIG.palette.nose;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 22);
  ctx.lineTo(cx - 6, cy + 28);
  ctx.lineTo(cx + 6, cy + 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3d2a2f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 28);
  ctx.lineTo(cx, cy + 34);
  ctx.moveTo(cx, cy + 34);
  ctx.quadraticCurveTo(cx - 10, cy + 40, cx - 16, cy + 34);
  ctx.moveTo(cx, cy + 34);
  ctx.quadraticCurveTo(cx + 10, cy + 40, cx + 16, cy + 34);
  ctx.stroke();

  // whiskers
  ctx.strokeStyle = '#9a7b72aa';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 30);
  ctx.lineTo(cx - 48, cy + 24);
  ctx.moveTo(cx - 18, cy + 34);
  ctx.lineTo(cx - 48, cy + 36);
  ctx.moveTo(cx + 18, cy + 30);
  ctx.lineTo(cx + 48, cy + 24);
  ctx.moveTo(cx + 18, cy + 34);
  ctx.lineTo(cx + 48, cy + 36);
  ctx.stroke();
}

/** 얼굴 뒤에 깔리는 머리(옆·뒤로 흐르는 부분) */
function drawHairBack(ctx, cx, cy, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'long') {
    // 양옆·뒤로 흐르는 긴 머리 — 얼굴 영역은 비워 둠
    roundRect(ctx, cx - 56, cy + 8, 22, 88, 14);
    ctx.fill();
    roundRect(ctx, cx + 34, cy + 8, 22, 88, 14);
    ctx.fill();
    roundRect(ctx, cx - 48, cy + 48, 96, 52, 24);
    ctx.fill();
  } else if (item.style === 'bun') {
    // 얼굴 뒤쪽 둥근 머리 실루엣만
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 42, 36, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.style === 'cap') {
    // 모자 챙/캡은 얼굴 위에 그리므로 뒤에선 생략
  } else {
    // 단발: 뒤통수 짧은 털
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 40, 32, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
  }
}

/** 얼굴 위·앞쪽에만 올라가는 머리(앞머리·묶음·모자) — 눈·코를 가리지 않음 */
function drawHairFront(ctx, cx, cy, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'long') {
    // 이마 위 앞머리만
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 30, 14, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy + 2);
    ctx.quadraticCurveTo(cx - 10, cy + 14, cx, cy + 4);
    ctx.quadraticCurveTo(cx + 10, cy + 14, cx + 28, cy + 2);
    ctx.lineTo(cx + 24, cy - 4);
    ctx.lineTo(cx - 24, cy - 4);
    ctx.closePath();
    ctx.fill();
  } else if (item.style === 'bun') {
    // 정수리 묶음만 얼굴 위
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy - 14, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.style === 'cap') {
    // 모자: 이마 위쪽만, 눈보다 위
    roundRect(ctx, cx - 46, cy - 16, 92, 18, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 40, 18, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ef7a6b';
    roundRect(ctx, cx - 16, cy - 26, 32, 12, 6);
    ctx.fill();
  } else {
    // 단발 앞머리 짧은 술
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 26, 12, 0, Math.PI, 0);
    ctx.fill();
  }
}

function drawTop(ctx, cx, bodyY, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'dress') {
    ctx.beginPath();
    ctx.moveTo(cx - 40, bodyY + 4);
    ctx.lineTo(cx + 40, bodyY + 4);
    ctx.lineTo(cx + 62, bodyY + 150);
    ctx.lineTo(cx - 62, bodyY + 150);
    ctx.closePath();
    ctx.fill();
    // sleeves hugging shoulders
    roundRect(ctx, cx - 58, bodyY + 8, 22, 42, 10);
    ctx.fill();
    roundRect(ctx, cx + 36, bodyY + 8, 22, 42, 10);
    ctx.fill();
    return 'dress';
  }
  if (item.style === 'hoodie') {
    roundRect(ctx, cx - 46, bodyY - 2, 92, 104, 24);
    ctx.fill();
    roundRect(ctx, cx - 60, bodyY + 10, 24, 58, 12);
    ctx.fill();
    roundRect(ctx, cx + 36, bodyY + 10, 24, 58, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff55';
    roundRect(ctx, cx - 20, bodyY + 22, 40, 34, 10);
    ctx.fill();
    return null;
  }
  if (item.style === 'tank') {
    roundRect(ctx, cx - 34, bodyY + 8, 68, 92, 16);
    ctx.fill();
    return null;
  }
  if (item.style === 'sweater') {
    roundRect(ctx, cx - 48, bodyY, 96, 106, 20);
    ctx.fill();
    roundRect(ctx, cx - 62, bodyY + 12, 24, 62, 12);
    ctx.fill();
    roundRect(ctx, cx + 38, bodyY + 12, 24, 62, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 36, bodyY + 22 + i * 18);
      ctx.lineTo(cx + 36, bodyY + 22 + i * 18);
      ctx.stroke();
    }
    return null;
  }
  // shirt — fits torso with short sleeves
  roundRect(ctx, cx - 42, bodyY + 2, 84, 98, 18);
  ctx.fill();
  roundRect(ctx, cx - 58, bodyY + 10, 22, 46, 10);
  ctx.fill();
  roundRect(ctx, cx + 36, bodyY + 10, 22, 46, 10);
  ctx.fill();
  ctx.fillStyle = '#dfe8f5';
  ctx.beginPath();
  ctx.moveTo(cx, bodyY + 2);
  ctx.lineTo(cx - 14, bodyY + 26);
  ctx.lineTo(cx + 14, bodyY + 26);
  ctx.closePath();
  ctx.fill();
  return null;
}

function drawBottom(ctx, cx, hipY, item, skip) {
  if (skip === 'dress') return;
  ctx.fillStyle = item.color;
  if (item.style === 'skirt') {
    ctx.beginPath();
    ctx.moveTo(cx - 34, hipY);
    ctx.lineTo(cx + 34, hipY);
    ctx.lineTo(cx + 54, hipY + 68);
    ctx.lineTo(cx - 54, hipY + 68);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (item.style === 'shorts') {
    roundRect(ctx, cx - 38, hipY, 34, 46, 12);
    ctx.fill();
    roundRect(ctx, cx + 4, hipY, 34, 46, 12);
    ctx.fill();
    return;
  }
  // jeans / sweats hug the cat legs
  roundRect(ctx, cx - 38, hipY, 34, 92, 14);
  ctx.fill();
  roundRect(ctx, cx + 4, hipY, 34, 92, 14);
  ctx.fill();
  if (item.style === 'jeans') {
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 21, hipY + 16);
    ctx.lineTo(cx - 21, hipY + 82);
    ctx.moveTo(cx + 21, hipY + 16);
    ctx.lineTo(cx + 21, hipY + 82);
    ctx.stroke();
  }
}

function drawShoes(ctx, cx, footY, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'boots') {
    roundRect(ctx, cx - 46, footY - 40, 40, 52, 12);
    ctx.fill();
    roundRect(ctx, cx + 6, footY - 40, 40, 52, 12);
    ctx.fill();
    return;
  }
  if (item.style === 'heels') {
    roundRect(ctx, cx - 44, footY - 10, 38, 16, 7);
    ctx.fill();
    roundRect(ctx, cx + 6, footY - 10, 38, 16, 7);
    ctx.fill();
    ctx.fillRect(cx - 12, footY + 2, 6, 12);
    ctx.fillRect(cx + 38, footY + 2, 6, 12);
    return;
  }
  if (item.style === 'sandals') {
    roundRect(ctx, cx - 44, footY - 6, 38, 14, 6);
    ctx.fill();
    roundRect(ctx, cx + 6, footY - 6, 38, 14, 6);
    ctx.fill();
    return;
  }
  // sneakers on cat paws
  roundRect(ctx, cx - 46, footY - 12, 40, 20, 10);
  ctx.fill();
  roundRect(ctx, cx + 6, footY - 12, 40, 20, 10);
  ctx.fill();
}

function drawAcc(ctx, cx, cy, item) {
  ctx.fillStyle = item.color;
  if (item.style === 'bag') {
    roundRect(ctx, cx + 58, cy + 118, 34, 44, 8);
    ctx.fill();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx + 75, cy + 118, 14, Math.PI, 0);
    ctx.stroke();
  } else if (item.style === 'umbrella') {
    ctx.beginPath();
    ctx.moveTo(cx - 92, cy + 48);
    ctx.quadraticCurveTo(cx - 52, cy - 2, cx - 12, cy + 48);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a3a2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 52, cy + 48);
    ctx.lineTo(cx - 52, cy + 158);
    ctx.stroke();
  } else if (item.style === 'scarf') {
    roundRect(ctx, cx - 34, cy + 58, 68, 18, 8);
    ctx.fill();
    roundRect(ctx, cx + 10, cy + 72, 18, 46, 6);
    ctx.fill();
  } else if (item.style === 'bow') {
    // bow between cat ears
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy - 30, 14, 10, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 16, cy - 30, 14, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.style === 'shades') {
    ctx.fillStyle = '#222222cc';
    roundRect(ctx, cx - 28, cy + 6, 22, 14, 4);
    ctx.fill();
    roundRect(ctx, cx + 6, cy + 6, 22, 14, 4);
    ctx.fill();
    ctx.fillRect(cx - 6, cy + 10, 12, 4);
  }
}

function drawCatEarsFront(ctx, cx, cy) {
  ctx.fillStyle = CONFIG.palette.fur;
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy + 2);
  ctx.lineTo(cx - 56, cy - 34);
  ctx.lineTo(cx - 14, cy - 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 38, cy + 2);
  ctx.lineTo(cx + 56, cy - 34);
  ctx.lineTo(cx + 14, cy - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4a0b0';
  ctx.beginPath();
  ctx.moveTo(cx - 36, cy);
  ctx.lineTo(cx - 48, cy - 26);
  ctx.lineTo(cx - 20, cy - 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 36, cy);
  ctx.lineTo(cx + 48, cy - 26);
  ctx.lineTo(cx + 20, cy - 6);
  ctx.closePath();
  ctx.fill();
}

export function drawCharacter(ctx, outfit, cx = 240, cy = 160) {
  const hair = itemById('hair', outfit.hair);
  const top = itemById('top', outfit.top);
  const bottom = itemById('bottom', outfit.bottom);
  const shoes = itemById('shoes', outfit.shoes);
  const acc = itemById('acc', outfit.acc);

  const bodyY = cy + 68;
  // 꼬리 → 몸 → 바지 → 팔 → 윗옷 → 목 → 머리(뒤) → 얼굴 → 머리(앞) → 귀 → 신발 → 소품
  drawCatTail(ctx, cx, bodyY);
  drawCatBody(ctx, cx, bodyY);
  const skip = top && top.style === 'dress' ? 'dress' : null;
  if (bottom) drawBottom(ctx, cx, bodyY + 88, bottom, skip);
  drawCatArms(ctx, cx, bodyY);
  if (top) drawTop(ctx, cx, bodyY, top);
  ctx.fillStyle = CONFIG.palette.fur;
  roundRect(ctx, cx - 14, cy + 48, 28, 22, 10);
  ctx.fill();
  if (hair) drawHairBack(ctx, cx, cy, hair);
  drawCatHead(ctx, cx, cy);
  if (hair) drawHairFront(ctx, cx, cy, hair);
  // 모자일 때는 귀가 모자 아래로, 그 외에는 귀가 앞에 보이게
  if (!hair || hair.style !== 'cap') {
    drawCatEarsFront(ctx, cx, cy);
  }
  if (shoes) drawShoes(ctx, cx, bodyY + 190, shoes);
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
