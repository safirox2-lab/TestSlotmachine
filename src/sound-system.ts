const MUSIC_MUTED_KEY = "elgallero.audio.musicMuted";
const SFX_MUTED_KEY = "elgallero.audio.sfxMuted";
const MASTER_VOLUME_KEY = "elgallero.audio.volume";
const DEFAULT_AUDIO_MANIFEST_PATH = "/assets-v2/audio/manifest.json";
const MUSIC_DUCK_GAIN_SCALE = 0.6;
const MUSIC_DUCK_ATTACK_SECONDS = 0.08;
const MUSIC_DUCK_RELEASE_SECONDS = 0.42;

type AudioBus = "music" | "sfx" | "ui";

interface AudioAssetEntry {
  id: string;
  file: string;
}

interface AudioEventConfig {
  assetId?: string;
  bus?: AudioBus;
  gain?: number;
  loop?: boolean;
  playbackRate?: number;
  stopAfterMs?: number;
}

interface AudioMusicConfig extends AudioEventConfig {
  loop?: boolean;
}

interface AudioManifest {
  basePath?: string;
  assets?: AudioAssetEntry[];
  events?: Record<string, AudioEventConfig>;
  music?: Record<string, AudioMusicConfig>;
}

interface AudioPreloadOptions {
  preset?: "startup";
  eventNames?: readonly string[];
  assetIds?: readonly string[];
  musicKinds?: readonly string[];
}

interface AudioPreloadReport {
  loaded: number;
  expected: number;
  missing: string[];
  manifestLoaded: boolean;
}

interface SoundSystemOptions {
  volume?: number;
  musicVolume?: number;
  sfxVolume?: number;
  uiVolume?: number;
  manifestPath?: string;
  storage?: Storage;
}

interface ToneNote {
  frequency: number;
  delay?: number;
  duration: number;
  type?: OscillatorType;
}

interface ToneOptions extends ToneNote {
  gain?: number;
  bus?: AudioBus;
}

interface NoiseBurstOptions {
  delay?: number;
  duration?: number;
  gain?: number;
  filterFrequency?: number;
}

type AudioContextConstructor = new () => AudioContext;
type WebkitAudioGlobal = typeof globalThis & {
  webkitAudioContext?: AudioContextConstructor;
};
type AudioBufferSourceRecord = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  kind: string;
};
type AudioEventLoopRecord = {
  source: AudioBufferSourceNode;
  envelope: GainNode;
  name: string;
};
type CallbackDecodeAudioData = (
  audioData: ArrayBuffer,
  successCallback: (decodedData: AudioBuffer) => void,
  errorCallback?: (error: DOMException) => void,
) => Promise<AudioBuffer> | undefined;

