import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./App.css";
import Block from "@/components/block";
import DiceRoller from "@/components/Dice";
import User from "@/components/user";
import { city as initialCity } from "@/data/city";
import { goldenKeyCards } from "@/data/goldenKeyCards";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { NumberToMoney } from "@/util/numberToMoney";

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import User1 from "@/assets/User1.jpg";
import User2 from "@/assets/User2.jpg";

const blockWidth = 82;
const blockHeight = 106;
const cornerBlockSize = 106;
const mapWidth = cornerBlockSize * 2 + blockWidth * 7;
const mapHeight = cornerBlockSize * 2 + blockWidth * 7;
const SALARY = 300000;
const BOARD_SIZE = 32;
const BUILD_ORDER = ["land", "villa", "building", "hotel", "landmark"];
const MONOPOLY_TOLL_MULTIPLIER = 2;
const RESORT_BASE_TOLL_MULTIPLIER = 1;
const HOST_SNAPSHOT_KEY_PREFIX = "hb_world.hostGameState:";
const APP_FULLSCREEN_CLASS = "hb-app-fullscreen";
const BONUS_BASE_PRIZE = 100000;
const BONUS_MAX_ROUND = 5;
const COIN_SIDE_LABELS = {
  heads: "앞면",
  tails: "뒷면",
};
const EMPTY_TILE_PLAYERS = Object.freeze([]);
const EMPTY_TOLL_BONUSES = Object.freeze([]);
const EMPTY_BOARD_TILES = Object.freeze([]);

