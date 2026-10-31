// 화면 그림: 테이블, 카드, AI 친구, 버튼, 색 고르기, 라운드 점수판.
import { CONFIG } from './config.mjs';
import { canPlay } from './cards.mjs';
import { canCallUno } from './game.mjs';
import { W, H, CARD, BIG, MINI, CENTER, DECK, PILE, BUTTONS, NEXT_BUTTON, CANCEL_BUTTON, handLayout, colorButtons, catchButton } from './layout.mjs';

const FONT = "system-ui,-apple-system,'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
const art = {};

export function loadArt() {
  const load = (key, src) => {
    if (!src) return;
    const img = new Image();
    img.onload = () => { art[key] = img; };
    img.src = src;
  };
  load('cardBack', CONFIG.IMAGES.cardBack);
  load('table', CONFIG.IMAGES.table);
  for (const [kind, src] of Object.entries(CONFIG.IMAGES.avatars || {})) load('avatar-' + kind, src);
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, { size = 14, color = CONFIG.table.ink, align = 'center', weight = 800, stroke = '#00000088', lw = 4, base = 'middle' } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}

/** 카드 아이콘 뒤에 "N개" 형식으로 장수 표시 */
function drawCardCount(ctx, x, y, count, { align = 'center', size = 12, color = CONFIG.table.ink, hot = false } = {}) {
  const iw = 14, ih = 20, gap = 4;
  const label = `${count}개`;
  ctx.font = `800 ${size}px ${FONT}`;
  const tw = ctx.measureText(label).width;
  const total = iw + gap + tw;
  const left = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
  drawCard(ctx, null, left, y - ih / 2, iw, ih, { faceUp: false });
  if (hot) {
    ctx.beginPath();
    ctx.arc(left + iw / 2, y, Math.max(iw, ih) * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = '#e53935'; ctx.lineWidth = 2; ctx.stroke();
  }
  text(ctx, label, left + iw + gap + tw / 2, y, { size, color: hot ? '#e53935' : color, stroke: hot ? '#fff' : '#00000088', lw: hot ? 3 : 3 });
}

// ---------- 카드 ----------
function drawSkip(ctx, cx, cy, r, color) {
  ctx.lineWidth = r * 0.32; ctx.strokeStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.7); ctx.lineTo(cx + r * 0.7, cy - r * 0.7); ctx.stroke();
}

function drawReverse(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (const dir of [1, -1]) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(dir === 1 ? -0.6 : Math.PI - 0.6);
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.12); ctx.lineTo(r * 0.3, r * 0.12); ctx.lineTo(r * 0.3, r * 0.45);
    ctx.lineTo(r * 0.95, -r * 0.05); ctx.lineTo(r * 0.3, -r * 0.55); ctx.lineTo(r * 0.3, -r * 0.22);
    ctx.lineTo(-r * 0.9, -r * 0.22); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function symbol(ctx, card, cx, cy, size, color, outline) {
  if (card.type === 'skip') { drawSkip(ctx, cx, cy, size * 0.42, color); return; }
  if (card.type === 'reverse') { drawReverse(ctx, cx, cy, size * 0.5, color); return; }
  const label = card.type === 'number' ? String(card.value) : card.type === 'draw2' ? '+2' : card.type === 'wild4' ? '+4' : '';
  if (!label) return;
  text(ctx, label, cx, cy + size * 0.04, { size, color, stroke: outline, lw: size * 0.14, weight: 900 });
  if (card.type === 'number' && (card.value === 6 || card.value === 9)) {
    ctx.fillStyle = color; ctx.fillRect(cx - size * 0.22, cy + size * 0.4, size * 0.44, size * 0.08);
  }
}

