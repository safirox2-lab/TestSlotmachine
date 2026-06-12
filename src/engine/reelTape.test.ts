import { describe, expect, it } from "vitest";
import type { SymbolId } from "../types/game.types";
import {
  createLandingSymbolSchedule,
  createWeightedReelSymbolPicker,
  getNextTrackBoundaryRows,
} from "./reelTape";

const testSymbols = {
  LOW: { weight: 3 },
  HIGH: { weight: 1 },
  SCATTER: { weight: 1, scatter: true },
} as const;

function createSequenceRng(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

describe("reelTape", () => {
  it("picks reel filler symbols from weighted visual odds", () => {
    const pick = createWeightedReelSymbolPicker(testSymbols, createSequenceRng([0, 0.72]));

    expect(pick()).toBe("LOW");
    expect(pick()).toBe("HIGH");
  });

  it("dampens scatter symbols in the visual filler tape", () => {
    const pick = createWeightedReelSymbolPicker(testSymbols, createSequenceRng([0.92, 0.99, 0]));

    expect(pick()).toBe("LOW");
  });

  it("avoids extending a three-symbol repeat when alternatives exist", () => {
    const pick = createWeightedReelSymbolPicker(testSymbols, createSequenceRng([0, 0.72]));

    expect(pick(["LOW", "LOW"])).toBe("HIGH");
  });

  it("schedules the final column result from bottom to top before landing", () => {
    const board: SymbolId[] = [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "C0",
      "C1",
      "C2",
      "C3",
      "C4",
      "D0",
      "D1",
      "D2",
      "D3",
      "D4",
    ];

    expect(
      createLandingSymbolSchedule({
        board,
        column: 0,
        columns: 5,
        rows: 4,
        bufferRows: 3,
        finalStopRows: 10,
      }),
    ).toEqual([
      [4, "D0"],
      [5, "C0"],
      [6, "B0"],
      [7, "A0"],
    ]);
  });

  it("projects fast spins to the next full track boundary so no landing event starts at zero", () => {
    const board: SymbolId[] = [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "C0",
      "C1",
      "C2",
      "C3",
      "C4",
      "D0",
      "D1",
      "D2",
      "D3",
      "D4",
    ];
    const finalStopRows = getNextTrackBoundaryRows({
      travelPx: 608,
      cellStep: 108,
      trackRows: 7,
    });

    expect(finalStopRows).toBe(7);
    expect(
      createLandingSymbolSchedule({
        board,
        column: 0,
        columns: 5,
        rows: 4,
        bufferRows: 3,
        finalStopRows,
      }),
    ).toEqual([
      [1, "D0"],
      [2, "C0"],
      [3, "B0"],
      [4, "A0"],
    ]);
  });
});
