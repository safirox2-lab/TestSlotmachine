import type { AudioEventId } from "./asset.types";

export type GameStatus =
  | "loading"
  | "idle"
  | "playing"
  | "spinning"
  | "stopping"
  | "evaluating"
  | "win"
  | "bigWin"
  | "megaWin"
  | "freeSpins"
  | "bonus"
  | "error";

export type DebugWinMode = "win" | "bigWin" | "jackpot" | "jackpotLegendario";
export type DebugWinModes = Record<DebugWinMode, boolean>;
export type DebugFeatureMode = "scatter" | "wildNormal" | "wildComplete";
export type DebugFeatureModes = Record<DebugFeatureMode, boolean>;
export type DebugScenarioMode = DebugWinMode | DebugFeatureMode;

export type SymbolId = string;

export interface WinningSymbol {
  symbolId: SymbolId;
  count: number;
  line: number;
  positions: number[];
  amount: number;
}

export interface JackpotAward {
  id: string;
  label: string;
  amount: number;
  triggerSymbol: SymbolId;
  triggerCount: number;
  positions: number[];
}

export interface SpinStep {
  cascade: number;
  board: SymbolId[];
  multiplier: number;
  tensionLevel: number;
  win: number;
  winningSymbols: WinningSymbol[];
  winningIndices: number[];
  freeSpinsAwarded: number;
  jackpotAward: JackpotAward | null;
}

export interface SpinResult {
  board: SymbolId[];
  totalWin: number;
  freeSpinsAwarded: number;
  nextTension: number;
  steps: SpinStep[];
  jackpotAward: JackpotAward | null;
  source?: "server" | "local-demo";
  signed?: boolean;
}

export type GridEffectEventType =
  | "wildExpandVisual"
  | "scatterTease"
  | "nearMiss"
  | "freeSpinAward"
  | "paylineTrace"
  | "coinPop"
  | "reelLock"
  | "cascadeImpact"
  | "cascadeChain"
  | "bigWinGridPulse";

export interface GridEffectEvent {
  type: GridEffectEventType;
  cascade: number;
  indices?: number[];
  columns?: number[];
  amount?: number;
  audioEvent?: AudioEventId;
}

export interface JackpotDemoState {
  tier: string;
  value: number;
}
