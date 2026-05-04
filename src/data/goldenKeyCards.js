export const goldenKeyCards = [
  {
    id: "bonus-300k",
    title: "상금 획득",
    description: "은행에서 300,000원을 받습니다.",
    effect: { type: "money", amount: 300000 },
  },
  {
    id: "tax-150k",
    title: "도시 정비 비용",
    description: "은행에 150,000원을 납부합니다.",
    effect: { type: "money", amount: -150000 },
  },
  {
    id: "start",
    title: "출발지로 이동",
    description: "출발지로 이동하고 월급을 받습니다.",
    effect: { type: "moveTo", position: 0, salary: true },
  },
  {
    id: "seoul",
    title: "서울 관광",
    description: "서울로 바로 이동합니다.",
    effect: { type: "moveTo", position: 31 },
  },
  {
    id: "back-three",
    title: "뒤로 3칸",
    description: "현재 위치에서 뒤로 3칸 이동합니다.",
    effect: { type: "moveBy", steps: -3 },
  },
  {
    id: "island",
    title: "무인도 체험",
    description: "무인도로 이동합니다.",
    effect: { type: "goToIsland" },
  },
  {
    id: "pay-other",
    title: "축하금 지급",
    description: "상대에게 100,000원을 지급합니다.",
    effect: { type: "transfer", amount: 100000, direction: "toOpponent" },
  },
  {
    id: "toll-pass",
    title: "통행료 면제권",
    description: "다음 통행료를 1회 면제받습니다.",
    effect: { type: "tollPass" },
  },
  {
    id: "festival-prize",
    title: "축제 상금",
    description: "도시 축제에서 200,000원을 받습니다.",
    effect: { type: "money", amount: 200000 },
  },
  {
    id: "investment-return",
    title: "투자 배당금",
    description: "상대에게서 150,000원을 받습니다.",
    effect: { type: "transfer", amount: 150000, direction: "fromOpponent" },
  },
  {
    id: "bonus-game-invite",
    title: "보너스 게임 초대장",
    description: "보너스 게임 칸으로 이동합니다.",
    effect: { type: "moveTo", position: 2 },
  },
  {
    id: "world-travel-ticket",
    title: "세계여행 항공권",
    description: "세계여행 칸으로 이동합니다.",
    effect: { type: "moveTo", position: 24 },
  },
  {
    id: "free-upgrade",
    title: "무료 업그레이드",
    description:
      "내 도시 하나를 다음 단계 건물로 무료 업그레이드합니다. 업그레이드할 도시가 없으면 100,000원을 받습니다.",
    effect: { type: "freeUpgrade" },
  },
  {
    id: "swap-position",
    title: "자리 바꾸기",
    description: "다음 순서 플레이어와 위치를 서로 바꿉니다.",
    effect: { type: "swapPosition" },
  },
  {
    id: "island-pass",
    title: "무인도 탈출권",
    description: "다음에 무인도에 도착하면 대기 없이 바로 빠져나옵니다.",
    effect: { type: "islandPass" },
  },
  {
    id: "lucky-six",
    title: "행운의 6칸",
    description: "앞으로 6칸 이동합니다.",
    effect: { type: "moveBy", steps: 6 },
  },
];
