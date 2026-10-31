// 프리셸 규칙: 8열·4프리셀·4홈, 교차색 내림차순으로 모아 A→K 홈에 올린다.
import { CONFIG } from './config.mjs';
import {
  buildDeck, canStackOnCascade, canPlaceOnFoundation, sequenceLength, maxMovable, cardLabel,
} from './cards.mjs';
import {
  freecellRect, foundationRect, cascadeOrigin, cascadeCardRect, BUTTONS, CARD, STACK_GAP, hit,
} from './layout.mjs';
import { sfx } from './sound.mjs';

function emptyCount(s) {
  const emptyFreecells = s.freecells.filter(c => !c).length;
  const emptyCascades = s.cascades.filter(c => !c.length).length;
  return { emptyFreecells, emptyCascades };
}

function cloneBoard(s) {
  return {
    freecells: s.freecells.map(c => (c ? { ...c } : null)),
    foundations: s.foundations.map(f => f.map(c => ({ ...c }))),
    cascades: s.cascades.map(col => col.map(c => ({ ...c }))),
  };
}

function pushHistory(s) {
  s.history.push(cloneBoard(s));
  if (s.history.length > 80) s.history.shift();
  s.moves++;
}

function notice(s, text) { s.notice = { text, t: 2.0 }; }

function addFlight(s, card, from, to) {
  s.flights.push({
    card, x0: from.x, y0: from.y, x1: to.x, y1: to.y,
    faceUp: true, delay: 0, dur: CONFIG.timing.flight, t: 0,
  });
}

