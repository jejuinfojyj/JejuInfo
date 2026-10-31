import { loadImage } from './game-tools.js';

const SHEET = { cols: 5, rows: 4 };
const PROP = { cols: 3, rows: 3 };

export const art = {
  ready: false,
  player: null,
  enemies: {},
  background: null,
  props: null,
};

export async function loadArt() {
  const [player, basic, fast, elite, boss, background, props] = await Promise.all([
    loadImage('assets/player_sheet.png'),
    loadImage('assets/basic_enemy_sheet.png'),
    loadImage('assets/fast_enemy_sheet.png'),
    loadImage('assets/elite_enemy_sheet.png'),
    loadImage('assets/boss_enemy_sheet.png'),
    loadImage('assets/background.png'),
    loadImage('assets/props_atlas.png'),
  ]);
  art.player = player;
  art.enemies = { basic, fast, elite, boss };
  art.background = background;
  art.props = props;
  art.ready = true;
  return art;
}

function cellSize(img, cols, rows) {
  return { fw: img.width / cols, fh: img.height / rows };
}

/** facing angle (atan2) → sheet row: back, right, left, front */
export function facingRow(angle) {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const deg = (a * 180) / Math.PI;
  if (deg >= 45 && deg < 135) return 3; // down / front
  if (deg >= 135 && deg < 225) return 2; // left
  if (deg >= 225 && deg < 315) return 0; // up / back
  return 1; // right
}

export function drawSheetFrame(ctx, img, col, row, x, y, size, { cols = SHEET.cols, rows = SHEET.rows, flash = false } = {}) {
  if (!img) return false;
  const { fw, fh } = cellSize(img, cols, rows);
  const sx = Math.floor(col) * fw;
  const sy = Math.floor(row) * fh;
  const half = size / 2;
  if (flash) ctx.filter = 'brightness(2)';
  ctx.drawImage(img, sx, sy, fw, fh, x - half, y - half, size, size);
  if (flash) ctx.filter = 'none';
  return true;
}

export function drawProp(ctx, index, x, y, size, angle = 0) {
  if (!art.props) return false;
  const { fw, fh } = cellSize(art.props, PROP.cols, PROP.rows);
  const col = index % PROP.cols;
  const row = Math.floor(index / PROP.cols);
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  ctx.drawImage(art.props, col * fw, row * fh, fw, fh, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

export function drawWalkSprite(ctx, img, angle, time, moving, x, y, size, flash = false) {
  const row = facingRow(angle);
  const col = moving ? Math.floor(time * 8) % SHEET.cols : 0;
  return drawSheetFrame(ctx, img, col, row, x, y, size, { flash });
}

export const PROP_INDEX = {
  gem: 0,
  kunai: 1,
  ghost: 2,
  fire: 3,
  drone: 4,
  bolt: 5,
  lightning: 6,
  saw: 7,
  burst: 8,
};
