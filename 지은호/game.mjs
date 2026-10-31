import { CONFIG, SKILLS, WEAPON_IDS, PASSIVE_IDS, HELP_ITEMS, HELP_ITEM_IDS } from './config.mjs';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

function xpNeeded(level) {
  return CONFIG.xp.base + level * CONFIG.xp.perLevel;
}

function skillLevel(state, id) {
  return state.skills[id] || 0;
}

function buffLeft(state, key) {
  return Math.max(0, state.buffs?.[key] || 0);
}

function powerMul(state) {
  const candy = buffLeft(state, 'power') > 0 ? 0.55 : 0;
  return 1 + skillLevel(state, 'power') * 0.25 + candy;
}

function cdMul(state) {
  return Math.max(0.45, 1 - skillLevel(state, 'cooldown') * 0.1);
}

function moveSpeed(state) {
  const soda = buffLeft(state, 'speed') > 0 ? 0.55 : 0;
  return CONFIG.player.baseSpeed * (1 + skillLevel(state, 'drink') * 0.12 + soda);
}

function pickupRange(state) {
  const orb = buffLeft(state, 'magnet') > 0 ? 220 : 0;
  return CONFIG.player.pickup + skillLevel(state, 'magnet') * CONFIG.player.magnetBonus + orb;
}

function pickHelpKind() {
  const ids = HELP_ITEM_IDS;
  return ids[(Math.random() * ids.length) | 0];
}

function dropHelpItem(state, x, y, forceKind = null) {
  if ((state.items?.length || 0) >= CONFIG.helpItems.maxOnMap) return;
  const kind = forceKind || pickHelpKind();
  const half = state.half || CONFIG.worldSize / 2;
  state.items.push({
    kind,
    x: clamp(x, -half + 30, half - 30),
    y: clamp(y, -half + 30, half - 30),
    r: 14,
    life: CONFIG.helpItems.life,
    bob: Math.random() * Math.PI * 2,
  });
}

function maybeDropHelpItem(state, enemy) {
  const chance = enemy.kind === 'boss'
    ? CONFIG.helpItems.bossDropChance
    : enemy.kind === 'elite'
      ? CONFIG.helpItems.eliteDropChance
      : CONFIG.helpItems.dropChance;
  if (Math.random() > chance) return;
  // 보스는 쉬운 아이템을 2개 떨어뜨려 더 편하게
  const count = enemy.kind === 'boss' ? 2 : 1;
  for (let i = 0; i < count; i++) {
    dropHelpItem(state, enemy.x + rand(-18, 18), enemy.y + rand(-18, 18));
  }
}

function applyHelpItem(state, kind) {
  const info = HELP_ITEMS[kind];
  if (!info) return;
  const p = state.player;
  if (kind === 'heart') {
    const gain = Math.ceil(p.maxHp * 0.45);
    p.hp = Math.min(p.maxHp, p.hp + gain);
    state.banner = { text: `${info.name} +${gain} HP`, life: 1.8 };
    return;
  }
  if (kind === 'shield') {
    state.buffs.shield = Math.max(state.buffs.shield, 4.5);
    p.invuln = Math.max(p.invuln, 4.5);
    state.banner = { text: `${info.name} 4.5초!`, life: 1.8 };
    return;
  }
  if (kind === 'magnetOrb') {
    state.buffs.magnet = Math.max(state.buffs.magnet, 6);
    for (const g of state.gems) {
      g.x += (p.x - g.x) * 0.35;
      g.y += (p.y - g.y) * 0.35;
    }
    state.banner = { text: `${info.name} 발동!`, life: 1.8 };
    return;
  }
  if (kind === 'speedSoda') {
    state.buffs.speed = Math.max(state.buffs.speed, 5);
    state.banner = { text: `${info.name} 5초!`, life: 1.8 };
    return;
  }
  if (kind === 'powerCandy') {
    state.buffs.power = Math.max(state.buffs.power, 5);
    state.banner = { text: `${info.name} 5초!`, life: 1.8 };
    return;
  }
  if (kind === 'boomStar') {
    let hit = 0;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (dist(p.x, p.y, e.x, e.y) < 210) {
        hurtEnemy(state, e, 90 + state.level * 8);
        hit += 1;
      }
    }
    if (state.fx.length < 80) {
      state.fx.push({ kind: 'burst', x: p.x, y: p.y, life: 0.45, r: 40 });
    }
    state.banner = { text: `${info.name} · 적 ${hit}명!`, life: 1.8 };
  }
}

