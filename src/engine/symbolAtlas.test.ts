import { describe, expect, it } from "vitest";
import { collectSymbolAnimationFrames } from "./symbolAtlas";

describe("symbol atlas animation matching", () => {
  it("collects exact symbol frame sequences without stealing similarly named symbols", () => {
    const frames = collectSymbolAnimationFrames(
      [
        ["output_spin_slots_169x189/tipo1_001.png", "tipo1-frame"],
        ["output_spin_slots_169x189/tipo_003.png", "tipo-frame-3"],
        ["output_spin_slots_169x189/tipo_001.png", "tipo-frame-1"],
        ["output_spin_slots_169x189/tipo_002.png", "tipo-frame-2"],
      ],
      "tipo",
    );

    expect(frames).toEqual(["tipo-frame-1", "tipo-frame-2", "tipo-frame-3"]);
  });

  it("sorts special atlas names by their visible animation frame suffix", () => {
    const frames = collectSymbolAnimationFrames(
      [
        ["output_spin_slots_169x189/gallow_0007_w3.png", "wild-frame-3"],
        ["output_spin_slots_169x189/gallow_0009_w1.png", "wild-frame-1"],
        ["output_spin_slots_169x189/gallow_0008_w2.png", "wild-frame-2"],
      ],
      "gallow",
    );

    expect(frames).toEqual(["wild-frame-1", "wild-frame-2", "wild-frame-3"]);
  });

  it("sorts Delivery Capa sequences by exported frame number, not layer suffix", () => {
    const frames = collectSymbolAnimationFrames(
      [
        ["delivery/symbols/casco/casco_0009_capa-11.png", "frame-9"],
        ["delivery/symbols/casco/casco_0000_capa-2.png", "frame-0"],
        ["delivery/symbols/casco/casco_0001_capa-3.png", "frame-1"],
      ],
      "casco",
    );

    expect(frames).toEqual(["frame-0", "frame-1", "frame-9"]);
  });
});
