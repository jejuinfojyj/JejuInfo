import { visual } from "../config/visual.js";
import { handling } from "../config/handling.js";
import { rules } from "../config/rules.js";
import { formatRaceTime } from "../math.js";
import { drawDriveRow } from "./changeBoard.js";
import { pixelBar, pixelBox, pixelButton, pixelFont, pixelText, scanStripes } from "./pixelUi.js";
export function drawVignette(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.68);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${visual.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}
export function drawSpeedLines(ctx, w, h, intensity, time) {
    if (intensity < 0.04)
        return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(255,255,255,${0.14 * intensity})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
        const y = ((i + 0.5) / 8) * h;
        const fromLeft = i % 2 === 0;
        const len = (70 + ((i * 53 + time * 80) % 140)) * intensity;
        const x = fromLeft ? 18 : w - 18;
        const dir = fromLeft ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dir * len, y);
        ctx.stroke();
    }
    ctx.restore();
}
export function drawHud(ctx, state, track, kart, w, h) {
    if (state.paused || state.guide) {
        drawGuide(ctx, state, w, h);
        return;
    }
    if (state.mode !== "title") {
        drawStatus(ctx, state);
        drawMinimap(ctx, track, kart, state, w);
    }
    if (state.mode === "race" || state.mode === "countdown")
        drawGauge(ctx, state, w, h);
    if (state.hintAlpha > 0 && state.mode !== "finish")
        drawHint(ctx, state.hintAlpha, h);
    if (state.mode === "countdown")
        drawCountdown(ctx, state, w, h);
    if (state.goTime > 0)
        drawGo(ctx, state.goTime, w, h);
    if (state.splitLife > 0 && state.splitTime != null && state.goTime <= 0 && state.mode === "race") {
        drawSplit(ctx, state, w, h);
    }
    if (state.wrongWay && state.mode === "race")
        drawBanner(ctx, "WRONG WAY!", visual.uiHot, w, 118);
    if (state.muteToast > 0)
        drawBanner(ctx, state.muted ? "MUTE ON" : "MUTE OFF", visual.uiCool, w, 64);
    if (state.mode === "title")
        drawTitle(ctx, w, h);
    if (state.mode === "finish")
        drawFinish(ctx, state, w, h);
    if (state.debugLines)
        drawDebug(ctx, state.debugLines, h);
}
function drawStatus(ctx, state) {
    const tall = state.best != null;
    pixelBox(ctx, 16, 16, 236, tall ? 128 : 104);
    pixelText(ctx, "LAP", 32, 44, 12, visual.uiEdge, "left", "alphabetic");
    pixelText(ctx, `${state.lap}/${rules.laps}`, 32, 78, 28, visual.uiInk, "left", "alphabetic");
    const running = state.mode === "finish" ? state.total : state.lapTime;
    pixelText(ctx, formatRaceTime(state.mode === "countdown" ? 0 : running), 32, 104, 16, visual.uiAccent, "left", "alphabetic");
    if (state.best != null)
        pixelText(ctx, `BEST ${formatRaceTime(state.best)}`, 32, 128, 12, visual.uiGood, "left", "alphabetic");
}
function drawGauge(ctx, state, w, h) {
    const width = 292;
    const x = (w - width) / 2;
    const y = h - 122;
    pixelBox(ctx, x - 14, y - 62, width + 28, 128);
    const kmh = Math.round(state.speed * visual.speedToKmh);
    pixelText(ctx, String(kmh), w / 2, y - 10, 36, visual.uiInk, "center", "alphabetic");
    pixelText(ctx, "KM/H", w / 2, y + 14, 11, visual.uiEdge, "center", "alphabetic");
    const cap = handling.maxSpeed + handling.boostAdd;
    pixelBar(ctx, x, y + 26, width, 8, state.speed / cap, state.boosting ? visual.uiAccent : visual.uiCool);
    const maxCharge = handling.driftSegmentTimes[handling.driftSegmentTimes.length - 1] ?? 1;
    const fill = state.drifting ? state.driftCharge / maxCharge : state.boosting ? state.boostRatio : 0;
    const gaugeColor = state.boosting
        ? visual.uiAccent
        : state.driftSegments >= 3
            ? visual.uiHot
            : state.driftSegments === 2
                ? "#ff8a3d"
                : state.driftSegments === 1
                    ? "#ffe56a"
                    : visual.uiCool;
    pixelBar(ctx, x, y + 42, width, 16, fill, gaugeColor);
    ctx.fillStyle = visual.uiInk;
    for (const mark of handling.driftSegmentTimes) {
        const tx = x + (mark / maxCharge) * width;
        ctx.fillRect(tx, y + 40, 2, 20);
    }
    const label = state.boosting
        ? "BOOST!"
        : state.drifting
            ? state.driftSegments > 0
                ? `DRIFT LV${state.driftSegments}`
                : "DRIFT"
            : "[SPACE] DRIFT";
    pixelText(ctx, label, w / 2, y + 78, 12, state.boosting ? visual.uiAccent : visual.uiInk, "center", "alphabetic");
}
function drawHint(ctx, alpha, h) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    pixelText(ctx, "↑ GO   ←→ TURN   SPACE DRIFT   ESC PAUSE   R RESTART", 20, h - 18, 11, visual.uiInk, "left", "alphabetic");
    ctx.restore();
}
function drawCountdown(ctx, state, w, h) {
    const value = state.countdown > 2 ? 3 : state.countdown > 1 ? 2 : 1;
    const frac = state.countdown > 2 ? state.countdown - 2 : state.countdown > 1 ? state.countdown - 1 : state.countdown;
    drawLights(ctx, value, false, w);
    ctx.save();
    ctx.translate(w / 2, h / 2 - 10);
    ctx.scale(1 + frac * 0.12, 1 + frac * 0.12);
    pixelText(ctx, String(value), 0, 8, 96, visual.uiInk, "center", "middle");
    ctx.restore();
}
function drawGo(ctx, life, w, h) {
    drawLights(ctx, 3, true, w);
    ctx.save();
    ctx.globalAlpha = Math.min(1, life * 2);
    ctx.translate(w / 2, h / 2 - 10);
    const pop = 0.86 + (1 - Math.min(1, life / 0.8)) * 0.2;
    ctx.scale(pop, pop);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    pixelText(ctx, "GO!", 0, 6, 72, visual.uiGood, "center", "middle");
    ctx.restore();
}
function drawLights(ctx, lit, go, w) {
    const y = 28;
    for (let i = 0; i < 3; i += 1) {
        const on = go || i < lit;
        const x = w / 2 + (i - 1) * 32 - 10;
        pixelBox(ctx, x, y, 20, 20, on ? (go ? visual.uiGood : visual.uiHot) : visual.uiShadow, visual.uiInk, 2);
    }
}
function drawSplit(ctx, state, w, h) {
    if (state.splitTime == null)
        return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.splitLife * 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    pixelText(ctx, formatRaceTime(state.splitTime), w / 2, h / 2, 32, visual.uiAccent, "center", "middle");
    ctx.restore();
}
function drawBanner(ctx, text, color, w, y) {
    ctx.save();
    const width = Math.max(140, text.length * 14 + 40);
    pixelBox(ctx, (w - width) / 2, y - 22, width, 40, visual.uiPanel, color, 3);
    pixelText(ctx, text, w / 2, y + 2, 16, color, "center", "middle");
    ctx.restore();
}
function drawGuide(ctx, state, w, h) {
    const block = state.paused ? 300 : 220;
    const scale = Math.min(1, (w - 24) / 760, (h - 24) / (block + 24));
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 30, 0.82)";
    ctx.fillRect(0, 0, w, h);
    scanStripes(ctx, w, h, 0.05);
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    pixelText(ctx, state.paused ? "PAUSE" : "HOW TO PLAY", 0, -block / 2 + 18, 12, visual.uiAccent, "center", "alphabetic");
    pixelText(ctx, state.paused ? "STOPPED" : "RACE TIPS", 0, -block / 2 + 52, 28, visual.uiInk, "center", "alphabetic");
    let y = -block / 2 + 88;
    if (state.paused) {
        pixelButton(ctx, -236, y, 220, 56, "RESUME", state.pauseIndex === 0);
        pixelButton(ctx, 16, y, 220, 56, "LOBBY", state.pauseIndex === 1);
        y += 72;
    }
    drawDriveRow(ctx, 0, y);
    pixelText(ctx, state.paused ? "↑↓ PICK   ENTER OK   ESC BACK" : "ESC OR ENTER CLOSE", 0, block / 2 - 8, 11, visual.uiEdge, "center", "alphabetic");
    ctx.restore();
}
function drawTitle(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 30, 0.55)";
    ctx.fillRect(0, 0, w, 220);
    scanStripes(ctx, w, 220, 0.04);
    const title = window.GAME_CONFIG?.title || "오벌 드리프트";
    let titleSize = 34;
    pixelFont(ctx, titleSize);
    while (titleSize > 18 && ctx.measureText(title.toUpperCase()).width > w - 48) {
        titleSize -= 2;
        pixelFont(ctx, titleSize);
    }
    pixelBox(ctx, Math.max(12, w / 2 - 220), 12, Math.min(w - 24, 440), 56, visual.uiBg, visual.uiAccent, 4);
    pixelText(ctx, title.toUpperCase(), w / 2, 48, titleSize, visual.uiAccent, "center", "middle");
    pixelText(ctx, "↑ GO   ←→ STEER   SPACE DRIFT", w / 2, 88, 12, visual.uiInk, "center", "alphabetic");
    drawLapPicker(ctx, w / 2, 118);
    const blink = 0.55 + Math.sin(performance.now() / 180) * 0.45;
    ctx.globalAlpha = blink;
    pixelButton(ctx, w / 2 - 132, 144, 264, 44, "PRESS ENTER", true, visual.uiGood);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 8; i += 1) {
        const sx = 24 + i * ((w - 48) / 7);
        ctx.fillStyle = i % 2 === 0 ? visual.uiHot : visual.uiAccent;
        ctx.fillRect(sx, h - 18, 8, 8);
    }
    ctx.restore();
}
function drawLapPicker(ctx, x, y) {
    pixelBox(ctx, x - 136, y - 18, 272, 36, visual.uiPanel, visual.uiInk, 3);
    pixelText(ctx, `◀  ${rules.laps} LAPS  ▶`, x, y + 4, 16, visual.uiAccent, "center", "middle");
}
function drawFinish(ctx, state, w, h) {
    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 30, 0.5)";
    ctx.fillRect(0, 0, w, h);
    scanStripes(ctx, w, h, 0.04);
    const rows = Math.max(1, state.lapTimes.length);
    const rowH = rows > 6 ? 20 : 24;
    const panelH = 220 + rows * rowH;
    const scale = Math.min(1, (w - 24) / 760, (h - 24) / (panelH + 36));
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    pixelBox(ctx, -220, -panelH / 2, 440, panelH, visual.uiPanel, visual.uiGood, 6);
    const top = -panelH / 2;
    pixelText(ctx, "FINISH!!", 0, top + 36, 14, visual.uiGood, "center", "alphabetic");
    pixelText(ctx, "CLEAR", 0, top + 84, 34, visual.uiInk, "center", "alphabetic");
    pixelText(ctx, formatRaceTime(state.total), 0, top + 124, 20, visual.uiAccent, "center", "alphabetic");
    state.lapTimes.forEach((time, index) => {
        pixelText(ctx, `LAP ${index + 1}  ${formatRaceTime(time)}`, 0, top + 162 + index * rowH, 14, visual.uiInk, "center", "alphabetic");
    });
    pixelText(ctx, "ENTER = RACE AGAIN", 0, top + panelH - 28, 12, visual.uiEdge, "center", "alphabetic");
    ctx.restore();
}
function drawMinimap(ctx, track, kart, state, w) {
    const boxW = 220;
    const boxH = 140;
    const x = w - boxW - 20;
    const y = 20;
    const minX = track.extent.minX;
    const maxX = track.extent.maxX;
    const minY = track.extent.minY;
    const maxY = track.extent.maxY;
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const innerW = boxW - 28;
    const innerH = boxH - 28;
    const scale = Math.min(innerW / worldW, innerH / worldH);
    const ox = x + (boxW - worldW * scale) / 2;
    const oy = y + (boxH - worldH * scale) / 2;
    const mx = (px) => ox + (px - minX) * scale;
    const my = (py) => oy + (py - minY) * scale;
    ctx.save();
    pixelBox(ctx, x, y, boxW, boxH, visual.uiBg, visual.uiInk, 4);
    ctx.beginPath();
    ctx.rect(x + 8, y + 8, boxW - 16, boxH - 16);
    ctx.clip();
    ctx.fillStyle = "#1c5530";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(7, track.halfWidth * 2 * scale);
    ctx.strokeStyle = "#687284";
    strokeSamples(ctx, track, mx, my);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    strokeSamples(ctx, track, mx, my);
    const current = track.checkpoints[state.gateIndex];
    if (current && (state.mode === "race" || state.mode === "countdown")) {
        ctx.strokeStyle = visual.kartAccent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx(current.ax), my(current.ay));
        ctx.lineTo(mx(current.bx), my(current.by));
        ctx.stroke();
    }
    const kx = mx(kart.x);
    const ky = my(kart.y);
    ctx.fillStyle = visual.uiInk;
    ctx.fillRect(kx - 3, ky - 3, 6, 6);
    ctx.fillStyle = visual.uiHot;
    ctx.fillRect(kx - 2, ky - 2, 4, 4);
    ctx.restore();
}
function strokeSamples(ctx, track, mx, my) {
    ctx.beginPath();
    track.samples.forEach((sample, index) => {
        const x = mx(sample.x);
        const y = my(sample.y);
        if (index === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
}
function drawDebug(ctx, lines, h) {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(8,10,14,0.7)";
    ctx.fillRect(16, h - 28 - lines.length * 16, 280, lines.length * 16 + 12);
    ctx.fillStyle = "#d7ffe4";
    lines.forEach((line, index) => {
        pixelText(ctx, line, 24, h - 16 - (lines.length - 1 - index) * 16, 11, "#d7ffe4", "left", "alphabetic");
    });
    ctx.restore();
}
