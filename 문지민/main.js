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
  description: `동물 친구들과 우노 한 판!\n같은 색이나 같은 숫자·기호의 카드를 내거나, 가운데 더미에서 뽑아.\n카드를 내거나 뽑으면 그 턴은 바로 끝나!\n낼 카드가 없으면 낼 수 있는 카드가 나올 때까지 뽑고, 뽑을 카드가 없으면 낸 카드(맨 위 제외)를 섞어 다시 써.\n1장 남으면 꼭 '우노!' · 카드가 ${CONFIG.rules.maxHand}장을 넘으면 라운드 패배.\n라운드를 ${CONFIG.rules.targetWins}번 먼저 이기면 최종 우승!`,
  controls: '휴대폰: 낼 카드 톡(내면 턴 끝) · 가운데 더미 톡(뽑으면 턴 끝) · [우노!] · [지적!]\nPC: 카드 클릭/Enter로 내기 · 가운데 더미 클릭으로 뽑기 · U 우노 · C 지적 · 1~4 색 · ESC 쉬기',
  width: W,
  height: H,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
