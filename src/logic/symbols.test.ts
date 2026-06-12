import { describe, expect, it } from "vitest";
import {
  getRenderableSymbolVariants,
  getSymbolVisualVariant,
  SYMBOL_IDS,
  SYMBOLS,
} from "./symbols";

describe("logical symbol model", () => {
  it("uses the approved Delivery logical symbols", () => {
    expect(SYMBOL_IDS).toHaveLength(19);
    expect(SYMBOL_IDS).toEqual([
      "TELEFONO7",
      "WILD",
      "SCATTER",
      "CASCO",
      "CUPON",
      "CAMPANA",
      "CRONOMETRO",
      "UBICACION",
      "VASO",
      "HAMBURGUESA",
      "PIZZA",
      "SUSHI",
      "FIDEOS",
      "PAPAS",
      "A",
      "K",
      "Q",
      "J",
      "TEN",
    ]);
  });

  it("maps Delivery feature symbols to their generated atlas bases", () => {
    expect(SYMBOLS.TELEFONO7.atlasBase).toBe("telefono7");
    expect(SYMBOLS.TELEFONO7.tier).toBe("legendary");
    expect(SYMBOLS.WILD.atlasBase).toBe("dwild");
    expect(SYMBOLS.WILD.wild).toBe(true);
    expect(SYMBOLS.SCATTER.atlasBase).toBe("ubicacion");
    expect(SYMBOLS.SCATTER.scatter).toBe(true);
  });

  it("keeps every Delivery visual variant backed by generated atlas bases", () => {
    const variantIds = SYMBOL_IDS.flatMap((symbolId) =>
      getRenderableSymbolVariants(SYMBOLS[symbolId]).map((variant) => variant.id),
    );
    const variantAtlasBases = SYMBOL_IDS.flatMap((symbolId) =>
      getRenderableSymbolVariants(SYMBOLS[symbolId]).map((variant) => variant.atlasBase),
    );

    expect(variantIds).toEqual(SYMBOL_IDS);
    expect(variantAtlasBases).toEqual([
      "telefono7",
      "dwild",
      "ubicacion",
      "casco",
      "cupon",
      "campana",
      "cronometro",
      "ubicacion",
      "vaso",
      "hamburguesa",
      "pizza",
      "sushi",
      "fideos",
      "papas",
      "a",
      "k",
      "q",
      "j",
      "10",
    ]);
  });

  it("selects deterministic visual variants for a logical symbol cell", () => {
    const first = getSymbolVisualVariant("PIZZA", 0, 0);
    const repeated = getSymbolVisualVariant("PIZZA", 0, 0);

    expect(first).toEqual(repeated);
    expect(first).toEqual(expect.objectContaining({ id: "PIZZA", atlasBase: "pizza" }));
  });
});
