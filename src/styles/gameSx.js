export const dialogLayerSx = {
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

export const actionPanelSx = {
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

export const rollButtonSx = {
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

export const toolIconButtonSx = {
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