function tickBuffs(state, dt) {
  for (const key of Object.keys(state.buffs)) {
    state.buffs[key] = Math.max(0, state.buffs[key] - dt);
  }
  if (buffLeft(state, 'shield') > 0) {
    state.player.invuln = Math.max(state.player.invuln, 0.12);
  }
}

function scheduleHelpItems(state, dt) {
  state.itemSpawnTimer = (state.itemSpawnTimer || 0) - dt;
  if (state.itemSpawnTimer > 0) return;
  state.itemSpawnTimer = CONFIG.helpItems.spawnEvery;
  if ((state.items?.length || 0) >= CONFIG.helpItems.maxOnMap) return;
  const angle = rand(0, Math.PI * 2);
  const distAway = rand(120, 220);
  dropHelpItem(
    state,
    state.player.x + Math.cos(angle) * distAway,
    state.player.y + Math.sin(angle) * distAway,
  );
}

function maxHp(state) {
  return CONFIG.player.maxHp + skillLevel(state, 'vit') * 25;
}

// Combat and upgrade cards read the same values, so previews describe the attack
// the player will actually receive. Every level improves a visible combat stat.
export function skillStats(state, id, level = skillLevel(state, id)) {
  const lv = clamp(level, 0, SKILLS[id]?.max || 5);
  const pow = powerMul(state);
  const cd = cdMul(state);
  if (id === 'kunai') {
    const evolved = !!state.evolved.kunai;
    return {
      damage: (evolved ? 26 : 18) * (1 + lv * 0.25) * pow,
      interval: (evolved ? 0.28 : 0.42 - Math.max(0, lv - 1) * 0.035) * cd,
      count: 1 + Math.floor(Math.max(0, lv - 1) / 2),
      speed: evolved ? 480 : 400, radius: evolved ? 8 : 6,
      range: 460, life: 1.4, pierce: evolved ? 2 + Math.floor(lv / 2) : 0,
    };
  }
  if (id === 'molotov') return {
    damage: (14 + lv * 6) * pow, interval: (1.6 - Math.max(0, lv - 1) * 0.08) * cd,
    radius: 60 + lv * 10, life: 3 + lv * 0.3,
    count: 1 + Math.floor(Math.max(0, lv - 1) / 2),
  };
  if (id === 'drone') return {
    damage: (14 + lv * 5) * pow, interval: (0.6 - Math.max(0, lv - 1) * 0.05) * cd,
    count: Math.min(3, 1 + Math.floor(Math.max(0, lv - 1) / 2)), range: 360 + lv * 10,
  };
  if (id === 'lightning') return {
    damage: (25 + lv * 8) * pow, interval: (1.1 - Math.max(0, lv - 1) * 0.08) * cd,
    count: 1 + lv, range: 220 + lv * 12, chainRange: 160 + lv * 8,
  };
  if (id === 'saw') return {
    damage: (50 + lv * 20) * pow, count: 1 + Math.floor(Math.max(0, lv - 1) / 2),
    radius: 54 + lv * 4, rotation: 2.4 + lv * 0.25,
  };
  if (id === 'drink') return { speed: CONFIG.player.baseSpeed * (1 + lv * 0.12), bonus: lv * 12 };
  if (id === 'vit') return { maxHp: CONFIG.player.maxHp + lv * 25, regen: lv * 0.8 };
  if (id === 'power') return { bonus: lv * 25 };
  if (id === 'magnet') return { range: CONFIG.player.pickup + lv * CONFIG.player.magnetBonus };
  if (id === 'cooldown') return { bonus: lv * 10 };
  return {};
}

