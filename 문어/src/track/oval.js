import { trackConfig } from "../config/track.js";
import { mod, wrapAngle } from "../math.js";
/**
 * 꼭짓점으로 이은 닫힌 서킷.
 * 진행 방향은 화면 아래에서 오른쪽으로 출발해 반시계 방향이다.
 */
export class OvalTrack {
    halfWidth = trackConfig.halfWidth;
    originX = trackConfig.originX;
    originY = trackConfig.originY;
    /** 제목 줌·소품 배치용 대략 치수 */
    straight;
    radius;
    frameW;
    frameH;
    perimeter;
    samples;
    outerPath;
    innerPath;
    outerLine;
    innerLine;
    centerPath;
    curbs;
    startTiles;
    gridMarks;
    checkpoints;
    bounds;
    #points;
    #lengths;
    constructor() {
        this.#points = buildClosedPoints(trackConfig.waypoints);
        this.#lengths = cumulativeLengths(this.#points);
        this.perimeter = this.#lengths[this.#lengths.length - 1] ?? 0;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const p of this.#points) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }
        this.radius = Math.max(220, (maxY - minY) / 2);
        this.straight = Math.max(400, maxX - minX - this.radius * 2);
        this.frameW = maxX - minX + this.halfWidth * 2;
        this.frameH = maxY - minY + this.halfWidth * 2;
        const step = 8;
        const samples = [];
        for (let s = 0; s < this.perimeter; s += step)
            samples.push(this.sample(s));
        this.samples = samples;
        const lineAt = this.halfWidth - 28;
        this.outerPath = pathThrough(samples.map((p) => offset(p, -this.halfWidth)));
        this.innerPath = pathThrough(samples.map((p) => offset(p, this.halfWidth)));
        this.outerLine = pathThrough(samples.map((p) => offset(p, -lineAt)));
        this.innerLine = pathThrough(samples.map((p) => offset(p, lineAt)));
        this.centerPath = pathThrough(samples.map((p) => ({ x: p.x, y: p.y })));
        this.curbs = this.buildCurbs();
        this.startTiles = this.buildStartTiles();
        this.gridMarks = this.buildGrid();
        this.checkpoints = this.buildGates();
        const pad = 520;
        this.bounds = {
            minX: minX - this.halfWidth - pad + this.originX,
            minY: minY - this.halfWidth - pad + this.originY,
            maxX: maxX + this.halfWidth + pad + this.originX,
            maxY: maxY + this.halfWidth + pad + this.originY,
            w: maxX - minX + (this.halfWidth + pad) * 2,
            h: maxY - minY + (this.halfWidth + pad) * 2,
        };
        this.checkJoints();
    }
    sample(distance) {
        const local = this.sampleLocal(mod(distance, this.perimeter));
        const heading = wrapAngle(local.heading);
        return {
            s: local.s,
            x: local.x + this.originX,
            y: local.y + this.originY,
            heading,
            nx: Math.sin(heading),
            ny: -Math.cos(heading),
        };
    }
    closest(x, y) {
        const lx = x - this.originX;
        const ly = y - this.originY;
        let bestD2 = Infinity;
        let bestX = 0;
        let bestY = 0;
        let bestHeading = 0;
        let bestS = 0;
        for (let i = 0; i < this.#points.length - 1; i += 1) {
            const a = this.#points[i];
            const b = this.#points[i + 1];
            if (!a || !b)
                continue;
            const abx = b.x - a.x;
            const aby = b.y - a.y;
            const len2 = abx * abx + aby * aby;
            if (len2 < 1e-6)
                continue;
            let t = ((lx - a.x) * abx + (ly - a.y) * aby) / len2;
            t = Math.max(0, Math.min(1, t));
            const px = a.x + abx * t;
            const py = a.y + aby * t;
            const dx = lx - px;
            const dy = ly - py;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) {
                bestD2 = d2;
                bestX = px;
                bestY = py;
                bestHeading = Math.atan2(aby, abx);
                bestS = (this.#lengths[i] ?? 0) + Math.sqrt(len2) * t;
            }
        }
        const distance = Math.sqrt(bestD2);
        const heading = wrapAngle(bestHeading);
        return {
            x: bestX + this.originX,
            y: bestY + this.originY,
            distance,
            heading,
            s: mod(bestS, this.perimeter),
        };
    }
    sampleLocal(s) {
        const target = mod(s, this.perimeter);
        for (let i = 0; i < this.#points.length - 1; i += 1) {
            const start = this.#lengths[i] ?? 0;
            const end = this.#lengths[i + 1] ?? start;
            const lastSeg = i === this.#points.length - 2;
            if (!lastSeg && target >= end)
                continue;
            const a = this.#points[i];
            const b = this.#points[i + 1];
            if (!a || !b)
                break;
            const span = Math.max(1e-6, end - start);
            const t = Math.max(0, Math.min(1, (target - start) / span));
            return {
                s: target,
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                heading: Math.atan2(b.y - a.y, b.x - a.x),
            };
        }
        const last = this.#points[this.#points.length - 1] ?? { x: 0, y: 0 };
        const prev = this.#points[this.#points.length - 2] ?? last;
        return {
            s: target,
            x: last.x,
            y: last.y,
            heading: Math.atan2(last.y - prev.y, last.x - prev.x),
        };
    }
    buildCurbs() {
        const quads = [];
        const step = 18;
        const margin = 20;
        let index = 0;
        for (let s = margin; s < this.perimeter - margin; s += step) {
            const a = this.sample(s);
            const b = this.sample(Math.min(s + step, this.perimeter - margin));
            const turn = Math.abs(wrapAngle(b.heading - a.heading));
            if (turn < 0.045)
                continue;
            for (const side of [1, -1]) {
                const outer = side * (this.halfWidth - 2);
                const inner = side * (this.halfWidth - 24);
                const a0 = offset(a, outer);
                const a1 = offset(a, inner);
                const b0 = offset(b, outer);
                const b1 = offset(b, inner);
                quads.push({
                    ax: a0.x,
                    ay: a0.y,
                    bx: b0.x,
                    by: b0.y,
                    cx: b1.x,
                    cy: b1.y,
                    dx: a1.x,
                    dy: a1.y,
                    red: index % 2 === 0,
                });
            }
            index += 1;
        }
        return quads;
    }
    buildStartTiles() {
        const p = this.sample(0);
        const tiles = [];
        const size = 14;
        let column = 0;
        for (let lat = -this.halfWidth + 24; lat <= this.halfWidth - 24; lat += size) {
            for (let row = 0; row < 2; row += 1) {
                const along = (row - 0.5) * size;
                const point = place(p, lat, along);
                tiles.push({
                    x: point.x,
                    y: point.y,
                    heading: p.heading,
                    w: size,
                    h: size,
                    light: (column + row) % 2 === 0,
                });
            }
            column += 1;
        }
        return tiles;
    }
    buildGrid() {
        const marks = [];
        for (const along of [-46, -78, -110]) {
            for (const lat of [-46, 46]) {
                const p = this.sample(this.perimeter + along);
                const point = place(p, lat, 0);
                marks.push({
                    x: point.x,
                    y: point.y,
                    heading: p.heading,
                    w: 34,
                    h: 16,
                    light: true,
                });
            }
        }
        return marks;
    }
    buildGates() {
        const count = Math.max(4, trackConfig.checkpointCount);
        const gates = [];
        const reach = this.halfWidth + 24;
        for (let i = 0; i < count; i += 1) {
            const s = (this.perimeter * i) / count;
            const p = this.sample(s);
            const a = offset(p, reach);
            const b = offset(p, -reach);
            gates.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, heading: p.heading, s });
        }
        return gates;
    }
    checkJoints() {
        const a = this.sample(0);
        const b = this.sample(this.perimeter - 0.5);
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        const turn = Math.abs(wrapAngle(a.heading - b.heading));
        if (gap > 4 || turn > 0.35)
            console.warn("track loop joint", { gap, turn });
    }
}
function buildClosedPoints(raw) {
    const points = raw.map(([x, y]) => ({ x, y }));
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last)
        return [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    if (Math.hypot(first.x - last.x, first.y - last.y) > 1)
        points.push({ x: first.x, y: first.y });
    return points;
}
function cumulativeLengths(points) {
    const lengths = [0];
    for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const prev = lengths[i - 1] ?? 0;
        lengths.push(prev + Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.y ?? 0) - (a?.y ?? 0)));
    }
    return lengths;
}
function offset(sample, lateral) {
    return {
        x: sample.x + sample.nx * lateral,
        y: sample.y + sample.ny * lateral,
    };
}
function place(sample, lateral, along) {
    return {
        x: sample.x + sample.nx * lateral + Math.cos(sample.heading) * along,
        y: sample.y + sample.ny * lateral + Math.sin(sample.heading) * along,
    };
}
function pathThrough(points) {
    const path = new Path2D();
    const first = points[0];
    if (!first)
        return path;
    path.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i += 1) {
        const p = points[i];
        if (p)
            path.lineTo(p.x, p.y);
    }
    path.closePath();
    return path;
}
