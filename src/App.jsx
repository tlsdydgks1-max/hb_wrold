import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./App.css";
import Block from "@/components/block";
import DiceRoller from "@/components/Dice";
import User from "@/components/user";
import { city as initialCity } from "@/data/city";
import { goldenKeyCards } from "@/data/goldenKeyCards";
import { NumberToMoney } from "@/util/numberToMoney";

import {
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
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

const mapWidth = 720;
const mapHeight = 810;
const blockWidth = mapWidth / 9;
const blockHeight = mapHeight / 9;
const SALARY = 300000;
const BOARD_SIZE = 32;
const BUILD_ORDER = ["land", "villa", "building", "hotel", "landmark"];
const MONOPOLY_TOLL_MULTIPLIER = 2;
const VIEWPORT_SETTLE_DELAY = 260;
const VIEWPORT_CLASS_CLEAR_DELAY = 90;
const TOUCH_VIEWPORT_QUERY = "(hover: none) and (pointer: coarse)";

const cloneBoard = () =>
  initialCity.map((tile) => ({
    ...tile,
    costs: tile.costs
      ? Object.fromEntries(
          Object.entries(tile.costs).map(([key, cost]) => [key, { ...cost }])
        )
      : undefined,
  }));

const normalizePosition = (position) =>
  ((position % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;

const rollFallbackDice = () => [
  Math.floor(Math.random() * 6) + 1,
  Math.floor(Math.random() * 6) + 1,
];

const getViewportSize = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { width: 0, height: 0 };
  }

  const root = document.documentElement;

  return {
    width: window.innerWidth || root.clientWidth || 0,
    height: window.innerHeight || root.clientHeight || 0,
  };
};

const getBoardScale = (width, height, isTouch) => {
  if (isTouch && width > height) {
    return width <= 760 ? 0.46 : 0.52;
  }

  if (width <= 390) return 0.45;
  if (width <= 460) return 0.5;
  if (width <= 560) return 0.56;
  if (width <= 660) return 0.64;
  if (width <= 780) return 0.72;
  if (width <= 880) return 0.8;
  if (width <= 980) return 0.88;

  if (!isTouch) {
    if (height <= 560) return 0.56;
    if (height <= 650) return 0.64;
    if (height <= 740) return 0.72;
    if (height <= 830) return 0.8;
    if (height <= 920) return 0.88;
  }

  return 0.96;
};

const applyViewportVars = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.documentElement;
  const { width, height } = getViewportSize();
  const isTouch = window.matchMedia?.(TOUCH_VIEWPORT_QUERY).matches ?? false;

  root.style.setProperty("--app-height", `${height}px`);
  root.style.setProperty(
    "--board-scale",
    String(getBoardScale(width, height, isTouch))
  );
};

