export const SAFARI_CRITICAL_TEXTURE_BATCH_SIZE = 50;

type AssetLoader<T> = (path: string) => Promise<T>;
type CriticalPreloadTask = () => Promise<unknown>;

interface CriticalAssetBatchOptions {
  batchSize?: number;
  yieldBetweenBatches?: () => Promise<void>;
}

interface CriticalAssetPreloadOptions {
  batchSize: number;
  onProgress?: (loaded: number, total: number) => void;
}

function getNavigatorUserAgent(): string {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

function isAppleMobileWebKit(userAgent: string): boolean {
  return /\b(iPhone|iPad|iPod)\b/i.test(userAgent) && /AppleWebKit/i.test(userAgent);
}

function isSafari(userAgent: string): boolean {
  return /Safari/i.test(userAgent) && !/(Android|Chrome|Chromium|Edg|OPR|Firefox)/i.test(userAgent);
}

export function getCriticalTextureBatchSize(userAgent: string = getNavigatorUserAgent()): number {
  return isAppleMobileWebKit(userAgent) || isSafari(userAgent)
    ? SAFARI_CRITICAL_TEXTURE_BATCH_SIZE
    : Number.POSITIVE_INFINITY;
}

function normalizeBatchSize(batchSize: number | undefined, itemCount: number): number {
  if (batchSize === undefined) {
    return SAFARI_CRITICAL_TEXTURE_BATCH_SIZE;
  }

  if (!Number.isFinite(batchSize)) {
    return Math.max(1, itemCount);
  }

  return Math.max(1, Math.floor(batchSize));
}

function waitForNextBrowserTurn(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

export async function loadCriticalAssetsInBatches<T>(
  paths: readonly string[],
  load: AssetLoader<T>,
  options: CriticalAssetBatchOptions = {},
): Promise<T[]> {
  if (paths.length === 0) {
    return [];
  }

  const batchSize = normalizeBatchSize(options.batchSize, paths.length);
  const yieldBetweenBatches = options.yieldBetweenBatches ?? waitForNextBrowserTurn;
  const loadedAssets: T[] = [];

  for (let start = 0; start < paths.length; start += batchSize) {
    const batch = paths.slice(start, start + batchSize);
    loadedAssets.push(...(await Promise.all(batch.map((path) => load(path)))));

    if (start + batchSize < paths.length) {
      await yieldBetweenBatches();
    }
  }

  return loadedAssets;
}

export async function runCriticalAssetPreloadTasks(
  tasks: readonly CriticalPreloadTask[],
  options: CriticalAssetPreloadOptions,
): Promise<void> {
  let loaded = 0;
  const runTask = async (task: CriticalPreloadTask) => {
    await task();
    loaded += 1;
    options.onProgress?.(loaded, tasks.length);
  };

  if (Number.isFinite(options.batchSize)) {
    for (const task of tasks) {
      await runTask(task);
    }
    return;
  }

  await Promise.all(tasks.map((task) => runTask(task)));
}
