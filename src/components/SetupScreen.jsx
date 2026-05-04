import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

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

export default SetupScreen;
