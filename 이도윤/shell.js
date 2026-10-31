const title = window.GAME_CONFIG?.title || "오벌 드리프트";
document.querySelectorAll("[data-game-title]").forEach((node) => {
  node.textContent = title;
});
const canvas = document.querySelector("#game");
if (canvas) canvas.setAttribute("aria-label", title);

const held = new Map();

function keyName(code) {
  if (code === "Space") return " ";
  if (code === "KeyR") return "r";
  if (code === "KeyL") return "l";
  return code;
}

function dispatchKey(code, down) {
  window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", {
    code,
    key: keyName(code),
    bubbles: true,
    cancelable: true,
    repeat: false,
  }));
}

function hold(code, down) {
  const count = held.get(code) || 0;
  if (down) {
    held.set(code, count + 1);
    if (count === 0) dispatchKey(code, true);
    return;
  }
  if (count <= 1) {
    held.delete(code);
    dispatchKey(code, false);
    return;
  }
  held.set(code, count - 1);
}

function releaseAll() {
  for (const code of [...held.keys()]) {
    held.delete(code);
    dispatchKey(code, false);
  }
  document.querySelectorAll("[data-hold][aria-pressed='true']").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
}

function tap(code) {
  dispatchKey(code, true);
  dispatchKey(code, false);
}

document.querySelectorAll("[data-tap]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    const code = button.dataset.tap;
    const game = window.__game;
    if (code === "KeyL") {
      if (!game || game.mode === "title") return;
      if (!game.paused) tap("Escape");
      requestAnimationFrame(() => tap("KeyL"));
      return;
    }
    if (code === "KeyR" && game?.paused) {
      tap("Escape");
      requestAnimationFrame(() => tap("KeyR"));
      return;
    }
    tap(code);
  });
});

document.querySelectorAll("[data-hold]").forEach((button) => {
  const code = button.dataset.hold;
  const pointers = new Set();
  const sync = () => button.setAttribute("aria-pressed", pointers.size > 0 ? "true" : "false");
  const press = (event) => {
    if (pointers.has(event.pointerId)) return;
    pointers.add(event.pointerId);
    if (pointers.size === 1) hold(code, true);
    sync();
  };
  const release = (event) => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size === 0) hold(code, false);
    sync();
  };
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    try { button.setPointerCapture(event.pointerId); } catch { /* 캡처를 못 해도 누르고 있는 동안은 유지한다 */ }
    press(event);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

document.querySelectorAll("button").forEach((button) => {
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

window.addEventListener("blur", releaseAll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseAll();
});

function refit() {
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}
if (document.readyState === "complete") refit();
else window.addEventListener("load", refit);
