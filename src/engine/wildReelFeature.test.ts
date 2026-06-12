import { describe, expect, it } from "vitest";
import type { SymbolId } from "../types/game.types";
import {
  selectWildDramaColumn,
  WILD_REEL_CLEAR_DURATION_MS,
  WILD_REEL_FEATURE_COLUMNS,
  WILD_REEL_SEQUENCE_ASPECT_RATIO,
  WILD_REEL_SEQUENCE_DURATION_MS,
  WILD_REEL_SEQUENCE_SOUND_EVENT,
  WILD_REEL_SEQUENCE_START_DELAY_MS,
  WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS,
  WILD_SYMBOL_TEXT_OFFSET_Y,
} from "./wildReelFeature";

const emptyBoard = Array.from({ length: 20 }, () => "MONEDA") as SymbolId[];

describe("wild reel feature", () => {
  it("does not hold a reel when the landing board has no WILD", () => {
    expect(selectWildDramaColumn(emptyBoard, () => 0)).toBeNull();
  });

  it("chooses the dramatic hold only among reels 3, 4, and 5", () => {
    const boardWithWild = [...emptyBoard];
    boardWithWild[0] = "WILD";

    expect(WILD_REEL_FEATURE_COLUMNS).toEqual([2, 3, 4]);
    expect(selectWildDramaColumn(boardWithWild, () => 0)).toBe(2);
    expect(selectWildDramaColumn(boardWithWild, () => 0.34)).toBe(3);
    expect(selectWildDramaColumn(boardWithWild, () => 0.99)).toBe(4);
  });

  it("describes the WILD sequence timing without binding to raw frames", () => {
    expect(WILD_REEL_SEQUENCE_DURATION_MS).toBe(10005);
    expect(WILD_REEL_SEQUENCE_START_DELAY_MS).toBe(500);
    expect(WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS).toBe(9505);
    expect(WILD_REEL_SEQUENCE_ASPECT_RATIO).toBeCloseTo(720 / 1280, 5);
    expect(WILD_REEL_CLEAR_DURATION_MS).toBe(320);
    expect(WILD_REEL_SEQUENCE_SOUND_EVENT).toBe("wildExpand");
  });

  it("keeps the composed WILD symbol text offset as a plug-in hook", () => {
    expect(WILD_SYMBOL_TEXT_OFFSET_Y).toBe(26);
  });
});
