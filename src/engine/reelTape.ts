import type { SymbolId } from "../types/game.types";

interface ReelTapeSymbolDefinition {
  weight?: number;
  scatter?: boolean;
}

interface LandingSymbolScheduleInput {
  board: SymbolId[];
  column: number;
  columns: number;
  rows: number;
  bufferRows: number;
  finalStopRows: number;
}

interface TrackBoundaryRowsInput {
  travelPx: number;
  cellStep: number;
  trackRows: number;
}

const DEFAULT_SCATTER_VISUAL_CHANCE = 0.36;
const MAX_PICK_ATTEMPTS = 8;
const MAX_RECENT_REPEAT = 2;

export function createWeightedReelSymbolPicker(
  symbols: Record<SymbolId, ReelTapeSymbolDefinition>,
  rng: () => number = Math.random,
): (recentSymbols?: SymbolId[]) => SymbolId {
  const weightedSymbols = createWeightedSymbolPool(symbols);
  const weightedBaseSymbols = createWeightedSymbolPool(symbols, { includeScatter: false });

  return (recentSymbols: SymbolId[] = []) => {
    for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt += 1) {
      const symbolId = pickVisualSymbol(weightedSymbols, weightedBaseSymbols, symbols, rng);
      if (!extendsRecentRepeat(symbolId, recentSymbols)) {
        return symbolId;
      }
    }

    return (
      weightedSymbols.find((symbolId) => !extendsRecentRepeat(symbolId, recentSymbols)) ?? "WILD"
    );
  };
}

export function createLandingSymbolSchedule({
  board,
  column,
  columns,
  rows,
  bufferRows,
  finalStopRows,
}: LandingSymbolScheduleInput): Array<[number, SymbolId]> {
  const schedule: Array<[number, SymbolId]> = [];
  for (let row = rows - 1; row >= 0; row -= 1) {
    const symbolId = board[row * columns + column];
    if (!symbolId) {
      continue;
    }

    const topEntryStep = finalStopRows - row;
    schedule.push([topEntryStep - bufferRows, symbolId]);
  }
  return schedule;
}

export function getNextTrackBoundaryRows({
  travelPx,
  cellStep,
  trackRows,
}: TrackBoundaryRowsInput): number {
  const trackHeight = cellStep * trackRows;
  const wrappedTravel = ((travelPx % trackHeight) + trackHeight) % trackHeight;
  const remainingTravel = wrappedTravel === 0 ? trackHeight : trackHeight - wrappedTravel;
  return Math.round((travelPx + remainingTravel) / cellStep);
}

function createWeightedSymbolPool(
  symbols: Record<SymbolId, ReelTapeSymbolDefinition>,
  { includeScatter = true } = {},
): SymbolId[] {
  return Object.entries(symbols).flatMap(([symbolId, symbol]) => {
    if (!includeScatter && symbol.scatter) {
      return [];
    }

    return Array.from({ length: Math.max(1, symbol.weight ?? 1) }, () => symbolId);
  });
}

function pickVisualSymbol(
  weightedSymbols: SymbolId[],
  weightedBaseSymbols: SymbolId[],
  symbols: Record<SymbolId, ReelTapeSymbolDefinition>,
  rng: () => number,
): SymbolId {
  const symbolId = pickWeightedSymbol(weightedSymbols, rng);
  return symbols[symbolId]?.scatter && rng() > DEFAULT_SCATTER_VISUAL_CHANCE
    ? pickWeightedSymbol(weightedBaseSymbols, rng)
    : symbolId;
}

function pickWeightedSymbol(pool: SymbolId[], rng: () => number): SymbolId {
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index] ?? "WILD";
}

function extendsRecentRepeat(symbolId: SymbolId, recentSymbols: SymbolId[]): boolean {
  if (recentSymbols.length < MAX_RECENT_REPEAT) {
    return false;
  }

  return recentSymbols.slice(-MAX_RECENT_REPEAT).every((recentSymbol) => recentSymbol === symbolId);
}
