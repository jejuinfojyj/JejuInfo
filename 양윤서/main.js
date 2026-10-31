import { mountGame } from './game-shell.js';
import { loadImage } from './game-tools.js';
import { CONFIG, SKILLS } from './config.mjs';
import { createGame, updateGame, choiceLabel, skillStats } from './game.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const palette = CONFIG.palette;

const art = { bg: null };
loadImage('./assets/background.png').then((img) => { art.bg = img; }).catch(() => {});

function layoutChoices(state) {
  const ids = state.choices || [];
  const cardW = 128;
  const cardH = 148;
  const gap = 10;
  const total = ids.length * cardW + (ids.length - 1) * gap;
  let x = (W - total) / 2;
  const y = H * 0.34;
  state.choiceLayout = ids.map((id) => {
    const card = { id, x, y, w: cardW, h: cardH };
    x += cardW + gap;
    return card;
  });
}

function drawRounded(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function pxFill(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** 착한 히어로 로봇 — 바이저·어깨갑·부스터·빛나는 코어 */
function drawGoodRobot(ctx, x, y, r, facing, t) {
  const s = Math.max(2.2, r / 7);
  const bob = Math.sin(t * 7) * s * 0.35;
  const pulse = 0.55 + 0.45 * Math.sin(t * 10);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(facing || 0);

  // 부스터 불꽃 (뒤쪽)
  const flame = 2 + Math.sin(t * 22) * 1.2;
  pxFill(ctx, -s * 2.5, s * 6, s * 2, s * flame, '#56cfe1');
  pxFill(ctx, s * 0.5, s * 6, s * 2, s * flame, '#56cfe1');
  pxFill(ctx, -s * 1.5, s * 6.5, s, s * (flame + 1), '#ffd166');
  pxFill(ctx, s * 0.5, s * 6.5, s, s * (flame + 1), '#ffd166');
  pxFill(ctx, -s * 0.5, s * 7, s, s * flame, '#ffffff');

  // 에너지 윙
  ctx.globalAlpha = 0.35 + pulse * 0.25;
  pxFill(ctx, -s * 11, -s * 3, s * 4, s * 7, '#4cc9f0');
  pxFill(ctx, s * 7, -s * 3, s * 4, s * 7, '#4cc9f0');
  pxFill(ctx, -s * 12, -s, s * 3, s * 3, '#90e0ef');
  pxFill(ctx, s * 9, -s, s * 3, s * 3, '#90e0ef');
  ctx.globalAlpha = 1;

  // 외곽 실루엣 (메탈 테두리)
  pxFill(ctx, -s * 6.5, -s * 5, s * 13, s * 11, '#1d3557');
  // 다리 아머
  pxFill(ctx, -s * 4, s * 4, s * 3, s * 4, '#457b9d');
  pxFill(ctx, s, s * 4, s * 3, s * 4, '#457b9d');
  pxFill(ctx, -s * 3.5, s * 5, s * 2, s * 2, '#a8dadc');
  pxFill(ctx, s * 1.5, s * 5, s * 2, s * 2, '#a8dadc');
  // 발
  pxFill(ctx, -s * 4.5, s * 7.5, s * 3.5, s * 1.5, '#1d3557');
  pxFill(ctx, s, s * 7.5, s * 3.5, s * 1.5, '#1d3557');

  // 몸통
  pxFill(ctx, -s * 5.5, -s * 4, s * 11, s * 9, '#219ebc');
  pxFill(ctx, -s * 4.5, -s * 3, s * 9, s * 7, '#8ecae6');
  // 어깨갑
  pxFill(ctx, -s * 8, -s * 5, s * 3.5, s * 4, '#023e8a');
  pxFill(ctx, s * 4.5, -s * 5, s * 3.5, s * 4, '#023e8a');
  pxFill(ctx, -s * 7.5, -s * 4.5, s * 2.5, s * 2.5, '#48cae4');
  pxFill(ctx, s * 5, -s * 4.5, s * 2.5, s * 2.5, '#48cae4');
  // 빛나는 코어
  pxFill(ctx, -s * 2.5, -s * 1.5, s * 5, s * 4, '#023047');
  pxFill(ctx, -s * 1.5, -s * 0.5, s * 3, s * 2, `rgba(6,214,160,${0.55 + pulse * 0.45})`);
  pxFill(ctx, -s * 0.5, 0, s, s, '#ffffff');

  // 헬멧
  pxFill(ctx, -s * 5, -s * 11, s * 10, s * 7, '#023e8a');
  pxFill(ctx, -s * 4, -s * 10, s * 8, s * 5, '#0077b6');
  // 바이저 빛
  pxFill(ctx, -s * 3.5, -s * 8.5, s * 7, s * 2.5, '#03045e');
  pxFill(ctx, -s * 3, -s * 8, s * 6, s * 1.5, `rgba(255,209,102,${0.7 + pulse * 0.3})`);
  pxFill(ctx, -s * 2, -s * 7.7, s * 1.5, s, '#ffffff');
  // 크레스트
  pxFill(ctx, -s * 1, -s * 13.5, s * 2, s * 3, '#ffd166');
  pxFill(ctx, -s * 0.5, -s * 14.5, s, s * 2, '#06d6a0');

  // 팔 + 건암
  pxFill(ctx, -s * 9, -s * 2, s * 3, s * 6, '#0077b6');
  pxFill(ctx, s * 6, -s * 2, s * 3, s * 6, '#0077b6');
  pxFill(ctx, -s * 10, s * 2, s * 3.5, s * 2.5, '#48cae4');
  pxFill(ctx, s * 6.5, s * 2, s * 3.5, s * 2.5, '#48cae4');
  pxFill(ctx, -s * 9.5, s * 2.5, s * 2, s, '#ffd166');
  pxFill(ctx, s * 7.5, s * 2.5, s * 2, s, '#ffd166');

  ctx.restore();
}

/** 나쁜 전투 로봇 — 빨간 바이저·스파이크·중장갑 */
function drawBadRobot(ctx, x, y, e, t) {
  const flash = e.flash > 0;
  const s = Math.max(2.2, e.r / 6.5);
  const kind = e.kind;
  const body = flash ? '#ffffff' : kind === 'boss' ? '#7b2cbf' : kind === 'elite' ? '#c1121f' : kind === 'fast' ? '#fb8500' : '#9d0208';
  const dark = flash ? '#cccccc' : kind === 'boss' ? '#240046' : kind === 'elite' ? '#6a040f' : kind === 'fast' ? '#9c6644' : '#370617';
  const metal = flash ? '#eeeeee' : '#2b2d42';
  const glow = flash ? '#333333' : kind === 'boss' ? '#e0aaff' : '#ff4d6d';
  const pulse = 0.5 + 0.5 * Math.sin(t * 12 + x * 0.02);
  const bob = Math.sin(t * 9 + x * 0.01) * s * 0.25;

  ctx.save();
  ctx.translate(x, y + bob);

  // 그림자 아우라 (보스/엘리트)
  if (kind === 'boss' || kind === 'elite') {
    ctx.globalAlpha = 0.2 + pulse * 0.15;
    pxFill(ctx, -s * 9, -s * 9, s * 18, s * 18, glow);
    ctx.globalAlpha = 1;
  }

  // 배기 / 스모크
  if (kind !== 'fast') {
    const smoke = 1.5 + Math.sin(t * 18) * 0.8;
    pxFill(ctx, -s * 2, s * 7, s * 1.5, s * smoke, '#6c757d');
    pxFill(ctx, s * 0.5, s * 7, s * 1.5, s * smoke, '#6c757d');
  }

  // 뿔·스파이크
  if (kind === 'boss') {
    pxFill(ctx, -s * 6, -s * 14, s * 2.5, s * 6, dark);
    pxFill(ctx, s * 3.5, -s * 14, s * 2.5, s * 6, dark);
    pxFill(ctx, -s * 7, -s * 15, s * 2, s * 2, glow);
    pxFill(ctx, s * 5, -s * 15, s * 2, s * 2, glow);
    pxFill(ctx, -s * 1, -s * 15, s * 2, s * 4, metal);
  } else if (kind === 'elite') {
    pxFill(ctx, -s * 5, -s * 12, s * 2, s * 4, dark);
    pxFill(ctx, s * 3, -s * 12, s * 2, s * 4, dark);
  } else if (kind === 'fast') {
    pxFill(ctx, s * 5, -s * 2, s * 4, s * 2, body);
    pxFill(ctx, s * 7, -s, s * 3, s, glow);
  } else {
    pxFill(ctx, -s * 1, -s * 12, s * 2, s * 3, dark);
    pxFill(ctx, -s * 0.5, -s * 13, s, s, glow);
  }

  // 다리
  pxFill(ctx, -s * 4.5, s * 4, s * 3.5, s * 4.5, dark);
  pxFill(ctx, s, s * 4, s * 3.5, s * 4.5, dark);
  pxFill(ctx, -s * 5, s * 7.5, s * 4, s * 1.5, metal);
  pxFill(ctx, s, s * 7.5, s * 4, s * 1.5, metal);

  // 몸통 장갑
  pxFill(ctx, -s * 6.5, -s * 5, s * 13, s * 10, metal);
  pxFill(ctx, -s * 5.5, -s * 4, s * 11, s * 8, body);
  pxFill(ctx, -s * 4.5, -s * 3, s * 9, s * 6, dark);
  // 흉갑 문양
  pxFill(ctx, -s * 2.5, -s * 1, s * 5, s * 3.5, metal);
  pxFill(ctx, -s * 1.5, 0, s * 3, s * 1.5, glow);
  pxFill(ctx, -s * 0.5, 0.3 * s, s, s * 0.8, '#ffffff');

  // 머리 + 빨간 바이저
  pxFill(ctx, -s * 5, -s * 10, s * 10, s * 6, body);
  pxFill(ctx, -s * 4, -s * 9, s * 8, s * 4, dark);
  pxFill(ctx, -s * 3.5, -s * 8, s * 7, s * 2.2, '#000000');
  pxFill(ctx, -s * 3, -s * 7.6, s * 6, s * 1.4, `rgba(255,77,109,${0.65 + pulse * 0.35})`);
  pxFill(ctx, -s * 1.5, -s * 7.3, s * 1.2, s * 0.7, '#ffffff');
  // 화난 눈썹 플레이트
  pxFill(ctx, -s * 3.5, -s * 9.2, s * 2.8, s * 0.7, metal);
  pxFill(ctx, s * 0.7, -s * 9.2, s * 2.8, s * 0.7, metal);

  // 팔 / 클로
  pxFill(ctx, -s * 9, -s * 3, s * 3, s * 6, body);
  pxFill(ctx, s * 6, -s * 3, s * 3, s * 6, body);
  pxFill(ctx, -s * 10, s * 1.5, s * 3.5, s * 2.5, metal);
  pxFill(ctx, s * 6.5, s * 1.5, s * 3.5, s * 2.5, metal);
  pxFill(ctx, -s * 10.5, s * 3.5, s * 1.5, s * 2, glow);
  pxFill(ctx, -s * 8.5, s * 3.5, s * 1.5, s * 2, glow);
  pxFill(ctx, s * 7, s * 3.5, s * 1.5, s * 2, glow);
  pxFill(ctx, s * 9, s * 3.5, s * 1.5, s * 2, glow);

  if (kind === 'boss') {
    pxFill(ctx, -s * 8, -s * 6, s * 2.5, s * 3, glow);
    pxFill(ctx, s * 5.5, -s * 6, s * 2.5, s * 3, glow);
    pxFill(ctx, -s * 3, s * 5, s * 6, s * 2, '#5a189a');
  }

  ctx.restore();
}

function render(ctx, state, view) {
  const p = state.player;
  const camX = p.x - view.width / 2;
  const camY = p.y - view.height / 2;

  // 배경
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.imageSmoothingEnabled = false;

  const tile = art.bg ? 256 : 64;
  const x0 = Math.floor(camX / tile) * tile;
  const y0 = Math.floor(camY / tile) * tile;
  for (let y = y0; y < camY + view.height + tile; y += tile) {
    for (let x = x0; x < camX + view.width + tile; x += tile) {
      if (art.bg) {
        ctx.drawImage(art.bg, x, y, tile, tile);
      } else {
        const odd = ((x / tile) + (y / tile)) & 1;
        ctx.fillStyle = odd ? palette.groundA : palette.groundB;
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }

  // 월드 경계
  ctx.strokeStyle = '#ffd16655';
  ctx.lineWidth = 4;
  ctx.strokeRect(-state.half, -state.half, CONFIG.worldSize, CONFIG.worldSize);

  // 보석
  for (const g of state.gems) {
    ctx.fillStyle = '#7bed9f';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - 7);
    ctx.lineTo(g.x + 6, g.y);
    ctx.lineTo(g.x, g.y + 7);
    ctx.lineTo(g.x - 6, g.y);
    ctx.closePath();
    ctx.fill();
  }

  // 화염 존
  for (const z of state.zones) {
    const a = Math.max(0.15, Math.min(0.45, z.life / 2));
    ctx.fillStyle = `rgba(255,110,60,${a})`;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb36b88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd16688';
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2 + state.time * 0.8;
      const radius = z.r * (0.35 + (i % 2) * 0.25);
      ctx.beginPath();
      ctx.ellipse(z.x + Math.cos(angle) * radius, z.y + Math.sin(angle) * radius,
        3, 6 + Math.sin(state.time * 9 + i) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 나쁜 로봇 적
  for (const e of state.enemies) {
    drawBadRobot(ctx, e.x, e.y, e, state.time);
    if (e.kind === 'boss' || e.kind === 'elite') {
      ctx.fillStyle = '#00000055';
      ctx.fillRect(e.x - e.r, e.y - e.r - 14, e.r * 2, 5);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(e.x - e.r, e.y - e.r - 14, e.r * 2 * (e.hp / e.maxHp), 5);
    }
  }

  // 번개 FX
  for (const f of state.fx) {
    if (f.kind === 'damage') {
      ctx.globalAlpha = Math.min(1, f.life * 5);
      ctx.fillStyle = '#fff3b0';
      ctx.font = '800 12px Malgun Gothic, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === 'burst') {
      ctx.strokeStyle = `rgba(255,220,140,${f.life * 2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r + (0.3 - f.life) * 55, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (f.kind !== 'lightning') continue;
    ctx.strokeStyle = `rgba(255,230,100,${Math.min(1, f.life * 6)})`;
    ctx.lineWidth = 3;
    for (const b of f.bolts) {
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo((b.x1 + b.x2) / 2 + 7, (b.y1 + b.y2) / 2 - 7);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
  }

  // 투사체
  for (const b of state.projectiles) {
    ctx.strokeStyle = b.kind === 'ghost' ? '#d0bfff88' : '#9ad0ff66';
    ctx.lineWidth = b.r;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = b.kind === 'ghost' ? '#d0bfff' : b.kind === 'bolt' ? '#70e0ff' : '#9ad0ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 회전톱
  if (state.saws > 0) {
    const radius = skillStats(state, 'saw').radius;
    for (let i = 0; i < state.saws; i++) {
      const ang = state.sawAngle + (i / state.saws) * Math.PI * 2;
      const sx = p.x + Math.cos(ang) * radius;
      const sy = p.y + Math.sin(ang) * radius;
      ctx.fillStyle = '#c7f0ff';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy);
      ctx.lineTo(sx + 7, sy);
      ctx.moveTo(sx, sy - 7);
      ctx.lineTo(sx, sy + 7);
      ctx.stroke();
    }
  }

  // 드론
  if (state.drones > 0) {
    for (let i = 0; i < state.drones; i++) {
      const ang = state.time * 1.6 + (i / state.drones) * Math.PI * 2;
      const ox = p.x + Math.cos(ang) * 48;
      const oy = p.y + Math.sin(ang) * 48;
      ctx.fillStyle = '#70e0ff';
      ctx.fillRect(ox - 7, oy - 5, 14, 10);
      ctx.fillStyle = '#1a2430';
      ctx.fillRect(ox - 3, oy - 2, 6, 4);
    }
  }

  // 착한 로봇 주인공
  const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  if (!blink) {
    drawGoodRobot(ctx, p.x, p.y, p.r, p.facing || 0, state.time);
  }

  ctx.restore();

  // HUD
  const remain = Math.max(0, CONFIG.duration - state.time);
  const mm = String(Math.floor(remain / 60)).padStart(1, '0');
  const ss = String(Math.floor(remain % 60)).padStart(2, '0');

  ctx.fillStyle = '#00000066';
  drawRounded(ctx, 12, 10, view.width - 24, 54, 12);
  ctx.fill();

  // HP
  ctx.fillStyle = '#ffffff22';
  drawRounded(ctx, 22, 18, 160, 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  drawRounded(ctx, 22, 18, 160 * (p.hp / p.maxHp), 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.text;
  ctx.font = '700 11px Malgun Gothic, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 26, 48);

  ctx.textAlign = 'center';
  ctx.font = '800 18px Malgun Gothic, sans-serif';
  ctx.fillStyle = palette.primary;
  ctx.fillText(`${mm}:${ss}`, view.width / 2, 34);
  ctx.font = '700 11px Malgun Gothic, sans-serif';
  ctx.fillStyle = palette.text;
  ctx.fillText(`Lv.${state.level}  처치 ${state.kills}`, view.width / 2, 50);
  ctx.textAlign = 'left';

  // XP bar
  ctx.fillStyle = '#ffffff22';
  drawRounded(ctx, view.width - 170, 18, 148, 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.cool;
  drawRounded(ctx, view.width - 170, 18, 148 * (state.xp / state.xpToNext), 12, 6);
  ctx.fill();

  // 보유 스킬 아이콘
  const ids = Object.keys(state.skills).filter((id) => state.skills[id] > 0);
  let ix = 16;
  for (const id of ids) {
    const s = SKILLS[id];
    ctx.fillStyle = s.color;
    drawRounded(ctx, ix, 72, 36, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#1a2430';
    ctx.font = '800 9px Malgun Gothic, sans-serif';
    const short = { kunai: '쿠', molotov: '화', drone: '드', lightning: '번', saw: '톱',
      drink: '속', vit: '체', power: '공', magnet: '자', cooldown: '쿨' };
    const lvText = state.evolved[id] ? '★' : (s.max >= 99 ? `Lv${state.skills[id]}` : `${state.skills[id]}/${s.max}`);
    ctx.fillText(`${short[id]} ${lvText}`, ix + 3, 88);
    if (s.max <= 8) {
      for (let n = 0; n < s.max; n++) {
        ctx.fillStyle = n < state.skills[id] ? '#1a2430' : '#1a243044';
        ctx.fillRect(ix + 4 + n * 6, 93, 4, 3);
      }
    }
    ix += 40;
  }

  // 가상 조이스틱
  const stickR = 52;
  const baseX = state.stick.active ? state.stick.ox : 78;
  const baseY = state.stick.active ? state.stick.oy : view.height - 88;
  ctx.fillStyle = '#ffffff22';
  ctx.beginPath();
  ctx.arc(baseX, baseY, stickR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth = 2;
  ctx.stroke();
  const knobX = baseX + (state.stick.nx || 0) * 28;
  const knobY = baseY + (state.stick.ny || 0) * 28;
  ctx.fillStyle = '#ffd166cc';
  ctx.beginPath();
  ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
  ctx.fill();

  if (state.banner) {
    ctx.fillStyle = '#00000088';
    drawRounded(ctx, view.width / 2 - 110, 110, 220, 36, 12);
    ctx.fill();
    ctx.fillStyle = palette.primary;
    ctx.font = '800 15px Malgun Gothic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.banner.text, view.width / 2, 133);
    ctx.textAlign = 'left';
  }

  // 레벨업 선택
  if (state.choices) {
    layoutChoices(state);
    ctx.fillStyle = '#0b121ccc';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.fillStyle = palette.primary;
    ctx.font = '800 22px Malgun Gothic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('레벨 업! 스킬을 고르세요', view.width / 2, 120);
    ctx.font = '600 12px Malgun Gothic, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.fillText('카드를 터치·클릭하거나 숫자 1·2·3', view.width / 2, 144);

    for (const card of state.choiceLayout) {
      const info = choiceLabel(card.id, state);
      ctx.fillStyle = '#243445';
      drawRounded(ctx, card.x, card.y, card.w, card.h, 14);
      ctx.fill();
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 3;
      drawRounded(ctx, card.x, card.y, card.w, card.h, 14);
      ctx.stroke();

      ctx.fillStyle = info.color;
      drawRounded(ctx, card.x + 14, card.y + 14, card.w - 28, 36, 10);
      ctx.fill();

      ctx.fillStyle = '#1a2430';
      ctx.font = '800 10px Malgun Gothic, sans-serif';
      ctx.fillText(`${info.tag} · ${info.level}`, card.x + card.w / 2, card.y + 37);

      ctx.fillStyle = palette.text;
      ctx.font = '800 14px Malgun Gothic, sans-serif';
      ctx.fillText(info.name, card.x + card.w / 2, card.y + 72);

      ctx.font = '600 11px Malgun Gothic, sans-serif';
      ctx.fillStyle = '#ffffffcc';
      wrapText(ctx, info.desc, card.x + card.w / 2, card.y + 94, card.w - 16, 14);
    }
    ctx.textAlign = 'left';
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = '';
  let yy = y;
  for (const ch of chars) {
    if (ch === '\n') {
      ctx.fillText(line, x, yy);
      line = '';
      yy += lineHeight;
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

mountGame({
  title: CONFIG.title,
  description:
    '착한 로봇이 나쁜 로봇 무리를 막아요! 공격은 자동!\n초록 보석을 모으면 레벨 업 · 레벨업 5번이면 보스 로봇 등장!\n쿠나이 Lv.5 + 에너지 드링크 → 다음 레벨에 유령 수리검 돌파!',
  controls:
    '이동만 조작합니다. 휴대폰: 화면을 밀거나 왼쪽 조이스틱. PC: WASD·방향키.\n공격은 자동입니다. ESC로 쉬었다가 이어서 할 수 있어요.',
  width: W,
  height: H,
  theme: palette,
  create: createGame,
  update(state, dt, input) {
    // 선택 중에도 포인터 pressed를 받기 위해 update는 항상 호출
    updateGame(state, dt, input);
  },
  render,
});