const BOARD_TILE_LAYOUT = Array.from({ length: BOARD_SIZE }, (_, index) => {
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

const getBuildingSaleValue = (tile) =>
  tile?.owner?.type
    ? Math.round((tile.costs?.[tile.owner.type]?.build || 0) * 0.8)
    : 0;

const PLAYER_PRESETS = [
  {
    color: "primary.main",
    img: User1,
    tokenLabel: "1",
  },
  {
    color: "#ea2f87",
    img: User2,
    tokenLabel: "2",
  },
  {
    color: "#21a67a",
    img: User1,
    tokenLabel: "3",
  },
  {
    color: "#f19f2d",
    img: User2,
    tokenLabel: "4",
  },
];

const cloneBoard = () =>
  initialCity.map((tile) => ({
    ...tile,
    costs: tile.costs
      ? Object.fromEntries(
          Object.entries(tile.costs).map(([key, cost]) => [key, { ...cost }]),
        )
      : undefined,
  }));

const normalizePosition = (position) =>
  ((position % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;

const rollFallbackDice = () => [
  Math.floor(Math.random() * 6) + 1,
  Math.floor(Math.random() * 6) + 1,
];

const flipCoin = () => (Math.random() < 0.5 ? "heads" : "tails");

const getRollPreviewTileIdx = (player, diceValues) => {
  if (!player || !diceValues?.length) return null;

  const [first, second] = diceValues;
  if (player.position === 8 && player.stop > 0 && first !== second) {
    return player.position;
  }

  return normalizePosition(player.position + first + second);
};

const createInitialPlayers = (roomPlayers = []) =>
  roomPlayers.map((roomPlayer, index) => {
    const preset = PLAYER_PRESETS[index] || PLAYER_PRESETS[0];

    return {
      id: roomPlayer.playerId,
      name: roomPlayer.name || `플레이어 ${index + 1}`,
      img: preset.img,
      color: preset.color,
      tokenLabel: preset.tokenLabel,
      money: 2000000,
      position: 0,
      city: [],
      stop: 0,
      tollPasses: 0,
      islandPasses: 0,
      connected: roomPlayer.connected !== false,
    };
  });

const normalizeSnapshotPlayers = (snapshotPlayers = [], roomPlayers = []) =>
  snapshotPlayers.map((player, index) => {
    const preset = PLAYER_PRESETS[index] || PLAYER_PRESETS[0];
    const roomPlayer = roomPlayers.find((item) => item.playerId === player.id);

    return {
      ...player,
      img: preset.img,
      color: player.color || preset.color,
      tokenLabel: player.tokenLabel || preset.tokenLabel,
      stop: player.stop ?? 0,
      tollPasses: player.tollPasses ?? 0,
      islandPasses: player.islandPasses ?? 0,
      connected: roomPlayer ? roomPlayer.connected !== false : player.connected,
    };
  });

const readHostSnapshot = (roomCode) => {
  if (!roomCode) return null;

  try {
    const value = sessionStorage.getItem(
      `${HOST_SNAPSHOT_KEY_PREFIX}${roomCode}`,
    );
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getNativeFullscreenElement = () =>
  document.fullscreenElement || document.webkitFullscreenElement || null;

const getRequestFullscreen = (element) =>
  element.requestFullscreen || element.webkitRequestFullscreen;

const getExitFullscreen = () =>
  document.exitFullscreen || document.webkitExitFullscreen;

const setAppFullscreenFallback = (enabled) => {
  document.documentElement.classList.toggle(APP_FULLSCREEN_CLASS, enabled);
  document.body?.classList.toggle(APP_FULLSCREEN_CLASS, enabled);

  if (enabled) {
    window.scrollTo?.(0, 0);
  }
};

const isAppFullscreenFallback = () =>
  document.documentElement.classList.contains(APP_FULLSCREEN_CLASS);

function App() {
  const {
    connectionStatus,
    room,
    localPlayerId,
    isHost,
    lastEvent,
    error: multiplayerError,
    createRoom,
    joinRoom,
    startGame,
    sendPlayerCommand,
    sendGameSnapshot,
    clearRoomSession,
  } = useMultiplayer();
  const diceRollerRef = useRef(null);
  const pendingRollAnimationsRef = useRef(new Map());
  const [tokenLayer, setTokenLayer] = useState(null);
  const [view, setView] = useState("landing");
  const [createForm, setCreateForm] = useState({ name: "", maxPlayers: 2 });
  const [joinForm, setJoinForm] = useState({ name: "", roomCode: "" });
  const [gameStarted, setGameStarted] = useState(false);
  const [board, setBoard] = useState(cloneBoard);
  const [players, setPlayers] = useState([]);
  const [turn, setTurn] = useState("");
  const [isAction, setIsAction] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [diceReady, setDiceReady] = useState(false);
  const [diceError, setDiceError] = useState(null);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [lastRollId, setLastRollId] = useState(null);
  const [rollPreviewTileIdx, setRollPreviewTileIdx] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedOlympicCity, setSelectedOlympicCity] = useState("");
  const [selectedInfoTileIdx, setSelectedInfoTileIdx] = useState(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [winner, setWinner] = useState(null);
  const [displayGoldenKeyCard, setDisplayGoldenKeyCard] = useState(null);
  const [displayDestinationTile, setDisplayDestinationTile] = useState(null);
  const [displayOlympicTile, setDisplayOlympicTile] = useState(null);
  const [displayWinner, setDisplayWinner] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isToolDrawerOpen, setIsToolDrawerOpen] = useState(false);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((player) => [player.id, player])),
    [players],
  );
  const playersByPosition = useMemo(() => {
    const nextPlayersByPosition = new Map();

    players.forEach((player) => {
      const tilePlayers =
        nextPlayersByPosition.get(player.position) || [];
      tilePlayers.push(player);
      nextPlayersByPosition.set(player.position, tilePlayers);
    });

    return nextPlayersByPosition;
  }, [players]);
  const playerPanelStyles = useMemo(
    () =>
      Array.from({ length: players.length }, (_, index) =>
        getPlayerPanelSx(index, players.length),
      ),
    [players.length],
  );
  const activePlayer = playersById[turn] || players[0] || null;
  const canAct = gameStarted && localPlayerId === turn && !winner;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const updateFullscreenState = () => {
      setIsFullscreen(
        Boolean(getNativeFullscreenElement()) || isAppFullscreenFallback(),
      );
    };

    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);
    window.addEventListener("resize", updateFullscreenState);
    window.addEventListener("orientationchange", updateFullscreenState);
    window.visualViewport?.addEventListener("resize", updateFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener(
        "webkitfullscreenchange",
        updateFullscreenState,
      );
      window.removeEventListener("resize", updateFullscreenState);
      window.removeEventListener("orientationchange", updateFullscreenState);
      window.visualViewport?.removeEventListener(
        "resize",
        updateFullscreenState,
      );
      setAppFullscreenFallback(false);
    };
  }, []);

  useEffect(() => {
    if (winner) return;

    const loser = players.find((player) => player.money < 0);
    if (loser) {
      const winnerPlayer = players
        .filter((player) => player.id !== loser.id)
        .sort((first, second) => second.money - first.money)[0];
      setWinner({
        ...winnerPlayer,
        victoryType: "bankruptcy",
        loser,
      });
      setPendingAction(null);
      setIsAction(false);
    }
  }, [players, winner]);

  useEffect(() => {
    if (winner) {
      setDisplayWinner(winner);
    }
  }, [winner]);

  useEffect(() => {
    if (pendingAction?.type === "goldenKey") {
      setDisplayGoldenKeyCard(pendingAction.card);
    }
  }, [pendingAction]);

  const restartGame = () => {
    const nextPlayers = createInitialPlayers(room?.players || []);
    setBoard(cloneBoard());
    setPlayers(nextPlayers);
    setTurn(
      nextPlayers[Math.floor(Math.random() * Math.max(nextPlayers.length, 1))]
        ?.id || "",
    );
    setIsAction(false);
    setIsMoving(false);
    setIsRolling(false);
    setDice1(1);
    setDice2(1);
    setLastRollId(null);
    setRollPreviewTileIdx(null);
    setPendingAction(null);
    setSelectedDestination("");
    setSelectedOlympicCity("");
    setSelectedInfoTileIdx(null);
    setIsInfoDialogOpen(false);
    setWinner(null);
    setDisplayGoldenKeyCard(null);
    setDisplayDestinationTile(null);
    setDisplayOlympicTile(null);
  };

  const setPlayerById = (playerId, updater) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === playerId
          ? typeof updater === "function"
            ? updater(player)
            : updater
          : player,
      ),
    );
  };

  const updatePlayerMoney = (playerId, amount) => {
    setPlayerById(playerId, (player) => ({
      ...player,
      money: player.money + amount,
    }));
  };

  const transferMoney = (fromId, toId, amount) => {
    updatePlayerMoney(fromId, -amount);
    updatePlayerMoney(toId, amount);
  };

  const setMessage = (title, description) => {
    setPendingAction({ type: "message", title, description });
  };

  const handleDiceError = useCallback((error) => {
    setDiceError(error);
  }, []);

  const toggleFullscreen = async () => {
    if (typeof document === "undefined") return;

    if (getNativeFullscreenElement()) {
      const exitFullscreen = getExitFullscreen();
      if (exitFullscreen) {
        await exitFullscreen.call(document).catch(() => {});
      }
      setAppFullscreenFallback(false);
      setIsFullscreen(false);
      return;
    }

    if (isAppFullscreenFallback()) {
      setAppFullscreenFallback(false);
      setIsFullscreen(false);
      return;
    }

    const requestFullscreen = getRequestFullscreen(document.documentElement);

    if (requestFullscreen) {
      try {
        await requestFullscreen.call(document.documentElement);
        setIsFullscreen(true);
        return;
      } catch {
        // iOS Safari can expose the API but reject it for non-video elements.
      }
    }

    setAppFullscreenFallback(true);
    setIsFullscreen(true);
  };

  const handleFullscreenAction = () => {
    toggleFullscreen();
  };

  const handleRestartGame = () => {
    if (!isHost || isMoving || isRolling) return;

    restartGame();
    setIsToolDrawerOpen(false);
  };

  const getNextPlayerId = (playerId) => {
    if (!players.length) return playerId;

    const currentIndex = players.findIndex((player) => player.id === playerId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    return players[(safeIndex + 1) % players.length]?.id || playerId;
  };

  const endTurn = () => {
    setPendingAction(null);
    setRollPreviewTileIdx(null);
    setSelectedDestination("");
    setSelectedOlympicCity("");
    setSelectedInfoTileIdx(null);
    setIsInfoDialogOpen(false);
    setIsAction(false);
    if (dice1 !== dice2) {
      setTurn((current) => getNextPlayerId(current));
    }
  };

  const animateMovement = (playerId, steps) =>
    new Promise((resolve) => {
      if (!steps) {
        resolve();
        return;
      }

      setIsMoving(true);
      const direction = steps > 0 ? 1 : -1;
      const totalSteps = Math.abs(steps);
      let stepCount = 0;

      const interval = setInterval(() => {
        stepCount += 1;
        setPlayerById(playerId, (player) => ({
          ...player,
          position: normalizePosition(player.position + direction),
        }));

        if (stepCount >= totalSteps) {
          clearInterval(interval);
          setIsMoving(false);
          resolve();
        }
      }, 250);
    });

  const movePlayer = async (playerId, steps, options = {}) => {
    const player = playersById[playerId];
    if (!player) return;
    const passedStart = steps > 0 && player.position + steps >= BOARD_SIZE;
    const finalPosition = normalizePosition(player.position + steps);

    await animateMovement(playerId, steps);

    if (passedStart || options.salary) {
      updatePlayerMoney(playerId, SALARY);
    }

    resolveTile(playerId, board[finalPosition]);
  };

  const movePlayerTo = async (playerId, targetPosition, options = {}) => {
    const player = playersById[playerId];
    if (!player) return;
    let steps = targetPosition - player.position;

    if (options.forward !== false && steps <= 0) {
      steps += BOARD_SIZE;
    }

    await movePlayer(playerId, steps, options);
  };

  const playDiceAnimation = (diceValues) => {
    setIsRolling(true);

    return Promise.resolve(
      diceRollerRef.current?.show?.(diceValues) ?? diceValues,
    )
      .catch((error) => {
        handleDiceError(error);
        return diceValues;
      })
      .finally(() => {
        setIsRolling(false);
      });
  };

  const trackRollAnimation = (rollId, animationPromise) => {
    pendingRollAnimationsRef.current.set(rollId, animationPromise);
    animationPromise.finally(() => {
      pendingRollAnimationsRef.current.delete(rollId);
    });
  };

  const rollDice = () => {
    if (!canAct || isAction || isMoving || isRolling || !diceReady) return;

    const diceValues = rollFallbackDice();
    const rollId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    displayedRollIdRef.current = rollId;
    setDice1(diceValues[0]);
    setDice2(diceValues[1]);
    setLastRollId(rollId);
    setRollPreviewTileIdx(getRollPreviewTileIdx(activePlayer, diceValues));
    trackRollAnimation(rollId, playDiceAnimation(diceValues));

    requestCommand({
      type: "roll_dice",
      diceValues,
      rollId,
    });
  };

  const applyDiceRoll = async (playerId, diceValues) => {
    if (winner || isAction || isMoving || !diceValues) return;

    const [num1, num2] = diceValues;
    const player = playersById[playerId];
    if (!player) return;

    setDice1(num1);
    setDice2(num2);
    setIsAction(true);

    if (player.position === 8 && player.stop > 0) {
      if (num1 === num2) {
        setPlayerById(playerId, (current) => ({ ...current, stop: 0 }));
        setMessage("무인도 탈출", "더블이 나와 무인도에서 탈출합니다.");
        await movePlayer(playerId, num1 + num2);
      } else {
        const nextStop = player.stop - 1;
        setPlayerById(playerId, (current) => ({ ...current, stop: nextStop }));
        setRollPreviewTileIdx(null);
        setMessage(
          "무인도 대기",
          nextStop
            ? `탈출 실패. ${nextStop}턴 뒤 자동으로 탈출합니다.`
            : "탈출 실패. 다음 차례부터 이동할 수 있습니다.",
        );
      }
      return;
    }

    await movePlayer(playerId, num1 + num2);
  };

  const resolveTile = (playerId, tile) => {
    setRollPreviewTileIdx(null);

    if (!tile) {
      setMessage("도착", "이번 칸에는 특별한 행동이 없습니다.");
      return;
    }

    switch (tile.kind) {
      case "city":
        setPendingAction({ type: "tile", tileIdx: tile.idx });
        break;
      case "resort":
        if (tile.owner?.id === playerId) {
          growResortToll(playerId, tile);
        } else {
          setPendingAction({ type: "tile", tileIdx: tile.idx });
        }
        break;
      case "goldenKey": {
        const card =
          goldenKeyCards[Math.floor(Math.random() * goldenKeyCards.length)];
        setPendingAction({ type: "goldenKey", card });
        applyGoldenKey(playerId, card);
        break;
      }
      case "worldTravel":
        setPendingAction({ type: "worldTravel" });
        break;
      case "olympic": {
        const ownedCities = getOwnedBuildableTiles(playerId);
        if (ownedCities.length) {
          setPendingAction({ type: "olympic" });
        } else {
          setMessage(
            "올림픽 개최 불가",
            "소유한 도시가 없어 개최지를 선택할 수 없습니다.",
          );
        }
        break;
      }
      case "island": {
        const player = playersById[playerId];

        if ((player?.islandPasses || 0) > 0) {
          setPlayerById(playerId, (current) => ({
            ...current,
            islandPasses: Math.max((current.islandPasses || 0) - 1, 0),
          }));
          setMessage(
            "무인도 탈출권 사용",
            "무인도에 도착했지만 탈출권을 사용해 바로 빠져나왔습니다.",
          );
          break;
        }

        setPlayerById(playerId, (current) => ({ ...current, stop: 3 }));
        setMessage(
          "무인도 도착",
          "3턴 동안 대기합니다. 더블이 나오면 바로 탈출합니다.",
        );
        break;
      }
      case "tax":
        {
          const ownedCount = getOwnedBuildableTiles(playerId).length;
          const tax = 100000 + ownedCount * 50000;
          updatePlayerMoney(playerId, -tax);
          setMessage(
            "국세청",
            `보유 도시 ${ownedCount}개 기준으로 ${NumberToMoney(
              tax,
            )}을 납부했습니다.`,
          );
        }
        break;
      case "bonus":
        setPendingAction({
          type: "bonusGame",
          round: 1,
          prize: BONUS_BASE_PRIZE,
          result: null,
          selectedSide: null,
          coinSide: null,
        });
        break;
      case "start":
      default:
        setMessage(tile.name, "이번 칸에는 특별한 행동이 없습니다.");
        break;
    }
  };

  const applyFreeUpgrade = (playerId) => {
    const targetTile = board.find((tile) => {
      const buildIndex = BUILD_ORDER.indexOf(tile.owner?.type);

      return (
        tile.kind === "city" &&
        tile.owner?.id === playerId &&
        buildIndex >= 0 &&
        buildIndex < BUILD_ORDER.length - 1
      );
    });

    if (!targetTile) {
      updatePlayerMoney(playerId, 100000);
      return;
    }

    const nextType =
      BUILD_ORDER[BUILD_ORDER.indexOf(targetTile.owner.type) + 1];

    setBoard((currentBoard) =>
      currentBoard.map((tile) =>
        tile.idx === targetTile.idx
          ? {
              ...tile,
              owner: {
                ...tile.owner,
                type: nextType,
              },
            }
          : tile,
      ),
    );
    setPlayerById(playerId, (player) => ({
      ...player,
      city: player.city.map((item) =>
        item.idx === targetTile.idx ? { ...item, type: nextType } : item,
      ),
    }));
  };

  const growResortToll = (playerId, tile) => {
    if (tile.kind !== "resort" || tile.owner?.id !== playerId) return;

    const nextMultiplier =
      (tile.resortTollMultiplier || RESORT_BASE_TOLL_MULTIPLIER) + 1;

    setBoard((currentBoard) =>
      currentBoard.map((item) =>
        item.idx === tile.idx
          ? {
              ...item,
              resortTollMultiplier: nextMultiplier,
            }
          : item,
      ),
    );
    setMessage(
      "휴양지 통행료 상승",
      `${tile.name}에 다시 도착해 통행료가 ${nextMultiplier}배로 올랐습니다.`,
    );
  };

  const swapPlayerPositions = (playerId, otherId) => {
    if (playerId === otherId) return;
    const player = playersById[playerId];
    const otherPlayer = playersById[otherId];

    if (!player || !otherPlayer) return;

    setPlayers((currentPlayers) =>
      currentPlayers.map((current) =>
        current.id === playerId
          ? { ...current, position: otherPlayer.position }
          : current.id === otherId
            ? { ...current, position: player.position }
            : current,
      ),
    );
  };

  const applyGoldenKey = (playerId, card) => {
    const effect = card.effect;
    const otherId = getNextPlayerId(playerId);

    switch (effect.type) {
      case "money":
        updatePlayerMoney(playerId, effect.amount);
        break;
      case "transfer":
        if (effect.direction === "toOpponent") {
          transferMoney(playerId, otherId, effect.amount);
        } else {
          transferMoney(otherId, playerId, effect.amount);
        }
        break;
      case "tollPass":
        setPlayerById(playerId, (player) => ({
          ...player,
          tollPasses: player.tollPasses + 1,
        }));
        break;
      case "freeUpgrade":
        applyFreeUpgrade(playerId);
        break;
      case "swapPosition":
        swapPlayerPositions(playerId, otherId);
        break;
      case "islandPass":
        setPlayerById(playerId, (player) => ({
          ...player,
          islandPasses: (player.islandPasses || 0) + 1,
        }));
        break;
      default:
        break;
    }
  };

  const submitBonusGuess = (playerId, selectedSide) => {
    if (pendingAction?.type !== "bonusGame" || pendingAction.result) return;

    const coinSide = flipCoin();

    if (selectedSide !== coinSide) {
      setMessage(
        "보너스 실패",
        `${COIN_SIDE_LABELS[selectedSide]}을 선택했지만 ${COIN_SIDE_LABELS[coinSide]}이 나왔습니다. 쌓아온 상금은 받을 수 없습니다.`,
      );
      return;
    }

    setPendingAction({
      ...pendingAction,
      selectedSide,
      coinSide,
      result: "win",
      playerId,
    });
  };

  const collectBonusPrize = (playerId) => {
    if (pendingAction?.type !== "bonusGame" || pendingAction.result !== "win") {
      return;
    }

    updatePlayerMoney(playerId, pendingAction.prize);
    setMessage(
      "보너스 상금 수령",
      `${NumberToMoney(pendingAction.prize)}을 받았습니다.`,
    );
  };

  const continueBonusRound = () => {
    if (
      pendingAction?.type !== "bonusGame" ||
      pendingAction.result !== "win" ||
      pendingAction.round >= BONUS_MAX_ROUND
    ) {
      return;
    }

    setPendingAction({
      type: "bonusGame",
      round: pendingAction.round + 1,
      prize: pendingAction.prize * 2,
      result: null,
      selectedSide: null,
      coinSide: null,
    });
  };

  const resolveGoldenKeyMovement = async () => {
    const card = pendingAction?.card;
    const effect = card?.effect;
    setPendingAction(null);

    if (effect?.type === "moveTo") {
      await movePlayerTo(turn, effect.position, { salary: effect.salary });
      return;
    }

    if (effect?.type === "moveBy") {
      await movePlayer(turn, effect.steps, { forward: false });
      return;
    }

    if (effect?.type === "goToIsland") {
      await movePlayerTo(turn, 8);
      return;
    }

    endTurn();
  };

  const openSellBuildingsAction = ({
    purchaseType,
    tile,
    requiredAmount,
    buildType = "",
  }) => {
    const player = playersById[turn];
    if (!player || !tile) return;

    setPendingAction({
      type: "sellBuildings",
      purchaseType,
      tileIdx: tile.idx,
      buildType,
      requiredAmount,
      shortfall: Math.max(requiredAmount - player.money, 0),
    });
  };

  const restoreTileActionFromSale = (saleAction = pendingAction) => {
    if (!saleAction?.tileIdx && saleAction?.tileIdx !== 0) return;

    setPendingAction({
      type: "tile",
      tileIdx: saleAction.tileIdx,
      defaultBuildType: saleAction.buildType || "",
    });
  };

  const sellBuildings = (tileIdxs = []) => {
    if (pendingAction?.type !== "sellBuildings") return;

    const selectedTileIdxs = new Set(
      tileIdxs.map((tileIdx) => Number(tileIdx)),
    );
    const soldTiles = board.filter(
      (tile) =>
        selectedTileIdxs.has(tile.idx) &&
        tile.owner?.id === turn &&
        getBuildingSaleValue(tile) > 0,
    );
    const saleTotal = soldTiles.reduce(
      (total, tile) => total + getBuildingSaleValue(tile),
      0,
    );

    if (saleTotal > 0) {
      const soldTileIdxs = new Set(soldTiles.map((tile) => tile.idx));

      setBoard((currentBoard) =>
        currentBoard.map((tile) =>
          soldTileIdxs.has(tile.idx)
            ? {
                ...tile,
                owner: undefined,
                olympicHost: false,
                ...(tile.kind === "resort"
                  ? { resortTollMultiplier: RESORT_BASE_TOLL_MULTIPLIER }
                  : {}),
              }
            : tile,
        ),
      );
      setPlayerById(turn, (current) => ({
        ...current,
        money: current.money + saleTotal,
        city: current.city.filter((item) => !soldTileIdxs.has(item.idx)),
      }));
    }

    restoreTileActionFromSale();
  };

  const buildCity = (tile, type) => {
    const player = playersById[turn];
    if (!player) return;
    const cost = tile.costs[type];
    if (!cost) return;

    if (cost.build > player.money) {
      openSellBuildingsAction({
        purchaseType: "build",
        tile,
        buildType: type,
        requiredAmount: cost.build,
      });
      return;
    }

    const isUpgrade = tile.owner?.id === player.id;

    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((item) =>
        item.idx === tile.idx
          ? {
              ...item,
              owner: {
                id: player.id,
                name: player.name,
                color: player.color,
                type,
              },
              ...(item.kind === "resort"
                ? { resortTollMultiplier: RESORT_BASE_TOLL_MULTIPLIER }
                : {}),
            }
          : item,
      );

      if (tile.kind === "resort" && ownsAllResorts(player.id, nextBoard)) {
        setWinner(player);
      }

      return nextBoard;
    });
    setPlayerById(turn, (current) => ({
      ...current,
      money: current.money - cost.build,
      city: isUpgrade
        ? current.city.map((item) =>
            item.idx === tile.idx ? { ...item, type } : item,
          )
        : [...current.city, { idx: tile.idx, name: tile.name, type }],
    }));
    endTurn();
  };

  const payToll = (tile) => {
    const player = playersById[turn];
    if (!player) return;
    const ownerId = tile.owner.id;
    const cost = getToll(tile);

    if (player.tollPasses > 0) {
      setPlayerById(turn, (current) => ({
        ...current,
        tollPasses: current.tollPasses - 1,
      }));
      setMessage("통행료 면제", "통행료 면제권을 사용했습니다.");
      return;
    }

    transferMoney(turn, ownerId, cost);
    endTurn();
  };

  const acquireCity = (tile) => {
    if (tile.kind === "resort") {
      setMessage("휴양지 인수 불가", "휴양지는 상대에게서 인수할 수 없습니다.");
      return;
    }

    const player = playersById[turn];
    if (!player) return;
    const ownerId = tile.owner.id;
    const buildCost = tile.costs[tile.owner.type].build;
    const toll = getToll(tile);
    const acquisitionCost = toll + buildCost * 2;

    if (acquisitionCost > player.money) {
      openSellBuildingsAction({
        purchaseType: "acquire",
        tile,
        requiredAmount: acquisitionCost,
      });
      return;
    }

    transferMoney(turn, ownerId, acquisitionCost);
    setBoard((currentBoard) =>
      currentBoard.map((item) =>
        item.idx === tile.idx
          ? {
              ...item,
              owner: {
                id: player.id,
                name: player.name,
                color: player.color,
                type: tile.owner.type,
              },
            }
          : item,
      ),
    );
    setPlayerById(turn, (current) => ({
      ...current,
      city: [
        ...current.city,
        { idx: tile.idx, name: tile.name, type: tile.owner.type },
      ],
    }));
    setPlayerById(ownerId, (current) => ({
      ...current,
      city: current.city.filter((item) => item.idx !== tile.idx),
    }));
    endTurn();
  };

  const monopolyKeys = useMemo(() => {
    const tilesByColor = new Map();

    board.forEach((tile) => {
      if (
        !tile.color ||
        (tile.kind !== "city" && tile.kind !== "resort")
      ) {
        return;
      }

      const colorGroup =
        tilesByColor.get(tile.color) || {
          total: 0,
          ownerCounts: new Map(),
        };
      colorGroup.total += 1;

      if (tile.owner?.id) {
        colorGroup.ownerCounts.set(
          tile.owner.id,
          (colorGroup.ownerCounts.get(tile.owner.id) || 0) + 1,
        );
      }

      tilesByColor.set(tile.color, colorGroup);
    });

    const nextMonopolyKeys = new Set();

    tilesByColor.forEach((colorGroup, color) => {
      if (colorGroup.total <= 1) return;

      colorGroup.ownerCounts.forEach((ownedCount, playerId) => {
        if (ownedCount === colorGroup.total) {
          nextMonopolyKeys.add(`${playerId}:${color}`);
        }
      });
    });

    return nextMonopolyKeys;
  }, [board]);

  const hasColorMonopoly = useCallback(
    (playerId, color) =>
      Boolean(playerId && color && monopolyKeys.has(`${playerId}:${color}`)),
    [monopolyKeys],
  );

  const ownedBuildableTilesByPlayer = useMemo(() => {
    const nextOwnedTiles = new Map();

    board.forEach((tile) => {
      if (
        (tile.kind !== "city" && tile.kind !== "resort") ||
        !tile.owner?.id
      ) {
        return;
      }

      const ownerTiles = nextOwnedTiles.get(tile.owner.id) || [];
      ownerTiles.push(tile);
      nextOwnedTiles.set(tile.owner.id, ownerTiles);
    });

    return nextOwnedTiles;
  }, [board]);

  const getOwnedBuildableTiles = useCallback(
    (playerId) => ownedBuildableTilesByPlayer.get(playerId) || EMPTY_BOARD_TILES,
    [ownedBuildableTilesByPlayer],
  );

  const getToll = (tile) => {
    if (!tile?.owner) return 0;
    const baseToll = tile.costs[tile.owner.type].toll;
    const resortBonus =
      tile.kind === "resort"
        ? tile.resortTollMultiplier || RESORT_BASE_TOLL_MULTIPLIER
        : 1;
    const olympicBonus = tile.olympicHost ? 2 : 1;
    const monopolyBonus = hasColorMonopoly(tile.owner.id, tile.color)
      ? MONOPOLY_TOLL_MULTIPLIER
      : 1;

    return Math.round(baseToll * resortBonus * olympicBonus * monopolyBonus);
  };

  const ownsAllResorts = (playerId, targetBoard = board) => {
    const resorts = targetBoard.filter((tile) => tile.kind === "resort");

    return (
      resorts.length > 0 && resorts.every((tile) => tile.owner?.id === playerId)
    );
  };

  const worldTravelDestinations = useMemo(
    () => board.filter((tile) => tile.kind !== "worldTravel"),
    [board],
  );
  const selectedInfoTile = useMemo(
    () => board.find((tile) => tile.idx === selectedInfoTileIdx),
    [board, selectedInfoTileIdx],
  );

  const isWorldTravelTarget = useCallback(
    (tile) =>
      pendingAction?.type === "worldTravel" && tile.kind !== "worldTravel",
    [pendingAction?.type],
  );

  const isOlympicTarget = useCallback(
    (tile) =>
      pendingAction?.type === "olympic" &&
      (tile.kind === "city" || tile.kind === "resort") &&
      tile.owner?.id === turn,
    [pendingAction?.type, turn],
  );

  const getIsSelectable = useCallback(
    (tile) => isWorldTravelTarget(tile) || isOlympicTarget(tile),
    [isOlympicTarget, isWorldTravelTarget],
  );

  const handleBlockClick = useCallback((tile) => {
    if (!tile) return;

    if (canAct && isWorldTravelTarget(tile)) {
      setSelectedDestination(String(tile.idx));
      setDisplayDestinationTile(tile);
      return;
    }

    if (canAct && isOlympicTarget(tile)) {
      setSelectedOlympicCity(String(tile.idx));
      setDisplayOlympicTile(tile);
      return;
    }

    if (tile.kind === "city" || tile.kind === "resort") {
      setSelectedInfoTileIdx(tile.idx);
      setIsInfoDialogOpen(true);
    }
  }, [canAct, isOlympicTarget, isWorldTravelTarget]);

  const closeTileInfo = () => {
    setIsInfoDialogOpen(false);
  };

  const cancelWorldTravelSelection = () => {
    setSelectedDestination("");
  };

  const selectWorldTravelDestination = () => {
    const destination = Number(selectedDestination);
    if (Number.isNaN(destination)) return;
    requestCommand({ type: "select_world_travel", tileIdx: destination });
  };

  const applyWorldTravelDestination = async (playerId, destination) => {
    if (Number.isNaN(destination)) return;
    setPendingAction(null);
    setSelectedDestination("");
    await movePlayerTo(playerId, destination);
  };

  const cancelOlympicSelection = () => {
    setSelectedOlympicCity("");
  };

  const selectOlympicCity = () => {
    const destination = Number(selectedOlympicCity);
    if (Number.isNaN(destination)) return;
    requestCommand({ type: "select_olympic_city", tileIdx: destination });
  };

  const applyOlympicCity = (destination) => {
    if (Number.isNaN(destination)) return;

    setBoard((currentBoard) =>
      currentBoard.map((tile) => ({
        ...tile,
        olympicHost: tile.idx === destination,
      })),
    );
    setSelectedOlympicCity("");
    setMessage(
      "올림픽 개최",
      `${
        board.find((tile) => tile.idx === destination)?.name
      }의 통행료가 2배가 됩니다.`,
    );
  };

  const applySnapshot = (snapshot) => {
    if (!snapshot) return;

    setBoard(snapshot.board || cloneBoard());
    setPlayers(
      normalizeSnapshotPlayers(snapshot.players || [], room?.players || []),
    );
    setTurn(snapshot.turn || "");
    setIsAction(!!snapshot.isAction);
    setIsMoving(!!snapshot.isMoving);
    setIsRolling(!!snapshot.isRolling);
    setDice1(snapshot.dice1 || 1);
    setDice2(snapshot.dice2 || 1);
    setLastRollId(snapshot.lastRollId || null);
    setRollPreviewTileIdx(snapshot.rollPreviewTileIdx ?? null);
    setPendingAction(snapshot.pendingAction || null);
    setWinner(snapshot.winner || null);
    setGameStarted(!!snapshot.gameStarted);
    setView("game");
  };

  const initializeGame = (targetRoom) => {
    const nextPlayers = createInitialPlayers(targetRoom?.players || []);
    const firstTurn =
      nextPlayers[Math.floor(Math.random() * Math.max(nextPlayers.length, 1))]
        ?.id || "";

    setBoard(cloneBoard());
    setPlayers(nextPlayers);
    setTurn(firstTurn);
    setIsAction(false);
    setIsMoving(false);
    setIsRolling(false);
    setDice1(1);
    setDice2(1);
    setLastRollId(null);
    setRollPreviewTileIdx(null);
    setPendingAction(null);
    setSelectedDestination("");
    setSelectedOlympicCity("");
    setWinner(null);
    setGameStarted(true);
    setView("game");
  };

  const executeCommand = async (command, actorId) => {
    if (!isHost || !command || actorId !== turn || winner || isMoving) return;

    switch (command.type) {
      case "roll_dice": {
        const diceValues = command.diceValues || rollFallbackDice();
        const rollId =
          command.rollId ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let animationPromise = pendingRollAnimationsRef.current.get(rollId);

        setDice1(diceValues[0]);
        setDice2(diceValues[1]);
        setLastRollId(rollId);
        setRollPreviewTileIdx(
          getRollPreviewTileIdx(playersById[actorId], diceValues),
        );

        if (!animationPromise) {
          animationPromise = playDiceAnimation(diceValues);
          trackRollAnimation(rollId, animationPromise);
        }

        await animationPromise;
        await applyDiceRoll(actorId, diceValues);
        break;
      }
      case "build_city": {
        const tile = board.find((item) => item.idx === command.tileIdx);
        if (tile) buildCity(tile, command.buildType);
        break;
      }
      case "pay_toll": {
        const tile = board.find((item) => item.idx === command.tileIdx);
        if (tile) payToll(tile);
        break;
      }
      case "acquire_city": {
        const tile = board.find((item) => item.idx === command.tileIdx);
        if (tile) acquireCity(tile);
        break;
      }
      case "sell_buildings":
        sellBuildings(command.tileIdxs);
        break;
      case "cancel_sell_buildings":
        restoreTileActionFromSale();
        break;
      case "bonus_guess":
        submitBonusGuess(actorId, command.selectedSide);
        break;
      case "bonus_collect":
        collectBonusPrize(actorId);
        break;
      case "bonus_continue":
        continueBonusRound();
        break;
      case "resolve_golden_key":
        await resolveGoldenKeyMovement();
        break;
      case "select_world_travel":
        await applyWorldTravelDestination(actorId, Number(command.tileIdx));
        break;
      case "select_olympic_city":
        applyOlympicCity(Number(command.tileIdx));
        break;
      case "end_turn":
        endTurn();
        break;
      default:
        break;
    }
  };

  const requestCommand = (command) => {
    if (!canAct) return;

    if (isHost) {
      executeCommand(command, localPlayerId);
      return;
    }

    sendPlayerCommand(command);
  };

  const snapshot = useMemo(
    () => ({
      gameStarted,
      board,
      players,
      turn,
      isAction,
      isMoving,
      isRolling,
      dice1,
      dice2,
      lastRollId,
      rollPreviewTileIdx,
      pendingAction,
      winner,
    }),
    [
      board,
      dice1,
      dice2,
      gameStarted,
      isAction,
      isMoving,
      isRolling,
      lastRollId,
      rollPreviewTileIdx,
      pendingAction,
      players,
      turn,
      winner,
    ],
  );

  const handledEventIdRef = useRef(null);
  const displayedRollIdRef = useRef(null);
  const snapshotSyncTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (snapshotSyncTimeoutRef.current) {
        window.clearTimeout(snapshotSyncTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!lastEvent || handledEventIdRef.current === lastEvent.eventId) return;

    handledEventIdRef.current = lastEvent.eventId;

    switch (lastEvent.type) {
      case "room_created":
      case "join_accepted":
      case "reconnect": {
        const targetRoom = lastEvent.payload?.room;
        const enteringGame = targetRoom?.status === "game";
        setView(enteringGame ? "game" : "lobby");
        setGameStarted(enteringGame);
        if (enteringGame && isHost) {
          const savedSnapshot = readHostSnapshot(targetRoom.code);
          if (savedSnapshot) {
            applySnapshot(savedSnapshot);
          }
        }
        break;
      }
      case "start_game": {
        const targetRoom = lastEvent.payload?.room;
        setView("game");
        setGameStarted(true);
        if (isHost) {
          const savedSnapshot = readHostSnapshot(targetRoom?.code);
          if (savedSnapshot) {
            applySnapshot(savedSnapshot);
          } else {
            initializeGame(targetRoom);
          }
        }
        break;
      }
      case "game_snapshot":
        if (!isHost) {
          applySnapshot(lastEvent.payload?.snapshot);
        }
        break;
      case "player_command":
        executeCommand(lastEvent.payload, lastEvent.playerId);
        break;
      case "join_rejected":
        setView("landing");
        setGameStarted(false);
        break;
      default:
        break;
    }
    // The event id guard prevents replay while these handlers read latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent, isHost]);

  useEffect(() => {
    if (!gameStarted || !room?.players?.length) return;

    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => {
        const roomPlayer = room.players.find(
          (candidate) => candidate.playerId === player.id,
        );

        return roomPlayer
          ? { ...player, connected: roomPlayer.connected !== false }
          : player;
      }),
    );
  }, [gameStarted, room?.players]);

  useEffect(() => {
    if (!isHost || !gameStarted || !room?.code || !players.length) return;

    sessionStorage.setItem(
      `${HOST_SNAPSHOT_KEY_PREFIX}${room.code}`,
      JSON.stringify(snapshot),
    );

    if (snapshotSyncTimeoutRef.current) {
      window.clearTimeout(snapshotSyncTimeoutRef.current);
    }

    snapshotSyncTimeoutRef.current = window.setTimeout(
      () => {
        sendGameSnapshot(snapshot);
        snapshotSyncTimeoutRef.current = null;
      },
      isMoving || isRolling ? 160 : 0,
    );

    return () => {
      if (snapshotSyncTimeoutRef.current) {
        window.clearTimeout(snapshotSyncTimeoutRef.current);
        snapshotSyncTimeoutRef.current = null;
      }
    };
  }, [
    gameStarted,
    isHost,
    isMoving,
    isRolling,
    players.length,
    room?.code,
    sendGameSnapshot,
    snapshot,
  ]);

  useEffect(() => {
    if (
      isHost ||
      !diceReady ||
      !gameStarted ||
      !lastRollId ||
      displayedRollIdRef.current === lastRollId
    ) {
      return;
    }

    displayedRollIdRef.current = lastRollId;
    diceRollerRef.current?.show?.([dice1, dice2]);
  }, [dice1, dice2, diceReady, gameStarted, isHost, lastRollId]);

  const activeTile = activePlayer ? board[activePlayer.position] : null;
  const isDiceDisabled =
    !canAct || !!winner || isAction || isMoving || isRolling || !diceReady;
  const sellableBuildings =
    pendingAction?.type === "sellBuildings"
      ? getOwnedBuildableTiles(turn).filter(
          (tile) => tile.idx !== pendingAction.tileIdx,
        )
      : [];
  const selectionGuide =
    pendingAction?.type === "worldTravel"
      ? {
          title: "세계여행",
          description: "이동할 블록을 클릭하세요.",
          count: worldTravelDestinations.length,
        }
      : pendingAction?.type === "olympic"
        ? {
            title: "올림픽",
            description: "개최할 내 도시나 휴양지를 클릭하세요.",
            count: getOwnedBuildableTiles(turn).length,
          }
        : null;

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    createRoom({
      name: createForm.name.trim() || "방장",
      maxPlayers: createForm.maxPlayers,
    });
  };

  const handleJoinSubmit = (event) => {
    event.preventDefault();
    joinRoom({
      name: joinForm.name.trim() || "플레이어",
      roomCode: joinForm.roomCode.trim(),
    });
  };

  const handleStartGame = () => {
    if (!room) return;
    startGame();
  };

  const handleResetSession = () => {
    clearRoomSession();
    setView("landing");
    setGameStarted(false);
    setPlayers([]);
    setBoard(cloneBoard());
  };

  if (view !== "game" || !gameStarted || !players.length) {
    return (
      <SetupScreen
        view={view}
        setView={setView}
        connectionStatus={connectionStatus}
        room={room}
        isHost={isHost}
        localPlayerId={localPlayerId}
        multiplayerError={multiplayerError}
        createForm={createForm}
        setCreateForm={setCreateForm}
        joinForm={joinForm}
        setJoinForm={setJoinForm}
        onCreateSubmit={handleCreateSubmit}
        onJoinSubmit={handleJoinSubmit}
        onStartGame={handleStartGame}
        onResetSession={handleResetSession}
        isSyncing={view === "game" && gameStarted && !players.length}
      />
    );
  }

  return (
    <Stack
      className="game-stage"
      alignItems="center"
      justifyContent="center"
      sx={{
        display: "flex",
        width: "100%",
        height: "var(--app-height)",
        minWidth: 0,
        minHeight: "var(--app-height)",
        maxWidth: "100vw",
        maxHeight: "var(--app-height)",
        overflow: "hidden",
        WebkitOverflowScrolling: "auto",
        position: "relative",
        isolation: "isolate",
        contain: "layout paint size",
        background: "transparent",
        fontFamily:
          "'Pretendard', 'Noto Sans KR', 'Malgun Gothic', Arial, sans-serif",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
          zIndex: 7,
        }}
      >
        {players.map((player, index) => (
          <User
            key={player.id}
            data={player}
            rank={player.id === localPlayerId ? "나" : `P${index + 1}`}
            anchor={index % 2 === 0 ? "left" : "right"}
            isActive={turn === player.id}
            sx={playerPanelStyles[index]}
          />
        ))}
      </Stack>

      <Stack
        sx={{
          position: "absolute",
          top: { xs: 8, sm: 10, md: 16, lg: 22 },
          left: "50%",
          transform: "translateX(-50%)",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 70,
          "& > *": {
            pointerEvents: "auto",
          },
        }}
      >
        {selectionGuide && (
          <ActionGuide
            title={selectionGuide.title}
            description={selectionGuide.description}
            count={selectionGuide.count}
            onSkip={() => requestCommand({ type: "end_turn" })}
            disabled={!canAct}
          />
        )}
      </Stack>

      <Box
        sx={{
          position: "absolute",
          top: { xs: 8, sm: 10, md: 14, lg: 18 },
          right: { xs: 8, sm: 10, md: 14, lg: 18 },
          zIndex: 80,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            p: 0.5,
            borderRadius: "16px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(224,247,255,0.78))",
            border: "1px solid rgba(255,255,255,0.92)",
            backdropFilter: "blur(16px) saturate(1.32)",
            boxShadow:
              "0 12px 22px rgba(70,132,186,0.22), inset 0 1px 0 rgba(255,255,255,0.94)",
            width: isToolDrawerOpen
              ? { xs: 116, sm: 128, md: 140 }
              : { xs: 40, sm: 44, md: 48 },
            overflow: "hidden",
            transformOrigin: "top right",
            transition:
              "width 180ms ease, opacity 160ms ease, transform 160ms ease",
          }}
        >
          <IconButton
            aria-label={isToolDrawerOpen ? "도구 닫기" : "도구 열기"}
            aria-expanded={isToolDrawerOpen}
            title={isToolDrawerOpen ? "도구 닫기" : "도구 열기"}
            onClick={() => setIsToolDrawerOpen((current) => !current)}
            sx={toolIconButtonSx}
          >
            {isToolDrawerOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>

          <IconButton
            aria-label={isFullscreen ? "전체화면 종료" : "전체화면"}
            title={isFullscreen ? "전체화면 종료" : "전체화면"}
            onClick={handleFullscreenAction}
            sx={{
              ...toolIconButtonSx,
              opacity: isToolDrawerOpen ? 1 : 0,
              pointerEvents: isToolDrawerOpen ? "auto" : "none",
              transform: isToolDrawerOpen ? "scale(1)" : "scale(0.82)",
              transition: "opacity 120ms ease, transform 120ms ease",
            }}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>

          <IconButton
            aria-label="다시하기"
            title={
              isHost
                ? isMoving || isRolling
                  ? "이동 또는 주사위 진행 중"
                  : "다시하기"
                : "방장만 다시하기 가능"
            }
            onClick={handleRestartGame}
            disabled={!isHost || isMoving || isRolling}
            sx={{
              ...toolIconButtonSx,
              opacity: isToolDrawerOpen ? 1 : 0,
              pointerEvents: isToolDrawerOpen ? "auto" : "none",
              transform: isToolDrawerOpen ? "scale(1)" : "scale(0.82)",
              transition: "opacity 120ms ease, transform 120ms ease",
            }}
          >
            <RestartAltIcon />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={setTokenLayer}
        className="hb-token-layer"
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 20,
        }}
      />

      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "auto",
          maxWidth: "94vw",
          transform: "translate(-50%, -50%)",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 40,
          "& > *": {
            pointerEvents: "auto",
          },
        }}
      >
        {!isMoving && (
          <TileActionPanel
            player={activePlayer}
            tile={activeTile}
            action={pendingAction}
            isAction={isAction}
            onBuild={(tile, buildType) =>
              requestCommand({
                type: "build_city",
                tileIdx: tile.idx,
                buildType,
              })
            }
            onPayToll={(tile) =>
              requestCommand({ type: "pay_toll", tileIdx: tile.idx })
            }
            onAcquire={(tile) =>
              requestCommand({ type: "acquire_city", tileIdx: tile.idx })
            }
            sellableBuildings={sellableBuildings}
            onSellBuildings={(tileIdxs) =>
              requestCommand({ type: "sell_buildings", tileIdxs })
            }
            onCancelSellBuildings={() =>
              requestCommand({ type: "cancel_sell_buildings" })
            }
            onBonusGuess={(selectedSide) =>
              requestCommand({ type: "bonus_guess", selectedSide })
            }
            onBonusCollect={() => requestCommand({ type: "bonus_collect" })}
            onBonusContinue={() => requestCommand({ type: "bonus_continue" })}
            onEndTurn={() => requestCommand({ type: "end_turn" })}
            getToll={getToll}
            hasColorMonopoly={hasColorMonopoly}
            winner={winner}
            canAct={canAct}
          />
        )}
      </Box>

      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: 0,
          maxHeight: "100%",
          overflow: "hidden",
          contain: "layout paint size",
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            display: "none",
            position: "absolute",
            inset: 92,
            borderRadius: "36px",
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.72), rgba(129,213,240,0.72))",
            border: "10px solid rgba(255,255,255,0.7)",
            boxShadow:
              "inset 0 18px 40px rgba(255,255,255,0.7), inset 0 -24px 38px rgba(8,83,134,0.24), 0 16px 0 rgba(19,96,152,0.45)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "var(--board-top)",
            width: mapWidth,
            height: mapHeight,
            transform:
              "translate(-50%, -50%) perspective(1400px) rotateX(53deg) rotateZ(-45deg) scale(var(--board-scale))",
            transformOrigin: "center",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            willChange: "auto",
            filter: "drop-shadow(0 38px 30px rgba(88,150,207,0.28))",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: -20,
              borderRadius: "34px",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.64), rgba(180,231,255,0.32) 48%, rgba(255,189,224,0.3) 100%)",
              border: "1px solid rgba(255,255,255,0.82)",
              backdropFilter: "blur(18px) saturate(1.35)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -18px 36px rgba(111,190,230,0.18)",
              transform: "translateZ(-8px)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 58,
              borderRadius: "28px",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.38), rgba(218,247,255,0.2) 52%, rgba(255,215,236,0.24) 100%)",
              border: "1px solid rgba(255,255,255,0.58)",
              backdropFilter: "blur(12px) saturate(1.22)",
              boxShadow:
                "inset 0 16px 26px rgba(255,255,255,0.26), inset 0 -20px 30px rgba(107,179,219,0.12)",
              transform: "translateZ(-4px)",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 26,
                borderRadius: "18px",
                border: "1px solid rgba(255,255,255,0.46)",
                boxShadow: "inset 0 0 32px rgba(121,190,223,0.16)",
              },
            }}
          />

          <BuildMap
            board={board}
            playersByPosition={playersByPosition}
            tokenLayer={tokenLayer}
            hasColorMonopoly={hasColorMonopoly}
            rollPreviewTileIdx={rollPreviewTileIdx}
            onBlockClick={handleBlockClick}
            getIsSelectable={getIsSelectable}
            selectedTileIdx={
              pendingAction?.type === "worldTravel"
                ? Number(selectedDestination)
                : pendingAction?.type === "olympic"
                  ? Number(selectedOlympicCity)
                  : null
            }
          />

          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "var(--dice-panel-top)",
              transform: "translate(-50%, -50%) translateZ(58px) rotate(45deg)",
              display: "grid",
              justifyItems: "center",
              alignContent: "end",
              gap: 1,
              width: 810,
              minHeight: 630,
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            <DiceRoller
              ref={diceRollerRef}
              values={[dice1, dice2]}
              isRolling={isRolling}
              disabled={!!winner || isAction || isMoving}
              rollId={lastRollId}
              onReady={setDiceReady}
              onError={handleDiceError}
            />
            <Button
              variant="contained"
              onClick={rollDice}
              disabled={isDiceDisabled}
              title={diceError ? "Dice fallback active" : "ROLL"}
              sx={{ ...rollButtonSx, pointerEvents: "auto" }}
            >
              {"ROLL"}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            position: "absolute",
            bottom: 100,
            width: "100%",
            display: "none",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <Stack
            gap={1.25}
            alignItems="center"
            sx={{
              px: 3,
              py: 2,
              minWidth: 230,
              color: "#08345e",
              borderRadius: "20px",
              background: "linear-gradient(180deg, #ffffff, #dff8ff)",
              border: "3px solid rgba(255,255,255,0.9)",
              boxShadow:
                "0 12px 0 #66a9c8, 0 18px 28px rgba(15,68,112,0.25), inset 0 3px 0 rgba(255,255,255,0.95)",
            }}
          >
            <Stack>{`주사위: ${dice1} / ${dice2}`}</Stack>
            <Button
              variant="contained"
              onClick={rollDice}
              disabled={isDiceDisabled}
              sx={{
                ...rollButtonSx,
                width: 96,
                height: 96,
                minWidth: 96,
                minHeight: 96,
                fontSize: 17,
              }}
            >
              주사위 굴리기
            </Button>
            {!!activePlayer?.tollPasses && (
              <Typography variant="caption">
                통행료 면제권 {activePlayer.tollPasses}장
              </Typography>
            )}
            {!!activePlayer?.islandPasses && (
              <Typography variant="caption">
                무인도 탈출권 {activePlayer.islandPasses}장
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

      <Dialog
        open={pendingAction?.type === "goldenKey"}
        onClose={
          canAct
            ? () => requestCommand({ type: "resolve_golden_key" })
            : undefined
        }
        TransitionProps={{
          onExited: () => {
            setDisplayGoldenKeyCard(null);
          },
        }}
        sx={dialogLayerSx}
      >
        <DialogTitle>{displayGoldenKeyCard?.title}</DialogTitle>
        <DialogContent>
          <Typography>{displayGoldenKeyCard?.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => requestCommand({ type: "resolve_golden_key" })}
            variant="contained"
            disabled={!canAct}
          >
            {canAct ? "확인" : "대기 중"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pendingAction?.type === "worldTravel" && !!selectedDestination}
        onClose={cancelWorldTravelSelection}
        TransitionProps={{
          onExited: () => {
            setDisplayDestinationTile(null);
          },
        }}
        sx={dialogLayerSx}
      >
        <DialogTitle>세계여행 목적지 확인</DialogTitle>
        <DialogContent sx={{ minWidth: 360, pt: 1 }}>
          <TileInfoCard
            tile={displayDestinationTile}
            getToll={getToll}
            hasColorMonopoly={hasColorMonopoly}
            fallback="아직 목적지가 선택되지 않았습니다."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelWorldTravelSelection} color="inherit">
            다시 선택
          </Button>
          <Button
            onClick={selectWorldTravelDestination}
            variant="contained"
            disabled={!canAct || !selectedDestination}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={pendingAction?.type === "olympic" && !!selectedOlympicCity}
        onClose={cancelOlympicSelection}
        TransitionProps={{
          onExited: () => {
            setDisplayOlympicTile(null);
          },
        }}
        sx={dialogLayerSx}
      >
        <DialogTitle>올림픽 개최지 확인</DialogTitle>
        <DialogContent sx={{ minWidth: 360, pt: 1 }}>
          <TileInfoCard
            tile={displayOlympicTile}
            getToll={getToll}
            hasColorMonopoly={hasColorMonopoly}
            fallback="아직 개최지가 선택되지 않았습니다."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelOlympicSelection} color="inherit">
            다시 선택
          </Button>
          <Button
            onClick={selectOlympicCity}
            variant="contained"
            disabled={!canAct || !selectedOlympicCity}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isInfoDialogOpen}
        onClose={closeTileInfo}
        TransitionProps={{
          onExited: () => {
            setSelectedInfoTileIdx(null);
          },
        }}
        sx={dialogLayerSx}
      >
        <DialogTitle>지역 정보</DialogTitle>
        <DialogContent sx={{ minWidth: 360, pt: 1 }}>
          <TileInfoCard
            tile={selectedInfoTile}
            getToll={getToll}
            hasColorMonopoly={hasColorMonopoly}
            fallback="선택된 지역이 없습니다."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTileInfo} variant="contained">
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!winner}
        TransitionProps={{
          onExited: () => {
            setDisplayWinner(null);
          },
        }}
        sx={dialogLayerSx}
      >
        <DialogTitle>
          {displayWinner?.victoryType === "bankruptcy"
            ? "게임 종료"
            : "휴양지 독점 승리"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={1.5}>
            <Typography variant="h6" fontWeight={950} color="#102f4e">
              승리자: {displayWinner?.name}
            </Typography>
            {displayWinner?.victoryType === "bankruptcy" ? (
              <Typography>
                {displayWinner?.loser?.name}님의 보유 금액이 0원보다 작아져
                게임이 종료되었습니다.
              </Typography>
            ) : (
              <Typography>
                {displayWinner?.name}님이 모든 휴양지를 모아 게임에서
                승리했습니다.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={restartGame} disabled={!isHost}>
            {isHost ? "다시하기" : "방장 대기"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default App;

const getPlayerPanelSx = (index, count) => {
  const inset = { xs: 8, sm: 10, md: 14, lg: 18 };
  const positions =
    count <= 2
      ? [
          { right: inset, bottom: inset },
          { left: inset, top: inset },
        ]
      : [
          { right: inset, bottom: inset },
          { left: inset, top: inset },
          { right: inset, top: { xs: 58, sm: 62, md: 70, lg: 78 } },
          { left: inset, bottom: inset },
        ];

  return {
    position: "absolute",
    ...(positions[index] || positions[0]),
  };
};

const setupCardSx = {
  width: 520,
  maxWidth: "calc(100vw - 32px)",
  p: { xs: 2, sm: 3 },
  gap: 2,
  color: "#10395d",
  borderRadius: "22px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(227,249,255,0.9))",
  border: "1px solid rgba(255,255,255,0.92)",
  boxShadow:
    "0 18px 40px rgba(64,128,178,0.24), inset 0 1px 0 rgba(255,255,255,0.95)",
};

const SetupScreen = ({
  view,
  setView,
  connectionStatus,
  room,
  isHost,
  localPlayerId,
  multiplayerError,
  createForm,
  setCreateForm,
  joinForm,
  setJoinForm,
  onCreateSubmit,
  onJoinSubmit,
  onStartGame,
  onResetSession,
  isSyncing,
}) => {
  const connectedSlots =
    room?.players?.filter((player) => player.connected) || [];
  const isRoomReady =
    !!room &&
    room.players.length === room.maxPlayers &&
    connectedSlots.length === room.maxPlayers;
  const slots = Array.from({ length: room?.maxPlayers || 0 }, (_, index) =>
    room?.players?.find((player) => player.slot === index),
  );

  return (
    <Stack
      className="game-stage"
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        minHeight: "var(--app-height)",
        px: 2,
        background: "transparent",
        fontFamily:
          "'Pretendard', 'Noto Sans KR', 'Malgun Gothic', Arial, sans-serif",
      }}
    >
      <Stack sx={setupCardSx}>
        <Stack direction="row" justifyContent="space-between" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={950} color="#102f4e">
              HB World
            </Typography>
            <Typography fontWeight={800} color="#54708b">
              WebSocket 멀티플레이
            </Typography>
          </Box>
          <Chip
            label={connectionStatus === "connected" ? "서버 연결" : "서버 대기"}
            color={connectionStatus === "connected" ? "success" : "warning"}
            sx={{ fontWeight: 900 }}
          />
        </Stack>

        {multiplayerError && (
          <Alert severity="warning">{multiplayerError}</Alert>
        )}

        {isSyncing && (
          <Alert severity="info">
            방장 브라우저에서 게임 상태를 동기화하는 중입니다.
          </Alert>
        )}

        {view === "landing" && !room && (
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => setView("create")}
              disabled={connectionStatus !== "connected"}
            >
              방 만들기
            </Button>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={() => setView("join")}
              disabled={connectionStatus !== "connected"}
            >
              참여하기
            </Button>
          </Stack>
        )}

        {view === "create" && !room && (
          <Stack component="form" gap={1.5} onSubmit={onCreateSubmit}>
            <TextField
              label="방장 이름"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              inputProps={{ maxLength: 12 }}
              required
            />
            <TextField
              select
              label="플레이 인원"
              value={createForm.maxPlayers}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  maxPlayers: Number(event.target.value),
                }))
              }
            >
              {[2, 3, 4].map((count) => (
                <MenuItem key={count} value={count}>
                  {count}명
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" gap={1}>
              <Button color="inherit" onClick={() => setView("landing")}>
                뒤로
              </Button>
              <Button type="submit" variant="contained" sx={{ flex: 1 }}>
                방 만들기
              </Button>
            </Stack>
          </Stack>
        )}

        {view === "join" && !room && (
          <Stack component="form" gap={1.5} onSubmit={onJoinSubmit}>
            <TextField
              label="접속 코드"
              value={joinForm.roomCode}
              onChange={(event) =>
                setJoinForm((current) => ({
                  ...current,
                  roomCode: event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 4),
                }))
              }
              inputProps={{ maxLength: 4 }}
              required
            />
            <TextField
              label="플레이어 이름"
              value={joinForm.name}
              onChange={(event) =>
                setJoinForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              inputProps={{ maxLength: 12 }}
              required
            />
            <Stack direction="row" gap={1}>
              <Button color="inherit" onClick={() => setView("landing")}>
                뒤로
              </Button>
              <Button type="submit" variant="contained" sx={{ flex: 1 }}>
                참여하기
              </Button>
            </Stack>
          </Stack>
        )}

        {room && room.status !== "game" && (
          <Stack gap={1.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              gap={1}
            >
              <Box>
                <Typography fontSize={13} fontWeight={900} color="#54708b">
                  접속 코드
                </Typography>
                <Typography variant="h3" fontWeight={950} letterSpacing={0}>
                  {room.code}
                </Typography>
              </Box>
              <Chip
                label={`${room.players.length}/${room.maxPlayers}`}
                color={isRoomReady ? "success" : "primary"}
                sx={{ alignSelf: "center", fontWeight: 900 }}
              />
            </Stack>

            <Stack gap={1}>
              {slots.map((player, index) => (
                <Stack
                  key={`slot-${index}`}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.68)",
                    border: "1px solid rgba(84,112,139,0.14)",
                  }}
                >
                  <Typography fontWeight={900}>
                    {player?.name || `빈자리 ${index + 1}`}
                    {player?.playerId === localPlayerId ? " (나)" : ""}
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      player
                        ? player.connected
                          ? player.isHost
                            ? "방장"
                            : "접속"
                          : "연결 끊김"
                        : "대기"
                    }
                    color={
                      player?.connected
                        ? player.isHost
                          ? "secondary"
                          : "success"
                        : "default"
                    }
                  />
                </Stack>
              ))}
            </Stack>

            <Button
              variant="contained"
              size="large"
              onClick={onStartGame}
              disabled={!isHost || !isRoomReady}
            >
              {isHost ? "게임 시작" : "방장이 게임을 시작합니다"}
            </Button>
            <Button color="inherit" onClick={onResetSession}>
              처음 화면으로
            </Button>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};

