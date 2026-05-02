const GDP_TIERS = {
  mega: { land: 220000, toll: 80000 },
  major: { land: 190000, toll: 60000 },
  strong: { land: 160000, toll: 42000 },
  mid: { land: 120000, toll: 26000 },
  emerging: { land: 80000, toll: 16000 },
  small: { land: 50000, toll: 10000 },
};

const RESORT_COLOR = "#2fb7a1";

const buildCosts = (tier) => {
  const base = GDP_TIERS[tier];

  return {
    land: { label: "토지", build: base.land, toll: base.toll },
    villa: {
      label: "빌라",
      build: Math.round(base.land * 1.55),
      toll: Math.round(base.toll * 2.4),
    },
    building: {
      label: "빌딩",
      build: Math.round(base.land * 2.25),
      toll: Math.round(base.toll * 4),
    },
    hotel: {
      label: "호텔",
      build: Math.round(base.land * 3),
      toll: Math.round(base.toll * 6.8),
    },
    landmark: {
      label: "랜드마크",
      build: Math.round(base.land * 3.6),
      toll: Math.round(base.toll * 10),
    },
  };
};

const cityTile = (name, idx, color, country, gdpTier) => ({
  name,
  idx,
  color,
  country,
  gdpTier,
  kind: "city",
  costs: buildCosts(gdpTier),
});

const resortTile = (name, idx, country, gdpTier) => {
  const base = GDP_TIERS[gdpTier];

  return {
    name,
    idx,
    color: RESORT_COLOR,
    country,
    gdpTier,
    kind: "resort",
    costs: {
      resort: {
        label: "리조트",
        build: Math.round(base.land * 1.4),
        toll: Math.round(base.toll * 3.2),
      },
    },
  };
};

export const city = [
  { name: "출발", idx: 0, kind: "start" },
  cityTile("방콕", 1, "#aabd46", "태국", "emerging"),
  { name: "보너스 게임", idx: 2, kind: "bonus" },
  cityTile("베이징", 3, "#aabd46", "중국", "mega"),
  resortTile("인도", 4, "인도", "major"),
  cityTile("타이페이", 5, "#5db046", "대만", "strong"),
  cityTile("두바이", 6, "#5db046", "아랍에미리트", "mid"),
  cityTile("카이로", 7, "#5db046", "이집트", "emerging"),
  { name: "무인도", idx: 8, kind: "island" },
  resortTile("발리", 9, "인도네시아", "strong"),
  cityTile("아테네", 10, "#5ac6cd", "그리스", "mid"),
  cityTile("시드니", 11, "#5ac6cd", "호주", "major"),
  { name: "황금 열쇠", idx: 12, kind: "goldenKey" },
  cityTile("하노이", 13, "#6b9add", "베트남", "emerging"),
  resortTile("하와이", 14, "미국", "mega"),
  cityTile("상파울로", 15, "#6b9add", "브라질", "strong"),
  { name: "올림픽", idx: 16, kind: "olympic" },
  cityTile("프라하", 17, "#ef798d", "체코", "mid"),
  resortTile("몰디브", 18, "몰디브", "small"),
  cityTile("베를린", 19, "#ef798d", "독일", "major"),
  { name: "황금 열쇠", idx: 20, kind: "goldenKey" },
  cityTile("모스크바", 21, "#ad89d3", "러시아", "strong"),
  cityTile("제네바", 22, "#ad89d3", "스위스", "strong"),
  cityTile("로마", 23, "#ad89d3", "이탈리아", "strong"),
  { name: "세계여행", idx: 24, kind: "worldTravel" },
  resortTile("칸쿤", 25, "멕시코", "strong"),
  cityTile("런던", 26, "#fb9f77", "영국", "major"),
  cityTile("파리", 27, "#fb9f77", "프랑스", "major"),
  { name: "황금 열쇠", idx: 28, kind: "goldenKey" },
  cityTile("뉴욕", 29, "#fa7970", "미국", "mega"),
  { name: "국세청", idx: 30, kind: "tax" },
  cityTile("서울", 31, "#fa7970", "대한민국", "strong"),
];