function ownedOfType(state, type) {
  return Object.keys(state.skills).filter((id) => SKILLS[id]?.type === type && state.skills[id] > 0);
}

function canEvolve(state, weaponId) {
  const skill = SKILLS[weaponId];
  if (!skill?.evolveWith) return false;
  if (state.evolved[weaponId]) return false;
  return skillLevel(state, weaponId) >= skill.max && skillLevel(state, skill.evolveWith) >= 1;
}

function tryEvolve(state, weaponId) {
  if (!canEvolve(state, weaponId)) return false;
  state.evolved[weaponId] = true;
  state.banner = { text: `${SKILLS[weaponId].evolveName} 돌파!`, life: 2.2 };
  return true;
}

function buildChoices(state) {
  const pool = [];
  const weapons = ownedOfType(state, 'weapon');
  const passives = ownedOfType(state, 'passive');

  for (const id of WEAPON_IDS) {
    const lv = skillLevel(state, id);
    if (lv > 0 && lv < SKILLS[id].max) pool.push(id);
    else if (lv === 0 && weapons.length < CONFIG.limits.weapons) pool.push(id);
  }
  for (const id of PASSIVE_IDS) {
    const lv = skillLevel(state, id);
    if (lv > 0 && lv < SKILLS[id].max) pool.push(id);
    else if (lv === 0 && passives.length < CONFIG.limits.passives) pool.push(id);
  }

  for (const id of WEAPON_IDS) {
    if (canEvolve(state, id)) pool.push(`evolve:${id}`);
  }

  const unique = [...new Set(pool)];
  const choices = [];
  // A build must be possible to pursue in one round. Never hide a ready
  // evolution behind randomness, and always offer the strongest owned weapon.
  const add = id => {
    const index = unique.indexOf(id);
    if (index >= 0 && choices.length < 3) choices.push(unique.splice(index, 1)[0]);
  };
  for (const id of WEAPON_IDS) if (canEvolve(state, id)) add(`evolve:${id}`);
  const focused = weapons.filter(id => skillLevel(state, id) < SKILLS[id].max)
    .sort((a, b) => skillLevel(state, b) - skillLevel(state, a))[0];
  if (focused) add(focused);
  if (skillLevel(state, 'kunai') >= 3 && !skillLevel(state, 'drink') && !state.evolved.kunai) add('drink');
  while (choices.length < 3 && unique.length) {
    const i = (Math.random() * unique.length) | 0;
    choices.push(unique.splice(i, 1)[0]);
  }
  if (!choices.length) {
    choices.push('heal');
  }
  return choices;
}

function queueLevelUp(state) {
  if (state.choices) return;
  if (state.xp < state.xpToNext) return;
  state.xp -= state.xpToNext;
  state.level += 1;
  state.xpToNext = xpNeeded(state.level);
  state.choices = buildChoices(state);
  state.stick.active = false;
  maybeSpawnLevelBoss(state);
}

function maybeSpawnLevelBoss(state) {
  const every = CONFIG.levelBoss?.every || 10;
  if (state.level <= 0 || state.level % every !== 0) return;
  if (state.levelBossSpawned?.[state.level]) return;
  state.levelBossSpawned = state.levelBossSpawned || {};
  state.levelBossSpawned[state.level] = true;
  spawnEnemy(state, 'boss', { fromLevel: state.level });
}

