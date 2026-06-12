import { describe, expect, it } from "vitest";
import {
  getCriticalTextureBatchSize,
  loadCriticalAssetsInBatches,
  runCriticalAssetPreloadTasks,
  SAFARI_CRITICAL_TEXTURE_BATCH_SIZE,
} from "./criticalTextureLoader";

describe("criticalTextureLoader", () => {
  it("uses 50-image batches for iPhone Safari", () => {
    const iphoneSafariUserAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

    expect(getCriticalTextureBatchSize(iphoneSafariUserAgent)).toBe(
      SAFARI_CRITICAL_TEXTURE_BATCH_SIZE,
    );
  });

  it("loads critical images in batches without starting more than 50 at once", async () => {
    const paths = Array.from({ length: 120 }, (_, index) => `/raw/test/frame_${index}.png`);
    let activeLoads = 0;
    let maxActiveLoads = 0;

    const textures = await loadCriticalAssetsInBatches(paths, async (path) => {
      activeLoads += 1;
      maxActiveLoads = Math.max(maxActiveLoads, activeLoads);
      await Promise.resolve();
      activeLoads -= 1;
      return path;
    });

    expect(textures).toEqual(paths);
    expect(maxActiveLoads).toBeLessThanOrEqual(SAFARI_CRITICAL_TEXTURE_BATCH_SIZE);
  });

  it("runs Safari preload groups sequentially so critical batches do not stack", async () => {
    const startedTasks: string[] = [];
    const releaseFirstTask: Array<() => void> = [];

    const preload = runCriticalAssetPreloadTasks(
      [
        () =>
          new Promise<void>((resolve) => {
            startedTasks.push("big-win");
            releaseFirstTask.push(resolve);
          }),
        async () => {
          startedTasks.push("wild");
        },
      ],
      { batchSize: SAFARI_CRITICAL_TEXTURE_BATCH_SIZE },
    );

    await Promise.resolve();
    expect(startedTasks).toEqual(["big-win"]);

    releaseFirstTask[0]?.();
    await preload;
    expect(startedTasks).toEqual(["big-win", "wild"]);
  });
});
