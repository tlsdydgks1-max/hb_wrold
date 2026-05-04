import { Box, Button, Chip, Stack, Typography } from "@mui/material";

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

export default ActionGuide;
