import { describe, expect, it } from "vitest";
import {
  detectDevicePerformanceClass,
  getAdaptiveCanvasResolution,
  getDeviceClassMaxDevicePixelRatio,
} from "./deviceQuality";

describe("device performance quality", () => {
  it("classifies low memory or low core devices as low performance", () => {
    expect(detectDevicePerformanceClass({ deviceMemory: 2, hardwareConcurrency: 8 })).toBe("low");
    expect(detectDevicePerformanceClass({ deviceMemory: 8, hardwareConcurrency: 4 })).toBe("low");
  });

  it("classifies common 3GB to 4GB mobile devices as mid performance", () => {
    expect(detectDevicePerformanceClass({ deviceMemory: 4, hardwareConcurrency: 8 })).toBe("mid");
    expect(detectDevicePerformanceClass({ deviceMemory: 8, hardwareConcurrency: 6 })).toBe("mid");
  });

  it("keeps high-end devices on the configured renderer ceiling", () => {
    expect(detectDevicePerformanceClass({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe("high");
    expect(getDeviceClassMaxDevicePixelRatio("high", 3)).toBe(3);
  });

  it("caps canvas resolution aggressively for low and mid performance classes", () => {
    expect(getDeviceClassMaxDevicePixelRatio("low", 3)).toBe(1.5);
    expect(getDeviceClassMaxDevicePixelRatio("mid", 3)).toBe(2);
    expect(
      getAdaptiveCanvasResolution({
        devicePixelRatio: 3,
        maxDevicePixelRatio: 3,
        performanceClass: "low",
      }),
    ).toBe(1.5);
    expect(
      getAdaptiveCanvasResolution({
        devicePixelRatio: 3,
        maxDevicePixelRatio: 3,
        performanceClass: "mid",
      }),
    ).toBe(2);
  });
});
