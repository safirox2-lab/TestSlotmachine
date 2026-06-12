import type { GameStatus } from "../types/game.types";

export const GAME_CONFIG = {
  grid: {
    columns: 5,
    rows: 4,
    cellStep: 108,
    cellSize: 106,
    maxCascades: 11,
  },
  betting: {
    testRefillAmount: 10000,
    levels: [10, 25, 50, 100, 250, 500, 1000],
    initialBalance: 1000,
  },
  stateMachine: {
    initialStatus: "loading" satisfies GameStatus,
    statuses: [
      "loading",
      "idle",
      "playing",
      "spinning",
      "stopping",
      "evaluating",
      "win",
      "bigWin",
      "megaWin",
      "freeSpins",
      "bonus",
      "error",
    ] satisfies GameStatus[],
  },
  backend: {
    mode: "contract-with-local-demo-fallback",
    unsignedDemoFallback: true,
  },
} as const;
