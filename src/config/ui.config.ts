export const UI_CONFIG = {
  design: {
    width: 1080,
    height: 1920,
  },
  layout: {
    safeAreaAware: true,
    supportedOrientations: ["portrait", "landscape"],
    touchTargetMinPx: 44,
  },
  canvas: {
    responsive: true,
    maxDevicePixelRatio: 3,
    fitMode: "mobilePortraitFill",
  },
} as const;
