import { mountGame } from './game-shell.js';
import { CONFIG, DECORATIONS } from './config.mjs';
import {
  createGame,
  updateGame,
  boardOrigin,
  boardPixelSize,
  uiRects,
  decorationHitAreas,
  tileVisuals,
} from './game.mjs';

function drawRounded(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function gemStyle(colorIndex) {
  return CONFIG.gemColors[colorIndex % CONFIG.gemColors.length];
}

function loadArt(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function artReady(image) {
  return !!(image && image.complete && image.naturalWidth > 0);
}

const gemArt = [
  loadArt('assets/gems/ruby.png'),
  loadArt('assets/gems/sapphire.png'),
  loadArt('assets/gems/emerald.png'),
  loadArt('assets/gems/topaz.png'),
  loadArt('assets/gems/amethyst.png'),
  loadArt('assets/gems/turquoise.png'),
];

const specialArt = {
  'rocket-h': loadArt('assets/specials/rocket_h.png'),
  'rocket-v': loadArt('assets/specials/rocket_v.png'),
  bomb: loadArt('assets/specials/bomb.png'),
  propeller: loadArt('assets/specials/propeller.png'),
  disco: loadArt('assets/specials/disco.png'),
};

const boardFrameArt = loadArt('assets/board_frame.png');
const boardCellArt = loadArt('assets/board_cell.png');
const hudArt = loadArt('assets/hud_panel.png');
const buttonArt = loadArt('assets/ui_button.png');
const castleArt = loadArt('assets/kingdom_castle_base.png');
const decorArt = {
  banner: loadArt('assets/decors/banner.png'),
  garden: loadArt('assets/decors/garden.png'),
  fountain: loadArt('assets/decors/fountain.png'),
  gate: loadArt('assets/decors/gate.png'),
  tower: loadArt('assets/decors/tower.png'),
  throne: loadArt('assets/decors/throne.png'),
};

function drawGem(ctx, x, y, size, tile, selected = false) {
  const specialImage = tile.special ? specialArt[tile.special] : null;
  const picture = artReady(specialImage) ? specialImage : gemArt[tile.color % gemArt.length];
  if (artReady(picture)) {
    ctx.save();
    ctx.drawImage(picture, x, y, size, size);
    if (selected) {
      ctx.strokeStyle = CONFIG.palette.primary;
      ctx.lineWidth = 3;
      drawRounded(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 11);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const style = gemStyle(tile.color);
  ctx.save();
  drawRounded(ctx, x, y, size, size, 12);
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, style.edge);
  g.addColorStop(0.45, style.fill);
  g.addColorStop(1, style.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#ffffff55';
  drawRounded(ctx, x + 5, y + 5, size * 0.4, size * 0.2, 6);
  ctx.fill();

  if (tile.special) drawSpecialBadge(ctx, x, y, size, tile.special);

  if (selected) {
    ctx.strokeStyle = CONFIG.palette.primary;
    ctx.lineWidth = 3;
    drawRounded(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 11);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpecialBadge(ctx, x, y, size, special) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#fff8e8';
  ctx.strokeStyle = '#1a2030';
  ctx.lineWidth = 1.5;

  if (special === 'rocket-h' || special === 'rocket-v') {
    ctx.rotate(special === 'rocket-v' ? -Math.PI / 2 : 0);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(8, -7);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff8c42';
    ctx.fillRect(8, -4, 6, 8);
  } else if (special === 'bomb') {
    ctx.beginPath();
    ctx.arc(0, 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#2f3640';
    ctx.fill();
    ctx.strokeStyle = '#f5f6fa';
    ctx.stroke();
    ctx.strokeStyle = '#f0c14b';
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.quadraticCurveTo(10, -14, 8, -18);
    ctx.stroke();
  } else if (special === 'propeller') {
    ctx.fillStyle = '#dff9fb';
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      drawRounded(ctx, -4, -16, 8, 18, 4);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c14b';
    ctx.fill();
  } else if (special === 'disco') {
    const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(0.4, '#7bed9f');
    rg.addColorStop(0.7, '#70a1ff');
    rg.addColorStop(1, '#ff6b81');
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = '#ffffffaa';
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, state, view) {
  const { width } = view;
  if (!artReady(hudArt)) {
    drawRounded(ctx, 20, 16, width - 40, 86, 18);
    ctx.fillStyle = '#ffffff14';
    ctx.fill();
  } else {
    ctx.drawImage(hudArt, 20, 16, width - 40, 86);
  }

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 22px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`레벨 ${state.level.id}`, 36, 48);

  ctx.font = '600 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.fillText(`이동 ${state.moves}`, 36, 78);

  ctx.textAlign = 'right';
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '700 20px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(`★ ${state.stars}`, width - 36, 48);

  ctx.font = '600 14px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = CONFIG.palette.text;
  const goalText = state.goals.map((g) => {
    if (g.type === 'collect') {
      const name = CONFIG.gemColors[g.color].label;
      return `${name} ${g.have}/${g.need}`;
    }
    const labels = { rocket: '로켓', bomb: '폭탄', propeller: '프로펠러', disco: '디스코' };
    return `${labels[g.special] || g.special} ${g.have}/${g.need}`;
  }).join(' · ');
  ctx.fillText(goalText, width - 36, 78);
}

function drawBoard(ctx, state) {
  const origin = boardOrigin();
  const size = boardPixelSize();
  const step = CONFIG.cell + CONFIG.boardGap;

  if (artReady(boardFrameArt)) {
    ctx.drawImage(boardFrameArt, 24, 22, 208, 212, origin.x - 8, origin.y - 8, size + 16, size + 16);
  } else {
    drawRounded(ctx, origin.x - 12, origin.y - 12, size + 24, size + 24, 22);
    ctx.fillStyle = CONFIG.palette.surface;
    ctx.fill();
    drawRounded(ctx, origin.x - 4, origin.y - 4, size + 8, size + 8, 16);
    ctx.fillStyle = CONFIG.palette.board;
    ctx.fill();
  }

  for (let r = 0; r < CONFIG.gridSize; r++) {
    for (let c = 0; c < CONFIG.gridSize; c++) {
      const x = origin.x + c * step;
      const y = origin.y + r * step;
      if (artReady(boardCellArt)) {
        ctx.drawImage(boardCellArt, 19, 17, 218, 222, x, y, CONFIG.cell, CONFIG.cell);
      } else {
        drawRounded(ctx, x, y, CONFIG.cell, CONFIG.cell, 12);
        ctx.fillStyle = '#ffffff10';
        ctx.fill();
      }
    }
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(origin.x - 2, origin.y - 2, size + 4, size + 4);
  ctx.clip();
  for (const visual of tileVisuals(state)) {
    const x = origin.x + visual.c * step;
    const y = origin.y + visual.r * step;
    ctx.save();
    ctx.globalAlpha = visual.alpha ?? 1;
    const scale = visual.scale ?? 1;
    ctx.translate(x + CONFIG.cell / 2, y + CONFIG.cell / 2);
    ctx.scale(scale, scale);
    if (visual.moving) {
      ctx.shadowColor = '#00000080';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    }
    drawGem(ctx, -CONFIG.cell / 2, -CONFIG.cell / 2, CONFIG.cell, visual.tile, visual.selected);
    ctx.restore();
  }
  ctx.restore();
}

function drawFx(ctx, state) {
  const origin = boardOrigin();
  const step = CONFIG.cell + CONFIG.boardGap;
  for (const fx of state.fx) {
    const t = Math.max(0, fx.life);
    ctx.save();
    if (fx.kind === 'pop' || fx.kind === 'blast') {
      const x = origin.x + fx.c * step + CONFIG.cell / 2;
      const y = origin.y + fx.r * step + CONFIG.cell / 2;
      ctx.globalAlpha = Math.min(1, t * 3);
      ctx.fillStyle = CONFIG.palette.primary;
      ctx.beginPath();
      ctx.arc(x, y, 10 + (0.4 - Math.min(0.4, t)) * 40, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.kind === 'fly') {
      const p = 1 - Math.min(1, t / 0.45);
      const x1 = origin.x + fx.fromC * step + CONFIG.cell / 2;
      const y1 = origin.y + fx.fromR * step + CONFIG.cell / 2;
      const x2 = origin.x + fx.toC * step + CONFIG.cell / 2;
      const y2 = origin.y + fx.toR * step + CONFIG.cell / 2;
      ctx.strokeStyle = '#dff9fb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p);
      ctx.stroke();
    } else if (fx.kind === 'shake') {
      /* visual handled lightly via outline flash */
      const x = origin.x + fx.c * step;
      const y = origin.y + fx.r * step;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = CONFIG.palette.danger;
      ctx.lineWidth = 2;
      drawRounded(ctx, x, y, CONFIG.cell, CONFIG.cell, 12);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawFever(ctx, state, view) {
  const origin = boardOrigin();
  const size = boardPixelSize();
  ctx.textAlign = 'center';
  if (state.feverTime > 0) {
    const pulse = 0.45 + Math.sin(state.feverTime * 10) * 0.35;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 214, 74, ${0.55 + pulse * 0.45})`;
    ctx.lineWidth = 6;
    drawRounded(ctx, origin.x - 10, origin.y - 10, size + 20, size + 20, 22);
    ctx.stroke();
    ctx.restore();
  }
  if (state.feverAnnounce > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.feverAnnounce);
    ctx.fillStyle = '#ffe066';
    ctx.font = '800 40px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText('피버 타임!', view.width / 2, origin.y + size / 2);
    ctx.font = '700 18px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    ctx.fillStyle = '#fff6e8';
    ctx.fillText('지금 모으는 보석이 2배야!', view.width / 2, origin.y + size / 2 + 34);
    ctx.restore();
  }
  ctx.fillStyle = state.feverTime > 0 ? '#ffe066' : CONFIG.palette.primary;
  ctx.font = '700 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(
    state.feverTime > 0
      ? `피버 ${Math.ceil(state.feverTime)}초 · 모으는 보석 2배`
      : `터진 블럭 ${state.burstCount}/50`,
    view.width / 2,
    586,
  );
}

function drawButton(ctx, rect, label, active = true) {
  if (active && artReady(buttonArt)) {
    ctx.drawImage(buttonArt, rect.x, rect.y, rect.w, rect.h);
  } else {
    drawRounded(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    if (active) {
      g.addColorStop(0, '#ffe8a3');
      g.addColorStop(1, CONFIG.palette.primary);
    } else {
      g.addColorStop(0, '#3a5570');
      g.addColorStop(1, '#2a4058');
    }
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.fillStyle = active ? '#1a2a38' : CONFIG.palette.muted;
  ctx.font = '700 18px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawPuzzleChrome(ctx, state, view) {
  drawHud(ctx, state, view);
  drawBoard(ctx, state);
  drawFx(ctx, state);

  drawFever(ctx, state, view);

  ctx.fillStyle = CONFIG.palette.muted;
  ctx.font = '500 13px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';
  const phaseText = { clear: '맞춘 보석을 지우는 중', fall: '보석이 내려오는 중', refill: '새 보석을 채우는 중', shuffle: '가능한 이동을 찾고 있어요' };
  ctx.fillText(state.busy ? (phaseText[state.resolution?.phase] || '보석을 바꾸는 중') : '보석을 끌거나 이웃을 누르세요 · 특수 보석은 다시 눌러 발동', view.width / 2, 618);

  const rects = uiRects();
  drawButton(ctx, rects.kingdom, '왕국 꾸미기', !state.busy);
}

function drawCastle(ctx, state, view) {
  const cx = view.width / 2;
  const scene = { x: 24, y: 16, w: view.width - 48, h: 186 };
  ctx.save();
  if (artReady(castleArt)) {
    const scale = Math.max(scene.w / castleArt.naturalWidth, scene.h / castleArt.naturalHeight);
    const sw = scene.w / scale;
    const sh = scene.h / scale;
    const sx = (castleArt.naturalWidth - sw) / 2;
    const sy = Math.max(0, (castleArt.naturalHeight - sh) * 0.42);
    ctx.save();
    drawRounded(ctx, scene.x, scene.y, scene.w, scene.h, 20);
    ctx.clip();
    ctx.drawImage(castleArt, sx, sy, sw, sh, scene.x, scene.y, scene.w, scene.h);
    ctx.restore();
  } else {
    drawRounded(ctx, scene.x, scene.y, scene.w, scene.h, 20);
    const sky = ctx.createLinearGradient(0, scene.y, 0, scene.y + scene.h);
    sky.addColorStop(0, '#5b8db8');
    sky.addColorStop(1, '#23486d');
    ctx.fillStyle = sky;
    ctx.fill();
  }

  const owned = new Set(state.owned);
  const decorSpots = {
    banner: [scene.x + 16, scene.y + scene.h - 64, 46],
    garden: [scene.x + 68, scene.y + scene.h - 52, 78],
    fountain: [scene.x + 156, scene.y + scene.h - 62, 50],
    gate: [cx - 26, scene.y + scene.h - 64, 52],
    tower: [scene.x + scene.w - 128, scene.y + scene.h - 72, 54],
    throne: [scene.x + scene.w - 66, scene.y + scene.h - 60, 48],
  };
  for (const [id, spot] of Object.entries(decorSpots)) {
    if (!owned.has(id) || !artReady(decorArt[id])) continue;
    const [x, y, size] = spot;
    ctx.drawImage(decorArt[id], x, y, size, size * 0.72);
  }

  ctx.fillStyle = '#fff6e8';
  ctx.font = '700 20px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#102033cc';
  ctx.shadowBlur = 8;
  ctx.fillText('나의 왕국', cx, 44);
  ctx.font = '600 14px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`보유 별 ★ ${state.stars}`, cx, 68);
  ctx.restore();
}

function drawKingdom(ctx, state, view) {
  drawCastle(ctx, state, view);

  const areas = decorationHitAreas();
  DECORATIONS.forEach((dec, i) => {
    const area = areas[i];
    const owned = state.owned.includes(dec.id);
    const canBuy = !owned && state.stars >= dec.cost;
    drawRounded(ctx, area.x, area.y, area.w, area.h, 14);
    ctx.fillStyle = owned ? '#7ed6a533' : canBuy ? '#ffffff18' : '#ffffff0c';
    ctx.fill();
    ctx.strokeStyle = owned ? CONFIG.palette.accent : canBuy ? CONFIG.palette.primary : '#ffffff22';
    ctx.lineWidth = 2;
    ctx.stroke();

    const icon = decorArt[dec.id];
    let textX = area.x + 16;
    if (artReady(icon)) {
      ctx.drawImage(icon, area.x + 8, area.y + 8, 38, 38);
      textX = area.x + 54;
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '700 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(dec.name, textX, area.y + 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = owned ? CONFIG.palette.accent : CONFIG.palette.primary;
    ctx.font = '600 15px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(owned ? '배치 완료' : `★ ${dec.cost}`, area.x + area.w - 16, area.y + 34);
  });

  const rects = uiRects();
  drawButton(ctx, rects.puzzle, '퍼즐로 돌아가기');
}

mountGame({
  title: CONFIG.title,
  description: '같은 보석 3개 이상을 맞춰 레벨을 깨고, 별으로 왕국과 성을 꾸며 보세요. 블럭을 50개 터뜨리면 피버 타임이 8초 동안 켜지고, 그동안 모으는 보석이 2배가 돼요.',
  controls: '보석을 이웃으로 끌어 바꾸기 · 특수 보석을 다시 눌러 발동 · 블럭 50개를 터뜨리면 피버 타임 · 왕국 꾸미기 버튼 · PC는 클릭·드래그 또는 방향키',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render(ctx, state, view) {
    ctx.fillStyle = CONFIG.palette.background;
    ctx.fillRect(0, 0, view.width, view.height);
    const glow = ctx.createRadialGradient(view.width * 0.2, 40, 10, view.width * 0.2, 80, 220);
    glow.addColorStop(0, '#2f6ea055');
    glow.addColorStop(1, '#00000000');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, view.width, view.height);

    if (state.view === 'kingdom') drawKingdom(ctx, state, view);
    else drawPuzzleChrome(ctx, state, view);
  },
});
