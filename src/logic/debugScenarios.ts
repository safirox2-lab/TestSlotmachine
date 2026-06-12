import type { DebugScenarioMode, SpinResult, SpinStep, SymbolId } from "../types/game.types";
import { SlotGameEngine } from "./SlotGameEngine";

interface DebugScenarioOptions {
  bet: number;
  tensionLevel?: number;
}

const NEUTRAL_BOARD: SymbolId[] = [
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

export function createDebugSpinResult(
  mode: DebugScenarioMode,
  { bet, tensionLevel = 1 }: DebugScenarioOptions,
): SpinResult {
  const engine = new SlotGameEngine();
  const board = createDebugBoard(mode);
  const multiplier = Math.max(1, tensionLevel);
  const evaluation = engine.evaluateBoard(board, { bet, multiplier });
  const step: SpinStep = {
    cascade: 1,
    board,
    multiplier,
    tensionLevel,
    win: evaluation.win,
    winningSymbols: evaluation.winningSymbols,
    winningIndices: evaluation.winningIndices,
    freeSpinsAwarded: evaluation.freeSpinsAwarded,
    jackpotAward: evaluation.jackpotAward,
  };

  return {
    board,
    totalWin: evaluation.win,
    freeSpinsAwarded: evaluation.freeSpinsAwarded,
    nextTension: 1,
    steps: [step],
    jackpotAward: evaluation.jackpotAward,
    source: "local-demo",
    signed: false,
  };
}

function createDebugBoard(mode: DebugScenarioMode): SymbolId[] {
  switch (mode) {
    case "win":
      return createWinBoard();
    case "bigWin":
      return createBigWinBoard();
    case "jackpot":
      return createJackpotBoard();
    case "jackpotLegendario":
      return createLegendaryJackpotBoard();
    case "scatter":
      return createScatterBoard();
    case "wildNormal":
    case "wildComplete":
      return createWildBoard();
  }
}

function createWinBoard(): SymbolId[] {
  const board = [...NEUTRAL_BOARD];
  board[0] = "PAPAS";
  board[1] = "PAPAS";
  board[2] = "PAPAS";
  board[3] = "FIDEOS";
  board[7] = "SUSHI";
  return board;
}

function createBigWinBoard(): SymbolId[] {
  const board = [...NEUTRAL_BOARD];
  for (let index = 0; index < 5; index += 1) {
    board[index] = "WILD";
  }
  return board;
}

function createJackpotBoard(): SymbolId[] {
  return Array.from({ length: NEUTRAL_BOARD.length }, () => "TELEFONO7");
}

function createLegendaryJackpotBoard(): SymbolId[] {
  const board = [...NEUTRAL_BOARD];
  for (let index = 0; index < 5; index += 1) {
    board[index] = "TELEFONO7";
  }
  return board;
}

function createScatterBoard(): SymbolId[] {
  const board = [...NEUTRAL_BOARD];
  board[4] = "SCATTER";
  board[9] = "SCATTER";
  board[14] = "SCATTER";
  board[19] = "SCATTER";
  return board;
}

function createWildBoard(): SymbolId[] {
  const board = [...NEUTRAL_BOARD];
  board[0] = "CASCO";
  board[1] = "WILD";
  board[2] = "CASCO";
  board[3] = "FIDEOS";
  board[7] = "SUSHI";
  return board;
}
