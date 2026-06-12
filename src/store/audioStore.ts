import { create } from "zustand";

interface AudioStoreState {
  unlocked: boolean;
  musicMuted: boolean;
  sfxMuted: boolean;
  volume: number;
  setUnlocked: (unlocked: boolean) => void;
  setMusicMuted: (musicMuted: boolean) => void;
  setSfxMuted: (sfxMuted: boolean) => void;
  setVolume: (volume: number) => void;
  resetAudio: () => void;
}

const initialAudioState = {
  unlocked: false,
  musicMuted: false,
  sfxMuted: false,
  volume: 0.32,
};

export const useAudioStore = create<AudioStoreState>((set) => ({
  ...initialAudioState,
  setUnlocked: (unlocked) => set({ unlocked }),
  setMusicMuted: (musicMuted) => set({ musicMuted }),
  setSfxMuted: (sfxMuted) => set({ sfxMuted }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  resetAudio: () => set({ ...initialAudioState }),
}));
