import { handling } from "./handling.js";

/**
 * 로비에서 고르는 카트.
 * 기본 주행값에 이 카트만의 속도·회전·드리프트를 덮어쓴다.
 */
export const karts = [
    {
        id: "classic",
        name: "1번 기본",
        blurb: "균형이 좋아. 처음 타기 좋아.",
        number: "1",
        ...handling,
    },
    {
        id: "speed",
        name: "스피드",
        blurb: "최고속도가 빠르고, 코너는 조금 둔해.",
        number: "7",
        ...handling,
        maxSpeed: 780,
        accel: 430,
        turnRate: 1.22,
        driftTurnRate: 1.62,
        driftGrip: 4.4,
        boostAdd: 300,
        boostKick: [90, 160, 230],
        kartRadius: 18,
    },
    {
        id: "drift",
        name: "드리프트",
        blurb: "코너를 잘 돌고, 최고속도는 조금 느려.",
        number: "3",
        ...handling,
        maxSpeed: 560,
        accel: 470,
        turnRate: 2.15,
        driftTurnRate: 2.7,
        driftGrip: 2.15,
        minDriftSpeed: 160,
        minDriftTime: 0.14,
        driftSegmentTimes: [0.28, 0.7, 1.15],
        boostTimes: [0.48, 0.86, 1.22],
        boostKick: [80, 150, 210],
        kartRadius: 17,
    },
];

export function kartByIndex(index) {
    const count = karts.length;
    const i = ((index % count) + count) % count;
    return karts[i];
}