const dialogLayerSx = {
  zIndex: 2147483647,
  "& .MuiDialog-container": {
    position: "relative",
    zIndex: 2147483647,
  },
  "& .MuiDialog-paper": {
    position: "relative",
    zIndex: 2147483647,
  },
};

const actionPanelSx = {
  gap: 1,
  alignItems: "center",
  width: 460,
  maxWidth: "96vw",
  px: 2.5,
  py: 2,
  color: "#10395d",
  borderRadius: "24px",
  fontSize: 16,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(225,247,255,0.96) 58%, rgba(226,249,242,0.94))",
  border: "2px solid rgba(255,255,255,0.94)",
  boxShadow:
    "0 10px 0 rgba(91,154,196,0.68), 0 22px 34px rgba(14,59,98,0.28), inset 0 4px 0 rgba(255,255,255,0.9)",
  textAlign: "center",
};

const rollButtonSx = {
  width: 118,
  height: 118,
  minWidth: 118,
  minHeight: 118,
  p: 0,
  color: "#ffffff !important",
  fontSize: 25,
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: "0 !important",
  borderRadius: "18px !important",
  background:
    "linear-gradient(145deg, #ebd1ff 0%, #d9a7c9 48%, #ffd2bd 100%) !important",
  border: "1px solid rgba(255,255,255,0.78)",
  backdropFilter: "blur(12px) saturate(1.45)",
  boxShadow:
    "0 8px 20px rgba(85,145,195,0.2), inset 0 1px 0 rgba(255,255,255,0.48) !important",
  textShadow: "0 2px 3px rgba(41,86,134,0.38)",
  overflow: "hidden",
  transform: "translateY(0) scale(1)",
  transformOrigin: "center",
  transition:
    "transform 110ms ease, filter 140ms ease, box-shadow 140ms ease, background 140ms ease",
  zIndex: 2,
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 6,
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.42)",
    pointerEvents: "none",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    inset: -20,
    background:
      "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.86), rgba(255,255,255,0.18) 28%, transparent 56%)",
    opacity: 0,
    transform: "scale(0.42)",
    transition: "opacity 160ms ease, transform 180ms ease",
    pointerEvents: "none",
  },
  "&:hover": {
    background:
      "linear-gradient(145deg, #f2dcff 0%, #e2b0d2 48%, #ffddcb 100%) !important",
    filter: "brightness(1.08) saturate(1.08)",
    boxShadow:
      "0 8px 20px rgba(85,145,195,0.24), inset 0 1px 0 rgba(255,255,255,0.54) !important",
  },
  "&:active": {
    transform: "translateY(5px) scale(0.965)",
    filter: "brightness(1.14) saturate(1.18)",
    background:
      "linear-gradient(145deg, #e0c0ff 0%, #cf8fc0 46%, #ffc1a5 100%) !important",
    boxShadow:
      "0 2px 8px rgba(85,145,195,0.2), inset 0 5px 14px rgba(101,67,135,0.2), inset 0 -1px 0 rgba(255,255,255,0.58) !important",
    textShadow: "0 1px 2px rgba(41,86,134,0.5)",
  },
  "&:active::before": {
    inset: 9,
    borderColor: "rgba(255,255,255,0.58)",
    boxShadow: "inset 0 0 22px rgba(255,255,255,0.36)",
  },
  "&:active::after": {
    opacity: 1,
    transform: "scale(1)",
  },
  "&.Mui-disabled": {
    color: "rgba(255,255,255,0.58) !important",
    background:
      "linear-gradient(145deg, rgba(235,209,255,0.58) 0%, rgba(217,167,201,0.54) 48%, rgba(255,210,189,0.56) 100%) !important",
    boxShadow:
      "0 5px 14px rgba(85,145,195,0.13), inset 0 1px 0 rgba(255,255,255,0.32) !important",
    transform: "none",
  },
};

