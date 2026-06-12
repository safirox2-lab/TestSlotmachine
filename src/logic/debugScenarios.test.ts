import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config/game.config";
import type { DebugScenarioMode } from "../types/game.types";
import { createDebugSpinResult } from "./debugScenarios";

const EXPECTED_DEBUG_SCENARIOS: DebugScenarioMode[] = [
  "win",
  "bigWin",
  "jackpot",
  "jackpotLegendario",
  "scatter",
  "wildNormal",
  "wildComplete",
];

describe("debug spin scenarios", () => {
  it("builds every debug option as a real spin result with a full 5x4 board", () => {
    for (const mode of EXPECTED_DEBUG_SCENARIOS) {
      const result = createDebugSpinResult(mode, { bet: 100 });

      expect(result.source).toBe("local-demo");
      expect(result.signed).toBe(false);
      expect(result.board).toHaveLength(GAME_CONFIG.grid.columns * GAME_CONFIG.grid.rows);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.board).toEqual(result.board);
      expect(result.steps[0]?.winningIndices).toEqual(
        expect.arrayContaining(result.steps[0]?.winningSymbols.flatMap((win) => win.positions)),
      );
    }
  });

  it("generates debug wins from actual evaluated paylines and scatter counts", () => {
    expect(createDebugSpinResult("win", { bet: 100 }).totalWin).toBeGreaterThan(0);
    expect(createDebugSpinResult("win", { bet: 100 }).totalWin).toBeLessThan(100 * 20);
    expect(createDebugSpinResult("bigWin", { bet: 100 }).totalWin).toBeGreaterThanOrEqual(100 * 20);
    expect(createDebugSpinResult("bigWin", { bet: 100 }).totalWin).toBeLessThan(100 * 300);
    const jackpot = createDebugSpinResult("jackpot", { bet: 100 });
    expect(jackpot.totalWin).toBeGreaterThanOrEqual(100 * 50);
    expect(jackpot.jackpotAward).not.toBeNull();
    expect(jackpot.steps[0]?.board).toContain("TELEFONO7");

    const jackpotLegendario = createDebugSpinResult("jackpotLegendario", { bet: 100 });
    expect(jackpotLegendario.totalWin).toBeGreaterThanOrEqual(100 * 50);
    expect(jackpotLegendario.jackpotAward).toMatchObject({
      id: "deliveryLegendario",
      triggerSymbol: "TELEFONO7",
      triggerCount: 5,
    });
    expect(jackpotLegendario.steps[0]?.board.slice(0, 5)).toEqual([
      "TELEFONO7",
      "TELEFONO7",
      "TELEFONO7",
      "TELEFONO7",
      "TELEFONO7",
    ]);
    expect(createDebugSpinResult("scatter", { bet: 100 }).freeSpinsAwarded).toBeGreaterThanOrEqual(
      8,
    );
    expect(
      createDebugSpinResult("wildNormal", { bet: 100 }).steps[0]?.winningSymbols[0]?.positions,
    ).toEqual(expect.arrayContaining([1]));
    expect(
      createDebugSpinResult("wildComplete", { bet: 100 }).steps[0]?.winningSymbols[0]?.positions,
    ).toEqual(expect.arrayContaining([1]));
  });
});
