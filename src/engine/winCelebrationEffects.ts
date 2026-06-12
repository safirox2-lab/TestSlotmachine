import type { GameStatus } from "../types/game.types";

export type WinCelebrationTier = "win" | "bigWin" | "jackpot";

const WIN_CELEBRATION_THRESHOLDS = {
  bigWinMultiplier: 20,
  jackpotMultiplier: 50,
} as const;

export const BIG_WIN_SEQUENCE_FRAME_COUNT = 99;
export const BIG_WIN_SEQUENCE_FPS = 24;
export const BIG_WIN_SEQUENCE_DURATION_MS = Math.round(
  (BIG_WIN_SEQUENCE_FRAME_COUNT / BIG_WIN_SEQUENCE_FPS) * 1000,
);
export const JACKPOT_SEQUENCE_FRAME_COUNT = 41;
export const JACKPOT_SEQUENCE_FPS = 24;
export const JACKPOT_SEQUENCE_DURATION_MS = Math.round(
  (JACKPOT_SEQUENCE_FRAME_COUNT / JACKPOT_SEQUENCE_FPS) * 1000,
);
export const JACKPOT_SEQUENCE_START_DELAY_MS = 120;
export const JACKPOT_SEQUENCE_HOLD_MS = 2000;
export const JACKPOT_SEQUENCE_FADE_OUT_MS = 360;
export const LEGENDARY_JACKPOT_SEQUENCE_FRAME_COUNT = 80;
export const LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS = 3776;
export const LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS = 2000;
export const LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS = 1200;
export const LEGENDARY_JACKPOT_SOUND_DELAY_MS = 400;

export const WIN_CELEBRATION_DURATIONS_MS: Record<WinCelebrationTier, number> = {
  win: 2300,
  bigWin: BIG_WIN_SEQUENCE_DURATION_MS,
  jackpot:
    JACKPOT_SEQUENCE_START_DELAY_MS +
    JACKPOT_SEQUENCE_DURATION_MS +
    JACKPOT_SEQUENCE_HOLD_MS +
    JACKPOT_SEQUENCE_FADE_OUT_MS,
};

export const WIN_CELEBRATION_CONFETTI_COLORS = [
  0xffd36a, 0xfff0a3, 0xffb21f, 0xed254e, 0xb91116, 0xff7a18,
] as const;

export function getSpinWinStatus(totalWin: number, bet: number): GameStatus {
  if (totalWin <= 0) {
    return "idle";
  }
  if (totalWin >= bet * WIN_CELEBRATION_THRESHOLDS.jackpotMultiplier) {
    return "megaWin";
  }
  if (totalWin >= bet * WIN_CELEBRATION_THRESHOLDS.bigWinMultiplier) {
    return "bigWin";
  }
  return "win";
}

export function getWinCelebrationTier(input: {
  status: GameStatus;
  lastWin: number;
  bet: number;
}): WinCelebrationTier | null {
  if (input.lastWin <= 0) {
    return null;
  }
  if (input.status === "megaWin") {
    return "jackpot";
  }
  if (input.status === "bigWin") {
    return "bigWin";
  }
  if (input.status === "win") {
    if (input.lastWin >= input.bet * WIN_CELEBRATION_THRESHOLDS.jackpotMultiplier) {
      return "jackpot";
    }
    if (input.lastWin >= input.bet * WIN_CELEBRATION_THRESHOLDS.bigWinMultiplier) {
      return "bigWin";
    }
    return "win";
  }
  return null;
}

export function formatCelebrationAmount(amount: number): string {
  return Math.round(amount).toLocaleString("es-VE");
}
