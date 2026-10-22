window.GAME_CONFIG = {
  "title": "기타루맨",
  "creator": "김동균",
  "rules": {},
  "custom": {},
  "design": {
    "theme": "무대 위에서 기타를 치며 4개 건반으로 리듬을 맞추는 아케이드 연주",
    "artDirection": "어두운 무대, 호박색 스포트라이트, 체리색 일렉트릭 기타 실루엣, 나무 프렛보드 건반, 네온 레인 선, 굵은 아케이드 글자",
    "orientation": "landscape",
    "composition": "상단·중앙에 떨어지는 4레인 음표와 판정선, 하단 엄지 영역에 4개 큰 건반. 왼쪽 무대에 기타 실루엣, HUD는 점수·콤보를 상단 모서리에. 설정·일시정지는 우측 상단",
    "touch": "하단 4개 건반을 손가락으로 탭. 레인과 건반이 같은 세로 경로. 다중 터치 허용",
    "desktop": "키보드 D F J K 로 레인 1~4, Escape로 일시정지, 스페이스로 시작",
    "palette": {
      "background": "#0B1220",
      "surface": "#2C2118",
      "primary": "#F4A261",
      "text": "#F7E8D4",
      "danger": "#E63946",
      "reward": "#FFE066"
    },
    "typography": "제목·HUD는 굵은 맑은 고딕 계열, 크기 3단계로 위계",
    "feedback": {
      "action": "건반이 눌리며 밝아지고 레인 끝이 반짝임",
      "reward": "Perfect/Good 판정 글자와 콤보 증가, 짧은 기타톤",
      "setback": "Miss 시 콤보 끊김과 빨간 흔들림, 체력 감소"
    },
    "states": {
      "start": "스포트라이트 무대와 기타, 제목 기타루맨, 연주 시작 버튼",
      "play": "4레인·판정선·건반·점수·콤보·체력",
      "pause": "앰프 메모에 계속/다시/소리/앱 추가/크레딧",
      "result": "연주 점수와 최고 콤보, 다시 연주하기"
    }
  }
};
