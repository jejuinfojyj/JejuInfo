import { loadImage } from './game-tools.js';

const FILES = {
  court: 'assets/court.png',
  backboard: 'assets/backboard.png',
  rim: 'assets/rim.png',
  rimBack: 'assets/rim-back.png',
  rimFront: 'assets/rim-front.png',
  net: 'assets/net.png',
  star: 'assets/star.png',
  flame: 'assets/flame.png',
  ballOrange: 'assets/ball-orange.png',
  ballEarth: 'assets/ball-earth.png',
  ballEight: 'assets/ball-eight.png',
  ballBaseball: 'assets/ball-baseball.png',
  ballFlame: 'assets/ball-flame.png',
};

export const ART = {
  ready: false,
  images: {},
};

const BALL_KEY = {
  orange: 'ballOrange',
  earth: 'ballEarth',
  eight: 'ballEight',
  baseball: 'ballBaseball',
  flame: 'ballFlame',
};

export function ballImage(ballId) {
  const key = BALL_KEY[ballId] || 'ballOrange';
  return ART.images[key] || null;
}

export async function loadArt() {
  const entries = Object.entries(FILES);
  const loaded = await Promise.all(
    entries.map(async ([key, src]) => {
      try {
        const image = await loadImage(src);
        return [key, image];
      } catch {
        return [key, null];
      }
    }),
  );
  for (const [key, image] of loaded) {
    if (image) ART.images[key] = image;
  }
  ART.ready = true;
  return ART;
}
