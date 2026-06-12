import type { SymbolId } from "../types/game.types";

export const WILD_REEL_FEATURE_COLUMNS = [2, 3, 4] as const;
export const WILD_REEL_SEQUENCE_DURATION_MS = 10005;
export const WILD_REEL_SEQUENCE_START_DELAY_MS = 500;
export const WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS =
  WILD_REEL_SEQUENCE_DURATION_MS - WILD_REEL_SEQUENCE_START_DELAY_MS;
export const WILD_REEL_SEQUENCE_ASPECT_RATIO = 720 / 1280;
export const WILD_REEL_CLEAR_DURATION_MS = 320;
export const WILD_REEL_SEQUENCE_SOUND_EVENT = "wildExpand";
export const WILD_SYMBOL_TEXT_OFFSET_Y = 26;

function hasWildSymbol(board: readonly SymbolId[]): boolean {
  return board.includes("WILD");
}

export function selectWildDramaColumn(
  board: readonly SymbolId[],
  random: () => number = Math.random,
): number | null {
  if (!hasWildSymbol(board)) {
    return null;
  }

  const boundedRandom = Math.max(0, Math.min(0.999_999, random()));
  const columnIndex = Math.floor(boundedRandom * WILD_REEL_FEATURE_COLUMNS.length);
  return WILD_REEL_FEATURE_COLUMNS[columnIndex] ?? WILD_REEL_FEATURE_COLUMNS[0];
}
