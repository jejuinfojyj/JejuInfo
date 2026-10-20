window.GAME_CONFIG = {
  "title": "길동의 햄버거집",
  "creator": "진한빈",
  "texts": {
    "start": "손님 주문대로 재료를 쌓아 줘. 1분 동안 많이 만들수록 좋아. 잘못 쌓으면 그 햄버거를 처음부터 다시 만들어.",
    "win": "1분이 끝났어!",
    "lose": "1분이 끝났어!"
  },
  "player": {
    "name": "바리스타",
    "color": "#ffb703",
    "sprite": "",
    "shape": "round"
  },
  "rules": {
    "goal": 6,
    "lives": 3,
    "timeSec": 60
  },
  "map": {
    "background": "#c46a2b",
    "menu": [
      {
        "name": "빵",
        "color": "#f3d38a"
      },
      {
        "name": "패티",
        "color": "#8a4b2f"
      },
      {
        "name": "양상추",
        "color": "#7ed957"
      },
      {
        "name": "토마토",
        "color": "#e23d28"
      },
      {
        "name": "치킨패티",
        "color": "#e0a15a"
      },
      {
        "name": "소스",
        "color": "#f2c14e"
      }
    ]
  },
  "special": [],
  "variant": "recipe",
  "controls": "direct",
  "assets": {
    "item": "",
    "enemy": "",
    "background": ""
  },
  "layout": "landscape",
  "custom": {
    "theme": "burger",
    "stackInOrder": true,
    "win": "most",
    "style": "8bit",
    "scene": "burger-shop",
    "ingredients": [
      "빵",
      "패티",
      "양상추",
      "토마토",
      "치킨패티",
      "소스"
    ],
    "timeSec": 60,
    "wrongAction": "remake"
  }
};
