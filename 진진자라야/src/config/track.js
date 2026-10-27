/**
 * 꼬불꼬불한 폐곡선 서킷.
 * course 의 점을 순서대로 잇고, radius 로 코너를 둥글린다.
 * 긴 변은 직선, 반지름 400 이하인 코너는 드리프트 구간이다.
 */
export const trackConfig = {
    halfWidth: 150,
    checkpointCount: 20,
    course: [
        { x: 0, y: 0, radius: 520 },
        { x: 3890, y: 63, radius: 340 },
        { x: 7373, y: -1098, radius: 280 },
        { x: 6746, y: -2824, radius: 460 },
        { x: 4706, y: -3765, radius: 270 },
        { x: 2824, y: -2667, radius: 250 },
        { x: 3608, y: -1255, radius: 290 },
        { x: 1883, y: -628, radius: 250 },
        { x: 628, y: -2040, radius: 310 },
        { x: -1098, y: -2510, radius: 340 },
        { x: -2196, y: -941, radius: 280 },
        { x: -1098, y: 784, radius: 400 },
    ],
};
