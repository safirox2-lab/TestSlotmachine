import { GAME_CONFIG } from "../config/game.config";
import type {
  JackpotAward,
  SpinResult,
  SpinStep,
  SymbolId,
  WinningSymbol,
} from "../types/game.types";
import { PAYLINES, SYMBOL_IDS, SYMBOLS } from "./symbols";

interface SlotGameEngineOptions {
  columns?: number;
  rows?: number;
  maxCascades?: number;
  rng?: () => number;
}

interface Evaluation {
  win: number;
  winningSymbols: WinningSymbol[];
  winningIndices: number[];
  freeSpinsAwarded: number;
  jackpotAward: JackpotAward | null;
}

const GALLERO_LEGENDARIO_JACKPOT = {
  id: "deliveryLegendario",
  label: "DELIVERY LEGENDARIO",
  multiplier: 250,
  triggerSymbol: "TELEFONO7",
  triggerCount: 5,
} as const;
const DELIVERY_DEMO_PAYOUT_SCALE = 5.35;

export class SlotGameEngine {
  private readonly columns: number;
  private readonly rows: number;
  private readonly maxCascades: number;
  private readonly rng: () => number;
  private readonly weightedSymbols: SymbolId[];
  private readonly weightedBaseSymbols: SymbolId[];

  constructor({
    columns = GAME_CONFIG.grid.columns,
    rows = GAME_CONFIG.grid.rows,
    maxCascades = GAME_CONFIG.grid.maxCascades,
    rng = Math.random,
  }: SlotGameEngineOptions = {}) {
    this.columns = columns;
    this.rows = rows;
    this.maxCascades = maxCascades;
    this.rng = rng;
    this.weightedSymbols = this.createWeightedSymbols();
    this.weightedBaseSymbols = this.createWeightedSymbols({ includeScatter: false });
  }

  createInitialBoard(): SymbolId[] {
    return Array.from({ length: this.columns * this.rows }, (_, index) => {
      return SYMBOL_IDS[index % SYMBOL_IDS.length];
    });
  }

  spin({ bet, tensionLevel = 1 }: { bet: number; tensionLevel?: number }): SpinResult {
    const steps: SpinStep[] = [];
    let board = this.generateBoard();
    let totalWin = 0;
    let freeSpinsAwarded = 0;
    let jackpotAward: JackpotAward | null = null;
    let nextTension = tensionLevel;

    for (let cascade = 1; cascade <= this.maxCascades; cascade += 1) {
      const multiplier = this.getMultiplier(nextTension);
      const evaluation = this.evaluateBoard(board, { bet, multiplier });
      totalWin += evaluation.win;
      freeSpinsAwarded += evaluation.freeSpinsAwarded;
      jackpotAward ??= evaluation.jackpotAward;

      steps.push({
        cascade,
        board,
        multiplier,
        tensionLevel: nextTension,
        win: evaluation.win,
        winningSymbols: evaluation.winningSymbols,
        winningIndices: evaluation.winningIndices,
        freeSpinsAwarded: evaluation.freeSpinsAwarded,
        jackpotAward: evaluation.jackpotAward,
      });

      if (evaluation.win <= 0) {
        break;
      }

      nextTension = Math.min(this.maxCascades, nextTension + 1);
      board = this.generateBoard();
    }

    const finalStep = steps.at(-1);

    if (!finalStep) {
      throw new Error("spin-without-steps");
    }

    return {
      board: finalStep.board,
      totalWin,
      freeSpinsAwarded,
      nextTension: 1,
      steps,
      jackpotAward,
      source: "local-demo",
      signed: false,
    };
  }

  generateBoard(): SymbolId[] {
    return Array.from({ length: this.columns * this.rows }, () => this.pickWeightedSymbol());
  }

  createRollingBoard(seed: number): SymbolId[] {
    return Array.from({ length: this.columns * this.rows }, (_, index) => {
      return SYMBOL_IDS[(seed + index * 2) % SYMBOL_IDS.length];
    });
  }

  evaluateBoard(
    board: SymbolId[],
    { bet, multiplier }: { bet: number; multiplier: number },
  ): Evaluation {
    const counts = this.countSymbols(board);
    const scatters = counts.get("SCATTER") ?? 0;
    const winningSymbols: WinningSymbol[] = [];
    const winningIndices = new Set<number>();
    let win = 0;
    const lineBet = bet / Math.max(1, PAYLINES.length / 5);
    const jackpotAward = this.evaluateGalleroLegendarioJackpot(board, bet);

    PAYLINES.forEach((line, lineIndex) => {
      const evaluation = this.evaluatePayline(board, [...line]);
      if (!evaluation || evaluation.matchCount < 3) {
        return;
      }

      const symbol = SYMBOLS[evaluation.symbolId];
      const payout = symbol?.payouts[evaluation.matchCount as 3 | 4 | 5] ?? 0;

      if (payout > 0) {
        const amount = lineBet * payout * multiplier * DELIVERY_DEMO_PAYOUT_SCALE;
        win += amount;
        evaluation.positions.forEach((index) => {
          winningIndices.add(index);
        });
        winningSymbols.push({
          symbolId: evaluation.symbolId,
          count: evaluation.matchCount,
          line: lineIndex + 1,
          positions: evaluation.positions,
          amount,
        });
      }
    });

    return {
      win: win + (jackpotAward?.amount ?? 0),
      winningSymbols,
      winningIndices: [...winningIndices],
      freeSpinsAwarded: scatters >= 4 ? 8 + (scatters - 4) * 2 : 0,
      jackpotAward,
    };
  }