function applyChoice(state, choice) {
  if (!state.choices?.includes(choice)) return false;
  if (String(choice).startsWith('evolve:')) {
    if (!tryEvolve(state, choice.slice(7))) return false;
  } else if (choice === 'heal') {
    const gain = Math.ceil(state.player.maxHp * 0.3);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + gain);
    state.banner = { text: `응급 회복 +${gain} HP`, life: 2 };
  } else {
    const skill = SKILLS[choice];
    if (!skill) return false;
    const prev = skillLevel(state, choice);
    if (prev >= skill.max) return false;
    const limit = skill.type === 'weapon' ? CONFIG.limits.weapons : CONFIG.limits.passives;
    if (!prev && ownedOfType(state, skill.type).length >= limit) return false;
    state.skills[choice] = prev + 1;
    if (choice === 'vit') {
      const gain = 25;
      state.player.maxHp = maxHp(state);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + gain);
    }
    if (skill.type === 'weapon') state.timers[choice] = 0;
    state.banner = { text: `${skill.name} Lv.${prev + 1}${prev + 1 === skill.max ? ' MAX' : ''}`, life: 2 };
  }
  state.choices = null;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * 0.08);
  state.choiceLayout = null;
  state.stick.active = false;
  queueLevelUp(state);
  return true;
}

function spawnEnemy(state, kind, opts = {}) {
  const angle = rand(0, Math.PI * 2);
  const distAway = rand(340, 480);
  const px = state.player.x + Math.cos(angle) * distAway;
  const py = state.player.y + Math.sin(angle) * distAway;
  const half = CONFIG.worldSize / 2;
  let x = clamp(px, -half + 40, half - 40);
  let y = clamp(py, -half + 40, half - 40);
  // Clamping an outward spawn at the boundary can place it on the player.
  // Use the open direction into the arena to retain a fair approach distance.
  if (dist(state.player.x, state.player.y, x, y) < 280) {
    const inward = Math.atan2(-state.player.y, -state.player.x);
    x = clamp(state.player.x + Math.cos(inward) * distAway, -half + 40, half - 40);
    y = clamp(state.player.y + Math.sin(inward) * distAway, -half + 40, half - 40);
  }
  const t = state.time;
  // 초반은 약하게, 시간이 갈수록 서서히 세짐
  const scale = 0.48 + (t / CONFIG.duration) * 0.85;

  if (kind === 'boss') {
    const level = opts.fromLevel || state.level || 10;
    const tier = Math.max(1, Math.floor(level / (CONFIG.levelBoss?.every || 10)));
    const hp = tier === 1 ? 240 : 260 + tier * 170;
    const damage = tier === 1 ? 7 : 7 + tier * 2.2;
    const speed = tier === 1 ? 34 : 36 + tier * 2.5;
    state.enemies.push({
      kind: 'boss',
      x, y,
      r: 28 + Math.min(10, tier * 2),
      hp,
      maxHp: hp,
      speed,
      damage,
      xp: 28 + tier * 14,
      flash: 0,
    });
    state.banner = {
      text: opts.fromLevel ? `Lv.${level} 보스 등장!` : '보스 등장!',
      life: 2.4,
    };
    return;
  }
  if (kind === 'elite') {
    state.enemies.push({
      kind: 'elite',
      x, y,
      r: 22,
      hp: 42 * scale,
      maxHp: 42 * scale,
      speed: 56,
      damage: 7,
      xp: 12,
      flash: 0,
    });
    return;
  }
  if (kind === 'fast') {
    state.enemies.push({
      kind: 'fast',
      x, y,
      r: 12,
      hp: 9 * scale,
      maxHp: 9 * scale,
      speed: 100,
      damage: 4,
      xp: 3,
      flash: 0,
    });
    return;
  }
  state.enemies.push({
    kind: 'basic',
    x, y,
    r: 14,
    hp: 12 * scale,
    maxHp: 12 * scale,
    speed: 58,
    damage: 5,
    xp: 4,
    flash: 0,
  });
}

function scheduleSpawns(state, dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const t = state.time;
  // 초반에는 천천히, 후반에만 빠르게
  const rate = Math.max(0.65, 1.55 - (t / CONFIG.duration) * 0.75);
  state.spawnTimer = rate;

  const count = Math.min(1 + Math.floor(t / 100), 90 - state.enemies.length);

  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    if (t > 85 && roll < 0.16) spawnEnemy(state, 'fast');
    else if (t > 140 && roll < 0.22) spawnEnemy(state, 'elite');
    else spawnEnemy(state, 'basic');
  }
}

