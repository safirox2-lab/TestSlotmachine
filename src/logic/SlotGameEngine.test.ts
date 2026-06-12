import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config/game.config";
import type { SymbolId } from "../types/game.types";
import { SlotGameEngine } from "./SlotGameEngine";
import { PAYLINES, SYMBOL_IDS, SYMBOLS } from "./symbols";

const DELIVERY_DEMO_PAYOUT_SCALE = 5.35;

function createSeededRng(seedValue: number): () => number {
  let seed = seedValue >>> 0;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createBlankBoard(fill: SymbolId = "SCATTER"): SymbolId[] {
  return Array.from({ length: GAME_CONFIG.grid.columns * GAME_CONFIG.grid.rows }, () => fill);
}

function createNeutralBoard(): SymbolId[] {
  return [
    "PAPAS",
    "CASCO",
    "VASO",
    "FIDEOS",
    "CUPON",
    "CAMPANA",
    "SUSHI",
    "PAPAS",
    "PIZZA",
    "HAMBURGUESA",
    "FIDEOS",
    "CUPON",
    "CRONOMETRO",
    "SUSHI",
    "PAPAS",
    "A",
    "HAMBURGUESA",
    "FIDEOS",
    "VASO",
    "K",
  ];
}

function simulatePaidSpins({ paidSpins, bet }: { paidSpins: number; bet: number }): {
  rtp: number;
  hitRate: number;
  averageSpinsPerPaidSpin: number;
} {
  const engine = new SlotGameEngine({ rng: createSeededRng(20260603) });
  let totalWin = 0;
  let totalSpins = 0;
  let hitCount = 0;
  let freeSpins = 0;

  const runSpin = () => {
    const result = engine.spin({ bet, tensionLevel: 1 });
    totalSpins += 1;
    totalWin += result.totalWin;
    freeSpins += result.freeSpinsAwarded;
    if (result.totalWin > 0) {
      hitCount += 1;
    }
  };

  for (let spin = 0; spin < paidSpins; spin += 1) {
    runSpin();
    while (freeSpins > 0) {
      freeSpins -= 1;
      runSpin();
    }
  }

  return {
    rtp: totalWin / (paidSpins * bet),
    hitRate: hitCount / totalSpins,
    averageSpinsPerPaidSpin: totalSpins / paidSpins,
  };
}

describe("SlotGameEngine", () => {
  it("evaluates Delivery logical symbols from the generated symbol set", () => {
    const engine = new SlotGameEngine();
    const board = createBlankBoard();
    board[0] = "CUPON";
    board[1] = "CUPON";
    board[2] = "CUPON";

    const evaluation = engine.evaluateBoard(board, { bet: 100, multiplier: 1 });

    expect(SYMBOL_IDS).toContain("CUPON");
    expect(SYMBOL_IDS).not.toContain("BILLETE");
    expect(evaluation.win).toBe(
      (100 / Math.max(1, PAYLINES.length / 5)) * 8 * DELIVERY_DEMO_PAYOUT_SCALE,
    );
    expect(evaluation.winningSymbols[0]).toMatchObject({
      symbolId: "CUPON",
      count: 3,
      positions: [0, 1, 2],
    });
  });

  it("awards free spins from four or more scatters anywhere on the 5x4 board", () => {
    const engine = new SlotGameEngine();
    const board = createNeutralBoard();
    board[4] = "SCATTER";
    board[9] = "SCATTER";
    board[14] = "SCATTER";
    board[19] = "SCATTER";

    const evaluation = engine.evaluateBoard(board, { bet: 100, multiplier: 1 });

    expect(evaluation.freeSpinsAwarded).toBe(8);
    expect(evaluation.win).toBe(0);
  });

  it("awards the Delivery Legendario jackpot from five pure TELEFONO7 on a payline", () => {
    const engine = new SlotGameEngine();
    const board = createNeutralBoard();
    for (const index of [0, 1, 2, 3, 4]) {
      board[index] = "TELEFONO7";
    }

    const evaluation = engine.evaluateBoard(board, { bet: 100, multiplier: 1 });
    const lineWin = (100 / Math.max(1, PAYLINES.length / 5)) * 88 * DELIVERY_DEMO_PAYOUT_SCALE;

    expect(evaluation.jackpotAward).toMatchObject({
      id: "deliveryLegendario",
      label: "DELIVERY LEGENDARIO",
      amount: 25_000,
      triggerSymbol: "TELEFONO7",
      triggerCount: 5,
      positions: [0, 1, 2, 3, 4],
    });
    expect(evaluation.win).toBe(lineWin + 25_000);
  });

  it("does not let WILD substitute TELEFONO7 for the Delivery Legendario jackpot", () => {
    const engine = new SlotGameEngine();
    const board = createNeutralBoard();
    board[0] = "TELEFONO7";
    board[1] = "WILD";
    board[2] = "TELEFONO7";
    board[3] = "TELEFONO7";
    board[4] = "TELEFONO7";

    const evaluation = engine.evaluateBoard(board, { bet: 100, multiplier: 1 });

    expect(evaluation.jackpotAward).toBeNull();
    expect(evaluation.winningSymbols[0]).toMatchObject({
      symbolId: "TELEFONO7",
      count: 5,
    });
  });

  it("pays leading WILD runs as WILD when that prize outranks substitution", () => {
    const engine = new SlotGameEngine();
    const bet = 160;
    const lineBet = bet / Math.max(1, PAYLINES.length / 5);
    const threeWildBoard = createNeutralBoard();
    threeWildBoard[0] = "WILD";
    threeWildBoard[1] = "WILD";
    threeWildBoard[2] = "WILD";
    threeWildBoard[3] = "PAPAS";
    threeWildBoard[4] = "CUPON";

    const fourWildBoard = createNeutralBoard();
    fourWildBoard[0] = "WILD";
    fourWildBoard[1] = "WILD";
    fourWildBoard[2] = "WILD";
    fourWildBoard[3] = "WILD";
    fourWildBoard[4] = "PAPAS";

    const threeWildEvaluation = engine.evaluateBoard(threeWildBoard, { bet, multiplier: 1 });
    const fourWildEvaluation = engine.evaluateBoard(fourWildBoard, { bet, multiplier: 1 });

    expect(threeWildEvaluation.winningSymbols[0]).toMatchObject({
      symbolId: "WILD",
      count: 3,
      positions: [0, 1, 2],
      amount: lineBet * (SYMBOLS.WILD.payouts[3] ?? 0) * DELIVERY_DEMO_PAYOUT_SCALE,
    });
    expect(fourWildEvaluation.winningSymbols[0]).toMatchObject({
      symbolId: "WILD",
      count: 4,
      positions: [0, 1, 2, 3],
      amount: lineBet * (SYMBOLS.WILD.payouts[4] ?? 0) * DELIVERY_DEMO_PAYOUT_SCALE,
    });
  });

  it("resets tension after each completed spin while cascades keep internal multipliers", () => {
    const engine = new SlotGameEngine({ rng: createSeededRng(99) });
    const result = engine.spin({ bet: 100, tensionLevel: 7 });

    expect(result.steps[0]?.multiplier).toBe(7);
    expect(result.nextTension).toBe(1);
  });

  it("calibrates the demo math close to 98 percent RTP including free spins", () => {
    const result = simulatePaidSpins({ paidSpins: 120_000, bet: 100 });

    expect(result.rtp).toBeGreaterThanOrEqual(0.975);
    expect(result.rtp).toBeLessThanOrEqual(0.99);
    expect(result.hitRate).toBeGreaterThan(0.1);
    expect(result.averageSpinsPerPaidSpin).toBeGreaterThan(1.01);
  });
});
