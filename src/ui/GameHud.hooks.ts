import type { CSSProperties, RefObject } from "react";
import { useEffect, useState } from "react";
import { computeDesignViewport } from "../utils/designViewport";
import { computeLayoutViewportOffset, readLayoutViewportSize } from "../utils/layoutViewport";
import { type AtlasPreviewFrame, DESIGN_HEIGHT, DESIGN_WIDTH } from "./GameHud.shared";
import type { PaytableItem } from "./paytable";

export function useDesignLayerStyle(
  containerRef: RefObject<HTMLElement | null>,
  animationsEnabled: boolean,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>(
    () =>
      ({
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        transform: "translate(0px, 0px) scale(1)",
        "--hud-animations-enabled": 1,
        "--hud-button-counter-scale-x": 1,
        "--hud-button-counter-scale-y": 1,
      }) as CSSProperties,
  );

  useEffect(() => {
    const update = () => {
      const bounds = containerRef.current?.getBoundingClientRect();
      const width = Math.max(1, Math.floor(bounds?.width ?? window.innerWidth));
      const height = Math.max(1, Math.floor(bounds?.height ?? window.innerHeight));
      const layoutViewport = readLayoutViewportSize(width, height);
      const layoutOffset = computeLayoutViewportOffset({
        viewportWidth: width,
        viewportHeight: height,
        layoutViewportWidth: layoutViewport.width,
        layoutViewportHeight: layoutViewport.height,
      });
      const viewport = computeDesignViewport({
        viewportWidth: layoutViewport.width,
        viewportHeight: layoutViewport.height,
        designWidth: DESIGN_WIDTH,
        designHeight: DESIGN_HEIGHT,
        fitMode: "mobilePortraitFill",
      });
      setStyle({
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        transform: `translate(${viewport.offsetX + layoutOffset.x}px, ${
          viewport.offsetY + layoutOffset.y
        }px) scale(${viewport.scaleX}, ${viewport.scaleY})`,
        "--hud-animations-enabled": animationsEnabled ? 1 : 0,
        "--hud-button-counter-scale-x": 1,
        "--hud-button-counter-scale-y": viewport.scaleY > 0 ? viewport.scaleX / viewport.scaleY : 1,
      } as CSSProperties);
    };

    update();
    const resizeObserver =
      containerRef.current && typeof ResizeObserver === "function"
        ? new ResizeObserver(update)
        : null;
    if (containerRef.current) {
      resizeObserver?.observe(containerRef.current);
    }
    window.addEventListener("resize", update, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [animationsEnabled, containerRef]);

  return style;
}

export function useFpsCounter(enabled: boolean): number {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setFps(0);
      return undefined;
    }

    let frameId = 0;
    let frames = 0;
    let lastSample = performance.now();

    const tick = (timestamp: number) => {
      frames += 1;
      const elapsed = timestamp - lastSample;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        lastSample = timestamp;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [enabled]);

  return fps;
}

export function useSymbolPreviewFrames(_items: PaytableItem[]): Record<string, AtlasPreviewFrame> {
  return {};
}

export function formatLocalTime(date = new Date()): string {
  return new Intl.DateTimeFormat("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function isLikelyMobileInput(): boolean {
  return window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth <= 860;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
