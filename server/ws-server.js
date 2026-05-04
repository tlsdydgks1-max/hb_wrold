import { WebSocket, WebSocketServer } from "ws";

const PORT = Number(process.env.HB_WS_PORT || 8787);
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 4;

const rooms = new Map();

export const createRoomCode = () => {
  let code = "";

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_ALPHABET[
      Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)
    ];
  }

  return code;
};

const createUniqueRoomCode = () => {
  let code = createRoomCode();

  while (rooms.has(code)) {
    code = createRoomCode();
  }

  return code;
};

const send = (socket, message) => {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const createPublicRoom = (room) => ({
  code: room.code,
  maxPlayers: room.maxPlayers,
  status: room.status,
  hostPlayerId: room.hostPlayerId,
  players: room.players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    slot: player.slot,
    connected: player.connected,
    isHost: player.playerId === room.hostPlayerId,
  })),
});

const broadcast = (room, message) => {
  room.players.forEach((player) => {
    send(player.socket, message);
  });
};

const broadcastLobby = (room) => {
  broadcast(room, {
    type: "lobby_update",
    roomCode: room.code,
    payload: { room: createPublicRoom(room) },
  });
};

const getPlayerBySocket = (socket) => {
  for (const room of rooms.values()) {
    const player = room.players.find((candidate) => candidate.socket === socket);

    if (player) {
      return { room, player };
    }
  }

  return null;
};

const rejectJoin = (socket, roomCode, reason) => {
  send(socket, {
    type: "join_rejected",
    roomCode,
    payload: { reason },
  });
};

const handleCreateRoom = (socket, message) => {
  const maxPlayers = Number(message.payload?.maxPlayers || 2);
  const name = String(message.payload?.name || "방장").trim().slice(0, 12);

  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
    send(socket, {
      type: "error",
      payload: { reason: "플레이 인원은 2~4명이어야 합니다." },
    });
    return;
  }

  const code = createUniqueRoomCode();
  const playerId = "player1";
  const room = {
    code,
    maxPlayers,
    status: "lobby",
    hostPlayerId: playerId,
    players: [
      {
        playerId,
        clientSessionId: message.clientSessionId,
        name,
        slot: 0,
        connected: true,
        socket,
      },
    ],
  };

  rooms.set(code, room);
  socket.hbRoomCode = code;
  socket.hbPlayerId = playerId;

  send(socket, {
    type: "room_created",
    roomCode: code,
    playerId,
    clientSessionId: message.clientSessionId,
    payload: {
      room: createPublicRoom(room),
    },
  });
  broadcastLobby(room);
};

const handleJoinRoom = (socket, message) => {
  const roomCode = String(message.roomCode || message.payload?.roomCode || "")
    .trim()
    .toUpperCase();
  const room = rooms.get(roomCode);

  if (!room) {
    rejectJoin(socket, roomCode, "존재하지 않는 방입니다.");
    return;
  }

  const requestedPlayerId = message.playerId || message.payload?.playerId;
  const existingPlayer = room.players.find(
    (player) =>
      player.clientSessionId === message.clientSessionId &&
      (!requestedPlayerId || player.playerId === requestedPlayerId),
  );

  if (existingPlayer) {
    existingPlayer.connected = true;
    existingPlayer.socket = socket;
    socket.hbRoomCode = room.code;
    socket.hbPlayerId = existingPlayer.playerId;

    send(socket, {
      type: "join_accepted",
      roomCode: room.code,
      playerId: existingPlayer.playerId,
      clientSessionId: message.clientSessionId,
      payload: {
        room: createPublicRoom(room),
        reconnected: true,
      },
    });
    send(socket, {
      type: "reconnect",
      roomCode: room.code,
      playerId: existingPlayer.playerId,
      payload: { room: createPublicRoom(room) },
    });
    broadcastLobby(room);
    return;
  }

  if (room.status !== "lobby") {
    rejectJoin(socket, room.code, "이미 시작된 방입니다.");
    return;
  }

  if (room.players.length >= room.maxPlayers) {
    rejectJoin(socket, room.code, "빈자리가 없습니다.");
    return;
  }

  const playerId = `player${room.players.length + 1}`;
  const name = String(message.payload?.name || `플레이어 ${room.players.length + 1}`)
    .trim()
    .slice(0, 12);
  const player = {
    playerId,
    clientSessionId: message.clientSessionId,
    name,
    slot: room.players.length,
    connected: true,
    socket,
  };

  room.players.push(player);
  socket.hbRoomCode = room.code;
  socket.hbPlayerId = playerId;

  send(socket, {
    type: "join_accepted",
    roomCode: room.code,
    playerId,
    clientSessionId: message.clientSessionId,
    payload: { room: createPublicRoom(room), reconnected: false },
  });
  broadcastLobby(room);
};

const handleStartGame = (socket, message) => {
  const room = rooms.get(message.roomCode);

  if (!room) return;
  if (socket.hbPlayerId !== room.hostPlayerId) {
    send(socket, {
      type: "error",
      roomCode: room.code,
      payload: { reason: "방장만 게임을 시작할 수 있습니다." },
    });
    return;
  }
  if (room.players.length !== room.maxPlayers) {
    send(socket, {
      type: "error",
      roomCode: room.code,
      payload: { reason: "모든 플레이어가 입장해야 시작할 수 있습니다." },
    });
    return;
  }

  room.status = "game";
  broadcast(room, {
    type: "start_game",
    roomCode: room.code,
    payload: { room: createPublicRoom(room) },
  });
  broadcastLobby(room);
};

const handlePlayerCommand = (socket, message) => {
  const room = rooms.get(message.roomCode);

  if (!room) return;

  const player = room.players.find(
    (candidate) => candidate.playerId === socket.hbPlayerId,
  );
  const host = room.players.find(
    (candidate) => candidate.playerId === room.hostPlayerId,
  );

  if (!player || !host) return;

  send(host.socket, {
    type: "player_command",
    roomCode: room.code,
    playerId: player.playerId,
    clientSessionId: player.clientSessionId,
    payload: message.payload,
  });
};

const handleGameSnapshot = (socket, message) => {
  const room = rooms.get(message.roomCode);

  if (!room || socket.hbPlayerId !== room.hostPlayerId) return;

  broadcast(room, {
    type: "game_snapshot",
    roomCode: room.code,
    playerId: room.hostPlayerId,
    payload: message.payload,
  });
};

const handleDisconnect = (socket) => {
  const entry = getPlayerBySocket(socket);

  if (!entry) return;

  entry.player.connected = false;
  entry.player.socket = null;
  broadcastLobby(entry.room);
};

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket) => {
  socket.on("message", (data) => {
    let message = null;

    try {
      message = JSON.parse(data.toString());
    } catch {
      send(socket, {
        type: "error",
        payload: { reason: "메시지 형식이 올바르지 않습니다." },
      });
      return;
    }

    switch (message.type) {
      case "create_room":
        handleCreateRoom(socket, message);
        break;
      case "join_room":
        handleJoinRoom(socket, message);
        break;
      case "start_game":
        handleStartGame(socket, message);
        break;
      case "player_command":
        handlePlayerCommand(socket, message);
        break;
      case "game_snapshot":
        handleGameSnapshot(socket, message);
        break;
      default:
        send(socket, {
          type: "error",
          payload: { reason: "지원하지 않는 메시지입니다." },
        });
        break;
    }
  });

  socket.on("close", () => handleDisconnect(socket));
  socket.on("error", () => handleDisconnect(socket));
});

console.log(`hb_world WebSocket server listening on ws://localhost:${PORT}`);