function nearestEnemy(state, x, y, maxDist = 9999) {
  let best = null;
  let bestD = maxDist;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function hurtEnemy(state, enemy, amount) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.flash = 0.12;
  if (amount >= 3 && state.fx.length < 70) state.fx.push({ kind: 'damage', x: enemy.x, y: enemy.y - enemy.r,
    text: String(Math.round(amount)), life: 0.45 });
  if (enemy.hp > 0) return;
  state.kills += 1;
  state.gems.push({
    x: enemy.x,
    y: enemy.y,
    value: enemy.xp,
    life: CONFIG.gemLifetime,
  });
  maybeDropHelpItem(state, enemy);
  enemy.dead = true;
  if (state.fx.length < 80) state.fx.push({ kind: 'burst', x: enemy.x, y: enemy.y, life: 0.3, r: enemy.r });
}

function fireWeapons(state, dt) {
  const p = state.player;

  // 쿠나이 / 유령 수리검
  if (skillLevel(state, 'kunai') > 0) {
    state.timers.kunai = (state.timers.kunai || 0) - dt;
    if (state.timers.kunai <= 0) {
      const stats = skillStats(state, 'kunai');
      const evolved = state.evolved.kunai;
      state.timers.kunai = stats.interval;
      const target = nearestEnemy(state, p.x, p.y, stats.range);
      if (target) {
        const shots = stats.count;
        for (let i = 0; i < shots; i++) {
          const ang = Math.atan2(target.y - p.y, target.x - p.x) + (i - (shots - 1) / 2) * 0.12;
          state.projectiles.push({
            kind: evolved ? 'ghost' : 'kunai',
            x: p.x,
            y: p.y,
            vx: Math.cos(ang) * stats.speed,
            vy: Math.sin(ang) * stats.speed,
            r: stats.radius,
            damage: stats.damage,
            life: stats.life,
            pierce: stats.pierce,
            homing: evolved,
          });
        }
      }
    }
  }

  // 화염병
  if (skillLevel(state, 'molotov') > 0) {
    state.timers.molotov = (state.timers.molotov || 0) - dt;
    if (state.timers.molotov <= 0) {
      const stats = skillStats(state, 'molotov');
      state.timers.molotov = stats.interval;
      for (let i = 0; i < stats.count; i++) {
        const angle = state.time * 0.7 + i / stats.count * Math.PI * 2;
        state.zones.push({ kind: 'fire',
          x: p.x + Math.cos(angle) * (stats.count > 1 ? 68 : 24),
          y: p.y + Math.sin(angle) * (stats.count > 1 ? 68 : 24),
          r: stats.radius, damage: stats.damage, life: stats.life, tick: 0 });
      }
    }
  }

  // 드론
  if (skillLevel(state, 'drone') > 0) {
    state.timers.drone = (state.timers.drone || 0) - dt;
    const stats = skillStats(state, 'drone');
    const count = stats.count;
    state.drones = count;
    if (state.timers.drone <= 0) {
      state.timers.drone = stats.interval;
      for (let i = 0; i < count; i++) {
        const ang = state.time * 1.6 + (i / count) * Math.PI * 2;
        const ox = p.x + Math.cos(ang) * 48;
        const oy = p.y + Math.sin(ang) * 48;
        const target = nearestEnemy(state, ox, oy, stats.range);
        if (!target) continue;
        const a = Math.atan2(target.y - oy, target.x - ox);
        state.projectiles.push({
          kind: 'bolt',
          x: ox,
          y: oy,
          vx: Math.cos(a) * 420,
          vy: Math.sin(a) * 420,
          r: 5,
          damage: stats.damage,
          life: stats.range / 420 + 0.15,
          pierce: 0,
        });
      }
    }
  } else {
    state.drones = 0;
  }

  // 번개
  if (skillLevel(state, 'lightning') > 0) {
    state.timers.lightning = (state.timers.lightning || 0) - dt;
    if (state.timers.lightning <= 0) {
      const stats = skillStats(state, 'lightning');
      state.timers.lightning = stats.interval;
      let current = nearestEnemy(state, p.x, p.y, stats.range);
      const hit = new Set();
      const chains = stats.count;
      const bolts = [];
      let fromX = p.x;
      let fromY = p.y;
      for (let i = 0; i < chains && current; i++) {
        hit.add(current);
        hurtEnemy(state, current, stats.damage);
        bolts.push({ x1: fromX, y1: fromY, x2: current.x, y2: current.y });
        fromX = current.x;
        fromY = current.y;
        current = null;
        let bestD = stats.chainRange;
        for (const e of state.enemies) {
          if (hit.has(e) || e.dead) continue;
          const d = dist(fromX, fromY, e.x, e.y);
          if (d < bestD) {
            bestD = d;
            current = e;
          }
        }
      }
      if (bolts.length) {
        state.fx.push({ kind: 'lightning', bolts, life: 0.18 });
      }
    }
  }

  // 회전톱
  if (skillLevel(state, 'saw') > 0) {
    const stats = skillStats(state, 'saw');
    const blades = stats.count;
    state.saws = blades;
    state.sawAngle = (state.sawAngle || 0) + dt * stats.rotation;
    const radius = stats.radius;
    for (let i = 0; i < blades; i++) {
      const ang = state.sawAngle + (i / blades) * Math.PI * 2;
      const sx = p.x + Math.cos(ang) * radius;
      const sy = p.y + Math.sin(ang) * radius;
      for (const e of state.enemies) {
        if (dist(sx, sy, e.x, e.y) < e.r + 12) {
          hurtEnemy(state, e, stats.damage * dt);
        }
      }
    }
  } else {
    state.saws = 0;
  }
}