function App() {
  const diceRollerRef = useRef(null);
  const [tokenLayer, setTokenLayer] = useState(null);
  const [board, setBoard] = useState(cloneBoard);
  const [user1, setUser1] = useState({
    id: "user1",
    name: "하니",
    img: User1,
    color: "primary.main",
    money: 2000000,
    position: 0,
    city: [],
    stop: 0,
    tollPasses: 0,
  });
  const [user2, setUser2] = useState({
    id: "user2",
    name: "비니",
    img: User2,
    color: "#ea2f87",
    money: 2000000,
    position: 0,
    city: [],
    stop: 0,
    tollPasses: 0,
  });

  const [turn, setTurn] = useState("user1");
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
  const [winner, setWinner] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isToolDrawerOpen, setIsToolDrawerOpen] = useState(false);

  const players = useMemo(() => ({ user1, user2 }), [user1, user2]);
  const activePlayer = players[turn];
  const opponentId = turn === "user1" ? "user2" : "user1";

  useEffect(() => {
    setTurn(Math.random() > 0.5 ? "user1" : "user2");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const root = document.documentElement;
    let settleTimer = 0;
    let clearClassTimer = 0;
    let frameId = 0;

    const clearFrame = () => {
      if (!frameId) return;
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const settleViewport = () => {
      clearFrame();
      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(() => {
          frameId = 0;
          applyViewportVars();
          root.classList.remove("hb-booting");
          clearClassTimer = window.setTimeout(() => {
            root.classList.remove("hb-viewport-changing");
          }, VIEWPORT_CLASS_CLEAR_DELAY);
        });
      });
    };

    const scheduleViewportSettle = () => {
      root.classList.add("hb-viewport-changing");
      window.clearTimeout(settleTimer);
      window.clearTimeout(clearClassTimer);
      settleTimer = window.setTimeout(settleViewport, VIEWPORT_SETTLE_DELAY);
    };

    applyViewportVars();
    settleViewport();

    window.addEventListener("resize", scheduleViewportSettle, { passive: true });
    window.addEventListener("orientationchange", scheduleViewportSettle, {
      passive: true,
    });
    window.addEventListener("hb:viewport-transition", scheduleViewportSettle);
    window.visualViewport?.addEventListener("resize", scheduleViewportSettle, {
      passive: true,
    });
    document.addEventListener("fullscreenchange", scheduleViewportSettle);

    return () => {
      clearFrame();
      window.clearTimeout(settleTimer);
      window.clearTimeout(clearClassTimer);
      window.removeEventListener("resize", scheduleViewportSettle);
      window.removeEventListener("orientationchange", scheduleViewportSettle);
      window.removeEventListener("hb:viewport-transition", scheduleViewportSettle);
      window.visualViewport?.removeEventListener("resize", scheduleViewportSettle);
      document.removeEventListener("fullscreenchange", scheduleViewportSettle);
    };
  }, []);

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

    if (user1.money < 0) {
      setWinner({ ...user2, victoryType: "bankruptcy", loser: user1 });
      setPendingAction(null);
      setIsAction(false);
      return;
    }

    if (user2.money < 0) {
      setWinner({ ...user1, victoryType: "bankruptcy", loser: user2 });
      setPendingAction(null);
      setIsAction(false);
    }
  }, [user1, user2, winner]);

  const restartGame = () => {
    setBoard(cloneBoard());
    setUser1({
      id: "user1",
      name: "하니",
      img: User1,
      color: "primary.main",
      money: 2000000,
      position: 0,
      city: [],
      stop: 0,
      tollPasses: 0,
    });
    setUser2({
      id: "user2",
      name: "비니",
      img: User2,
      color: "#ea2f87",
      money: 2000000,
      position: 0,
      city: [],
      stop: 0,
      tollPasses: 0,
    });
    setTurn(Math.random() > 0.5 ? "user1" : "user2");
    setIsAction(false);
    setIsMoving(false);
    setIsRolling(false);
    setDice1(1);
    setDice2(1);
    setPendingAction(null);
    setSelectedDestination("");
    setSelectedOlympicCity("");
    setWinner(null);
  };

  const setPlayerById = (playerId, updater) => {
    const setter = playerId === "user1" ? setUser1 : setUser2;
    setter((current) =>
      typeof updater === "function" ? updater(current) : updater
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

    window.dispatchEvent(new Event("hb:viewport-transition"));

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }

    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const handleFullscreenAction = () => {
    toggleFullscreen();
  };

  const endTurn = () => {
    setPendingAction(null);
    setSelectedDestination("");
    setSelectedOlympicCity("");
    setIsAction(false);
    if (dice1 !== dice2) {
      setTurn((current) => (current === "user1" ? "user2" : "user1"));
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
    const player = players[playerId];
    const passedStart = steps > 0 && player.position + steps >= BOARD_SIZE;
    const finalPosition = normalizePosition(player.position + steps);

    await animateMovement(playerId, steps);

    if (passedStart || options.salary) {
      updatePlayerMoney(playerId, SALARY);
    }

    resolveTile(playerId, board[finalPosition]);
  };

  const movePlayerTo = async (playerId, targetPosition, options = {}) => {
    const player = players[playerId];
    let steps = targetPosition - player.position;

    if (options.forward !== false && steps <= 0) {
      steps += BOARD_SIZE;
    }

    await movePlayer(playerId, steps, options);
  };

  const rollDice = async () => {
    if (winner || isAction || isMoving || isRolling || !diceReady) return;

    setIsRolling(true);
    let diceValues = rollFallbackDice();

    try {
      diceValues = diceRollerRef.current
        ? await diceRollerRef.current.roll()
        : rollFallbackDice();
    } catch (error) {
      handleDiceError(error);
    }

    const [num1, num2] = diceValues;
    const player = players[turn];

    setDice1(num1);
    setDice2(num2);
    setIsAction(true);
    setIsRolling(false);

    if (player.position === 8 && player.stop > 0) {
      if (num1 === num2) {
        setPlayerById(turn, (current) => ({ ...current, stop: 0 }));
        setMessage("무인도 탈출", "더블이 나와 무인도에서 탈출합니다.");
        await movePlayer(turn, num1 + num2);
      } else {
        const nextStop = player.stop - 1;
        setPlayerById(turn, (current) => ({ ...current, stop: nextStop }));
        setMessage(
          "무인도 대기",
          nextStop
            ? `탈출 실패. ${nextStop}턴 뒤 자동으로 탈출합니다.`
            : "탈출 실패. 다음 차례부터 이동할 수 있습니다."
        );
      }
      return;
    }

    await movePlayer(turn, num1 + num2);
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
            "소유한 도시가 없어 개최지를 선택할 수 없습니다."
          );
        }
        break;
      }
      case "island":
        setPlayerById(playerId, (player) => ({ ...player, stop: 3 }));
        setMessage(
          "무인도 도착",
          "3턴 동안 대기합니다. 더블이 나오면 바로 탈출합니다."
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
              tax
            )}을 납부했습니다.`
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
    const otherId = playerId === "user1" ? "user2" : "user1";

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
    const player = players[turn];
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
          : item
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
            item.idx === tile.idx ? { ...item, type } : item
          )
        : [...current.city, { idx: tile.idx, name: tile.name, type }],
    }));
    endTurn();
  };

  const payToll = (tile) => {
    const player = players[turn];
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

    const player = players[turn];
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
          : item
      )
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
        tile.color === color && (tile.kind === "city" || tile.kind === "resort")
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
        tile.owner?.id === playerId
    );

  const buildableTiles = board.filter(
    (tile) => tile.kind === "city" || tile.kind === "resort"
  );
  const selectedDestinationTile = board.find(
    (tile) => tile.idx === Number(selectedDestination)
  );
  const selectedOlympicTile = board.find(
    (tile) => tile.idx === Number(selectedOlympicCity)
  );

  const isWorldTravelTarget = (tile) =>
    pendingAction?.type === "worldTravel" &&
    (tile.kind === "city" || tile.kind === "resort");

  const isOlympicTarget = (tile) =>
    pendingAction?.type === "olympic" &&
    (tile.kind === "city" || tile.kind === "resort") &&
    tile.owner?.id === turn;

  const handleBlockClick = (tile) => {
    if (!tile) return;

    if (isWorldTravelTarget(tile)) {
      setSelectedDestination(String(tile.idx));
      return;
    }

    if (isOlympicTarget(tile)) {
      setSelectedOlympicCity(String(tile.idx));
    }
  };

  const selectWorldTravelDestination = async () => {
    const destination = Number(selectedDestination);
    if (Number.isNaN(destination)) return;
    setPendingAction(null);
    setSelectedDestination("");
    await movePlayerTo(turn, destination);
  };

  const selectOlympicCity = () => {
    const destination = Number(selectedOlympicCity);
    if (Number.isNaN(destination)) return;

    setBoard((currentBoard) =>
      currentBoard.map((tile) => ({
        ...tile,
        olympicHost: tile.idx === destination,
      }))
    );
    setSelectedOlympicCity("");
    setMessage(
      "올림픽 개최",
      `${
        board.find((tile) => tile.idx === destination)?.name
      }의 통행료가 2배가 됩니다.`
    );
  };

  const activeTile = board[activePlayer.position];
  const isDiceDisabled = !!winner || isAction || isMoving || isRolling || !diceReady;

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
        minHeight: 0,
        maxHeight: "var(--app-height)",
        overflow: "hidden",
        position: "relative",
        isolation: "isolate",
        contain: "paint",
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
        <User
          data={user2}
          rank="2위"
          sx={{
            position: "absolute",
            top: { xs: 8, sm: 10, md: 14, lg: 18 },
            left: { xs: 8, sm: 10, md: 14, lg: 18 },
          }}
        />
        <Stack
          sx={{
            position: "absolute",
            top: { xs: 8, sm: 10, md: 16, lg: 22 },
            left: "50%",
            transform: "translateX(-50%)",
            px: { xs: 1.25, sm: 1.6, md: 2.2, lg: 3 },
            py: { xs: 0.45, sm: 0.6, md: 0.85, lg: 1.1 },
            minWidth: { xs: 104, sm: 122, md: 146, lg: 170 },
            alignItems: "center",
            color: "#285077",
            fontSize: { xs: "13px", sm: "15px", md: "18px", lg: "22px" },
            fontWeight: 900,
            letterSpacing: 0,
            borderRadius: { xs: "10px", sm: "12px", md: "15px", lg: "18px" },
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(218,246,255,0.46))",
            border: "1px solid rgba(255,255,255,0.82)",
            backdropFilter: "blur(16px) saturate(1.35)",
            boxShadow:
              "0 18px 32px rgba(82,145,196,0.22), inset 0 1px 0 rgba(255,255,255,0.92)",
            textShadow: "0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {activePlayer.name} 차례
        </Stack>
        <User
          data={user1}
          rank="1위"
          anchor="right"
          sx={{
            position: "absolute",
            right: { xs: 8, sm: 10, md: 14, lg: 18 },
            bottom: { xs: 8, sm: 10, md: 14, lg: 18 },
          }}
        />
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
          top: { xs: 66, sm: 78, md: 98, lg: 120 },
          width: "100%",
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
            opponent={players[opponentId]}
            tile={activeTile}
            action={pendingAction}
            isAction={isAction}
            onBuild={buildCity}
            onPayToll={payToll}
            onAcquire={acquireCity}
            onEndTurn={endTurn}
            getToll={getToll}
            hasColorMonopoly={hasColorMonopoly}
            winner={winner}
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
          contain: "paint",
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
          className="hb-board-stage"
          sx={{
            position: "absolute",
            left: "50%",
            top: { xs: "56%", sm: "55%", md: "53.5%", lg: "52%" },
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
              left: -20,
              right: -20,
              bottom: -58,
              height: 58,
              borderRadius: "0 0 34px 34px",
              background:
                "linear-gradient(180deg, rgba(198,238,255,0.64), rgba(126,204,239,0.54) 58%, rgba(255,181,220,0.42))",
              border: "1px solid rgba(255,255,255,0.76)",
              borderTop: 0,
              backdropFilter: "blur(16px) saturate(1.3)",
              boxShadow:
                "0 24px 36px rgba(82,145,196,0.24), inset 0 -16px 24px rgba(72,151,206,0.22)",
              transform: "translateZ(-26px)",
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
            user1={user1}
            user2={user2}
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
            className="hb-dice-panel"
            sx={{
              position: "absolute",
              left: "50%",
              top: "55%",
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
              sx={{
                width: 118,
                height: 118,
                borderRadius: "50%",
                color: "#ffffff",
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 0,
                background:
                  "radial-gradient(circle at 34% 24%, rgba(255,255,255,0.82), rgba(255,117,189,0.76) 48%, rgba(124,207,255,0.76) 100%)",
                border: "1px solid rgba(255,255,255,0.86)",
                backdropFilter: "blur(14px) saturate(1.35)",
                boxShadow:
                  "0 22px 32px rgba(91,152,205,0.28), inset 0 8px 12px rgba(255,255,255,0.34)",
                textShadow: "0 2px 2px rgba(68,123,176,0.38)",
                zIndex: 2,
                "&:hover": {
                  background:
                    "radial-gradient(circle at 34% 24%, rgba(255,255,255,0.9), rgba(255,131,197,0.82) 48%, rgba(141,220,255,0.82) 100%)",
                  boxShadow:
                    "0 20px 30px rgba(91,152,205,0.3), inset 0 8px 12px rgba(255,255,255,0.38)",
                },
              }}
            >
              {isRolling ? "..." : "ROLL"}
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
                px: 3,
                py: 1,
                borderRadius: "14px",
                fontWeight: 900,
                background: "linear-gradient(180deg, #ff8f5b, #e94335)",
                boxShadow: "0 7px 0 #9e1e22, 0 12px 20px rgba(131,36,25,0.3)",
                "&:hover": {
                  background: "linear-gradient(180deg, #ffa26f, #ef4b39)",
                  boxShadow:
                    "0 6px 0 #9e1e22, 0 10px 18px rgba(131,36,25,0.32)",
                },
              }}
            >
              주사위 굴리기
            </Button>
            {!!activePlayer.tollPasses && (
              <Typography variant="caption">
                통행료 면제권 {activePlayer.tollPasses}장
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>

      <Dialog
        open={pendingAction?.type === "goldenKey"}
        onClose={resolveGoldenKeyMovement}
        sx={dialogLayerSx}
      >
        <DialogTitle>{pendingAction?.card?.title}</DialogTitle>
        <DialogContent>
          <Typography>{pendingAction?.card?.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={resolveGoldenKeyMovement} variant="contained">
            확인
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pendingAction?.type === "worldTravel"}
        hideBackdrop
        disableAutoFocus
        disableEnforceFocus
        sx={{
          ...dialogLayerSx,
          pointerEvents: "none",
          "& .MuiDialog-paper": {
            ...dialogLayerSx["& .MuiDialog-paper"],
            pointerEvents: "auto",
          },
        }}
      >
        <DialogTitle>세계여행</DialogTitle>
        <DialogContent sx={{ minWidth: 360, pt: 1 }}>
          <SelectionGuide
            title="이동할 블록을 보드에서 클릭하세요"
            count={buildableTiles.length}
          />
          <TileInfoCard
            tile={selectedDestinationTile}
            getToll={getToll}
            hasColorMonopoly={hasColorMonopoly}
            fallback="아직 목적지가 선택되지 않았습니다."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={endTurn} color="inherit">
            건너뛰기
          </Button>
          <Button
            onClick={selectWorldTravelDestination}
            variant="contained"
            disabled={!selectedDestination}
          >
            이동
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={pendingAction?.type === "olympic"}
        hideBackdrop
        disableAutoFocus
        disableEnforceFocus
        sx={{
          ...dialogLayerSx,
          pointerEvents: "none",
          "& .MuiDialog-paper": {
            ...dialogLayerSx["& .MuiDialog-paper"],
            pointerEvents: "auto",
          },
        }}
      >
        <DialogTitle>올림픽 개최지 선택</DialogTitle>
        <DialogContent sx={{ minWidth: 360, pt: 1 }}>
          <SelectionGuide
            title="내가 보유한 블록을 보드에서 클릭하세요"
            count={getOwnedBuildableTiles(turn).length}
          />
          <TileInfoCard
            tile={selectedOlympicTile}
            getToll={getToll}
            hasColorMonopoly={hasColorMonopoly}
            fallback="아직 개최지가 선택되지 않았습니다."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={endTurn} color="inherit">
            건너뛰기
          </Button>
          <Button
            onClick={selectOlympicCity}
            variant="contained"
            disabled={!selectedOlympicCity}
          >
            개최
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!winner} sx={dialogLayerSx}>
        <DialogTitle>
          {winner?.victoryType === "bankruptcy" ? "게임 종료" : "휴양지 독점 승리"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={1.5}>
            <Typography variant="h6" fontWeight={950} color="#102f4e">
              승리자: {winner?.name}
            </Typography>
            {winner?.victoryType === "bankruptcy" ? (
              <Typography>
                {winner?.loser?.name}님의 보유 금액이 0원보다 작아져 게임이 종료되었습니다.
              </Typography>
            ) : (
              <Typography>
                {winner?.name}님이 모든 휴양지를 모아 게임에서 승리했습니다.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={restartGame}>
            다시하기
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default App;

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
  width: 360,
  maxWidth: 360,
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

const SelectionGuide = ({ title, count }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    sx={{
      mb: 1.5,
      p: 1.25,
      borderRadius: "14px",
      background:
        "linear-gradient(135deg, rgba(232,248,255,0.94), rgba(226,249,242,0.92))",
      border: "1px solid rgba(255,255,255,0.86)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
    }}
  >
    <Typography fontWeight={900} color="#173653">
      {title}
    </Typography>
    <Chip label={`${count}곳`} size="small" color="primary" />
  </Stack>
);

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
          label={tile.kind === "resort" ? "휴양지" : "도시"}
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
        <Typography>
          현재 건물: {ownerCost?.label || "없음"}
        </Typography>
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
}) => {
  const [costOption, setCostOption] = useState("");

  useEffect(() => {
    setCostOption("");
  }, [tile?.idx, action?.type]);

  if (winner || !isAction || !action) return null;

  if (action.type === "message") {
    return (
      <Stack sx={actionPanelSx}>
        <Typography variant="h6">{action.title}</Typography>
        <Typography>{action.description}</Typography>
        <Button variant="contained" onClick={onEndTurn}>
          턴 종료
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
              getToll(tile) + ownerCost.build * 2
            )}`}</Typography>
          ) : (
            <Typography>휴양지는 인수할 수 없습니다.</Typography>
          )}
          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              color="inherit"
              onClick={() => onPayToll(tile)}
            >
              통행료 지불
            </Button>
            {canAcquire && (
              <Button variant="contained" onClick={() => onAcquire(tile)}>
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
            selectedCost?.build || 0
          )}`}</Typography>
          <Typography>{`통행료: ${NumberToMoney(
            selectedCost?.toll || 0
          )}`}</Typography>
          {!tile.owner && tile.kind === "city" && (
            <Typography variant="caption">
              랜드마크는 내 건물이 있는 도시에서만 지을 수 있습니다.
            </Typography>
          )}
          {!tile.owner && isResort && (
            <Typography variant="caption">
              모든 휴양지를 모으면 즉시 승리합니다.
            </Typography>
          )}
          <ToggleButtonGroup
            color="primary"
            value={costOption}
            exclusive
            sx={{
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 0.75,
              overflow: "visible",
              "& .MuiToggleButtonGroup-grouped": {
                margin: "0 !important",
                borderLeft: "1px solid rgba(74,123,165,0.2) !important",
              },
              "& .MuiToggleButton-root": {
                minWidth: 70,
                minHeight: 42,
                color: "#173653",
                border: "1px solid rgba(74,123,165,0.2) !important",
                borderRadius: "14px !important",
                fontWeight: 950,
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
                  color: "#08354b",
                  borderColor: "#2ba9bd !important",
                  background: "linear-gradient(180deg, #d8fbff, #6dd7ea)",
                  boxShadow:
                    "0 6px 0 #187f98, inset 0 1px 0 rgba(255,255,255,0.78)",
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
                !isResort &&
                (isOpponentCity ||
                  (!tile.owner && key === "landmark") ||
                  (isOwnCity && optionIndex <= currentBuildIndex));

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
            <Button variant="contained" color="inherit" onClick={onEndTurn}>
              턴 종료
            </Button>
            {(!tile.owner || isOwnCity) && (
              <Button
                variant="contained"
                onClick={() => onBuild(tile, costOption)}
                disabled={
                  !isSelectedBuildAllowed || selectedCost?.build > player.money
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
  user1,
  user2,
  tokenLayer,
  onBlockClick,
  getIsSelectable,
  selectedTileIdx,
}) =>
  board.map((item, index) => {
    let block = {
      width: blockWidth,
      height: blockHeight,
    };
    const sideIndex = parseInt(index / 8, 10);
    const side = ["bottom", "left", "top", "right"][sideIndex] || "bottom";

    const position = {
      top: mapHeight - blockHeight,
      left: mapWidth - blockWidth,
    };

    const num = index % 8;
    const num2 = index / 8;
    const gap = blockHeight - blockWidth;

    switch (sideIndex) {
      case 0:
        position.top = mapHeight - blockHeight + gap;
        position.left = mapWidth + 2 * gap - (num + 1) * blockWidth;
        break;
      case 1:
        position.top = mapHeight - (num + 1) * blockHeight + gap;
        position.left = Number.isInteger(num2) ? 0 : 2 * gap;
        break;
      case 2:
        position.top = Number.isInteger(num2) ? 0 : gap;
        position.left = Number.isInteger(num2)
          ? num * blockWidth
          : num * blockWidth + 2 * gap;
        break;
      case 3:
        position.top = Number.isInteger(num2)
          ? num * blockHeight
          : num * blockHeight + gap;
        position.left = mapWidth + 2 * gap - blockWidth;
        break;
      default:
        break;
    }

    if (Number.isInteger(num2)) {
      const size = block.height + gap;
      block = { width: size, height: size };
    }

    return (
      <Block
        key={`block-${index}`}
        data={item}
        position={position}
        block={block}
        side={side}
        user1={user1.position === index ? user1 : null}
        user2={user2.position === index ? user2 : null}
        tokenLayer={tokenLayer}
        onClick={onBlockClick ? () => onBlockClick(item) : undefined}
        isSelectable={getIsSelectable?.(item)}
        isSelected={selectedTileIdx === item.idx}
      />
    );
  });

