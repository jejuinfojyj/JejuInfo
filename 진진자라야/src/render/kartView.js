import { drawFitted } from "../assets/library.js";
import { visual } from "../config/visual.js";
const REAR_X = -6;
const FRONT_X = 22;
const AXLE = 17;
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
    ctx.moveTo(-32, -6);
    ctx.lineTo(-34 - len, 0);
    ctx.lineTo(-32, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 236, 170, 0.9)";
    ctx.beginPath();
    ctx.moveTo(-32, -3);
    ctx.lineTo(-32 - len * 0.62, 0);
    ctx.lineTo(-32, 3);
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
    ctx.strokeStyle = "#c5ced6";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -5.4);
    ctx.lineTo(0, 5.4);
    ctx.stroke();
    ctx.fillStyle = "#1c2128";
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 1;
    const tread = ((spin * 6) % 3.4) - 1.7;
    ctx.beginPath();
    ctx.moveTo(-4.4, tread);
    ctx.lineTo(4.4, tread);
    ctx.stroke();
    ctx.fillStyle = "#d7dee6";
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.7, 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawBody(ctx, kart) {
    const red = "#e31b1b";
    const steel = "#d5dee8";
    const steelDark = "#8e9bab";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = steelDark;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-16, -7);
    ctx.lineTo(18, -7);
    ctx.moveTo(-16, 7);
    ctx.lineTo(18, 7);
    ctx.moveTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.moveTo(14, -7);
    ctx.lineTo(14, 7);
    ctx.stroke();
    ctx.strokeStyle = steel;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-8, -11);
    ctx.lineTo(-27, -15.5);
    ctx.moveTo(-8, 11);
    ctx.lineTo(-27, 15.5);
    ctx.stroke();
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-27, -16.5);
    ctx.lineTo(-27, 16.5);
    ctx.stroke();
    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.roundRect(-29.2, -19.4, 5, 7.2, 2.2);
    ctx.roundRect(-29.2, 12.2, 5, 7.2, 2.2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillRect(-28.4, -18.2, 1.4, 4.2);
    ctx.fillRect(-28.4, 13.4, 1.4, 4.2);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-8, -14.5, 39, 29, 2.2);
    ctx.fillStyle = "rgba(236, 241, 246, 0.94)";
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = "#6e7c8c";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    for (let x = -6; x <= 30; x += 3.1) {
        ctx.moveTo(x, -14.5);
        ctx.lineTo(x, 14.5);
    }
    for (let y = -13; y <= 13; y += 3.1) {
        ctx.moveTo(-8, y);
        ctx.lineTo(31, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f7fbff";
    ctx.beginPath();
    ctx.roundRect(-8, -14.5, 39, 29, 2.2);
    ctx.stroke();
    ctx.fillStyle = red;
    for (const [x, y] of [[-8, -14.5], [26.2, -14.5], [-8, 9.7], [26.2, 9.7]]) {
        ctx.beginPath();
        ctx.roundRect(x, y, 4.8, 4.8, 1.2);
        ctx.fill();
    }
    ctx.beginPath();
    ctx.roundRect(-3.5, -7.2, 12.5, 14.4, 1.4);
    ctx.fill();
    ctx.fillStyle = "#9d1218";
    ctx.fillRect(7.2, -6.2, 1.5, 12.4);
    ctx.strokeStyle = "#1a1d22";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(1.2, -5.4);
    ctx.lineTo(1.2, 5.4);
    ctx.moveTo(3.6, -4.2);
    ctx.quadraticCurveTo(5.4, 0, 3.6, 4.2);
    ctx.stroke();
    ctx.strokeStyle = steel;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(31, -11);
    ctx.quadraticCurveTo(33.5, 0, 31, 11);
    ctx.stroke();
    if (kart.boostTime > 0) {
        ctx.save();
        ctx.shadowColor = "rgba(255, 220, 140, 0.95)";
        ctx.shadowBlur = 14;
        ctx.strokeStyle = "#fff4c8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-8, -14.5, 39, 29, 2.2);
        ctx.stroke();
        ctx.restore();
    }
}
