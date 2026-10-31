import { mountGame } from './game-shell.js';
import { CONFIG, SKILLS } from './config.mjs';
import { createGame, updateGame, choiceLabel, skillStats } from './game.mjs';
import { art, loadArt, drawSheetSprite, drawBackgroundTiled, drawPropGem, enemySheet } from './art.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const palette = CONFIG.palette;
loadArt().catch((err) => console.warn('그림 불러오기 실패', err));

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

function softGlow(ctx, x, y, r, color, alpha = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawShadow(ctx, x, y, rx, ry = rx * 0.35) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + ry * 1.6, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function render(ctx, state, view) {
  const p = state.player;
  const shake = state.shake || 0;
  const shakeX = shake > 0 ? (Math.random() - 0.5) * 10 * shake : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * 10 * shake : 0;
  const camX = p.x - view.width / 2 + shakeX;
  const camY = p.y - view.height / 2 + shakeY;

  // 분위기 배경
  const sky = ctx.createLinearGradient(0, 0, 0, view.height);
  sky.addColorStop(0, '#121a24');
  sky.addColorStop(0.45, palette.background);
  sky.addColorStop(1, '#0d141c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.save();
  ctx.translate(-camX, -camY);

  if (!drawBackgroundTiled(ctx, art.background, camX, camY, view.width, view.height)) {
    const tile = 64;
    const x0 = Math.floor(camX / tile) * tile;
    const y0 = Math.floor(camY / tile) * tile;
    for (let y = y0; y < camY + view.height + tile; y += tile) {
      for (let x = x0; x < camX + view.width + tile; x += tile) {
        const odd = ((x / tile) + (y / tile)) & 1;
        ctx.fillStyle = odd ? palette.groundA : palette.groundB;
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }

  // 플레이어 주변 조명
  softGlow(ctx, p.x, p.y, 160, 'rgba(255,209,102,0.55)', 0.22);

  // 월드 경계
  ctx.strokeStyle = 'rgba(255,209,102,0.22)';
  ctx.lineWidth = 6;
  ctx.strokeRect(-state.half, -state.half, CONFIG.worldSize, CONFIG.worldSize);
  ctx.strokeStyle = 'rgba(255,209,102,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-state.half + 4, -state.half + 4, CONFIG.worldSize - 8, CONFIG.worldSize - 8);

  // 경험치 보석
  for (const g of state.gems) {
    softGlow(ctx, g.x, g.y, 22, 'rgba(123,237,159,1)', 0.45);
    drawShadow(ctx, g.x, g.y, 7, 3);
    if (!drawPropGem(ctx, art.props, g.x, g.y, state.time)) {
      const pulse = 1 + Math.sin(state.time * 9 + g.x * 0.01) * 0.12;
      ctx.fillStyle = '#3dd68c';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 10 * pulse);
      ctx.lineTo(g.x + 9 * pulse, g.y);
      ctx.lineTo(g.x, g.y + 10 * pulse);
      ctx.lineTo(g.x - 9 * pulse, g.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 화염 존
  for (const z of state.zones) {
    const a = Math.max(0.18, Math.min(0.5, z.life / 2));
    softGlow(ctx, z.x, z.y, z.r * 1.2, 'rgba(255,110,60,0.85)', a);
    const flame = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
    flame.addColorStop(0, `rgba(255,220,120,${a + 0.15})`);
    flame.addColorStop(0.55, `rgba(255,110,60,${a})`);
    flame.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb36b88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd166aa';
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2 + state.time * 1.2;
      const radius = z.r * (0.28 + (i % 2) * 0.28);
      ctx.beginPath();
      ctx.ellipse(
        z.x + Math.cos(angle) * radius,
        z.y + Math.sin(angle) * radius,
        3,
        7 + Math.sin(state.time * 10 + i) * 2.5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // 적
  const colors = {
    basic: '#6c8cff',
    fast: '#ffd166',
    flyer: '#7bed9f',
    elite: '#ef476f',
    giant: '#ff9f1c',
    titan: '#ff2d55',
    boss: '#c77dff',
    finalBoss: '#ff3d71',
  };
  for (const e of state.enemies) {
    const base = colors[e.kind] || '#6c8cff';
    const hover = e.flying ? (e.hover || 28) + Math.sin((e.bob || 0)) * 8 : 0;
    const drawY = e.y - hover;
    drawShadow(ctx, e.x, e.y, e.flying ? e.r * 0.7 : e.r * 0.95, e.flying ? e.r * 0.22 : e.r * 0.3);
    if (e.kind === 'giant' || e.kind === 'titan' || e.kind === 'boss' || e.kind === 'finalBoss' || e.flying) {
      softGlow(ctx, e.x, drawY, e.r * (e.flying ? 1.8 : 2.2), base, e.flying ? 0.22 : 0.28);
    }
    const facing = Math.atan2(p.y - e.y, p.x - e.x);
    const spriteSize = e.kind === 'finalBoss' ? e.r * 3.6
      : e.kind === 'titan' ? e.r * 3.4
      : e.kind === 'giant' || e.kind === 'boss' ? e.r * 3.1
        : e.flying ? e.r * 3.0
          : e.r * 2.8;
    ctx.save();
    if (e.flash > 0) ctx.globalAlpha = 0.85;
    const drawn = drawSheetSprite(
      ctx,
      enemySheet(e.kind),
      e.x,
      drawY,
      facing,
      state.time * (e.flying ? 1.6 : 1) + e.x * 0.01,
      spriteSize,
      true,
    );
    ctx.restore();
    if (!drawn) {
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : base;
      ctx.beginPath();
      ctx.arc(e.x, drawY, e.r, 0, Math.PI * 2);
      ctx.fill();
      if (e.flying) {
        ctx.strokeStyle = '#ffffff66';
        ctx.beginPath();
        ctx.ellipse(e.x - e.r * 0.6, drawY, 8, 3, -0.4, 0, Math.PI * 2);
        ctx.ellipse(e.x + e.r * 0.6, drawY, 8, 3, 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (e.kind === 'boss' || e.kind === 'finalBoss' || e.kind === 'elite' || e.kind === 'giant' || e.kind === 'titan') {
      const bw = Math.max(36, e.r * 2);
      const bx = e.x - bw / 2;
      const by = drawY - spriteSize * 0.78;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      drawRounded(ctx, bx, by, bw, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#ff6b6b';
      drawRounded(ctx, bx, by, bw * Math.max(0, e.hp / e.maxHp), 6, 3);
      ctx.fill();
    }
  }

  // FX
  for (const f of state.fx) {
    if (f.kind === 'damage') {
      ctx.globalAlpha = Math.min(1, f.life * 5);
      ctx.fillStyle = '#fff3b0';
      ctx.font = '800 13px Malgun Gothic, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00000088';
      ctx.shadowBlur = 4;
      ctx.fillText(f.text, f.x, f.y);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === 'burst') {
      const t = Math.max(0, f.life);
      ctx.strokeStyle = `rgba(255,220,140,${Math.min(1, t * 2.4)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r + (0.35 - t) * 70, 0, Math.PI * 2);
      ctx.stroke();
      softGlow(ctx, f.x, f.y, f.r + 28, 'rgba(255,200,120,0.8)', Math.min(0.45, t));
      continue;
    }
    if (f.kind === 'spark') {
      const t = Math.max(0, f.life);
      for (let i = 0; i < 6; i++) {
        const ang = i / 6 * Math.PI * 2 + t * 4;
        const dist = (0.4 - t) * 40;
        ctx.globalAlpha = Math.min(1, t * 3);
        ctx.fillStyle = f.color || '#9ad0ff';
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(ang) * dist, f.y + Math.sin(ang) * dist, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind !== 'lightning') continue;
    ctx.strokeStyle = `rgba(255,230,100,${Math.min(1, f.life * 6)})`;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#ffe66d';
    ctx.shadowBlur = 8;
    for (const b of f.bolts) {
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo((b.x1 + b.x2) / 2 + 7, (b.y1 + b.y2) / 2 - 7);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 투사체
  for (const b of state.projectiles) {
    const col = b.kind === 'ghost' ? '#d0bfff' : b.kind === 'bolt' ? '#70e0ff' : '#9ad0ff';
    softGlow(ctx, b.x, b.y, b.r * 4, col, 0.35);
    ctx.strokeStyle = `${col}88`;
    ctx.lineWidth = b.r;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.04, b.y - b.vy * 0.04);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffffcc';
    ctx.beginPath();
    ctx.arc(b.x - 1, b.y - 1, Math.max(1.5, b.r * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }

  // 회전톱
  if (state.saws > 0) {
    const radius = skillStats(state, 'saw').radius;
    for (let i = 0; i < state.saws; i++) {
      const ang = state.sawAngle + (i / state.saws) * Math.PI * 2;
      const sx = p.x + Math.cos(ang) * radius;
      const sy = p.y + Math.sin(ang) * radius;
      softGlow(ctx, sx, sy, 18, '#c7f0ff', 0.4);
      drawShadow(ctx, sx, sy, 8, 3);
      ctx.fillStyle = '#c7f0ff';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffffcc';
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
      softGlow(ctx, ox, oy, 16, '#70e0ff', 0.35);
      drawShadow(ctx, ox, oy, 8, 3);
      ctx.fillStyle = '#70e0ff';
      drawRounded(ctx, ox - 8, oy - 6, 16, 12, 4);
      ctx.fill();
      ctx.fillStyle = '#1a2430';
      drawRounded(ctx, ox - 3, oy - 2, 6, 4, 2);
      ctx.fill();
      ctx.fillStyle = '#e8fbff';
      ctx.fillRect(ox - 2, oy - 1, 4, 2);
    }
  }

  // 플레이어
  const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  if (!blink) {
    drawShadow(ctx, p.x, p.y, 16, 6);
    softGlow(ctx, p.x, p.y, 34, 'rgba(255,209,102,0.9)', 0.35);
    const moving = state.moving || Math.hypot(state.stick?.nx || 0, state.stick?.ny || 0) > 0.15;
    if (!drawSheetSprite(ctx, art.player, p.x, p.y, p.facing || 0, state.time, 52, moving)) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.facing || 0);
      ctx.fillStyle = palette.primary;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, 12);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, -12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();

  // 비네팅
  const vig = ctx.createRadialGradient(
    view.width / 2,
    view.height / 2,
    view.height * 0.25,
    view.width / 2,
    view.height / 2,
    view.height * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, view.width, view.height);

  // HUD
  const remain = state.bossPhase
    ? Math.max(0, (CONFIG.bossPhase || 180) - (state.bossTime || 0))
    : Math.max(0, CONFIG.duration - state.time);
  const mm = String(Math.floor(remain / 60)).padStart(1, '0');
  const ss = String(Math.floor(remain % 60)).padStart(2, '0');

  ctx.fillStyle = 'rgba(8,12,18,0.72)';
  drawRounded(ctx, 12, 10, view.width - 24, 58, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.18)';
  ctx.lineWidth = 1.5;
  drawRounded(ctx, 12, 10, view.width - 24, 58, 14);
  ctx.stroke();

  // HP
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  drawRounded(ctx, 22, 20, 160, 14, 7);
  ctx.fill();
  const hpW = 160 * Math.max(0, p.hp / p.maxHp);
  const hpGrad = ctx.createLinearGradient(22, 20, 22 + 160, 20);
  hpGrad.addColorStop(0, '#ff8a80');
  hpGrad.addColorStop(1, palette.accent);
  ctx.fillStyle = hpGrad;
  drawRounded(ctx, 22, 20, hpW, 14, 7);
  ctx.fill();
  ctx.fillStyle = palette.text;
  ctx.font = '700 11px Malgun Gothic, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 26, 52);

  ctx.textAlign = 'center';
  ctx.font = '800 20px Malgun Gothic, sans-serif';
  ctx.fillStyle = palette.primary;
  ctx.shadowColor = 'rgba(255,209,102,0.35)';
  ctx.shadowBlur = 8;
  ctx.fillText(`${mm}:${ss}`, view.width / 2, 36);
  ctx.shadowBlur = 0;
  ctx.font = '700 11px Malgun Gothic, sans-serif';
  ctx.fillStyle = palette.text;
  ctx.fillText(
    state.bossPhase
      ? `보스전  목숨 ${state.lives ?? 0}  처치 ${state.kills}`
      : `Lv.${state.level}  목숨 ${state.lives ?? 0}  처치 ${state.kills}`,
    view.width / 2,
    54,
  );
  ctx.textAlign = 'left';

  // XP bar
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  drawRounded(ctx, view.width - 170, 20, 148, 14, 7);
  ctx.fill();
  const xpGrad = ctx.createLinearGradient(view.width - 170, 20, view.width - 22, 20);
  xpGrad.addColorStop(0, '#06d6a0');
  xpGrad.addColorStop(1, '#7bed9f');
  ctx.fillStyle = xpGrad;
  drawRounded(ctx, view.width - 170, 20, 148 * (state.xp / state.xpToNext), 14, 7);
  ctx.fill();

  // 보유 스킬 아이콘
  const ids = Object.keys(state.skills).filter((id) => state.skills[id] > 0);
  let ix = 16;
  for (const id of ids) {
    const s = SKILLS[id];
    ctx.fillStyle = 'rgba(8,12,18,0.55)';
    drawRounded(ctx, ix - 1, 74, 38, 34, 10);
    ctx.fill();
    ctx.fillStyle = s.color;
    drawRounded(ctx, ix, 75, 36, 30, 9);
    ctx.fill();
    ctx.fillStyle = '#1a2430';
    ctx.font = '800 9px Malgun Gothic, sans-serif';
    const short = {
      kunai: '쿠', molotov: '화', drone: '드', lightning: '번', saw: '톱',
      drink: '속', vit: '체', power: '공', magnet: '자', cooldown: '쿨',
    };
    ctx.fillText(`${short[id]} ${state.evolved[id] ? '★' : state.skills[id] + '/5'}`, ix + 3, 92);
    for (let n = 0; n < s.max; n++) {
      ctx.fillStyle = n < state.skills[id] ? '#1a2430' : '#1a243044';
      ctx.fillRect(ix + 4 + n * 6, 98, 4, 3);
    }
    ix += 40;
  }

  // 가상 조이스틱
  const stickR = 52;
  const baseX = state.stick.active ? state.stick.ox : 78;
  const baseY = state.stick.active ? state.stick.oy : view.height - 88;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(baseX, baseY, stickR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const knobX = baseX + (state.stick.nx || 0) * 28;
  const knobY = baseY + (state.stick.ny || 0) * 28;
  softGlow(ctx, knobX, knobY, 28, 'rgba(255,209,102,0.8)', 0.35);
  ctx.fillStyle = '#ffd166dd';
  ctx.beginPath();
  ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
  ctx.fill();

  if (state.banner) {
    ctx.fillStyle = 'rgba(8,12,18,0.78)';
    drawRounded(ctx, view.width / 2 - 120, 112, 240, 40, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.45)';
    ctx.lineWidth = 2;
    drawRounded(ctx, view.width / 2 - 120, 112, 240, 40, 14);
    ctx.stroke();
    ctx.fillStyle = palette.primary;
    ctx.font = '800 16px Malgun Gothic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.banner.text, view.width / 2, 138);
    ctx.textAlign = 'left';
  }

  // 레벨업 선택
  if (state.choices) {
    layoutChoices(state);
    ctx.fillStyle = 'rgba(8,12,18,0.82)';
    ctx.fillRect(0, 0, view.width, view.height);
    softGlow(ctx, view.width / 2, 160, 180, 'rgba(255,209,102,0.55)', 0.25);
    ctx.fillStyle = palette.primary;
    ctx.font = '800 24px Malgun Gothic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('레벨 업! 스킬을 고르세요', view.width / 2, 118);
    ctx.font = '600 12px Malgun Gothic, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.fillText('카드를 터치·클릭하거나 숫자 1·2·3', view.width / 2, 142);

    for (const card of state.choiceLayout) {
      const info = choiceLabel(card.id, state);
      ctx.fillStyle = 'rgba(20,32,48,0.95)';
      drawRounded(ctx, card.x, card.y, card.w, card.h, 16);
      ctx.fill();
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 3;
      drawRounded(ctx, card.x, card.y, card.w, card.h, 16);
      ctx.stroke();
      softGlow(ctx, card.x + card.w / 2, card.y + 32, 40, info.color, 0.25);

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
    '초강적 모드 + 네모네모 픽셀 그림!\n공중에서 빙빙 도는 비행 몬스터가 나타나요!\n6분 동안 버텨 봐!',
  controls:
    '이동만 조작합니다. 휴대폰: 화면을 밀거나 왼쪽 조이스틱. PC: WASD·방향키.\n공격은 자동입니다. ESC로 쉬었다가 이어서 할 수 있어요.',
  width: W,
  height: H,
  theme: palette,
  create: createGame,
  update(state, dt, input) {
    updateGame(state, dt, input);
  },
  render,
});
