import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { Box } from "@mui/material";

const DICE_ASSET_PATH = "/assets/dice-box-threejs/";
const DICE_NOTATION_TYPE = "dpip";
const DICE_THROW_WIDTH = 810;
const DICE_THROW_HEIGHT = 630;
const LOW_POWER_DICE_QUERY =
  "(hover: none) and (pointer: coarse), (prefers-reduced-motion: reduce)";
const DIE_PIP_SLOTS = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};
const DICE_THEME_COLOR = {
  name: "HB Marble",
  foreground: "#16324a",
  background: "#fff8fb",
  outline: "none",
  edge: "#7dcfff",
  texture: "none",
  material: "plastic",
};

const normalizeDiceValues = (values) => {
  const normalized = (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 6)
    .slice(0, 2);

  while (normalized.length < 2) {
    normalized.push(Math.floor(Math.random() * 6) + 1);
  }

  return normalized;
};

const getFallbackRoll = () => normalizeDiceValues([]);

const createPredeterminedNotation = (values) => {
  const normalized = normalizeDiceValues(values);

  return {
    values: normalized,
    notation: `2${DICE_NOTATION_TYPE}@${normalized[0]},${normalized[1]}`,
  };
};

const getShouldUseLowPowerDice = () =>
  Boolean(
    typeof window !== "undefined" &&
      window.matchMedia?.(LOW_POWER_DICE_QUERY).matches,
  );

const useLowPowerDice = () => {
  const [shouldUseLowPowerDice, setShouldUseLowPowerDice] = useState(
    getShouldUseLowPowerDice,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia(LOW_POWER_DICE_QUERY);
    const updatePreference = () => {
      setShouldUseLowPowerDice(mediaQuery.matches);
    };

    updatePreference();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updatePreference);
    } else {
      mediaQuery.addListener?.(updatePreference);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updatePreference);
      } else {
        mediaQuery.removeListener?.(updatePreference);
      }
    };
  }, []);

  return shouldUseLowPowerDice;
};

const StaticDie = ({ value }) => {
  const pipSlots = DIE_PIP_SLOTS[value] || DIE_PIP_SLOTS[1];

  return (
    <Box
      sx={{
        width: { xs: 54, sm: 66, md: 76 },
        height: { xs: 54, sm: 66, md: 76 },
        p: { xs: 0.75, sm: 0.9, md: 1 },
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: 0.45,
        borderRadius: { xs: "12px", sm: "14px", md: "16px" },
        background: "linear-gradient(180deg, #ffffff, #f4fbff)",
        border: "2px solid rgba(255,255,255,0.92)",
        boxShadow:
          "0 10px 20px rgba(35, 86, 132, 0.2), inset 0 2px 0 rgba(255,255,255,0.96)",
      }}
    >
      {Array.from({ length: 9 }, (_, index) => {
        const slot = index + 1;
        const isVisible = pipSlots.includes(slot);

        return (
          <Box
            key={`pip-${value}-${slot}`}
            sx={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: isVisible ? "#173653" : "transparent",
            }}
          />
        );
      })}
    </Box>
  );
};

const StaticDice = ({ values }) => (
  <Box
    sx={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -58%)",
      display: "flex",
      gap: { xs: 1, sm: 1.25, md: 1.5 },
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {values.map((value, index) => (
      <StaticDie key={`static-die-${index}`} value={value} />
    ))}
  </Box>
);

