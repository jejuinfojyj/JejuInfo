import { mountGame } from './game-shell.js';
import { CONFIG } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { render, loadArt } from './draw.mjs';
import { W, H } from './layout.mjs';
import { unlockAudio } from './sound.mjs';

loadArt();
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });

mountGame({
  title: CONFIG.title,
  description: `혼자 즐기는 프리셸 카드 게임!\n8줄에 흩어진 카드를 빨간·검정 색이 번갈아 가며 큰 수→작은 수로 쌓고, 무늬마다 A부터 K까지 홈에 올려.\n왼쪽 위 프리셀 4칸에 카드를 잠깐 올려 두고 옮겨 봐. 52장을 모두 홈에 올리면 클리어!`,
  controls: '휴대폰: 카드 톡으로 선택 → 옮길 곳 톡 · 같은 카드 다시 톡하면 홈으로 자동 이동 시도 · 되돌리기/힌트/새 판\nPC: 클릭으로 선택·이동 · Enter 홈으로 · Z 되돌리기 · H 힌트 · N 새 판 · ESC 쉬기',
  width: W,
  height: H,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