function readMove(state, input) {
  let mx = 0;
  let my = 0;
  if (input.keys.has('arrowleft') || input.keys.has('a')) mx -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) mx += 1;
  if (input.keys.has('arrowup') || input.keys.has('w')) my -= 1;
  if (input.keys.has('arrowdown') || input.keys.has('s')) my += 1;

  if (input.pointer.down) {
    if (!state.stick.active) {
      state.stick.active = true;
      state.stick.ox = input.pointer.x;
      state.stick.oy = input.pointer.y;
    }
    const dx = input.pointer.x - state.stick.ox;
    const dy = input.pointer.y - state.stick.oy;
    const len = Math.hypot(dx, dy);
    if (len > 12) {
      mx = dx / len;
      my = dy / len;
      state.stick.nx = mx;
      state.stick.ny = my;
    }
  } else {
    state.stick.active = false;
    state.stick.nx = 0;
    state.stick.ny = 0;
  }

  const len = Math.hypot(mx, my) || 1;
  return { x: mx / len, y: my / len, moving: Math.hypot(mx, my) > 0.01 };
}

function handlePick(state, input) {
  if (!state.choices) return;
  for (let i = 0; i < state.choices.length; i++) {
    if (input.pressed.has(String(i + 1))) {
      applyChoice(state, state.choices[i]);
      return;
    }
  }
  if (!input.pointer.pressed) return;
  const cards = state.choiceLayout || [];
  for (const card of cards) {
    if (
      input.pointer.x >= card.x &&
      input.pointer.x <= card.x + card.w &&
      input.pointer.y >= card.y &&
      input.pointer.y <= card.y + card.h
    ) {
      applyChoice(state, card.id);
      return;
    }
  }
}

