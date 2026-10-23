(function () {
  'use strict';

  const ART = {
    dino1: [
      '....O.O.........',
      '...OGGGGGG......',
      '..OGGGGGGGGG....',
      '.OGGGGGGWWWGG...',
      '.GGGGGGWWKKWG...',
      'OGGGGGGWWKKWGG..',
      '.GGGGGGGWWWGGGG.',
      '.GGGGGGGGGGGGGGG',
      '.gGGGGGGGGGGgGG.',
      '..gGGGGLLLggGG..',
      '..gGGGLLLLLLG...',
      '.OgGGLLLLLLLG...',
      '..gGGGLLLLLGG...',
      '...gGGGGGGGG....',
      '...GGG...GGG....',
      '..OOOO..OOOO....'
    ],
    dino2: [
      '....O.O.........',
      '...OGGGGGG......',
      '..OGGGGGGGGG....',
      '.OGGGGGGWWWGG...',
      '.GGGGGGWWKKWG...',
      'OGGGGGGWWKKWGG..',
      '.GGGGGGGWWWGGGG.',
      '.GGGGGGGGGGGGGGG',
      '.gGGGGGGGGGGgGG.',
      '..gGGGGLLLggGG..',
      '..gGGGLLLLLLG...',
      '.OgGGLLLLLLLG...',
      '..gGGGLLLLLGG...',
      '...gGGGGGGGG....',
      '..GGG.....GGG...',
      '.OOOO.....OOOO..'
    ],
    dinoShoot: [
      '....O.O.........',
      '...OGGGGGG......',
      '..OGGGGGGGGG....',
      '.OGGGGGGWWWGG...',
      '.GGGGGGWWKKWG...',
      'OGGGGGGWWKKWGG..',
      '.GGGGGGGWWWGGGGG',
      '.GGGGGGGGGGGG...',
      '.gGGGGGGGGGRR...',
      '..gGGGGLLLGGGGG.',
      '..gGGGLLLLLLG...',
      '.OgGGLLLLLLLG...',
      '..gGGGLLLLLGG...',
      '...gGGGGGGGG....',
      '...GGG...GGG....',
      '..OOOO..OOOO....'
    ],
    can1: [
      '.......Y........',
      '......YYY.......',
      '.......Y........',
      '...BBBBBBBBBB...',
      '..BBBBBBBBBBBB..',
      '..BBKKBBBBKKBB..',
      '..BBKWBBBBKWBB..',
      '..BBBBBBBBBBBB..',
      '..BbbbbbbbbbbB..',
      '..BbRRRRRRRRbB..',
      '..BbbbbbbbbbbB..',
      '..BBBBBBBBBBBB..',
      '...BBBBBBBBBB...',
      '...bb......bb...',
      '..bbb......bbb..',
      '................'
    ],
    can2: [
      '......Y.Y.......',
      '.......Y........',
      '......Y.Y.......',
      '...BBBBBBBBBB...',
      '..BBBBBBBBBBBB..',
      '..BBKKBBBBKKBB..',
      '..BBKWBBBBKWBB..',
      '..BBBBBBBBBBBB..',
      '..BbbbbbbbbbbB..',
      '..BbRRRRRRRRbB..',
      '..BbbbbbbbbbbB..',
      '..BBBBBBBBBBBB..',
      '...BBBBBBBBBB...',
      '....bb....bb....',
      '....bbb..bbb....',
      '................'
    ],
    wing1: [
      '................',
      '................',
      '.....PPPPPP.....',
      '...PPPPPPPPPP...',
      '..PPPPPPPPPPPP..',
      'WWPPKKPPPPKKPPWW',
      'WWWPKWPPPPKWPWWW',
      '.WWPPPPPPPPPPWW.',
      '..WPPPPRRPPPPW..',
      '..PPPPPPPPPPPP..',
      '...pPPPPPPPPp...',
      '.....pppppp.....',
      '................',
      '................',
      '................',
      '................'
    ],
    wing2: [
      '................',
      'WW............WW',
      'WWW..PPPPPP..WWW',
      '.WWPPPPPPPPPPWW.',
      '..PPPPPPPPPPPP..',
      '..PPKKPPPPKKPP..',
      '..PPKWPPPPKWPP..',
      '..PPPPPPPPPPPP..',
      '..PPPPPRRPPPPP..',
      '..PPPPPPPPPPPP..',
      '...pPPPPPPPPp...',
      '.....pppppp.....',
      '................',
      '................',
      '................',
      '................'
    ],
    shroom1: [
      '................',
      '................',
      '.....OOOOOO.....',
      '...OOWOOOOWOO...',
      '..OOOOOOOOOOOO..',
      '.OOWWOOOOOOWWOO.',
      '.OOOOOOOOOOOOOO.',
      '.ooooooooooooo..',
      '....SSSSSSSS....',
      '....SKSSSSKS....',
      '....SSSSSSSS....',
      '....SSRRRRSS....',
      '.....SSSSSS.....',
      '....SS....SS....',
      '...SSS....SSS...',
      '................'
    ],
    shroom2: [
      '................',
      '.....OOOOOO.....',
      '...OOWOOOOWOO...',
      '..OOOOOOOOOOOO..',
      '.OOWWOOOOOOWWOO.',
      '.OOOOOOOOOOOOOO.',
      '.ooooooooooooo..',
      '....SSSSSSSS....',
      '....SKSSSSKS....',
      '....SSSSSSSS....',
      '....SSRRRRSS....',
      '.....SSSSSS.....',
      '.....SS..SS.....',
      '.....SS..SS.....',
      '................',
      '................'
    ],
    ghost: [
      '................',
      '.....WWWWWW.....',
      '...WWWWWWWWWW...',
      '..WWWWWWWWWWWW..',
      '.WWWKKWWWWKKWWW.',
      '.WWWKKWWWWKKWWW.',
      '.WWWWWWWWWWWWWW.',
      '.WWWWWKKKKWWWWW.',
      '.WWWWWWWWWWWWWW.',
      '.WWWWWWWWWWWWWW.',
      '.WWWWWWWWWWWWWW.',
      '.WW.WWW..WWW.WW.',
      '.W...W....W...W.',
      '................',
      '................',
      '................'
    ],
    skull: [
      '....RRRRRRRR....',
      '..RRRRRRRRRRRR..',
      '.RRrRRRRRRRRRRR.',
      'RRrRRRRRRRRRRRRR',
      'RRKKKKRRRRKKKKRR',
      'RRKKKKRRRRKKKKRR',
      'RRKKKRRRRRRKKKRR',
      'RRRRRRRKKRRRRRRR',
      '.RRRRRRKKRRRRRR.',
      '..RRRRRRRRRRRR..',
      '..RWRWRWRWRWRR..',
      '..RKRKRKRKRKRR..',
      '...RWRWRWRWRR...',
      '....RRRRRRRR....',
      '................',
      '................'
    ],
    cherry: [
      '......gg..',
      '.....g.g..',
      '....g...g.',
      '...g....g.',
      '.RRR...g..',
      'RRWRR.RRR.',
      'RRRRRRWRRR',
      'RRRRRRRRRR',
      '.RRR..RRR.',
      '..........'
    ],
    orange: [
      '....gg....',
      '...gg.....',
      '..OOOOOO..',
      '.OOWOOOOO.',
      'OOWOOOOOOO',
      'OOOOOOOOOO',
      'OOOOOOOOOo',
      '.OOOOOOOo.',
      '..oooooo..',
      '..........'
    ],
    melon: [
      '..........',
      '..........',
      'gGGGGGGGGg',
      'gRRRRRRRRg',
      '.RRKRRKRR.',
      '.RRRRRRRR.',
      '..RRKRRR..',
      '...RRRR...',
      '....RR....',
      '..........'
    ],
    heart: [
      '.RR.RR.',
      'RWRRRRR',
      'RRRRRRR',
      '.RRRRR.',
      '..RRR..',
      '...R...'
    ]
  };

  const BASE = {
    O: '#ffb020', G: '#3fe04a', g: '#1f9a2b', W: '#ffffff', K: '#111122', L: '#f2f59a',
    Y: '#ffd23f', B: '#dfe6ff', b: '#8a9cff', R: '#ff3b3b', r: '#ff9a9a',
    P: '#c86bff', p: '#7d36c2', o: '#d9781a', S: '#ffe9c9'
  };

  const ANGRY = Object.assign({}, BASE, {
    B: '#ff6a6a', b: '#c21f2f', P: '#ff5a5a', p: '#a3122a', O: '#ff4a4a', o: '#a3122a', S: '#ffb3b3', Y: '#ffef7a'
  });

  function paint(rows, pal, flip) {
    const h = rows.length;
    const w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ch = rows[j][i];
        if (ch === '.' || !pal[ch]) continue;
        x.fillStyle = pal[ch];
        x.fillRect(flip ? w - 1 - i : i, j, 1, 1);
      }
    }
    return c;
  }

  const cache = new Map();
  function get(name, opts) {
    const flip = !!(opts && opts.flip);
    const angry = !!(opts && opts.angry);
    const key = name + (flip ? 'F' : '') + (angry ? 'A' : '');
    let c = cache.get(key);
    if (!c) {
      c = paint(ART[name], angry ? ANGRY : BASE, flip);
      cache.set(key, c);
    }
    return c;
  }

  function boss(hurt) {
    const key = 'boss' + (hurt ? 'H' : '');
    if (cache.has(key)) return cache.get(key);
    const S = 40;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const x = c.getContext('2d');
    const body = hurt ? '#ffffff' : '#a64dff';
    const shade = hurt ? '#ffd0d0' : '#5d1fa8';
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const dx = i - 19.5, dy = j - 21;
        const d = Math.sqrt(dx * dx + dy * dy * 1.15);
        if (d < 18) {
          x.fillStyle = d > 15 || (dx + dy > 14) ? shade : body;
          x.fillRect(i, j, 1, 1);
        }
      }
    }
    x.fillStyle = '#ffd23f';
    [[8, 2], [14, 0], [20, -1], [26, 0], [32, 2]].forEach(function (p) {
      x.fillRect(p[0] - 1, p[1] + 3, 3, 4);
      x.fillRect(p[0], p[1] + 2, 1, 1);
    });
    x.fillRect(7, 7, 27, 3);
    function eye(cx) {
      x.fillStyle = '#ffffff';
      x.fillRect(cx - 4, 14, 8, 8);
      x.fillStyle = '#ff2030';
      x.fillRect(cx - 1, 16, 3, 4);
    }
    eye(13);
    eye(27);
    x.fillStyle = '#1a0a1a';
    x.fillRect(10, 27, 20, 6);
    x.fillStyle = '#ffffff';
    for (let i = 11; i < 30; i += 4) x.fillRect(i, 27, 2, 2);
    for (let i = 13; i < 30; i += 4) x.fillRect(i, 31, 2, 2);
    cache.set(key, c);
    return c;
  }

  window.Sprites = { get: get, boss: boss };
})();
