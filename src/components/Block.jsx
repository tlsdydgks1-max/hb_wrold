import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Avatar, Box, Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import FlagIcon from "@mui/icons-material/Flag";
import HomeIcon from "@mui/icons-material/Home";
import HotelIcon from "@mui/icons-material/Hotel";
import LandscapeIcon from "@mui/icons-material/Landscape";
import PaidIcon from "@mui/icons-material/Paid";

const OwnerIcon = ({ type }) => {
  switch (type) {
    case "land":
      return <FlagIcon fontSize="small" />;
    case "villa":
      return <HomeIcon fontSize="small" />;
    case "building":
      return <ApartmentIcon fontSize="small" />;
    case "hotel":
      return <HotelIcon fontSize="small" />;
    case "landmark":
      return <AccountBalanceIcon fontSize="small" />;
    case "resort":
      return <BeachAccessIcon fontSize="small" />;
    default:
      return <FlagIcon fontSize="small" />;
  }
};

const TileIcon = ({ kind }) => {
  switch (kind) {
    case "goldenKey":
      return <CardGiftcardIcon fontSize="small" />;
    case "worldTravel":
      return <FlightTakeoffIcon fontSize="small" />;
    case "olympic":
      return <EmojiEventsIcon fontSize="small" />;
    case "tax":
      return <PaidIcon fontSize="small" />;
    case "island":
      return <LandscapeIcon fontSize="small" />;
    default:
      return null;
  }
};

const PlayerToken = ({ player, label, sx }) => {
  const theme = useTheme();
  const tokenColor =
    player.color?.split(".").reduce((value, key) => value?.[key], theme.palette) ||
    player.color;

  return (
    <Box
      className="hb-player-token"
      sx={{
        position: "absolute",
        width: "calc(var(--token-size) * 1.22)",
        height: "calc(var(--token-size) * 1.58)",
        zIndex: 11,
        pointerEvents: "none",
        ...sx,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "3%",
          width: "calc(var(--token-size) * 1.08)",
          height: "calc(var(--token-size) * 1.08)",
          transform: "translateX(-50%) rotate(-45deg)",
          borderRadius: "50% 50% 50% 0",
          background: tokenColor,
          boxShadow:
            "inset 6px 6px 10px rgba(255,255,255,0.18), inset -7px -7px 12px rgba(18,45,78,0.16)",
        }}
      />
      <Avatar
        src={player.img}
        imgProps={{
          draggable: false,
          sx: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "auto",
          },
        }}
        sx={{
          position: "absolute",
          left: "50%",
          top: "11%",
          transform: "translateX(-50%)",
          width: "calc(var(--token-size) * 0.84)",
          height: "calc(var(--token-size) * 0.84)",
          bgcolor: tokenColor,
          border: "3px solid #ffffff",
          fontSize: "calc(var(--token-size) * 0.28)",
          fontWeight: 900,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.72)",
        }}
      >
        {label}
      </Avatar>
    </Box>
  );
};

const getTileSurface = (data, tileColor) => {
  switch (data?.kind) {
    case "goldenKey":
      return {
        accent: "#f3bd2c",
        surface: "#fff6d8",
      };
    case "worldTravel":
      return {
        accent: "#5aaee0",
        surface: "#e4f5ff",
        specialSurface:
          "linear-gradient(145deg, #c8efff 0%, #8ec9ef 52%, #d9ecff 100%)",
      };
    case "olympic":
      return {
        accent: "#d48f50",
        surface: "#fff0df",
        specialSurface:
          "linear-gradient(145deg, #ffe6aa 0%, #eeb475 48%, #bfd9ff 100%)",
      };
    case "tax":
      return {
        accent: "#e84a3a",
        surface: "#fff0ec",
      };
    case "island":
      return {
        accent: "#63b783",
        surface: "#eaf8ed",
        specialSurface:
          "linear-gradient(145deg, #d6efc9 0%, #91d3ad 52%, #c9e9ff 100%)",
      };
    case "bonus":
      return {
        accent: "#8bbd23",
        surface: "#f7ffdf",
      };
    case "start":
      return {
        accent: "#b77ccf",
        surface: "#f8eaff",
        specialSurface:
          "linear-gradient(145deg, #ebd1ff 0%, #d9a7c9 48%, #ffd2bd 100%)",
      };
    default:
      return {
        accent: tileColor,
        surface: "#fffaf0",
      };
  }
};