export function createGame() {
  const half = CONFIG.worldSize / 2;
  return {
    time: 0,
    result: null,
    player: {
      x: 0,
      y: 0,
      r: CONFIG.player.radius,
      hp: CONFIG.player.maxHp,
      maxHp: CONFIG.player.maxHp,
      invuln: 0,
      facing: 0,
      moving: false,
    },
    skills: { kunai: 1 },
    evolved: {},
    level: 1,
    xp: 0,
    xpToNext: xpNeeded(1),
    kills: 0,
    enemies: [],
    gems: [],
    items: [],
    projectiles: [],
    zones: [],
    fx: [],
    timers: {},
    buffs: { shield: 0, magnet: 0, speed: 0, power: 0 },
    spawnTimer: 0.8,
    itemSpawnTimer: 8,
    levelBossSpawned: {},
    drones: 0,
    saws: 0,
    sawAngle: 0,
    stick: { active: false, ox: 90, oy: 560, nx: 0, ny: 0 },
    choices: null,
    choiceLayout: null,
    banner: null,
    half,
  };
}

export function updateGame(state, dt, input) {
  if (state.result) return;

  if (state.choices) {
    handlePick(state, input);
    return;
  }

  state.time += dt;
  if (state.banner) {
    state.banner.life -= dt;
    if (state.banner.life <= 0) state.banner = null;
  }

  const move = readMove(state, input);
  const speed = moveSpeed(state);
  state.player.moving = move.moving;
  if (move.moving) {
    state.player.x += move.x * speed * dt;
    state.player.y += move.y * speed * dt;
    state.player.facing = Math.atan2(move.y, move.x);
  }
  state.player.x = clamp(state.player.x, -state.half + 20, state.half - 20);
  state.player.y = clamp(state.player.y, -state.half + 20, state.half - 20);
  state.player.invuln = Math.max(0, state.player.invuln - dt);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + skillLevel(state, 'vit') * 0.8 * dt);
  tickBuffs(state, dt);

  scheduleSpawns(state, dt);
  scheduleHelpItems(state, dt);
  fireWeapons(state, dt);

  // 구역(화염)
  for (const z of state.zones) {
    z.life -= dt;
    z.tick -= dt;
    if (z.tick <= 0) {
      z.tick = 0.25;
      for (const e of state.enemies) {
        if (dist(z.x, z.y, e.x, e.y) < z.r + e.r) hurtEnemy(state, e, z.damage * 0.25);
      }
    }
  }
  state.zones = state.zones.filter((z) => z.life > 0);

  // 투사체
  for (const b of state.projectiles) {
    b.hitTargets ??= new Set();
    if (b.homing) {
      const t = nearestEnemy(state, b.x, b.y, 280);
      if (t) {
        const desired = Math.atan2(t.y - b.y, t.x - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        let diff = desired - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const next = cur + clamp(diff, -4 * dt, 4 * dt);
        const spd = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(next) * spd;
        b.vy = Math.sin(next) * spd;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of state.enemies) {
      if (e.dead || b.hitTargets.has(e)) continue;
      if (dist(b.x, b.y, e.x, e.y) < b.r + e.r) {
        hurtEnemy(state, e, b.damage);
        b.hitTargets.add(e);
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.life = 0;
          break;
        }
      }
    }
  }
  state.projectiles = state.projectiles.filter((b) => b.life > 0);
  state.fx = state.fx.filter((f) => {
    f.life -= dt;
    if (f.kind === 'damage') f.y -= 32 * dt;
    return f.life > 0;
  });

  // 적 이동·접촉 피해
  const p = state.player;
  for (const e of state.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    const d = dist(p.x, p.y, e.x, e.y) || 1;
    e.x += ((p.x - e.x) / d) * e.speed * dt;
    e.y += ((p.y - e.y) / d) * e.speed * dt;
    if (d < p.r + e.r && state.player.invuln <= 0) {
      state.player.hp -= e.damage;
      state.player.invuln = CONFIG.player.invulnAfterHit;
      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.result = {
          success: false,
          message: `${Math.floor(state.time)}초 생존 · 처치 ${state.kills} · Lv.${state.level}\n다시 빌드를 짜 보자!`,
        };
        return;
      }
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead);

  // 경험치
  const magnet = pickupRange(state);
  for (const g of state.gems) {
    g.life -= dt;
    const d = dist(p.x, p.y, g.x, g.y);
    if (d < magnet) {
      const pull = Math.min(420, 180 + (magnet - d) * 4);
      g.x += ((p.x - g.x) / (d || 1)) * pull * dt;
      g.y += ((p.y - g.y) / (d || 1)) * pull * dt;
    }
    if (d < 18) {
      g.got = true;
      state.xp += g.value;
    }
  }
  state.gems = state.gems.filter((g) => !g.got && g.life > 0);

  // 쉬운 도우미 아이템
  for (const it of state.items) {
    it.life -= dt;
    it.bob += dt * 4;
    const d = dist(p.x, p.y, it.x, it.y);
    if (d < pickupRange(state) * 0.55) {
      const pull = Math.min(360, 140 + (pickupRange(state) - d) * 3);
      it.x += ((p.x - it.x) / (d || 1)) * pull * dt;
      it.y += ((p.y - it.y) / (d || 1)) * pull * dt;
    }
    if (d < 22) {
      it.got = true;
      applyHelpItem(state, it.kind);
    }
  }
  state.items = state.items.filter((it) => !it.got && it.life > 0);

  queueLevelUp(state);

  if (state.choices) return;

  if (state.time >= CONFIG.duration) {
    state.result = {
      success: true,
      message: `${CONFIG.duration}초 버티기 성공!\n처치 ${state.kills} · Lv.${state.level}`,
    };
  }
}

