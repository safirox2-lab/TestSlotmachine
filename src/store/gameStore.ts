import { create } from "zustand";
import { GAME_CONFIG } from "../config/game.config";
import type {
  DebugFeatureMode,
  DebugFeatureModes,
  DebugScenarioMode,
  DebugWinMode,
  DebugWinModes,
  GameStatus,
  JackpotDemoState,
} from "../types/game.types";

interface GameStoreState {
  status: GameStatus;
  spinBusy: boolean;
  balance: number;
  bet: number;
  roundNumber: number;
  lastWin: number;
  freeSpins: number;
  tensionLevel: number;
  jackpots: JackpotDemoState[];
  debugWinModes: DebugWinModes;
  debugFeatureModes: DebugFeatureModes;
  setStatus: (status: GameStatus) => void;
  setSpinBusy: (spinBusy: boolean) => void;
  setBalance: (balance: number) => void;
  setBet: (bet: number) => void;
  setRoundNumber: (roundNumber: number) => void;
  incrementRoundNumber: () => void;
  setWin: (lastWin: number) => void;
  setFreeSpins: (freeSpins: number) => void;
  setTensionLevel: (tensionLevel: number) => void;
  setJackpots: (jackpots: JackpotDemoState[]) => void;
  setDebugWinMode: (mode: DebugWinMode, enabled: boolean) => void;
  setDebugFeatureMode: (mode: DebugFeatureMode, enabled: boolean) => void;
  resetGame: () => void;
}

function createInitialDebugWinModes(): DebugWinModes {
  return {
    win: false,
    bigWin: false,
    jackpot: false,
    jackpotLegendario: false,
  };
}

function createInitialDebugFeatureModes(): DebugFeatureModes {
  return {
    scatter: false,
    wildNormal: false,
    wildComplete: false,
  };
}

function getActiveDebugWinMode(debugWinModes: DebugWinModes): DebugWinMode | null {
  if (debugWinModes.jackpotLegendario) {
    return "jackpotLegendario";
  }
  if (debugWinModes.jackpot) {
    return "jackpot";
  }
  if (debugWinModes.bigWin) {
    return "bigWin";
  }
  if (debugWinModes.win) {
    return "win";
  }
  return null;
}

export function getActiveDebugScenario({
  debugWinModes,
  debugFeatureModes,
}: {
  debugWinModes: DebugWinModes;
  debugFeatureModes: DebugFeatureModes;
}): DebugScenarioMode | null {
  return (
    getActiveDebugWinMode(debugWinModes) ??
    (debugFeatureModes.scatter ? "scatter" : null) ??
    (debugFeatureModes.wildComplete ? "wildComplete" : null) ??
    (debugFeatureModes.wildNormal ? "wildNormal" : null)
  );
}

const initialGameState = {
  status: GAME_CONFIG.stateMachine.initialStatus,
  spinBusy: false,
  balance: GAME_CONFIG.betting.initialBalance,
  bet: Number(GAME_CONFIG.betting.levels[0]),
  roundNumber: 0,
  lastWin: 0,
  freeSpins: 0,
  tensionLevel: 1,
  jackpots: [] as JackpotDemoState[],
  debugWinModes: createInitialDebugWinModes(),
  debugFeatureModes: createInitialDebugFeatureModes(),
};

export const useGameStore = create<GameStoreState>((set) => ({
  ...initialGameState,
  setStatus: (status) => set({ status }),
  setSpinBusy: (spinBusy) => set({ spinBusy }),
  setBalance: (balance) => set({ balance }),
  setBet: (bet) => set({ bet }),
  setRoundNumber: (roundNumber) => set({ roundNumber: Math.max(0, Math.trunc(roundNumber)) }),
  incrementRoundNumber: () =>
    set((state) => ({
      roundNumber: state.roundNumber + 1,
    })),
  setWin: (lastWin) => set({ lastWin }),
  setFreeSpins: (freeSpins) => set({ freeSpins }),
  setTensionLevel: (tensionLevel) => set({ tensionLevel }),
  setJackpots: (jackpots) => set({ jackpots }),
  setDebugWinMode: (mode, enabled) =>
    set((state) => ({
      debugWinModes: enabled
        ? {
            ...createInitialDebugWinModes(),
            [mode]: true,
          }
        : {
            ...state.debugWinModes,
            [mode]: false,
          },
      debugFeatureModes: enabled ? createInitialDebugFeatureModes() : state.debugFeatureModes,
    })),
  setDebugFeatureMode: (mode, enabled) =>
    set((state) => ({
      debugFeatureModes: enabled
        ? {
            ...createInitialDebugFeatureModes(),
            [mode]: true,
          }
        : {
            ...state.debugFeatureModes,
            [mode]: false,
          },
      debugWinModes: enabled ? createInitialDebugWinModes() : state.debugWinModes,
    })),
  resetGame: () =>
    set({
      ...initialGameState,
      debugWinModes: createInitialDebugWinModes(),
      debugFeatureModes: createInitialDebugFeatureModes(),
    }),
}));
