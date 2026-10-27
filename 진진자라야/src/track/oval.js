import { trackConfig } from "../config/track.js";
import { mod, wrapAngle } from "../math.js";
const TAU = Math.PI * 2;
/**
 * 직선과 원호를 이은 폐곡선.
 * 가장 긴 직선 위에 출발선을 두고, 진행 방향은 그 직선을 따라 앞으로다.
 */
export class OvalTrack {
    halfWidth = trackConfig.halfWidth;
    originX = 0;
    originY = 0;
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
    extent;
    centerX = 0;
    centerY = 0;
    pond = null;
    stand = null;
    straight = 0;
    radius = 0;
    segments;
    lapZero = 0;
    constructor() {
        const built = buildCourse(trackConfig.course);
        this.segments = built.segments;
        this.perimeter = built.perimeter;
        const longest = this.segments.reduce((best, seg) => seg.kind === "straight" && seg.s1 - seg.s0 > best.s1 - best.s0 ? seg : best, this.segments[0]);
        this.straight = longest.s1 - longest.s0;
        this.radius = Math.min(...trackConfig.course.map((point) => point.radius));
        this.lapZero = longest.s0 + Math.min(420, this.straight * 0.18);
        const step = 10;
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
        this.extent = { minX, minY, maxX, maxY };
        this.centerX = (minX + maxX) / 2;
        this.centerY = (minY + maxY) / 2;
        const pad = 520;
        this.bounds = {
            minX: minX - pad,
            minY: minY - pad,
            maxX: maxX + pad,
            maxY: maxY + pad,
            w: maxX - minX + pad * 2,
            h: maxY - minY + pad * 2,
        };
        this.pond = this.findPond();
        this.stand = this.findStand();
        this.checkJoints();
    }
    sample(distance) {
        const raw = this.sampleRaw(mod(distance + this.lapZero, this.perimeter));
        const heading = wrapAngle(raw.heading);
        return {
            s: mod(distance, this.perimeter),
            x: raw.x,
            y: raw.y,
            heading,
            nx: Math.sin(heading),
            ny: -Math.cos(heading),
        };
    }
    sampleRaw(distance) {
        const s = mod(distance, this.perimeter);
        const seg = this.segmentAt(s);
        if (seg.kind === "straight") {
            const span = Math.max(0.001, seg.s1 - seg.s0);
            const u = clamp01((s - seg.s0) / span);
            return {
                x: seg.x0 + (seg.x1 - seg.x0) * u,
                y: seg.y0 + (seg.y1 - seg.y0) * u,
                heading: seg.heading,
            };
        }
        const span = Math.max(0.001, seg.s1 - seg.s0);
        const u = clamp01((s - seg.s0) / span);
        const a = seg.a0 + seg.sweep * u;
        return {
            x: seg.cx + Math.cos(a) * seg.r,
            y: seg.cy + Math.sin(a) * seg.r,
            heading: a + (seg.sign > 0 ? Math.PI / 2 : -Math.PI / 2),
        };
    }
    closest(x, y) {
        let bestD = Infinity;
        let bestS = 0;
        const coarse = Math.max(1, Math.floor(this.samples.length / 280));
        for (let i = 0; i < this.samples.length; i += coarse) {
            const p = this.samples[i];
            const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
            if (d < bestD) {
                bestD = d;
                bestS = p.s;
            }
        }
        let best = this.project(x, y, bestS);
        for (let delta = -80; delta <= 80; delta += 20) {
            const candidate = this.project(x, y, bestS + delta);
            if (candidate.distance < best.distance)
                best = candidate;
        }
        return best;
    }
    project(x, y, publicS) {
        const rawS = mod(publicS + this.lapZero, this.perimeter);
        const index = this.segmentIndex(rawS);
        let best = null;
        for (let offsetIndex = -1; offsetIndex <= 1; offsetIndex += 1) {
            const seg = this.segments[(index + offsetIndex + this.segments.length) % this.segments.length];
            const hit = seg.kind === "straight" ? projectStraight(seg, x, y) : projectArc(seg, x, y);
            if (!best || hit.distance < best.distance)
                best = hit;
        }
        const heading = wrapAngle(best.heading);
        return {
            x: best.x,
            y: best.y,
            distance: best.distance,
            heading,
            s: mod(best.rawS - this.lapZero, this.perimeter),
        };
    }
    segmentAt(rawS) {
        return this.segments[this.segmentIndex(rawS)];
    }
    segmentIndex(rawS) {
        const s = mod(rawS, this.perimeter);
        for (let i = 0; i < this.segments.length; i += 1) {
            const seg = this.segments[i];
            if (s >= seg.s0 && s < seg.s1)
                return i;
        }
        return this.segments.length - 1;
    }
    buildCurbs() {
        const quads = [];
        const step = 18;
        const margin = 26;
        for (const seg of this.segments) {
            if (seg.kind !== "arc" || seg.r > 400)
                continue;
            let index = 0;
            const start = seg.s0 + margin;
            const end = seg.s1 - margin;
            if (end - start < step)
                continue;
            for (let raw = start; raw < end; raw += step) {
                const a = this.sample(raw - this.lapZero);
                const b = this.sample(Math.min(raw + step, end) - this.lapZero);
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
        const reach = this.halfWidth + 36;
        for (let i = 0; i < count; i += 1) {
            const s = (this.perimeter * i) / count;
            const p = this.sample(s);
            const a = offset(p, reach);
            const b = offset(p, -reach);
            gates.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, heading: p.heading, s });
        }
        return gates;
    }
    findPond() {
        const extent = this.extent;
        let best = null;
        const cols = 28;
        const rows = 22;
        for (let iy = 0; iy < rows; iy += 1) {
            for (let ix = 0; ix < cols; ix += 1) {
                const x = extent.minX + ((ix + 0.5) / cols) * (extent.maxX - extent.minX);
                const y = extent.minY + ((iy + 0.5) / rows) * (extent.maxY - extent.minY);
                if (!pointInLoop(this.samples, x, y))
                    continue;
                const distance = this.closest(x, y).distance;
                if (!best || distance > best.distance)
                    best = { x, y, distance };
            }
        }
        if (!best || best.distance < this.halfWidth + 120)
            return null;
        const room = best.distance - this.halfWidth - 36;
        return {
            x: best.x,
            y: best.y,
            rx: Math.min(210, room * 0.72),
            ry: Math.min(120, room * 0.42),
        };
    }
    findStand() {
        const anchor = this.sample(Math.min(980, this.straight * 0.42));
        const away = this.halfWidth + 108;
        return {
            x: anchor.x - anchor.nx * away,
            y: anchor.y - anchor.ny * away,
            heading: anchor.heading,
            w: 640,
            h: 86,
        };
    }
    checkJoints() {
        for (const seg of this.segments) {
            const before = this.sampleRaw(seg.s0 - 0.4);
            const after = this.sampleRaw(seg.s0 + 0.4);
            const gap = Math.hypot(before.x - after.x, before.y - after.y);
            const turn = Math.abs(wrapAngle(after.heading - before.heading));
            if (gap > 2 || turn > 0.08)
                console.warn("track joint", seg.s0, { gap, turn });
        }
    }
}
function buildCourse(points) {
    const n = points.length;
    const arcs = [];
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
        const inx = v1x / len1;
        const iny = v1y / len1;
        const outx = v2x / len2;
        const outy = v2y / len2;
        const turn = Math.atan2(inx * outy - iny * outx, inx * outx + iny * outy);
        const r = curr.radius;
        const t = r * Math.tan(Math.abs(turn) / 2);
        const sign = Math.sign(turn) || 1;
        const sx = curr.x - inx * t;
        const sy = curr.y - iny * t;
        const ex = curr.x + outx * t;
        const ey = curr.y + outy * t;
        arcs.push({
            turn,
            r,
            sx,
            sy,
            ex,
            ey,
            cx: sx + -iny * sign * r,
            cy: sy + inx * sign * r,
            sign,
        });
    }
    const segments = [];
    let s = 0;
    for (let i = 0; i < n; i += 1) {
        const prev = arcs[(i - 1 + n) % n];
        const arc = arcs[i];
        const length = Math.hypot(arc.sx - prev.ex, arc.sy - prev.ey);
        segments.push({
            kind: "straight",
            s0: s,
            s1: s + length,
            x0: prev.ex,
            y0: prev.ey,
            x1: arc.sx,
            y1: arc.sy,
            heading: Math.atan2(arc.sy - prev.ey, arc.sx - prev.ex),
        });
        s += length;
        const a0 = Math.atan2(arc.sy - arc.cy, arc.sx - arc.cx);
        const a1 = Math.atan2(arc.ey - arc.cy, arc.ex - arc.cx);
        let sweep = a1 - a0;
        if (arc.sign > 0 && sweep <= 0)
            sweep += TAU;
        if (arc.sign < 0 && sweep >= 0)
            sweep -= TAU;
        const arcLen = Math.abs(sweep) * arc.r;
        segments.push({
            kind: "arc",
            s0: s,
            s1: s + arcLen,
            cx: arc.cx,
            cy: arc.cy,
            r: arc.r,
            a0,
            sweep,
            sign: arc.sign,
        });
        s += arcLen;
    }
    return { segments, perimeter: s };
}
function projectStraight(seg, x, y) {
    const dx = seg.x1 - seg.x0;
    const dy = seg.y1 - seg.y0;
    const len2 = dx * dx + dy * dy;
    const u = len2 < 1e-6 ? 0 : clamp01(((x - seg.x0) * dx + (y - seg.y0) * dy) / len2);
    const px = seg.x0 + dx * u;
    const py = seg.y0 + dy * u;
    return {
        x: px,
        y: py,
        distance: Math.hypot(x - px, y - py),
        heading: seg.heading,
        rawS: seg.s0 + (seg.s1 - seg.s0) * u,
    };
}
function projectArc(seg, x, y) {
    const ang = Math.atan2(y - seg.cy, x - seg.cx);
    const a = clampToSweep(seg.a0, seg.sweep, ang);
    const px = seg.cx + Math.cos(a) * seg.r;
    const py = seg.cy + Math.sin(a) * seg.r;
    const swept = seg.sweep === 0 ? 0 : clamp01((a - seg.a0) / seg.sweep);
    return {
        x: px,
        y: py,
        distance: Math.hypot(x - px, y - py),
        heading: a + (seg.sign > 0 ? Math.PI / 2 : -Math.PI / 2),
        rawS: seg.s0 + (seg.s1 - seg.s0) * swept,
    };
}
function clampToSweep(a0, sweep, ang) {
    if (Math.abs(sweep) < 1e-6)
        return a0;
    if (sweep > 0) {
        const along = mod(ang - a0, TAU);
        if (along <= sweep)
            return a0 + along;
        const pastEnd = mod(ang - (a0 + sweep), TAU);
        const before = mod(a0 - ang, TAU);
        return before <= pastEnd ? a0 : a0 + sweep;
    }
    const along = mod(a0 - ang, TAU);
    if (along <= -sweep)
        return a0 - along;
    const pastEnd = mod(a0 + sweep - ang, TAU);
    const before = mod(ang - a0, TAU);
    return before <= pastEnd ? a0 : a0 + sweep;
}
function pointInLoop(samples, x, y) {
    let inside = false;
    for (let i = 0, j = samples.length - 1; i < samples.length; j = i, i += 1) {
        const a = samples[i];
        const b = samples[j];
        const hit = (a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y + 1e-9) + a.x;
        if (hit)
            inside = !inside;
    }
    return inside;
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
