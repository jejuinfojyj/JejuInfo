import { loadImage } from './game-tools.js';

const FILES = {
  court: 'court.png',
  backboard: 'backboard.png',
  rim: 'rim.png',
  rimBack: 'rim-back.png',
  rimFront: 'rim-front.png',
  net: 'net.png',
  star: 'star.png',
  flame: 'flame.png',
  balls: {
    orange: 'ball-orange.png',
    earth: 'ball-earth.png',
    eight: 'ball-eight.png',
    baseball: 'ball-baseball.png',
    flame: 'ball-flame.png',
  },
};

function url(name) {
  return new URL(`./assets/${name}`, import.meta.url).href;
}

export async function loadArt() {
  const entries = await Promise.all([
    loadImage(url(FILES.court)).then((img) => ['court', img]),
    loadImage(url(FILES.backboard)).then((img) => ['backboard', img]),
    loadImage(url(FILES.rim)).then((img) => ['rim', img]),
    loadImage(url(FILES.rimBack)).then((img) => ['rimBack', img]),
    loadImage(url(FILES.rimFront)).then((img) => ['rimFront', img]),
    loadImage(url(FILES.net)).then((img) => ['net', img]),
    loadImage(url(FILES.star)).then((img) => ['star', img]),
    loadImage(url(FILES.flame)).then((img) => ['flame', img]),
    ...Object.entries(FILES.balls).map(([id, file]) =>
      loadImage(url(file)).then((img) => [`ball:${id}`, img]),
    ),
  ]);

  const art = { balls: {} };
  for (const [key, img] of entries) {
    if (key.startsWith('ball:')) art.balls[key.slice(5)] = img;
    else art[key] = img;
  }
  return art;
}
