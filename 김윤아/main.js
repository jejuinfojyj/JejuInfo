import { mountGame } from './game-shell.js';
import { CONFIG } from './config.mjs';
import { createGame, updateGame, currentTheme } from './game.mjs';
import { drawRoom, drawCharacter, drawHud, drawPanel, drawSparkles } from './draw.mjs';

function render(ctx, state, view) {
  const theme = currentTheme(state);
  drawRoom(ctx, theme, view.width, view.height);
  drawHud(ctx, state, theme);
  drawCharacter(ctx, state.outfit, view.width / 2, 150);
  drawSparkles(ctx, state.sparkle, view.width);
  drawPanel(ctx, state);
}

mountGame({
  title: CONFIG.title,
  description: '오늘의 약속에 맞춰 머리·옷·신발·소품을 골라 코디해 보세요. 분위기에 잘 맞을수록 별이 많이 올라가요!',
  controls: '휴대폰: 아래 탭에서 옷 고르기 → 코디 완성\nPC: 클릭 또는 1~5 카테고리, Enter로 완성',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