function slotCenter(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function locationPos(s, loc) {
  if (loc.type === 'freecell') return slotCenter(freecellRect(loc.i));
  if (loc.type === 'foundation') {
    const f = s.foundations[loc.i];
    const r = foundationRect(loc.i);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 - Math.min(3, f.length) * 0.5 };
  }
  const col = s.cascades[loc.i];
  const idx = loc.cardIndex ?? Math.max(0, col.length - 1);
  const r = cascadeCardRect(loc.i, idx);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function createGame() {
  const state = {
    clock: 0, moves: 0, phase: 'play',
    freecells: [null, null, null, null],
    foundations: [[], [], [], []],
    cascades: Array.from({ length: 8 }, () => []),
    selected: null, history: [],
    message: '카드를 눌러 고르고, 옮길 곳을 눌러 봐!',
    notice: null, flights: [], shake: null, hint: null, result: null,
  };
  deal(state);
  return state;
}

function deal(s) {
  const deck = buildDeck();
  s.freecells = [null, null, null, null];
  s.foundations = [[], [], [], []];
  s.cascades = Array.from({ length: 8 }, () => []);
  s.selected = null; s.history = []; s.moves = 0; s.result = null; s.hint = null;
  // 앞 4열 7장, 뒤 4열 6장
  for (let i = 0; i < 52; i++) s.cascades[i % 8].push(deck[i]);
  s.message = '카드를 눌러 고르고, 옮길 곳을 눌러 봐!';
  notice(s, '프리셸 한 판 시작!');
}

function clearSelection(s) { s.selected = null; s.hint = null; }

function getCardsFromSelection(s) {
  const sel = s.selected;
  if (!sel) return [];
  if (sel.type === 'freecell') return s.freecells[sel.i] ? [s.freecells[sel.i]] : [];
  if (sel.type === 'foundation') return [];
  const col = s.cascades[sel.i];
  return col.slice(sel.cardIndex);
}

function removeSelected(s) {
  const sel = s.selected;
  if (sel.type === 'freecell') {
    const card = s.freecells[sel.i];
    s.freecells[sel.i] = null;
    return [card];
  }
  const col = s.cascades[sel.i];
  return col.splice(sel.cardIndex);
}

function tryAutoFoundation(s, card, fromLoc) {
  for (let i = 0; i < 4; i++) {
    if (!canPlaceOnFoundation(card, s.foundations[i])) continue;
    const fromPos = locationPos(s, {
      ...fromLoc,
      cardIndex: fromLoc.type === 'cascade'
        ? (fromLoc.cardIndex ?? s.cascades[fromLoc.i].length - 1)
        : 0,
    });
    pushHistory(s);
    if (fromLoc.type === 'freecell') s.freecells[fromLoc.i] = null;
    else s.cascades[fromLoc.i].pop();
    addFlight(s, card, fromPos, slotCenter(foundationRect(i)));
    s.foundations[i].push(card);
    sfx('play');
    notice(s, `${cardLabel(card)} → 홈`);
    clearSelection(s);
    checkWin(s);
    return true;
  }
  return false;
}

function checkWin(s) {
  if (s.foundations.every(f => f.length === 13)) {
    s.phase = 'won';
    s.result = {
      success: true,
      message: `모든 카드를 홈에 올렸어!\n이동 ${s.moves}번 만에 클리어!`,
    };
    sfx('win');
  }
}

function canMoveSelectionTo(s, dest) {
  const cards = getCardsFromSelection(s);
  if (!cards.length) return false;
  const head = cards[0];
  const { emptyFreecells, emptyCascades } = emptyCount(s);

  if (dest.type === 'freecell') {
    if (cards.length !== 1) return false;
    if (s.selected.type === 'freecell' && s.selected.i === dest.i) return false;
    return !s.freecells[dest.i];
  }

  if (dest.type === 'foundation') {
    if (cards.length !== 1) return false;
    return canPlaceOnFoundation(head, s.foundations[dest.i]);
  }

  if (dest.type === 'cascade') {
    if (s.selected.type === 'cascade' && s.selected.i === dest.i) return false;
    const col = s.cascades[dest.i];
    const onto = col.at(-1) || null;
    if (!canStackOnCascade(head, onto)) return false;
    const destEmpty = col.length === 0;
    const limit = maxMovable(emptyFreecells, emptyCascades, destEmpty);
    // 출발 열이 비게 되면 빈 열 수 보정은 maxMovable에서 dest만 처리. 출발이 프리셀이면 OK.
    if (s.selected.type === 'cascade' && s.cascades[s.selected.i].length === cards.length) {
      // 출발 열이 비면 emptyCascades가 1 늘어나지만, 동시에 옮기는 중이므로 보수적으로 기존 공식 사용
    }
    return cards.length <= limit;
  }
  return false;
}

function applyMove(s, dest) {
  if (!canMoveSelectionTo(s, dest)) {
    notice(s, '그곳에는 옮길 수 없어.');
    s.shake = { t: 0.35 };
    sfx('nope');
    return;
  }
  const cards = getCardsFromSelection(s);
  const from = { ...s.selected };
  const fromPos = locationPos(s, {
    ...from,
    cardIndex: from.type === 'cascade' ? from.cardIndex : 0,
  });

  pushHistory(s);
  removeSelected(s);

  if (dest.type === 'freecell') {
    s.freecells[dest.i] = cards[0];
    addFlight(s, cards[0], fromPos, slotCenter(freecellRect(dest.i)));
  } else if (dest.type === 'foundation') {
    s.foundations[dest.i].push(cards[0]);
    addFlight(s, cards[0], fromPos, slotCenter(foundationRect(dest.i)));
  } else {
    const startIdx = s.cascades[dest.i].length;
    for (const c of cards) s.cascades[dest.i].push(c);
    cards.forEach((c, i) => {
      const to = cascadeCardRect(dest.i, startIdx + i);
      addFlight(s, c, fromPos, { x: to.x + to.w / 2, y: to.y + to.h / 2 });
    });
  }

  sfx('play');
  notice(s, `${cardLabel(cards[0])}${cards.length > 1 ? ` 외 ${cards.length - 1}장` : ''} 이동!`);
  clearSelection(s);
  checkWin(s);
}

function pickAt(s, tap) {
  // 프리셀
  for (let i = 0; i < 4; i++) {
    if (hit(freecellRect(i), tap)) return { type: 'freecell', i };
  }
  // 홈
  for (let i = 0; i < 4; i++) {
    if (hit(foundationRect(i), tap)) return { type: 'foundation', i };
  }
  // 열: 위에서부터 겹친 카드 중 가장 위(앞) 카드
  for (let i = 0; i < 8; i++) {
    const col = s.cascades[i];
    const o = cascadeOrigin(i);
    if (tap.x < o.x || tap.x > o.x + CARD.w) continue;
    if (!col.length) {
      const empty = { x: o.x, y: o.y, w: CARD.w, h: CARD.h + 40 };
      if (hit(empty, tap)) return { type: 'cascade', i, cardIndex: 0 };
      continue;
    }
    for (let c = col.length - 1; c >= 0; c--) {
      const r = cascadeCardRect(i, c);
      const h = c === col.length - 1 ? r.h : STACK_GAP;
      if (hit({ x: r.x, y: r.y, w: r.w, h }, tap)) {
        const seq = sequenceLength(col);
        const earliest = col.length - seq;
        // 이어진 묶음만 선택 가능
        if (c < earliest) {
          return { type: 'cascade', i, cardIndex: c, blocked: true };
        }
        return { type: 'cascade', i, cardIndex: c };
      }
    }
  }
  return null;
}

function selectSource(s, loc) {
  if (loc.type === 'foundation') {
    notice(s, '홈에 올린 카드는 다시 빼지 않아.');
    sfx('nope');
    return;
  }
  if (loc.type === 'freecell') {
    if (!s.freecells[loc.i]) {
      notice(s, '빈 프리셀이야. 카드를 먼저 골라 줘.');
      return;
    }
    s.selected = { type: 'freecell', i: loc.i };
    s.message = `${cardLabel(s.freecells[loc.i])} 선택! 옮길 곳을 눌러.`;
    sfx('click');
    return;
  }
  if (loc.blocked) {
    notice(s, '이어지지 않은 카드는 한꺼번에 못 옮겨.');
    s.shake = { t: 0.35 };
    sfx('nope');
    return;
  }
  const col = s.cascades[loc.i];
  if (!col.length) {
    notice(s, '빈 열이야. 카드를 먼저 골라 줘.');
    return;
  }
  s.selected = { type: 'cascade', i: loc.i, cardIndex: loc.cardIndex };
  const n = col.length - loc.cardIndex;
  s.message = n > 1
    ? `${cardLabel(col[loc.cardIndex])}부터 ${n}장 선택! 옮길 곳을 눌러.`
    : `${cardLabel(col[loc.cardIndex])} 선택! 옮길 곳을 눌러.`;
  sfx('click');
}

function undo(s) {
  if (!s.history.length) {
    notice(s, '되돌릴 수가 없어.');
    sfx('nope');
    return;
  }
  const prev = s.history.pop();
  s.freecells = prev.freecells;
  s.foundations = prev.foundations;
  s.cascades = prev.cascades;
  s.moves = Math.max(0, s.moves - 1);
  clearSelection(s);
  s.message = '한 수 되돌렸어.';
  sfx('click');
}

function findHint(s) {
  // 홈으로 올릴 수 있는 한 장 우선
  for (let i = 0; i < 4; i++) {
    const card = s.freecells[i];
    if (!card) continue;
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, s.foundations[f])) {
        return { from: { type: 'freecell', i }, to: { type: 'foundation', i: f }, text: `${cardLabel(card)}을 홈으로!` };
      }
    }
  }
  for (let c = 0; c < 8; c++) {
    const col = s.cascades[c];
    if (!col.length) continue;
    const card = col.at(-1);
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, s.foundations[f])) {
        return { from: { type: 'cascade', i: c, cardIndex: col.length - 1 }, to: { type: 'foundation', i: f }, text: `${cardLabel(card)}을 홈으로!` };
      }
    }
  }
  // 열/프리셀 이동
  for (let c = 0; c < 8; c++) {
    const col = s.cascades[c];
    if (!col.length) continue;
    const seq = sequenceLength(col);
    for (let len = 1; len <= seq; len++) {
      const cardIndex = col.length - len;
      s.selected = { type: 'cascade', i: c, cardIndex };
      for (let d = 0; d < 8; d++) {
        if (d === c) continue;
        if (canMoveSelectionTo(s, { type: 'cascade', i: d })) {
          const head = col[cardIndex];
          clearSelection(s);
          return {
            from: { type: 'cascade', i: c, cardIndex },
            to: { type: 'cascade', i: d },
            text: `${cardLabel(head)}을 ${d + 1}열로!`,
          };
        }
      }
      if (len === 1) {
        for (let f = 0; f < 4; f++) {
          if (canMoveSelectionTo(s, { type: 'freecell', i: f })) {
            clearSelection(s);
            return {
              from: { type: 'cascade', i: c, cardIndex },
              to: { type: 'freecell', i: f },
              text: `${cardLabel(col[cardIndex])}을 프리셀로!`,
            };
          }
        }
      }
    }
    clearSelection(s);
  }
  for (let i = 0; i < 4; i++) {
    if (!s.freecells[i]) continue;
    s.selected = { type: 'freecell', i };
    for (let d = 0; d < 8; d++) {
      if (canMoveSelectionTo(s, { type: 'cascade', i: d })) {
        clearSelection(s);
        return {
          from: { type: 'freecell', i },
          to: { type: 'cascade', i: d },
          text: `${cardLabel(s.freecells[i])}을 ${d + 1}열로!`,
        };
      }
    }
    clearSelection(s);
  }
  return null;
}

