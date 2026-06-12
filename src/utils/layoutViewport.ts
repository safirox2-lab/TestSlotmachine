export interface LayoutViewportSize {
  width: number;
  height: number;
}

export interface LayoutViewportOffset {
  x: number;
  y: number;
}

const MOBILE_PORTRAIT_LAYOUT_ASPECT_RATIO = 9 / 16;

function readRootPixelVariable(name: string, fallback: number): number {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.getComputedStyle !== "function"
  ) {
    return fallback;
  }

  const style = window.getComputedStyle(document.documentElement);
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function computeMobilePortraitLayoutViewport(size: LayoutViewportSize): LayoutViewportSize {
  const viewportWidth = Math.max(1, Math.floor(size.width));
  const viewportHeight = Math.max(1, Math.floor(size.height));
  const heightFromWidth = viewportWidth / MOBILE_PORTRAIT_LAYOUT_ASPECT_RATIO;

  if (heightFromWidth <= viewportHeight) {
    return {
      width: viewportWidth,
      height: heightFromWidth,
    };
  }

  const widthFromHeight = viewportHeight * MOBILE_PORTRAIT_LAYOUT_ASPECT_RATIO;
  return {
    width: Math.max(1, widthFromHeight),
    height: viewportHeight,
  };
}

export function readLayoutViewportSize(
  fallbackWidth: number,
  fallbackHeight: number,
): LayoutViewportSize {
  return {
    width: readRootPixelVariable("--elgallero-layout-viewport-width", fallbackWidth),
    height: readRootPixelVariable("--elgallero-layout-viewport-height", fallbackHeight),
  };
}

export function computeLayoutViewportOffset(input: {
  viewportWidth: number;
  viewportHeight: number;
  layoutViewportWidth: number;
  layoutViewportHeight: number;
}): LayoutViewportOffset {
  return {
    x: Math.max(0, (input.viewportWidth - input.layoutViewportWidth) / 2),
    y: Math.max(0, (input.viewportHeight - input.layoutViewportHeight) / 2),
  };
}
