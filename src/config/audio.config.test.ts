import { describe, expect, it } from "vitest";
import { AUDIO_CONFIG } from "./audio.config";

const GRID_AUDIO_EVENTS = [
  "wildExpand",
  "wildSymbol",
  "scatterTease",
  "paylineTrace",
  "coinPop",
  "cascadeImpact",
  "cascadeChain",
  "freeSpinAward",
  "nearMiss",
  "gridPulse",
] as const;

const REEL_STOP_AUDIO_EVENTS = [
  "reelStop1",
  "reelStop2",
  "reelStop3",
  "reelStop4",
  "reelStop5",
] as const;

const SLOT_LOSE_AUDIO_EVENTS = ["slotLose1", "slotLose2"] as const;

describe("audio configuration", () => {
  it("publishes grid effect audio events as stable runtime ids", () => {
    expect(AUDIO_CONFIG.events).toEqual(expect.arrayContaining([...GRID_AUDIO_EVENTS]));
    expect(AUDIO_CONFIG.events).not.toEqual(
      expect.arrayContaining(["mediumWin", "scatterLand", "freeSpins"]),
    );
  });

  it("publishes progressive reel stop audio events as stable runtime ids", () => {
    expect(AUDIO_CONFIG.events).toEqual(expect.arrayContaining([...REEL_STOP_AUDIO_EVENTS]));
  });

  it("publishes slot lose audio events as stable runtime ids", () => {
    expect(AUDIO_CONFIG.events).toEqual(expect.arrayContaining([...SLOT_LOSE_AUDIO_EVENTS]));
  });

  it("publishes the continuous slot reel audio event as a stable runtime id", () => {
    expect(AUDIO_CONFIG.events).toContain("slotReel");
  });

  it("publishes the Gallero Legendario jackpot audio event as a stable runtime id", () => {
    expect(AUDIO_CONFIG.events).toContain("legendaryJackpot");
  });

  it("advertises wav and mp3 as active browser runtime formats", () => {
    expect(AUDIO_CONFIG.runtimeFormats).toContain("wav");
    expect(AUDIO_CONFIG.runtimeFormats).toContain("mp3");
  });
});