const DEFAULT_EVENT_CONFIG = {
  button: { assetId: "ui/button", bus: "ui" },
  toggleOff: { assetId: "ui/toggle", bus: "ui" },
  bet: { assetId: "ui/bet", bus: "ui" },
  spin: { assetId: "spin/start", bus: "sfx" },
  slotReel: { assetId: "spin/slot-reel", bus: "sfx", gain: 1.2, loop: true },
  reelStop: { assetId: "spin/reel-stop", bus: "sfx" },
  reelStop1: { assetId: "spin/reel-stop-1", bus: "sfx" },
  reelStop2: { assetId: "spin/reel-stop-2", bus: "sfx" },
  reelStop3: { assetId: "spin/reel-stop-3", bus: "sfx" },
  reelStop4: { assetId: "spin/reel-stop-4", bus: "sfx" },
  reelStop5: { assetId: "spin/reel-stop-5", bus: "sfx" },
  slotLose1: { assetId: "spin/slot-lose-1", bus: "sfx" },
  slotLose2: { assetId: "spin/slot-lose-2", bus: "sfx" },
  tick: { assetId: "spin/tick", bus: "sfx" },
  cascade: { assetId: "feature/cascade", bus: "sfx" },
  win: { assetId: "win/small", bus: "sfx", gain: 1, stopAfterMs: 1712 },
  smallWin: { assetId: "win/small", bus: "sfx", gain: 1, stopAfterMs: 1712 },
  bigWin: { assetId: "win/big", bus: "sfx", gain: 0.92, stopAfterMs: 1929 },
  megaWin: { assetId: "win/mega", bus: "sfx" },
  jackpot: { assetId: "feature/jackpot", bus: "sfx", gain: 0.96, stopAfterMs: 1859 },
  legendaryJackpot: {
    assetId: "feature/legendary-jackpot",
    bus: "sfx",
    gain: 0.96,
    stopAfterMs: 3776,
  },
  fireworks: { assetId: "feature/jackpot", bus: "sfx", stopAfterMs: 1859 },
  refill: { assetId: "ui/bet", bus: "ui" },
  wildExpand: { assetId: "feature/wild-expand", bus: "sfx", stopAfterMs: 10005 },
  wildSymbol: { assetId: "feature/wild-symbol", bus: "sfx", gain: 0.9 },
  scatterTease: { assetId: "feature/scatter-tease", bus: "sfx", gain: 0.82, stopAfterMs: 2015 },
  paylineTrace: { assetId: "feature/payline-trace", bus: "sfx" },
  coinPop: { assetId: "feature/coin-pop", bus: "sfx" },
  cascadeImpact: { assetId: "feature/cascade-impact", bus: "sfx" },
  cascadeChain: { assetId: "feature/cascade-chain", bus: "sfx" },
  freeSpinAward: { assetId: "feature/free-spin-award", bus: "sfx" },
  nearMiss: { assetId: "feature/near-miss", bus: "sfx" },
  gridPulse: { assetId: "feature/grid-pulse", bus: "sfx" },
};

const STARTUP_AUDIO_EVENTS = [
  "button",
  "toggleOff",
  "bet",
  "spin",
  "slotReel",
  "reelStop",
  "reelStop1",
  "reelStop2",
  "reelStop3",
  "reelStop4",
  "reelStop5",
  "slotLose1",
  "slotLose2",
  "tick",
  "cascade",
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
  "smallWin",
  "bigWin",
  "megaWin",
  "jackpot",
  "legendaryJackpot",
];

function readStoredBoolean(storage: Storage | undefined, key: string, fallback = false): boolean {
  try {
    const value = storage?.getItem?.(key);
    return value === null || value === undefined ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(storage: Storage | undefined, key: string, value: boolean): void {
  try {
    storage?.setItem?.(key, String(value));
  } catch {
    // Storage can be unavailable in private browsing or test contexts.
  }
}

function clampVolume(value: unknown, fallback = 0.32): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numeric));
}

function readStoredVolume(storage: Storage | undefined, fallback = 0.32): number {
  try {
    const value = storage?.getItem?.(MASTER_VOLUME_KEY);
    return value === null || value === undefined
      ? clampVolume(fallback)
      : clampVolume(value, fallback);
  } catch {
    return clampVolume(fallback);
  }
}

function writeStoredVolume(storage: Storage | undefined, value: number): void {
  try {
    storage?.setItem?.(MASTER_VOLUME_KEY, String(value));
  } catch {
    // Storage can be unavailable in private browsing or test contexts.
  }
}

export class SoundSystem {
  context: AudioContext = null as unknown as AudioContext;
  master: GainNode = null as unknown as GainNode;
  buses: Record<"master" | AudioBus, GainNode> = {
    master: null as unknown as GainNode,
    music: null as unknown as GainNode,
    sfx: null as unknown as GainNode,
    ui: null as unknown as GainNode,
  };
  storage: Storage | undefined;
  volume: number;
  busVolumes: Record<AudioBus, number>;
  manifestPath: string;
  muted = false;
  musicMuted: boolean;
  sfxMuted: boolean;
  unlocked = false;
  preloaded = false;
  preloadPromise: Promise<AudioPreloadReport> | null = null;
  preloadPromises = new Map<string, Promise<AudioPreloadReport>>();
  lastPreloadReport: AudioPreloadReport | null = null;
  manifestPromise: Promise<AudioManifest> | null = null;
  lastPlayedAt = new Map<string, number>();
  audioManifest: AudioManifest | null = null;
  assetEntries = new Map<string, AudioAssetEntry>();
  eventConfig = new Map<string, AudioEventConfig>(
    Object.entries(DEFAULT_EVENT_CONFIG) as Array<[string, AudioEventConfig]>,
  );
  musicConfig = new Map<string, AudioMusicConfig>();
  audioBuffers = new Map<string, AudioBuffer>();
  activeMusic: AudioBufferSourceRecord | null = null;
  activeMusicKind = "base";
  musicDuckScale = 1;
  musicDuckTimeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  activeEventLoops = new Map<string, AudioEventLoopRecord>();
  pendingEventLoops = new Set<string>();