function upgradeDescription(state, id, previous, next) {
  const before = skillStats(state, id, previous);
  const after = skillStats(state, id, next);
  const pair = (key, digits = 0) => {
    const format = value => Number(value.toFixed(digits)).toString();
    return previous ? `${format(before[key])}→${format(after[key])}` : format(after[key]);
  };
  if (id === 'kunai') return `피해 ${pair('damage')}\n${pair('count')}발 · ${pair('interval', 2)}초`;
  if (id === 'molotov') return `피해 ${pair('damage')}/초\n장판 ${pair('count')}개\n범위 ${pair('radius')}`;
  if (id === 'drone') return `피해 ${pair('damage')}\n드론 ${pair('count')}기\n주기 ${pair('interval', 2)}초`;
  if (id === 'lightning') return `피해 ${pair('damage')}\n연쇄 ${pair('count')}회\n주기 ${pair('interval', 2)}초`;
  if (id === 'saw') return `피해 ${pair('damage')}/초\n톱날 ${pair('count')}개\n범위 ${pair('radius')}`;
  if (id === 'drink') return `이동 속도 +${pair('bonus')}%\n쿠나이 MAX와 조합해 돌파`;
  if (id === 'vit') return `최대 HP ${pair('maxHp')}\n초당 회복 ${pair('regen', 1)}`;
  if (id === 'power') return `모든 피해 +${pair('bonus')}%`;
  if (id === 'magnet') return `경험치 획득 범위\n${pair('range')}`;
  if (id === 'cooldown') return `공격 주기 감소\n${pair('bonus')}%`;
  return '';
}

export function choiceLabel(id, state = { skills: {}, evolved: {} }) {
  if (id === 'heal') return {
    name: '응급 회복', title: '응급 회복', desc: '최대 HP의 30% 회복\n스킬 최대 레벨 달성',
    color: '#7bed9f', tag: '회복', level: 'MAX',
  };
  if (String(id).startsWith('evolve:')) {
    const wid = id.slice(7);
    const s = SKILLS[wid];
    return {
      title: s.evolveName,
      name: s.evolveName,
      desc: s.evolveDesc,
      color: s.color,
      tag: '돌파',
      level: '★',
    };
  }
  const s = SKILLS[id];
  const current = skillLevel(state, id);
  const next = Math.min(s.max, current + 1);
  const level = current >= s.max ? 'MAX' : current ? `Lv.${current}→${next}` : `신규 Lv.${next}`;
  return {
    title: `${s.name} ${level}`,
    name: s.name,
    level,
    desc: upgradeDescription(state, id, current, next),
    color: s.color,
    tag: s.type === 'weapon' ? '공격' : '패시브',
  };
}
