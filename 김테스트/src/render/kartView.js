import { drawFitted } from "../assets/library.js";
import { visual } from "../config/visual.js";
import { mixHex } from "../math.js";
const REAR_X = -14;
const FRONT_X = 14;
const AXLE = 16;
export function drawKart(ctx, kart, assets, time) {
    ctx.save();
    ctx.translate(kart.x + 6, kart.y + 8);
    ctx.rotate(kart.heading);
    ctx.scale(1.22, 0.52);
    ctx.fillStyle = `rgba(18, 32, 18, ${0.3 * (1 - kart.hop * 0.45)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(kart.x, kart.y - kart.hop * 18);
    ctx.rotate(kart.heading);
    ctx.scale(1.2 + kart.hop * 0.04, 1.2 - kart.hop * 0.1);
    if (kart.boostTime > 0)
        drawFlame(ctx, kart, time);
    if (assets.kart && visual.kartImageIncludesRig) {
        drawFitted(ctx, assets.kart, 0, 0, visual.kartLength * visual.kartImageScale, visual.kartWidth * visual.kartImageScale, 0);
    }
    else {
        const steer = kart.steerSmoothed * 0.55;
        drawWheel(ctx, REAR_X, -AXLE, -steer * 0.2, kart.wheelSpin, assets);
        drawWheel(ctx, REAR_X, AXLE, -steer * 0.2, kart.wheelSpin, assets);
        drawWheel(ctx, FRONT_X, -AXLE, steer, kart.wheelSpin, assets);
        drawWheel(ctx, FRONT_X, AXLE, steer, kart.wheelSpin, assets);
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
    ctx.fillStyle = "#15181e";
    ctx.beginPath();
    ctx.roundRect(-7, -4.2, 14, 8.4, 2.4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    const tread = (spin * 8) % 4;
    ctx.fillRect(-6, -4.2 + tread, 12, 1.3);
    ctx.fillStyle = "#f2c14a";
    ctx.beginPath();
    ctx.roundRect(-3.4, -2.4, 6.8, 4.8, 1.4);
    ctx.fill();
    ctx.fillStyle = "#fff6d4";
    ctx.beginPath();
    ctx.arc(0, 0, 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawBody(ctx, kart) {
    ctx.fillStyle = "#101828";
    ctx.beginPath();
    ctx.roundRect(-24, -16.5, 46, 33, 8);
    ctx.fill();
    const paint = ctx.createLinearGradient(-18, -16, 24, 16);
    paint.addColorStop(0, mixHex(visual.kartColor, "#ffffff", 0.55));
    paint.addColorStop(0.48, visual.kartColor);
    paint.addColorStop(1, visual.kartColorDark);
    ctx.fillStyle = paint;
    ctx.beginPath();
    ctx.roundRect(-18, -15, 32, 30, 9);
    ctx.fill();
    ctx.fillStyle = "#f7f9fc";
    ctx.fillRect(-14, -15, 16, 4.4);
    ctx.fillRect(-14, 10.6, 16, 4.4);
    ctx.fillStyle = visual.kartColor;
    ctx.fillRect(-14, -11.8, 16, 2.3);
    ctx.fillRect(-14, 9.5, 16, 2.3);
    ctx.fillStyle = paint;
    ctx.beginPath();
    ctx.moveTo(14, -11);
    ctx.quadraticCurveTo(32, -9, 34, 0);
    ctx.quadraticCurveTo(32, 9, 14, 11);
    ctx.closePath();
    ctx.fill();
    drawNumberPlate(ctx);
    drawDriver(ctx);
    drawGloves(ctx);
    ctx.shadowColor = kart.boostTime > 0 ? "rgba(255, 220, 140, 0.95)" : "transparent";
    ctx.shadowBlur = kart.boostTime > 0 ? 12 : 0;
    ctx.fillStyle = kart.boostTime > 0 ? "#fff4c8" : "#ffe7a3";
    ctx.beginPath();
    ctx.arc(29, -4.6, 1.8, 0, Math.PI * 2);
    ctx.arc(29, 4.6, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}
function drawNumberPlate(ctx) {
    ctx.fillStyle = "#f5f7fb";
    ctx.beginPath();
    ctx.roundRect(16, -8, 13.5, 16, 3);
    ctx.fill();
    ctx.fillStyle = visual.kartColor;
    ctx.fillRect(16, -8, 13.5, 3);
    ctx.fillRect(16, 5, 13.5, 3);
    ctx.strokeStyle = visual.kartColorDark;
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.arc(22.6, 0, 4.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = visual.kartColorDark;
    ctx.beginPath();
    ctx.roundRect(19.6, -1.25, 6.4, 2.5, 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(24.8, -1.25);
    ctx.lineTo(25.6, -3.5);
    ctx.lineTo(22.2, -1.25);
    ctx.closePath();
    ctx.fill();
}
function drawDriver(ctx) {
    const hx = -5;
    const helm = ctx.createRadialGradient(hx - 5, -5, 2, hx, 0, 16);
    helm.addColorStop(0, "#e7f7ff");
    helm.addColorStop(0.22, "#7ec8ff");
    helm.addColorStop(0.62, "#1f86f3");
    helm.addColorStop(1, "#0d4eab");
    ctx.fillStyle = helm;
    ctx.beginPath();
    ctx.arc(hx, 0, 14.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.ellipse(hx - 5.2, -5.4, 3.5, 2.15, -0.7, 0, Math.PI * 2);
    ctx.fill();
    const fx = hx + 3.4;
    ctx.fillStyle = "#ffd3b8";
    ctx.beginPath();
    ctx.ellipse(fx, 0, 8.5, 7.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1b1b";
    drawBrow(ctx, fx + 2.6, -3.2, -0.22);
    drawBrow(ctx, fx + 2.6, 3.2, 0.22);
    ctx.fillStyle = "#241c18";
    ctx.beginPath();
    ctx.ellipse(fx + 0.5, -2.75, 2.45, 1.28, 0, 0, Math.PI * 2);
    ctx.ellipse(fx + 0.5, 2.75, 2.45, 1.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8ee";
    ctx.beginPath();
    ctx.arc(fx + 1.45, -3.2, 0.58, 0, Math.PI * 2);
    ctx.arc(fx + 1.45, 2.25, 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff87a2";
    ctx.beginPath();
    ctx.arc(fx - 1.3, -5.35, 1.9, 0, Math.PI * 2);
    ctx.arc(fx - 1.3, 5.35, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d46b68";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(fx - 0.3, -1.8);
    ctx.quadraticCurveTo(fx - 2.4, 0, fx - 0.3, 1.8);
    ctx.stroke();
}
function drawBrow(ctx, x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.55, 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawGloves(ctx) {
    ctx.strokeStyle = "#243044";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(11, 0, 4.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f7f8fb";
    ctx.strokeStyle = "#d5deea";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(11, -3.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(11, 3.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(-1, 17.5);
    ctx.fillStyle = "#f7f8fb";
    ctx.beginPath();
    ctx.roundRect(-3.3, -2.2, 6.6, 7.4, 2.4);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(1.1, -5.6, 3.2, 4.8, 1.6);
    ctx.fill();
    ctx.restore();
}
