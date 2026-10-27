import { visual } from "../config/visual.js";

export function pixelFont(ctx, size, weight = 700) {
    ctx.font = `${weight} ${size}px ${visual.font}`;
    ctx.textBaseline = "alphabetic";
}

export function pixelText(ctx, text, x, y, size, color, align = "left", baseline = "alphabetic") {
    ctx.save();
    pixelFont(ctx, size);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillStyle = visual.uiShadow;
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

export function pixelBox(ctx, x, y, w, h, fill = visual.uiPanel, border = visual.uiInk, depth = 4) {
    ctx.save();
    ctx.fillStyle = visual.uiShadow;
    ctx.fillRect(x + depth, y + depth, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, 4);
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.fillRect(x, y, 4, h);
    ctx.fillRect(x + w - 4, y, 4, h);
    ctx.fillStyle = visual.uiEdge;
    ctx.fillRect(x + 4, y + 4, w - 8, 2);
    ctx.fillRect(x + 4, y + 4, 2, h - 8);
    ctx.restore();
}

export function pixelBar(ctx, x, y, w, h, ratio, fill, track = visual.uiShadow) {
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = track;
    ctx.fillRect(x, y, w, h);
    if (clamped > 0) {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, Math.max(4, Math.round(w * clamped)), h);
    }
    ctx.strokeStyle = visual.uiInk;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export function pixelButton(ctx, x, y, w, h, label, active, accent = visual.uiAccent) {
    pixelBox(ctx, x, y, w, h, active ? accent : visual.uiPanel, active ? visual.uiInk : visual.uiEdge, active ? 2 : 4);
    pixelText(ctx, label, x + w / 2, y + h / 2 + 5, 16, active ? visual.uiInkDark : visual.uiInk, "center", "middle");
}

export function scanStripes(ctx, w, h, alpha = 0.06) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#000";
    for (let y = 0; y < h; y += 4)
        ctx.fillRect(0, y, w, 2);
    ctx.restore();
}
