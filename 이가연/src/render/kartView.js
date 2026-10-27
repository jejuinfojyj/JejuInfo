import { drawFitted } from "../assets/library.js";
import { visual } from "../config/visual.js";
import { mixHex } from "../math.js";
const REAR_X = -16;
const FRONT_X = 18;
const AXLE = 18;
export function drawKart(ctx, kart, assets, time) {
    ctx.save();
    ctx.translate(kart.x + 6, kart.y + 8);
    ctx.rotate(kart.heading);
    ctx.scale(1.08, 0.46);
    ctx.fillStyle = `rgba(18, 32, 18, ${0.3 * (1 - kart.hop * 0.45)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(kart.x, kart.y - kart.hop * 18);
    ctx.rotate(kart.heading);
    ctx.scale(1 + kart.hop * 0.04, 1 - kart.hop * 0.1);
    if (kart.boostTime > 0)
        drawFlame(ctx, kart, time);
    if (assets.kart && visual.kartImageIncludesRig) {
        drawFitted(ctx, assets.kart, 0, 0, visual.kartLength * visual.kartImageScale, visual.kartWidth * visual.kartImageScale, 0);
    }
    else {
        const steer = kart.steerSmoothed * 0.55;
        const rig = rigFor(kart.style);
        drawWheel(ctx, rig.rear, -rig.axle, -steer * 0.2, kart.wheelSpin, assets);
        drawWheel(ctx, rig.rear, rig.axle, -steer * 0.2, kart.wheelSpin, assets);
        drawWheel(ctx, rig.front, -rig.axle, steer, kart.wheelSpin, assets);
        drawWheel(ctx, rig.front, rig.axle, steer, kart.wheelSpin, assets);
        if (assets.kart) {
            drawFitted(ctx, assets.kart, 2, 0, visual.kartLength * visual.kartImageScale, visual.kartWidth * 0.72 * visual.kartImageScale, 0);
        }
        else {
            drawBody(ctx, kart);
        }
    }
    if (assets.driver)
        drawFitted(ctx, assets.driver, -2, 0, 22, 22, 0);
    ctx.restore();
}
function drawFlame(ctx, kart, time) {
    const strength = kart.boostDuration > 0 ? Math.min(1, kart.boostTime / kart.boostDuration + 0.35) : 1;
    const len = (18 + Math.sin(time * 48) * 7) * strength;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255, 122, 28, 0.95)";
    ctx.beginPath();
    ctx.moveTo(-20, -7);
    ctx.lineTo(-22 - len, 0);
    ctx.lineTo(-20, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 236, 170, 0.9)";
    ctx.beginPath();
    ctx.moveTo(-20, -3.5);
    ctx.lineTo(-20 - len * 0.62, 0);
    ctx.lineTo(-20, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function drawWheel(ctx, x, y, angle, spin, assets) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (assets.wheel) {
        drawFitted(ctx, assets.wheel, 0, 0, 16, 10, 0);
        ctx.restore();
        return;
    }
    ctx.fillStyle = "#0d0d0d";
    ctx.beginPath();
    ctx.roundRect(-8.2, -5.2, 16.4, 10.4, 3);
    ctx.fill();
    ctx.strokeStyle = visual.wheelRim;
    ctx.lineWidth = 1.35;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    const tread = (spin * 8) % 4;
    ctx.fillRect(-6, -4.2 + tread, 12, 1.3);
    ctx.fillStyle = "#c8d0da";
    ctx.beginPath();
    ctx.roundRect(-3.4, -2.4, 6.8, 4.8, 1.2);
    ctx.fill();
    ctx.strokeStyle = visual.wheelRim;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}
function rigFor(style) {
    if (style === "speed")
        return { rear: -22, front: 26, axle: 14 };
    if (style === "drift")
        return { rear: -8, front: 12, axle: 20 };
    return { rear: REAR_X, front: FRONT_X, axle: AXLE };
}
function drawBody(ctx, kart) {
    if (kart.style === "speed") {
        drawSpeedBody(ctx, kart);
        return;
    }
    if (kart.style === "drift") {
        drawDriftBody(ctx, kart);
        return;
    }
    drawClassicBody(ctx, kart);
}
function drawSpeedBody(ctx, kart) {
    ctx.fillStyle = "#3a1218";
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-18, -12);
    ctx.lineTo(-18, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff4d4d";
    ctx.beginPath();
    ctx.moveTo(42, 0);
    ctx.lineTo(8, -7);
    ctx.lineTo(-16, -6);
    ctx.lineTo(-16, 6);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff4f4";
    ctx.beginPath();
    ctx.moveTo(36, 0);
    ctx.lineTo(10, -2.4);
    ctx.lineTo(10, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `800 7px ${visual.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("7", 4, 0.2);
    drawDriver(ctx, -6, 3.4);
    ctx.fillStyle = kart.boostTime > 0 ? "#fff4c8" : "#ffd0d0";
    ctx.beginPath();
    ctx.arc(38, -2.2, 1.1, 0, Math.PI * 2);
    ctx.arc(38, 2.2, 1.1, 0, Math.PI * 2);
    ctx.fill();
}
function drawDriftBody(ctx, kart) {
    ctx.fillStyle = "#145c34";
    ctx.beginPath();
    ctx.roundRect(-16, -8, 6, 16, 2);
    ctx.fill();
    ctx.fillStyle = "#ffb703";
    ctx.beginPath();
    ctx.ellipse(2, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7dffb2";
    ctx.beginPath();
    ctx.ellipse(-2, -10, 8, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(-2, 10, 8, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e4";
    ctx.beginPath();
    ctx.arc(12, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#145c34";
    ctx.font = `800 7px ${visual.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3", 12, 0.2);
    drawDriver(ctx, -2, 4.2);
    ctx.fillStyle = kart.boostTime > 0 ? "#fff4c8" : "#fff1c2";
    ctx.beginPath();
    ctx.arc(16, -3, 1.2, 0, Math.PI * 2);
    ctx.arc(16, 3, 1.2, 0, Math.PI * 2);
    ctx.fill();
}
function drawDriver(ctx, x, scale) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(scale / 4.2, scale / 4.2);
    ctx.fillStyle = "#1d5ed8";
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd2bf";
    ctx.beginPath();
    ctx.ellipse(0.4, 0.6, 2.4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a120f";
    ctx.beginPath();
    ctx.arc(-0.4, 0.4, 0.45, 0, Math.PI * 2);
    ctx.arc(0.8, 0.4, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawClassicBody(ctx, kart) {
    ctx.fillStyle = "#16325c";
    ctx.beginPath();
    ctx.roundRect(-28, -11, 10, 22, 3);
    ctx.fill();
    ctx.fillStyle = "#2f7dff";
    ctx.beginPath();
    ctx.roundRect(-18, -14, 28, 7.5, 3);
    ctx.roundRect(-18, 6.5, 28, 7.5, 3);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(34, 0);
    ctx.quadraticCurveTo(30, -9, 16, -9);
    ctx.lineTo(-6, -9);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-10, 5);
    ctx.lineTo(-6, 9);
    ctx.lineTo(16, 9);
    ctx.quadraticCurveTo(30, 9, 34, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c5d7f2";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#3d8ef0";
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(12, -5.2);
    ctx.lineTo(12, 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7ec0ff";
    ctx.fillRect(14, -1.3, 14, 2.6);
    ctx.fillStyle = "#e8f1ff";
    ctx.beginPath();
    ctx.arc(24, 0, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2f7dff";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(24, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#16325c";
    ctx.font = `800 8px ${visual.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(visual.kartNumber, 24, 0.3);
    ctx.fillStyle = "#1a2740";
    ctx.beginPath();
    ctx.ellipse(-2, 0, 6.2, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3b8dff";
    ctx.beginPath();
    ctx.ellipse(-2, -0.4, 4.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd2bf";
    ctx.beginPath();
    ctx.ellipse(-1.6, 0.6, 2.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a120f";
    ctx.beginPath();
    ctx.arc(-2.4, 0.4, 0.55, 0, Math.PI * 2);
    ctx.arc(-0.9, 0.4, 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = kart.boostTime > 0 ? "rgba(255, 220, 140, 0.95)" : "transparent";
    ctx.shadowBlur = kart.boostTime > 0 ? 10 : 0;
    ctx.fillStyle = kart.boostTime > 0 ? "#fff4c8" : "#dcecff";
    ctx.beginPath();
    ctx.arc(31, -3.2, 1.3, 0, Math.PI * 2);
    ctx.arc(31, 3.2, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}
