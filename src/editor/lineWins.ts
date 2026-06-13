export type LineWinDirection = "diagonal" | "horizontal" | "vertical" | "zigzag";
export type LineTraceSettingKey = LineWinDirection | "firstReel";
export type LinePayouts = Record<number, Record<number, number>>;
export type WildLineRule = "all" | "highest-paying";

export interface LineTraceSettings {
  diagonal: boolean;
  firstReel?: boolean;
  horizontal: boolean;
  vertical: boolean;
  zigzag: boolean;
}

export interface LineWinCell {
  column: number;
  row: number;
}

export interface LineWin {
  cells: LineWinCell[];
  color: string;
  direction: LineWinDirection;
  symbol: number;
}

const LINE_WIN_COLORS = ["#22c55e", "#38bdf8", "#f97316", "#e879f9", "#facc15", "#fb7185"];

const LINE_DIRECTIONS: Array<{
  columnStep: number;
  direction: LineWinDirection;
  rowStep: number;
}> = [
  { columnStep: 1, direction: "horizontal", rowStep: 0 },
  { columnStep: 0, direction: "vertical", rowStep: 1 },
  { columnStep: 1, direction: "diagonal", rowStep: 1 },
  { columnStep: -1, direction: "diagonal", rowStep: 1 },
];

export function countLineTracePossibilities({
  columns,
  matchCount,
  rows,
  settings,
}: {
  columns: number;
  matchCount: number;
  rows: number;
  settings: LineTraceSettings;
}): number {
  const safeMatchCount = Math.max(3, Math.round(matchCount));
  let count = 0;

  if (settings.horizontal && columns >= safeMatchCount) {
    count += settings.firstReel ? rows : rows * (columns - safeMatchCount + 1);
  }

  if (!settings.firstReel && settings.vertical && rows >= safeMatchCount) {
    count += columns * (rows - safeMatchCount + 1);
  }

  if (settings.diagonal && columns >= safeMatchCount && rows >= safeMatchCount) {
    count += settings.firstReel
      ? rows - safeMatchCount + 1
      : 2 * (columns - safeMatchCount + 1) * (rows - safeMatchCount + 1);
  }

  if (settings.horizontal && settings.zigzag && columns >= safeMatchCount) {
    const startColumn = 1;
    const endColumn = settings.firstReel ? 1 : columns - safeMatchCount + 1;
    for (let column = startColumn; column <= endColumn; column += 1) {
      for (let row = 1; row <= rows; row += 1) {
        for (
          let bridgeAfterIndex = 0;
          bridgeAfterIndex < safeMatchCount - 1;
          bridgeAfterIndex += 1
        ) {
          for (const bridgeRowStep of [-1, 1]) {
            const bridgeRow = row + bridgeRowStep;
            if (bridgeRow >= 1 && bridgeRow <= rows) {
              count += 1;
            }
          }
        }
      }
    }
  }

  return count;
}

function detectZigzagBridgeWins({
  columns,
  rows,
  scatterSymbols,
  startFromFirstReelOnly = false,
  symbols,
  wildBridgeBlockedSymbols,
  wildSymbols,
}: {
  columns: number;
  rows: number;
  scatterSymbols: Set<number>;
  startFromFirstReelOnly?: boolean;
  symbols: number[];
  wildBridgeBlockedSymbols: Set<number>;
  wildSymbols: Set<number>;
}): Array<Omit<LineWin, "color">> {
  const wins: Array<Omit<LineWin, "color">> = [];
  const maxCells = Math.max(columns, rows);

  for (let row = 1; row <= rows; row += 1) {
    const startColumn = 1;
    const endColumn = startFromFirstReelOnly ? 1 : columns;
    for (let column = startColumn; column <= endColumn; column += 1) {
      for (let bridgeAfterIndex = 0; bridgeAfterIndex < maxCells - 1; bridgeAfterIndex += 1) {
        for (const bridgeRowStep of [-1, 1]) {
          const run = collectSingleBridgeRun({
            bridgeAfterIndex,
            bridgeRowStep,
            column,
            columns,
            row,
            rows,
            scatterSymbols,
            symbols,
            wildBridgeBlockedSymbols,
            wildSymbols,
          });

          if (!run) {
            continue;
          }

          wins.push({
            cells: run.cells,
            direction: "horizontal",
            symbol: run.symbol,
          });
        }
      }
    }
  }

  return wins;
}

