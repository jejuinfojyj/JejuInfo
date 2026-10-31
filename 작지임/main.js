import { mountGame } from './game-shell.js';
import { loadImage } from './game-tools.js';
import { CONFIG, SKILLS } from './config.mjs';
import { createGame, updateGame, choiceLabel, skillStats } from './game.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const palette = CONFIG.palette;

/** 클레이 스타일 그림 (상대 경로) */
const ASSET_PATHS = {
  player: './assets/player_sheet.png',
  basic: './assets/basic_enemy_sheet.png',
  fast: './assets/fast_enemy_sheet.png',
  elite: './assets/elite_enemy_sheet.png',
  boss: './assets/boss_enemy_sheet.png',
  background: './assets/background.png',
  props: './assets/props_atlas.png',
};

const art = {
  ready: false,
  player: null,
  basic: null,
  fast: null,
  elite: null,
  boss: null,
  background: null,
  props: null,
};

const SHEET_COLS = 5;
const SHEET_ROWS = 4;
const PROP_COLS = 3;
const PROP_ROWS = 3;
const PROP = {
  gem: [0, 0],
  kunai: [1, 0],
  ghost: [2, 0],
  fire: [0, 1],
  drone: [1, 1],
  droneAlt: [2, 1],
  lightning: [0, 2],
  saw: [1, 2],
  boom: [2, 2],
};

Promise.all(
  Object.entries(ASSET_PATHS).map(async ([key, src]) => {
    art[key] = await loadImage(src);
  }),
).then(() => {
  art.ready = true;
}).catch((err) => {
  console.warn('그림 일부 로드 실패', err);
});

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

function facingRow(angle) {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  if (deg >= 315 || deg < 45) return 1; // 오른쪽
  if (deg >= 45 && deg < 135) return 3; // 아래
  if (deg >= 135 && deg < 225) return 2; // 왼쪽
  return 0; // 위
}

function walkFrame(time, moving) {
  if (!moving) return 0;
  return Math.floor(time * 10) % SHEET_COLS;
}

function drawSheet(ctx, image, col, row, cols, rows, x, y, size, flash = false) {
  if (!image?.complete || !image.naturalWidth) return false;
  const fw = Math.floor(image.naturalWidth / cols);
  const fh = Math.floor(image.naturalHeight / rows);
  const dx = x - size / 2;
  const dy = y - size / 2;
  if (flash) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.filter = 'brightness(2.2)';
    ctx.drawImage(image, col * fw, row * fh, fw, fh, dx, dy, size, size);
    ctx.restore();
  } else {
    ctx.drawImage(image, col * fw, row * fh, fw, fh, dx, dy, size, size);
  }
  return true;
}