function handleTap(s, tap) {
  if (hit(BUTTONS.undo, tap)) { undo(s); return; }
  if (hit(BUTTONS.newGame, tap)) {
    deal(s);
    sfx('click');
    return;
  }
  if (hit(BUTTONS.hint, tap)) {
    const h = findHint(s);
    if (!h) {
      notice(s, '지금은 힌트가 없어. 다른 수를 찾아 봐!');
      sfx('nope');
    } else {
      s.hint = h;
      s.selected = h.from;
      notice(s, h.text);
      s.message = h.text;
      sfx('click');
    }
    return;
  }

  const loc = pickAt(s, tap);
  if (!loc) {
    clearSelection(s);
    s.message = '카드를 눌러 고르고, 옮길 곳을 눌러 봐!';
    return;
  }

  // 더블탭처럼: 선택된 같은 카드 다시 누르면 자동 홈 시도 / 선택 해제
  if (s.selected
    && s.selected.type === loc.type
    && s.selected.i === loc.i
    && (loc.type !== 'cascade' || s.selected.cardIndex === loc.cardIndex)) {
    const cards = getCardsFromSelection(s);
    if (cards.length === 1) {
      const from = { ...s.selected };
      if (tryAutoFoundation(s, cards[0], from)) return;
    }
    clearSelection(s);
    s.message = '선택을 취소했어.';
    return;
  }

  if (!s.selected) {
    selectSource(s, loc);
    return;
  }

  // 목적지로 이동 시도
  if (loc.type === 'foundation' || loc.type === 'freecell' || loc.type === 'cascade') {
    // 빈 곳이나 다른 카드 위면 이동, 막힌 카드면 새로 선택
    if (loc.type === 'cascade' && loc.blocked) {
      selectSource(s, loc);
      return;
    }
    if (loc.type === 'cascade' && s.cascades[loc.i].length && loc.cardIndex < s.cascades[loc.i].length - 1) {
      // 중간 카드면 새 선택
      selectSource(s, loc);
      return;
    }
    if (loc.type === 'freecell' && s.freecells[loc.i] && !(s.selected.type === 'freecell' && s.selected.i === loc.i)) {
      // 차 있는 프리셀이면 그 카드로 선택 변경
      selectSource(s, loc);
      return;
    }
    applyMove(s, { type: loc.type, i: loc.i });
  }
}

function tickEffects(s, dt) {
  for (const f of s.flights) f.t += dt;
  s.flights = s.flights.filter(f => f.t < f.delay + f.dur);
  if (s.notice && (s.notice.t -= dt) <= 0) s.notice = null;
  if (s.shake && (s.shake.t -= dt) <= 0) s.shake = null;
}

export function updateGame(s, dt, input) {
  s.clock += dt;
  tickEffects(s, dt);
  if (s.result) return;

  const tap = input.pointer.pressed ? { x: input.pointer.x, y: input.pointer.y } : null;
  const keys = input.pressed;

  if (keys.has('z') || keys.has('backspace')) undo(s);
  if (keys.has('h')) {
    const fake = { x: BUTTONS.hint.x + 1, y: BUTTONS.hint.y + 1 };
    handleTap(s, fake);
  }
  if (keys.has('n')) deal(s);
  if (keys.has('enter') || keys.has(' ')) {
    const cards = getCardsFromSelection(s);
    if (cards.length === 1 && s.selected) tryAutoFoundation(s, cards[0], s.selected);
  }

  if (tap) handleTap(s, tap);
}
