import { create } from "zustand";

export type ViewportMode = "portrait" | "landscape";

interface UiStoreState {
  menuOpen: boolean;
  settingsOpen: boolean;
  loadingProgress: number;
  viewportMode: ViewportMode;
  setMenuOpen: (menuOpen: boolean) => void;
  setSettingsOpen: (settingsOpen: boolean) => void;
  setLoadingProgress: (loadingProgress: number) => void;
  setViewportMode: (viewportMode: ViewportMode) => void;
  resetUi: () => void;
}

const initialUiState = {
  menuOpen: false,
  settingsOpen: false,
  loadingProgress: 0,
  viewportMode: "portrait" as ViewportMode,
};

export const useUiStore = create<UiStoreState>((set) => ({
  ...initialUiState,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setLoadingProgress: (loadingProgress) =>
    set((state) => {
      const nextProgress = Math.max(0, Math.min(100, Math.round(Number(loadingProgress) || 0)));
      return {
        loadingProgress:
          nextProgress <= 1 ? nextProgress : Math.max(state.loadingProgress, nextProgress),
      };
    }),
  setViewportMode: (viewportMode) => set({ viewportMode }),
  resetUi: () => set({ ...initialUiState }),
}));