function drawProp(ctx, cell, x, y, size, angle = 0) {
  if (!art.props?.complete) return false;
  const [col, row] = cell;
  if (!angle) return drawSheet(ctx, art.props, col, row, PROP_COLS, PROP_ROWS, x, y, size);
  const fw = Math.floor(art.props.naturalWidth / PROP_COLS);
  const fh = Math.floor(art.props.naturalHeight / PROP_ROWS);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(art.props, col * fw, row * fh, fw, fh, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

function enemySheet(kind) {
  if (kind === 'fast') return art.fast;
  if (kind === 'elite') return art.elite;
  if (kind === 'boss' || kind === 'giant') return art.boss;
  return art.basic;
}

function render(ctx, state, view) {
  const p = state.player;
  const camX = p.x - view.width / 2;
  const camY = p.y - view.height / 2;

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.save();
  ctx.translate(-camX, -camY);

  // 클레이 전장 바닥
  const tile = 180;
  const x0 = Math.floor(camX / tile) * tile;
  const y0 = Math.floor(camY / tile) * tile;
  if (art.background?.complete) {
    for (let y = y0; y < camY + view.height + tile; y += tile) {
      for (let x = x0; x < camX + view.width + tile; x += tile) {
        ctx.drawImage(art.background, x, y, tile, tile);
      }
    }
  } else {
    for (let y = y0; y < camY + view.height + tile; y += tile) {
      for (let x = x0; x < camX + view.width + tile; x += tile) {
        const odd = ((x / tile) + (y / tile)) & 1;
        ctx.fillStyle = odd ? palette.groundA : palette.groundB;
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }

  ctx.strokeStyle = '#ffd16655';
  ctx.lineWidth = 4;
  ctx.strokeRect(-state.half, -state.half, CONFIG.worldSize, CONFIG.worldSize);

  // 보석
  for (const g of state.gems) {
    if (!drawProp(ctx, PROP.gem, g.x, g.y, 22)) {
      ctx.fillStyle = '#7bed9f';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - 7);
      ctx.lineTo(g.x + 6, g.y);
      ctx.lineTo(g.x, g.y + 7);
      ctx.lineTo(g.x - 6, g.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 화염 존
  for (const z of state.zones) {
    const a = Math.max(0.2, Math.min(0.55, z.life / 2));
    ctx.globalAlpha = a;
    if (!drawProp(ctx, PROP.fire, z.x, z.y, z.r * 2.1)) {
      ctx.fillStyle = `rgba(255,110,60,${a})`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 적
  for (const e of state.enemies) {
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    const row = facingRow(ang);
    const col = walkFrame(state.time + e.x * 0.01, true);
    const size = e.kind === 'giant' ? e.r * 2.8
      : e.kind === 'boss' ? e.r * 3.2
      : e.kind === 'elite' ? e.r * 2.8
      : e.r * 2.6;
    const sheet = enemySheet(e.kind);
    const drawn = drawSheet(ctx, sheet, col, row, SHEET_COLS, SHEET_ROWS, e.x, e.y, size, e.flash > 0);
    if (!drawn) {
      const colors = {
        basic: '#6c8cff', fast: '#ffd166', elite: '#ef476f', boss: '#c77dff', giant: '#ff6b35',
      };
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : colors[e.kind] || '#6c8cff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.kind === 'boss' || e.kind === 'elite' || e.kind === 'giant') {
      const barW = e.kind === 'giant' ? e.r * 2.2 : e.r * 2;
      ctx.fillStyle = '#00000055';
      ctx.fillRect(e.x - barW / 2, e.y - e.r - 12, barW, 6);
      ctx.fillStyle = e.kind === 'giant' ? '#ff9f1c' : '#ff6b6b';
      ctx.fillRect(e.x - barW / 2, e.y - e.r - 12, barW * (e.hp / e.maxHp), 6);
    }
  }

  // FX
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
      const boomSize = (f.r + (0.3 - f.life) * 55) * 2;
      ctx.globalAlpha = Math.min(1, f.life * 3);
      if (!drawProp(ctx, PROP.boom, f.x, f.y, boomSize)) {
        ctx.strokeStyle = `rgba(255,220,140,${f.life * 2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r + (0.3 - f.life) * 55, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === 'op') {
      const pulse = 1 - Math.max(0, Math.min(1, f.life / 0.55));
      ctx.globalAlpha = 0.55 * (1 - pulse);
      drawProp(ctx, PROP.boom, f.x, f.y, f.r * (0.7 + pulse * 0.6) * 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,209,102,${0.9 * (1 - pulse)})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.7 + pulse * 0.4), 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (f.kind !== 'lightning') continue;
    ctx.globalAlpha = Math.min(1, f.life * 6);
    for (const b of f.bolts) {
      const mx = (b.x1 + b.x2) / 2;
      const my = (b.y1 + b.y2) / 2;
      drawProp(ctx, PROP.lightning, mx, my, 36);
    }
    ctx.globalAlpha = 1;
  }

  // 투사체
  for (const b of state.projectiles) {
    const ang = Math.atan2(b.vy, b.vx);
    const cell = b.kind === 'ghost' ? PROP.ghost : b.kind === 'bolt' ? PROP.droneAlt : PROP.kunai;
    const size = b.kind === 'ghost' ? 28 : 22;
    if (!drawProp(ctx, cell, b.x, b.y, size, ang)) {
      ctx.fillStyle = b.kind === 'ghost' ? '#d0bfff' : b.kind === 'bolt' ? '#70e0ff' : '#9ad0ff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 회전톱
  if (state.saws > 0) {
    const radius = skillStats(state, 'saw').radius;
    for (let i = 0; i < state.saws; i++) {
      const ang = state.sawAngle + (i / state.saws) * Math.PI * 2;
      const sx = p.x + Math.cos(ang) * radius;
      const sy = p.y + Math.sin(ang) * radius;
      if (!drawProp(ctx, PROP.saw, sx, sy, 28, state.sawAngle * 2)) {
        ctx.fillStyle = '#c7f0ff';
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 드론
  if (state.drones > 0) {
    for (let i = 0; i < state.drones; i++) {
      const ang = state.time * 1.6 + (i / state.drones) * Math.PI * 2;
      const ox = p.x + Math.cos(ang) * 48;
      const oy = p.y + Math.sin(ang) * 48;
      if (!drawProp(ctx, PROP.drone, ox, oy, 30)) {
        ctx.fillStyle = '#70e0ff';
        ctx.fillRect(ox - 7, oy - 5, 14, 10);
      }
    }
  }

  // 플레이어
  const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  if (!blink) {
    const moving = Math.hypot(state.stick.nx || 0, state.stick.ny || 0) > 0.08;
    const row = facingRow(p.facing || 0);
    const col = walkFrame(state.time, moving || true);
    const drawn = drawSheet(ctx, art.player, col, row, SHEET_COLS, SHEET_ROWS, p.x, p.y, 52);
    if (!drawn) {
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

  // HUD
  const remain = Math.max(0, CONFIG.duration - state.time);
  const mm = String(Math.floor(remain / 60)).padStart(1, '0');
  const ss = String(Math.floor(remain % 60)).padStart(2, '0');

  ctx.fillStyle = '#00000066';
  drawRounded(ctx, 12, 10, view.width - 24, 54, 12);
  ctx.fill();

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

  ctx.fillStyle = '#ffffff22';
  drawRounded(ctx, view.width - 170, 18, 148, 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.cool;
  drawRounded(ctx, view.width - 170, 18, 148 * (state.xp / state.xpToNext), 12, 6);
  ctx.fill();

  const ids = Object.keys(state.skills).filter((id) => state.skills[id] > 0);
  let ix = 16;
  for (const id of ids) {
    const s = SKILLS[id];
    ctx.fillStyle = s.color;
    drawRounded(ctx, ix, 72, 36, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#1a2430';
    ctx.font = '800 9px Malgun Gothic, sans-serif';
    const short = {
      kunai: '쿠', molotov: '화', drone: '드', lightning: '번', saw: '톱',
      drink: '속', vit: '체', power: '공', magnet: '자', cooldown: '쿨',
    };
    ctx.fillText(`${short[id]} ${state.evolved[id] ? '★' : state.skills[id] + '/5'}`, ix + 3, 88);
    for (let n = 0; n < s.max; n++) {
      ctx.fillStyle = n < state.skills[id] ? '#1a2430' : '#1a243044';
      ctx.fillRect(ix + 4 + n * 6, 93, 4, 3);
    }
    ix += 40;
  }

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

  const op = CONFIG.opBlast;
  const btn = op.button;
  const canOp = (state.opCooldown || 0) <= 0 && p.hp > op.hpCost;
  ctx.fillStyle = canOp ? '#ef476fcc' : '#ffffff22';
  ctx.beginPath();
  ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = canOp ? '#ffd166' : '#ffffff55';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = palette.text;
  ctx.textAlign = 'center';
  ctx.font = '800 14px Malgun Gothic, sans-serif';
  if ((state.opCooldown || 0) > 0) {
    ctx.fillText(`${Math.ceil(state.opCooldown)}`, btn.x, btn.y + 5);
  } else {
    ctx.fillText('OP', btn.x, btn.y - 2);
    ctx.font = '700 10px Malgun Gothic, sans-serif';
    ctx.fillText(`-${op.hpCost}`, btn.x, btn.y + 14);
  }
  ctx.textAlign = 'left';

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
    '4분 동안 이동하며 살아남으세요. 공격은 자동!\n30초마다 거대 개체(피해 50)가 나와요.\n러쉬·OP로 버티며 레벨 업 하세요!',
  controls:
    '이동: 휴대폰은 화면 밀기·왼쪽 조이스틱, PC는 WASD·방향키.\nOP: 오른쪽 OP 버튼 또는 Space/Enter (체력 40 소모).\n공격은 자동 · ESC로 쉬기.',
  width: W,
  height: H,
  theme: palette,
  create: createGame,
  update(state, dt, input) {
    updateGame(state, dt, input);
  },
  render,
});
