import {
  PAYLINES as V2_PAYLINES,
  SYMBOL_KEYS as V2_SYMBOL_KEYS,
  SYMBOLS as V2_SYMBOLS,
} from "../symbol-config";
import type { SymbolId } from "../types/game.types";
import {
  getRenderableSymbolVariants,
  type SymbolVisualVariant,
  selectSymbolVisualVariant,
} from "./symbolVisuals";

export interface SymbolDefinition {
  id: SymbolId;
  label: string;
  color: number;
  accent: number;
  atlasBase: string;
  texturePath?: string;
  weight: number;
  payouts: Partial<Record<3 | 4 | 5, number>>;
  glow?: number;
  tier?: string;
  wild?: boolean;
  scatter?: boolean;
  slotFootprint?: number;
  visualVariants?: SymbolVisualVariant[];
}

export const PAYLINES = V2_PAYLINES;

export const SYMBOLS = Object.fromEntries(
  Object.entries(V2_SYMBOLS).map(([id, symbol]) => {
    const legacySymbol = symbol as Partial<SymbolDefinition>;
    return [
      id,
      {
        id,
        ...legacySymbol,
        payouts: legacySymbol.payouts ?? {},
      },
    ];
  }),
) as Record<SymbolId, SymbolDefinition>;

export const SYMBOL_IDS = V2_SYMBOL_KEYS as SymbolId[];

export { getRenderableSymbolVariants };

export function getSymbolVisualVariant(
  symbolId: SymbolId,
  cellIndex: number,
  salt = 0,
): SymbolVisualVariant | null {
  return selectSymbolVisualVariant(SYMBOLS[symbolId], cellIndex, salt);
}