  constructor({
    volume = 0.32,
    musicVolume = 0.42,
    sfxVolume = 0.82,
    uiVolume = 0.72,
    manifestPath = DEFAULT_AUDIO_MANIFEST_PATH,
    storage = globalThis.localStorage,
  }: SoundSystemOptions = {}) {
    this.storage = storage;
    this.volume = readStoredVolume(this.storage, volume);
    this.busVolumes = {
      music: musicVolume,
      sfx: sfxVolume,
      ui: uiVolume,
    };
    this.manifestPath = manifestPath;
    this.musicMuted = readStoredBoolean(this.storage, MUSIC_MUTED_KEY, false);
    this.sfxMuted = readStoredBoolean(this.storage, SFX_MUTED_KEY, false);
  }

  async unlock(): Promise<boolean> {
    const AudioContextClass =
      globalThis.AudioContext ?? (globalThis as WebkitAudioGlobal).webkitAudioContext;
    if (!AudioContextClass) {
      this.muted = true;
      return false;
    }

    if (!this.context) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.buses.master = this.master;
      this.buses.music = this.context.createGain();
      this.buses.sfx = this.context.createGain();
      this.buses.ui = this.context.createGain();
      this.buses.music.connect(this.master);
      this.buses.sfx.connect(this.master);
      this.buses.ui.connect(this.master);
      this.master.connect(this.context.destination);
      this.applyBusVolumes();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.unlocked = true;
    return true;
  }

  async preloadAudio(options: AudioPreloadOptions = {}): Promise<AudioPreloadReport> {
    if (!this.context) {
      return { loaded: 0, expected: 0, missing: ["audio-context"], manifestLoaded: false };
    }

    const key = this.getPreloadKey(options);
    if (this.preloadPromises.has(key)) {
      return this.preloadPromises.get(key) as Promise<AudioPreloadReport>;
    }

    const promise = this.loadAndDecodeAudio(options).finally(() => {
      if (key !== "all") {
        this.preloadPromises.delete(key);
      }
    });
    this.preloadPromises.set(key, promise);
    if (key === "all") {
      this.preloadPromise = promise;
    }
    return promise;
  }

