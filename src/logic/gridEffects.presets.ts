import type { GridEffectEvent } from "../types/game.types";

const ALL_GRID_INDICES = Array.from({ length: 20 }, (_, index) => index);

export type GridEffectPreset =
  | "wildExpand"
  | "scatterTease"
  | "cascadeChain"
  | "coinPop"
  | "bigWin";

export function createGridEffectPreset(type: GridEffectPreset): GridEffectEvent[] {
  switch (type) {
    case "wildExpand":
      return [
        {
          type: "wildExpandVisual",
          cascade: 1,
          columns: [1, 2, 3],
          indices: [1, 6, 11, 16, 2, 7, 12, 17, 3, 8, 13, 18],
          audioEvent: "wildSymbol",
        },
      ];
    case "scatterTease":
      return [
        {
          type: "scatterTease",
          cascade: 1,
          indices: [0, 7, 14],
          audioEvent: "scatterTease",
        },
        {
          type: "nearMiss",
          cascade: 1,
          indices: [0, 7, 14],
          audioEvent: "nearMiss",
        },
      ];
    case "cascadeChain":
      return [
        {
          type: "cascadeImpact",
          cascade: 1,
          indices: [5, 6, 7, 8],
          amount: 250,
          audioEvent: "cascadeImpact",
        },
        {
          type: "cascadeChain",
          cascade: 2,
          amount: 640,
          audioEvent: "cascadeChain",
        },
      ];
    case "coinPop":
      return [
        {
          type: "coinPop",
          cascade: 1,
          indices: [1, 4, 11, 18],
          amount: 420,
          audioEvent: "coinPop",
        },
      ];
    case "bigWin":
      return [
        {
          type: "paylineTrace",
          cascade: 1,
          indices: [0, 1, 2, 3, 4],
          amount: 1000,
          audioEvent: "paylineTrace",
        },
        {
          type: "bigWinGridPulse",
          cascade: 1,
          indices: ALL_GRID_INDICES,
          amount: 1000,
          audioEvent: "gridPulse",
        },
      ];
    default:
      return [];
  }
}
