const DEFAULT_INTERVAL = 8000;
const POLL_MS = 3000;

const board = document.getElementById("board");
const pageLabel = document.getElementById("page-label");
const progressBar = document.getElementById("progress-bar");
const dots = document.getElementById("dots");

let games = [];
let intervalMs = DEFAULT_INTERVAL;
let page = 0;
let turnTimer = 0;
let focused = false;
const statusEl = document.getElementById("board-status");

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

function pageCount(perPage) {
  if (!games.length) return 1;
  return Math.max(1, Math.ceil(games.length / perPage));
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
  const pages = pageCount(perPage);
  if (page >= pages) page = 0;
  board.style.setProperty("--cols", String(cols));
  board.style.setProperty("--rows", String(rows));
  board.replaceChildren();

  if (!games.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "아직 올라온 게임이 없어요.";
    board.appendChild(empty);
    pageLabel.textContent = "1 / 1";
    dots.replaceChildren();
    setProgress(false);
    return;
  }

  const start = page * perPage;
  games.slice(start, start + perPage).forEach((game, index) => {
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
  for (let index = 0; index < pages; index += 1) {
    const dot = document.createElement("span");
    dot.className = index === page ? "dot on" : "dot";
    dots.appendChild(dot);
  }
  setProgress(pages > 1);
}

function schedule() {
  clearTimeout(turnTimer);
  const pages = pageCount(layout().perPage);
  if (pages <= 1) return;
  turnTimer = setTimeout(() => {
    const nextPages = pageCount(layout().perPage);
    page = (page + 1) % nextPages;
    render();
    schedule();
  }, intervalMs);
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
    if (!focused) { const target = new URLSearchParams(location.search).get("focus"); const index = games.findIndex(game => game.href === target); if (index >= 0) { page = Math.floor(index / layout().perPage); render(); schedule(); } focused = true; }
    if (statusEl) statusEl.textContent = "";
  } catch { if (statusEl) statusEl.textContent = "목록 연결을 다시 확인하고 있어요. 마지막으로 받은 게임을 보여 드립니다."; }
  finally { clearTimeout(timeout); setTimeout(loadGames, POLL_MS); }
}

new ResizeObserver(() => {
  render();
  schedule();
}).observe(board);

loadGames();

