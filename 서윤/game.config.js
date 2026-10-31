window.GAME_CONFIG = {
  "title": "덩크 슛",
  "creator": "서윤",
  "rules": {},
  "custom": {},
  "design": {
    "theme": "차갑고 반짝이는 얼음 농구장에서 골대 두 개를 한 번에 통과시키는 쉬운 난이도 덩크 슛.",
    "artDirection": "03_아이스_서리질감 스타일. 얼음 코트·백보드·림·네트·공·별 그림을 사용하고 색은 차가운 파란빛(#12364d, #7ed7ff, #eef9ff)으로 맞춘다.",
    "orientation": "portrait",
    "composition": "기준 캔버스는 480×720 픽셀이며 세로 화면이다. 골대는 가까운 쌍으로 배치되어 한 번의 슛으로 두 개를 통과한다.",
    "touch": "터치/마우스로 공을 끌어 발사",
    "desktop": "PC: A/D·←/→ 방향, S·↓ 당기기, Space 발사 · Q/E로 해금한 공 교체",
    "palette": {
      "background": "#12364d",
      "surface": "#1c4b66",
      "primary": "#7ed7ff",
      "text": "#eef9ff"
    },
    "typography": "원본 CSS와 게임 화면의 글꼴을 유지하고, 점수·목표·조작 안내가 휴대폰에서도 읽히도록 표시한다.",
    "feedback": {
      "action": "공을 당겨 각도와 힘을 맞춘 뒤 놓아 골대 두 개를 한 번에 통과시켜.",
      "reward": "더블 골과 클린 콤보로 점수를 모으고 공을 놓치기 전에 최고 점수에 도전해."
    },
    "states": {
      "start": "시작 화면에서 게임 제목과 조작 안내를 보고 시작 버튼을 누르면 첫 판이 열린다.",
      "play": "얼음 농구장에서 골대 두 개를 한 번에 통과시켜 더블 골을 넣어.",
      "pause": "화면의 쉬기 버튼 또는 Esc로 멈추고, 재개를 눌러 이어서 플레이한다.",
      "result": "더블 골과 별로 모은 점수·최고 기록을 보여 준다."
    },
    "selectedAssets": {
      "style": "차갑고 반짝이는 얼음",
      "path": "레이싱·스포츠/덩크 슛/assets/variants/03_아이스_서리질감"
    }
  }
};
