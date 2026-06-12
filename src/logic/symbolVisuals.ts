import type { SymbolId } from "../types/game.types";

export interface SymbolVisualVariant {
  id: string;
  label: string;
  atlasBase: string;
  texturePath?: string;
  offsetX?: number;
  offsetY?: number;
}

export interface SymbolVisualDefinition {
  id: SymbolId;
  label: string;
  atlasBase: string;
  texturePath?: string;
  visualVariants?: readonly SymbolVisualVariant[];
}

export function getRenderableSymbolVariants(
  symbol: SymbolVisualDefinition | undefined,
): SymbolVisualVariant[] {
  if (!symbol) {
    return [];
  }

  if (symbol.visualVariants && symbol.visualVariants.length > 0) {
    return [...symbol.visualVariants];
  }

  return [
    {
      id: symbol.id,
      label: symbol.label,
      atlasBase: symbol.atlasBase,
      texturePath: symbol.texturePath,
    },
  ];
}

export function selectSymbolVisualVariant(
  symbol: SymbolVisualDefinition | undefined,
  cellIndex: number,
  salt = 0,
): SymbolVisualVariant | null {
  const variants = getRenderableSymbolVariants(symbol);
  if (variants.length <= 0) {
    return null;
  }

  const hash = hashVisualVariantSeed(`${symbol?.id ?? "symbol"}:${cellIndex}:${salt}`);
  return variants[hash % variants.length] ?? variants[0] ?? null;
}

function hashVisualVariantSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
