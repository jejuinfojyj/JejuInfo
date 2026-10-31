import { mountGame } from './game-shell.js';
import { CHARACTERS, CONFIG, SKILLS } from './config.mjs';
import { createGame, setCharacter, updateGame, choiceLabel, skillStats } from './game.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const palette = CONFIG.palette;

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

const ACTOR = { cols: 5, rows: 4 };
const PROPS = { cols: 3, rows: 3 };

function loadArt(src, grid) {
  const img = new Image();
  img.onload = () => {
    if (grid) img.cells = sliceSheet(img, grid.cols, grid.rows);
  };
  img.src = src;
  return img;
}

function sliceSheet(img, cols, rows) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const read = canvas.getContext('2d', { willReadFrequently: true });
  read.drawImage(img, 0, 0);
  const cells = [];
  for (let row = 0; row < rows; row++) {
    cells[row] = [];
    for (let col = 0; col < cols; col++) {
      const x0 = Math.round(col * img.naturalWidth / cols);
      const y0 = Math.round(row * img.naturalHeight / rows);
      const x1 = Math.round((col + 1) * img.naturalWidth / cols);
      const y1 = Math.round((row + 1) * img.naturalHeight / rows);
      const w = x1 - x0;
      const h = y1 - y0;
      const data = read.getImageData(x0, y0, w, h).data;
      const box = largestBox(data, w, h);
      cells[row][col] = box
        ? { x: x0 + box.minX, y: y0 + box.minY, w: box.maxX - box.minX + 1, h: box.maxY - box.minY + 1 }
        : { x: x0, y: y0, w, h };
    }
  }
  return cells;
}

function largestBox(data, width, height) {
  const seen = new Uint8Array(width * height);
  let best = null;
  let bestArea = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (seen[start] || data[start * 4 + 3] < 24) {
        seen[start] = 1;
        continue;
      }
      const stack = [start];
      seen[start] = 1;
      let area = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      while (stack.length) {
        const p = stack.pop();
        const px = p % width;
        const py = (p / width) | 0;
        area += 1;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        const next = [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]];
        for (const [nx, ny] of next) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (seen[n]) continue;
          seen[n] = 1;
          if (data[n * 4 + 3] >= 24) stack.push(n);
        }
      }
      if (area > bestArea) {
        bestArea = area;
        best = { minX, minY, maxX, maxY };
      }
    }
  }
  return best;
}

const art = {
  player: loadArt('assets/comic/player.png', ACTOR),
  basic: loadArt('assets/comic/basic.png', ACTOR),
  fast: loadArt('assets/comic/fast.png', ACTOR),
  elite: loadArt('assets/comic/elite.png', ACTOR),
  boss: loadArt('assets/comic/boss.png', ACTOR),
  background: loadArt('assets/comic/background.png'),
  props: loadArt('assets/comic/props.png', PROPS),
};

function facingRow(angle) {
  const deg = ((angle * 180 / Math.PI) % 360 + 360) % 360;
  if (deg >= 45 && deg < 135) return 3;
  if (deg >= 135 && deg < 225) return 2;
  if (deg >= 225 && deg < 315) return 0;
  return 1;
}

function drawFrame(ctx, img, col, row, x, y, height) {
  if (!img?.cells) return false;
  const cell = img.cells[row]?.[col];
  if (!cell) return false;
  const dh = height;
  const dw = dh * (cell.w / cell.h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, cell.x, cell.y, cell.w, cell.h, x - dw / 2, y - dh * 0.62, dw, dh);
  return true;
}

