// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingOverlay } from "./LoadingOverlay";

describe("LoadingOverlay", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it("continues the loading bar sequence during rapid progress updates", () => {
    const onComplete = vi.fn();

    act(() => {
      root.render(
        <LoadingOverlay
          runtimeReady={false}
          runtimeError={null}
          loadingProgress={1}
          onComplete={onComplete}
        />,
      );
    });
    act(() => {
      vi.advanceTimersByTime(2200);
    });

    for (const progress of [10, 20, 30]) {
      act(() => {
        root.render(
          <LoadingOverlay
            runtimeReady={false}
            runtimeError={null}
            loadingProgress={progress}
            onComplete={onComplete}
          />,
        );
        vi.advanceTimersByTime(50);
      });
    }

    const bar = container.querySelector<HTMLElement>(".game-loading__bar");
    const currentProgress = Number(bar?.getAttribute("aria-valuenow"));
    expect(bar?.getAttribute("role")).toBe("progressbar");
    expect(currentProgress).toBeGreaterThan(1);
    expect(currentProgress).toBeLessThanOrEqual(30);
    expect(bar?.querySelector("span")).not.toBeNull();
    expect(container.querySelector(".game-loading__bar img")).not.toBeNull();
    expect(container.querySelector(".game-loading__brand-logo-img")).not.toBeNull();
  });
});
