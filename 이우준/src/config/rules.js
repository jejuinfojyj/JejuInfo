/**
 * 경기 규칙.
 * 랩 수, 카운트다운, 드리프트 허용 같은 규칙은 여기에 둔다.
 * 포인트 아이템을 모아 라이선스를 따는 목표도 여기서 정한다.
 */
export const rules = {
    laps: 10,
    countdown: 3,
    /** 다음 체크포인트를 노면에 희미하게 보여 준다. */
    showNextGate: true,
    wrongWayDelay: 0.45,
    enableDrift: true,
    enableBoost: true,
    /** 트랙 위 아이템 1개 = 1포인트. */
    pointsPerItem: 1,
    /** 이 점수 이상이면 라이선스 획득. */
    licensePoints: 30,
    /** 트랙에 동시에 두는 포인트 아이템 개수. */
    itemCount: 4,
    /** 주운 뒤 다시 나타나는 시간(초). */
    itemRespawn: 2.4,
    /** 카트와 아이템이 닿았다고 볼 거리. */
    itemPickupRadius: 38,
};
