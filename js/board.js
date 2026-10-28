const DEFAULT_INTERVAL = 8000;
const POLL_MS = 3000;
const SWIPE_THRESHOLD = 48;

const board = document.getElementById("board");
const pageLabel = document.getElementById("page-label");
const progressBar = document.getElementById("progress-bar");
const dots = document.getElementById("dots");
const searchInput = document.getElementById("game-search");
const resultCount = document.getElementById("result-count");
const statusEl = document.getElementById("board-status");

let games = [];
let intervalMs = DEFAULT_INTERVAL;
let page = 0;
let turnTimer = 0;
let focused = false;
let searchTerm = "";
let pointerStart = null;
let suppressSwipeClick = false;

function layout() {
  const gap = parseFloat(getComputedStyle(board).gap) || 18;
  const minW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--min-card-w")) || 300;
  const minH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--min-card-h")) || 148;
  const width = Math.min(board.clientWidth, document.documentElement.clientWidth);
  const height = board.clientHeight;
  const cols = Math.max(1, Math.floor((width + gap) / (minW + gap)));
  const rows = Math.max(1, Math.floor((height + gap) / (minH + gap)));
  return { cols, rows, perPage: cols * rows };
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase("ko-KR");
}

function visibleGames() {
  const query = normalizeSearch(searchTerm).trim();
  if (!query) return games;
  return games.filter(game =>
    normalizeSearch(game.name).includes(query) ||
    normalizeSearch(game.title).includes(query)
  );
}

function pageCount(perPage, list = visibleGames()) {
  if (!list.length) return 1;
  return Math.max(1, Math.ceil(list.length / perPage));
}

function setProgress(running) {
  progressBar.style.transition = "none";
  progressBar.style.width = "0";
  if (!running) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressBar.style.transition = `width ${intervalMs}ms linear`;
      progressBar.style.width = "100%";
    });
  });
}

function render() {
  const { cols, rows, perPage } = layout();
  const list = visibleGames();
  const pages = pageCount(perPage, list);
  const focusedDotIndex = Array.from(dots.children).indexOf(document.activeElement);
  page = Math.max(0, Math.min(page, pages - 1));
  board.style.setProperty("--cols", String(cols));
  board.style.setProperty("--rows", String(rows));
  board.classList.toggle("can-page", pages > 1);
  board.replaceChildren();
  resultCount.textContent = searchTerm.trim()
    ? `${list.length}개 검색 결과`
    : `전체 ${games.length}개 게임`;

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = searchTerm.trim() ? "검색 결과가 없어요." : "아직 올라온 게임이 없어요.";
    board.appendChild(empty);
    pageLabel.textContent = "1 / 1";
    dots.replaceChildren();
    dots.hidden = true;
    if (focusedDotIndex >= 0) searchInput.focus({ preventScroll: true });
    setProgress(false);
    return;
  }

  const start = page * perPage;
  list.slice(start, start + perPage).forEach((game, index) => {
    const link = document.createElement("a");
    link.className = `card tone-${(start + index) % 6}`;
    link.href = game.href || "#";
    const who = document.createElement("span");
    who.className = "who";
    const fullName = String(game.name || "").trim();
    who.textContent = `${fullName}님의 게임!`;
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = game.title || "";
    link.append(who, title);
    board.appendChild(link);
  });

  pageLabel.textContent = `${page + 1} / ${pages}`;
  dots.replaceChildren();
  dots.hidden = pages <= 1;
  for (let index = 0; index < pages; index += 1) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = index === page ? "dot on" : "dot";
    dot.setAttribute("aria-label", `${index + 1}페이지 보기`);
    if (index === page) dot.setAttribute("aria-current", "page");
    dot.addEventListener("click", () => goToPage(index));
    dots.appendChild(dot);
  }
  if (focusedDotIndex >= 0) {
    if (pages > 1) dots.children[Math.min(focusedDotIndex, pages - 1)].focus({ preventScroll: true });
    else searchInput.focus({ preventScroll: true });
  }
  setProgress(!searchTerm.trim() && pages > 1);
}

function schedule() {
  clearTimeout(turnTimer);
  const pages = pageCount(layout().perPage);
  if (pages <= 1 || searchTerm.trim()) return;
  turnTimer = setTimeout(() => {
    const nextPages = pageCount(layout().perPage);
    if (nextPages <= 1 || searchTerm.trim()) {
      render();
      return;
    }
    page = (page + 1) % nextPages;
    render();
    schedule();
  }, intervalMs);
}

function goToPage(nextPage) {
  const pages = pageCount(layout().perPage);
  if (pages <= 1) return;
  page = (nextPage + pages) % pages;
  render();
  schedule();
}

function applyGames(next, nextInterval) {
  const same = nextInterval === intervalMs && JSON.stringify(next) === JSON.stringify(games);
  if (same) return;
  games = next;
  intervalMs = nextInterval;
  if (page >= pageCount(layout().perPage)) page = 0;
  render();
  schedule();
}

async function loadGames() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("/games.json?t=" + Date.now(), { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error("목록 응답 오류");
    const data = await response.json();
    if (!Array.isArray(data.games) || data.games.some(game => typeof game.name !== "string" || typeof game.title !== "string" || typeof game.href !== "string" || !/^\/(?!\/)[^?#]+\/$/.test(game.href))) throw new Error("목록 형식 오류");
    const interval = Math.max(3000, Math.min(30000, Number(data.intervalMs) || DEFAULT_INTERVAL));
    applyGames(data.games, interval);
    if (!focused) {
      const target = new URLSearchParams(location.search).get("focus");
      const index = visibleGames().findIndex(game => game.href === target);
      if (index >= 0) {
        page = Math.floor(index / layout().perPage);
        render();
        schedule();
      }
      focused = true;
    }
    if (statusEl) statusEl.textContent = "";
  } catch {
    if (statusEl) statusEl.textContent = "목록 연결을 다시 확인하고 있어요. 마지막으로 받은 게임을 보여 드립니다.";
  } finally {
    clearTimeout(timeout);
    setTimeout(loadGames, POLL_MS);
  }
}

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value;
  page = 0;
  render();
  schedule();
});

board.addEventListener("pointerdown", event => {
  if (event.pointerType !== "touch" && event.button !== 0) return;
  pointerStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  suppressSwipeClick = false;
  board.classList.remove("is-dragging");
});

board.addEventListener("pointermove", event => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
    board.classList.add("is-dragging");
  }
});

window.addEventListener("pointerup", event => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  pointerStart = null;
  board.classList.remove("is-dragging");
  if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;
  if (pageCount(layout().perPage) <= 1) return;
  suppressSwipeClick = true;
  setTimeout(() => { suppressSwipeClick = false; }, 500);
  goToPage(page + (deltaX < 0 ? 1 : -1));
});

window.addEventListener("pointercancel", () => {
  pointerStart = null;
  board.classList.remove("is-dragging");
});

window.addEventListener("pointerdown", () => {
  suppressSwipeClick = false;
}, true);

window.addEventListener("click", event => {
  if (!suppressSwipeClick || event.detail === 0) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  suppressSwipeClick = false;
}, true);

new ResizeObserver(() => {
  render();
  schedule();
}).observe(board);

loadGames();
