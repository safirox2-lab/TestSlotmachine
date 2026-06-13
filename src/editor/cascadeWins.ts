import {
  detectLineWins,
  type LinePayouts,
  type LineTraceSettings,
  type LineWin,
  type LineWinCell,
  type WildLineRule,
} from "./lineWins";
import { randomWeightedSymbol } from "./symbolWeights";

export type LineValidationMode = "cascade" | "classic";

export interface CascadeWinStep {
  clearedCells: LineWinCell[];
  dropDistances: number[];
  symbols: number[];
  wins: LineWin[];
}

function cellKey(cell: LineWinCell): string {
  return `${cell.column}:${cell.row}`;
}

function applyCascadeDrop({
  clearedCells,
  columns,
  random,
  rows,
  symbolCount,
  symbolWeights,
  symbols,
}: {
  clearedCells: LineWinCell[];
  columns: number;
  random: () => number;
  rows: number;
  symbolCount: number;
  symbolWeights?: number[];
  symbols: number[];
}): { dropDistances: number[]; symbols: number[] } {
  const clearedCellKeys = new Set(clearedCells.map(cellKey));
  const dropDistances = Array.from({ length: columns * rows }, () => 0);
  const nextSymbols = [...symbols];

  for (let column = 1; column <= columns; column += 1) {
    const remainingColumnSymbols: Array<{ originalRow: number; symbol: number }> = [];
    for (let row = 1; row <= rows; row += 1) {
      const index = (row - 1) * columns + (column - 1);
      if (!clearedCellKeys.has(cellKey({ column, row }))) {
        remainingColumnSymbols.push({ originalRow: row, symbol: symbols[index] ?? 1 });
      }
    }

    const newSymbolCount = rows - remainingColumnSymbols.length;
    const cascadedColumnSymbols = Array.from({ length: newSymbolCount }, (_, index) => ({
      dropDistance: newSymbolCount - index,
      symbol: randomWeightedSymbol({ cardCount: symbolCount, random, weights: symbolWeights }),
    })).concat(
      remainingColumnSymbols.map((entry, index) => {
        const nextRow = newSymbolCount + index + 1;
        return {
          dropDistance: Math.max(0, nextRow - entry.originalRow),
          symbol: entry.symbol,
        };
      }),
    );

    for (let row = 1; row <= rows; row += 1) {
      const index = (row - 1) * columns + (column - 1);
      const entry = cascadedColumnSymbols[row - 1];
      nextSymbols[index] = entry?.symbol ?? 1;
      dropDistances[index] = entry?.dropDistance ?? 0;
    }
  }

  return { dropDistances, symbols: nextSymbols };
}

export function resolveCascadeWins({
  columns,
  linePayouts,
  random = Math.random,
  rows,
  scatterSymbols,
  settings,
  symbolGroups,
  symbolCount,
  symbolWeights,
  symbols,
  validationMode = "cascade",
  wildBridgeBlockedSymbols,
  wildLineRule,
  wildSymbols,
}: {
  columns: number;
  linePayouts?: LinePayouts;
  random?: () => number;
  rows: number;
  scatterSymbols?: number[];
  settings: LineTraceSettings;
  symbolGroups?: number[][];
  symbolCount: number;
  symbolWeights?: number[];
  symbols: number[];
  validationMode?: LineValidationMode;
  wildBridgeBlockedSymbols?: number[];
  wildLineRule?: WildLineRule;
  wildSymbols?: number[];
}): { finalSymbols: number[]; steps: CascadeWinStep[] } {
  if (validationMode === "classic") {
    return { finalSymbols: [...symbols], steps: [] };
  }

  const steps: CascadeWinStep[] = [];
  let currentSymbols = [...symbols];

  for (let stepIndex = 0; stepIndex < 20; stepIndex += 1) {
    const wins = detectLineWins({
      columns,
      linePayouts,
      rows,
      scatterSymbols,
      settings,
      symbolGroups,
      symbols: currentSymbols,
      wildBridgeBlockedSymbols,
      wildLineRule,
      wildSymbols,
    });

    if (wins.length === 0) {
      break;
    }

    const clearedCells = Array.from(
      new Map(wins.flatMap((win) => win.cells).map((cell) => [cellKey(cell), cell])).values(),
    );
    const cascadeDrop = applyCascadeDrop({
      clearedCells,
      columns,
      random,
      rows,
      symbolCount,
      symbolWeights,
      symbols: currentSymbols,
    });
    currentSymbols = cascadeDrop.symbols;
    steps.push({
      clearedCells,
      dropDistances: cascadeDrop.dropDistances,
      symbols: [...currentSymbols],
      wins,
    });
  }

  return { finalSymbols: currentSymbols, steps };
}
