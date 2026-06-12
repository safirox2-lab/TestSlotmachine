export interface DesignViewportInput {
  viewportWidth: number;
  viewportHeight: number;
  designWidth: number;
  designHeight: number;
  fitMode?: "contain" | "mobilePortraitFill";
}

export interface DesignViewportTransform {
  viewportWidth: number;
  viewportHeight: number;
  designWidth: number;
  designHeight: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  isPortrait: boolean;
  isMobilePortraitFill: boolean;
}

export function computeDesignViewport({
  viewportWidth,
  viewportHeight,
  designWidth,
  designHeight,
  fitMode = "contain",
}: DesignViewportInput): DesignViewportTransform {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const baseScale = Math.min(width / designWidth, height / designHeight);
  const isPortrait = height >= width;
  const viewportAspect = width / height;
  const designAspect = designWidth / designHeight;
  const shouldFillMobileHeight =
    fitMode === "mobilePortraitFill" && isPortrait && viewportAspect < designAspect;

  if (shouldFillMobileHeight) {
    return {
      viewportWidth: width,
      viewportHeight: height,
      designWidth,
      designHeight,
      scaleX: width / designWidth,
      scaleY: height / designHeight,
      offsetX: 0,
      offsetY: 0,
      isPortrait,
      isMobilePortraitFill: true,
    };
  }

  return {
    viewportWidth: width,
    viewportHeight: height,
    designWidth,
    designHeight,
    scaleX: baseScale,
    scaleY: baseScale,
    offsetX: (width - designWidth * baseScale) / 2,
    offsetY: (height - designHeight * baseScale) / 2,
    isPortrait,
    isMobilePortraitFill: false,
  };
}