const formatTileName = (name) => {
  const characters = Array.from(name || "");

  if (characters.length !== 4) return name || "";

  return `${characters.slice(0, 2).join("")}\n${characters.slice(2).join("")}`;
};

const sideConfig = {
  bottom: {
    rotation: 0,
    accent: { top: 0, left: 0, right: 0 },
  },
  left: {
    rotation: 90,
    accent: { top: 0, right: 0, bottom: 0 },
  },
  top: {
    rotation: 0,
    accent: { top: 0, left: 0, right: 0 },
  },
  right: {
    rotation: 90,
    accent: { top: 0, right: 0, bottom: 0 },
  },
};

const Block = ({
  data,
  position,
  block,
  side = "bottom",
  user1,
  user2,
  players = null,
  tokenLayer,
  onClick,
  isSelectable = false,
  isSelected = false,
}) => {
  const theme = useTheme();
  const blockRef = useRef(null);
  const [screenRect, setScreenRect] = useState(null);
  const isCorner = block.width === block.height;
  const isSpecialCorner = ["start", "island", "olympic", "worldTravel"].includes(
    data?.kind
  );
  const tileColor = data?.color || "#6f7782";
  const isProperty = data?.kind === "city" || data?.kind === "resort";
  const tileSurface = getTileSurface(data, tileColor);
  const layout = sideConfig[side] || sideConfig.bottom;
  const isVerticalSide = side === "left" || side === "right";
  const labelRotation = isSpecialCorner ? 45 : layout.rotation;
  const tileGap = isCorner ? 4 : 3;
  const accentThickness = isCorner ? 34 : 28;
  const labelWidth = isVerticalSide
    ? block.height - tileGap * 2 - 18
    : block.width - tileGap * 2 - 12;
  const tileName = formatTileName(data?.name);
  const ownerColor = data?.owner?.color;
  const ownerDisplayColor =
    ownerColor?.split(".").reduce((value, key) => value?.[key], theme.palette) ||
    ownerColor;
  const tileDropShadow =
    side === "top"
      ? "0 -8px 20px rgba(85,145,195,0.18)"
      : side === "right"
        ? "8px 0 20px rgba(85,145,195,0.18)"
        : side === "left"
          ? "-8px 0 20px rgba(85,145,195,0.18)"
          : "0 8px 20px rgba(85,145,195,0.18)";
  const ownedTileDropShadow =
    side === "top"
      ? "0 -10px 24px rgba(26,70,120,0.24)"
      : side === "right"
        ? "10px 0 24px rgba(26,70,120,0.24)"
        : side === "left"
          ? "-10px 0 24px rgba(26,70,120,0.24)"
          : "0 10px 24px rgba(26,70,120,0.24)";
  const cornerDropShadow =
    side === "top"
      ? "0 -8px 20px rgba(85,145,195,0.2)"
      : side === "right"
        ? "8px 0 20px rgba(85,145,195,0.2)"
        : side === "left"
          ? "-8px 0 20px rgba(85,145,195,0.2)"
          : "0 8px 20px rgba(85,145,195,0.2)";
  const ownerMarkerSize = isCorner ? 42 : 36;
  const ownerMarkerInset = tileGap - ownerMarkerSize / 2;
  const ownerMarkerPosition =
    side === "bottom"
      ? {
          top: ownerMarkerInset,
          left: "50%",
          transform: "translateX(-50%)",
        }
      : side === "top"
        ? {
            bottom: ownerMarkerInset,
            left: "50%",
            transform: "translateX(-50%)",
          }
        : side === "left"
          ? {
              right: ownerMarkerInset,
              top: "50%",
              transform: "translateY(-50%)",
            }
          : {
              left: ownerMarkerInset,
              top: "50%",
              transform: "translateY(-50%)",
          };
  const tilePlayers =
    players || [user1, user2].filter((player) => Boolean(player));

  useLayoutEffect(() => {
    const node = blockRef.current;
    if (!node || !tokenLayer || !tilePlayers.length) {
      setScreenRect(null);
      return undefined;
    }

    let frameId = 0;
    let lastRect = null;
    const updateRect = () => {
      const rect = node.getBoundingClientRect();
      const layerRect = tokenLayer.getBoundingClientRect();
      const nextRect = {
        left: Math.round(rect.left - layerRect.left),
        top: Math.round(rect.top - layerRect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      if (
        lastRect &&
        lastRect.left === nextRect.left &&
        lastRect.top === nextRect.top &&
        lastRect.width === nextRect.width &&
        lastRect.height === nextRect.height
      ) {
        return;
      }

      lastRect = nextRect;
      setScreenRect(nextRect);
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateRect);
    };

    updateRect();
    window.addEventListener("resize", scheduleUpdate);

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(node);
    observer.observe(tokenLayer);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleUpdate);
      observer.disconnect();
    };
  }, [
    tilePlayers,
    tokenLayer,
    block.width,
    block.height,
    position.left,
    position.top,
  ]);

  const getTokenSlot = (index, count) => {
    if (count <= 1) return 0;

    return index - (count - 1) / 2;
  };

  const renderPlayerToken = (player, label, slot = 0) => {
    if (!screenRect || !tokenLayer) return null;

    const flatTokenSize = Math.max(
      48,
      Math.min(76, Math.min(screenRect.width, screenRect.height) * 0.82)
    );
    const anchorX =
      screenRect.left + screenRect.width / 2 + slot * flatTokenSize * 0.36;
    const anchorY = screenRect.top + screenRect.height / 2 + flatTokenSize * 0.22;

    return createPortal(
      <PlayerToken
        player={player}
        label={label}
        sx={{
          "--token-size": `${flatTokenSize}px`,
          position: "absolute",
          left: anchorX,
          top: anchorY,
          zIndex: 10,
          transform: "translate(-50%, -100%)",
        }}
      />,
      tokenLayer
    );
  };

  return (
    <>
      <Box
        ref={blockRef}
        onClick={onClick}
        sx={{
          position: "absolute",
          ...position,
          width: block.width,
          height: block.height,
          transform: "translateZ(4px)",
          cursor: onClick ? "pointer" : "default",
        }}
      >
      <Box
        sx={{
          position: "absolute",
          inset: tileGap,
          display: "flex",
          overflow: "hidden",
          background: isSpecialCorner
            ? tileSurface.specialSurface || tileSurface.accent
            : `radial-gradient(circle at 28% 18%, rgba(255,255,255,0.95), transparent 28%), linear-gradient(145deg, ${tileSurface.accent}70, rgba(255,255,255,0.48) 48%, ${tileSurface.accent}38), ${tileSurface.surface}`,
          backdropFilter: "blur(12px) saturate(1.45)",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          color: "#243243",
          fontSize: isCorner ? "20px" : "17px",
          lineHeight: 1.05,
          fontWeight: 900,
          borderRadius: isCorner ? "18px" : "13px",
          border: ownerDisplayColor
            ? `4px solid ${ownerDisplayColor}`
            : "1px solid rgba(255,255,255,0.78)",
          boxShadow: isSpecialCorner
            ? `${cornerDropShadow}, inset 0 1px 0 rgba(255,255,255,0.48)`
            : ownerDisplayColor
              ? `${ownedTileDropShadow}, 0 0 0 3px rgba(255,255,255,0.92), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 0 7px ${ownerDisplayColor}33`
              : `${tileDropShadow}, inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 0 2px rgba(255,255,255,0.42), inset 0 0 0 6px ${tileSurface.accent}33`,
          outline: isSelected
            ? "5px solid rgba(255,201,52,0.95)"
            : isSelectable
              ? "3px solid rgba(36,160,224,0.76)"
              : "0 solid transparent",
          outlineOffset: isSelected ? 2 : 1,
          wordBreak: "keep-all",
          whiteSpace: "normal",
          px: 0.5,
          textShadow: "0 1px 0 rgba(255,255,255,0.9)",
          transition: "filter 160ms ease, outline-color 160ms ease",
          "&:hover": {
            filter: onClick ? "brightness(1.1) saturate(1.08)" : "brightness(1.08)",
          },
          ...block,
          width: "auto",
          height: "auto",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            ...layout.accent,
            display: isSpecialCorner ? "none" : "block",
            width: isVerticalSide ? accentThickness : "auto",
            height: isVerticalSide ? "auto" : accentThickness,
            background: `linear-gradient(180deg, rgba(255,255,255,0.3), transparent), ${tileSurface.accent}`,
            borderBottom:
              side === "bottom" ? "2px solid rgba(36,28,17,0.22)" : 0,
            borderTop: side === "top" ? "2px solid rgba(36,28,17,0.22)" : 0,
            borderLeft: side === "left" ? "2px solid rgba(36,28,17,0.22)" : 0,
            borderRight: side === "right" ? "2px solid rgba(36,28,17,0.22)" : 0,
            boxShadow:
              `inset 0 2px 0 rgba(255,255,255,0.46), 0 0 18px ${tileSurface.accent}66`,
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 6,
            borderRadius: isCorner ? "14px" : "9px",
            border: "1px solid rgba(255,255,255,0.42)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        <Box
          className="hb-tile-label"
          sx={{
            display: "grid",
            gap: 0.25,
            justifyItems: "center",
            alignItems: "center",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) rotate(${labelRotation}deg)`,
            transformOrigin: "center",
            zIndex: 1,
            width: labelWidth,
            minHeight: isProperty ? 34 : 44,
            px: 0.75,
            py: 0.45,
            color: isSpecialCorner ? "#ffffff" : "#18324a",
            borderRadius: "999px",
            background: isSpecialCorner
              ? "transparent"
              : "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.2))",
            backdropFilter: isSpecialCorner
              ? "none"
              : "blur(10px) saturate(1.12)",
            WebkitBackdropFilter: isSpecialCorner
              ? "none"
              : "blur(10px) saturate(1.12)",
            border: isSpecialCorner
              ? "0"
              : "1px solid rgba(255,255,255,0.32)",
            boxShadow: isSpecialCorner
              ? "none"
              : `inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 ${tileSurface.accent}18`,
            "& svg": {
              color: isSpecialCorner ? "#ffffff" : tileSurface.accent,
              fontSize: isCorner ? 24 : 18,
              filter: isSpecialCorner
                ? "drop-shadow(0 2px 2px rgba(41,86,134,0.35))"
                : "drop-shadow(0 1px 0 rgba(255,255,255,0.85))",
            },
            "& span": {
              display: "-webkit-box",
              maxWidth: "100%",
              overflow: "hidden",
              whiteSpace: "pre-line",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              textShadow: isSpecialCorner
                ? "0 2px 3px rgba(41,86,134,0.38)"
                : "0 1px 0 rgba(255,255,255,0.9)",
            },
          }}
        >
          <TileIcon kind={data?.kind} />
          <span>{tileName}</span>
        </Box>

        {data?.olympicHost && (
          <Chip
            size="small"
            icon={<EmojiEventsIcon />}
            label="2x"
            sx={{
              position: "absolute",
              bottom: 4,
              height: 20,
              zIndex: 2,
              color: "#4a2d00",
              backgroundColor: "rgba(255,213,79,0.78)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.72)",
              boxShadow: "0 3px 8px rgba(85,145,195,0.18)",
              "& .MuiChip-icon": { color: "#4a2d00", fontSize: 14 },
            }}
          />
        )}
      </Box>
      {data?.owner && (
        <Box
          sx={{
            position: "absolute",
            ...ownerMarkerPosition,
            color: "#ffffff",
            zIndex: 12,
            width: ownerMarkerSize,
            height: ownerMarkerSize,
            display: "grid",
            placeItems: "center",
            borderRadius: isCorner ? "12px" : "10px",
            background: ownerDisplayColor,
            backdropFilter: "blur(8px) saturate(1.2)",
            border: "3px solid rgba(255,255,255,0.96)",
            boxShadow:
              "0 10px 18px rgba(22,66,110,0.34), inset 0 1px 0 rgba(255,255,255,0.42), 0 0 0 2px rgba(31,54,80,0.14)",
            pointerEvents: "none",
            "& svg": {
              fontSize: isCorner ? 26 : 23,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))",
            },
          }}
        >
          <OwnerIcon type={data.owner.type} />
        </Box>
      )}
      </Box>
      {tilePlayers.map((player, index) =>
        renderPlayerToken(
          player,
          player.tokenLabel || String(index + 1),
          getTokenSlot(index, tilePlayers.length),
        ),
      )}
    </>
  );
};

export default Block;