export function drawCard(ctx, card, x, y, w, h, { faceUp = true, dim = false, glow = null } = {}) {
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
  else { ctx.shadowColor = '#0006'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
  rr(ctx, x, y, w, h, w * 0.14); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowColor = 'transparent';
  const inset = w * 0.07;
  if (!faceUp) {
    if (art.cardBack) {
      rr(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, w * 0.1); ctx.save(); ctx.clip();
      ctx.drawImage(art.cardBack, x + inset, y + inset, w - inset * 2, h - inset * 2); ctx.restore();
    } else {
      rr(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, w * 0.1); ctx.fillStyle = '#1d1d1f'; ctx.fill();
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-0.45);
      ctx.beginPath(); ctx.ellipse(0, 0, w * 0.34, h * 0.42, 0, 0, Math.PI * 2); ctx.fillStyle = CONFIG.cardColors.red; ctx.fill();
      if (w > 30) text(ctx, 'UNO', 0, 0, { size: w * 0.3, color: '#ffd23f', stroke: '#1d1d1f', lw: w * 0.07, weight: 900 });
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  const fill = CONFIG.cardColors[card.color];
  rr(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, w * 0.1); ctx.fillStyle = fill; ctx.fill();

  const cx = x + w / 2, cy = y + h / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.45);
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.33, h * 0.4, 0, 0, Math.PI * 2);
  if (card.color === 'wild') {
    ctx.save(); ctx.clip();
    const q = Math.max(w, h);
    [['red', -1, -1], ['blue', 1, -1], ['yellow', -1, 1], ['green', 1, 1]].forEach(([c, sx, sy]) => {
      ctx.fillStyle = CONFIG.cardColors[c]; ctx.fillRect(sx < 0 ? -q : 0, sy < 0 ? -q : 0, q, q);
    });
    ctx.restore();
  } else { ctx.fillStyle = '#fff'; ctx.fill(); }
  ctx.restore();

  if (card.color === 'wild') {
    if (card.type === 'wild4') symbol(ctx, card, cx, cy, w * 0.42, '#fff', '#1d1d1f');
    if (w > 40) text(ctx, card.type === 'wild4' ? '+4' : 'W', x + w * 0.2, y + h * 0.13, { size: w * 0.18, color: '#fff', stroke: null });
  } else {
    symbol(ctx, card, cx, cy, w * 0.5, fill, '#1d1d1f');
    if (w > 40) {
      const corner = card.type === 'number' ? String(card.value) : card.type === 'draw2' ? '+2' : card.type === 'skip' ? '⊘' : '⇄';
      text(ctx, corner, x + w * 0.2, y + h * 0.13, { size: w * 0.18, color: '#fff', stroke: null });
    }
  }
  if (dim) { rr(ctx, x, y, w, h, w * 0.14); ctx.fillStyle = '#0b1d16a0'; ctx.fill(); }
  ctx.restore();
}

// ---------- 팀 아이콘: 색깔 동그라미만 ----------
function drawAvatar(ctx, player, x, y, r) {
  const color = player.iconColor || CONFIG.cardColors[player.kind] || '#9e9e9e';
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = '#1d1d1f88'; ctx.stroke();
  ctx.restore();
}

function visibleCount(s, player) { return player.hand.filter(c => c.arrive <= s.clock).length; }

