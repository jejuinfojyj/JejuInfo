const images = new Map();

export function imageFor(src) {
  if (!src) return null;
  if (!images.has(src)) {
    const image = new Image();
    image.src = src;
    images.set(src, image);
  }
  const image = images.get(src);
  return image.complete && image.naturalWidth ? image : null;
}

export function preloadImages(paths = []) {
  for (const src of paths) imageFor(src);
}

export const ART = {
  court: 'assets/court.png',
  backboard: 'assets/backboard.png',
  rim: 'assets/rim.png',
  rimBack: 'assets/rim-back.png',
  rimFront: 'assets/rim-front.png',
  net: 'assets/net.png',
  star: 'assets/star.png',
  flame: 'assets/flame.png',
  balls: {
    orange: 'assets/ball-orange.png',
    earth: 'assets/ball-earth.png',
    eight: 'assets/ball-eight.png',
    baseball: 'assets/ball-baseball.png',
    flame: 'assets/ball-flame.png',
  },
};

export function preloadArt() {
  preloadImages([
    ART.court,
    ART.backboard,
    ART.rim,
    ART.rimBack,
    ART.rimFront,
    ART.net,
    ART.star,
    ART.flame,
    ...Object.values(ART.balls),
  ]);
}
