TemplateEngine.start(api => {
  const menu = () => api.cfg.map.menu;
  let score, left, request, part, notice, noticeLeft, flash;

  function orderLength() {
    return Math.min(5, 3 + Math.floor(score / 4));
  }

  function nextOrder() {
    const items = menu();
    const bread = Math.max(0, items.findIndex(item => item.name === '빵'));
    const fillings = items.map((_, index) => index).filter(index => index !== bread);
    const middle = Math.max(1, orderLength() - 2);
    request = [bread];
    let previous = -1;
    for (let i = 0; i < middle; i++) {
      let pick = fillings[Math.floor(Math.random() * fillings.length)];
      if (fillings.length > 1 && pick === previous) {
        const others = fillings.filter(index => index !== previous);
        pick = others[Math.floor(Math.random() * others.length)];
      }
      request.push(pick);
      previous = pick;
    }
    request.push(bread);
    part = 0;
  }

  function hud() {
    api.setScore('만든 햄버거 ' + score);
    api.setExtra('남은 ' + Math.max(0, Math.ceil(left)) + '초');
  }

  function reset() {
    score = 0;
    left = api.cfg.rules.timeSec;
    notice = '';
    noticeLeft = 0;
    flash = 0;
    nextOrder();
    api.buttons([]);
    api.choices(menu().map(item => ({ label: item.name, color: item.color })), place);
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = '빵으로 시작해서 빵으로 끝내. 화면을 터치하거나 키보드 1~6.';
    hud();
  }

  function place(index) {
    if (api.mode() !== 'play' || left <= 0) return;
    if (index === request[part]) {
      part += 1;
      api.tone(660, 0.05);
      if (part >= request.length) {
        score += 1;
        notice = '완성!';
        noticeLeft = 0.7;
        api.tone(880, 0.12);
        nextOrder();
      }
    } else {
      part = 0;
      flash = 0.4;
      notice = '다시 쌓아!';
      noticeLeft = 1;
      api.tone(150, 0.16);
    }
    hud();
  }

  function update(dt) {
    if (noticeLeft > 0) noticeLeft = Math.max(0, noticeLeft - dt);
    if (flash > 0) flash = Math.max(0, flash - dt);
    for (let i = 0; i < menu().length; i++) {
      if (api.input.hit(String(i + 1))) place(i);
    }
    left -= dt;
    if (left <= 0) {
      left = 0;
      hud();
      api.cfg.texts.win = '1분 동안 ' + score + '개를 만들었어!';
      api.win();
      return;
    }
    hud();
  }

  function px(x, y, w, h, color) {
    api.ctx.fillStyle = color;
    api.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function binRect(index) {
    const gap = 10;
    const x0 = 18;
    const w = (924 - gap * 5) / 6;
    return { x: x0 + index * (w + gap), y: 438, w, h: 86 };
  }

  function drawIngredient(name, x, y, w, h, role) {
    const ctx = api.ctx;
    if (name === '빵' && role === 'bottom') {
      px(x + w * 0.04, y + h * 0.42, w * 0.92, h * 0.4, '#e7b85a');
      px(x + w * 0.08, y + h * 0.58, w * 0.84, h * 0.28, '#f3d38a');
    } else if (name === '빵') {
      px(x, y + h * 0.35, w, h * 0.5, '#e7b85a');
      px(x + w * 0.08, y + h * 0.12, w * 0.84, h * 0.42, '#f3d38a');
      px(x + w * 0.18, y + h * 0.2, w * 0.1, h * 0.1, '#fff1c2');
      px(x + w * 0.7, y + h * 0.22, w * 0.08, h * 0.08, '#fff1c2');
    } else if (name === '패티') {
      px(x + w * 0.04, y + h * 0.28, w * 0.92, h * 0.48, '#6b341c');
      px(x + w * 0.12, y + h * 0.34, w * 0.76, h * 0.16, '#8a4b2f');
    } else if (name === '치킨패티') {
      px(x + w * 0.06, y + h * 0.26, w * 0.88, h * 0.5, '#c9843a');
      px(x + w * 0.14, y + h * 0.32, w * 0.7, h * 0.16, '#e0a15a');
      px(x + w * 0.2, y + h * 0.55, w * 0.12, h * 0.1, '#a86828');
    } else if (name === '양상추') {
      px(x, y + h * 0.4, w, h * 0.28, '#5cbf45');
      px(x + w * 0.08, y + h * 0.22, w * 0.2, h * 0.34, '#7ed957');
      px(x + w * 0.38, y + h * 0.16, w * 0.24, h * 0.4, '#8ee86a');
      px(x + w * 0.7, y + h * 0.24, w * 0.22, h * 0.32, '#7ed957');
    } else if (name === '토마토') {
      px(x + w * 0.06, y + h * 0.3, w * 0.88, h * 0.4, '#e23d28');
      px(x + w * 0.2, y + h * 0.38, w * 0.16, h * 0.16, '#ffd0c4');
      px(x + w * 0.62, y + h * 0.4, w * 0.14, h * 0.14, '#ffd0c4');
    } else {
      px(x + w * 0.08, y + h * 0.42, w * 0.84, h * 0.22, '#f2c14e');
      px(x + w * 0.18, y + h * 0.58, w * 0.12, h * 0.2, '#e0a82a');
      px(x + w * 0.48, y + h * 0.6, w * 0.1, h * 0.22, '#e0a82a');
      px(x + w * 0.72, y + h * 0.56, w * 0.1, h * 0.18, '#e0a82a');
    }
    ctx.fillStyle = '#2a160c';
  }

  function drawShop() {
    px(0, 0, 960, 250, '#e7a15a');
    for (let y = 0; y < 240; y += 24) {
      for (let x = 0; x < 960; x += 48) {
        if (((x / 48) + (y / 24)) % 2 === 0) px(x, y, 46, 22, '#d8883f');
      }
    }
    px(70, 28, 250, 150, '#9fd7ff');
    px(78, 36, 234, 134, '#d9f4ff');
    px(150, 70, 90, 50, '#f3d38a');
    px(160, 86, 70, 16, '#6b341c');
    px(155, 108, 80, 10, '#7ed957');
    px(390, 36, 500, 78, '#3d2914');
    px(398, 44, 484, 62, '#5c3b22');
    api.ctx.fillStyle = '#ffe7a3';
    api.ctx.font = '700 34px sans-serif';
    api.ctx.fillText('길동의 햄버거집', 430, 86);
    px(0, 236, 960, 18, '#f2d48a');
    px(0, 254, 960, 186, '#8a5a34');
    px(0, 254, 960, 10, '#c49258');
    px(250, 286, 460, 140, '#e6c98a');
    px(262, 298, 436, 116, '#f3e2b0');
  }

  function drawTicket() {
    const items = menu();
    px(150, 168, 660, 78, '#fff6d8');
    px(150, 168, 660, 8, '#3d2914');
    api.ctx.fillStyle = '#3d2914';
    api.ctx.font = '700 18px sans-serif';
    api.ctx.fillText('주문', 164, 198);
    const count = request.length;
    const chipW = Math.min(108, (620 - (count - 1) * 8) / count);
    request.forEach((index, i) => {
      const item = items[index];
      const x = 164 + i * (chipW + 8);
      const done = i < part;
      const current = i === part;
      px(x, 206, chipW, 28, done ? '#b7e7a1' : current ? '#ffe08a' : '#fff');
      px(x, 206, 8, 28, item.color);
      api.ctx.fillStyle = '#3d2914';
      api.ctx.font = '700 16px sans-serif';
      api.ctx.fillText(item.name, x + 12, 226);
    });
  }

  function drawStack() {
    const items = menu();
    const baseX = 330;
    const baseY = 392;
    const w = 300;
    const h = 34;
    if (part === 0) {
      api.ctx.fillStyle = '#a68455';
      api.ctx.font = '700 20px sans-serif';
      api.ctx.fillText('여기에 쌓아 줘', baseX + 70, baseY - 8);
    }
    for (let i = 0; i < part; i++) {
      const name = items[request[i]].name;
      const role = name === '빵' ? (i === 0 ? 'bottom' : 'top') : '';
      drawIngredient(name, baseX, baseY - (i + 1) * (h - 6), w, h, role);
    }
  }

  function drawBins() {
    const items = menu();
    const next = request[part];
    items.forEach((item, index) => {
      const rect = binRect(index);
      px(rect.x, rect.y, rect.w, rect.h, index === next ? '#ffe08a' : '#3d2914');
      px(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, '#6b4428');
      drawIngredient(item.name, rect.x + 14, rect.y + 6, rect.w - 28, 46);
      api.ctx.fillStyle = '#fff6d8';
      api.ctx.font = '700 16px sans-serif';
      api.ctx.fillText((index + 1) + ' ' + item.name, rect.x + 10, rect.y + 74);
    });
  }

  function drawNotice() {
    if (noticeLeft <= 0) return;
    const ctx = api.ctx;
    ctx.fillStyle = notice === '완성!' ? '#2f8f46' : '#a32020';
    ctx.fillRect(330, 300, 300, 54);
    ctx.fillStyle = '#fff6d8';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(notice, 480, 336);
    ctx.textAlign = 'left';
  }

  function draw() {
    const ctx = api.ctx;
    ctx.imageSmoothingEnabled = false;
    drawShop();
    drawTicket();
    drawStack();
    drawBins();
    if (flash > 0) {
      ctx.fillStyle = 'rgba(180, 24, 24, 0.28)';
      ctx.fillRect(250, 286, 460, 140);
    }
    drawNotice();
  }

  api.onTap(point => {
    menu().forEach((item, index) => {
      const rect = binRect(index);
      if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) place(index);
    });
  });

  return { reset, update, draw };
});
