// 화면 그림: 색종이 카드 시트 + 프리셀·홈·열 배치.
import { CONFIG } from './config.mjs';
import { rankLabel } from './cards.mjs';
import {
  W, H, CARD, freecellRect, foundationRect, cascadeCardRect, cascadeOrigin, BUTTONS,
} from './layout.mjs';

const FONT = "system-ui,-apple-system,'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
const art = { sheet: null };

export function loadArt() {
  const src = CONFIG.IMAGES.cardSheet;
  if (!src) return;
  const img = new Image();
  img.onload = () => { art.sheet = img; };
  img.src = src;
}

function sheetCell(col, row) {
  const img = art.sheet;
  if (!img) return null;
  const cw = img.width / CONFIG.sheet.cols;
  const ch = img.height / CONFIG.sheet.rows;
  return { sx: col * cw, sy: row * ch, sw: cw, sh: ch };
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

function drawSheetFace(ctx, col, row, x, y, w, h) {
  const cell = sheetCell(col, row);
  if (!cell || !art.sheet) return false;
  rr(ctx, x, y, w, h, w * 0.12); ctx.save(); ctx.clip();
  // 시트 칸 가장자리 검정 여백을 조금 잘라 카드만 보이게
  const trimX = cell.sw * 0.04, trimY = cell.sh * 0.03;
  ctx.drawImage(
    art.sheet,
    cell.sx + trimX, cell.sy + trimY, cell.sw - trimX * 2, cell.sh - trimY * 2,
    x, y, w, h,
  );
  ctx.restore();
  return true;
}

export function drawCard(ctx, card, x, y, w, h, { faceUp = true, dim = false, glow = null } = {}) {
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
  else { ctx.shadowColor = '#0006'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; }

  if (!faceUp || !card) {
    rr(ctx, x, y, w, h, w * 0.12); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.shadowColor = 'transparent';
    if (!drawSheetFace(ctx, CONFIG.sheet.backCol, CONFIG.sheet.backRow, x, y, w, h)) {
      const inset = w * 0.06;
      rr(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, w * 0.08);
      ctx.fillStyle = '#5c4030'; ctx.fill();
      if (w > 28) text(ctx, '✂', x + w / 2, y + h / 2, { size: w * 0.35, color: '#ffd23f', stroke: '#3d2a1c', lw: w * 0.05, weight: 900 });
    }
    ctx.restore();
    return;
  }

  rr(ctx, x, y, w, h, w * 0.12); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowColor = 'transparent';

  const suit = CONFIG.suits[card.suit];
  const painted = drawSheetFace(ctx, CONFIG.sheet.blankCol, suit.sheetRow, x, y, w, h);
  if (!painted) {
    const inset = w * 0.06;
    rr(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, w * 0.08);
    ctx.fillStyle = suit.paint; ctx.fill();
    rr(ctx, x + w * 0.18, y + h * 0.22, w * 0.64, h * 0.56, w * 0.2);
    ctx.fillStyle = '#fffef5'; ctx.fill();
  }

  // 색종이 카드 위에 숫자·무늬를 또렷하게 붙인다
  const paint = suit.paint;
  const label = rankLabel(card.rank);
  text(ctx, label, x + w * 0.22, y + h * 0.16, { size: w * 0.26, color: paint, stroke: '#fffef8', lw: w * 0.08, weight: 900 });
  text(ctx, suit.symbol, x + w * 0.22, y + h * 0.34, { size: w * 0.22, color: paint, stroke: '#fffef8', lw: w * 0.06, weight: 900 });
  text(ctx, suit.symbol, x + w / 2, y + h * 0.55, { size: w * 0.4, color: paint, stroke: '#fff8', lw: w * 0.07, weight: 900 });
  text(ctx, label, x + w / 2, y + h * 0.78, { size: w * 0.3, color: paint, stroke: '#fffef8', lw: w * 0.08, weight: 900 });

  if (dim) { rr(ctx, x, y, w, h, w * 0.12); ctx.fillStyle = '#3d2a1c99'; ctx.fill(); }
  ctx.restore();
}

function drawSlot(ctx, r, label) {
  rr(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = '#00000028'; ctx.fill();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 2; ctx.stroke();
  ctx.setLineDash([]);
  if (label) text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, { size: 11, color: '#ffffff77', stroke: null, weight: 700 });
}

function drawTable(ctx) {
  // 크라프트지·색종이 책상 느낌
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#d7b98a');
  g.addColorStop(0.45, CONFIG.table.felt);
  g.addColorStop(1, CONFIG.table.feltDark);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1;
  for (let i = -H; i < W; i += 22) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
  // 색종이 조각 장식
  const scraps = [
    ['#e24b3b88', 20, 120, 36, 28, -0.3],
    ['#e8b01c88', 420, 90, 40, 26, 0.4],
    ['#2f8f4e88', 40, 400, 32, 24, 0.2],
    ['#2a6fbf88', 410, 380, 34, 22, -0.25],
  ];
  for (const [color, x, y, w, h, rot] of scraps) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    rr(ctx, 0, 0, w, h, 4); ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#00000028'; ctx.fillRect(0, 720, W, H - 720);
}

function inHint(s, loc) {
  const h = s.hint;
  if (!h) return false;
  const match = (a, b) => a && b && a.type === b.type && a.i === b.i
    && (a.type !== 'cascade' || a.cardIndex == null || b.cardIndex == null || a.cardIndex === b.cardIndex);
  return match(h.from, loc) || match(h.to, loc);
}

function drawBoard(ctx, s) {
  text(ctx, '프리셀', 10 + 2 * CARD.w, 38, { size: 12, color: '#5c4030', stroke: '#fff8', lw: 3 });
  for (let i = 0; i < 4; i++) {
    const r = freecellRect(i);
    const glow = (s.selected?.type === 'freecell' && s.selected.i === i) ? '#ffd23f'
      : (inHint(s, { type: 'freecell', i }) ? '#7cf' : null);
    if (!s.freecells[i]) drawSlot(ctx, r, '');
    else drawCard(ctx, s.freecells[i], r.x, r.y, r.w, r.h, { glow });
  }

  text(ctx, '홈 A→K', W - 10 - 2 * CARD.w, 38, { size: 12, color: '#5c4030', stroke: '#fff8', lw: 3 });
  for (let i = 0; i < 4; i++) {
    const r = foundationRect(i);
    const f = s.foundations[i];
    const hintGlow = inHint(s, { type: 'foundation', i }) ? '#7cf' : null;
    if (!f.length) {
      drawSlot(ctx, r, 'A');
      if (hintGlow) { rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = hintGlow; ctx.lineWidth = 3; ctx.stroke(); }
    } else {
      drawCard(ctx, f.at(-1), r.x, r.y, r.w, r.h, { glow: hintGlow });
    }
  }

  for (let i = 0; i < 8; i++) {
    const col = s.cascades[i];
    const o = cascadeOrigin(i);
    if (!col.length) {
      const r = { x: o.x, y: o.y, w: CARD.w, h: CARD.h };
      drawSlot(ctx, r, '');
      if (inHint(s, { type: 'cascade', i })) {
        rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.strokeStyle = '#7cf'; ctx.lineWidth = 3; ctx.stroke();
      }
      continue;
    }
    col.forEach((card, c) => {
      const r = cascadeCardRect(i, c);
      const sel = s.selected?.type === 'cascade' && s.selected.i === i && c >= s.selected.cardIndex;
      const hint = s.hint?.from?.type === 'cascade' && s.hint.from.i === i && c >= (s.hint.from.cardIndex ?? 999);
      const shakeX = s.shake && sel ? Math.sin(s.shake.t * 60) * 4 : 0;
      drawCard(ctx, card, r.x + shakeX, r.y, r.w, r.h, {
        glow: sel ? '#ffd23f' : hint ? '#7cf' : null,
      });
    });
  }
}

function drawBanner(ctx, s) {
  const str = s.notice?.text || s.message;
  if (!str) return;
  ctx.font = `800 14px ${FONT}`;
  const w = Math.min(W - 16, ctx.measureText(str).width + 28);
  rr(ctx, (W - w) / 2, 690, w, 32, 16); ctx.fillStyle = s.notice ? '#ffd23f' : '#5c4030cc'; ctx.fill();
  text(ctx, str, W / 2, 707, { size: 14, color: s.notice ? '#1d1d1f' : '#fff', stroke: null });
}

function drawButton(ctx, r, label, { enabled = true, color = '#e0f2f1', sub = '' } = {}) {
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  rr(ctx, -r.w / 2, -r.h / 2 + 3, r.w, r.h, 12); ctx.fillStyle = '#0005'; ctx.fill();
  rr(ctx, -r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.fillStyle = enabled ? color : '#ffffff1f'; ctx.fill();
  text(ctx, label, 0, sub ? -6 : 1, { size: 15, color: enabled ? '#1d1d1f' : '#ffffff66', stroke: null, weight: 900 });
  if (sub) text(ctx, sub, 0, 12, { size: 10, color: '#1d1d1faa', stroke: null, weight: 700 });
  ctx.restore();
}

function drawFlights(ctx, s) {
  for (const f of s.flights) {
    const p = (f.t - f.delay) / f.dur;
    if (p < 0) continue;
    const e = 1 - (1 - p) * (1 - p);
    const x = f.x0 + (f.x1 - f.x0) * e;
    const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(p * Math.PI) * 24;
    drawCard(ctx, f.card, x - CARD.w / 2, y - CARD.h / 2, CARD.w, CARD.h, { faceUp: true, glow: '#fff' });
  }
}

export function render(ctx, s) {
  drawTable(ctx);
  text(ctx, `이동 ${s.moves}`, 14, 18, { size: 13, align: 'left', color: '#5c4030', stroke: '#fff8', lw: 3 });
  const home = s.foundations.reduce((n, f) => n + f.length, 0);
  text(ctx, `홈 ${home}/52`, W - 14, 18, { size: 13, align: 'right', color: '#5c4030', stroke: '#fff8', lw: 3 });
  drawBoard(ctx, s);
  drawFlights(ctx, s);
  drawBanner(ctx, s);
  drawButton(ctx, BUTTONS.undo, '되돌리기', { enabled: s.history.length > 0, color: '#fff3e0', sub: 'Z' });
  drawButton(ctx, BUTTONS.hint, '힌트', { color: '#ffd23f', sub: 'H' });
  drawButton(ctx, BUTTONS.newGame, '새 판', { color: '#ffccbc', sub: 'N' });
}
