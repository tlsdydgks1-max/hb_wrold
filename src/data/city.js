const PRICE_TIERS = {
  starter: { land: 40000, toll: 8000 },
  early: { land: 50000, toll: 10500 },
  developing: { land: 62000, toll: 13500 },
  lowerMid: { land: 74000, toll: 17000 },
  mid: { land: 86000, toll: 21500 },
  upperMid: { land: 98000, toll: 26500 },
  strong: { land: 110000, toll: 32000 },
  major: { land: 122000, toll: 38000 },
  premium: { land: 134000, toll: 45000 },
  elite: { land: 146000, toll: 54000 },
  top: { land: 158000, toll: 64000 },
  final: { land: 170000, toll: 76000 },
};

const RESORT_COLOR = "#2fb7a1";
const tollByBuildCost = (buildCost, multiplier) =>
  Math.round(buildCost * multiplier);

const buildCosts = (tier) => {
  const base = PRICE_TIERS[tier];
  const landBuild = base.land;
  const villaBuild = Math.round(base.land * 1.35);
  const buildingBuild = Math.round(base.land * 1.8);
  const hotelBuild = Math.round(base.land * 2.25);
  const landmarkBuild = Math.round(base.land * 2.8);

  return {
    land: {
      label: "땅",
      build: landBuild,
      toll: tollByBuildCost(landBuild, 0.8),
    },
    villa: {
      label: "빌라",
      build: villaBuild,
      toll: tollByBuildCost(villaBuild, 1.1),
    },
    building: {
      label: "빌딩",
      build: buildingBuild,
      toll: tollByBuildCost(buildingBuild, 1.3),
    },
    hotel: {
      label: "호텔",
      build: hotelBuild,
      toll: tollByBuildCost(hotelBuild, 1.5),
    },
    landmark: {
      label: "랜드마크",
      build: landmarkBuild,
      toll: tollByBuildCost(landmarkBuild, 2),
    },
  };
};

const cityTile = (name, idx, color, country, priceTier) => ({
  name,
  idx,
  color,
  country,
  priceTier,
  kind: "city",
  costs: buildCosts(priceTier),
});

const resortTile = (name, idx, country, priceTier) => {
  const base = PRICE_TIERS[priceTier];

  return {
    name,
    idx,
    color: RESORT_COLOR,
    country,
    priceTier,
    kind: "resort",
    costs: {
      resort: {
        label: "리조트",
        build: Math.round(base.land * 1.5),
        toll: Math.round(base.toll * 3.5),
      },
    },
  };
};

export const city = [
  { name: "출발", idx: 0, kind: "start" },
  cityTile("방콕", 1, "#aabd46", "태국", "starter"),
  { name: "보너스 게임", idx: 2, kind: "bonus" },
  cityTile("베이징", 3, "#aabd46", "중국", "early"),
  { name: "황금 열쇠", idx: 4, kind: "goldenKey" },
  cityTile("타이페이", 5, "#5db046", "대만", "developing"),
  cityTile("두바이", 6, "#5db046", "아랍에미리트", "developing"),
  cityTile("카이로", 7, "#5db046", "이집트", "lowerMid"),
  { name: "무인도", idx: 8, kind: "island" },
  resortTile("발리", 9, "인도네시아", "lowerMid"),
  cityTile("아테네", 10, "#5ac6cd", "그리스", "mid"),
  cityTile("시드니", 11, "#5ac6cd", "호주", "mid"),
  { name: "황금 열쇠", idx: 12, kind: "goldenKey" },
  cityTile("하노이", 13, "#6b9add", "베트남", "upperMid"),
  resortTile("하와이", 14, "미국", "upperMid"),
  cityTile("상파울루", 15, "#6b9add", "브라질", "strong"),
  { name: "올림픽", idx: 16, kind: "olympic" },
  cityTile("프라하", 17, "#ef798d", "체코", "strong"),
  resortTile("몰디브", 18, "몰디브", "major"),
  cityTile("베를린", 19, "#ef798d", "독일", "major"),
  { name: "황금 열쇠", idx: 20, kind: "goldenKey" },
  cityTile("모스크바", 21, "#ad89d3", "러시아", "premium"),
  cityTile("제네바", 22, "#ad89d3", "스위스", "premium"),
  cityTile("로마", 23, "#ad89d3", "이탈리아", "elite"),
  { name: "세계여행", idx: 24, kind: "worldTravel" },
  resortTile("칸쿤", 25, "멕시코", "elite"),
  cityTile("런던", 26, "#fb9f77", "영국", "top"),
  cityTile("파리", 27, "#fb9f77", "프랑스", "top"),
  { name: "황금 열쇠", idx: 28, kind: "goldenKey" },
  cityTile("뉴욕", 29, "#fa7970", "미국", "top"),
  { name: "국세청", idx: 30, kind: "tax" },
  cityTile("서울", 31, "#fa7970", "대한민국", "final"),
];
