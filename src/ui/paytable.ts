import { PAYLINES, SYMBOL_IDS, SYMBOLS } from "../logic/symbols";
import type { SymbolId } from "../types/game.types";

export const PAYLINE_COUNT = PAYLINES.length;

export interface PaytableItem {
  id: SymbolId;
  label: string;
  atlasBase: string;
  payouts: Partial<Record<3 | 4 | 5, number>>;
  color: number;
  accent: number;
  featureText: string | null;
  visualVariantLabels: string[];
}

export function buildPaytableItems(): PaytableItem[] {
  return SYMBOL_IDS.map((id) => {
    const symbol = SYMBOLS[id];
    return {
      id,
      label: symbol.label,
      atlasBase: symbol.atlasBase,
      payouts: symbol.payouts,
      color: symbol.color,
      accent: symbol.accent,
      featureText: getFeatureText(id),
      visualVariantLabels: symbol.visualVariants?.map((variant) => variant.label) ?? [],
    };
  });
}

export function buildRulesSummary(): string[] {
  return [
    "5 rodillos x 4 filas",
    `${PAYLINE_COUNT} paylines fijas`,
    "19 simbolos Delivery con atlas optimizado",
    "Los pagos se evaluan de izquierda a derecha desde el primer rodillo.",
    "Unidad de pago: apuesta / (paylines / 5).",
    "5 TELEFONO 7 puros activan DELIVERY LEGENDARIO.",
    "WILD sustituye simbolos pagadores excepto SCATTER y el jackpot de TELEFONO 7.",
    "4 SCATTER otorgan 8 free spins en la demo visual.",
    "Las cascadas mantienen los simbolos ganadores en pantalla antes de rellenar el grid.",
  ];
}

function getFeatureText(id: SymbolId): string | null {
  const symbol = SYMBOLS[id];
  if (id === "TELEFONO7") {
    return "5 TELEFONO 7 puros activan DELIVERY LEGENDARIO; WILD no sustituye este jackpot.";
  }
  if (symbol.wild) {
    return "WILD sustituye simbolos pagadores excepto SCATTER; no sustituye TELEFONO 7 para jackpot.";
  }
  if (symbol.scatter) {
    return "4 SCATTER otorgan 8 free spins; cada SCATTER adicional suma 2.";
  }
  if (symbol.visualVariants && symbol.visualVariants.length > 1) {
    const labels = formatSpanishList(symbol.visualVariants.map((variant) => variant.id));
    return `${symbol.label} puede verse como ${labels}. Todas sus variantes pagan igual.`;
  }
  return null;
}

function formatSpanishList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}