  private evaluateGalleroLegendarioJackpot(board: SymbolId[], bet: number): JackpotAward | null {
    for (const line of PAYLINES) {
      const positions = line.map((row, column) => this.getBoardIndex(row, column));
      const isPureLegendaryLine = positions.every(
        (position) => board[position] === GALLERO_LEGENDARIO_JACKPOT.triggerSymbol,
      );

      if (isPureLegendaryLine) {
        return {
          id: GALLERO_LEGENDARIO_JACKPOT.id,
          label: GALLERO_LEGENDARIO_JACKPOT.label,
          amount: bet * GALLERO_LEGENDARIO_JACKPOT.multiplier,
          triggerSymbol: GALLERO_LEGENDARIO_JACKPOT.triggerSymbol,
          triggerCount: GALLERO_LEGENDARIO_JACKPOT.triggerCount,
          positions,
        };
      }
    }

    return null;
  }

  private evaluatePayline(board: SymbolId[], line: number[]) {
    const symbols = line.map((row, column) => board[this.getBoardIndex(row, column)]);
    const targetSymbol = this.findPaylineTarget(symbols);
    const substitutionEvaluation = targetSymbol
      ? this.evaluateTargetPayline(symbols, line, targetSymbol)
      : null;
    const wildEvaluation = this.evaluateLeadingWildPayline(symbols, line);

    if (!substitutionEvaluation) {
      return wildEvaluation;
    }

    if (!wildEvaluation) {
      return substitutionEvaluation;
    }

    return this.getPaylinePayout(wildEvaluation.symbolId, wildEvaluation.matchCount) >
      this.getPaylinePayout(substitutionEvaluation.symbolId, substitutionEvaluation.matchCount)
      ? wildEvaluation
      : substitutionEvaluation;
  }

  private evaluateTargetPayline(symbols: SymbolId[], line: number[], targetSymbol: SymbolId) {
    const positions: number[] = [];

    for (let column = 0; column < symbols.length; column += 1) {
      const symbolId = symbols[column];
      const symbol = SYMBOLS[symbolId];

      if (!symbol || symbol.scatter) {
        break;
      }

      if (symbolId !== targetSymbol && !symbol.wild) {
        break;
      }

      positions.push(this.getBoardIndex(line[column], column));
    }

    return {
      symbolId: targetSymbol,
      matchCount: positions.length,
      positions,
    };
  }

  private evaluateLeadingWildPayline(symbols: SymbolId[], line: number[]) {
    const positions: number[] = [];

    for (let column = 0; column < symbols.length; column += 1) {
      if (!SYMBOLS[symbols[column]]?.wild) {
        break;
      }

      positions.push(this.getBoardIndex(line[column], column));
    }

    return positions.length >= 3
      ? {
          symbolId: "WILD",
          matchCount: positions.length,
          positions,
        }
      : null;
  }

  private getPaylinePayout(symbolId: SymbolId, matchCount: number): number {
    return SYMBOLS[symbolId]?.payouts[matchCount as 3 | 4 | 5] ?? 0;
  }

  private findPaylineTarget(symbols: SymbolId[]): SymbolId | null {
    for (const symbolId of symbols) {
      const symbol = SYMBOLS[symbolId];
      if (!symbol || symbol.scatter) {
        return null;
      }

      if (!symbol.wild) {
        return symbolId;
      }
    }

    return symbols.every((symbolId) => SYMBOLS[symbolId]?.wild) ? "WILD" : null;
  }

  private getBoardIndex(row: number, column: number): number {
    return row * this.columns + column;
  }

  private getMultiplier(tensionLevel: number): number {
    return Math.max(1, Math.min(this.maxCascades, tensionLevel));
  }

  private countSymbols(board: SymbolId[]): Map<SymbolId, number> {
    const counts = new Map<SymbolId, number>();
    for (const symbol of board) {
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
    return counts;
  }

  private createWeightedSymbols({ includeScatter = true } = {}): SymbolId[] {
    return SYMBOL_IDS.flatMap((symbolId) => {
      const symbol = SYMBOLS[symbolId];
      if (!includeScatter && symbol.scatter) {
        return [];
      }
      return Array.from({ length: symbol.weight }, () => symbolId);
    });
  }

  private pickWeightedSymbol(pool = this.weightedSymbols): SymbolId {
    const index = Math.min(pool.length - 1, Math.floor(this.rng() * pool.length));
    const symbol = pool[index];
    return symbol === "SCATTER" && this.rng() > 0.36
      ? this.pickWeightedSymbol(this.weightedBaseSymbols)
      : symbol;
  }
}
