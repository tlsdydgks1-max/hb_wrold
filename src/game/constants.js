export const blockWidth = 82;
export const blockHeight = 106;
export const cornerBlockSize = 106;
export const mapWidth = cornerBlockSize * 2 + blockWidth * 7;
export const mapHeight = cornerBlockSize * 2 + blockWidth * 7;
export const SALARY = 300000;
export const BOARD_SIZE = 32;
export const BUILD_ORDER = ["land", "villa", "building", "hotel", "landmark"];
export const MONOPOLY_TOLL_MULTIPLIER = 2;
export const RESORT_BASE_TOLL_MULTIPLIER = 1;
export const HOST_SNAPSHOT_KEY_PREFIX = "hb_world.hostGameState:";
export const APP_FULLSCREEN_CLASS = "hb-app-fullscreen";
export const BONUS_BASE_PRIZE = 100000;
export const BONUS_MAX_ROUND = 5;
export const COIN_SIDE_LABELS = {
  heads: "앞면",
  tails: "뒷면",
};
export const EMPTY_TILE_PLAYERS = Object.freeze([]);
export const EMPTY_TOLL_BONUSES = Object.freeze([]);
export const EMPTY_BOARD_TILES = Object.freeze([]);

export const BOARD_TILE_LAYOUT = Array.from({ length: BOARD_SIZE }, (_, index) => {
  const sideIndex = Math.trunc(index / 8);
  const side = ["bottom", "left", "top", "right"][sideIndex] || "bottom";
  const num = index % 8;
  const isCorner = num === 0;
  const isSideLine = side === "left" || side === "right";
  const block = isCorner
    ? { width: cornerBlockSize, height: cornerBlockSize }
    : isSideLine
      ? { width: blockHeight, height: blockWidth }
      : { width: blockWidth, height: blockHeight };
  const position = { top: 0, left: 0 };

  switch (sideIndex) {
    case 0:
      position.top = mapHeight - block.height;
      position.left = isCorner
        ? mapWidth - cornerBlockSize
        : mapWidth - cornerBlockSize - num * blockWidth;
      break;
    case 1:
      position.top = isCorner
        ? mapHeight - cornerBlockSize
        : mapHeight - cornerBlockSize - num * blockWidth;
      position.left = 0;
      break;
    case 2:
      position.top = 0;
      position.left = isCorner ? 0 : cornerBlockSize + (num - 1) * blockWidth;
      break;
    case 3:
      position.top = isCorner ? 0 : cornerBlockSize + (num - 1) * blockWidth;
      position.left = isCorner
        ? mapWidth - cornerBlockSize
        : mapWidth - blockHeight;
      break;
    default:
      break;
  }

  return { block, position, side };
});

export const getBuildingSaleValue = (tile) =>
  tile?.owner?.type
    ? Math.round((tile.costs?.[tile.owner.type]?.build || 0) * 0.8)
    : 0;
