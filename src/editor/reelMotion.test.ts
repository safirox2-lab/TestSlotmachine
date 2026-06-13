import { describe, expect, it } from "vitest";
import {
  advanceReelMotionWindow,
  createRandomReelStopSchedule,
  createReelMotionWindow,
  createReelStopSchedule,
  getVisibleReelMotionSymbols,
} from "./reelMotion";

describe("reel motion", () => {
  it("creates a reel window with invisible RNG load and discard rows", () => {
    const randomValues = [0, 0.9, 0.1, 0.8, 0.2, 0.7];
    const window = createReelMotionWindow({
      columns: 2,
      random: () => randomValues.shift() ?? 0,
      rows: 4,
      symbolCount: 10,
      visibleSymbols: [11, 12, 21, 22, 31, 32, 41, 42],
    });

    expect(window).toEqual([
      [1, 11, 21, 31, 41, 10],
      [2, 12, 22, 32, 42, 9],
    ]);
    expect(getVisibleReelMotionSymbols(window, 4)).toEqual([11, 12, 21, 22, 31, 32, 41, 42]);
  });

  it("generates new symbols above and discards the bottom row on each step", () => {
    const window = [
      [1, 11, 21, 31, 41, 10],
      [2, 12, 22, 32, 42, 9],
    ];

    const nextWindow = advanceReelMotionWindow(window, {
      random: () => 0.4,
      symbolCount: 10,
    });

    expect(nextWindow).toEqual([
      [5, 1, 11, 21, 31, 41],
      [5, 2, 12, 22, 32, 42],
    ]);
    expect(getVisibleReelMotionSymbols(nextWindow, 4)).toEqual([1, 2, 11, 12, 21, 22, 31, 32]);
  });

  it("uses symbol weights when generating new reel symbols", () => {
    const nextWindow = advanceReelMotionWindow([[1, 2, 3]], {
      random: () => 0.9,
      symbolCount: 3,
      symbolWeights: [1, 1, 8],
    });

    expect(nextWindow[0]?.[0]).toBe(3);
  });

  it("advances only columns that have not reached their random stop step", () => {
    const window = [
      [1, 11, 21, 31, 41, 10],
      [2, 12, 22, 32, 42, 9],
      [3, 13, 23, 33, 43, 8],
    ];

    const nextWindow = advanceReelMotionWindow(window, {
      currentStep: 4,
      random: () => 0.4,
      stopSchedule: [3, 5, 4],
      symbolCount: 10,
    });

    expect(nextWindow).toEqual([
      [1, 11, 21, 31, 41, 10],
      [5, 2, 12, 22, 32, 42],
      [3, 13, 23, 33, 43, 8],
    ]);
  });

  it("creates long random stop steps per reel column", () => {
    const randomValues = [0, 0.5, 0.99];

    expect(
      createRandomReelStopSchedule({
        columns: 3,
        maxStep: 38,
        minStep: 22,
        random: () => randomValues.shift() ?? 0,
      }),
    ).toEqual([22, 30, 38]);
  });

  it("creates reel stop schedules for the configured stop mode", () => {
    expect(
      createReelStopSchedule({
        columns: 5,
        maxStep: 38,
        minStep: 22,
        mode: "all-at-once",
      }),
    ).toEqual([38, 38, 38, 38, 38]);

    expect(
      createReelStopSchedule({
        columns: 5,
        maxStep: 38,
        minStep: 22,
        mode: "left-to-right",
      }),
    ).toEqual([22, 26, 30, 34, 38]);

    const randomValues = [0.99, 0, 0.5, 0.25, 0.75];
    expect(
      createReelStopSchedule({
        columns: 5,
        maxStep: 38,
        minStep: 22,
        mode: "random-one-by-one",
        random: () => randomValues.shift() ?? 0,
      }),
    ).toEqual([34, 30, 22, 26, 38]);
  });
});
