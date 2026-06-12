import { GAME_CONFIG } from "../config/game.config";
import type { GridEffectEvent, SpinResult, SpinStep, SymbolId } from "../types/game.types";

interface GridEffectOptions {
  bet?: number;
  wildColumns?: number[];
  scatterTeaseCount?: number;
  scatterNearMissCount?: number;
  bigWinMultiplier?: number;
  coinSymbolIds?: SymbolId[];
}

const DEFAULT_WILD_COLUMNS = [1, 2, 3];
const DEFAULT_COIN_SYMBOLS = new Set<SymbolId>(["CUPON", "TELEFONO7"]);

export function deriveGridEffectEvents(
  result: SpinResult,
  {
    bet,
    wildColumns = DEFAULT_WILD_COLUMNS,
    scatterTeaseCount = 2,
    scatterNearMissCount = 3,
    bigWinMultiplier = 20,
    coinSymbolIds,
  }: GridEffectOptions = {},
): GridEffectEvent[] {
  const events: GridEffectEvent[] = [];
  const coinSymbols = new Set(coinSymbolIds ?? DEFAULT_COIN_SYMBOLS);
  let winningStepCount = 0;
  let accumulatedWin = 0;
  let lastWinningCascade = 1;

  for (const step of result.steps) {
    events.push(...deriveWildEvents(step, wildColumns));
    events.push(...deriveScatterEvents(step, scatterTeaseCount, scatterNearMissCount));

    if (step.win <= 0 || step.winningIndices.length <= 0) {
      continue;
    }

    winningStepCount += 1;
    accumulatedWin += step.win;
    lastWinningCascade = step.cascade;

    events.push({
      type: "paylineTrace",
      cascade: step.cascade,
      indices: [...step.winningIndices],
      amount: step.win,
      audioEvent: "paylineTrace",
    });

    events.push({
      type: "cascadeImpact",
      cascade: step.cascade,
      indices: [...step.winningIndices],
      amount: step.win,
      audioEvent: "cascadeImpact",
    });

    const coinIndices = collectWinningCoinIndices(step, coinSymbols);
    if (coinIndices.length > 0) {
      events.push({
        type: "coinPop",
        cascade: step.cascade,
        indices: coinIndices,
        amount: sumWinningAmountForSymbols(step, coinSymbols),
        audioEvent: "coinPop",
      });
    }

    if (winningStepCount > 1) {
      events.push({
        type: "cascadeChain",
        cascade: step.cascade,
        amount: accumulatedWin,
        audioEvent: "cascadeChain",
      });
    }
  }

  if (bet && bet > 0 && result.totalWin >= bet * bigWinMultiplier) {
    events.push({
      type: "bigWinGridPulse",
      cascade: lastWinningCascade,
      amount: result.totalWin,
      audioEvent: "gridPulse",
    });
  }

  return events;
}

function deriveWildEvents(step: SpinStep, wildColumns: number[]): GridEffectEvent[] {
  const columns = wildColumns.filter((column) => columnHasSymbol(step.board, column, "WILD"));
  if (columns.length <= 0) {
    return [];
  }

  return [
    {
      type: "wildExpandVisual",
      cascade: step.cascade,
      columns,
      indices: columns.flatMap((column) => columnIndices(column)),
      audioEvent: "wildSymbol",
    },
  ];
}

function deriveScatterEvents(
  step: SpinStep,
  scatterTeaseCount: number,
  scatterNearMissCount: number,
): GridEffectEvent[] {
  const indices = collectSymbolIndices(step.board, "SCATTER");
  const events: GridEffectEvent[] = [];

  if (indices.length >= scatterTeaseCount) {
    events.push({
      type: "scatterTease",
      cascade: step.cascade,
      indices,
      audioEvent: "scatterTease",
    });
  }

  if (indices.length === scatterNearMissCount && step.freeSpinsAwarded <= 0) {
    events.push({
      type: "nearMiss",
      cascade: step.cascade,
      indices,
      audioEvent: "nearMiss",
    });
  }

  if (step.freeSpinsAwarded > 0) {
    events.push({
      type: "freeSpinAward",
      cascade: step.cascade,
      indices,
      amount: step.freeSpinsAwarded,
      audioEvent: "freeSpinAward",
    });
  }

  return events;
}

function collectWinningCoinIndices(step: SpinStep, coinSymbols: Set<SymbolId>): number[] {
  const indices = new Set<number>();
  for (const winningSymbol of step.winningSymbols) {
    if (!coinSymbols.has(winningSymbol.symbolId)) {
      continue;
    }
    for (const index of winningSymbol.positions) {
      indices.add(index);
    }
  }
  return [...indices];
}

function sumWinningAmountForSymbols(step: SpinStep, symbols: Set<SymbolId>): number {
  return step.winningSymbols
    .filter((winningSymbol) => symbols.has(winningSymbol.symbolId))
    .reduce((sum, winningSymbol) => sum + winningSymbol.amount, 0);
}

function collectSymbolIndices(board: SymbolId[], symbolId: SymbolId): number[] {
  return board.reduce<number[]>((indices, current, index) => {
    if (current === symbolId) {
      indices.push(index);
    }
    return indices;
  }, []);
}

function columnHasSymbol(board: SymbolId[], column: number, symbolId: SymbolId): boolean {
  return columnIndices(column).some((index) => board[index] === symbolId);
}

function columnIndices(column: number): number[] {
  return Array.from(
    { length: GAME_CONFIG.grid.rows },
    (_, row) => row * GAME_CONFIG.grid.columns + column,
  );
}