function collectSingleBridgeRun({
  bridgeAfterIndex,
  bridgeRowStep,
  column,
  columns,
  row,
  rows,
  scatterSymbols,
  symbols,
  wildBridgeBlockedSymbols,
  wildSymbols,
}: {
  bridgeAfterIndex: number;
  bridgeRowStep: number;
  column: number;
  columns: number;
  row: number;
  rows: number;
  scatterSymbols: Set<number>;
  symbols: number[];
  wildBridgeBlockedSymbols: Set<number>;
  wildSymbols: Set<number>;
}): { cells: LineWinCell[]; symbol: number } | null {
  const cells: LineWinCell[] = [];
  let currentColumn = column;
  let currentRow = row;
  let hasWildBridge = false;
  let targetSymbol: number | null = null;

  while (
    currentColumn >= 1 &&
    currentColumn <= columns &&
    currentRow >= 1 &&
    currentRow <= rows &&
    cells.length < Math.max(columns, rows)
  ) {
    const symbol = getSymbol(symbols, columns, currentColumn, currentRow);
    if (symbol === null || scatterSymbols.has(symbol)) {
      break;
    }

    if (wildSymbols.has(symbol)) {
      if (targetSymbol !== null && wildBridgeBlockedSymbols.has(targetSymbol)) {
        break;
      }
      hasWildBridge = true;
    } else {
      if (targetSymbol === null) {
        targetSymbol = symbol;
        if (hasWildBridge && wildBridgeBlockedSymbols.has(targetSymbol)) {
          return null;
        }
      } else if (symbol !== targetSymbol) {
        break;
      }
    }

    cells.push({ column: currentColumn, row: currentRow });
    currentColumn += 1;
    if (cells.length - 1 === bridgeAfterIndex) {
      currentRow += bridgeRowStep;
    }
  }

  if (targetSymbol === null || cells.length < 3) {
    return null;
  }

  if (hasWildBridge && wildBridgeBlockedSymbols.has(targetSymbol)) {
    return null;
  }

  const previousSymbol = getSymbol(symbols, columns, column - 1, row);
  if (isCompatibleSymbol(previousSymbol, targetSymbol, scatterSymbols, wildSymbols)) {
    return null;
  }

  return { cells, symbol: targetSymbol };
}

function getSymbol(symbols: number[], columns: number, column: number, row: number): number | null {
  if (column < 1 || row < 1 || column > columns) {
    return null;
  }

  return symbols[(row - 1) * columns + (column - 1)] ?? null;
}

function getGroupedSymbols({
  scatterSymbols,
  symbolGroups,
  symbols,
  wildSymbols,
}: {
  scatterSymbols: Set<number>;
  symbolGroups: number[][];
  symbols: number[];
  wildSymbols: Set<number>;
}): number[] {
  const symbolGroupMap = new Map<number, number>();

  for (const group of symbolGroups) {
    const groupSymbol = group.find(
      (symbol) => !scatterSymbols.has(symbol) && !wildSymbols.has(symbol),
    );
    if (groupSymbol === undefined) {
      continue;
    }

    for (const symbol of group) {
      if (!scatterSymbols.has(symbol) && !wildSymbols.has(symbol)) {
        symbolGroupMap.set(symbol, groupSymbol);
      }
    }
  }

  return symbols.map((symbol) => symbolGroupMap.get(symbol) ?? symbol);
}