function drawOpponent(ctx, s, pi) {
  const p = s.players[pi], seat = s.seats[pi], active = s.current === pi && s.phase !== 'roundEnd';
  const count = visibleCount(s, p);
  if (active) {
    const pulse = 0.5 + 0.5 * Math.sin(s.clock * 6);
    ctx.beginPath(); ctx.arc(seat.x, seat.y, 36 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f33'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
  }
  drawAvatar(ctx, p, seat.x, seat.y, 26);
  text(ctx, `${p.name} · ${p.wins}승`, seat.x, seat.y + 42, { size: 13 });

  const n = Math.min(count, 12), spread = n > 1 ? Math.min(9, 70 / (n - 1)) : 0, total = spread * (n - 1) + MINI.w;
  for (let i = 0; i < n; i++) drawCard(ctx, null, seat.x - total / 2 + i * spread, seat.y + 54, MINI.w, MINI.h, { faceUp: false });
  drawCardCount(ctx, seat.x + 28, seat.y - 18, count, { align: 'left', size: 12, hot: count <= 2 || count > CONFIG.rules.maxHand });

  if (count === 1 && p.unoCalled) {
    rr(ctx, seat.x - 50, seat.y - 30, 34, 18, 6); ctx.fillStyle = '#ffd23f'; ctx.fill();
    text(ctx, 'UNO', seat.x - 33, seat.y - 21, { size: 10, color: '#c62828', stroke: null, weight: 900 });
  }
  if (s.unoWindow?.pi === pi) {
    const b = catchButton(seat), pulse = 1 + 0.05 * Math.sin(s.clock * 12);
    ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(pulse, pulse);
    rr(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 12); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    text(ctx, '지적!', 0, 1, { size: 16, stroke: null });
    ctx.restore();
  }
}

function drawBubble(ctx, s, b) {
  const seat = s.seats[b.pi], alpha = Math.min(1, b.t * 4);
  const y = seat.side === 'bottom' ? 472 : seat.y - 52;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = `900 15px ${FONT}`;
  const w = ctx.measureText(b.text).width + 24, x = Math.max(8, Math.min(W - w - 8, seat.x - w / 2));
  rr(ctx, x, y - 16, w, 32, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#1d1d1f'; ctx.stroke();
  text(ctx, b.text, x + w / 2, y + 1, { size: 15, color: b.text.includes('우노') ? '#d32f2f' : '#1d1d1f', stroke: null, weight: 900 });
  ctx.restore();
}

// ---------- 테이블 가운데 ----------
function drawTable(ctx) {
  if (art.table) {
    const img = art.table, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    // 글자·버튼이 잘 보이도록 살짝 어둡게
    ctx.fillStyle = '#00000055'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00000066'; ctx.fillRect(0, 474, W, H - 474);
    return;
  }
  const g = ctx.createRadialGradient(W / 2, 330, 40, W / 2, 360, 520);
  g.addColorStop(0, CONFIG.table.felt); g.addColorStop(1, CONFIG.table.feltDark);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1;
  for (let i = -H; i < W; i += 18) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
  ctx.fillStyle = '#00000038'; ctx.fillRect(0, 474, W, H - 474);
}

function drawDirection(ctx, s) {
  const { x, y, ring } = CENTER, color = CONFIG.cardColors[s.color];
  ctx.save();
  ctx.lineWidth = 6; ctx.strokeStyle = color + '55';
  ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke();
  const spin = s.clock * 0.6 * s.direction;
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const a = spin + i * Math.PI / 2;
    ctx.save(); ctx.translate(x + Math.cos(a) * ring, y + Math.sin(a) * ring); ctx.rotate(a + (s.direction > 0 ? Math.PI / 2 : -Math.PI / 2));
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawCenter(ctx, s) {
  const humanCanDraw = s.current === 0 && s.phase === 'turn' && s.timer <= 0;
  for (let i = 2; i >= 0; i--) drawCard(ctx, null, DECK.x - BIG.w / 2 + i * 2, DECK.y - BIG.h / 2 - i * 2, BIG.w, BIG.h, { faceUp: false, glow: i === 0 && humanCanDraw ? '#ffd23f' : null });
  drawCardCount(ctx, DECK.x, DECK.y + BIG.h / 2 + 14, s.deck.length, { size: 11, color: '#ffffffcc' });

  const flying = new Set(s.flights.map(f => f.card));
  const visible = s.discard.filter(c => !flying.has(c));
  const shown = visible.slice(-3);
  shown.forEach((card, i) => {
    const tilt = ((card.id * 37) % 21 - 10) / 100;
    ctx.save(); ctx.translate(PILE.x, PILE.y); ctx.rotate(tilt);
    drawCard(ctx, card, -BIG.w / 2, -BIG.h / 2, BIG.w, BIG.h, { glow: i === shown.length - 1 ? CONFIG.cardColors[s.color] : null });
    ctx.restore();
  });
  for (const p of s.pulses) {
    ctx.beginPath(); ctx.arc(PILE.x, PILE.y, 50 + p.t * 120, 0, Math.PI * 2);
    ctx.lineWidth = 6 * (1 - p.t / 0.6); ctx.strokeStyle = CONFIG.cardColors[p.color]; ctx.stroke();
  }
  const label = `지금 색: ${CONFIG.colorNames[s.color]}`;
  rr(ctx, PILE.x - 46, PILE.y + BIG.h / 2 + 4, 92, 22, 11); ctx.fillStyle = CONFIG.cardColors[s.color]; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  text(ctx, label, PILE.x, PILE.y + BIG.h / 2 + 15.5, { size: 11, stroke: '#0008', lw: 3 });
}

function drawBanner(ctx, s) {
  const str = s.notice?.text || s.message;
  if (!str) return;
  ctx.font = `800 14px ${FONT}`;
  const w = Math.min(W - 16, ctx.measureText(str).width + 28);
  rr(ctx, (W - w) / 2, 424, w, 32, 16); ctx.fillStyle = s.notice ? '#ffd23f' : '#0008'; ctx.fill();
  ctx.save(); rr(ctx, (W - w) / 2, 424, w, 32, 16); ctx.clip();
  text(ctx, str, W / 2, 441, { size: 14, color: s.notice ? '#1d1d1f' : '#fff', stroke: null });
  ctx.restore();
}

function drawButton(ctx, r, label, { enabled, color, flash = false, sub = '', time = 0 }) {
  ctx.save();
  const scale = flash ? 1 + 0.04 * Math.sin(time * 12) : 1;
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(scale, scale);
  rr(ctx, -r.w / 2, -r.h / 2 + 4, r.w, r.h, 14); ctx.fillStyle = '#0006'; ctx.fill();
  rr(ctx, -r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.fillStyle = enabled ? color : '#ffffff1f'; ctx.fill();
  if (flash) { ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  text(ctx, label, 0, sub ? -6 : 1, { size: 17, color: enabled ? '#1d1d1f' : '#ffffff66', stroke: null, weight: 900 });
  if (sub) text(ctx, sub, 0, 13, { size: 10, color: enabled ? '#1d1d1fb0' : '#ffffff44', stroke: null, weight: 700 });
  ctx.restore();
}

function drawControls(ctx, s) {
  const me = s.players[0], unoReady = canCallUno(s);
  drawButton(ctx, BUTTONS.uno, '우노!', { enabled: unoReady, color: '#ffd23f', sub: 'PC: U', flash: unoReady, time: s.clock });

  const turnText = s.current === 0 ? '▶ 내 차례' : '';
  text(ctx, `나 · ${me.wins}승`, 16, 562, { size: 13, align: 'left' });
  const scoreW = (() => { ctx.font = `800 13px ${FONT}`; return ctx.measureText(`나 · ${me.wins}승 `).width; })();
  drawCardCount(ctx, 16 + scoreW, 562, me.hand.length, { align: 'left', size: 13, hot: me.hand.length <= 2 || me.hand.length > CONFIG.rules.maxHand });
  if (me.unoCalled && me.hand.length === 1) {
    text(ctx, '· UNO!', 16 + scoreW + 48, 562, { size: 13, align: 'left', color: '#ffd23f' });
  }
  text(ctx, turnText || `${s.round}라운드 · ${CONFIG.rules.targetWins}승 먼저!`, W - 16, 562, { size: 13, align: 'right', color: turnText ? '#ffd23f' : CONFIG.table.ink });
}

function drawHand(ctx, s) {
  const me = s.players[0], top = s.discard.at(-1);
  const myTurn = s.current === 0 && s.timer <= 0 && s.phase === 'turn';
  for (const [i, item] of handLayout(me.hand).entries()) {
    const { card } = item;
    if (card.arrive > s.clock) continue;
    const playable = myTurn && canPlay(card, top, s.color);
    const selected = s.keyboard && myTurn && i === s.cursor;
    let x = item.x, y = item.y;
    if (playable) y -= 10;
    if (selected) y -= 8;
    if (s.shake?.card === card) x += Math.sin(s.shake.t * 60) * 5;
    drawCard(ctx, card, x, y, item.w, item.h, { dim: myTurn && !playable, glow: selected ? '#ffffff' : playable ? '#ffd23f' : null });
  }
}

function drawFlights(ctx, s) {
  for (const f of s.flights) {
    const p = (f.t - f.delay) / f.dur;
    if (p < 0) continue;
    const e = 1 - (1 - p) * (1 - p), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(p * Math.PI) * 30;
    drawCard(ctx, f.card, x - CARD.w / 2, y - CARD.h / 2, CARD.w, CARD.h, { faceUp: f.faceUp });
  }
}

function drawColorPicker(ctx, s) {
  ctx.fillStyle = '#000b'; ctx.fillRect(0, 0, W, H);
  text(ctx, '어떤 색으로 바꿀까?', W / 2, 220, { size: 22 });
  colorButtons().forEach((b, i) => {
    rr(ctx, b.x, b.y, b.w, b.h, 16); ctx.fillStyle = CONFIG.cardColors[b.color]; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    text(ctx, CONFIG.colorNames[b.color], b.x + b.w / 2, b.y + b.h / 2 - 6, { size: 20 });
    text(ctx, `PC: ${i + 1}`, b.x + b.w / 2, b.y + b.h / 2 + 18, { size: 11, color: '#ffffffcc', stroke: null });
  });
  const r = CANCEL_BUTTON;
  rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#ffffff2a'; ctx.fill();
  text(ctx, '취소', r.x + r.w / 2, r.y + r.h / 2, { size: 15, stroke: null });
}

function drawRoundPanel(ctx, s) {
  const sum = s.summary, target = CONFIG.rules.targetWins;
  ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, W, H);
  rr(ctx, 28, 150, W - 56, 500, 22); ctx.fillStyle = '#fff8e7'; ctx.fill();
  const winner = s.players[sum.winner];
  const bust = sum.reason === 'bust';
  text(ctx, `${s.round}라운드 결과`, W / 2, 186, { size: 14, color: '#6b4423', stroke: null });
  text(ctx, winner.isHuman ? '내가 이번 라운드 승리!' : `${winner.name} 라운드 승리!`, W / 2, 218, { size: 24, color: '#1d1d1f', stroke: null, weight: 900 });
  text(ctx, bust ? `카드 ${CONFIG.rules.maxHand}장 초과 패배` : '손을 먼저 비웠어!', W / 2, 250, { size: 15, color: '#c62828', stroke: null });

  sum.rows.forEach((row, i) => {
    const y = 290 + i * 62, p = s.players[i];
    rr(ctx, 48, y - 22, W - 96, 52, 12); ctx.fillStyle = row.winner ? '#ffd23f66' : row.busted ? '#e5393522' : '#0000000d'; ctx.fill();
    text(ctx, row.name, 64, y - 4, { size: 16, color: '#1d1d1f', align: 'left', stroke: null });
    const detail = row.winner
      ? (bust ? '카드가 가장 적음' : '카드를 모두 냄')
      : row.busted
        ? `${CONFIG.rules.maxHand}장 초과 · 패배`
        : `남은 ${row.cards}장`;
    text(ctx, detail, 64, y + 16, { size: 11, color: row.busted ? '#c62828' : '#555', align: 'left', stroke: null, weight: 600 });
    text(ctx, `${p.wins}승`, W - 64, y - 4, { size: 18, color: '#1d1d1f', align: 'right', stroke: null, weight: 900 });
    const bw = 140, ratio = Math.min(1, p.wins / target);
    rr(ctx, W - 64 - bw, y + 12, bw, 8, 4); ctx.fillStyle = '#0000001a'; ctx.fill();
    if (ratio > 0) { rr(ctx, W - 64 - bw, y + 12, Math.max(8, bw * ratio), 8, 4); ctx.fillStyle = row.winner ? '#e53935' : '#1e88e5'; ctx.fill(); }
  });
  text(ctx, `${target}승을 먼저 하면 최종 우승 · ${CONFIG.rules.maxHand}장 초과 시 라운드 패배`, W / 2, 545, { size: 12, color: '#6b4423', stroke: null, weight: 600 });
  const b = NEXT_BUTTON;
  rr(ctx, b.x, b.y, b.w, b.h, 16); ctx.fillStyle = '#e53935'; ctx.fill();
  text(ctx, sum.matchOver ? '최종 결과 보기' : '다음 라운드 (Enter)', b.x + b.w / 2, b.y + b.h / 2, { size: 18, stroke: null });
}

export function render(ctx, s) {
  drawTable(ctx);
  text(ctx, `${s.round}라운드`, 14, 18, { size: 12, align: 'left', color: '#ffffffcc' });
  text(ctx, `목표 ${CONFIG.rules.targetWins}승`, W - 14, 18, { size: 12, align: 'right', color: '#ffffffcc' });
  drawDirection(ctx, s);
  drawCenter(ctx, s);
  s.players.forEach((_, i) => { if (i > 0) drawOpponent(ctx, s, i); });
  drawBanner(ctx, s);
  drawControls(ctx, s);
  drawHand(ctx, s);
  drawFlights(ctx, s);
  for (const b of s.bubbles) drawBubble(ctx, s, b);
  if (s.phase === 'chooseColor') drawColorPicker(ctx, s);
  if (s.phase === 'roundEnd' && s.summary) drawRoundPanel(ctx, s);
}
