import { loadImage } from './game-tools.js';

const SHEET_COLS = 5;
const SHEET_ROWS = 4;

export const art = {
  ready: false,
  player: null,
  basic: null,
  fast: null,
  elite: null,
  boss: null,
  background: null,
  props: null,
};

export async function loadArt() {
  const [player, basic, fast, elite, boss, background, props] = await Promise.all([
    loadImage('./assets/player_sheet.png'),
    loadImage('./assets/basic_enemy_sheet.png'),
    loadImage('./assets/fast_enemy_sheet.png'),
    loadImage('./assets/elite_enemy_sheet.png'),
    loadImage('./assets/boss_enemy_sheet.png'),
    loadImage('./assets/background.png'),
    loadImage('./assets/props_atlas.png'),
  ]);
  art.player = player;
  art.basic = basic;
  art.fast = fast;
  art.elite = elite;
  art.boss = boss;
  art.background = background;
  art.props = props;
  art.ready = true;
  return art;
}

export function facingRow(facing = 0) {
  const a = ((facing % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (a >= Math.PI * 1.75 || a < Math.PI * 0.25) return 1; // right
  if (a < Math.PI * 0.75) return 3; // down
  if (a < Math.PI * 1.25) return 2; // left
  return 0; // up
}

function frameSize(image) {
  return {
    fw: image.naturalWidth / SHEET_COLS,
    fh: image.naturalHeight / SHEET_ROWS,
  };
}

export function drawSheetSprite(ctx, image, x, y, facing, time, size, moving = true) {
  if (!image?.complete) return false;
  const { fw, fh } = frameSize(image);
  const row = facingRow(facing);
  const col = moving ? Math.floor(time * 8) % SHEET_COLS : 0;
  const dw = size;
  const dh = size * (fh / fw);
  ctx.drawImage(image, col * fw, row * fh, fw, fh, x - dw / 2, y - dh * 0.72, dw, dh);
  return true;
}

export function drawBackgroundTiled(ctx, image, camX, camY, viewW, viewH) {
  if (!image?.complete) return false;
  const tile = Math.max(image.naturalWidth, image.naturalHeight);
  const x0 = Math.floor(camX / tile) * tile;
  const y0 = Math.floor(camY / tile) * tile;
  for (let y = y0; y < camY + viewH + tile; y += tile) {
    for (let x = x0; x < camX + viewW + tile; x += tile) {
      ctx.drawImage(image, x, y, tile, tile);
    }
  }
  return true;
}

export function drawPropGem(ctx, image, x, y, time) {
  if (!image?.complete) return false;
  const cols = 3;
  const rows = 3;
  const fw = image.naturalWidth / cols;
  const fh = image.naturalHeight / rows;
  // 중앙 칸을 경험치 보석처럼 사용
  const col = 1;
  const row = 1;
  const pulse = 1 + Math.sin(time * 9 + x * 0.01) * 0.1;
  const s = 22 * pulse;
  ctx.drawImage(image, col * fw, row * fh, fw, fh, x - s / 2, y - s / 2, s, s);
  return true;
}

export function enemySheet(kind) {
  if (kind === 'fast' || kind === 'flyer') return art.fast;
  if (kind === 'elite' || kind === 'giant') return art.elite;
  if (kind === 'boss' || kind === 'titan' || kind === 'finalBoss') return art.boss;
  return art.basic;
}
