import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import {
  BUILD_ORDER,
  BONUS_MAX_ROUND,
  COIN_SIDE_LABELS,
  RESORT_BASE_TOLL_MULTIPLIER,
  getBuildingSaleValue,
} from "@/game/constants";
import { actionPanelSx } from "@/styles/gameSx";
import { NumberToMoney } from "@/util/numberToMoney";

const TileActionPanel = ({
  player,
  tile,
  action,
  isAction,
  onBuild,
  onPayToll,
  onAcquire,
  sellableBuildings = [],
  onSellBuildings,
  onCancelSellBuildings,
  onBonusGuess,
  onBonusCollect,
  onBonusContinue,
  onEndTurn,
  getToll,
  hasColorMonopoly,
  winner,
  canAct,
}) => {
  const [costOption, setCostOption] = useState("");
  const [selectedSaleTileIdxs, setSelectedSaleTileIdxs] = useState([]);

  useEffect(() => {
    setCostOption(action?.type === "tile" ? action.defaultBuildType || "" : "");
  }, [tile?.idx, action?.type, action?.defaultBuildType]);

  useEffect(() => {
    setSelectedSaleTileIdxs([]);
  }, [action?.type, action?.tileIdx, action?.requiredAmount]);

  if (winner || !isAction || !action || !player) return null;

  if (action.type === "message") {
    return (
      <Stack sx={actionPanelSx}>
        <Typography variant="h6">{action.title}</Typography>
        <Typography>{action.description}</Typography>
        <Button variant="contained" onClick={onEndTurn} disabled={!canAct}>
          {canAct ? "턴 종료" : "대기 중"}
        </Button>
      </Stack>
    );
  }

  if (action.type === "bonusGame") {
    const isWin = action.result === "win";
    const canContinue = action.round < BONUS_MAX_ROUND;
    const selectedLabel = COIN_SIDE_LABELS[action.selectedSide];
    const coinLabel = COIN_SIDE_LABELS[action.coinSide];

    return (
      <Stack sx={{ ...actionPanelSx, width: 500 }}>
        <Typography variant="h6">보너스 게임</Typography>
        <Stack direction="row" gap={1} justifyContent="center" flexWrap="wrap">
          <Chip
            label={`${action.round}/${BONUS_MAX_ROUND} 라운드`}
            color="primary"
            sx={{ fontWeight: 900 }}
          />
          <Chip
            label={`현재 상금 ${NumberToMoney(action.prize)}`}
            color="success"
            sx={{ fontWeight: 900 }}
          />
        </Stack>

        {isWin ? (
          <>
            <Typography fontWeight={900}>
              성공! {selectedLabel}을 맞췄습니다.
            </Typography>
            <Typography color="#54708b" fontWeight={800}>
              동전 결과: {coinLabel}
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
              <Button
                variant="contained"
                color="inherit"
                onClick={onBonusCollect}
                disabled={!canAct}
              >
                상금 받기
              </Button>
              {canContinue && (
                <Button
                  variant="contained"
                  onClick={onBonusContinue}
                  disabled={!canAct}
                >
                  2배로 한 판 더
                </Button>
              )}
            </Stack>
            {!canContinue && (
              <Typography fontWeight={800} color="#54708b">
                마지막 라운드입니다. 상금을 받아주세요.
              </Typography>
            )}
          </>
        ) : (
          <>
            <Typography fontWeight={800}>
              동전의 앞면 또는 뒷면을 맞히세요.
            </Typography>
            <Typography color="#54708b" fontWeight={800}>
              실패하면 이번 보너스 게임의 상금을 받을 수 없습니다.
            </Typography>
            <Stack direction="row" gap={1}>
              <Button
                variant="contained"
                onClick={() => onBonusGuess("heads")}
                disabled={!canAct}
              >
                앞면
              </Button>
              <Button
                variant="contained"
                color="inherit"
                onClick={() => onBonusGuess("tails")}
                disabled={!canAct}
              >
                뒷면
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    );
  }

  if (action.type === "sellBuildings") {
    const selectedSaleValue = sellableBuildings
      .filter((building) => selectedSaleTileIdxs.includes(building.idx))
      .reduce((total, building) => total + getBuildingSaleValue(building), 0);
    const shortfall = Math.max(action.requiredAmount - player.money, 0);
    const purchaseLabel =
      action.purchaseType === "acquire" ? "인수" : "건물 구매";
    const toggleSaleTile = (tileIdx) => {
      setSelectedSaleTileIdxs((current) =>
        current.includes(tileIdx)
          ? current.filter((item) => item !== tileIdx)
          : [...current, tileIdx],
      );
    };

    return (
      <Stack sx={{ ...actionPanelSx, width: 520 }}>
        <Typography variant="h6">{purchaseLabel} 자금 부족</Typography>
        <Typography fontWeight={800}>
          부족 금액 {NumberToMoney(shortfall)}을 마련하려면 건물을 판매해야
          합니다.
        </Typography>
        <Typography variant="body2" fontWeight={800} color="#54708b">
          판매할 건물 {sellableBuildings.length}개 선택 가능
        </Typography>

        <Stack
          gap={0.75}
          sx={{
            width: "100%",
            maxHeight: 220,
            overflowY: "auto",
            pr: 0.5,
          }}
        >
          {sellableBuildings.length ? (
            sellableBuildings.map((building) => {
              const saleValue = getBuildingSaleValue(building);
              const isSelected = selectedSaleTileIdxs.includes(building.idx);
              const ownerCost = building.costs?.[building.owner?.type];

              return (
                <Button
                  key={`sale-${building.idx}`}
                  fullWidth
                  variant={isSelected ? "contained" : "outlined"}
                  color={isSelected ? "primary" : "inherit"}
                  onClick={() => toggleSaleTile(building.idx)}
                  disabled={!canAct}
                  sx={{
                    justifyContent: "space-between",
                    px: 1.25,
                    py: 0.85,
                    borderRadius: "12px",
                    fontWeight: 900,
                    textAlign: "left",
                    gap: 1,
                  }}
                >
                  <Box component="span" sx={{ minWidth: 0 }}>
                    {building.name} {ownerCost?.label || "건물"}
                  </Box>
                  <Box component="span" sx={{ flexShrink: 0 }}>
                    {NumberToMoney(saleValue)}
                  </Box>
                </Button>
              );
            })
          ) : (
            <Typography fontWeight={800} color="#54708b">
              판매 가능한 건물이 없습니다.
            </Typography>
          )}
        </Stack>

        <Divider flexItem />

        <Stack direction="row" gap={1} alignItems="center">
          <Chip
            label={`선택 ${selectedSaleTileIdxs.length}개`}
            color="primary"
            sx={{ fontWeight: 900 }}
          />
          <Typography fontWeight={900}>
            판매 금액 {NumberToMoney(selectedSaleValue)}
          </Typography>
        </Stack>

        <Stack direction="row" gap={1}>
          <Button
            variant="contained"
            color="inherit"
            onClick={onCancelSellBuildings}
            disabled={!canAct}
          >
            돌아가기
          </Button>
          <Button
            variant="contained"
            onClick={() => onSellBuildings(selectedSaleTileIdxs)}
            disabled={!canAct || !selectedSaleTileIdxs.length}
          >
            판매 후 계속
          </Button>
        </Stack>
      </Stack>
    );
  }

  if (action.type !== "tile" || !canAct) return null;

  const selectedCost = costOption ? tile.costs[costOption] : null;
  const isOpponentCity = tile.owner && tile.owner.id !== player.id;
  const ownerCost = tile.owner ? tile.costs[tile.owner.type] : null;
  const isOwnCity = tile.owner?.id === player.id;
  const isResort = tile.kind === "resort";
  const canAcquire = isOpponentCity && !isResort;
  const currentBuildIndex = tile.owner
    ? BUILD_ORDER.indexOf(tile.owner.type)
    : -1;
  const isSelectedBuildAllowed =
    !!costOption &&
    (isResort ||
      (tile.owner
        ? BUILD_ORDER.indexOf(costOption) > currentBuildIndex
        : costOption !== "landmark"));
  const isMonopoly = hasColorMonopoly(tile.owner?.id, tile.color);
  const resortTollMultiplier =
    isResort
      ? tile.resortTollMultiplier || RESORT_BASE_TOLL_MULTIPLIER
      : RESORT_BASE_TOLL_MULTIPLIER;

  return (
    <Stack sx={actionPanelSx}>
      <Typography variant="h6">
        {tile.name}
        {tile.olympicHost ? " 올림픽 개최지" : ""}
      </Typography>
      {isMonopoly && (
        <Typography color="primary" fontWeight="bold">
          독점 보너스: 통행료 2배
        </Typography>
      )}

      {isOpponentCity ? (
        <>
          <Typography>{`통행료: ${NumberToMoney(getToll(tile))}`}</Typography>
          {resortTollMultiplier > RESORT_BASE_TOLL_MULTIPLIER && (
            <Typography color="primary" fontWeight="bold">
              휴양지 성장: 통행료 {resortTollMultiplier}배
            </Typography>
          )}
          {canAcquire ? (
            <Typography>{`인수 비용: ${NumberToMoney(
              getToll(tile) + ownerCost.build * 2,
            )}`}</Typography>
          ) : (
            <Typography>휴양지는 인수할 수 없습니다.</Typography>
          )}
          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              color="inherit"
              onClick={() => onPayToll(tile)}
              disabled={!canAct}
            >
              통행료 지불
            </Button>
            {canAcquire && (
              <Button
                variant="contained"
                onClick={() => onAcquire(tile)}
                disabled={!canAct}
              >
                인수
              </Button>
            )}
          </Stack>
        </>
      ) : (
        <>
          {isOwnCity && (
            <Typography>
              {isResort
                ? "내 휴양지입니다. 다시 도착할 때마다 통행료가 1배씩 오릅니다."
                : "내 도시입니다. 더 높은 건물로 업그레이드할 수 있습니다."}
            </Typography>
          )}
          <Typography>{`가격: ${NumberToMoney(
            selectedCost?.build || 0,
          )}`}</Typography>
          <Typography>{`통행료: ${NumberToMoney(
            selectedCost?.toll || 0,
          )}`}</Typography>
          <ToggleButtonGroup
            color="primary"
            value={costOption}
            exclusive
            sx={{
              flexWrap: "nowrap",
              justifyContent: "center",
              gap: 0.5,
              maxWidth: "100%",
              overflow: "visible",
              mb: 1,
              "& .MuiToggleButtonGroup-grouped": {
                margin: "0 !important",
                borderLeft: "1px solid rgba(74,123,165,0.2) !important",
              },
              "& .MuiToggleButton-root": {
                maxHeight: 40,
                flex: "0 0 20%",
                minWidth: 72,
                minHeight: 36,
                px: 1,
                color: "#173653",
                border: "1px solid rgba(74,123,165,0.2) !important",
                borderRadius: "14px !important",
                fontWeight: 950,
                whiteSpace: "nowrap",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(235,247,252,0.94))",
                boxShadow:
                  "0 5px 0 rgba(85,139,176,0.38), inset 0 1px 0 rgba(255,255,255,0.92)",
                transition:
                  "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  background:
                    "linear-gradient(180deg, #ffffff, rgba(226,244,252,0.98))",
                },
                "&.Mui-selected": {
                  color: "#31445f",
                  borderColor: "#c8d9f0 !important",
                  background:
                    "linear-gradient(135deg, #e6f8ff 0%, #e4f2ff 36%, #f7ecff 66%, #ffdff0 100%)",
                  boxShadow:
                    "0 6px 0 rgba(139,152,202,0.58), inset 0 1px 0 rgba(255,255,255,0.9)",
                },
                "&.Mui-disabled": {
                  color: "rgba(23,54,83,0.34)",
                  borderColor: "rgba(74,123,165,0.2) !important",
                  background: "rgba(230,239,245,0.52)",
                  boxShadow: "none",
                },
              },
            }}
            onChange={(event, value) => {
              if (value) setCostOption(value);
            }}
          >
            {Object.entries(tile.costs).map(([key, cost]) => {
              const optionIndex = BUILD_ORDER.indexOf(key);
              const disabled =
                !canAct ||
                (!isResort &&
                  (isOpponentCity ||
                    (!tile.owner && key === "landmark") ||
                    (isOwnCity && optionIndex <= currentBuildIndex)));

              return (
                <ToggleButton
                  key={`cost-${tile.idx}-${key}`}
                  value={key}
                  disabled={disabled}
                >
                  {cost.label}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              color="inherit"
              onClick={onEndTurn}
              disabled={!canAct}
            >
              턴 종료
            </Button>
            {(!tile.owner || isOwnCity) && (
              <Button
                variant="contained"
                onClick={() => onBuild(tile, costOption)}
                disabled={!canAct || !isSelectedBuildAllowed}
              >
                {isOwnCity ? "업그레이드" : "구매"}
              </Button>
            )}
          </Stack>
        </>
      )}
    </Stack>
  );
};

export default TileActionPanel;
