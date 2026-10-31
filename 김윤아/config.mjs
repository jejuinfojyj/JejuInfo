/** 약속 테마·옷 아이템·별점·색을 여기서 바꿉니다. */
export const CONFIG = {
  title: '옷 코디 스튜디오',
  width: 480,
  height: 740,
  totalRounds: 4,
  maxStars: 3,
  palette: {
    background: '#f6e9df',
    surface: '#fff7f0',
    primary: '#ef7a6b',
    text: '#3d2a2f',
    muted: '#9a7b72',
    accent: '#7bb8a4',
    soft: '#f0c9b0',
    skin: '#f2c7a8',
    hair: '#5a3a2e',
  },
  categories: [
    { id: 'hair', label: '머리' },
    { id: 'top', label: '윗옷' },
    { id: 'bottom', label: '바지' },
    { id: 'shoes', label: '신발' },
    { id: 'acc', label: '소품' },
  ],
};

/** 각 옷은 tags로 약속과 맞춰진다. color는 그림용 기본색. */
export const ITEMS = {
  hair: [
    { id: 'short', name: '단발', tags: ['school', 'sports'], color: '#5a3a2e', style: 'short' },
    { id: 'long', name: '긴 머리', tags: ['party', 'winter'], color: '#3d2918', style: 'long' },
    { id: 'bun', name: '묶음머리', tags: ['school', 'party'], color: '#6b4228', style: 'bun' },
    { id: 'cap', name: '모자머리', tags: ['sports', 'rainy'], color: '#2f6f5e', style: 'cap' },
  ],
  top: [
    { id: 'shirt', name: '흰 셔츠', tags: ['school'], color: '#f5f0e8', style: 'shirt' },
    { id: 'hoodie', name: '후드티', tags: ['rainy', 'sports'], color: '#5b8def', style: 'hoodie' },
    { id: 'dress', name: '원피스', tags: ['party'], color: '#ef7a9b', style: 'dress' },
    { id: 'sweater', name: '니트', tags: ['winter', 'school'], color: '#d9845b', style: 'sweater' },
    { id: 'tank', name: '나시', tags: ['sports'], color: '#7bb8a4', style: 'tank' },
  ],
  bottom: [
    { id: 'jeans', name: '청바지', tags: ['school', 'rainy', 'winter'], color: '#4a6fa5', style: 'jeans' },
    { id: 'skirt', name: '치마', tags: ['party', 'school'], color: '#c45c7a', style: 'skirt' },
    { id: 'shorts', name: '반바지', tags: ['sports'], color: '#6b8f71', style: 'shorts' },
    { id: 'sweats', name: '츄리닝', tags: ['sports', 'winter'], color: '#6a6f8a', style: 'sweats' },
  ],
  shoes: [
    { id: 'sneakers', name: '운동화', tags: ['school', 'sports'], color: '#f0f0f0', style: 'sneakers' },
    { id: 'boots', name: '장화·부츠', tags: ['rainy', 'winter'], color: '#3d3a45', style: 'boots' },
    { id: 'heels', name: '구두', tags: ['party'], color: '#8b3a4a', style: 'heels' },
    { id: 'sandals', name: '샌들', tags: ['party', 'sports'], color: '#e8b86d', style: 'sandals' },
  ],
  acc: [
    { id: 'bag', name: '가방', tags: ['school'], color: '#8b5a3c', style: 'bag' },
    { id: 'umbrella', name: '우산', tags: ['rainy'], color: '#5b8def', style: 'umbrella' },
    { id: 'scarf', name: '목도리', tags: ['winter'], color: '#ef7a6b', style: 'scarf' },
    { id: 'bow', name: '리본', tags: ['party'], color: '#ef7a9b', style: 'bow' },
    { id: 'shades', name: '선글라스', tags: ['sports', 'party'], color: '#222222', style: 'shades' },
  ],
};

export const THEMES = [
  {
    id: 'school',
    title: '학교 등교',
    blurb: '교실에 갈 단정한 코디를 골라 봐!',
    wants: ['school'],
    bg: ['#efe4d8', '#f7c9a8'],
  },
  {
    id: 'party',
    title: '생일 파티',
    blurb: '반짝이는 파티룩으로 축하해 줘!',
    wants: ['party'],
    bg: ['#f4d6e8', '#efb0c8'],
  },
  {
    id: 'sports',
    title: '운동회',
    blurb: '뛰어놀기 좋은 가벼운 옷이 좋아!',
    wants: ['sports'],
    bg: ['#d7efe4', '#9ed9b8'],
  },
  {
    id: 'rainy',
    title: '비 오는 날',
    blurb: '젖지 않게 비옷·장화 느낌으로!',
    wants: ['rainy'],
    bg: ['#d6e0ef', '#9eb4d4'],
  },
  {
    id: 'winter',
    title: '겨울 나들이',
    blurb: '따뜻하게 감싸는 코디를 완성해 봐!',
    wants: ['winter'],
    bg: ['#e8eef6', '#c7d5ea'],
  },
];

export function itemById(category, id) {
  return (ITEMS[category] || []).find((item) => item.id === id) || null;
}

export function defaultOutfit() {
  return {
    hair: 'short',
    top: 'shirt',
    bottom: 'jeans',
    shoes: 'sneakers',
    acc: 'bag',
  };
}
