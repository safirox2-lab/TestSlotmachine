import type { ViewportMode } from "../store/uiStore";

export interface ViewportSize {
  width: number;
  height: number;
}

export function getViewportMode({ width, height }: ViewportSize): ViewportMode {
  return width > height ? "landscape" : "portrait";
}
