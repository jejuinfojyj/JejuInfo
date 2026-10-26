import { trackConfig } from "../config/track.js";
import { mod, wrapAngle } from "../math.js";
/**
 * 직선과 둥근 코너를 번갈아 이은 구불구불한 서킷.
 * 진행 방향은 출발 직선에서 오른쪽으로 시작해 반시계 방향이다.
 */
export class OvalTrack {
    halfWidth = trackConfig.halfWidth;
    originX = 0;
    originY = 0;
    straight = 0;
    radius = 0;
    perimeter = 0;
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
    frame;
    pond;
    constructor() {
        const built = buildCourse(trackConfig.points);
        this.samples = built.samples;
        this.perimeter = built.perimeter;
        this.straight = openingStraight(this.samples);
        const lineAt = this.halfWidth - 26;
        this.outerPath = pathThrough(this.samples.map((p) => offset(p, -this.halfWidth)));
        this.innerPath = pathThrough(this.samples.map((p) => offset(p, this.halfWidth)));
        this.outerLine = pathThrough(this.samples.map((p) => offset(p, -lineAt)));
        this.innerLine = pathThrough(this.samples.map((p) => offset(p, lineAt)));
        this.centerPath = pathThrough(this.samples.map((p) => ({ x: p.x, y: p.y })));
        this.curbs = this.buildCurbs();
        this.startTiles = this.buildStartTiles();
        this.gridMarks = this.buildGrid();
        this.checkpoints = this.buildGates();
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const p of this.samples) {
            minX = Math.min(minX, p.x - this.halfWidth);
            maxX = Math.max(maxX, p.x + this.halfWidth);
            minY = Math.min(minY, p.y - this.halfWidth);
            maxY = Math.max(maxY, p.y + this.halfWidth);
        }
        this.frame = { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
        this.originX = (minX + maxX) / 2;
        this.originY = (minY + maxY) / 2;
        this.radius = Math.max(this.frame.w, this.frame.h) / 2;
        const pad = 520;
        this.bounds = {
            minX: minX - pad,
            minY: minY - pad,
            maxX: maxX + pad,
            maxY: maxY + pad,
            w: maxX - minX + pad * 2,
            h: maxY - minY + pad * 2,
        };
        this.pond = findPond(this.samples, this.halfWidth, this.frame);
    }
    sample(distance) {
        const s = mod(distance, this.perimeter);
        const samples = this.samples;
        let lo = 0;
        let hi = samples.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (samples[mid].s < s)
                lo = mid + 1;
            else
                hi = mid;
        }
        const next = samples[lo];
        const prev = samples[(lo - 1 + samples.length) % samples.length];
        const span = next.s >= prev.s ? next.s - prev.s : this.perimeter - prev.s + next.s;
        const along = s >= prev.s ? s - prev.s : this.perimeter - prev.s + s;
        const t = span > 0.001 ? Math.max(0, Math.min(1, along / span)) : 0;
        const heading = wrapAngle(prev.heading + wrapAngle(next.heading - prev.heading) * t);
        return {
            s,
            x: prev.x + (next.x - prev.x) * t,
            y: prev.y + (next.y - prev.y) * t,
            heading,
            nx: Math.sin(heading),
            ny: -Math.cos(heading),
        };
    }
    closest(x, y) {
        const samples = this.samples;
        let bestD2 = Infinity;
        let bestX = 0;
        let bestY = 0;
        let bestHeading = 0;
        let bestS = 0;
        for (let i = 0; i < samples.length; i += 1) {
            const a = samples[i];
            const b = samples[(i + 1) % samples.length];
            const abx = b.x - a.x;
            const aby = b.y - a.y;
            const len2 = abx * abx + aby * aby;
            if (len2 < 1e-4)
                continue;
            const raw = ((x - a.x) * abx + (y - a.y) * aby) / len2;
            const t = Math.max(0, Math.min(1, raw));
            const px = a.x + abx * t;
            const py = a.y + aby * t;
            const dx = x - px;
            const dy = y - py;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) {
                bestD2 = d2;
                bestX = px;
                bestY = py;
                bestHeading = Math.atan2(aby, abx);
                bestS = a.s;
            }
        }
        return {
            x: bestX,
            y: bestY,
            distance: Math.sqrt(bestD2),
            heading: wrapAngle(bestHeading),
            s: bestS,
        };
    }
    buildCurbs() {
        const quads = [];
        const step = 22;
        for (let s = 0; s < this.perimeter; s += step) {
            const a = this.sample(s);
            const b = this.sample(s + step);
            const turn = Math.abs(wrapAngle(b.heading - a.heading));
            if (turn < 0.09)
                continue;
            const index = Math.floor(s / step);
            for (const side of [1, -1]) {
                const outer = side * (this.halfWidth - 2);
                const inner = side * (this.halfWidth - 22);
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
            for (const lat of [-42, 42]) {
                const p = this.sample(along);
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
}
function openingStraight(samples) {
    const origin = samples[0];
    if (!origin)
        return 0;
    for (const point of samples) {
        if (point.s > 80 && Math.abs(wrapAngle(point.heading - origin.heading)) > 0.22)
            return point.s;
    }
    return samples[samples.length - 1]?.s ?? 0;
}
function buildCourse(points) {
    const n = points.length;
    const corners = [];
    for (let i = 0; i < n; i += 1) {
        const prev = points[(i - 1 + n) % n];
        const curr = points[i];
        const next = points[(i + 1) % n];
        const v1x = curr.x - prev.x;
        const v1y = curr.y - prev.y;
        const v2x = next.x - curr.x;
        const v2y = next.y - curr.y;
        const len1 = Math.hypot(v1x, v1y);
        const len2 = Math.hypot(v2x, v2y);
        const u1x = v1x / len1;
        const u1y = v1y / len1;
        const u2x = v2x / len2;
        const u2y = v2y / len2;
        const cross = u1x * u2y - u1y * u2x;
        const dot = u1x * u2x + u1y * u2y;
        const turn = Math.atan2(cross, dot);
        const phi = Math.abs(turn);
        const maxT = Math.min(len1, len2) * 0.46;
        let radius = curr.r || 0;
        if (phi < 0.08)
            radius = 0;
        if (radius > 0) {
            const needed = radius * Math.tan(phi / 2);
            if (needed > maxT)
                radius = maxT / Math.tan(phi / 2);
        }
        const t = radius > 0 ? radius * Math.tan(phi / 2) : 0;
        const sign = cross >= 0 ? -1 : 1;
        const sx = curr.x - u1x * t;
        const sy = curr.y - u1y * t;
        const ex = curr.x + u2x * t;
        const ey = curr.y + u2y * t;
        corners.push({
            radius,
            sign,
            sx,
            sy,
            ex,
            ey,
            cx: sx + u1y * sign * radius,
            cy: sy - u1x * sign * radius,
            curr,
        });
    }
    const samples = [];
    let traveled = 0;
    const push = (x, y, heading) => {
        const last = samples[samples.length - 1];
        if (last && Math.hypot(x - last.x, y - last.y) < 0.4)
            return;
        if (last)
            traveled += Math.hypot(x - last.x, y - last.y);
        const face = wrapAngle(heading);
        samples.push({
            s: traveled,
            x,
            y,
            heading: face,
            nx: Math.sin(face),
            ny: -Math.cos(face),
        });
    };
    for (let i = 0; i < n; i += 1) {
        const corner = corners[i];
        const next = corners[(i + 1) % n];
        const fromX = corner.radius ? corner.ex : corner.curr.x;
        const fromY = corner.radius ? corner.ey : corner.curr.y;
        const toX = next.radius ? next.sx : next.curr.x;
        const toY = next.radius ? next.sy : next.curr.y;
        const dist = Math.hypot(toX - fromX, toY - fromY);
        const heading = Math.atan2(toY - fromY, toX - fromX);
        const steps = Math.max(1, Math.ceil(dist / 12));
        for (let step = 0; step <= steps; step += 1) {
            const t = step / steps;
            push(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t, heading);
        }
        if (next.radius > 0) {
            const a0 = Math.atan2(next.sy - next.cy, next.sx - next.cx);
            const a1 = Math.atan2(next.ey - next.cy, next.ex - next.cx);
            let sweep = a1 - a0;
            while (sweep > Math.PI)
                sweep -= Math.PI * 2;
            while (sweep <= -Math.PI)
                sweep += Math.PI * 2;
            const arcLen = Math.abs(sweep) * next.radius;
            const stepsArc = Math.max(2, Math.ceil(arcLen / 12));
            for (let step = 1; step <= stepsArc; step += 1) {
                const a = a0 + sweep * (step / stepsArc);
                const x = next.cx + Math.cos(a) * next.radius;
                const y = next.cy + Math.sin(a) * next.radius;
                push(x, y, a + Math.sign(sweep) * (Math.PI / 2));
            }
        }
    }
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (first && last && Math.hypot(first.x - last.x, first.y - last.y) < 2)
        samples.pop();
    return { samples, perimeter: traveled };
}
function findPond(samples, halfWidth, frame) {
    let best = null;
    const step = 70;
    for (let y = frame.minY; y <= frame.maxY; y += step) {
        for (let x = frame.minX; x <= frame.maxX; x += step) {
            if (!pointInside(samples, x, y))
                continue;
            let nearest = Infinity;
            for (let i = 0; i < samples.length; i += 6) {
                const p = samples[i];
                nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
            }
            if (nearest < halfWidth + 170)
                continue;
            if (!best || nearest > best.d)
                best = { x, y, d: nearest };
        }
    }
    if (!best)
        return { x: frame.minX + frame.w / 2, y: frame.minY + frame.h / 2, rx: 90, ry: 52 };
    const room = best.d - halfWidth - 36;
    return {
        x: best.x,
        y: best.y,
        rx: Math.min(200, Math.max(70, room)),
        ry: Math.min(110, Math.max(42, room * 0.55)),
    };
}
function pointInside(samples, x, y) {
    let inside = false;
    for (let i = 0, j = samples.length - 1; i < samples.length; j = i, i += 1) {
        const a = samples[i];
        const b = samples[j];
        const hit = a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y + 1e-9) + a.x;
        if (hit)
            inside = !inside;
    }
    return inside;
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
