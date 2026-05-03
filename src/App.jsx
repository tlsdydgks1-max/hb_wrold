import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
const HOST_SNAPSHOT_KEY_PREFIX = "hb_world.hostGameState:";

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
      connected: roomPlayer ? roomPlayer.connected !== false : player.connected,
    };
  });

const readHostSnapshot = (roomCode) => {
  if (!roomCode) return null;

  try {
    const value = sessionStorage.getItem(`${HOST_SNAPSHOT_KEY_PREFIX}${roomCode}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

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
  const activePlayer = playersById[turn] || players[0] || null;
  const canAct = gameStarted && localPlayerId === turn && !winner;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const updateFullscreenState = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
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

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }

    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const handleFullscreenAction = () => {
    toggleFullscreen();
  };

  const getNextPlayerId = (playerId) => {
    if (!players.length) return playerId;

    const currentIndex = players.findIndex((player) => player.id === playerId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    return players[(safeIndex + 1) % players.length]?.id || playerId;
  };

  const endTurn = () => {
    setPendingAction(null);
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

  const rollDice = async () => {
    if (!canAct || isAction || isMoving || isRolling || !diceReady) return;

    setIsRolling(true);
    let diceValues = rollFallbackDice();

    try {
      diceValues = diceRollerRef.current
        ? await diceRollerRef.current.roll()
        : rollFallbackDice();
    } catch (error) {
      handleDiceError(error);
    }

    setIsRolling(false);
    requestCommand({ type: "roll_dice", diceValues });
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
    if (!tile) {
      setMessage("도착", "이번 칸에는 특별한 행동이 없습니다.");
      return;
    }

    switch (tile.kind) {
      case "city":
      case "resort":
        setPendingAction({ type: "tile", tileIdx: tile.idx });
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
      case "island":
        setPlayerById(playerId, (player) => ({ ...player, stop: 3 }));
        setMessage(
          "무인도 도착",
          "3턴 동안 대기합니다. 더블이 나오면 바로 탈출합니다.",
        );
        break;
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
        updatePlayerMoney(playerId, 100000);
        setMessage("보너스 게임", "보너스 100,000원을 받았습니다.");
        break;
      case "start":
      default:
        setMessage(tile.name, "이번 칸에는 특별한 행동이 없습니다.");
        break;
    }
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
      default:
        break;
    }
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

  const buildCity = (tile, type) => {
    const player = playersById[turn];
    if (!player) return;
    const cost = tile.costs[type];
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

  const getToll = (tile) => {
    if (!tile?.owner) return 0;
    const baseToll = tile.costs[tile.owner.type].toll;
    const olympicBonus = tile.olympicHost ? 2 : 1;
    const monopolyBonus = hasColorMonopoly(tile.owner.id, tile.color)
      ? MONOPOLY_TOLL_MULTIPLIER
      : 1;

    return Math.round(baseToll * olympicBonus * monopolyBonus);
  };

  const ownsAllResorts = (playerId, targetBoard = board) => {
    const resorts = targetBoard.filter((tile) => tile.kind === "resort");

    return (
      resorts.length > 0 && resorts.every((tile) => tile.owner?.id === playerId)
    );
  };

  const hasColorMonopoly = (playerId, color) => {
    if (!playerId || !color) return false;

    const sameColorTiles = board.filter(
      (tile) =>
        tile.color === color &&
        (tile.kind === "city" || tile.kind === "resort"),
    );

    return (
      sameColorTiles.length > 1 &&
      sameColorTiles.every((tile) => tile.owner?.id === playerId)
    );
  };

  const getOwnedBuildableTiles = (playerId) =>
    board.filter(
      (tile) =>
        (tile.kind === "city" || tile.kind === "resort") &&
        tile.owner?.id === playerId,
    );

  const worldTravelDestinations = board.filter(
    (tile) => tile.kind !== "worldTravel",
  );
  const selectedInfoTile = board.find(
    (tile) => tile.idx === selectedInfoTileIdx,
  );

  const isWorldTravelTarget = (tile) =>
    pendingAction?.type === "worldTravel" && tile.kind !== "worldTravel";

  const isOlympicTarget = (tile) =>
    pendingAction?.type === "olympic" &&
    (tile.kind === "city" || tile.kind === "resort") &&
    tile.owner?.id === turn;

  const handleBlockClick = (tile) => {
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
  };

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
      case "roll_dice":
        await applyDiceRoll(actorId, command.diceValues);
        break;
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
      pendingAction,
      players,
      turn,
      winner,
    ],
  );

  const handledEventIdRef = useRef(null);

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
    sendGameSnapshot(snapshot);
  }, [gameStarted, isHost, players.length, room?.code, sendGameSnapshot, snapshot]);

  const activeTile = activePlayer ? board[activePlayer.position] : null;
  const isDiceDisabled =
    !canAct || !!winner || isAction || isMoving || isRolling || !diceReady;
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
            sx={getPlayerPanelSx(index, players.length)}
          />
        ))}
        <Stack
          sx={{
            position: "absolute",
            top: { xs: 8, sm: 10, md: 16, lg: 22 },
            left: "50%",
            transform: "translateX(-50%)",
            alignItems: "center",
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
              ? { xs: 78, sm: 86, md: 94 }
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
            willChange: "transform",
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
            players={players}
            tokenLayer={tokenLayer}
            onBlockClick={handleBlockClick}
            getIsSelectable={(tile) =>
              isWorldTravelTarget(tile) || isOlympicTarget(tile)
            }
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
              width: 500,
              minHeight: 410,
              zIndex: 4,
            }}
          >
            <DiceRoller
              ref={diceRollerRef}
              values={[dice1, dice2]}
              isRolling={isRolling}
              disabled={!!winner || isAction || isMoving}
              onReady={setDiceReady}
              onError={handleDiceError}
            />
            <Button
              variant="contained"
              onClick={rollDice}
              disabled={isDiceDisabled}
              title={diceError ? "Dice fallback active" : "ROLL"}
              sx={rollButtonSx}
            >
              {"ROLL"}
            </Button>
            <Box
              sx={{
                px: 2,
                py: 0.75,
                minWidth: 120,
                color: "#28608d",
                fontSize: 18,
                fontWeight: 900,
                textAlign: "center",
                borderRadius: "10px",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(223,247,255,0.42))",
                border: "1px solid rgba(255,255,255,0.78)",
                backdropFilter: "blur(12px) saturate(1.25)",
                boxShadow:
                  "0 12px 18px rgba(84,144,194,0.2), inset 0 1px 0 rgba(255,255,255,0.86)",
                zIndex: 2,
              }}
            >
              {dice1 + dice2}
            </Box>
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
  const connectedSlots = room?.players?.filter((player) => player.connected) || [];
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
            label={
              connectionStatus === "connected" ? "서버 연결" : "서버 대기"
            }
            color={connectionStatus === "connected" ? "success" : "warning"}
            sx={{ fontWeight: 900 }}
          />
        </Stack>

        {multiplayerError && <Alert severity="warning">{multiplayerError}</Alert>}

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
                    .slice(0, 6),
                }))
              }
              inputProps={{ maxLength: 6 }}
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
  onEndTurn,
  getToll,
  hasColorMonopoly,
  winner,
  canAct,
}) => {
  const [costOption, setCostOption] = useState("");

  useEffect(() => {
    setCostOption("");
  }, [tile?.idx, action?.type]);

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

  if (action.type !== "tile") return null;

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
              내 도시입니다. 더 높은 건물로 업그레이드할 수 있습니다.
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
                disabled={
                  !canAct ||
                  !isSelectedBuildAllowed ||
                  selectedCost?.build > player.money
                }
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

const BuildMap = ({
  board,
  players = [],
  tokenLayer,
  onBlockClick,
  getIsSelectable,
  selectedTileIdx,
}) =>
  board.map((item, index) => {
    const sideIndex = parseInt(index / 8, 10);
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

    const tilePlayers = players.filter((player) => player.position === index);

    return (
      <Block
        key={`block-${index}`}
        data={item}
        position={position}
        block={block}
        side={side}
        players={tilePlayers}
        tokenLayer={tokenLayer}
        onClick={onBlockClick ? () => onBlockClick(item) : undefined}
        isSelectable={getIsSelectable?.(item)}
        isSelected={selectedTileIdx === item.idx}
      />
    );
  });
