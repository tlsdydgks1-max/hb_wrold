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
];
