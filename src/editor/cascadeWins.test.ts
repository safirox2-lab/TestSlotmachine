import { describe, expect, it } from "vitest";
import { resolveCascadeWins } from "./cascadeWins";

const traceSettings = {
  diagonal: false,
  horizontal: true,
  vertical: false,
  zigzag: false,
};

describe("cascade wins", () => {
  it("drops remaining symbols and adds new symbols until no more traces are found", () => {
    const randomValues = [0.75, 0.25, 0.25];
    const result = resolveCascadeWins({
      columns: 3,
      random: () => randomValues.shift() ?? 0,
      rows: 3,
      settings: traceSettings,
      symbolCount: 4,
      symbols: [1, 1, 1, 2, 3, 4, 2, 4, 3],
    });

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.clearedCells).toEqual([
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
    ]);
    expect(result.steps[0]?.symbols).toEqual([4, 2, 2, 2, 3, 4, 2, 4, 3]);
    expect(result.steps[0]?.dropDistances).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(result.finalSymbols).toEqual([4, 2, 2, 2, 3, 4, 2, 4, 3]);
  });

  it("does not resolve anything in classic validation mode", () => {
    const result = resolveCascadeWins({
      columns: 3,
      rows: 3,
      settings: traceSettings,
      symbolCount: 4,
      symbols: [1, 1, 1, 2, 3, 4, 2, 4, 3],
      validationMode: "classic",
    });

    expect(result.steps).toEqual([]);
    expect(result.finalSymbols).toEqual([1, 1, 1, 2, 3, 4, 2, 4, 3]);
  });
});
