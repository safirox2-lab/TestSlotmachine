import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config/game.config";
import {
  BIG_WIN_SEQUENCE_DURATION_MS,
  BIG_WIN_SEQUENCE_FPS,
  BIG_WIN_SEQUENCE_FRAME_COUNT,
  formatCelebrationAmount,
  getSpinWinStatus,
  getWinCelebrationTier,
  JACKPOT_SEQUENCE_DURATION_MS,
  JACKPOT_SEQUENCE_FADE_OUT_MS,
  JACKPOT_SEQUENCE_FPS,
  JACKPOT_SEQUENCE_FRAME_COUNT,
  JACKPOT_SEQUENCE_HOLD_MS,
  JACKPOT_SEQUENCE_START_DELAY_MS,
  LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS,
  LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS,
  LEGENDARY_JACKPOT_SEQUENCE_FRAME_COUNT,
  LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS,
  LEGENDARY_JACKPOT_SOUND_DELAY_MS,
  WIN_CELEBRATION_CONFETTI_COLORS,
  WIN_CELEBRATION_DURATIONS_MS,
} from "./winCelebrationEffects";

describe("winCelebrationEffects", () => {
  it("maps spin totals into real game statuses", () => {
    expect(getSpinWinStatus(0, 10)).toBe("idle");
    expect(getSpinWinStatus(80, 10)).toBe("win");
    expect(getSpinWinStatus(199, 10)).toBe("win");
    expect(getSpinWinStatus(200, 10)).toBe("bigWin");
    expect(getSpinWinStatus(499, 10)).toBe("bigWin");
    expect(getSpinWinStatus(500, 10)).toBe("megaWin");
  });

  it("resolves celebration tiers from state, amount, and bet", () => {
    expect(getWinCelebrationTier({ status: "idle", lastWin: 0, bet: 10 })).toBeNull();
    expect(getWinCelebrationTier({ status: "idle", lastWin: 500, bet: 10 })).toBeNull();
    expect(getWinCelebrationTier({ status: "win", lastWin: 80, bet: 10 })).toBe("win");
    expect(getWinCelebrationTier({ status: "win", lastWin: 199, bet: 10 })).toBe("win");
    expect(getWinCelebrationTier({ status: "win", lastWin: 220, bet: 10 })).toBe("bigWin");
    expect(getWinCelebrationTier({ status: "win", lastWin: 499, bet: 10 })).toBe("bigWin");
    expect(getWinCelebrationTier({ status: "win", lastWin: 500, bet: 10 })).toBe("jackpot");
    expect(getWinCelebrationTier({ status: "bigWin", lastWin: 180, bet: 10 })).toBe("bigWin");
    expect(getWinCelebrationTier({ status: "megaWin", lastWin: 250000, bet: 10 })).toBe("jackpot");
  });

  it("documents the production assumption that configured betting levels are positive", () => {
    expect(GAME_CONFIG.betting.levels.every((level) => level > 0)).toBe(true);
  });

  it("formats win amounts for the Spanish/Venezuelan UI", () => {
    expect(formatCelebrationAmount(8750)).toBe("8.750");
    expect(formatCelebrationAmount(250000)).toBe("250.000");
  });

  it("keeps approved celebration duration ranges", () => {
    expect(WIN_CELEBRATION_DURATIONS_MS.win).toBe(2300);
    expect(WIN_CELEBRATION_DURATIONS_MS.bigWin).toBe(4125);
    expect(WIN_CELEBRATION_DURATIONS_MS.jackpot).toBe(4188);
  });

  it("keeps the Big Win placeholder timing at 24 fps", () => {
    expect(BIG_WIN_SEQUENCE_FRAME_COUNT).toBe(99);
    expect(BIG_WIN_SEQUENCE_FPS).toBe(24);
    expect(BIG_WIN_SEQUENCE_DURATION_MS).toBe(4125);
    expect(BIG_WIN_SEQUENCE_DURATION_MS).toBe(
      Math.round((BIG_WIN_SEQUENCE_FRAME_COUNT / BIG_WIN_SEQUENCE_FPS) * 1000),
    );
  });

  it("keeps the Jackpot placeholder timing at 24 fps", () => {
    expect(JACKPOT_SEQUENCE_FRAME_COUNT).toBe(41);
    expect(JACKPOT_SEQUENCE_FPS).toBe(24);
    expect(JACKPOT_SEQUENCE_START_DELAY_MS).toBe(120);
    expect(JACKPOT_SEQUENCE_HOLD_MS).toBe(2000);
    expect(JACKPOT_SEQUENCE_FADE_OUT_MS).toBe(360);
    expect(JACKPOT_SEQUENCE_DURATION_MS).toBe(1708);
    expect(JACKPOT_SEQUENCE_DURATION_MS).toBe(
      Math.round((JACKPOT_SEQUENCE_FRAME_COUNT / JACKPOT_SEQUENCE_FPS) * 1000),
    );
    expect(WIN_CELEBRATION_DURATIONS_MS.jackpot).toBe(
      JACKPOT_SEQUENCE_START_DELAY_MS +
        JACKPOT_SEQUENCE_DURATION_MS +
        JACKPOT_SEQUENCE_HOLD_MS +
        JACKPOT_SEQUENCE_FADE_OUT_MS,
    );
  });

  it("keeps the legendary jackpot timing synced to its sound hook", () => {
    expect(LEGENDARY_JACKPOT_SEQUENCE_FRAME_COUNT).toBe(80);
    expect(LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS).toBe(3776);
    expect(LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS).toBe(2000);
    expect(LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS).toBe(1200);
    expect(LEGENDARY_JACKPOT_SOUND_DELAY_MS).toBe(400);
  });

  it("keeps approved celebration confetti colors", () => {
    expect(WIN_CELEBRATION_CONFETTI_COLORS).toEqual([
      0xffd36a, 0xfff0a3, 0xffb21f, 0xed254e, 0xb91116, 0xff7a18,
    ]);
  });
});