function drawProp(ctx, col, row, x, y, height) {
  const img = art.props;
  const cell = img.cells?.[row]?.[col];
  if (!img.complete || !cell) return false;
  const dh = height;
  const dw = dh * (cell.w / cell.h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, cell.x, cell.y, cell.w, cell.h, x - dw / 2, y - dh / 2, dw, dh);
  return true;
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

  const bg = art.background;
  if (bg.complete && bg.naturalWidth) {
    ctx.imageSmoothingEnabled = true;
    const tile = 320;
    const x0 = Math.floor(camX / tile) * tile;
    const y0 = Math.floor(camY / tile) * tile;
    for (let y = y0; y < camY + view.height + tile; y += tile) {
      for (let x = x0; x < camX + view.width + tile; x += tile) {
        ctx.drawImage(bg, x, y, tile, tile);
      }
    }
  } else {
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

  // 월드 경계
  ctx.strokeStyle = '#ffd16655';
  ctx.lineWidth = 4;
  ctx.strokeRect(-state.half, -state.half, CONFIG.worldSize, CONFIG.worldSize);

  // 보석
  for (const g of state.gems) {
    if (!drawProp(ctx, 0, 0, g.x, g.y, 18)) {
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
    const a = Math.max(0.15, Math.min(0.45, z.life / 2));
    ctx.fillStyle = `rgba(255,110,60,${a})`;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb36b88';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!drawProp(ctx, 0, 1, z.x, z.y, Math.max(36, z.r * 1.35))) {
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
  }

  // 적
  for (const e of state.enemies) {
    const sheet = art[e.kind] || art.basic;
    const row = facingRow(e.facing || 0);
    const col = Math.floor(state.time * 8) % ACTOR.cols;
    ctx.save();
    if (e.flash > 0) ctx.filter = 'brightness(2.4)';
    const drew = drawFrame(ctx, sheet, col, row, e.x, e.y, Math.max(28, e.r * 3.5));
    ctx.restore();
    if (!drew) {
      const colors = {
        basic: '#6c8cff',
        fast: '#ffd166',
        elite: '#ef476f',
        boss: '#c77dff',
      };
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : colors[e.kind] || '#6c8cff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.kind === 'boss' || e.kind === 'elite') {
      ctx.fillStyle = '#00000055';
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 5);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * (e.hp / e.maxHp), 5);
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
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life * 3);
      if (!drawProp(ctx, 2, 2, f.x, f.y, f.r * 2.4)) {
        ctx.strokeStyle = `rgba(255,220,140,${f.life * 2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r + (0.3 - f.life) * 55, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }
    if (f.kind === 'sword' || f.kind === 'bat') {
      const alpha = Math.min(1, f.life * 6);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.facing || 0);
      ctx.strokeStyle = f.kind === 'bat' ? `rgba(239,71,111,${alpha})` : `rgba(255,209,102,${alpha})`;
      ctx.lineWidth = f.kind === 'bat' ? 12 : 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, f.range * 0.72, -f.arc / 2, f.arc / 2);
      ctx.stroke();
      if (f.kind === 'bat') {
        const tip = f.arc / 2;
        ctx.fillStyle = `rgba(255,228,180,${alpha})`;
        ctx.beginPath();
        ctx.arc(Math.cos(tip) * f.range * 0.72, Math.sin(tip) * f.range * 0.72, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
      drawProp(ctx, 0, 2, b.x2, b.y2, 26);
    }
  }

  // 투사체
  for (const b of state.projectiles) {
    const prop = b.kind === 'ghost' ? [2, 0] : b.kind === 'bolt' ? [2, 1] : [1, 0];
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    if (!drawProp(ctx, prop[0], prop[1], 0, 0, Math.max(16, b.r * 3.2))) {
      ctx.restore();
      ctx.fillStyle = b.kind === 'ghost' ? '#d0bfff' : b.kind === 'bolt' ? '#70e0ff' : '#9ad0ff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.restore();
  }

  // 회전톱
  if (state.saws > 0) {
    const radius = skillStats(state, 'saw').radius;
    for (let i = 0; i < state.saws; i++) {
      const ang = state.sawAngle + (i / state.saws) * Math.PI * 2;
      const sx = p.x + Math.cos(ang) * radius;
      const sy = p.y + Math.sin(ang) * radius;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      if (!drawProp(ctx, 1, 2, 0, 0, 28)) {
        ctx.fillStyle = '#c7f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 드론
  if (state.drones > 0) {
    for (let i = 0; i < state.drones; i++) {
      const ang = state.time * 1.6 + (i / state.drones) * Math.PI * 2;
      const ox = p.x + Math.cos(ang) * 48;
      const oy = p.y + Math.sin(ang) * 48;
      if (!drawProp(ctx, 1, 1, ox, oy, 26)) {
        ctx.fillStyle = '#70e0ff';
        ctx.fillRect(ox - 7, oy - 5, 14, 10);
        ctx.fillStyle = '#1a2430';
        ctx.fillRect(ox - 3, oy - 2, 6, 4);
      }
    }
  }

  // 플레이어
  const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  if (!blink) {
    const row = facingRow(p.facing == null ? Math.PI / 2 : p.facing);
    const col = p.moving ? Math.floor(state.time * 8) % ACTOR.cols : 0;
    if (!drawFrame(ctx, art.player, col, row, p.x, p.y, 62)) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.facing || 0);
      ctx.fillStyle = state.character?.body || palette.primary;
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

  // HP
  ctx.fillStyle = '#ffffff22';
  drawRounded(ctx, 22, 18, 160, 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  drawRounded(ctx, 22, 18, 160 * (p.hp / p.maxHp), 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.text;
  ctx.font = '700 11px Malgun Gothic, sans-serif';
  ctx.fillText(`${state.character?.name || '특공대'}  HP ${Math.ceil(p.hp)}`, 26, 48);

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
    const short = { kunai: '쿠', sword: '검', bat: '방', molotov: '화', drone: '드', lightning: '번', saw: '톱',
      drink: '속', vit: '체', power: '공', magnet: '자', cooldown: '쿨' };
    ctx.fillText(`${short[id]} ${state.evolved[id] ? '★' : state.skills[id] + '/5'}`, ix + 3, 88);
    for (let n = 0; n < s.max; n++) {
      ctx.fillStyle = n < state.skills[id] ? '#1a2430' : '#1a243044';
      ctx.fillRect(ix + 4 + n * 6, 93, 4, 3);
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

const characterRow = document.getElementById('character-row');
function selectCharacter(id) {
  setCharacter(id);
  for (const card of characterRow.querySelectorAll('[data-character]')) {
    const on = card.dataset.character === id;
    card.classList.toggle('is-selected', on);
    card.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}
for (const hero of CHARACTERS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'character-card';
  button.dataset.character = hero.id;
  button.innerHTML = `<span class="character-swatch" style="background:${hero.body}"></span><strong>${hero.name}</strong><small>${hero.weaponName} · ${hero.blurb}</small>`;
  button.addEventListener('click', () => selectCharacter(hero.id));
  characterRow.appendChild(button);
}
selectCharacter(CHARACTERS[0].id);

mountGame({
  title: CONFIG.title,
  description:
    '캐릭터를 고르면 주 무기가 달라져요.\n4분 동안 움직여 살아남으세요. 공격은 자동!\n초록 보석을 모으면 레벨 업하고, 고르는 동안 시간이 멈춥니다.',
  controls:
    '시작 전에 캐릭터를 고르세요. 이동만 조작합니다. 휴대폰: 화면을 밀거나 왼쪽 조이스틱. PC: WASD·방향키.\n공격은 자동입니다. ESC로 쉬었다가 이어서 할 수 있어요.',
  width: W,
  height: H,
  theme: palette,
  create: createGame,
  syncOverlay(mode) {
    const picker = document.getElementById('character-picker');
    if (picker) picker.hidden = mode === 'pause';
  },
  update(state, dt, input) {
    // 선택 중에도 포인터 pressed를 받기 위해 update는 항상 호출
    updateGame(state, dt, input);
  },
  render,
});
