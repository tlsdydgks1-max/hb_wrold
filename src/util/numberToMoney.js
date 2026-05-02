export const NumberToMoney = (num = 0) => {
  if (!num) return "0원";

  const sign = num < 0 ? "-" : "";
  const value = Math.abs(num);

  return `${sign}${value.toLocaleString("ko-KR")}원`;
};
