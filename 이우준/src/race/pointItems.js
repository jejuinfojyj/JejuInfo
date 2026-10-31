import { rules } from "../config/rules.js";
import { mod } from "../math.js";

/**
 * 트랙 위에 놓인 포인트 아이템.
 * 주우면 1점, 잠깐 뒤 다른 자리에 다시 나타난다.
 */
export class PointItems {
    items = [];
    points = 0;
    justPicked = 0;

    constructor(track) {
        this.track = track;
        this.reset();
    }

    reset() {
        this.points = 0;
        this.justPicked = 0;
        this.items = [];
        const count = Math.max(1, rules.itemCount | 0);
        const step = this.track.perimeter / count;
        for (let i = 0; i < count; i += 1) {
            const s = step * i + step * 0.35;
            this.items.push(this.makeItem(s, i));
        }
    }

    makeItem(s, seed) {
        const lateral = ((seed % 3) - 1) * 28;
        const sample = this.track.sample(s);
        return {
            s: mod(s, this.track.perimeter),
            x: sample.x + sample.nx * lateral,
            y: sample.y + sample.ny * lateral,
            alive: true,
            respawn: 0,
            spin: seed * 1.7,
            lateral,
        };
    }

    update(dt, kart, racing) {
        this.justPicked = 0;
        if (!racing)
            return;
        for (const item of this.items) {
            item.spin += dt * 2.8;
            if (!item.alive) {
                item.respawn -= dt;
                if (item.respawn <= 0)
                    this.respawnItem(item);
                continue;
            }
            const dx = kart.x - item.x;
            const dy = kart.y - item.y;
            if (dx * dx + dy * dy <= rules.itemPickupRadius * rules.itemPickupRadius) {
                item.alive = false;
                item.respawn = rules.itemRespawn;
                this.points += rules.pointsPerItem;
                this.justPicked += rules.pointsPerItem;
            }
        }
    }

    respawnItem(item) {
        const advance = this.track.perimeter * (0.18 + Math.random() * 0.22);
        item.s = mod(item.s + advance, this.track.perimeter);
        item.lateral = (Math.random() * 2 - 1) * 36;
        const sample = this.track.sample(item.s);
        item.x = sample.x + sample.nx * item.lateral;
        item.y = sample.y + sample.ny * item.lateral;
        item.alive = true;
        item.respawn = 0;
    }

    get hasLicense() {
        return this.points >= rules.licensePoints;
    }
}

export function drawPointItems(ctx, items, time) {
    for (const item of items) {
        if (!item.alive)
            continue;
        const bob = Math.sin(time * 4 + item.spin) * 4;
        const pulse = 0.85 + Math.sin(time * 6 + item.spin) * 0.15;
        ctx.save();
        ctx.translate(item.x, item.y + bob);
        ctx.scale(pulse, pulse);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 214, 64, 0.28)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11);
        g.addColorStop(0, "#fff6a8");
        g.addColorStop(0.55, "#ffc853");
        g.addColorStop(1, "#ff8a1a");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#5a3208";
        ctx.font = "800 12px Segoe UI, Malgun Gothic, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+1", 0, 1);
        ctx.restore();
    }
}
