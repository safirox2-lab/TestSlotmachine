import { describe, expect, it } from "vitest";
import { countLineTracePossibilities, detectLineWins } from "./lineWins";

describe("line win detection", () => {
  it("counts possible trace positions by enabled direction and match length", () => {
    expect(
      countLineTracePossibilities({
        columns: 5,
        matchCount: 3,
        rows: 4,
        settings: {
          diagonal: true,
          horizontal: true,
          vertical: true,
          zigzag: true,
        },
      }),
    ).toBe(70);

    expect(
      countLineTracePossibilities({
        columns: 5,
        matchCount: 5,
        rows: 4,
        settings: {
          diagonal: true,
          horizontal: true,
          vertical: true,
          zigzag: true,
        },
      }),
    ).toBe(28);
  });

  it("detects horizontal vertical and diagonal runs from three to five matching symbols", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      settings: {
        diagonal: true,
        horizontal: true,
        vertical: true,
        zigzag: false,
      },
      symbols: [1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 2, 7, 3, 8, 9, 2, 10, 11, 3, 12],
    });

    expect(wins).toEqual([
      {
        cells: [
          { column: 1, row: 1 },
          { column: 2, row: 1 },
          { column: 3, row: 1 },
          { column: 4, row: 1 },
          { column: 5, row: 1 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 1,
      },
      {
        cells: [
          { column: 1, row: 2 },
          { column: 1, row: 3 },
          { column: 1, row: 4 },
        ],
        color: "#38bdf8",
        direction: "vertical",
        symbol: 2,
      },
      {
        cells: [
          { column: 2, row: 2 },
          { column: 3, row: 3 },
          { column: 4, row: 4 },
        ],
        color: "#f97316",
        direction: "diagonal",
        symbol: 3,
      },
    ]);
  });

  it("honors disabled directions", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: false,
        zigzag: false,
      },
      symbols: [1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 2, 7, 3, 8, 9, 2, 10, 11, 3, 12],
    });

    expect(wins.map((win) => win.direction)).toEqual(["horizontal"]);
  });

  it("requires line wins to start from the first reel when enabled", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      settings: {
        diagonal: true,
        firstReel: true,
        horizontal: true,
        vertical: true,
        zigzag: true,
      },
      symbols: [9, 1, 1, 1, 9, 2, 2, 2, 9, 9, 3, 9, 3, 9, 9, 3, 9, 9, 3, 9],
    });

    expect(wins).toEqual([
      {
        cells: [
          { column: 1, row: 2 },
          { column: 2, row: 2 },
          { column: 3, row: 2 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 2,
      },
    ]);
  });

  it("uses zigzag as a single diagonal bridge for horizontal traces", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: false,
        zigzag: true,
      },
      symbols: [10, 11, 12, 13, 14, 15, 2, 2, 18, 19, 2, 24, 21, 22, 23, 16, 17, 18, 25, 26],
    });

    expect(wins).toContainEqual({
      cells: [
        { column: 1, row: 3 },
        { column: 2, row: 2 },
        { column: 3, row: 2 },
      ],
      color: "#22c55e",
      direction: "horizontal",
      symbol: 2,
    });
    expect(wins.map((win) => win.direction)).not.toContain("zigzag");
  });

  it("keeps only the longer bridged trace when zigzag extends a straight trace", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: false,
        zigzag: true,
      },
      symbols: [3, 5, 5, 5, 7, 3, 8, 8, 9, 5, 2, 1, 4, 6, 7, 2, 1, 4, 6, 7],
    });

    expect(wins.filter((win) => win.symbol === 5)).toEqual([
      {
        cells: [
          { column: 2, row: 1 },
          { column: 3, row: 1 },
          { column: 4, row: 1 },
          { column: 5, row: 2 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 5,
      },
    ]);
  });

  it("does not treat zigzag as its own trace direction", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      settings: {
        diagonal: false,
        horizontal: false,
        vertical: false,
        zigzag: true,
      },
      symbols: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 2, 21, 22, 23, 2, 24, 2, 25, 26],
    });

    expect(wins).toEqual([]);
  });

  it("ignores scatter symbols and uses wild symbols as bridge cards", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      scatterSymbols: [9],
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: true,
        zigzag: true,
      },
      symbols: [1, 8, 1, 1, 9, 2, 9, 2, 2, 2, 3, 8, 3, 4, 5, 4, 8, 4, 6, 7],
      wildSymbols: [8],
    });

    expect(wins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cells: [
            { column: 1, row: 1 },
            { column: 2, row: 1 },
            { column: 3, row: 1 },
            { column: 4, row: 1 },
          ],
          direction: "horizontal",
          symbol: 1,
        }),
        expect.objectContaining({
          cells: [
            { column: 2, row: 1 },
            { column: 3, row: 2 },
            { column: 4, row: 2 },
            { column: 5, row: 2 },
          ],
          direction: "horizontal",
          symbol: 2,
        }),
      ]),
    );
    expect(wins.flatMap((win) => win.cells)).not.toContainEqual({ column: 2, row: 2 });
    expect(wins.flatMap((win) => win.cells)).not.toContainEqual({ column: 5, row: 1 });
  });

  it("lets wild symbols support only the highest paying same-direction line when configured", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 3,
      linePayouts: {
        1: { 3: 10 },
        2: { 3: 50 },
        4: { 3: 20 },
      },
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: true,
        zigzag: false,
      },
      symbols: [1, 1, 9, 2, 2, 3, 4, 4, 5, 6, 7, 8, 4, 10, 11],
      wildLineRule: "highest-paying",
      wildSymbols: [9],
    });

    expect(wins).toEqual([
      {
        cells: [
          { column: 3, row: 1 },
          { column: 4, row: 1 },
          { column: 5, row: 1 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 2,
      },
      {
        cells: [
          { column: 3, row: 1 },
          { column: 3, row: 2 },
          { column: 3, row: 3 },
        ],
        color: "#38bdf8",
        direction: "vertical",
        symbol: 4,
      },
    ]);
  });

  it("compares a wild-only run against the bridged card run when choosing the highest pay", () => {
    expect(
      detectLineWins({
        columns: 5,
        linePayouts: {
          1: { 5: 50 },
          9: { 3: 100 },
        },
        rows: 1,
        settings: {
          diagonal: false,
          horizontal: true,
          vertical: false,
          zigzag: false,
        },
        symbols: [9, 9, 9, 1, 1],
        wildLineRule: "highest-paying",
        wildSymbols: [9],
      }),
    ).toEqual([
      {
        cells: [
          { column: 1, row: 1 },
          { column: 2, row: 1 },
          { column: 3, row: 1 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 9,
      },
    ]);

    expect(
      detectLineWins({
        columns: 5,
        linePayouts: {
          1: { 5: 150 },
          9: { 3: 100 },
        },
        rows: 1,
        settings: {
          diagonal: false,
          horizontal: true,
          vertical: false,
          zigzag: false,
        },
        symbols: [9, 9, 9, 1, 1],
        wildLineRule: "highest-paying",
        wildSymbols: [9],
      }),
    ).toEqual([
      {
        cells: [
          { column: 1, row: 1 },
          { column: 2, row: 1 },
          { column: 3, row: 1 },
          { column: 4, row: 1 },
          { column: 5, row: 1 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 1,
      },
    ]);
  });

  it("compares wild-only runs against bridged card runs even without highest pay mode", () => {
    expect(
      detectLineWins({
        columns: 4,
        linePayouts: {
          1: { 4: 40 },
          9: { 3: 100 },
        },
        rows: 1,
        settings: {
          diagonal: false,
          horizontal: true,
          vertical: false,
          zigzag: false,
        },
        symbols: [9, 9, 9, 1],
        wildSymbols: [9],
      }),
    ).toEqual([
      {
        cells: [
          { column: 1, row: 1 },
          { column: 2, row: 1 },
          { column: 3, row: 1 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 9,
      },
    ]);

    expect(
      detectLineWins({
        columns: 4,
        linePayouts: {
          1: { 4: 140 },
          9: { 3: 100 },
        },
        rows: 1,
        settings: {
          diagonal: false,
          horizontal: true,
          vertical: false,
          zigzag: false,
        },
        symbols: [9, 9, 9, 1],
        wildSymbols: [9],
      }),
    ).toEqual([
      {
        cells: [
          { column: 1, row: 1 },
          { column: 2, row: 1 },
          { column: 3, row: 1 },
          { column: 4, row: 1 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 1,
      },
    ]);
  });

  it("does not let wild symbols bridge scatter line wins", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      scatterSymbols: [],
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: false,
        zigzag: false,
      },
      symbols: [9, 8, 9, 9, 1, 4, 8, 2, 2, 2, 3, 4, 5, 6, 7, 4, 5, 6, 7, 8],
      wildBridgeBlockedSymbols: [9],
      wildSymbols: [8],
    });

    expect(wins).toEqual([
      {
        cells: [
          { column: 2, row: 2 },
          { column: 3, row: 2 },
          { column: 4, row: 2 },
          { column: 5, row: 2 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 2,
      },
    ]);
  });

  it("does not let wild symbols bridge jackpot line wins", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      scatterSymbols: [],
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: false,
        zigzag: false,
      },
      symbols: [5, 8, 5, 5, 1, 4, 8, 2, 2, 2, 3, 4, 5, 6, 7, 4, 5, 6, 7, 8],
      wildBridgeBlockedSymbols: [5],
      wildSymbols: [8],
    });

    expect(wins).toEqual([
      {
        cells: [
          { column: 2, row: 2 },
          { column: 3, row: 2 },
          { column: 4, row: 2 },
          { column: 5, row: 2 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 2,
      },
    ]);
  });

  it("treats grouped card symbols as the same symbol for line wins", () => {
    const wins = detectLineWins({
      columns: 5,
      rows: 4,
      settings: {
        diagonal: false,
        horizontal: true,
        vertical: false,
        zigzag: false,
      },
      symbolGroups: [[1, 2, 3]],
      symbols: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    });

    expect(wins).toEqual([
      {
        cells: [
          { column: 1, row: 1 },
          { column: 2, row: 1 },
          { column: 3, row: 1 },
        ],
        color: "#22c55e",
        direction: "horizontal",
        symbol: 1,
      },
    ]);
  });
});
