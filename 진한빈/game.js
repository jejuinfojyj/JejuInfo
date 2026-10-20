TemplateEngine.start(api => {
  const menu = () => api.cfg.map.menu;
  const recipes = [
    ['빵', '패티', '치즈', '양상추', '토마토', '소스', '빵'],
    ['빵', '치킨패티', '양상추', '토마토', '소스', '빵'],
    ['빵', '패티', '치즈', '소스', '빵'],
    ['빵', '치킨패티', '치즈', '양상추', '소스', '빵'],
    ['빵', '패티', '양상추', '토마토', '빵'],
    ['빵', '패티', '치즈', '토마토', '소스', '빵']
  ];

  let score = 0;
  let timeLeft = 90;
  let recipe = [];
  let stack = [];
  let feedback = '';
  let feedbackT = 0;
  let ready = false;
  let drag = null;
  let bins = [];
  let plate = { x: 360, y: 250, w: 240, h: 200 };
  let customer = { x: 640, y: 70, w: 280, h: 150 };
  let flash = 0;

  function colorOf(name) {
    const item = menu().find(m => m.name === name);
    return item ? item.color : '#ccc';
  }

  function layoutBins() {
    const items = menu();
    const gap = 10;
    const w = Math.min(118, (880 - gap * (items.length - 1)) / items.length);
    const start = (960 - (items.length * w + gap * (items.length - 1))) / 2;
    bins = items.map((item, i) => ({
      name: item.name,
      color: item.color,
      x: start + i * (w + gap),
      y: 430,
      w,
      h: 90
    }));
  }

  function nextOrder() {
    recipe = recipes[Math.floor(Math.random() * recipes.length)].slice();
    stack = [];
    ready = false;
    feedback = '새 주문!';
    feedbackT = 0.8;
  }

  function hud() {
    api.setScore('완성 ' + score + '개');
    const m = Math.floor(Math.max(0, timeLeft) / 60);
    const s = Math.ceil(Math.max(0, timeLeft) % 60);
    api.setExtra('남은 ' + m + ':' + String(s).padStart(2, '0'));
  }

  function remake() {
    stack = [];
    ready = false;
    feedback = '다시 만들기!';
    feedbackT = 1;
    flash = 0.35;
    api.tone(180);
  }

  function tryAdd(name) {
    if (api.mode() !== 'play' || ready) return;
    const need = recipe[stack.length];
    if (name !== need) {
      remake();
      return;
    }
    stack.push(name);
    api.tone(520 + stack.length * 40);
    feedback = name + ' 올렸어요';
    feedbackT = 0.5;
    if (stack.length === recipe.length) {
      ready = true;
      feedback = '손님에게 전달!';
      feedbackT = 1.2;
      api.tone(740, 0.12);
    }
  }

  function deliver() {
    if (!ready || api.mode() !== 'play') return;
    score += 1;
    api.tone(880, 0.15);
    feedback = '주문 완료!';
    feedbackT = 0.9;
    nextOrder();
    hud();
  }

  function hit(box, p) {
    return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h;
  }

  function point(event) {
    return api.pointer(event);
  }

  function onDown(event) {
    if (api.mode() !== 'play') return;
    const p = point(event);
    if (ready && hit(customer, p)) {
      deliver();
      return;
    }
    for (const bin of bins) {
      if (hit(bin, p)) {
        drag = { name: bin.name, color: bin.color, x: p.x, y: p.y, ox: p.x, oy: p.y };
        try { api.canvas.setPointerCapture(event.pointerId); } catch (_) {}
        return;
      }
    }
  }

  function onMove(event) {
    if (!drag) return;
    const p = point(event);
    drag.x = p.x;
    drag.y = p.y;
  }

  function onUp(event) {
    if (!drag) return;
    const p = point(event);
    const dropped = hit(plate, p) || (Math.hypot(p.x - (plate.x + plate.w / 2), p.y - (plate.y + plate.h / 2)) < 140);
    const name = drag.name;
    drag = null;
    if (dropped) tryAdd(name);
  }

  api.canvas.addEventListener('pointerdown', onDown);
  api.canvas.addEventListener('pointermove', onMove);
  api.canvas.addEventListener('pointerup', onUp);
  api.canvas.addEventListener('pointercancel', () => { drag = null; });

  api.onTap(p => {
    if (api.mode() !== 'play') return;
    if (ready && hit(customer, p)) deliver();
  });

  function drawChef(x, y) {
    const ctx = api.ctx;
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.ellipse(x + 40, y + 38, 28, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + 40, y + 8, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 18, y + 8, 44, 18);
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 70);
    ctx.lineTo(x + 72, y + 70);
    ctx.lineTo(x + 78, y + 150);
    ctx.lineTo(x + 2, y + 150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff7e2';
    ctx.fillRect(x + 30, y + 88, 20, 28);
    ctx.fillStyle = '#172033';
    ctx.fillRect(x + 28, y + 32, 6, 8);
    ctx.fillRect(x + 46, y + 32, 6, 8);
    ctx.font = '700 18px sans-serif';
    ctx.fillStyle = '#fff7e2';
    ctx.fillText(api.cfg.player.name || '슈', x + 18, y + 168);
  }

  function drawIngredient(name, x, y, w, h) {
    const ctx = api.ctx;
    const c = colorOf(name);
    ctx.fillStyle = c;
    if (name === '빵') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c4893f';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2 + 2, w / 2.2, h / 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === '소스') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2.2, h / 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (name === '치즈') {
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.35);
      ctx.lineTo(x + w, y + h * 0.2);
      ctx.lineTo(x + w, y + h * 0.75);
      ctx.lineTo(x, y + h * 0.85);
      ctx.closePath();
      ctx.fill();
    } else if (name === '양상추') {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 ? w * 0.28 : w * 0.48;
        const px = x + w / 2 + Math.cos(a) * r;
        const py = y + h / 2 + Math.sin(a) * r * 0.55;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (name === '토마토') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2.1, h / 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(x + 4, y + h * 0.2, w - 8, h * 0.55, 10);
      ctx.fill();
    }
  }

  function reset() {
    score = 0;
    timeLeft = api.cfg.rules.timeSec || 90;
    layoutBins();
    api.buttons([]);
    api.choices([]);
    nextOrder();
    hud();
  }

  function update(dt) {
    if (api.mode() !== 'play') return;
    timeLeft -= dt;
    if (feedbackT > 0) feedbackT -= dt;
    if (flash > 0) flash -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      hud();
      api.cfg.texts.win = score + '개 주문 완성! 영업 종료!';
      api.win();
      return;
    }
    hud();
  }

  function draw() {
    const ctx = api.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#8b4a32');
    g.addColorStop(0.45, '#6b3a2a');
    g.addColorStop(1, '#3e2218');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 540);

    ctx.fillStyle = '#c9a227';
    for (let i = 0; i < 12; i++) ctx.fillRect(20 + i * 80, 12, 50, 10);

    ctx.fillStyle = '#4a2a1c';
    ctx.fillRect(0, 400, 960, 140);
    ctx.fillStyle = '#5c3424';
    ctx.fillRect(0, 390, 960, 16);

    drawChef(36, 90);

    ctx.fillStyle = flash > 0 ? '#ff8a80' : '#fff3e0';
    ctx.beginPath();
    ctx.roundRect(customer.x, customer.y, customer.w, customer.h, 18);
    ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.font = '700 22px sans-serif';
    ctx.fillText(ready ? '전달하려면 여기를 눌러!' : '주문', customer.x + 18, customer.y + 36);
    ctx.font = '20px sans-serif';
    const orderText = recipe.map((name, i) => (i < stack.length ? '✓' : i === stack.length && !ready ? '►' : '') + name).join(' → ');
    const lines = [];
    let line = '';
    orderText.split(' → ').forEach((part, idx, arr) => {
      const next = line ? line + ' → ' + part : part;
      if (next.length > 22 && line) {
        lines.push(line);
        line = part;
      } else line = next;
      if (idx === arr.length - 1) lines.push(line);
    });
    lines.slice(0, 3).forEach((t, i) => ctx.fillText(t, customer.x + 18, customer.y + 68 + i * 26));

    ctx.fillStyle = '#efebe9';
    ctx.beginPath();
    ctx.ellipse(plate.x + plate.w / 2, plate.y + plate.h - 18, plate.w / 2, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d7ccc8';
    ctx.beginPath();
    ctx.ellipse(plate.x + plate.w / 2, plate.y + plate.h - 18, plate.w / 2 - 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff8e1';
    ctx.font = '700 20px sans-serif';
    ctx.fillText('조립대', plate.x + 80, plate.y + 24);

    stack.forEach((name, i) => {
      drawIngredient(name, plate.x + 40, plate.y + plate.h - 70 - i * 22, 160, 40);
    });

    bins.forEach(bin => {
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.roundRect(bin.x, bin.y, bin.w, bin.h, 12);
      ctx.fill();
      drawIngredient(bin.name, bin.x + 8, bin.y + 8, bin.w - 16, 44);
      ctx.fillStyle = '#fff8e1';
      ctx.font = '700 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bin.name, bin.x + bin.w / 2, bin.y + bin.h - 12);
      ctx.textAlign = 'left';
    });

    if (drag) {
      drawIngredient(drag.name, drag.x - 50, drag.y - 24, 100, 48);
      ctx.fillStyle = '#fff';
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(drag.name, drag.x, drag.y + 36);
      ctx.textAlign = 'left';
    }

    if (feedbackT > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(300, 200, 360, 48, 14);
      ctx.fill();
      ctx.fillStyle = '#fffde7';
      ctx.font = '700 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(feedback, 480, 232);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = '#ffe082';
    ctx.font = '18px sans-serif';
    ctx.fillText('재료를 조립대로 드래그 · 완성 후 손님에게 전달', 220, 52);
  }

  return { reset, update, draw };
});