  async loadAndDecodeAudio(options: AudioPreloadOptions = {}): Promise<AudioPreloadReport> {
    const report: AudioPreloadReport = {
      loaded: 0,
      expected: 0,
      missing: [],
      manifestLoaded: false,
    };

    try {
      await this.ensureManifestLoaded();
      report.manifestLoaded = true;
    } catch (error) {
      report.missing.push(error instanceof Error ? error.message : "audio-manifest");
      this.lastPreloadReport = report;
      return report;
    }

    const preloadAssetIds = this.getPreloadAssetIds(options);
    const assets: AudioAssetEntry[] =
      preloadAssetIds.length > 0
        ? preloadAssetIds
            .map((assetId) => this.assetEntries.get(assetId))
            .filter((asset): asset is AudioAssetEntry => Boolean(asset))
        : [...this.assetEntries.values()];
    const pendingAssets = assets.filter((asset) => !this.audioBuffers.has(asset.id));
    report.expected = assets.length;
    report.loaded = assets.length - pendingAssets.length;

    await Promise.all(
      pendingAssets.map(async (asset) => {
        try {
          const url = this.resolveAssetUrl(asset.file);
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`http-${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await this.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(asset.id, decoded);
          report.loaded += 1;
        } catch (error) {
          report.missing.push(`${asset.id}:${error instanceof Error ? error.message : "decode"}`);
        }
      }),
    );

    this.preloaded =
      this.assetEntries.size > 0 &&
      [...this.assetEntries.keys()].every((assetId) => this.audioBuffers.has(assetId));
    this.lastPreloadReport = report;
    return report;
  }

  async ensureManifestLoaded(): Promise<AudioManifest> {
    if (this.audioManifest) {
      return this.audioManifest;
    }
    if (!this.manifestPromise) {
      this.manifestPromise = this.loadManifest().finally(() => {
        this.manifestPromise = null;
      });
    }
    return this.manifestPromise;
  }

  getPreloadKey(options: AudioPreloadOptions = {}): string {
    if (options.preset === "startup") {
      return "preset:startup";
    }
    if (!options.preset && !options.eventNames && !options.assetIds && !options.musicKinds) {
      return "all";
    }
    return this.getPreloadAssetIds(options).sort().join("|") || "all";
  }

  getPreloadAssetIds(options: AudioPreloadOptions = {}): string[] {
    if (!options.preset && !options.eventNames && !options.assetIds && !options.musicKinds) {
      return [...this.assetEntries.keys()];
    }

    const assetIds = new Set(options.assetIds ?? []);
    const eventNames =
      options.preset === "startup" ? STARTUP_AUDIO_EVENTS : (options.eventNames ?? []);
    for (const eventName of eventNames) {
      const assetId = this.eventConfig.get(eventName)?.assetId;
      if (assetId) {
        assetIds.add(assetId);
      }
    }

    for (const musicKind of options.musicKinds ?? []) {
      const assetId = this.musicConfig.get(musicKind)?.assetId;
      if (assetId) {
        assetIds.add(assetId);
      }
    }

    return [...assetIds];
  }

  async loadManifest(): Promise<AudioManifest> {
    const response = await fetch(this.manifestPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`audio-manifest:${response.status}`);
    }
    const manifest = await response.json();
    const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
    this.audioManifest = manifest;
    this.assetEntries = new Map(
      assets
        .filter((asset: Partial<AudioAssetEntry>): asset is AudioAssetEntry =>
          Boolean(asset?.id && asset?.file),
        )
        .map((asset: AudioAssetEntry) => [asset.id, asset]),
    );
    this.eventConfig = new Map(
      Object.entries({
        ...DEFAULT_EVENT_CONFIG,
        ...(manifest.events ?? {}),
      }),
    );
    this.musicConfig = new Map(Object.entries(manifest.music ?? {}));
    return manifest;
  }

  decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const decodeAudioData = this.context.decodeAudioData as unknown as CallbackDecodeAudioData;
    return new Promise((resolve, reject) => {
      const result = decodeAudioData.call(this.context, arrayBuffer.slice(0), resolve, reject);
      if (result?.then) {
        result.then(resolve).catch(reject);
      }
    });
  }

  resolveAssetUrl(file: string): string {
    const normalizedFile = String(file).replace(/\\/g, "/");
    if (normalizedFile.startsWith("/")) {
      return normalizedFile;
    }
    const basePath = this.audioManifest?.basePath ?? "/assets-v2/audio";
    return `${basePath}/${normalizedFile.replace(/^\/+/, "")}`;
  }

  setMuted(muted: boolean): void {
    this.muted = Boolean(muted);
    this.applyBusVolumes();
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume, this.volume);
    writeStoredVolume(this.storage, this.volume);
    this.applyBusVolumes();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = Boolean(muted);
    writeStoredBoolean(this.storage, MUSIC_MUTED_KEY, this.musicMuted);
    if (this.musicMuted) {
      this.stopMusic();
    }
    this.applyBusVolumes();
  }

  toggleMusicMuted(): boolean {
    this.setMusicMuted(!this.musicMuted);
    return this.musicMuted;
  }

  setSfxMuted(muted: boolean): void {
    this.sfxMuted = Boolean(muted);
    writeStoredBoolean(this.storage, SFX_MUTED_KEY, this.sfxMuted);
    this.applyBusVolumes();
  }

  toggleSfxMuted(): boolean {
    this.setSfxMuted(!this.sfxMuted);
    return this.sfxMuted;
  }

  isEventMuted(name: string): boolean {
    const bus = this.getEventBus(name);
    if (bus === "music") {
      return this.muted || this.musicMuted;
    }
    return this.muted || this.sfxMuted;
  }

  getEventBus(name: string): AudioBus {
    if (name === "baseMusic" || name === "bonusMusic") {
      return "music";
    }
    return this.eventConfig.get(name)?.bus ?? "sfx";
  }

  applyBusVolumes({ musicTimeConstant = 0.015 }: { musicTimeConstant?: number } = {}): void {
    const now = this.context?.currentTime ?? 0;
    const setGain = (gainNode: GainNode | null, value: number, timeConstant = 0.015) => {
      if (!gainNode) {
        return;
      }
      if (gainNode.gain?.setTargetAtTime) {
        gainNode.gain.setTargetAtTime(value, now, timeConstant);
      } else if (gainNode.gain) {
        gainNode.gain.value = value;
      }
    };

    setGain(this.master, this.muted ? 0 : this.volume);
    setGain(
      this.buses.music,
      this.musicMuted ? 0 : this.busVolumes.music * this.musicDuckScale,
      musicTimeConstant,
    );
    setGain(this.buses.sfx, this.sfxMuted ? 0 : this.busVolumes.sfx);
    setGain(this.buses.ui, this.sfxMuted ? 0 : this.busVolumes.ui);
  }

  duckMusicFor(
    durationMs: number,
    { gainScale = MUSIC_DUCK_GAIN_SCALE }: { gainScale?: number } = {},
  ): boolean {
    if (!this.activeMusic || this.muted || this.musicMuted || !this.buses.music) {
      return false;
    }

    const duration = Math.max(0, Number(durationMs) || 0);
    const scale = Math.max(0, Math.min(1, Number(gainScale) || MUSIC_DUCK_GAIN_SCALE));
    if (this.musicDuckTimeout) {
      globalThis.clearTimeout(this.musicDuckTimeout);
      this.musicDuckTimeout = null;
    }

    this.musicDuckScale = scale;
    this.applyBusVolumes({ musicTimeConstant: MUSIC_DUCK_ATTACK_SECONDS });
    this.musicDuckTimeout = globalThis.setTimeout(() => {
      this.musicDuckTimeout = null;
      this.musicDuckScale = 1;
      this.applyBusVolumes({ musicTimeConstant: MUSIC_DUCK_RELEASE_SECONDS });
    }, duration);
    return true;
  }

  play(name: string): void {
    if (this.muted || !this.context || !this.master || this.context.state !== "running") {
      return;
    }
    if (this.isEventMuted(name)) {
      return;
    }

    const now = this.context.currentTime;
    if (this.isRateLimited(name, now)) {
      return;
    }

    const config = this.eventConfig.get(name);
    if (config?.assetId) {
      if (config.loop) {
        this.startLoopingEvent(name);
        return;
      }
      if (this.audioBuffers.has(config.assetId)) {
        this.playBuffer(config.assetId, config.bus ?? "sfx", {
          gain: config.gain ?? 1,
          playbackRate: config.playbackRate ?? 1,
          stopAfterMs: config.stopAfterMs,
        });
        return;
      }
      void this.preloadAudio({ assetIds: [config.assetId] });
    }

    this.playSynthetic(name);
  }

  startLoopingEvent(name: string): boolean {
    if (this.muted || !this.context || !this.master || this.context.state !== "running") {
      return false;
    }
    if (this.isEventMuted(name)) {
      return false;
    }
    if (this.activeEventLoops.has(name)) {
      return true;
    }

    const config = this.eventConfig.get(name);
    const assetId = config?.assetId;
    if (!assetId) {
      return false;
    }

    if (!this.audioBuffers.has(assetId)) {
      this.pendingEventLoops.add(name);
      void this.preloadAudio({ assetIds: [assetId] }).then(() => {
        if (this.pendingEventLoops.has(name)) {
          this.startLoopingEvent(name);
        }
      });
      return false;
    }

    const targetBus = this.buses[config.bus ?? "sfx"] ?? this.buses.sfx;
    if (!targetBus) {
      return false;
    }

    this.pendingEventLoops.delete(name);
    const source = this.context.createBufferSource();
    const envelope = this.context.createGain();
    source.buffer = this.audioBuffers.get(assetId) ?? null;
    source.loop = true;
    source.playbackRate.value = config.playbackRate ?? 1;
    envelope.gain.value = config.gain ?? 1;
    source.connect(envelope);
    envelope.connect(targetBus);
    source.start(this.context.currentTime);
    const record = { source, envelope, name };
    this.activeEventLoops.set(name, record);
    source.onended = () => {
      if (this.activeEventLoops.get(name) === record) {
        this.activeEventLoops.delete(name);
      }
    };
    return true;
  }

  stopLoopingEvent(name: string): boolean {
    this.pendingEventLoops.delete(name);
    const record = this.activeEventLoops.get(name);
    if (!record) {
      return false;
    }

    try {
      record.source.stop();
    } catch {
      // Source may already be stopped.
    }
    this.activeEventLoops.delete(name);
    return true;
  }

  stopAllLoopingEvents(): void {
    for (const name of [...this.activeEventLoops.keys()]) {
      this.stopLoopingEvent(name);
    }
    this.pendingEventLoops.clear();
  }

  async startMusic(kind = "base"): Promise<boolean> {
    this.activeMusicKind = kind;
    if (this.muted || this.musicMuted || !this.context || this.context.state !== "running") {
      return false;
    }

    try {
      await this.ensureManifestLoaded();
    } catch {
      return false;
    }
    const config = this.musicConfig.get(kind);
    const assetId = config?.assetId;
    if (assetId && !this.audioBuffers.has(assetId)) {
      await this.preloadAudio({ assetIds: [assetId] });
    }
    if (!assetId || !this.audioBuffers.has(assetId)) {
      return false;
    }
    if (this.activeMusic?.kind === kind) {
      return true;
    }

    this.stopMusic();
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.audioBuffers.get(assetId) ?? null;
    source.loop = config.loop ?? true;
    gain.gain.value = config.gain ?? 0.82;
    source.connect(gain);
    gain.connect(this.buses.music);
    source.start(this.context.currentTime);
    this.activeMusic = { source, gain, kind };
    source.onended = () => {
      if (this.activeMusic?.source === source) {
        this.activeMusic = null;
      }
    };
    return true;
  }

  stopMusic(): void {
    if (!this.activeMusic) {
      return;
    }
    try {
      this.activeMusic.source.stop();
    } catch {
      // Source may already be stopped.
    }
    this.activeMusic = null;
  }

  playBuffer(
    assetId: string,
    bus: AudioBus = "sfx",
    {
      gain = 1,
      playbackRate = 1,
      stopAfterMs,
    }: {
      gain?: number;
      playbackRate?: number;
      stopAfterMs?: number;
    } = {},
  ): boolean {
    const buffer = this.audioBuffers.get(assetId);
    const targetBus = this.buses[bus] ?? this.buses.sfx;
    if (!buffer || !targetBus) {
      return false;
    }
    const source = this.context.createBufferSource();
    const envelope = this.context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    envelope.gain.value = gain;
    source.connect(envelope);
    envelope.connect(targetBus);
    const now = this.context.currentTime;
    source.start(now);
    const stopAfterSeconds = Number(stopAfterMs) / 1000;
    if (Number.isFinite(stopAfterSeconds) && stopAfterSeconds > 0) {
      source.stop(now + stopAfterSeconds);
    }
    return true;
  }

  playSynthetic(name: string): void {
    switch (name) {
      case "button":
        this.tone({ frequency: 440, duration: 0.055, type: "square", gain: 0.045, bus: "ui" });
        break;
      case "bet":
        this.sequence(
          [
            { frequency: 390, delay: 0, duration: 0.045 },
            { frequency: 520, delay: 0.05, duration: 0.055 },
          ],
          0.05,
          "ui",
        );
        break;
      case "spin":
        this.spinSweep();
        break;
      case "reelStop":
      case "reelStop1":
      case "reelStop2":
      case "reelStop3":
      case "reelStop4":
      case "reelStop5":
        this.sequence(
          [
            { frequency: 260, delay: 0, duration: 0.035, type: "square" },
            { frequency: 180, delay: 0.04, duration: 0.045, type: "triangle" },
          ],
          0.04,
        );
        break;
      case "slotLose1":
      case "slotLose2":
        this.sequence(
          [
            { frequency: 220, delay: 0, duration: 0.08, type: "triangle" },
            { frequency: 165, delay: 0.08, duration: 0.11, type: "sine" },
          ],
          0.045,
        );
        break;
      case "tick":
        this.tone({ frequency: 880, duration: 0.018, type: "square", gain: 0.025 });
        break;
      case "cascade":
        this.sequence(
          [
            { frequency: 560, delay: 0, duration: 0.04 },
            { frequency: 720, delay: 0.05, duration: 0.05 },
            { frequency: 920, delay: 0.11, duration: 0.07 },
          ],
          0.055,
        );
        break;
      case "win":
      case "smallWin":
        this.sequence(
          [
            { frequency: 523.25, delay: 0, duration: 0.08 },
            { frequency: 659.25, delay: 0.08, duration: 0.08 },
            { frequency: 783.99, delay: 0.16, duration: 0.11 },
          ],
          0.075,
        );
        break;
      case "bigWin":
        break;
      case "megaWin":
        this.arpeggio([329.63, 392, 493.88, 659.25, 783.99, 1046.5, 1567.98], 0.075, 0.11);
        this.noiseBurst({ delay: 0.1, duration: 0.22, gain: 0.032, filterFrequency: 2200 });
        this.noiseBurst({ delay: 0.36, duration: 0.22, gain: 0.028, filterFrequency: 2600 });
        break;
      case "jackpot":
      case "legendaryJackpot":
        break;
      case "fireworks":
        break;
      case "freeSpinAward":
        this.sequence(
          [
            { frequency: 440, delay: 0, duration: 0.08, type: "triangle" },
            { frequency: 660, delay: 0.08, duration: 0.08, type: "triangle" },
            { frequency: 880, delay: 0.16, duration: 0.1, type: "square" },
            { frequency: 1320, delay: 0.29, duration: 0.14, type: "triangle" },
          ],
          0.08,
        );
        break;
      case "refill":
        this.sequence(
          [
            { frequency: 220, delay: 0, duration: 0.08 },
            { frequency: 330, delay: 0.09, duration: 0.08 },
            { frequency: 440, delay: 0.18, duration: 0.12 },
          ],
          0.08,
        );
        break;
      case "toggleOff":
        this.tone({ frequency: 180, duration: 0.09, type: "sawtooth", gain: 0.05, bus: "ui" });
        break;
      case "wildExpand":
        this.sequence(
          [
            { frequency: 220, delay: 0, duration: 0.08, type: "sawtooth" },
            { frequency: 330, delay: 0.07, duration: 0.09, type: "triangle" },
            { frequency: 660, delay: 0.16, duration: 0.16, type: "triangle" },
          ],
          0.07,
        );
        this.noiseBurst({ delay: 0.04, duration: 0.2, gain: 0.018, filterFrequency: 1100 });
        break;
      case "wildSymbol":
        this.sequence(
          [
            { frequency: 260, delay: 0, duration: 0.07, type: "sawtooth" },
            { frequency: 390, delay: 0.06, duration: 0.08, type: "triangle" },
            { frequency: 780, delay: 0.14, duration: 0.12, type: "triangle" },
          ],
          0.06,
        );
        this.noiseBurst({ delay: 0.03, duration: 0.16, gain: 0.016, filterFrequency: 1300 });
        break;
      case "scatterTease":
        this.sequence(
          [
            { frequency: 420, delay: 0, duration: 0.07, type: "triangle" },
            { frequency: 530, delay: 0.08, duration: 0.08, type: "triangle" },
            { frequency: 700, delay: 0.18, duration: 0.1, type: "square" },
          ],
          0.055,
        );
        break;
      case "paylineTrace":
        this.sequence(
          [
            { frequency: 680, delay: 0, duration: 0.035, type: "triangle" },
            { frequency: 880, delay: 0.035, duration: 0.04, type: "triangle" },
            { frequency: 1120, delay: 0.075, duration: 0.055, type: "triangle" },
          ],
          0.038,
        );
        break;
      case "coinPop":
        this.sequence(
          [
            { frequency: 1180, delay: 0, duration: 0.04, type: "triangle" },
            { frequency: 1480, delay: 0.035, duration: 0.05, type: "triangle" },
          ],
          0.045,
        );
        break;
      case "cascadeImpact":
        this.noiseBurst({ delay: 0, duration: 0.14, gain: 0.024, filterFrequency: 900 });
        this.tone({ frequency: 150, duration: 0.08, type: "triangle", gain: 0.045 });
        break;
      case "cascadeChain":
        this.arpeggio([392, 523.25, 659.25, 880, 1174.66], 0.055, 0.062);
        break;
      case "nearMiss":
        this.sequence(
          [
            { frequency: 620, delay: 0, duration: 0.08, type: "triangle" },
            { frequency: 500, delay: 0.09, duration: 0.1, type: "triangle" },
            { frequency: 360, delay: 0.2, duration: 0.12, type: "sawtooth" },
          ],
          0.042,
        );
        break;
      case "gridPulse":
        this.noiseBurst({ delay: 0, duration: 0.22, gain: 0.032, filterFrequency: 1300 });
        this.arpeggio([261.63, 392, 523.25, 783.99], 0.085, 0.07);
        break;
      default:
        this.tone({ frequency: 500, duration: 0.04, type: "sine", gain: 0.035 });
        break;
    }
  }

  isRateLimited(name: string, now: number): boolean {
    const limits = {
      tick: 0.035,
      button: 0.04,
      bet: 0.06,
      paylineTrace: 0.045,
      coinPop: 0.055,
      cascadeImpact: 0.075,
      cascadeChain: 0.35,
      gridPulse: 0.16,
      smallWin: 0.55,
      win: 0.55,
      bigWin: 2.2,
      megaWin: 2.8,
      jackpot: 3.2,
      fireworks: 3.2,
    };
    const minGap = (limits as Record<string, number>)[name] ?? 0;
    const last = this.lastPlayedAt.get(name) ?? -Infinity;

    if (now - last < minGap) {
      return true;
    }

    this.lastPlayedAt.set(name, now);
    return false;
  }

  tone({
    frequency,
    duration,
    type = "sine",
    gain = 0.05,
    delay = 0,
    bus = "sfx",
  }: ToneOptions): void {
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(envelope);
    envelope.connect(this.buses[bus] ?? this.buses.sfx);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  sequence(notes: ToneNote[], gain: number, bus: AudioBus = "sfx"): void {
    for (const note of notes) {
      this.tone({
        frequency: note.frequency,
        duration: note.duration,
        delay: note.delay,
        type: note.type ?? "triangle",
        gain,
        bus,
      });
    }
  }

  arpeggio(frequencies: number[], gap: number, gain: number): void {
    frequencies.forEach((frequency, index) => {
      this.tone({
        frequency,
        delay: index * gap,
        duration: 0.12,
        type: index % 2 === 0 ? "triangle" : "square",
        gain,
      });
    });
  }

  fireworks(): void {
    this.noiseBurst({ delay: 0, duration: 0.28, gain: 0.035, filterFrequency: 1900 });
    this.noiseBurst({ delay: 0.22, duration: 0.34, gain: 0.032, filterFrequency: 2600 });
    this.noiseBurst({ delay: 0.46, duration: 0.38, gain: 0.028, filterFrequency: 3200 });
    this.arpeggio([880, 1174.66, 1567.98, 2093], 0.12, 0.045);
  }

  noiseBurst({
    delay = 0,
    duration = 0.22,
    gain = 0.03,
    filterFrequency = 2200,
  }: NoiseBurstOptions = {}): void {
    const sampleRate = this.context.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.context.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      const decay = 1 - index / frameCount;
      data[index] = (Math.random() * 2 - 1) * decay * decay;
    }

    const now = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFrequency, now);
    filter.Q.setValueAtTime(2.8, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.buses.sfx);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  spinSweep(): void {
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(160, now);
    oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.28);
    oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.55);

    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

    oscillator.connect(envelope);
    envelope.connect(this.buses.sfx);
    oscillator.start(now);
    oscillator.stop(now + 0.62);
  }
}
