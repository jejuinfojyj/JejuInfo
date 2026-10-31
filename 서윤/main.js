import { mountGame } from './game-shell.js';
import { CONFIG } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { renderGame } from './render.mjs';
import { loadArt } from './assets.mjs';

loadArt().then(() => {
  mountGame({
    title: CONFIG.title,
    description:
      '공을 아래로 끌어 발사해 골대 두 개를 한 번에 통과시키세요. 더블로 넣으면 보너스! 림을 안 맞고 들어가면 클린 콤보가 올라갑니다.',
    controls:
      '터치/마우스로 공을 끌어 발사 · PC: A/D·←/→ 방향, S·↓ 당기기, Space 발사 · Q/E로 해금한 공 교체',
    width: CONFIG.width,
    height: CONFIG.height,
    theme: CONFIG.palette,
    create: createGame,
    update: updateGame,
    render: renderGame,
  });
});
