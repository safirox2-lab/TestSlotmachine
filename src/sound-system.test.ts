import { afterEach, describe, expect, it, vi } from "vitest";
import { SoundSystem } from "./sound-system";

const GRID_AUDIO_EVENTS = [
  "wildExpand",
  "wildSymbol",
  "scatterTease",
  "paylineTrace",
  "coinPop",
  "cascadeImpact",
  "cascadeChain",
  "freeSpinAward",
  "nearMiss",
  "gridPulse",
] as const;

const REEL_STOP_AUDIO_EVENTS = [
  "reelStop1",
  "reelStop2",
  "reelStop3",
  "reelStop4",
  "reelStop5",
] as const;

const SLOT_LOSE_AUDIO_EVENTS = ["slotLose1", "slotLose2"] as const;

describe("SoundSystem grid event defaults", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("resolves absolute manifest file paths without forcing the audio base path", () => {
    const sound = new SoundSystem({ storage: undefined });
    sound.audioManifest = { basePath: "/assets-v2/audio" };

    expect(sound.resolveAssetUrl("music/bonus-loop.wav")).toBe(
      "/assets-v2/audio/music/bonus-loop.wav",
    );
    expect(sound.resolveAssetUrl("/raw/ambiente")).toBe("/raw/ambiente");
  });

  it("has default event config for every grid effect event", () => {
    const sound = new SoundSystem({ storage: undefined });

    for (const eventName of GRID_AUDIO_EVENTS) {
      expect(sound.eventConfig.get(eventName)?.bus).toBe("sfx");
    }
  });

  it("maps progressive reel stop events to raw slot sound asset ids", () => {
    const sound = new SoundSystem({ storage: undefined });

    for (const [index, eventName] of REEL_STOP_AUDIO_EVENTS.entries()) {
      expect(sound.eventConfig.get(eventName)?.assetId).toBe(`spin/reel-stop-${index + 1}`);
      expect(sound.eventConfig.get(eventName)?.bus).toBe("sfx");
    }
  });

  it("maps the continuous reel spin loop to the raw slot reel asset id", () => {
    const sound = new SoundSystem({ storage: undefined });

    expect(sound.eventConfig.get("slotReel")).toMatchObject({
      assetId: "spin/slot-reel",
      bus: "sfx",
      gain: 1.2,
      loop: true,
    });
  });

  it("maps the normal WILD symbol sound to the raw wild folder audio", () => {
    const sound = new SoundSystem({ storage: undefined });

    expect(sound.eventConfig.get("wildSymbol")).toMatchObject({
      assetId: "feature/wild-symbol",
      bus: "sfx",
      gain: 0.9,
    });
  });

  it("maps raw win, big win, jackpot, and scatter sounds to their runtime events", () => {
    const sound = new SoundSystem({ storage: undefined });

    expect(sound.eventConfig.get("smallWin")).toMatchObject({
      assetId: "win/small",
      bus: "sfx",
      gain: 1,
      stopAfterMs: 1712,
    });
    expect(sound.eventConfig.get("bigWin")).toMatchObject({
      assetId: "win/big",
      bus: "sfx",
      gain: 0.92,
      stopAfterMs: 1929,
    });
    expect(sound.eventConfig.get("jackpot")).toMatchObject({
      assetId: "feature/jackpot",
      bus: "sfx",
      gain: 0.96,
      stopAfterMs: 1859,
    });
    expect(sound.eventConfig.get("scatterTease")).toMatchObject({
      assetId: "feature/scatter-tease",
      bus: "sfx",
      gain: 0.82,
      stopAfterMs: 2015,
    });
  });

  it("maps the Gallero Legendario jackpot sound to the raw legendario audio", () => {
    const sound = new SoundSystem({ storage: undefined });

    expect(sound.eventConfig.get("legendaryJackpot")).toMatchObject({
      assetId: "feature/legendary-jackpot",
      bus: "sfx",
      gain: 0.96,
      stopAfterMs: 3776,
    });
  });

  it("maps slot lose events to raw slot lose asset ids", () => {
    const sound = new SoundSystem({ storage: undefined });

    for (const [index, eventName] of SLOT_LOSE_AUDIO_EVENTS.entries()) {
      expect(sound.eventConfig.get(eventName)?.assetId).toBe(`spin/slot-lose-${index + 1}`);
      expect(sound.eventConfig.get(eventName)?.bus).toBe("sfx");
    }
  });

  it("rate limits dense grid effect events", () => {
    const sound = new SoundSystem({ storage: undefined });

    expect(sound.isRateLimited("cascadeImpact", 1)).toBe(false);
    expect(sound.isRateLimited("cascadeImpact", 1.01)).toBe(true);
    expect(sound.isRateLimited("cascadeImpact", 1.1)).toBe(false);

    expect(sound.isRateLimited("coinPop", 2)).toBe(false);
    expect(sound.isRateLimited("coinPop", 2.02)).toBe(true);
  });

  it("uses a lightweight startup preload set before full audio hydration", () => {
    const sound = new SoundSystem({ storage: undefined });
    const startupAssetIds = sound.getPreloadAssetIds({ preset: "startup" });

    expect(startupAssetIds).toContain("spin/start");
    expect(startupAssetIds).toContain("spin/slot-reel");
    for (let stopIndex = 1; stopIndex <= 5; stopIndex += 1) {
      expect(startupAssetIds).toContain(`spin/reel-stop-${stopIndex}`);
    }
    expect(startupAssetIds).toContain("spin/slot-lose-1");
    expect(startupAssetIds).toContain("spin/slot-lose-2");
    expect(startupAssetIds).toContain("win/big");
    expect(startupAssetIds).toContain("feature/cascade");
    expect(startupAssetIds).toContain("feature/payline-trace");
    expect(startupAssetIds).toContain("feature/cascade-chain");
    expect(startupAssetIds).toContain("feature/free-spin-award");
    expect(startupAssetIds).not.toContain("music/base-loop");
    expect(startupAssetIds).not.toContain("win/medium");
    expect(startupAssetIds).not.toContain("feature/scatter-land");
    expect(startupAssetIds).not.toContain("feature/free-spins");
  });

  it("bypasses stale browser cache when hydrating audio files from a fresh manifest", async () => {
    const sound = new SoundSystem({ storage: undefined });
    const decodedAudio = { duration: 1 } as AudioBuffer;
    sound.context = {
      decodeAudioData: (_buffer: ArrayBuffer, resolve: (decoded: unknown) => void) => {
        resolve(decodedAudio);
        return Promise.resolve(decodedAudio);
      },
    } as unknown as AudioContext;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/assets-v2/audio/manifest.json") {
        return {
          ok: true,
          json: async () => ({
            basePath: "/assets-v2/audio",
            assets: [{ id: "spin/start", file: "spin/start.wav" }],
          }),
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await sound.loadAndDecodeAudio({ assetIds: ["spin/start"] });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/assets-v2/audio/manifest.json", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/assets-v2/audio/spin/start.wav", {
      cache: "no-store",
    });
  });

  it("rate limits long win stingers to avoid stacked celebrations", () => {
    const sound = new SoundSystem({ storage: undefined });

    expect(sound.isRateLimited("bigWin", 10)).toBe(false);
    expect(sound.isRateLimited("bigWin", 10.5)).toBe(true);
    expect(sound.isRateLimited("bigWin", 12.3)).toBe(false);

    expect(sound.isRateLimited("megaWin", 20)).toBe(false);
    expect(sound.isRateLimited("megaWin", 21)).toBe(true);

    expect(sound.isRateLimited("cascadeChain", 30)).toBe(false);
    expect(sound.isRateLimited("cascadeChain", 30.1)).toBe(true);
  });

  it("temporarily ducks active background music during win celebrations", () => {
    vi.useFakeTimers();
    const sound = new SoundSystem({ storage: undefined, musicVolume: 0.42 });
    const musicGain = {
      value: 0.42,
      setTargetAtTime: vi.fn(),
    };
    const testSound = sound as unknown as {
      context: { currentTime: number };
      buses: { music: { gain: typeof musicGain } };
      activeMusic: unknown;
    };
    testSound.context = { currentTime: 12 };
    testSound.buses.music = { gain: musicGain };
    testSound.activeMusic = { kind: "base" };

    expect(sound.duckMusicFor(2000)).toBe(true);

    expect(musicGain.setTargetAtTime.mock.calls[0]?.[0]).toBeCloseTo(0.252);
    expect(musicGain.setTargetAtTime.mock.calls[0]?.[1]).toBe(12);
    expect(musicGain.setTargetAtTime.mock.calls[0]?.[2]).toBe(0.08);

    vi.advanceTimersByTime(2000);

    expect(musicGain.setTargetAtTime.mock.calls.at(-1)?.[0]).toBeCloseTo(0.42);
    expect(musicGain.setTargetAtTime.mock.calls.at(-1)?.[1]).toBe(12);
    expect(musicGain.setTargetAtTime.mock.calls.at(-1)?.[2]).toBe(0.42);
  });

  it("stops the raw jackpot buffer at 2.80 seconds", () => {
    const sound = new SoundSystem({ storage: undefined });
    const source = {
      playbackRate: { value: 1 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null,
    };
    const envelope = {
      gain: { value: 0 },
      connect: vi.fn(),
    };
    const testSound = sound as unknown as {
      context: unknown;
      master: unknown;
      buses: { sfx: unknown };
      audioBuffers: Map<string, AudioBuffer>;
      eventConfig: Map<string, Record<string, unknown>>;
    };
    testSound.context = {
      state: "running",
      currentTime: 4,
      createBufferSource: () => source,
      createGain: () => envelope,
    };
    testSound.master = {};
    testSound.buses.sfx = {};
    testSound.audioBuffers.set("feature/jackpot", {} as AudioBuffer);
    testSound.eventConfig.set("jackpot", {
      assetId: "feature/jackpot",
      bus: "sfx",
      gain: 0.96,
      stopAfterMs: 2800,
    });

    sound.play("jackpot");

    expect(source.start).toHaveBeenCalledWith(4);
    expect(source.stop).toHaveBeenCalledWith(6.8);
  });

  it("starts and stops a named looping event without stacking duplicate sources", () => {
    const sound = new SoundSystem({ storage: undefined });
    const source = {
      loop: false,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null,
      onended: null as (() => void) | null,
    };
    const envelope = {
      gain: { value: 0 },
      connect: vi.fn(),
    };
    const testSound = sound as unknown as {
      context: unknown;
      master: unknown;
      buses: { sfx: unknown };
      audioBuffers: Map<string, AudioBuffer>;
      eventConfig: Map<string, Record<string, unknown>>;
    };
    testSound.context = {
      state: "running",
      currentTime: 8,
      createBufferSource: () => source,
      createGain: () => envelope,
    };
    testSound.master = {};
    testSound.buses.sfx = {};
    testSound.audioBuffers.set("spin/slot-reel", {} as AudioBuffer);
    testSound.eventConfig.set("slotReel", {
      assetId: "spin/slot-reel",
      bus: "sfx",
      gain: 1.2,
      loop: true,
    });

    expect(sound.startLoopingEvent("slotReel")).toBe(true);
    expect(sound.startLoopingEvent("slotReel")).toBe(true);
    expect(source.loop).toBe(true);
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(source.start).toHaveBeenCalledWith(8);

    expect(sound.stopLoopingEvent("slotReel")).toBe(true);
    expect(source.stop).toHaveBeenCalledTimes(1);
  });

  it("persists and clamps master volume", () => {
    const storage = new Map<string, string>();
    const storageAdapter = {
      get length() {
        return storage.size;
      },
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      key: (index: number) => [...storage.keys()][index] ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    const sound = new SoundSystem({ storage: storageAdapter });

    sound.setVolume(1.4);
    expect(sound.volume).toBe(1);
    expect(storage.get("elgallero.audio.volume")).toBe("1");

    sound.setVolume(-0.5);
    expect(sound.volume).toBe(0);
    expect(storage.get("elgallero.audio.volume")).toBe("0");

    storage.set("elgallero.audio.volume", "0.37");
    expect(new SoundSystem({ storage: storageAdapter }).volume).toBe(0.37);
  });
});
