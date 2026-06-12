import { describe, expect, it } from "vitest";
import { useUiStore } from "./uiStore";

describe("uiStore", () => {
  it("keeps loading progress monotonic and clamped during a boot sequence", () => {
    const store = useUiStore.getState();
    store.resetUi();

    store.setLoadingProgress(58);
    store.setLoadingProgress(55);
    store.setLoadingProgress(140);

    expect(useUiStore.getState().loadingProgress).toBe(100);

    store.resetUi();
    expect(useUiStore.getState().loadingProgress).toBe(0);
  });
});