const DiceRoller = forwardRef(function DiceRoller(
  { values, isRolling, disabled, rollId, onReady, onError },
  ref
) {
  const generatedId = useId();
  const containerId = `dice-box-${generatedId.replace(/:/g, "")}`;
  const diceBoxRef = useRef(null);
  const isReadyRef = useRef(false);
  const shouldUseLowPowerDice = useLowPowerDice();
  const [isFallback, setIsFallback] = useState(false);
  const [isThreeReady, setIsThreeReady] = useState(false);
  const normalizedValues = useMemo(() => normalizeDiceValues(values), [values]);

  useEffect(() => {
    let isMounted = true;

    const clearDiceBox = ({ updateState = true } = {}) => {
      diceBoxRef.current?.clearDice?.();
      diceBoxRef.current = null;
      isReadyRef.current = false;
      if (updateState && isMounted) {
        setIsThreeReady(false);
      }
    };

    if (shouldUseLowPowerDice) {
      clearDiceBox();
      setIsFallback(true);
      onReady?.(true);

      return () => {
        isMounted = false;
        onReady?.(false);
      };
    }

    setIsFallback(false);
    onReady?.(false);

    const initializeDiceBox = async () => {
      let diceBox = null;

      try {
        const { default: DiceBox } = await import("@3d-dice/dice-box-threejs");

        if (!isMounted) return;

        diceBox = new DiceBox(`#${containerId}`, {
          assetPath: DICE_ASSET_PATH,
          sounds: false,
          shadows: false,
          theme_surface: "green-felt",
          theme_colorset: "white",
          theme_customColorset: DICE_THEME_COLOR,
          theme_texture: "",
          theme_material: "plastic",
          framerate: 1 / 45,
          gravity_multiplier: 360,
          light_intensity: 0.72,
          baseScale: 112,
          strength: 1.1,
        });

        await diceBox.initialize();

        if (!isMounted) {
          diceBox?.clearDice?.();
          return;
        }
        diceBoxRef.current = diceBox;
        isReadyRef.current = true;
        setIsFallback(false);
        setIsThreeReady(true);
        onReady?.(true);
      } catch (error) {
        diceBox?.clearDice?.();
        if (!isMounted) return;
        console.error(
          "ThreeJS DiceBox failed to initialize. Falling back to fixed dice values.",
          error
        );
        setIsFallback(true);
        setIsThreeReady(false);
        onError?.(error);
        onReady?.(true);
      }
    };

    initializeDiceBox();

    return () => {
      isMounted = false;
      clearDiceBox({ updateState: false });
      onReady?.(false);
    };
  }, [containerId, onError, onReady, shouldUseLowPowerDice]);

  const rollPredetermined = async (nextValues, { respectDisabled = false } = {}) => {
    const { values: normalized, notation } = createPredeterminedNotation(nextValues);

    if (
      (respectDisabled && disabled) ||
      shouldUseLowPowerDice ||
      isFallback ||
      !isReadyRef.current ||
      !diceBoxRef.current
    ) {
      return normalized;
    }

    try {
      await diceBoxRef.current.roll(notation);
      return normalized;
    } catch (error) {
      console.error(
        "ThreeJS DiceBox roll failed. Keeping the predetermined dice values.",
        error
      );
      onError?.(error);
      return normalized;
    }
  };

  useImperativeHandle(ref, () => ({
    async roll() {
      return rollPredetermined(getFallbackRoll(), { respectDisabled: true });
    },
    async show(nextValues) {
      return rollPredetermined(nextValues);
    },
  }));

  return (
    <Box
      sx={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: DICE_THROW_WIDTH,
        height: DICE_THROW_HEIGHT,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        opacity: disabled && !isRolling ? 0.58 : 1,
        transition: "opacity 180ms ease",
        zIndex: 0,
        filter:
          shouldUseLowPowerDice || isFallback
            ? "none"
            : "drop-shadow(0 24px 28px rgba(82,145,196,0.24))",
        "& canvas": {
          width: "100% !important",
          height: "100% !important",
          display: "block",
          position: "relative",
          zIndex: 1,
          filter: "brightness(1.16) saturate(1.08)",
          visibility:
            shouldUseLowPowerDice || isFallback ? "hidden" : "visible",
        },
      }}
    >
      <Box
        id={containerId}
        data-roll-id={rollId || ""}
        data-values={`${normalizedValues[0]}-${normalizedValues[1]}`}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "transparent",
        }}
      />
      {(shouldUseLowPowerDice || isFallback || !isThreeReady) && (
        <StaticDice values={normalizedValues} />
      )}
    </Box>
  );
});

export default DiceRoller;
