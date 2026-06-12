export type DevicePerformanceClass = "low" | "mid" | "high";

export interface DevicePerformanceHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface AdaptiveCanvasResolutionInput {
  devicePixelRatio: number;
  maxDevicePixelRatio: number;
  performanceClass: DevicePerformanceClass;
}

const LOW_DEVICE_PIXEL_RATIO_LIMIT = 1.5;
const MID_DEVICE_PIXEL_RATIO_LIMIT = 2;

export function detectDevicePerformanceClass({
  deviceMemory,
  hardwareConcurrency,
}: DevicePerformanceHints): DevicePerformanceClass {
  if (
    (Number.isFinite(deviceMemory) && Number(deviceMemory) <= 2) ||
    (Number.isFinite(hardwareConcurrency) && Number(hardwareConcurrency) <= 4)
  ) {
    return "low";
  }

  if (
    (Number.isFinite(deviceMemory) && Number(deviceMemory) <= 4) ||
    (Number.isFinite(hardwareConcurrency) && Number(hardwareConcurrency) <= 6)
  ) {
    return "mid";
  }

  return "high";
}

export function getBrowserDevicePerformanceClass(): DevicePerformanceClass {
  if (typeof navigator === "undefined") {
    return "high";
  }

  const browserNavigator = navigator as Navigator & DevicePerformanceHints;
  return detectDevicePerformanceClass({
    deviceMemory: browserNavigator.deviceMemory,
    hardwareConcurrency: browserNavigator.hardwareConcurrency,
  });
}

export function getDeviceClassMaxDevicePixelRatio(
  performanceClass: DevicePerformanceClass,
  configuredMaxDevicePixelRatio: number,
): number {
  const configuredLimit = Math.max(1, configuredMaxDevicePixelRatio);
  if (performanceClass === "low") {
    return Math.min(configuredLimit, LOW_DEVICE_PIXEL_RATIO_LIMIT);
  }
  if (performanceClass === "mid") {
    return Math.min(configuredLimit, MID_DEVICE_PIXEL_RATIO_LIMIT);
  }
  return configuredLimit;
}

export function getAdaptiveCanvasResolution({
  devicePixelRatio,
  maxDevicePixelRatio,
  performanceClass,
}: AdaptiveCanvasResolutionInput): number {
  const resolvedDevicePixelRatio = Math.max(1, devicePixelRatio || 1);
  return Math.min(
    resolvedDevicePixelRatio,
    getDeviceClassMaxDevicePixelRatio(performanceClass, maxDevicePixelRatio),
  );
}
