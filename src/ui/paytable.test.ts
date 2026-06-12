import { describe, expect, it } from "vitest";
import { PAYLINES, SYMBOL_IDS, SYMBOLS } from "../logic/symbols";
import { buildPaytableItems, buildRulesSummary, PAYLINE_COUNT } from "./paytable";

describe("paytable UI data", () => {
  it("uses the runtime payline count and every symbol", () => {
    const items = buildPaytableItems();

    expect(PAYLINE_COUNT).toBe(PAYLINES.length);
    expect(PAYLINE_COUNT).toBe(16);
    expect(items).toHaveLength(19);
    expect(items.map((item) => item.id)).toEqual(SYMBOL_IDS);
    expect(items.every((item) => item.label && item.atlasBase)).toBe(true);
  });

  it("describes payouts and feature rules for the info modal", () => {
    const items = buildPaytableItems();
    const wild = items.find((item) => item.id === "WILD");
    const scatter = items.find((item) => item.id === "SCATTER");
    const telefono = items.find((item) => item.id === "TELEFONO7");
    const cupon = items.find((item) => item.id === "CUPON");
    const pizza = items.find((item) => item.id === "PIZZA");

    expect(telefono?.featureText).toContain("5 TELEFONO 7 puros activan DELIVERY LEGENDARIO");
    expect(wild?.featureText).toContain("no sustituye TELEFONO 7 para jackpot");
    expect(scatter?.featureText).toContain("4 SCATTER");
    expect(cupon?.payouts).toEqual({ 3: 8, 4: 23, 5: 70 });
    expect(pizza?.featureText).toBeNull();
    expect(buildRulesSummary()).toEqual(
      expect.arrayContaining([
        "5 rodillos x 4 filas",
        "16 paylines fijas",
        "19 simbolos Delivery con atlas optimizado",
        "Unidad de pago: apuesta / (paylines / 5).",
        "5 TELEFONO 7 puros activan DELIVERY LEGENDARIO.",
        "WILD sustituye simbolos pagadores excepto SCATTER y el jackpot de TELEFONO 7.",
      ]),
    );
  });

  it("mirrors the runtime payout table for every visible prize legend", () => {
    const payoutById = new Map(buildPaytableItems().map((item) => [item.id, item.payouts]));

    for (const symbolId of SYMBOL_IDS) {
      expect(payoutById.get(symbolId)).toEqual(SYMBOLS[symbolId].payouts);
    }
  });
});
