import { Box, Chip, Divider, Stack, Typography } from "@mui/material";

import { RESORT_BASE_TOLL_MULTIPLIER } from "@/game/constants";
import { NumberToMoney } from "@/util/numberToMoney";

const getTileKindLabel = (tile) => {
  if (tile?.kind === "resort") return "휴양지";
  if (tile?.kind === "city") return "도시";
  return "특수";
};

const TileInfoCard = ({ tile, getToll, hasColorMonopoly, fallback }) => {
  if (!tile) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: "16px",
          color: "#54708b",
          background: "rgba(255,255,255,0.72)",
          border: "1px dashed rgba(84,112,139,0.38)",
          textAlign: "center",
        }}
      >
        {fallback && <Typography fontWeight={800}>{fallback}</Typography>}
      </Box>
    );
  }

  const ownerCost = tile.owner ? tile.costs[tile.owner.type] : null;
  const toll = getToll(tile);
  const acquisitionCost =
    tile.owner && tile.kind !== "resort" ? toll + ownerCost.build * 2 : null;
  const isMonopoly = hasColorMonopoly(tile.owner?.id, tile.color);
  const resortTollMultiplier =
    tile.kind === "resort"
      ? tile.resortTollMultiplier || RESORT_BASE_TOLL_MULTIPLIER
      : RESORT_BASE_TOLL_MULTIPLIER;

  return (
    <Stack
      gap={1.25}
      sx={{
        p: 1.5,
        borderRadius: "18px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(235,249,255,0.88))",
        border: "1px solid rgba(255,255,255,0.92)",
        boxShadow:
          "0 14px 26px rgba(48,104,154,0.14), inset 0 1px 0 rgba(255,255,255,0.95)",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6" fontWeight={950} color="#102f4e">
            {tile.name}
          </Typography>
          <Typography variant="body2" color="#58708a">
            {tile.country || "특수 블록"}
          </Typography>
        </Box>
        <Chip
          label={getTileKindLabel(tile)}
          sx={{
            fontWeight: 900,
            color: "#ffffff",
            background: tile.color || "#2f8bd3",
          }}
        />
      </Stack>

      <Divider />

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {Object.entries(tile.costs || {}).map(([key, cost]) => (
          <Box
            key={`info-${tile.idx}-${key}`}
            sx={{
              flex: "1 1 132px",
              p: 1,
              borderRadius: "14px",
              background:
                tile.owner?.type === key
                  ? "linear-gradient(180deg, #d8fbff, #86dff0)"
                  : "rgba(255,255,255,0.78)",
              border:
                tile.owner?.type === key
                  ? "2px solid #37a9c2"
                  : "1px solid rgba(82,125,165,0.16)",
              boxShadow:
                tile.owner?.type === key
                  ? "0 5px 0 #187f98"
                  : "0 4px 10px rgba(48,104,154,0.08)",
            }}
          >
            <Typography fontWeight={950}>{cost.label}</Typography>
            <Typography variant="body2">가격 {NumberToMoney(cost.build)}</Typography>
            <Typography variant="body2">통행료 {NumberToMoney(cost.toll)}</Typography>
          </Box>
        ))}
      </Stack>

      <Divider />

      <Stack gap={0.5}>
        <Typography fontWeight={900}>
          소유자: {tile.owner?.name || "없음"}
        </Typography>
        <Typography>현재 건물: {ownerCost?.label || "없음"}</Typography>
        <Typography>
          현재 통행료: {tile.owner ? NumberToMoney(toll) : "없음"}
        </Typography>
        {resortTollMultiplier > RESORT_BASE_TOLL_MULTIPLIER && (
          <Typography>휴양지 성장: 통행료 {resortTollMultiplier}배</Typography>
        )}
        {tile.olympicHost && <Typography>올림픽 개최지: 통행료 2배</Typography>}
        {isMonopoly && <Typography>독점 보너스: 통행료 2배</Typography>}
        {acquisitionCost && (
          <Typography fontWeight={900}>
            인수 금액: {NumberToMoney(acquisitionCost)}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default TileInfoCard;
