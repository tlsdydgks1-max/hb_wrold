import { Avatar, Box, Stack } from "@mui/material";
import { NumberToMoney } from "@/util/numberToMoney";

const User = ({ data, rank, anchor = "left", sx }) => {
  const isRight = anchor === "right";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isRight ? "row-reverse" : "row",
        alignItems: "center",
        gap: { xs: 0.6, sm: 0.9, md: 1.2, lg: 1.5 },
        width: { xs: 150, sm: 190, md: 240, lg: 280 },
        p: { xs: 0.55, sm: 0.75, md: 1, lg: 1.25 },
        pr: isRight
          ? { xs: 0.55, sm: 0.75, md: 1, lg: 1.25 }
          : { xs: 2.65, sm: 3.4, md: 4.4, lg: 5.25 },
        pl: isRight
          ? { xs: 2.65, sm: 3.4, md: 4.4, lg: 5.25 }
          : { xs: 0.55, sm: 0.75, md: 1, lg: 1.25 },
        color: "#285077",
        borderRadius: { xs: "11px", sm: "13px", md: "16px", lg: "18px" },
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(223,247,255,0.42))",
        border: "1px solid rgba(255,255,255,0.82)",
        backdropFilter: "blur(16px) saturate(1.32)",
        boxShadow:
          "0 18px 32px rgba(90,151,204,0.22), inset 0 1px 0 rgba(255,255,255,0.92)",
        position: "relative",
        ...sx,
      }}
    >
      <Avatar
        src={data.img}
        sx={{
          width: { xs: 32, sm: 38, md: 46, lg: 54 },
          height: { xs: 32, sm: 38, md: 46, lg: 54 },
          bgcolor: data.color,
          border: { xs: "2px solid #ffffff", md: "3px solid #ffffff" },
          boxShadow: "0 8px 18px rgba(116,186,220,0.28)",
        }}
      />
      <Stack sx={{ minWidth: 0, alignItems: isRight ? "flex-end" : "flex-start" }}>
        <Box
          component="b"
          sx={{
            fontSize: { xs: 12, sm: 14, md: 16, lg: 18 },
            lineHeight: 1.1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.name}
        </Box>
        <Box
          component="span"
          sx={{
            color: "#ff68b2",
            fontSize: { xs: 10, sm: 11, md: 12, lg: 14 },
            fontWeight: 900,
            textShadow: "0 1px 0 rgba(255,255,255,0.82)",
          }}
        >
          {NumberToMoney(data.money)}
        </Box>
      </Stack>
      {rank && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            [isRight ? "left" : "right"]: { xs: -9, sm: -12, md: -15, lg: -18 },
            transform: "translateY(-50%)",
            width: { xs: 32, sm: 40, md: 48, lg: 58 },
            height: { xs: 32, sm: 40, md: 48, lg: 58 },
            display: "grid",
            placeItems: "center",
            color: "#ffffff",
            fontSize: { xs: 11, sm: 14, md: 17, lg: 20 },
            fontWeight: 900,
            borderRadius: "50%",
            background:
              rank.startsWith("1")
                ? "linear-gradient(180deg, rgba(65,180,242,0.9), rgba(15,116,200,0.82))"
                : "linear-gradient(180deg, rgba(255,142,203,0.92), rgba(232,76,158,0.84))",
            border: "1px solid rgba(255,255,255,0.86)",
            backdropFilter: "blur(12px) saturate(1.25)",
            boxShadow:
              "0 10px 18px rgba(100,165,206,0.24), inset 0 1px 0 rgba(255,255,255,0.56)",
            textShadow: "0 2px 2px rgba(58,121,178,0.42)",
          }}
        >
          {rank}
        </Box>
      )}
    </Box>
  );
};

export default User;
