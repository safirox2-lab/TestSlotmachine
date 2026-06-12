import { describe, expect, it } from "vitest";
import {
  getDeliveryFrameNumber,
  getFitWithinCanvas,
  normalizeDeliveryAssetName,
} from "./generate-delivery-atlases";

describe("Delivery atlas generation helpers", () => {
  it("normalizes source asset names into stable public ids", () => {
    expect(normalizeDeliveryAssetName("D Wild")).toBe("dwild");
    expect(normalizeDeliveryAssetName("Papas fritas")).toBe("papas");
    expect(normalizeDeliveryAssetName("LoadingLoading 10.png")).toBe("loading_loading_10");
  });

  it("extracts Delivery frame numbers before Capa layer suffixes", () => {
    expect(getDeliveryFrameNumber("Casco_0009_Capa-11.png")).toBe(9);
    expect(getDeliveryFrameNumber("Cronometro_0010_10.png")).toBe(10);
    expect(getDeliveryFrameNumber("LoadingLoading 7.png")).toBe(7);
  });

  it("fits reel symbols inside the 106px cell while preserving aspect ratio", () => {
    expect(getFitWithinCanvas({ width: 350, height: 253 }, { size: 106, padding: 6 })).toEqual({
      width: 94,
      height: 68,
      left: 6,
      top: 19,
    });
  });
});
