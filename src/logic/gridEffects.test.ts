import { describe, expect, it } from "vitest";
import type { SpinResult, SpinStep } from "../types/game.types";
import { deriveGridEffectEvents } from "./gridEffects";

function createStep(overrides: Partial<SpinStep> = {}): SpinStep {
  return {
    cascade: 1,
    board: Array.from({ length: 20 }, () => "SUSHI"),
    multiplier: 1,
    tensionLevel: 1,
    win: 0,
    winningSymbols: [],
    winningIndices: [],
    freeSpinsAwarded: 0,
    jackpotAward: null,
    ...overrides,
  };
}

function createResult(steps: SpinStep[], overrides: Partial<SpinResult> = {}): SpinResult {
  return {
    board: steps.at(-1)?.board ?? [],
    totalWin: 0,
    freeSpinsAwarded: 0,
    nextTension: 1,
    steps,
    jackpotAward: null,
    source: "local-demo",
    signed: false,
    ...overrides,
  };
}

describe("deriveGridEffectEvents", () => {
  it("creates normal wild visuals with the normal WILD sound instead of the full celebration audio", () => {
    const board = Array.from({ length: 20 }, () => "SUSHI");
    board[1] = "WILD";
    board[4] = "WILD";
    board[12] = "WILD";

    const events = deriveGridEffectEvents(createResult([createStep({ board })]));

    expect(events.filter((event) => event.type === "wildExpandVisual")).toEqual([
      {
        type: "wildExpandVisual",
        cascade: 1,
        columns: [1, 2],
        indices: [1, 6, 11, 16, 2, 7, 12, 17],
        audioEvent: "wildSymbol",
      },
    ]);
    expect(events.some((event) => event.audioEvent === "wildExpand")).toBe(false);
  });

  it("creates scatter tease, near miss, and award events from scatter counts", () => {
    const nearMissBoard = Array.from({ length: 20 }, () => "SUSHI");
    nearMissBoard[0] = "SCATTER";
    nearMissBoard[6] = "SCATTER";
    nearMissBoard[12] = "SCATTER";

    const awardBoard = [...nearMissBoard];
    awardBoard[18] = "SCATTER";

    const events = deriveGridEffectEvents(
      createResult([
        createStep({ board: nearMissBoard }),
        createStep({ cascade: 2, board: awardBoard, freeSpinsAwarded: 8 }),
      ]),
    );

    expect(events).toContainEqual({
      type: "scatterTease",
      cascade: 1,
      indices: [0, 6, 12],
      audioEvent: "scatterTease",
    });
    expect(events).toContainEqual({
      type: "nearMiss",
      cascade: 1,
      indices: [0, 6, 12],
      audioEvent: "nearMiss",
    });
    expect(events).toContainEqual({
      type: "freeSpinAward",
      cascade: 2,
      indices: [0, 6, 12, 18],
      amount: 8,
      audioEvent: "freeSpinAward",
    });
  });

  it("creates payline, cascade, coin, chain, and big pulse effects from wins", () => {
    const winningStep = createStep({
      win: 250,
      winningIndices: [0, 1, 2],
      winningSymbols: [
        {
          symbolId: "CUPON",
          count: 3,
          line: 1,
          positions: [0, 1, 2],
          amount: 250,
        },
      ],
    });
    const secondWin = createStep({
      cascade: 2,
      win: 800,
      winningIndices: [5, 6, 7],
      winningSymbols: [
        {
          symbolId: "TELEFONO7",
          count: 3,
          line: 2,
          positions: [5, 6, 7],
          amount: 800,
        },
      ],
    });

    const events = deriveGridEffectEvents(
      createResult([winningStep, secondWin], { totalWin: 1050 }),
      {
        bet: 50,
      },
    );

    expect(events).toContainEqual({
      type: "paylineTrace",
      cascade: 1,
      indices: [0, 1, 2],
      amount: 250,
      audioEvent: "paylineTrace",
    });
    expect(events).toContainEqual({
      type: "coinPop",
      cascade: 1,
      indices: [0, 1, 2],
      amount: 250,
      audioEvent: "coinPop",
    });
    expect(events).toContainEqual({
      type: "cascadeImpact",
      cascade: 2,
      indices: [5, 6, 7],
      amount: 800,
      audioEvent: "cascadeImpact",
    });
    expect(events).toContainEqual({
      type: "cascadeChain",
      cascade: 2,
      amount: 1050,
      audioEvent: "cascadeChain",
    });
    expect(events).toContainEqual({
      type: "bigWinGridPulse",
      cascade: 2,
      amount: 1050,
      audioEvent: "gridPulse",
    });
  });
});