const toolIconButtonSx = {
  width: { xs: 32, sm: 36, md: 40 },
  height: { xs: 32, sm: 36, md: 40 },
  color: "#173653",
  borderRadius: "15px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(224,247,255,0.76))",
  border: "1px solid rgba(255,255,255,0.9)",
  backdropFilter: "blur(14px) saturate(1.3)",
  boxShadow:
    "0 10px 18px rgba(70,132,186,0.2), inset 0 1px 0 rgba(255,255,255,0.92)",
  "&:hover": {
    background: "linear-gradient(180deg, #ffffff, rgba(212,244,255,0.92))",
  },
  "& svg": {
    fontSize: { xs: 19, md: 22 },
  },
};

const ActionGuide = ({ title, description, count, onSkip, disabled }) => (
  <Stack
    direction="row"
    alignItems="center"
    gap={0.8}
    sx={{
      width: 276,
      maxWidth: "76vw",
      px: 1.1,
      py: 0.7,
      color: "#123b5d",
      borderRadius: "14px",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(226,249,242,0.78))",
      border: "1px solid rgba(255,255,255,0.88)",
      backdropFilter: "blur(14px) saturate(1.35)",
      boxShadow:
        "0 14px 22px rgba(64,128,178,0.22), inset 0 1px 0 rgba(255,255,255,0.9)",
      zIndex: 3,
    }}
  >
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography fontSize={12} fontWeight={950} lineHeight={1.12}>
        {title}
      </Typography>
      <Typography fontSize={11} fontWeight={800} lineHeight={1.18}>
        {description}
      </Typography>
    </Box>
    <Chip
      label={`${count}곳`}
      size="small"
      color="primary"
      sx={{
        height: 20,
        fontSize: 10,
        fontWeight: 900,
        "& .MuiChip-label": { px: 0.8 },
      }}
    />
    <Button
      size="small"
      onClick={onSkip}
      color="inherit"
      disabled={disabled}
      sx={{
        minWidth: 36,
        px: 0.75,
        py: 0.2,
        fontSize: 11,
        fontWeight: 900,
        borderRadius: "9px",
      }}
    >
      패스
    </Button>
  </Stack>
);

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
            <Typography variant="body2">
              가격 {NumberToMoney(cost.build)}
            </Typography>
            <Typography variant="body2">
              통행료 {NumberToMoney(cost.toll)}
            </Typography>
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
