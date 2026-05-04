import { memo } from "react";

import Block from "@/components/Block";
import {
  BOARD_TILE_LAYOUT,
  EMPTY_TILE_PLAYERS,
  EMPTY_TOLL_BONUSES,
  RESORT_BASE_TOLL_MULTIPLIER,
} from "@/game/constants";

const BuildMap = memo(function BuildMap({
  board,
  playersByPosition,
  tokenLayer,
  hasColorMonopoly,
  rollPreviewTileIdx,
  onBlockClick,
  getIsSelectable,
  selectedTileIdx,
}) {
  return board.map((item, index) => {
    const { block, position, side } = BOARD_TILE_LAYOUT[index];
    const tilePlayers =
      playersByPosition?.get(index) || EMPTY_TILE_PLAYERS;
    const tollBonuses = [];
    const resortTollMultiplier =
      item.kind === "resort"
        ? item.resortTollMultiplier || RESORT_BASE_TOLL_MULTIPLIER
        : RESORT_BASE_TOLL_MULTIPLIER;

    if (resortTollMultiplier > RESORT_BASE_TOLL_MULTIPLIER) {
      tollBonuses.push({
        key: "resortGrowth",
        label: `휴양지 ${resortTollMultiplier}배`,
        multiplier: resortTollMultiplier,
      });
    }

    if (item.olympicHost) {
      tollBonuses.push({ key: "olympic", label: "올림픽 2배", multiplier: 2 });
    }

    if (item.owner && hasColorMonopoly?.(item.owner.id, item.color)) {
      tollBonuses.push({ key: "monopoly", label: "독점 2배", multiplier: 2 });
    }

    return (
      <Block
        key={`block-${index}`}
        data={item}
        position={position}
        block={block}
        side={side}
        players={tilePlayers}
        tokenLayer={tokenLayer}
        tollBonuses={tollBonuses.length ? tollBonuses : EMPTY_TOLL_BONUSES}
        onClick={onBlockClick}
        isSelectable={getIsSelectable?.(item)}
        isSelected={selectedTileIdx === item.idx}
        isRollPreview={rollPreviewTileIdx === item.idx}
      />
    );
  });
});

export default BuildMap;
