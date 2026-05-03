import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CLIENT_SESSION_KEY = "hb_world.clientSessionId";
const ROOM_SESSION_KEY = "hb_world.roomSession";

const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const readJson = (key) => {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  sessionStorage.setItem(key, JSON.stringify(value));
};

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:8787`;
};

const getClientSessionId = () => {
  const existing = sessionStorage.getItem(CLIENT_SESSION_KEY);

  if (existing) return existing;

  const next = createId();
  sessionStorage.setItem(CLIENT_SESSION_KEY, next);
  return next;
};

export const useMultiplayer = () => {
  const socketRef = useRef(null);
  const clientSessionId = useMemo(getClientSessionId, []);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [room, setRoom] = useState(null);
  const [localPlayerId, setLocalPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState("");

  const rememberRoom = useCallback((nextRoom, playerId, hostFlag, name) => {
    writeJson(ROOM_SESSION_KEY, {
      roomCode: nextRoom.code,
      playerId,
      isHost: hostFlag,
      name,
    });
  }, []);

  const sendRaw = useCallback((message) => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("WebSocket 서버에 연결되지 않았습니다.");
      return false;
    }

    socket.send(
      JSON.stringify({
        ...message,
        clientSessionId,
      }),
    );
    return true;
  }, [clientSessionId]);

  const emitEvent = useCallback((event) => {
    setLastEvent({
      ...event,
      eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  }, []);

  useEffect(() => {
    const socket = new WebSocket(getWsUrl());
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnectionStatus("connected");
      setError("");

      const savedRoom = readJson(ROOM_SESSION_KEY);
      if (savedRoom?.roomCode && savedRoom?.playerId) {
        socket.send(
          JSON.stringify({
            type: "join_room",
            roomCode: savedRoom.roomCode,
            playerId: savedRoom.playerId,
            clientSessionId,
            payload: {
              roomCode: savedRoom.roomCode,
              playerId: savedRoom.playerId,
              name: savedRoom.name,
            },
          }),
        );
      }
    });

    socket.addEventListener("close", () => {
      setConnectionStatus("disconnected");
    });

    socket.addEventListener("error", () => {
      setConnectionStatus("disconnected");
      setError("WebSocket 서버와 연결할 수 없습니다.");
    });

    socket.addEventListener("message", (event) => {
      let message = null;

      try {
        message = JSON.parse(event.data);
      } catch {
        setError("서버 메시지 형식이 올바르지 않습니다.");
        return;
      }

      switch (message.type) {
        case "room_created": {
          const nextRoom = message.payload.room;
          const playerId = message.playerId;
          setRoom(nextRoom);
          setLocalPlayerId(playerId);
          setIsHost(true);
          rememberRoom(
            nextRoom,
            playerId,
            true,
            nextRoom.players.find((player) => player.playerId === playerId)
              ?.name,
          );
          emitEvent({ type: "room_created", payload: message.payload });
          break;
        }
        case "join_accepted": {
          const nextRoom = message.payload.room;
          const playerId = message.playerId;
          const hostFlag = nextRoom.hostPlayerId === playerId;
          setRoom(nextRoom);
          setLocalPlayerId(playerId);
          setIsHost(hostFlag);
          rememberRoom(
            nextRoom,
            playerId,
            hostFlag,
            nextRoom.players.find((player) => player.playerId === playerId)
              ?.name,
          );
          emitEvent({ type: "join_accepted", payload: message.payload });
          break;
        }
        case "join_rejected":
          setError(message.payload?.reason || "방에 참여할 수 없습니다.");
          sessionStorage.removeItem(ROOM_SESSION_KEY);
          emitEvent({ type: "join_rejected", payload: message.payload });
          break;
        case "lobby_update":
          setRoom(message.payload.room);
          emitEvent({ type: "lobby_update", payload: message.payload });
          break;
        case "start_game":
          setRoom(message.payload.room);
          emitEvent({ type: "start_game", payload: message.payload });
          break;
        case "player_command":
          emitEvent({
            type: "player_command",
            playerId: message.playerId,
            payload: message.payload,
          });
          break;
        case "game_snapshot":
          emitEvent({ type: "game_snapshot", payload: message.payload });
          break;
        case "reconnect":
          setRoom(message.payload.room);
          emitEvent({ type: "reconnect", payload: message.payload });
          break;
        case "error":
          setError(message.payload?.reason || "서버 오류가 발생했습니다.");
          emitEvent({ type: "error", payload: message.payload });
          break;
        default:
          break;
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [clientSessionId, emitEvent, rememberRoom]);

  const createRoom = useCallback(
    ({ name, maxPlayers }) =>
      sendRaw({
        type: "create_room",
        payload: { name, maxPlayers },
      }),
    [sendRaw],
  );

  const joinRoom = useCallback(
    ({ roomCode, name }) =>
      sendRaw({
        type: "join_room",
        roomCode: roomCode.toUpperCase(),
        payload: { roomCode: roomCode.toUpperCase(), name },
      }),
    [sendRaw],
  );

  const startGame = useCallback(
    () =>
      sendRaw({
        type: "start_game",
        roomCode: room?.code,
        playerId: localPlayerId,
      }),
    [localPlayerId, room?.code, sendRaw],
  );

  const sendPlayerCommand = useCallback(
    (command) =>
      sendRaw({
        type: "player_command",
        roomCode: room?.code,
        playerId: localPlayerId,
        payload: command,
      }),
    [localPlayerId, room?.code, sendRaw],
  );

  const sendGameSnapshot = useCallback(
    (snapshot) =>
      sendRaw({
        type: "game_snapshot",
        roomCode: room?.code,
        playerId: localPlayerId,
        payload: { snapshot },
      }),
    [localPlayerId, room?.code, sendRaw],
  );

  const clearRoomSession = useCallback(() => {
    sessionStorage.removeItem(ROOM_SESSION_KEY);
    setRoom(null);
    setLocalPlayerId(null);
    setIsHost(false);
    setError("");
  }, []);

  return {
    clientSessionId,
    connectionStatus,
    room,
    localPlayerId,
    isHost,
    lastEvent,
    error,
    createRoom,
    joinRoom,
    startGame,
    sendPlayerCommand,
    sendGameSnapshot,
    clearRoomSession,
  };
};
