export const getPlayerPanelSx = (index, count) => {
  const inset = { xs: 8, sm: 10, md: 14, lg: 18 };
  const positions =
    count <= 2
      ? [
          { right: inset, bottom: inset },
          { left: inset, top: inset },
        ]
      : [
          { right: inset, bottom: inset },
          { left: inset, top: inset },
          { right: inset, top: { xs: 58, sm: 62, md: 70, lg: 78 } },
          { left: inset, bottom: inset },
        ];

  return {
    position: "absolute",
    ...(positions[index] || positions[0]),
  };
};