function isCompatibleSymbol(
  symbol: number | null,
  targetSymbol: number,
  scatterSymbols: Set<number>,
  wildSymbols: Set<number>,
): boolean {
  return (
    symbol !== null &&
    !scatterSymbols.has(symbol) &&
    (wildSymbols.has(symbol) || symbol === targetSymbol)
  );
}

function cellKey(cell: LineWinCell): string {
  return `${cell.column}:${cell.row}`;
}

function isCoveredByLongerWin(candidate: LineWin, wins: LineWin[]): boolean {
  const candidateCells = new Set(candidate.cells.map(cellKey));

  return wins.some((win) => {
    if (
      win === candidate ||
      win.symbol !== candidate.symbol ||
      win.cells.length <= candidate.cells.length
    ) {
      return false;
    }

    const winCells = new Set(win.cells.map(cellKey));
    return [...candidateCells].every((key) => winCells.has(key));
  });
}

function dedupeAndKeepLongestWins(wins: LineWin[]): LineWin[] {
  const seen = new Set<string>();
  const keptWins = wins.filter((win) => !isCoveredByLongerWin(win, wins));

  return keptWins
    .sort((leftWin, rightWin) => rightWin.cells.length - leftWin.cells.length)
    .filter((win) => {
      const key = `${win.symbol}:${win.cells.map(cellKey).join("|")}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((leftWin, rightWin) => {
      const leftCell = leftWin.cells[0];
      const rightCell = rightWin.cells[0];
      return (
        (leftCell?.row ?? 0) - (rightCell?.row ?? 0) ||
        (leftCell?.column ?? 0) - (rightCell?.column ?? 0)
      );
    })
    .map((win, index) => ({
      ...win,
      color: LINE_WIN_COLORS[index % LINE_WIN_COLORS.length],
    }));
}

function recolorWins(wins: LineWin[]): LineWin[] {
  return wins.map((win, index) => ({
    ...win,
    color: LINE_WIN_COLORS[index % LINE_WIN_COLORS.length],
  }));
}

function getWinPayout(win: LineWin, linePayouts: LinePayouts): number {
  return linePayouts[win.symbol]?.[win.cells.length] ?? 1;
}

function keepPayingWins(wins: LineWin[], linePayouts: LinePayouts): LineWin[] {
  return wins.filter((win) => getWinPayout(win, linePayouts) > 0);
}

function getWildCellKeys({
  columns,
  symbols,
  wildSymbols,
  win,
}: {
  columns: number;
  symbols: number[];
  wildSymbols: Set<number>;
  win: LineWin;
}): Set<string> {
  return new Set(
    win.cells
      .filter((cell) => {
        const symbol = getSymbol(symbols, columns, cell.column, cell.row);
        return symbol !== null && wildSymbols.has(symbol);
      })
      .map(cellKey),
  );
}

function hasSharedWildCell(leftKeys: Set<string>, rightKeys: Set<string>): boolean {
  return [...leftKeys].some((key) => rightKeys.has(key));
}

function keepHighestPayingWildWins({
  columns,
  linePayouts,
  symbols,
  wildSymbols,
  wins,
}: {
  columns: number;
  linePayouts: LinePayouts;
  symbols: number[];
  wildSymbols: Set<number>;
  wins: LineWin[];
}): LineWin[] {
  const keptWins: LineWin[] = [];
  const keptWildKeys: Set<string>[] = [];

  for (const win of wins) {
    const wildCellKeys = getWildCellKeys({ columns, symbols, wildSymbols, win });
    if (wildCellKeys.size === 0) {
      keptWins.push(win);
      keptWildKeys.push(wildCellKeys);
      continue;
    }

    const conflictingIndexes = keptWins
      .map((keptWin, index) => ({ index, keptWin }))
      .filter(
        ({ index, keptWin }) =>
          keptWin.direction === win.direction &&
          hasSharedWildCell(wildCellKeys, keptWildKeys[index] ?? new Set()),
      )
      .map(({ index }) => index);

    if (conflictingIndexes.length === 0) {
      keptWins.push(win);
      keptWildKeys.push(wildCellKeys);
      continue;
    }

    const payout = getWinPayout(win, linePayouts);
    const highestConflictingPayout = Math.max(
      ...conflictingIndexes.map((index) => getWinPayout(keptWins[index] as LineWin, linePayouts)),
    );

    if (payout <= highestConflictingPayout) {
      continue;
    }

    for (const index of [...conflictingIndexes].sort((left, right) => right - left)) {
      keptWins.splice(index, 1);
      keptWildKeys.splice(index, 1);
    }
    keptWins.push(win);
    keptWildKeys.push(wildCellKeys);
  }

  return keptWins;
}

function isWildOnlyWin({
  columns,
  symbols,
  wildSymbols,
  win,
}: {
  columns: number;
  symbols: number[];
  wildSymbols: Set<number>;
  win: LineWin;
}): boolean {
  return (
    wildSymbols.has(win.symbol) &&
    win.cells.every((cell) => {
      const symbol = getSymbol(symbols, columns, cell.column, cell.row);
      return symbol !== null && wildSymbols.has(symbol);
    })
  );
}

function keepHigherPayingWildOnlyConflicts({
  columns,
  linePayouts,
  symbols,
  wildSymbols,
  wins,
}: {
  columns: number;
  linePayouts: LinePayouts;
  symbols: number[];
  wildSymbols: Set<number>;
  wins: LineWin[];
}): LineWin[] {
  const keptWins: LineWin[] = [];
  const keptWildKeys: Set<string>[] = [];
  const keptWildOnlyFlags: boolean[] = [];

  for (const win of wins) {
    const wildOnly = isWildOnlyWin({ columns, symbols, wildSymbols, win });
    const wildCellKeys = getWildCellKeys({ columns, symbols, wildSymbols, win });

    if (wildCellKeys.size === 0) {
      keptWins.push(win);
      keptWildKeys.push(wildCellKeys);
      keptWildOnlyFlags.push(wildOnly);
      continue;
    }

    const conflictingIndexes = keptWins
      .map((keptWin, index) => ({ index, keptWin }))
      .filter(
        ({ index, keptWin }) =>
          keptWin.direction === win.direction &&
          (wildOnly || keptWildOnlyFlags[index]) &&
          hasSharedWildCell(wildCellKeys, keptWildKeys[index] ?? new Set()),
      )
      .map(({ index }) => index);

    if (conflictingIndexes.length === 0) {
      keptWins.push(win);
      keptWildKeys.push(wildCellKeys);
      keptWildOnlyFlags.push(wildOnly);
      continue;
    }

    const payout = getWinPayout(win, linePayouts);
    const highestConflictingPayout = Math.max(
      ...conflictingIndexes.map((index) => getWinPayout(keptWins[index] as LineWin, linePayouts)),
    );

    if (payout <= highestConflictingPayout) {
      continue;
    }

    for (const index of [...conflictingIndexes].sort((left, right) => right - left)) {
      keptWins.splice(index, 1);
      keptWildKeys.splice(index, 1);
      keptWildOnlyFlags.splice(index, 1);
    }
    keptWins.push(win);
    keptWildKeys.push(wildCellKeys);
    keptWildOnlyFlags.push(wildOnly);
  }

  return keptWins;
}

function collectWildOnlyRun({
  column,
  columnStep,
  columns,
  row,
  rowStep,
  rows,
  symbols,
  wildSymbols,
}: {
  column: number;
  columnStep: number;
  columns: number;
  row: number;
  rowStep: number;
  rows: number;
  symbols: number[];
  wildSymbols: Set<number>;
}): { cells: LineWinCell[]; symbol: number } | null {
  const firstSymbol = getSymbol(symbols, columns, column, row);
  if (firstSymbol === null || !wildSymbols.has(firstSymbol)) {
    return null;
  }

  const previousSymbol = getSymbol(symbols, columns, column - columnStep, row - rowStep);
  if (previousSymbol === firstSymbol) {
    return null;
  }

  const cells: LineWinCell[] = [];
  let currentColumn = column;
  let currentRow = row;

  while (
    currentColumn >= 1 &&
    currentColumn <= columns &&
    currentRow >= 1 &&
    currentRow <= rows &&
    getSymbol(symbols, columns, currentColumn, currentRow) === firstSymbol
  ) {
    cells.push({ column: currentColumn, row: currentRow });
    currentColumn += columnStep;
    currentRow += rowStep;
  }

  if (cells.length < 3) {
    return null;
  }

  return { cells, symbol: firstSymbol };
}

function detectWildOnlyWins({
  columns,
  rows,
  settings,
  symbols,
  wildSymbols,
}: {
  columns: number;
  rows: number;
  settings: LineTraceSettings;
  symbols: number[];
  wildSymbols: Set<number>;
}): LineWin[] {
  const wins: LineWin[] = [];

  for (const { columnStep, direction, rowStep } of LINE_DIRECTIONS) {
    if (!settings[direction]) {
      continue;
    }
    if (settings.firstReel && columnStep !== 1) {
      continue;
    }

    for (let row = 1; row <= rows; row += 1) {
      const startColumn = 1;
      const endColumn = settings.firstReel ? 1 : columns;
      for (let column = startColumn; column <= endColumn; column += 1) {
        const run = collectWildOnlyRun({
          column,
          columnStep,
          columns,
          row,
          rowStep,
          rows,
          symbols,
          wildSymbols,
        });

        if (run) {
          wins.push({
            cells: run.cells,
            color: LINE_WIN_COLORS[wins.length % LINE_WIN_COLORS.length],
            direction,
            symbol: run.symbol,
          });
        }
      }
    }
  }

  return wins;
}

function collectLineRun({
  column,
  columnStep,
  columns,
  row,
  rowStep,
  rows,
  scatterSymbols,
  symbols,
  wildBridgeBlockedSymbols,
  wildSymbols,
  zigzag = false,
}: {
  column: number;
  columnStep: number;
  columns: number;
  row: number;
  rowStep: number;
  rows: number;
  scatterSymbols: Set<number>;
  symbols: number[];
  wildBridgeBlockedSymbols: Set<number>;
  wildSymbols: Set<number>;
  zigzag?: boolean;
}): { cells: LineWinCell[]; symbol: number } | null {
  const cells: LineWinCell[] = [];
  let currentColumn = column;
  let currentRow = row;
  let currentRowStep = rowStep;
  let hasWildBridge = false;
  let targetSymbol: number | null = null;

  while (
    currentColumn >= 1 &&
    currentColumn <= columns &&
    currentRow >= 1 &&
    currentRow <= rows &&
    cells.length < Math.max(columns, rows)
  ) {
    const symbol = getSymbol(symbols, columns, currentColumn, currentRow);
    if (symbol === null || scatterSymbols.has(symbol)) {
      break;
    }

    if (wildSymbols.has(symbol)) {
      if (targetSymbol !== null && wildBridgeBlockedSymbols.has(targetSymbol)) {
        break;
      }
      hasWildBridge = true;
    } else {
      if (targetSymbol === null) {
        targetSymbol = symbol;
        if (hasWildBridge && wildBridgeBlockedSymbols.has(targetSymbol)) {
          return null;
        }
      } else if (symbol !== targetSymbol) {
        break;
      }
    }

    cells.push({ column: currentColumn, row: currentRow });
    currentColumn += columnStep;
    currentRow += currentRowStep;
    if (zigzag) {
      currentRowStep *= -1;
    }
  }

  if (targetSymbol === null || cells.length < 3) {
    return null;
  }

  if (hasWildBridge && wildBridgeBlockedSymbols.has(targetSymbol)) {
    return null;
  }

  const previousSymbol = getSymbol(symbols, columns, column - columnStep, row - rowStep);
  if (isCompatibleSymbol(previousSymbol, targetSymbol, scatterSymbols, wildSymbols)) {
    return null;
  }

  return { cells, symbol: targetSymbol };
}

export function detectLineWins({
  columns,
  linePayouts = {},
  rows,
  settings,
  scatterSymbols = [],
  symbolGroups = [],
  symbols,
  wildBridgeBlockedSymbols = [],
  wildLineRule = "all",
  wildSymbols = [],
}: {
  columns: number;
  linePayouts?: LinePayouts;
  rows: number;
  settings: LineTraceSettings;
  scatterSymbols?: number[];
  symbolGroups?: number[][];
  symbols: number[];
  wildBridgeBlockedSymbols?: number[];
  wildLineRule?: WildLineRule;
  wildSymbols?: number[];
}): LineWin[] {
  const wins: LineWin[] = [];
  const scatterSymbolSet = new Set(scatterSymbols);
  const wildBridgeBlockedSymbolSet = new Set(wildBridgeBlockedSymbols);
  const wildSymbolSet = new Set(wildSymbols.filter((symbol) => !scatterSymbolSet.has(symbol)));
  const groupedSymbols = getGroupedSymbols({
    scatterSymbols: scatterSymbolSet,
    symbolGroups,
    symbols,
    wildSymbols: wildSymbolSet,
  });

  for (const { columnStep, direction, rowStep } of LINE_DIRECTIONS) {
    if (!settings[direction]) {
      continue;
    }
    if (settings.firstReel && columnStep !== 1) {
      continue;
    }

    for (let row = 1; row <= rows; row += 1) {
      const startColumn = 1;
      const endColumn = settings.firstReel ? 1 : columns;
      for (let column = startColumn; column <= endColumn; column += 1) {
        const run = collectLineRun({
          column,
          columnStep,
          columns,
          row,
          rowStep,
          rows,
          scatterSymbols: scatterSymbolSet,
          symbols: groupedSymbols,
          wildBridgeBlockedSymbols: wildBridgeBlockedSymbolSet,
          wildSymbols: wildSymbolSet,
        });

        if (run) {
          wins.push({
            cells: run.cells,
            color: LINE_WIN_COLORS[wins.length % LINE_WIN_COLORS.length],
            direction,
            symbol: run.symbol,
          });
        }
      }
    }
  }

  if (settings.horizontal && settings.zigzag) {
    for (const win of detectZigzagBridgeWins({
      columns,
      rows,
      scatterSymbols: scatterSymbolSet,
      startFromFirstReelOnly: settings.firstReel,
      symbols: groupedSymbols,
      wildBridgeBlockedSymbols: wildBridgeBlockedSymbolSet,
      wildSymbols: wildSymbolSet,
    })) {
      wins.push({
        ...win,
        color: LINE_WIN_COLORS[wins.length % LINE_WIN_COLORS.length],
      });
    }
  }

  const dedupedWins = dedupeAndKeepLongestWins(wins);
  const wildOnlyWins = detectWildOnlyWins({
    columns,
    rows,
    settings,
    symbols: groupedSymbols,
    wildSymbols: wildSymbolSet,
  });

  if (wildLineRule !== "highest-paying") {
    return recolorWins(
      keepPayingWins(
        keepHigherPayingWildOnlyConflicts({
          columns,
          linePayouts,
          symbols: groupedSymbols,
          wildSymbols: wildSymbolSet,
          wins: [...dedupedWins, ...wildOnlyWins],
        }),
        linePayouts,
      ),
    );
  }

  return recolorWins(
    keepPayingWins(
      keepHighestPayingWildWins({
        columns,
        linePayouts,
        symbols: groupedSymbols,
        wildSymbols: wildSymbolSet,
        wins: [...dedupedWins, ...wildOnlyWins],
      }),
      linePayouts,
    ),
  );
}
