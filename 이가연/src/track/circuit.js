import { trackConfig } from "../config/track.js";
import { mod, wrapAngle } from "../math.js";
/**
 * 직선은 반듯하게, 코너만 부드럽게 이은 레이싱 서킷.
 */
export class CircuitTrack {
    kind = "circuit";
    halfWidth = trackConfig.halfWidth;
    originX = trackConfig.originX;
    originY = trackConfig.originY;
    straight;
    radius;
    arc;
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
    _dense;
    constructor() {
        this._dense = trackConfig.directPath
            ? buildDirectLoop(trackConfig.waypoints, this.originX, this.originY)
            : buildCatmullLoop(densifyCollinear(trackConfig.waypoints, trackConfig.densifySpan || 260), trackConfig.sampleStep, this.originX, this.originY);
        const dense = this._dense;
        this.perimeter = dense.at(-1)?.s ?? 0;
        this.arc = this.perimeter * 0.25;
        const step = 8;
        const samples = [];
        for (let s = 0; s < this.perimeter; s += step)
            samples.push(this.sampleFromDense(dense, s));
        if (samples.length > 1)
            samples.push(this.sampleFromDense(dense, this.perimeter));
        this.samples = samples;
        const lineAt = this.halfWidth - 28;
        this.outerPath = pathThrough(samples.map((p) => offset(p, -this.halfWidth)));
        this.innerPath = pathThrough(samples.map((p) => offset(p, this.halfWidth)));
        this.outerLine = pathThrough(samples.map((p) => offset(p, -lineAt)));
        this.innerLine = pathThrough(samples.map((p) => offset(p, lineAt)));
        this.centerPath = pathThrough(samples.map((p) => ({ x: p.x, y: p.y })));
        this.curbs = [];
        this.startTiles = this.buildStartTiles();
        this.gridMarks = [];
        this.checkpoints = this.buildGates();
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const p of samples) {
            minX = Math.min(minX, p.x - this.halfWidth);
            maxX = Math.max(maxX, p.x + this.halfWidth);
            minY = Math.min(minY, p.y - this.halfWidth);
            maxY = Math.max(maxY, p.y + this.halfWidth);
        }
        const pad = 640;
        this.bounds = {
            minX: minX - pad,
            minY: minY - pad,
            maxX: maxX + pad,
            maxY: maxY + pad,
            w: maxX - minX + pad * 2,
            h: maxY - minY + pad * 2,
        };
        this.straight = maxX - minX;
        this.radius = (maxY - minY) / 2;
    }
    sampleFromDense(dense, distance) {
        const s = mod(distance, this.perimeter);
        let lo = 0;
        let hi = dense.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (dense[mid].s < s)
                lo = mid + 1;
            else
                hi = mid;
        }
        const i = Math.max(1, lo);
        const a = dense[i - 1];
        const b = dense[i];
        const span = Math.max(0.001, b.s - a.s);
        const t = clamp01((s - a.s) / span);
        const heading = wrapAngle(a.heading + angleDelta(a.heading, b.heading) * t);
        return {
            s,
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            heading,
            nx: Math.sin(heading),
            ny: -Math.cos(heading),
        };
    }
    sample(distance) {
        return this.sampleFromDense(this._dense, distance);
    }
    closest(x, y) {
        const dense = this._dense;
        let bestD2 = Infinity;
        let best = dense[0];
        let bestS = 0;
        for (let i = 1; i < dense.length; i += 1) {
            const hit = segmentClosest(x, y, dense[i - 1], dense[i]);
            if (hit.d2 < bestD2) {
                bestD2 = hit.d2;
                bestS = hit.s;
                best = hit;
            }
        }
        const hit = segmentClosest(x, y, dense[dense.length - 1], { ...dense[0], s: this.perimeter });
        if (hit.d2 < bestD2) {
            bestD2 = hit.d2;
            bestS = hit.s >= this.perimeter ? 0 : hit.s;
            best = hit;
        }
        return {
            x: best.x,
            y: best.y,
            distance: Math.sqrt(bestD2),
            heading: best.heading,
            s: mod(bestS, this.perimeter),
        };
    }
    buildCurbs() {
        const quads = [];
        const step = 18;
        const margin = 20;
        let index = 0;
        for (let s = margin; s < this.perimeter - margin; s += step) {
            if (s < 70)
                continue;
            const a = this.sample(s);
            const b = this.sample(Math.min(s + step, this.perimeter - margin));
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
                const p = this.sample(mod(this.perimeter + along, this.perimeter));
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
        const count = Math.max(8, trackConfig.checkpointCount);
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
function buildDirectLoop(points, originX, originY) {
    const dense = [];
    let s = 0;
    const n = points.length;
    for (let i = 0; i < n; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % n];
        const x = a.x + originX;
        const y = a.y + originY;
        const heading = wrapAngle(Math.atan2(b.y - a.y, b.x - a.x));
        const prev = dense.at(-1);
        if (prev) {
            const ds = Math.hypot(x - prev.x, y - prev.y);
            if (ds > 0.001)
                s += ds;
        }
        dense.push({
            x,
            y,
            heading,
            nx: Math.sin(heading),
            ny: -Math.cos(heading),
            s,
        });
    }
    return dense;
}
function densifyCollinear(points, maxSpan) {
    const n = points.length;
    const out = [];
    for (let i = 0; i < n; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % n];
        out.push(a);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len <= maxSpan)
            continue;
        const slices = Math.ceil(len / maxSpan);
        for (let k = 1; k < slices; k += 1) {
            const t = k / slices;
            out.push({ x: a.x + dx * t, y: a.y + dy * t });
        }
    }
    return out;
}
function buildCatmullLoop(points, step, originX, originY) {
    const n = points.length;
    const dense = [];
    let s = 0;
    const push = (x, y, heading) => {
        const px = x + originX;
        const py = y + originY;
        const prev = dense.at(-1);
        if (prev) {
            const ds = Math.hypot(px - prev.x, py - prev.y);
            if (ds > 0.001)
                s += ds;
        }
        const h = wrapAngle(heading);
        dense.push({ x: px, y: py, heading: h, nx: Math.sin(h), ny: -Math.cos(h), s });
    };
    for (let seg = 0; seg < n; seg += 1) {
        const p0 = points[(seg - 1 + n) % n];
        const p1 = points[seg];
        const p2 = points[(seg + 1) % n];
        const p3 = points[(seg + 2) % n];
        const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const slices = Math.max(4, Math.ceil(chord / step));
        for (let i = 0; i < slices; i += 1) {
            const t = i / slices;
            const t2 = t * t;
            const t3 = t2 * t;
            const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
            const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
            const dx = 0.5 * ((-p0.x + p2.x) + 2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t + 3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2);
            const dy = 0.5 * ((-p0.y + p2.y) + 2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t + 3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2);
            if (Math.hypot(dx, dy) < 0.001)
                continue;
            push(x, y, Math.atan2(dy, dx));
        }
    }
    return dense;
}
function buildFilletedLoop(points, radius, step, originX, originY) {
    const n = points.length;
    const dense = [];
    let s = 0;
    const push = (x, y, heading) => {
        const nx = Math.sin(heading);
        const ny = -Math.cos(heading);
        const px = x + originX;
        const py = y + originY;
        const prev = dense.at(-1);
        if (prev) {
            const ds = Math.hypot(px - prev.x, py - prev.y);
            if (ds > 0.001)
                s += ds;
        }
        dense.push({ x: px, y: py, heading: wrapAngle(heading), nx, ny, s });
    };
    const emitLine = (ax, ay, bx, by) => {
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len < 0.01)
            return;
        const heading = Math.atan2(dy, dx);
        const slices = Math.max(1, Math.ceil(len / step));
        for (let i = 1; i <= slices; i += 1) {
            const t = i / slices;
            push(ax + dx * t, ay + dy * t, heading);
        }
    };
    const emitArc = (cx, cy, startAngle, sweep) => {
        const count = Math.max(4, Math.ceil(Math.abs(sweep) * radius / step));
        for (let i = 1; i <= count; i += 1) {
            const t = i / count;
            const a = startAngle + sweep * t;
            push(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, a + (sweep > 0 ? Math.PI / 2 : -Math.PI / 2));
        }
    };
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
        if (len1 < 0.01 || len2 < 0.01) {
            corners.push(null);
            continue;
        }
        const u1x = v1x / len1;
        const u1y = v1y / len1;
        const u2x = v2x / len2;
        const u2y = v2y / len2;
        const cross = u1x * u2y - u1y * u2x;
        const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
        const turn = Math.acos(dot);
        if (turn < 0.02 || Math.abs(Math.abs(turn) - Math.PI) < 0.02) {
            corners.push({ arcStart: { x: curr.x, y: curr.y }, arcEnd: { x: curr.x, y: curr.y }, center: null, startAngle: 0, sweep: 0 });
            continue;
        }
        const trim = Math.min(radius / Math.tan(turn / 2), len1 * 0.45, len2 * 0.45);
        const arcStart = { x: curr.x - u1x * trim, y: curr.y - u1y * trim };
        const arcEnd = { x: curr.x + u2x * trim, y: curr.y + u2y * trim };
        const leftNx = -u1y;
        const leftNy = u1x;
        const sign = cross > 0 ? 1 : -1;
        const center = {
            x: arcStart.x + leftNx * radius * sign,
            y: arcStart.y + leftNy * radius * sign,
        };
        const startAngle = Math.atan2(arcStart.y - center.y, arcStart.x - center.x);
        const endAngle = Math.atan2(arcEnd.y - center.y, arcEnd.x - center.x);
        let sweep = endAngle - startAngle;
        if (sign > 0 && sweep < 0)
            sweep += Math.PI * 2;
        if (sign < 0 && sweep > 0)
            sweep -= Math.PI * 2;
        corners.push({ arcStart, arcEnd, center, startAngle, sweep });
    }
    let cursor = null;
    for (let i = 0; i < n; i += 1) {
        const corner = corners[i];
        if (!corner)
            continue;
        if (cursor)
            emitLine(cursor.x, cursor.y, corner.arcStart.x, corner.arcStart.y);
        else {
            const prev = points[(i - 1 + n) % n];
            const curr = points[i];
            const h = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            push(corner.arcStart.x, corner.arcStart.y, h);
        }
        if (Math.abs(corner.sweep) > 0.001)
            emitArc(corner.center.x, corner.center.y, corner.startAngle, corner.sweep);
        cursor = corner.arcEnd;
    }
    const first = corners.find(Boolean);
    if (cursor && first)
        emitLine(cursor.x, cursor.y, first.arcStart.x, first.arcStart.y);
    return dense;
}
function segmentClosest(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? clamp01(((px - a.x) * dx + (py - a.y) * dy) / len2) : 0;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    const ox = px - x;
    const oy = py - y;
    const heading = wrapAngle(a.heading + angleDelta(a.heading, b.heading) * t);
    const s = a.s + (b.s - a.s) * t;
    return { x, y, heading, s, d2: ox * ox + oy * oy };
}
function angleDelta(from, to) {
    return wrapAngle(to - from);
}
function clamp01(v) {
    return Math.max(0, Math.min(1, v));
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
