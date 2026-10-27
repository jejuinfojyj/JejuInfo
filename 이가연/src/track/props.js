import { visual } from "../config/visual.js";
import { mulberry32 } from "../math.js";
export function createScenery(track) {
    const rng = mulberry32(visual.seed);
    const props = [];
    const step = track.perimeter / visual.treeCount;
    for (let i = 0; i < visual.treeCount; i += 1) {
        const s = (i * step + rng() * step * 0.35) % track.perimeter;
        const p = track.sample(s);
        const outward = -(track.halfWidth + 78 + rng() * 70);
        props.push({
            kind: "tree",
            x: p.x + p.nx * outward,
            y: p.y + p.ny * outward,
            scale: 0.82 + rng() * 0.75,
            rotation: rng() * Math.PI,
            variant: rng(),
        });
    }
    let bushes = 0;
    let guard = 0;
    while (bushes < visual.bushCount && guard < 400) {
        guard += 1;
        const b = track.bounds;
        const x = b.minX + rng() * b.w;
        const y = b.minY + rng() * b.h;
        const closest = track.closest(x, y);
        if (closest.distance < track.halfWidth + 78)
            continue;
        if (closest.distance > track.radius * 1.35)
            continue;
        props.push({
            kind: "bush",
            x,
            y,
            scale: 0.7 + rng() * 0.8,
            rotation: rng() * Math.PI,
            variant: rng(),
        });
        bushes += 1;
    }
    let rocks = 0;
    guard = 0;
    while (rocks < visual.rockCount && guard < 200) {
        guard += 1;
        const s = rng() * track.perimeter;
        const p = track.sample(s);
        const outward = -(track.halfWidth + 36 + rng() * 28);
        const x = p.x + p.nx * outward;
        const y = p.y + p.ny * outward;
        if (track.closest(x, y).distance < track.halfWidth + 18)
            continue;
        props.push({
            kind: "rock",
            x,
            y,
            scale: 0.6 + rng() * 0.7,
            rotation: rng() * Math.PI,
            variant: rng(),
        });
        rocks += 1;
    }
    const blobs = [];
    for (let i = 0; i < 12; i += 1) {
        const light = rng() > 0.5;
        blobs.push({
            x: track.bounds.minX + rng() * track.bounds.w,
            y: track.bounds.minY + rng() * track.bounds.h,
            rx: 120 + rng() * 280,
            ry: 70 + rng() * 160,
            color: light ? "rgba(255,255,230,0.045)" : "rgba(0,30,10,0.06)",
        });
    }
    return { props, blobs };
}
