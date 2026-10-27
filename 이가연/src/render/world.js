import { drawFitted } from "../assets/library.js";
import { visual } from "../config/visual.js";
import { mixHex } from "../math.js";
export function drawWorld(ctx, world) {
    const { track, assets, view } = world;
    const scenery = !assets.background || visual.sceneryOverBackground;
    ctx.fillStyle = visual.grassA;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.fillStyle = world.textures.grass;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    if (assets.background)
        drawCover(ctx, assets.background, track);
    if (scenery) {
        for (const blob of world.scenery.blobs) {
            ctx.fillStyle = blob.color;
            ctx.beginPath();
            ctx.ellipse(blob.x, blob.y, blob.rx, blob.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    drawRoad(ctx, track, world.textures);
    for (const tile of track.startTiles) {
        ctx.save();
        ctx.translate(tile.x, tile.y);
        ctx.rotate(tile.heading);
        ctx.fillStyle = tile.light ? "#f7f8fa" : "#1c212b";
        ctx.fillRect(-tile.w / 2, -tile.h / 2, tile.w, tile.h);
        ctx.restore();
    }
    if (scenery) {
        drawPond(ctx, track, world.time);
        drawGrandstand(ctx, track);
        for (const prop of world.scenery.props)
            drawProp(ctx, prop, assets);
    }
    if (world.gate)
        drawGate(ctx, world.gate, world.time);
}
function drawRoad(ctx, track, textures) {
    const width = track.halfWidth * 2;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(8, 16, 12, 0.45)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.lineWidth = width + 12;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.stroke(track.centerPath);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = width + 5;
    ctx.strokeStyle = "#1e2430";
    ctx.stroke(track.centerPath);
    ctx.lineWidth = width;
    ctx.strokeStyle = visual.asphaltDeep;
    ctx.stroke(track.centerPath);
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = width * 0.88;
    ctx.strokeStyle = visual.asphalt;
    ctx.stroke(track.centerPath);
    ctx.globalAlpha = 0.38;
    ctx.lineWidth = width;
    ctx.strokeStyle = textures.asphalt;
    ctx.stroke(track.centerPath);
    ctx.globalAlpha = 1;
    ctx.setLineDash([12, 16]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.stroke(track.centerPath);
    ctx.setLineDash([]);
    ctx.restore();
}
function drawCover(ctx, image, track) {
    const bounds = track.bounds;
    const scale = Math.max(bounds.w / image.naturalWidth, bounds.h / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.drawImage(image, bounds.minX + (bounds.w - w) / 2, bounds.minY + (bounds.h - h) / 2, w, h);
}
function strokeLine(ctx, path) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
    ctx.stroke(path);
    ctx.lineWidth = 4;
    ctx.strokeStyle = visual.line;
    ctx.stroke(path);
    ctx.restore();
}
function drawMarks(ctx, marks, color) {
    for (const mark of marks) {
        ctx.save();
        ctx.translate(mark.x, mark.y);
        ctx.rotate(mark.heading);
        ctx.fillStyle = color;
        ctx.fillRect(-mark.w / 2, -mark.h / 2, mark.w, mark.h);
        ctx.restore();
    }
}
function drawPond(ctx, track, time) {
    const x = -480;
    const y = 860;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 10, 196, 108, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(12, 40, 48, 0.28)";
    ctx.fill();
    const gradient = ctx.createRadialGradient(x - 46, y - 34, 16, x, y, 190);
    gradient.addColorStop(0, "#8fe0df");
    gradient.addColorStop(0.45, visual.pondShallow);
    gradient.addColorStop(1, visual.pondDeep);
    ctx.beginPath();
    ctx.ellipse(x, y, 210, 116, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 58 + Math.sin(time * 0.8) * 8, y - 30, 62, 22, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fill();
    ctx.restore();
}
function drawGrandstand(ctx, track) {
    const start = track.sample(0);
    const x = start.x + start.nx * (track.halfWidth + 96) - 180;
    const y = start.y + start.ny * (track.halfWidth + 96) + 18;
    const w = 360;
    const h = 86;
    ctx.save();
    ctx.fillStyle = "rgba(20, 30, 20, 0.22)";
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 10, w, h, 12);
    ctx.fill();
    ctx.fillStyle = "#243044";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    const seats = ["#f0c7a2", "#3d74b5", "#d24b45", "#f6f3ea", "#2a2e36", "#ef5d8d"];
    for (let row = 0; row < 3; row += 1) {
        for (let i = 0; i < 42; i += 1) {
            ctx.fillStyle = seats[(i + row * 2) % seats.length] ?? "#fff";
            ctx.fillRect(x + 18 + i * ((w - 36) / 42), y + 16 + row * 15, 8, 9);
        }
    }
    ctx.fillStyle = "#c7364f";
    ctx.beginPath();
    ctx.roundRect(x + 8, y + h - 24, w - 16, 16, 6);
    ctx.fill();
    ctx.fillStyle = "#f7f4ee";
    ctx.font = `700 15px ${visual.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OVAL CUP", x + w / 2, y + h - 16);
    ctx.restore();
}
function drawProp(ctx, prop, assets) {
    ctx.save();
    ctx.translate(prop.x, prop.y);
    const s = prop.scale;
    ctx.fillStyle = "rgba(24, 42, 24, 0.26)";
    ctx.beginPath();
    ctx.ellipse(5 * s, 8 * s, 16 * s, 7.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (prop.kind === "tree" && assets.tree) {
        drawFitted(ctx, assets.tree, 0, -10 * s, 52 * s, 64 * s, 0);
    }
    else if (prop.kind === "bush" && assets.bush) {
        drawFitted(ctx, assets.bush, 0, 0, 36 * s, 28 * s, 0);
    }
    else if (prop.kind === "tree") {
        ctx.fillStyle = "#6b4630";
        ctx.fillRect(-2.4 * s, -2 * s, 4.8 * s, 14 * s);
        if (prop.variant > 0.8) {
            ctx.fillStyle = mixHex("#1e6d3c", "#143c22", prop.variant);
            pine(ctx, 0, -28 * s, 13 * s);
            ctx.fillStyle = mixHex("#277a42", "#184628", 0.4);
            pine(ctx, 0, -16 * s, 16 * s);
        }
        else {
            ctx.fillStyle = mixHex("#2b8a44", "#176034", prop.variant);
            ctx.beginPath();
            ctx.arc(-6 * s, -14 * s, 11 * s, 0, Math.PI * 2);
            ctx.arc(7 * s, -12 * s, 10 * s, 0, Math.PI * 2);
            ctx.arc(0, -20 * s, 12 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.16)";
            ctx.beginPath();
            ctx.arc(-4 * s, -22 * s, 4.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    else if (prop.kind === "bush") {
        ctx.fillStyle = mixHex("#3c9a4e", "#1f6c34", prop.variant);
        ctx.beginPath();
        ctx.arc(-6 * s, 0, 8 * s, 0, Math.PI * 2);
        ctx.arc(5 * s, 1 * s, 7 * s, 0, Math.PI * 2);
        ctx.arc(0, -4 * s, 8 * s, 0, Math.PI * 2);
        ctx.fill();
    }
    else {
        ctx.rotate(prop.rotation);
        ctx.fillStyle = "#8b919d";
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = (8 + (i % 2) * 3.5) * s;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius * 0.72;
            if (i === 0)
                ctx.moveTo(px, py);
            else
                ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.beginPath();
        ctx.ellipse(-3 * s, -2 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}
function pine(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + r, y + r * 1.35);
    ctx.lineTo(x - r, y + r * 1.35);
    ctx.closePath();
    ctx.fill();
}
function drawFlags(ctx, track, time) {
    const post = track.sample(6);
    for (const [index, side] of [1, -1].entries()) {
        const lat = side * (track.halfWidth + 28);
        const x = post.x + post.nx * lat;
        const y = post.y + post.ny * lat;
        ctx.save();
        ctx.strokeStyle = "#e7edf4";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 42);
        ctx.stroke();
        const wave = Math.sin(time * 5.5 + index) * 5;
        for (let row = 0; row < 4; row += 1) {
            for (let col = 0; col < 5; col += 1) {
                ctx.fillStyle = (row + col) % 2 === 0 ? "#f5f7fa" : "#171b22";
                ctx.fillRect(x + 2 + col * 5, y - 42 + row * 5 + wave * (col / 5), 5, 5);
            }
        }
        ctx.restore();
    }
}
function drawGate(ctx, gate, time) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = `rgba(255, 228, 150, ${0.28 + Math.sin(time * 4) * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(gate.ax, gate.ay);
    ctx.lineTo(gate.bx, gate.by);
    ctx.stroke();
    ctx.restore();
}
