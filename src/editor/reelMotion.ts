import { randomWeightedSymbol } from "./symbolWeights";

export type ReelMotionWindow = number[][];

interface ReelMotionRandomConfig {
  currentStep?: number;
  random?: () => number;
  symbolCount: number;
  symbolWeights?: number[];
  stopSchedule?: number[];
}

interface CreateReelMotionWindowConfig extends ReelMotionRandomConfig {
  columns: number;
  rows: number;
  visibleSymbols: number[];
}

export function createReelMotionWindow({
  columns,
  random = Math.random,
  rows,
  symbolCount,
  symbolWeights,
  visibleSymbols,
}: CreateReelMotionWindowConfig): ReelMotionWindow {
  return Array.from({ length: columns }, (_, columnIndex) => {
    const visibleColumnSymbols = Array.from(
      { length: rows },
      (_, rowIndex) => visibleSymbols[rowIndex * columns + columnIndex] ?? 1,
    );

    return [
      randomWeightedSymbol({ cardCount: symbolCount, random, weights: symbolWeights }),
      ...visibleColumnSymbols,
      randomWeightedSymbol({ cardCount: symbolCount, random, weights: symbolWeights }),
    ];
  });
}

export function advanceReelMotionWindow(
  window: ReelMotionWindow,
  {
    currentStep,
    random = Math.random,
    stopSchedule,
    symbolCount,
    symbolWeights,
  }: ReelMotionRandomConfig,
): ReelMotionWindow {
  return window.map((columnSymbols, columnIndex) => {
    const stopStep = stopSchedule?.[columnIndex];
    if (currentStep !== undefined && stopStep !== undefined && currentStep >= stopStep) {
      return columnSymbols;
    }

    return [
      randomWeightedSymbol({ cardCount: symbolCount, random, weights: symbolWeights }),
      ...columnSymbols.slice(0, -1),
    ];
  });
}

export function getVisibleReelMotionSymbols(window: ReelMotionWindow, rows: number): number[] {
  const columns = window.length;
  const symbols: number[] = [];

  for (let rowIndex = 1; rowIndex <= rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      symbols.push(window[columnIndex]?.[rowIndex] ?? 1);
    }
  }

  return symbols;
}

export function createRandomReelStopSchedule({
  columns,
  maxStep,
  minStep,
  random = Math.random,
}: {
  columns: number;
  maxStep: number;
  minStep: number;
  random?: () => number;
}): number[] {
  const stepRange = maxStep - minStep;

  return Array.from({ length: columns }, () => minStep + Math.round(random() * stepRange));
}

function createStaggeredStopSteps(columns: number, minStep: number, maxStep: number): number[] {
  if (columns <= 1) {
    return [maxStep];
  }

  const stepRange = maxStep - minStep;
  return Array.from({ length: columns }, (_, index) =>
    Math.round(minStep + (stepRange * index) / (columns - 1)),
  );
}

export function createReelStopSchedule({
  columns,
  maxStep,
  minStep,
  mode,
  random = Math.random,
}: {
  columns: number;
  maxStep: number;
  minStep: number;
  mode: "all-at-once" | "left-to-right" | "random-one-by-one";
  random?: () => number;
}): number[] {
  if (mode === "all-at-once") {
    return Array.from({ length: columns }, () => maxStep);
  }

  const staggeredSteps = createStaggeredStopSteps(columns, minStep, maxStep);
  if (mode === "left-to-right") {
    return staggeredSteps;
  }

  const columnOrder = Array.from({ length: columns }, (_, index) => index);
  for (let index = columnOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [columnOrder[index], columnOrder[swapIndex]] = [columnOrder[swapIndex], columnOrder[index]];
  }

  const schedule = Array.from({ length: columns }, () => maxStep);
  columnOrder.forEach((columnIndex, orderIndex) => {
    schedule[columnIndex] = staggeredSteps[orderIndex] ?? maxStep;
  });
  return schedule;
}
