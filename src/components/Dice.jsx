import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import DiceBox from "@3d-dice/dice-box";
import { Box } from "@mui/material";

const DICE_ASSET_PATH = "/assets/dice-box/";
const DICE_THEME = "hb-marble";
const DICE_THEME_COLOR = "#dffaff";
const TOUCH_VIEWPORT_QUERY = "(hover: none) and (pointer: coarse)";

const getFallbackRoll = () => [
  Math.floor(Math.random() * 6) + 1,
  Math.floor(Math.random() * 6) + 1,
];

const parseDiceValues = (results) => {
  const dice = (Array.isArray(results) ? results : [results]).flatMap((item) =>
    Array.isArray(item?.rolls) ? item.rolls : item
  );
  const values = dice
    .map((die) => Number(die?.value ?? die?.result))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6);

  return values.length >= 2 ? values.slice(0, 2) : getFallbackRoll();
};

const DiceRoller = forwardRef(function DiceRoller(
  { values, isRolling, disabled, onReady, onError },
  ref
) {
  const generatedId = useId();
  const containerId = `dice-box-${generatedId.replace(/:/g, "")}`;
  const diceBoxRef = useRef(null);
  const isReadyRef = useRef(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const isTouchViewport =
      window.matchMedia?.(TOUCH_VIEWPORT_QUERY).matches ?? false;
    const diceBox = new DiceBox(`#${containerId}`, {
      assetPath: DICE_ASSET_PATH,
      theme: DICE_THEME,
      themeColor: DICE_THEME_COLOR,
      offscreen: !isTouchViewport,
      scale: 10.4,
      gravity: 3.15,
      mass: 3.2,
      friction: 0.82,
      restitution: 0.12,
      linearDamping: 0.52,
      angularDamping: 0.4,
    });

    diceBox
      .init()
      .then(() => {
        if (!isMounted) return;
        diceBoxRef.current = diceBox;
        isReadyRef.current = true;
        onReady?.(true);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("DiceBox failed to initialize. Falling back to random dice.", error);
        setIsFallback(true);
        onError?.(error);
        onReady?.(true);
      });

    return () => {
      isMounted = false;
      diceBoxRef.current?.clear?.();
      diceBoxRef.current = null;
      isReadyRef.current = false;
    };
  }, [containerId, onError, onReady]);

  useImperativeHandle(ref, () => ({
    async roll() {
      if (disabled || isFallback || !isReadyRef.current || !diceBoxRef.current) {
        return getFallbackRoll();
      }

      try {
        const results = await diceBoxRef.current.roll("2d6");
        return parseDiceValues(results);
      } catch (error) {
        console.error("Dice roll failed. Falling back to random dice.", error);
        onError?.(error);
        return getFallbackRoll();
      }
    },
  }));

  return (
    <Box
      className="hb-dice-layer"
      sx={{
        position: "absolute",
        left: "50%",
        top: -126,
        width: 500,
        height: 390,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        opacity: disabled && !isRolling ? 0.58 : 1,
        transition: "opacity 180ms ease",
        zIndex: 0,
        filter: "drop-shadow(0 24px 28px rgba(82,145,196,0.24))",
        "& canvas": {
          width: "100% !important",
          height: "100% !important",
          display: "block",
          position: "relative",
          zIndex: 1,
          filter: "brightness(1.16) saturate(1.08)",
        },
      }}
    >
      <Box
        id={containerId}
        data-values={`${values[0]}-${values[1]}`}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "transparent",
        }}
      />
    </Box>
  );
});

export default DiceRoller;
