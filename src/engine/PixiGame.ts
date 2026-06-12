import "pixi.js/unsafe-eval";
import {
  Application,
  BitmapText,
  BlurFilter,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { GAME_CONFIG } from "../config/game.config";
import {
  HEADER_LAYOUT,
  V2_BOARD_LAYOUT,
  V2_GRID_FRAME_SLOTS_LAYOUT,
} from "../config/layout.config";
import { UI_CONFIG } from "../config/ui.config";
import { createDebugSpinResult } from "../logic/debugScenarios";
import { deriveGridEffectEvents } from "../logic/gridEffects";
import { createGridEffectPreset, type GridEffectPreset } from "../logic/gridEffects.presets";
import { SlotGameEngine } from "../logic/SlotGameEngine";
import { getSymbolVisualVariant, SYMBOLS, type SymbolDefinition } from "../logic/symbols";
import { SoundSystem } from "../sound-system";
import { useAudioStore } from "../store/audioStore";
import { getActiveDebugScenario, useGameStore } from "../store/gameStore";
import { useUiStore } from "../store/uiStore";
import type {
  DebugScenarioMode,
  GameStatus,
  GridEffectEvent,
  GridEffectEventType,
  SpinStep,
  SymbolId,
  WinningSymbol,
} from "../types/game.types";
import { computeDesignViewport } from "../utils/designViewport";
import {
  type DevicePerformanceClass,
  getAdaptiveCanvasResolution,
  getBrowserDevicePerformanceClass,
} from "../utils/deviceQuality";
import { computeLayoutViewportOffset, readLayoutViewportSize } from "../utils/layoutViewport";
import {
  loadDeliverySceneManifest,
  loadDeliverySprite,
  loadDeliverySymbolTextures,
} from "./deliveryAssets";
import {
  createLandingSymbolSchedule,
  createWeightedReelSymbolPicker,
  getNextTrackBoundaryRows,
} from "./reelTape";
import {
  selectWildDramaColumn,
  WILD_REEL_CLEAR_DURATION_MS,
  WILD_REEL_SEQUENCE_ASPECT_RATIO,
  WILD_REEL_SEQUENCE_SOUND_EVENT,
  WILD_REEL_SEQUENCE_START_DELAY_MS,
  WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS,
  WILD_SYMBOL_TEXT_OFFSET_Y,
} from "./wildReelFeature";
import {
  BIG_WIN_SEQUENCE_DURATION_MS,
  formatCelebrationAmount,
  getSpinWinStatus,
  getWinCelebrationTier,
  JACKPOT_SEQUENCE_DURATION_MS,
  JACKPOT_SEQUENCE_FADE_OUT_MS,
  JACKPOT_SEQUENCE_HOLD_MS,
  JACKPOT_SEQUENCE_START_DELAY_MS,
  LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS,
  LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS,
  LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS,
  LEGENDARY_JACKPOT_SOUND_DELAY_MS,
  WIN_CELEBRATION_CONFETTI_COLORS,
  WIN_CELEBRATION_DURATIONS_MS,
  type WinCelebrationTier,
} from "./winCelebrationEffects";
import {
  GOLD_NUMBER_FONT_FACE,
  LEGENDARY_JACKPOT_MUSIC_DUCK_DURATION_MS,
  WIN_CELEBRATION_MUSIC_DUCK_DURATIONS_MS,
  WIN_IMAGE_WIDTH,
} from "./winSequenceAssets";

const GRID_WIDTH =
  (GAME_CONFIG.grid.columns - 1) * GAME_CONFIG.grid.cellStep + GAME_CONFIG.grid.cellSize;
const GRID_HEIGHT =
  (GAME_CONFIG.grid.rows - 1) * GAME_CONFIG.grid.cellStep + GAME_CONFIG.grid.cellSize;
const BOARD_GRID_Y = 34;
const MOBILE_BOARD_VISUAL_WIDTH = 568;
const BOARD_SCALE = V2_BOARD_LAYOUT.width / MOBILE_BOARD_VISUAL_WIDTH;
const SYMBOL_SIZE = 104;
const SYMBOL_CELL_CENTER = GAME_CONFIG.grid.cellSize / 2;
const SYMBOL_SHADOW_ALPHA = 0.36;
const SYMBOL_SHADOW_OFFSET_X = 4;
const SYMBOL_SHADOW_OFFSET_Y = 7;
const SYMBOL_SHADOW_SCALE = 1.035;
const REEL_BLUR_STRENGTH = 1.2;
const REEL_SPIN_ALPHA = 0.92;
const REEL_VISIBLE_ROWS = GAME_CONFIG.grid.rows;
const REEL_BUFFER_ROWS = 3;
const REEL_TRACK_ROWS = REEL_VISIBLE_ROWS + REEL_BUFFER_ROWS;
const REEL_TARGET_SPIN_DURATION_MS = 4100;
const REEL_BASE_FRAME_MS = REEL_TARGET_SPIN_DURATION_MS / 100;
const REEL_FRAME_MS = 1000 / 60;
const REEL_FRAME_RATE_SCALE = REEL_BASE_FRAME_MS / REEL_FRAME_MS;
const REEL_STEP_SCALE = REEL_FRAME_MS / REEL_BASE_FRAME_MS;
const REEL_TICK_FRAME_INTERVAL = Math.round(4 * REEL_FRAME_RATE_SCALE);
const REEL_PRESPIN_FRAMES = Math.round(34 * REEL_FRAME_RATE_SCALE);
const REEL_STOP_FRAMES = Math.round(7 * REEL_FRAME_RATE_SCALE);
const REEL_FINAL_REVEAL_FRAMES = Math.max(1, Math.round(2 * REEL_FRAME_RATE_SCALE));
const REEL_LANDING_FRAMES = Math.round(5 * REEL_FRAME_RATE_SCALE);
const REEL_STOP_SEQUENCE_DELAY_MS = 30;
const REEL_WEIGHT_SHIFT_RATIO = 0.2;
const REEL_START_PULLBACK_FRAMES = Math.round(4 * REEL_FRAME_RATE_SCALE);
const REEL_PRESPIN_STEP_PX = 88 * REEL_STEP_SCALE;
const REEL_STOP_ROLL_STEP_PX = 78 * REEL_STEP_SCALE;
const REEL_LANDING_ROLL_STEP_PX = 70 * REEL_STEP_SCALE;
const CASCADE_REEL_REFRESH_FRAMES = Math.round(10 * REEL_FRAME_RATE_SCALE);
const CASCADE_REEL_REFRESH_STEP_PX = 82 * REEL_STEP_SCALE;
const SYMBOL_WIN_FRAME_MS = 72;
const WIN_CASCADE_HOLD_MS = 650;
const NO_WIN_CASCADE_HOLD_MS = 180;
const WIN_EFFECT_DURATION_MS = 1500;
const WIN_GRID_EFFECT_COLORS = [0xffd36b, 0xfff0a3, 0xffb21f, 0xed254e] as const;
const BIG_WIN_BOARD_SHAKE_DURATION_MS = 420;
const BIG_WIN_BOARD_SHAKE_MAGNITUDE = 12;
const CELEBRATION_CENTER_X = GRID_WIDTH / 2;
const CELEBRATION_CENTER_Y = BOARD_GRID_Y + GRID_HEIGHT / 2;
const WIN_IMAGE_Y = CELEBRATION_CENTER_Y - 78;
const WIN_AMOUNT_OFFSET_Y = 92;
const JACKPOT_AMOUNT_OFFSET_Y = 112;
const WIN_AMOUNT_FONT_SIZE = 60;
const BIG_WIN_AMOUNT_FONT_SIZE = 78;
const WIN_AMOUNT_GLOW_RADIUS = 126;
const BIG_WIN_AMOUNT_GLOW_RADIUS = 168;
const HUD_TYPEFACE = "Arial";
const HUD_LABEL_GOLD = 0xf8c048;
const HUD_LABEL_STROKE = 0x441006;
const GRID_SEPARATOR_Z_INDEX = 3;
const GRID_SEPARATOR_COLOR = HUD_LABEL_GOLD;
const GRID_SEPARATOR_ALPHA = 0.62;
const GRID_SEPARATOR_WIDTH = 10;
const GRID_SEPARATOR_CAP_HEIGHT = 18;
const GRID_SEPARATOR_TOP_OFFSET = Math.round(GAME_CONFIG.grid.cellSize * 0.05);
const GRID_SEPARATOR_HEIGHT = GRID_HEIGHT - GRID_SEPARATOR_TOP_OFFSET * 2;
const REEL_LOCK_FLASH_DURATION_MS = 180;
const REEL_SPIN_LOOP_SOUND_EVENT = "slotReel";
type SpinMode = 1 | 2 | 3;
interface SpinFrameProfile {
  preSpinFrames: number;
  stopFrames: number;
  finalRevealFrames: number;
  landingFrames: number;
}

interface ReelSpinOptions {
  wildDramaColumn?: number | null;
}

const SPIN_MODE_SPEED_MULTIPLIERS: Record<SpinMode, number> = {
  1: 0.88,
  2: 0.8,
  3: 0.72,
};
const SPIN_MODE_FRAME_PROFILES: Record<SpinMode, SpinFrameProfile> = {
  1: {
    preSpinFrames: REEL_PRESPIN_FRAMES,
    stopFrames: REEL_STOP_FRAMES,
    finalRevealFrames: REEL_FINAL_REVEAL_FRAMES,
    landingFrames: REEL_LANDING_FRAMES,
  },
  2: {
    preSpinFrames: REEL_PRESPIN_FRAMES - Math.round(8 * REEL_FRAME_RATE_SCALE),
    stopFrames: REEL_STOP_FRAMES - Math.round(2 * REEL_FRAME_RATE_SCALE),
    finalRevealFrames: REEL_FINAL_REVEAL_FRAMES,
    landingFrames: REEL_LANDING_FRAMES - Math.round(REEL_FRAME_RATE_SCALE),
  },
  3: {
    preSpinFrames: REEL_PRESPIN_FRAMES - Math.round(14 * REEL_FRAME_RATE_SCALE),
    stopFrames: REEL_STOP_FRAMES - Math.round(3 * REEL_FRAME_RATE_SCALE),
    finalRevealFrames: REEL_FINAL_REVEAL_FRAMES - Math.round(REEL_FRAME_RATE_SCALE),
    landingFrames: REEL_LANDING_FRAMES - Math.round(2 * REEL_FRAME_RATE_SCALE),
  },
};
const REEL_BLUR_STRENGTH_BY_SPIN_MODE: Record<SpinMode, number> = {
  1: 1.2,
  2: 2,
  3: 2.7,
};
type WinningSymbolLine = WinningSymbol["positions"];
type ReelStopSoundEvent = "reelStop1" | "reelStop2" | "reelStop3" | "reelStop4" | "reelStop5";
type SlotLoseSoundEvent = "slotLose1" | "slotLose2";
type CelebrationNode = Container | Graphics | Sprite | Text | BitmapText;

function normalizeSpinMode(mode: number): SpinMode {
  if (mode >= 3) {
    return 3;
  }
  if (mode >= 2) {
    return 2;
  }
  return 1;
}

interface AnimatedSpriteRecord {
  sprite: Sprite;
  shadow?: Sprite;
  textures: Texture[];
  frame: number;
  elapsedMs: number;
  intervalMs: number;
}

interface SymbolPosition {
  x: number;
  y: number;
}

interface ReelBufferCell {
  cell: Container;
  sprite: Sprite;
  shadow: Sprite;
  frame: Graphics;
  text: Text;
  frameSymbolId: SymbolId | null;
}

interface SymbolRenderInfo {
  symbol: SymbolDefinition;
  atlasBase: string;
  texturePath?: string;
  label: string;
  offsetX: number;
  offsetY: number;
}

interface WinningEffectRecord {
  graphic: Graphics;
  index: number;
  elapsedMs: number;
  durationMs: number;
}

interface WinningSymbolAnimationRecord {
  textures: Texture[];
  frame: number;
  elapsedMs: number;
  motion?: "frames" | "float";
  originSpriteX?: number;
  originSpriteY?: number;
  originShadowX?: number;
  originShadowY?: number;
}

interface GridEffectRecord {
  graphic: Graphics;
  type: GridEffectEventType;
  elapsedMs: number;
  durationMs: number;
}

type WinCelebrationMotion =
  | "fade"
  | "pop"
  | "winBannerPop"
  | "float"
  | "amountFloat"
  | "amountGlow"
  | "confetti"
  | "sequence";

interface WinCelebrationElementRecord {
  node: CelebrationNode;
  motion: WinCelebrationMotion;
  originX: number;
  originY: number;
  baseScaleX: number;
  baseScaleY: number;
  delayMs: number;
  sequenceTextures?: Texture[];
  sequenceDurationMs?: number;
  fadeOutDurationMs?: number;
  sequenceHoldDurationMs?: number;
}

interface WinCelebrationRecord {
  container: Container;
  tier: WinCelebrationTier;
  elapsedMs: number;
  durationMs: number;
  elements: WinCelebrationElementRecord[];
}

export class PixiGame {
  private readonly host: HTMLElement;
  private readonly engine = new SlotGameEngine();
  private readonly sound = new SoundSystem();
  private readonly app = new Application();
  private readonly board = new Container();
  private readonly gridSeparatorLayer = new Container();
  private readonly reelsLayer = new Container();
  private readonly reelsMask = new Graphics();
  private readonly designMask = new Graphics();
  private readonly effectsLayer = new Container();
  private readonly celebrationLayer = new Container();
  private readonly reelColumns: Container[] = [];
  private readonly reelBlurFilters: BlurFilter[] = [];
  private readonly reelBufferCells: ReelBufferCell[][] = [];
  private readonly reelColumnOffsets = Array.from({ length: GAME_CONFIG.grid.columns }, () => 0);
  private readonly reelColumnTravelOffsets = Array.from(
    { length: GAME_CONFIG.grid.columns },
    () => 0,
  );
  private readonly reelTrackCellCycles: number[][] = [];
  private readonly reelRecycleSeeds = Array.from({ length: GAME_CONFIG.grid.columns }, () => 0);
  private readonly reelLandingSymbolSchedules = Array.from(
    { length: GAME_CONFIG.grid.columns },
    () => new Map<number, SymbolId>(),
  );
  private readonly reelRecentTapeSymbols = Array.from(
    { length: GAME_CONFIG.grid.columns },
    () => [] as SymbolId[],
  );
  private readonly pickReelTapeSymbol = createWeightedReelSymbolPicker(SYMBOLS);
  private readonly symbolCells: Container[] = [];
  private readonly symbolSprites: Sprite[] = [];
  private readonly symbolShadowSprites: Sprite[] = [];
  private readonly symbolFrameGraphics: Graphics[] = [];
  private readonly symbolFrameSymbolIds: Array<SymbolId | null> = [];
  private readonly symbolTexts: Text[] = [];
  private readonly wildSymbolTextSprites: Sprite[] = [];
  private readonly gridStatusTexts: Text[] = [];
  private readonly symbolBasePositions: SymbolPosition[] = [];
  private readonly symbolVariantSeeds: number[] = [];
  private readonly symbolTextures = new Map<string, Texture>();
  private readonly symbolAnimationTextures = new Map<string, Texture[]>();
  private readonly animatedSprites: AnimatedSpriteRecord[] = [];
  private readonly winningEffects: WinningEffectRecord[] = [];
  private readonly gridEffects: GridEffectRecord[] = [];
  private readonly winCelebrations: WinCelebrationRecord[] = [];
  private bigWinSequenceTextures: Texture[] = [];
  private jackpotSequenceTextures: Texture[] = [];
  private legendaryJackpotSequenceTextures: Texture[] = [];
  private wildReelSequenceTextures: Texture[] = [];
  private wildSymbolWinTextures: Texture[] = [];
  private wildSymbolTextTexture: Texture | null = null;
  private readonly winningSymbolAnimations = new Map<number, WinningSymbolAnimationRecord>();
  private readonly activeWinningIndices = new Set<number>();
  private currentBoard: SymbolId[] = [];
  private boardBasePosition = { x: V2_BOARD_LAYOUT.x, y: V2_BOARD_LAYOUT.y };
  private boardShake = { elapsedMs: 0, durationMs: 0, magnitude: 0 };
  private resizeObserver: ResizeObserver | null = null;
  private resizeHandler = () => this.resize();
  private spinning = false;
  private spinMode: SpinMode = 1;
  private devicePerformanceClass: DevicePerformanceClass = "high";
  private vibrationEnabled = true;
  private animationsEnabled = true;
  private visualEffectsEnabled = true;
  private reducedEffects = false;
  private symbolsDirty = true;
  private reelMotionActive = false;
  private goldNumberFontLoaded = false;
  private gameStoreUnsubscribe: (() => void) | null = null;
  private loadingScreenMusicRequested = false;
  private loadingMusicGestureCleanup: (() => void) | null = null;
  private deliveryBoardSprite: Sprite | null = null;
  private destroyed = false;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  async mount(): Promise<void> {
    this.destroyed = false;
    const setLoadingProgress = (progress: number) =>
      useUiStore.getState().setLoadingProgress(progress);
    setLoadingProgress(1);
    this.devicePerformanceClass = getBrowserDevicePerformanceClass();
    if (this.devicePerformanceClass === "low") {
      this.setReducedEffects(true);
    }
    await this.app.init({
      backgroundAlpha: 0,
      width: Math.max(1, this.host.clientWidth || window.innerWidth),
      height: Math.max(1, this.host.clientHeight || window.innerHeight),
      autoDensity: true,
      antialias: false,
      resolution: getAdaptiveCanvasResolution({
        devicePixelRatio: window.devicePixelRatio || 1,
        maxDevicePixelRatio: UI_CONFIG.canvas.maxDevicePixelRatio,
        performanceClass: this.devicePerformanceClass,
      }),
      powerPreference: "high-performance",
    });
    setLoadingProgress(10);

    this.host.appendChild(this.app.canvas);
    this.app.stage.sortableChildren = true;
    this.designMask.rect(0, 0, UI_CONFIG.design.width, UI_CONFIG.design.height).fill(0xffffff);
    this.app.stage.addChild(this.designMask);
    this.app.stage.mask = this.designMask;
    this.app.ticker.add(this.animateSequences, this);
    setLoadingProgress(18);
    const symbolTexturesReady = this.loadSymbolTextures((loaded, total) => {
      const atlasProgress = total > 0 ? loaded / total : 0;
      setLoadingProgress(58 + Math.round(atlasProgress * 28));
    });
    await this.createScene();
    this.subscribeGridStatusText();
    setLoadingProgress(55);
    this.resize();

    window.addEventListener("resize", this.resizeHandler, { passive: true });
    this.resizeObserver =
      typeof ResizeObserver === "function" ? new ResizeObserver(this.resizeHandler) : null;
    this.resizeObserver?.observe(this.host);

    this.renderBoard(this.engine.createInitialBoard());
    await symbolTexturesReady;
    setLoadingProgress(88);
    await this.preloadCriticalPrizeAssets((loaded, total) => {
      setLoadingProgress(88 + Math.round((loaded / total) * 10));
    });
    setLoadingProgress(98);
    if (!this.destroyed && this.currentBoard.length > 0) {
      this.renderBoard(this.currentBoard);
    }
    useGameStore.getState().setStatus("idle");
    useAudioStore.getState().setMusicMuted(this.sound.musicMuted);
    useAudioStore.getState().setSfxMuted(this.sound.sfxMuted);
    useAudioStore.getState().setVolume(this.sound.volume);
    setLoadingProgress(100);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.clearGridEffects();
    this.clearWinCelebrations();
    this.sound.stopAllLoopingEvents();
    this.clearLoadingMusicGestureFallback();
    this.gameStoreUnsubscribe?.();
    this.gameStoreUnsubscribe = null;
    window.removeEventListener("resize", this.resizeHandler);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    try {
      this.app.ticker?.remove(this.animateSequences, this);
    } catch (error) {
      console.warn("No se pudo remover el ticker Pixi durante destroy.", error);
    }

    const canvas = this.app.canvas;
    if (canvas?.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }

    try {
      this.app.destroy(true, { children: true, texture: false });
    } catch (error) {
      console.warn("No se pudo destruir Pixi limpiamente.", error);
    }
  }

  increaseBet(): void {
    const store = useGameStore.getState();
    const levels: readonly number[] = GAME_CONFIG.betting.levels;
    const index = levels.indexOf(store.bet);
    store.setBet(Number(levels[Math.min(levels.length - 1, Math.max(0, index + 1))]));
  }

  decreaseBet(): void {
    const store = useGameStore.getState();
    const levels: readonly number[] = GAME_CONFIG.betting.levels;
    const index = levels.indexOf(store.bet);
    store.setBet(Number(levels[Math.max(0, index - 1)]));
  }

  async unlockAudio(): Promise<boolean> {
    return this.unlockAudioInternal({ awaitMusicStart: false });
  }

  startMusicAfterLoadingScreen(): void {
    if (this.destroyed || this.sound.musicMuted) {
      return;
    }

    this.loadingScreenMusicRequested = true;
    this.installLoadingMusicGestureFallback();
    void this.tryStartLoadingScreenMusic();
  }

  private async tryStartLoadingScreenMusic(): Promise<void> {
    if (this.destroyed || this.sound.musicMuted) {
      this.loadingScreenMusicRequested = false;
      this.clearLoadingMusicGestureFallback();
      return;
    }

    try {
      const started = await this.unlockAudioInternal({ awaitMusicStart: true });
      if (started) {
        this.loadingScreenMusicRequested = false;
        this.clearLoadingMusicGestureFallback();
      }
    } catch {
      // Browser autoplay policy may require the gesture fallback below.
    }
  }

  private installLoadingMusicGestureFallback(): void {
    if (this.loadingMusicGestureCleanup || this.destroyed) {
      return;
    }

    const retry = () => {
      if (!this.loadingScreenMusicRequested) {
        return;
      }

      void this.tryStartLoadingScreenMusic();
    };
    const listenerOptions = { capture: true, passive: true };
    window.addEventListener("pointerdown", retry, listenerOptions);
    window.addEventListener("keydown", retry, listenerOptions);
    this.loadingMusicGestureCleanup = () => {
      window.removeEventListener("pointerdown", retry, listenerOptions);
      window.removeEventListener("keydown", retry, listenerOptions);
    };
  }

  private clearLoadingMusicGestureFallback(): void {
    this.loadingMusicGestureCleanup?.();
    this.loadingMusicGestureCleanup = null;
  }

  private async unlockAudioInternal({
    awaitMusicStart,
  }: {
    awaitMusicStart: boolean;
  }): Promise<boolean> {
    const unlocked = await this.sound.unlock();
    useAudioStore.getState().setUnlocked(unlocked);
    if (!unlocked) {
      return false;
    }

    await this.sound.preloadAudio({ preset: "startup" });
    if (!this.sound.musicMuted) {
      const musicStarted = this.sound.startMusic("base");
      if (awaitMusicStart) {
        return musicStarted;
      }
      void musicStarted;
    }
    return true;
  }

  setAudioMuted(bus: "music" | "sfx", muted: boolean): void {
    if (bus === "music") {
      this.sound.setMusicMuted(muted);
      useAudioStore.getState().setMusicMuted(this.sound.musicMuted);
      if (!this.sound.musicMuted) {
        void this.unlockAudio();
      }
      return;
    }

    this.sound.setSfxMuted(muted);
    useAudioStore.getState().setSfxMuted(this.sound.sfxMuted);
  }

  setAudioVolume(volume: number): void {
    this.sound.setVolume(volume);
    useAudioStore.getState().setVolume(this.sound.volume);
  }

  setSpinMode(mode: SpinMode): void {
    this.spinMode = normalizeSpinMode(mode);
  }

  setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
  }

  setAnimationsEnabled(enabled: boolean): void {
    this.animationsEnabled = enabled;
    this.resetAnimationState();
  }

  setVisualEffectsEnabled(enabled: boolean): void {
    this.visualEffectsEnabled = enabled;
    this.effectsLayer.visible = enabled;
    this.celebrationLayer.visible = enabled;
    if (!enabled) {
      this.clearGridEffects();
      this.clearWinningEffects();
      this.clearWinCelebrations();
      this.clearBoardShake();
    }
  }

  setReducedEffects(enabled: boolean): void {
    this.reducedEffects = enabled;
    if (enabled) {
      this.clearGridEffects();
      this.clearWinCelebrations();
      this.resetReelBlurFilters();
      this.clearBoardShake();
    }
  }

  private resetAnimationState(): void {
    this.resetAnimatedSpritesToInitialFrames();
    this.clearWinningSymbolAnimations();
    this.clearWinningEffects();
    this.clearGridEffects();
    this.clearWinCelebrations();
    this.clearBoardShake();
    this.resetIdleSymbolsToStaticPositions();
  }

  private resetAnimatedSpritesToInitialFrames(): void {
    for (const record of this.animatedSprites) {
      record.frame = 0;
      record.elapsedMs = 0;
      const texture = record.textures[0];
      if (!texture) {
        continue;
      }
      record.sprite.texture = texture;
      const shadow = record.shadow;
      if (shadow) {
        shadow.texture = texture;
      }
    }
  }

  setTurboMode(enabled: boolean): void {
    this.setSpinMode(enabled ? 3 : 1);
  }

  getAudioSettings(): {
    musicMuted: boolean;
    sfxMuted: boolean;
    unlocked: boolean;
    volume: number;
  } {
    return {
      musicMuted: this.sound.musicMuted,
      sfxMuted: this.sound.sfxMuted,
      unlocked: this.sound.unlocked,
      volume: this.sound.volume,
    };
  }

  playSoundEvent(name: string): void {
    void this.unlockAudio()
      .then((unlocked) => {
        if (unlocked) {
          this.sound.play(name);
        }
      })
      .catch(() => {
        // Audio unlock is opportunistic; gameplay must never wait on browser audio policy.
      });
  }

  private getFinalSpinStatus(
    result: { freeSpinsAwarded: number; jackpotAward?: unknown },
    totalWin: number,
    bet: number,
  ): GameStatus {
    if (result.jackpotAward) {
      return "megaWin";
    }
    if (totalWin <= 0 && result.freeSpinsAwarded > 0) {
      return "freeSpins";
    }
    return getSpinWinStatus(totalWin, bet);
  }

  private shouldSuppressWildReelDrama(celebrationTier: WinCelebrationTier | null): boolean {
    return celebrationTier === "bigWin" || celebrationTier === "jackpot";
  }

  private shouldPlayWildCompleteDrama(
    debugScenarioMode: DebugScenarioMode | null,
    celebrationTier: WinCelebrationTier | null,
  ): boolean {
    return (
      debugScenarioMode === "wildComplete" && !this.shouldSuppressWildReelDrama(celebrationTier)
    );
  }

  private shouldPlaySlotLoseSound(
    resolvedWin: number,
    freeSpinsAwarded: number,
    celebrationTier: WinCelebrationTier | null,
  ): boolean {
    return resolvedWin <= 0 && freeSpinsAwarded <= 0 && celebrationTier === null;
  }

  private getSlotLoseSoundEvent(): SlotLoseSoundEvent {
    return Math.random() < 0.5 ? "slotLose1" : "slotLose2";
  }

  async spin(): Promise<void> {
    if (this.spinning) {
      return;
    }

    this.spinning = true;
    const store = useGameStore.getState();
    store.setSpinBusy(true);
    try {
      this.clearGridEffects();
      this.clearWinCelebrations();
      this.playSoundEvent("spin");
      store.setStatus("spinning");
      store.setWin(0);
      store.incrementRoundNumber();

      const bet = store.bet;
      let balance = store.balance;
      const isFreeSpin = store.freeSpins > 0;
      if (isFreeSpin) {
        store.setFreeSpins(store.freeSpins - 1);
      } else if (balance < bet) {
        balance += GAME_CONFIG.betting.testRefillAmount;
        balance -= bet;
        store.setBalance(balance);
      } else {
        balance -= bet;
        store.setBalance(balance);
      }

      const debugScenarioMode = getActiveDebugScenario(store);
      const result = debugScenarioMode
        ? createDebugSpinResult(debugScenarioMode, { bet, tensionLevel: store.tensionLevel })
        : this.engine.spin({ bet, tensionLevel: store.tensionLevel });
      const gridEffectEvents = deriveGridEffectEvents(result, { bet });
      const visibleCascadeSteps = this.getVisibleCascadeSteps(result.steps);
      const firstStepBoard = visibleCascadeSteps[0]?.board ?? result.board;
      const resolvedWin = result.totalWin;
      const finalStatus = this.getFinalSpinStatus(result, resolvedWin, bet);
      const celebrationTier = getWinCelebrationTier({
        status: finalStatus,
        lastWin: resolvedWin,
        bet,
      });
      const wildDramaColumn = this.shouldPlayWildCompleteDrama(debugScenarioMode, celebrationTier)
        ? selectWildDramaColumn(firstStepBoard)
        : null;
      await this.animateReelSpin(firstStepBoard, { wildDramaColumn });
      await this.playCascadeSteps(visibleCascadeSteps, gridEffectEvents, {
        preserveInitialReelVisual: true,
      });
      store.setWin(resolvedWin);
      store.setBalance(balance + resolvedWin);
      store.setFreeSpins(useGameStore.getState().freeSpins + result.freeSpinsAwarded);
      store.setTensionLevel(result.nextTension);
      store.setStatus(finalStatus);
      if (celebrationTier) {
        this.playWinCelebration(celebrationTier, resolvedWin, {
          legendaryJackpot: Boolean(result.jackpotAward),
        });
        this.duckMusicForCelebration(celebrationTier, {
          legendaryJackpot: Boolean(result.jackpotAward),
        });
      }
      if (celebrationTier === "jackpot") {
        this.playJackpotCelebrationSound(Boolean(result.jackpotAward));
        this.triggerBoardShake(520, 10);
      } else if (celebrationTier === "bigWin") {
        this.sound.play("bigWin");
        this.triggerBoardShake(BIG_WIN_BOARD_SHAKE_DURATION_MS, BIG_WIN_BOARD_SHAKE_MAGNITUDE);
      } else if (celebrationTier === "win") {
        this.sound.play("smallWin");
        this.triggerBoardShake(220, 3);
      } else if (
        this.shouldPlaySlotLoseSound(resolvedWin, result.freeSpinsAwarded, celebrationTier)
      ) {
        this.sound.play(this.getSlotLoseSoundEvent());
      }
    } catch (error) {
      console.error("Fallo durante spin.", error);
      store.setStatus("error");
    } finally {
      this.spinning = false;
      store.setSpinBusy(false);
    }
  }

  triggerLayoutTestState(type: "win" | "bigWin" | "jackpot"): void {
    const store = useGameStore.getState();
    const wins = {
      win: store.bet * 8,
      bigWin: store.bet * 60,
      jackpot: 250000,
    };
    const celebrationTier: WinCelebrationTier = type === "jackpot" ? "jackpot" : type;
    this.clearGridEffects();
    this.clearWinCelebrations();
    store.setWin(wins[type]);
    store.setStatus(type === "jackpot" ? "megaWin" : type);
    this.playSoundEvent(type === "jackpot" ? "jackpot" : type === "bigWin" ? "bigWin" : "smallWin");
    this.showWinSymbolMotion([0, 1, 2, 5, 6]);
    this.playWinCelebration(celebrationTier, wins[type]);
    this.duckMusicForCelebration(celebrationTier);
    const shakeDurationMs =
      type === "jackpot" ? 520 : type === "bigWin" ? BIG_WIN_BOARD_SHAKE_DURATION_MS : 260;
    const shakeMagnitude =
      type === "jackpot" ? 10 : type === "bigWin" ? BIG_WIN_BOARD_SHAKE_MAGNITUDE : 4;
    this.triggerBoardShake(shakeDurationMs, shakeMagnitude);
  }

  triggerGridEffectPreset(type: GridEffectPreset): void {
    void this.unlockAudio().then(() => {
      this.playGridEffectEvents(createGridEffectPreset(type));
    });
  }

  private getVisibleCascadeSteps(steps: SpinStep[]): SpinStep[] {
    if (steps.length <= 1) {
      return steps;
    }

    const lastStep = steps[steps.length - 1];
    const hasPreviousAward = steps.slice(0, -1).some((step) => this.isAwardedCascadeStep(step));

    if (lastStep && hasPreviousAward && !this.isAwardedCascadeStep(lastStep)) {
      return steps.slice(0, -1);
    }

    return steps;
  }

  private isAwardedCascadeStep(step: SpinStep): boolean {
    return step.win > 0 || step.freeSpinsAwarded > 0 || Boolean(step.jackpotAward);
  }

  private async preloadCriticalPrizeAssets(
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    onProgress?.(1, 1);
  }

  private async createScene(): Promise<void> {
    this.drawBackground();
    await this.drawDeliveryScene();
    this.drawTemplateBoard();
    this.createSymbolLayer();
  }

  private async drawDeliveryScene(): Promise<void> {
    const manifest = await loadDeliverySceneManifest();
    const sky = await loadDeliverySprite(manifest.assets.backgroundSky.src);
    this.coverDesignSprite(sky, 0);
    this.app.stage.addChild(sky);

    const city = await loadDeliverySprite(manifest.assets.backgroundCity.src);
    this.coverDesignSprite(city, 1);
    this.app.stage.addChild(city);

    const cloud = await loadDeliverySprite(manifest.assets.cloud.src);
    cloud.position.set(UI_CONFIG.design.width / 2, 180);
    cloud.width = UI_CONFIG.design.width;
    cloud.height = Math.round(UI_CONFIG.design.width * 0.55);
    cloud.alpha = 0.72;
    cloud.zIndex = 2;
    this.app.stage.addChild(cloud);

    const title = await loadDeliverySprite(manifest.assets.title.src);
    title.position.set(UI_CONFIG.design.width / 2 + 92, 222);
    title.width = 650;
    title.height = 488;
    title.zIndex = 12;
    this.app.stage.addChild(title);

    const riderFrame = manifest.motorizado.frames[0];
    if (riderFrame) {
      const rider = await loadDeliverySprite(riderFrame);
      rider.position.set(210, 505);
      rider.width = 360;
      rider.height = 640;
      rider.zIndex = 8;
      this.app.stage.addChild(rider);
    }

    this.deliveryBoardSprite = await loadDeliverySprite(manifest.assets.board.src);
  }

  private coverDesignSprite(sprite: Sprite, zIndex: number): void {
    const sourceWidth = sprite.texture.width || UI_CONFIG.design.width;
    const sourceHeight = sprite.texture.height || UI_CONFIG.design.height;
    const scale = Math.max(
      UI_CONFIG.design.width / sourceWidth,
      UI_CONFIG.design.height / sourceHeight,
    );
    sprite.position.set(UI_CONFIG.design.width / 2, UI_CONFIG.design.height / 2);
    sprite.width = sourceWidth * scale;
    sprite.height = sourceHeight * scale;
    sprite.zIndex = zIndex;
  }

  private drawBackground(): void {
    const background = new Graphics()
      .rect(0, 0, UI_CONFIG.design.width, UI_CONFIG.design.height)
      .fill(0x050506)
      .rect(0, 0, UI_CONFIG.design.width, HEADER_LAYOUT.baseHeight)
      .fill(0x120706)
      .rect(0, HEADER_LAYOUT.baseHeight, UI_CONFIG.design.width, 1040)
      .fill(0x07090e)
      .rect(0, 1492, UI_CONFIG.design.width, 428)
      .fill(0x000000);
    background.zIndex = 0;
    this.app.stage.addChild(background);
  }

  private drawTemplateBoard(): void {
    this.board.position.set(V2_BOARD_LAYOUT.x, V2_BOARD_LAYOUT.y);
    this.boardBasePosition = { x: V2_BOARD_LAYOUT.x, y: V2_BOARD_LAYOUT.y };
    this.board.scale.set(BOARD_SCALE);
    this.board.zIndex = V2_BOARD_LAYOUT.zIndex ?? 10;
    this.board.sortableChildren = true;
    this.app.stage.addChild(this.board);

    if (this.deliveryBoardSprite) {
      this.deliveryBoardSprite.position.set(GRID_WIDTH / 2, BOARD_GRID_Y + GRID_HEIGHT / 2 + 18);
      this.deliveryBoardSprite.width = 620;
      this.deliveryBoardSprite.height = 620;
      this.deliveryBoardSprite.zIndex = 1;
      this.board.addChild(this.deliveryBoardSprite);
    }

    const boardBackground = new Graphics()
      .roundRect(0, BOARD_GRID_Y, GRID_WIDTH, GRID_HEIGHT, 18)
      .fill({ color: 0x111415, alpha: 0.68 });
    boardBackground.zIndex = 2;
    this.board.addChild(boardBackground);

    this.drawGridNeedleSeparators();
    this.setupReelsLayer();
    const boardFrame = new Graphics()
      .roundRect(
        V2_GRID_FRAME_SLOTS_LAYOUT.x,
        V2_GRID_FRAME_SLOTS_LAYOUT.y,
        V2_GRID_FRAME_SLOTS_LAYOUT.width,
        V2_GRID_FRAME_SLOTS_LAYOUT.height,
        24,
      )
      .stroke({ color: 0x100807, width: 4, alpha: 0.45 });
    boardFrame.zIndex = 9;
    this.board.addChild(boardFrame);

    this.drawCascadeLabel();
    this.effectsLayer.zIndex = 7;
    this.effectsLayer.sortableChildren = true;
    this.reelsLayer.addChild(this.effectsLayer);
    this.setupCelebrationLayer();
  }

  private drawGridNeedleSeparators(): void {
    this.gridSeparatorLayer.removeChildren().forEach((child) => {
      child.destroy();
    });
    this.gridSeparatorLayer.position.set(0, BOARD_GRID_Y + GRID_SEPARATOR_TOP_OFFSET);
    this.gridSeparatorLayer.zIndex = GRID_SEPARATOR_Z_INDEX;

    for (let column = 1; column < GAME_CONFIG.grid.columns; column += 1) {
      const x = column * GAME_CONFIG.grid.cellStep - GRID_SEPARATOR_WIDTH / 2;
      const needle = new Graphics();
      needle.moveTo(GRID_SEPARATOR_WIDTH / 2, 0);
      needle.lineTo(GRID_SEPARATOR_WIDTH * 0.68, GRID_SEPARATOR_CAP_HEIGHT);
      needle.lineTo(GRID_SEPARATOR_WIDTH * 0.6, GRID_SEPARATOR_HEIGHT / 2);
      needle.lineTo(GRID_SEPARATOR_WIDTH * 0.68, GRID_SEPARATOR_HEIGHT - GRID_SEPARATOR_CAP_HEIGHT);
      needle.lineTo(GRID_SEPARATOR_WIDTH / 2, GRID_SEPARATOR_HEIGHT);
      needle.lineTo(GRID_SEPARATOR_WIDTH * 0.32, GRID_SEPARATOR_HEIGHT - GRID_SEPARATOR_CAP_HEIGHT);
      needle.lineTo(GRID_SEPARATOR_WIDTH * 0.4, GRID_SEPARATOR_HEIGHT / 2);
      needle.lineTo(GRID_SEPARATOR_WIDTH * 0.32, GRID_SEPARATOR_CAP_HEIGHT);
      needle.closePath();
      needle.fill({ color: GRID_SEPARATOR_COLOR, alpha: GRID_SEPARATOR_ALPHA });
      needle.position.set(x, 0);
      this.gridSeparatorLayer.addChild(needle);
    }

    this.board.addChild(this.gridSeparatorLayer);
  }

  private setupReelsLayer(): void {
    this.reelsLayer.position.set(0, BOARD_GRID_Y);
    this.reelsLayer.zIndex = 5;
    this.reelsLayer.sortableChildren = true;
    this.reelsMask.clear();
    this.reelsMask.rect(0, BOARD_GRID_Y, GRID_WIDTH, GRID_HEIGHT).fill(0xffffff);
    this.reelsLayer.mask = this.reelsMask;
    this.board.addChild(this.reelsMask);
    this.board.addChild(this.reelsLayer);

    for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
      const reelColumn = new Container();
      reelColumn.position.set(column * GAME_CONFIG.grid.cellStep, 0);
      reelColumn.sortableChildren = true;
      this.reelsLayer.addChild(reelColumn);
      this.reelColumns.push(reelColumn);

      const blurFilter = new BlurFilter({
        strengthX: 0,
        strengthY: 0,
        quality: 1,
      });
      blurFilter.padding = 24;
      this.reelBlurFilters.push(blurFilter);
    }
  }

  private drawCascadeLabel(): void {
    const labelText = this.getGridStatusText(useGameStore.getState());
    const labelGlow = new Text({
      text: labelText,
      style: {
        fill: HUD_LABEL_GOLD,
        fontFamily: HUD_TYPEFACE,
        fontSize: 14,
        fontWeight: "900",
        align: "center",
        stroke: { color: HUD_LABEL_STROKE, width: 4 },
      },
    });
    labelGlow.anchor.set(0.5);
    labelGlow.position.set(GRID_WIDTH / 2, 11);
    labelGlow.alpha = 0.44;
    labelGlow.zIndex = 9;
    labelGlow.filters = [new BlurFilter({ strength: 4, quality: 2 })];
    this.board.addChild(labelGlow);
    this.gridStatusTexts.push(labelGlow);

    const label = new Text({
      text: labelText,
      style: {
        fill: HUD_LABEL_GOLD,
        fontFamily: HUD_TYPEFACE,
        fontSize: 14,
        fontWeight: "900",
        align: "center",
        stroke: { color: HUD_LABEL_STROKE, width: 3 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(GRID_WIDTH / 2, 11);
    label.zIndex = 10;
    this.board.addChild(label);
    this.gridStatusTexts.push(label);
  }

  private subscribeGridStatusText(): void {
    if (this.gameStoreUnsubscribe) {
      return;
    }

    this.gameStoreUnsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.status !== previous.status || state.lastWin !== previous.lastWin) {
        this.updateGridStatusText(state);
      }
    });
    this.updateGridStatusText();
  }

  private updateGridStatusText(state = useGameStore.getState()): void {
    const text = this.getGridStatusText(state);
    for (const label of this.gridStatusTexts) {
      label.text = text;
    }
  }

  private setGridStatusTextVisible(visible: boolean): void {
    for (const label of this.gridStatusTexts) {
      label.visible = visible;
    }
  }

  private getGridStatusText(state: { status: GameStatus; lastWin: number }): string {
    switch (state.status) {
      case "spinning":
        return "GIRANDO";
      case "stopping":
        return "FRENANDO";
      case "evaluating":
        return "EVALUANDO";
      case "win":
      case "bigWin":
        return state.lastWin > 0
          ? `GANASTE ${Math.round(state.lastWin).toLocaleString("es-VE")}`
          : "LINEA GANADORA";
      case "megaWin":
        return "JACKPOT";
      case "freeSpins":
        return "GIROS GRATIS";
      case "bonus":
        return "BONUS";
      case "error":
        return "ERROR";
      default:
        return "LISTO PARA GIRAR";
    }
  }

  private createSymbolLayer(): void {
    for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
      const columnBufferCells: ReelBufferCell[] = [];
      for (let bufferRow = 0; bufferRow < REEL_BUFFER_ROWS; bufferRow += 1) {
        const visualRow = bufferRow - REEL_BUFFER_ROWS;
        const bufferCell = this.createReelBufferCell(visualRow * GAME_CONFIG.grid.cellStep);
        this.reelColumns[column]?.addChild(bufferCell.cell);
        columnBufferCells.push(bufferCell);
      }
      this.reelBufferCells[column] = columnBufferCells;
      this.resetPersistentReelColumnState(column, 0);
    }

    for (let row = 0; row < GAME_CONFIG.grid.rows; row += 1) {
      for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
        const cell = new Container();
        cell.position.set(0, row * GAME_CONFIG.grid.cellStep);
        cell.sortableChildren = true;
        this.reelColumns[column]?.addChild(cell);
        this.symbolCells.push(cell);

        const symbolMask = new Graphics()
          .rect(0, 0, GAME_CONFIG.grid.cellSize, GAME_CONFIG.grid.cellSize)
          .fill(0xffffff);
        cell.addChild(symbolMask);

        const shadow = new Sprite(Texture.EMPTY);
        shadow.anchor.set(0.5);
        shadow.position.set(
          SYMBOL_CELL_CENTER + SYMBOL_SHADOW_OFFSET_X,
          SYMBOL_CELL_CENTER + SYMBOL_SHADOW_OFFSET_Y,
        );
        shadow.visible = false;
        shadow.alpha = SYMBOL_SHADOW_ALPHA;
        shadow.tint = 0x000000;
        shadow.width = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
        shadow.height = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
        shadow.mask = symbolMask;
        shadow.zIndex = 4;
        cell.addChild(shadow);
        this.symbolShadowSprites.push(shadow);

        const sprite = new Sprite(Texture.EMPTY);
        sprite.anchor.set(0.5);
        sprite.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER);
        sprite.width = SYMBOL_SIZE;
        sprite.height = SYMBOL_SIZE;
        sprite.mask = symbolMask;
        sprite.zIndex = 5;
        this.symbolBasePositions.push({
          x: column * GAME_CONFIG.grid.cellStep + SYMBOL_CELL_CENTER,
          y: row * GAME_CONFIG.grid.cellStep + SYMBOL_CELL_CENTER,
        });
        this.symbolVariantSeeds.push(row * GAME_CONFIG.grid.columns + column);
        this.symbolSprites.push(sprite);
        cell.addChild(sprite);

        const wildTextSprite = new Sprite(Texture.EMPTY);
        wildTextSprite.anchor.set(0.5);
        wildTextSprite.position.set(
          SYMBOL_CELL_CENTER,
          SYMBOL_CELL_CENTER + WILD_SYMBOL_TEXT_OFFSET_Y,
        );
        wildTextSprite.width = SYMBOL_SIZE;
        wildTextSprite.height = SYMBOL_SIZE;
        wildTextSprite.mask = symbolMask;
        wildTextSprite.zIndex = 6;
        wildTextSprite.visible = false;
        this.wildSymbolTextSprites.push(wildTextSprite);
        cell.addChild(wildTextSprite);

        const frame = new Graphics();
        frame.visible = false;
        frame.mask = symbolMask;
        frame.zIndex = 7;
        this.symbolFrameGraphics.push(frame);
        this.symbolFrameSymbolIds.push(null);
        cell.addChild(frame);

        const text = new Text({
          text: "",
          style: {
            fill: 0xffffff,
            fontFamily: HUD_TYPEFACE,
            fontSize: 16,
            fontWeight: "900",
            align: "center",
            wordWrap: true,
            wordWrapWidth: GAME_CONFIG.grid.cellSize - 10,
          },
        });
        text.anchor.set(0.5);
        text.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER);
        text.mask = symbolMask;
        text.zIndex = 8;
        text.visible = false;
        this.symbolTexts.push(text);
        cell.addChild(text);
      }
    }
  }

  private createReelBufferCell(y: number): ReelBufferCell {
    const cell = new Container();
    cell.position.set(0, y);
    cell.sortableChildren = true;

    const symbolMask = new Graphics()
      .rect(0, 0, GAME_CONFIG.grid.cellSize, GAME_CONFIG.grid.cellSize)
      .fill(0xffffff);
    cell.addChild(symbolMask);

    const shadow = new Sprite(Texture.EMPTY);
    shadow.anchor.set(0.5);
    shadow.position.set(
      SYMBOL_CELL_CENTER + SYMBOL_SHADOW_OFFSET_X,
      SYMBOL_CELL_CENTER + SYMBOL_SHADOW_OFFSET_Y,
    );
    shadow.visible = false;
    shadow.alpha = SYMBOL_SHADOW_ALPHA;
    shadow.tint = 0x000000;
    shadow.width = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
    shadow.height = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
    shadow.mask = symbolMask;
    shadow.zIndex = 4;
    cell.addChild(shadow);

    const sprite = new Sprite(Texture.EMPTY);
    sprite.anchor.set(0.5);
    sprite.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER);
    sprite.width = SYMBOL_SIZE;
    sprite.height = SYMBOL_SIZE;
    sprite.mask = symbolMask;
    sprite.zIndex = 5;
    cell.addChild(sprite);

    const frame = new Graphics();
    frame.visible = false;
    frame.mask = symbolMask;
    frame.zIndex = 6;
    cell.addChild(frame);

    const text = new Text({
      text: "",
      style: {
        fill: 0xffffff,
        fontFamily: HUD_TYPEFACE,
        fontSize: 16,
        fontWeight: "900",
        align: "center",
        wordWrap: true,
        wordWrapWidth: GAME_CONFIG.grid.cellSize - 10,
      },
    });
    text.anchor.set(0.5);
    text.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER);
    text.mask = symbolMask;
    text.zIndex = 7;
    text.visible = false;
    cell.addChild(text);

    return { cell, sprite, shadow, frame, text, frameSymbolId: null };
  }

  private renderBoard(board: SymbolId[]): void {
    this.clearReelLandingSchedules();
    this.currentBoard = [...board];
    board.forEach((symbolId, index) => {
      this.renderSymbolAt(index, symbolId);
    });
    for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
      this.renderReelBufferColumn(board, column);
      this.resetPersistentReelColumnState(column, 0);
    }
    this.markSymbolsDirty();
  }

  private renderReelBufferColumn(board: SymbolId[], column: number, seed = 0): void {
    const cells = this.reelBufferCells[column] ?? [];
    for (let bufferRow = 0; bufferRow < cells.length; bufferRow += 1) {
      const sourceRow =
        (GAME_CONFIG.grid.rows - REEL_BUFFER_ROWS + bufferRow + seed) % GAME_CONFIG.grid.rows;
      const index = sourceRow * GAME_CONFIG.grid.columns + column;
      this.renderReelBufferCell(cells[bufferRow], board[index], column * 100 + bufferRow + seed);
    }
  }

  private renderPersistentReelColumn(column: number): void {
    this.recyclePersistentReelCells(column, this.reelColumnTravelOffsets[column] ?? 0);
  }

  private recyclePersistentReelCells(column: number, offset: number): void {
    const cycles =
      this.reelTrackCellCycles[column] ?? this.resetPersistentReelColumnState(column, offset);

    for (let trackIndex = 0; trackIndex < REEL_TRACK_ROWS; trackIndex += 1) {
      const cycle = this.getReelTrackCellCycle(trackIndex, offset);
      const previousCycle = cycles[trackIndex] ?? cycle;
      if (cycle > previousCycle) {
        this.renderReelTrackCellSymbol(
          column,
          trackIndex,
          this.getNextPersistentReelSymbol(column, trackIndex, cycle),
          cycle,
        );
      }
      cycles[trackIndex] = cycle;
    }
  }

  private resetPersistentReelColumnState(column: number, offset: number): number[] {
    this.reelColumnTravelOffsets[column] = offset;
    this.reelRecycleSeeds[column] = 0;
    this.reelRecentTapeSymbols[column] = [];
    const cycles = Array.from({ length: REEL_TRACK_ROWS }, (_, trackIndex) =>
      this.getReelTrackCellCycle(trackIndex, offset),
    );
    this.reelTrackCellCycles[column] = cycles;
    return cycles;
  }

  private getReelTrackCellCycle(trackIndex: number, offset: number): number {
    const baseY = (trackIndex - REEL_BUFFER_ROWS) * GAME_CONFIG.grid.cellStep;
    const trackTop = -REEL_BUFFER_ROWS * GAME_CONFIG.grid.cellStep;
    const trackHeight = REEL_TRACK_ROWS * GAME_CONFIG.grid.cellStep;
    return Math.floor((baseY + offset - trackTop) / trackHeight);
  }

  private renderReelTrackCellSymbol(
    column: number,
    trackIndex: number,
    symbolId: SymbolId,
    cycle = 0,
  ): void {
    const variantSeed = this.getReelVariantSeed(column, trackIndex, cycle);
    if (trackIndex < REEL_BUFFER_ROWS) {
      const cell = this.reelBufferCells[column]?.[trackIndex];
      if (cell) {
        this.renderReelBufferCell(cell, symbolId, variantSeed);
      }
      return;
    }

    const row = trackIndex - REEL_BUFFER_ROWS;
    this.renderSymbolAt(row * GAME_CONFIG.grid.columns + column, symbolId, variantSeed);
  }

  private getReelVariantSeed(column: number, trackIndex: number, cycle: number): number {
    return column * 10_000 + trackIndex * 1_000 + cycle;
  }

  private getNextPersistentReelSymbol(column: number, trackIndex: number, cycle: number): SymbolId {
    this.reelRecycleSeeds[column] += 1;
    const scheduledSymbol = this.getScheduledLandingSymbol(column, trackIndex, cycle);
    if (scheduledSymbol) {
      this.rememberReelTapeSymbol(column, scheduledSymbol);
      return scheduledSymbol;
    }
    return this.getNextRandomReelTapeSymbol(column);
  }

  private getScheduledLandingSymbol(
    column: number,
    trackIndex: number,
    cycle: number,
  ): SymbolId | null {
    const eventStep = cycle * REEL_TRACK_ROWS - trackIndex;
    const schedule = this.reelLandingSymbolSchedules[column];
    const symbolId = schedule?.get(eventStep);
    if (!symbolId) {
      return null;
    }

    schedule.delete(eventStep);
    return symbolId;
  }

  private getNextRandomReelTapeSymbol(column: number): SymbolId {
    const recentSymbols = this.reelRecentTapeSymbols[column] ?? [];
    const symbolId = this.pickReelTapeSymbol(recentSymbols);
    this.rememberReelTapeSymbol(column, symbolId);
    return symbolId;
  }

  private rememberReelTapeSymbol(column: number, symbolId: SymbolId): void {
    const recentSymbols = this.reelRecentTapeSymbols[column] ?? [];
    recentSymbols.push(symbolId);
    if (recentSymbols.length > 4) {
      recentSymbols.shift();
    }
    this.reelRecentTapeSymbols[column] = recentSymbols;
  }

  private getSymbolRenderInfo(
    symbolId: SymbolId | undefined,
    cellIndex: number,
    salt = 0,
  ): SymbolRenderInfo | null {
    if (!symbolId) {
      return null;
    }

    const symbol = SYMBOLS[symbolId];
    if (!symbol) {
      return null;
    }

    const variant = getSymbolVisualVariant(symbolId, cellIndex, salt);
    return {
      symbol,
      atlasBase: variant?.atlasBase ?? symbol.atlasBase,
      texturePath: variant?.texturePath ?? symbol.texturePath,
      label: variant?.label ?? symbol.label,
      offsetX: variant?.offsetX ?? 0,
      offsetY: variant?.offsetY ?? 0,
    };
  }

  private renderReelBufferCell(
    cell: ReelBufferCell,
    symbolId: SymbolId | undefined,
    variantSeed = 0,
  ): void {
    const renderInfo = this.getSymbolRenderInfo(symbolId, 0, variantSeed);
    if (!symbolId || !renderInfo) {
      return;
    }

    const { symbol, atlasBase, label } = renderInfo;
    const texture = this.symbolTextures.get(atlasBase);
    if (texture) {
      this.setReelBufferTexture(cell, texture, renderInfo);
      cell.text.visible = false;
      return;
    }

    cell.sprite.visible = false;
    cell.shadow.visible = false;
    cell.text.text = label;
    cell.text.style.fill = symbol.color;
    cell.text.style.stroke = { color: 0x000000, width: 4 };
    cell.text.visible = true;
  }

  private setReelBufferTexture(
    cell: ReelBufferCell,
    texture: Texture,
    renderInfo: SymbolRenderInfo,
  ): void {
    cell.sprite.texture = texture;
    cell.sprite.visible = true;
    cell.shadow.texture = texture;
    cell.shadow.visible = true;
    cell.frame.clear();
    cell.frame.visible = false;
    cell.frameSymbolId = null;
    this.applyReelBufferVisualTransform(cell, renderInfo);
  }

  private renderSymbolAt(index: number, symbolId: SymbolId | undefined, variantSeed = index): void {
    const renderInfo = this.getSymbolRenderInfo(symbolId, index, variantSeed);
    const sprite = this.symbolSprites[index];
    const shadow = this.symbolShadowSprites[index];
    const text = this.symbolTexts[index];
    if (!symbolId || !sprite || !text || !renderInfo) {
      this.updateStaticWildSymbolTextSprite(index, false);
      return;
    }

    this.symbolVariantSeeds[index] = variantSeed;
    const { symbol, atlasBase, label } = renderInfo;
    const texture = this.symbolTextures.get(atlasBase);
    if (texture) {
      this.setSymbolTexture(index, texture);
      this.applySymbolVisualTransform(index, renderInfo);
      this.clearSymbolFrame(index);
      text.visible = false;
      this.updateStaticWildSymbolTextSprite(index, symbolId === "WILD");
      return;
    }

    this.updateStaticWildSymbolTextSprite(index, false);
    sprite.visible = false;
    if (shadow) {
      shadow.visible = false;
    }
    text.text = label;
    text.style.fill = symbol.color;
    text.style.stroke = { color: 0x000000, width: 4 };
    text.visible = true;
    this.clearSymbolFrame(index);
  }

  private applyReelBufferVisualTransform(
    cell: ReelBufferCell,
    { offsetX, offsetY }: SymbolRenderInfo,
  ): void {
    cell.sprite.position.set(SYMBOL_CELL_CENTER + offsetX, SYMBOL_CELL_CENTER + offsetY);
    cell.sprite.width = SYMBOL_SIZE;
    cell.sprite.height = SYMBOL_SIZE;
    cell.shadow.position.set(
      cell.sprite.x + SYMBOL_SHADOW_OFFSET_X,
      cell.sprite.y + SYMBOL_SHADOW_OFFSET_Y,
    );
    cell.shadow.width = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
    cell.shadow.height = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
  }

  private applySymbolVisualTransform(index: number, renderInfo: SymbolRenderInfo | null): void {
    const sprite = this.symbolSprites[index];
    const shadow = this.symbolShadowSprites[index];
    if (!sprite) {
      return;
    }

    const offsetX = renderInfo?.offsetX ?? 0;
    const offsetY = renderInfo?.offsetY ?? 0;
    sprite.position.set(SYMBOL_CELL_CENTER + offsetX, SYMBOL_CELL_CENTER + offsetY);
    sprite.width = SYMBOL_SIZE;
    sprite.height = SYMBOL_SIZE;
    if (shadow) {
      shadow.position.set(sprite.x + SYMBOL_SHADOW_OFFSET_X, sprite.y + SYMBOL_SHADOW_OFFSET_Y);
      shadow.width = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
      shadow.height = SYMBOL_SIZE * SYMBOL_SHADOW_SCALE;
    }
  }

  private clearSymbolFrame(index: number): void {
    const frame = this.symbolFrameGraphics[index];
    if (!frame) {
      return;
    }

    frame.clear();
    frame.visible = false;
    this.symbolFrameSymbolIds[index] = null;
  }

  private prepareReelLandingSchedules(finalBoard: SymbolId[], profile: SpinFrameProfile): void {
    for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
      const schedule = this.reelLandingSymbolSchedules[column];
      schedule?.clear();
      const finalStopRows = this.getProjectedColumnStopRows(column, profile);
      for (const [eventStep, symbolId] of createLandingSymbolSchedule({
        board: finalBoard,
        column,
        columns: GAME_CONFIG.grid.columns,
        rows: GAME_CONFIG.grid.rows,
        bufferRows: REEL_BUFFER_ROWS,
        finalStopRows,
      })) {
        schedule?.set(eventStep, symbolId);
      }
    }
  }

  private clearReelLandingSchedules(): void {
    for (const schedule of this.reelLandingSymbolSchedules) {
      schedule.clear();
    }
  }

  private getProjectedColumnStopRows(column: number, profile: SpinFrameProfile): number {
    let travel = this.getReelPreSpinTravel(column, profile.preSpinFrames - 1);
    for (let stoppedColumn = 0; stoppedColumn < column; stoppedColumn += 1) {
      travel += profile.stopFrames * (REEL_STOP_ROLL_STEP_PX + column * 3);
      travel += profile.landingFrames * (REEL_LANDING_ROLL_STEP_PX + column * 3);
    }

    return getNextTrackBoundaryRows({
      travelPx: travel,
      cellStep: GAME_CONFIG.grid.cellStep,
      trackRows: REEL_TRACK_ROWS,
    });
  }

  private getNextReelTrackBoundaryTravel(travel: number): number {
    return (
      getNextTrackBoundaryRows({
        travelPx: travel,
        cellStep: GAME_CONFIG.grid.cellStep,
        trackRows: REEL_TRACK_ROWS,
      }) * GAME_CONFIG.grid.cellStep
    );
  }

  private getReelWeightShiftPx(): number {
    return Math.round(GAME_CONFIG.grid.cellStep * REEL_WEIGHT_SHIFT_RATIO);
  }

  private getReelPreSpinTravel(column: number, frame: number): number {
    return (frame + 1) * REEL_PRESPIN_STEP_PX - this.getReelWeightShiftPx() + column * 19;
  }

  private async animateReelSpin(
    finalBoard: SymbolId[],
    { wildDramaColumn = null }: ReelSpinOptions = {},
  ): Promise<void> {
    this.activeWinningIndices.clear();
    this.clearWinningEffects();
    this.reelMotionActive = true;
    const profile = this.getSpinFrameProfile();
    const heldWildColumn = this.shouldPlayWildReelDrama() ? wildDramaColumn : null;
    const reelSpinLoopStopCount =
      heldWildColumn === null ? GAME_CONFIG.grid.columns : GAME_CONFIG.grid.columns - 1;
    this.prepareReelLandingSchedules(finalBoard, profile);
    this.sound.startLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);
    try {
      await this.animateReelStartPullback();
      for (let frame = 0; frame < profile.preSpinFrames; frame += 1) {
        for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
          const columnTravel = this.getReelPreSpinTravel(column, frame);
          this.setColumnOffset(column, columnTravel, this.getReelBlurStrength());
        }
        if (frame % REEL_TICK_FRAME_INTERVAL === 0) {
          this.sound.play("tick");
        }
        await this.wait(this.getTiming(REEL_FRAME_MS));
      }

      useGameStore.getState().setStatus("stopping");
      const stoppedColumns = new Set<number>();
      for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
        if (column === heldWildColumn) {
          continue;
        }
        await this.animateColumnStop(column, stoppedColumns, finalBoard, {
          heldColumn: heldWildColumn,
        });
        stoppedColumns.add(column);
        this.stopReelSpinLoopIfFinalEncaje(stoppedColumns, reelSpinLoopStopCount);
        if (column < GAME_CONFIG.grid.columns - 1) {
          await this.wait(this.getTiming(REEL_STOP_SEQUENCE_DELAY_MS));
        }
      }
      if (heldWildColumn !== null) {
        await this.animateWildDramaReel(heldWildColumn, finalBoard);
        stoppedColumns.add(heldWildColumn);
      }
    } finally {
      this.sound.stopLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);
      this.resetAllColumnOffsets();
      this.clearReelLandingSchedules();
      this.reelMotionActive = false;
    }
  }

  private stopReelSpinLoopIfFinalEncaje(
    stoppedColumns: Set<number>,
    reelSpinLoopStopCount: number,
  ): void {
    if (stoppedColumns.size >= reelSpinLoopStopCount) {
      this.sound.stopLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);
    }
  }

  private shouldPlayWildReelDrama(): boolean {
    return this.animationsEnabled && this.visualEffectsEnabled && !this.reducedEffects;
  }

  private async animateReelStartPullback(): Promise<void> {
    const pullbackTravel = -this.getReelWeightShiftPx();
    for (let frame = 0; frame < REEL_START_PULLBACK_FRAMES; frame += 1) {
      const progress = (frame + 1) / REEL_START_PULLBACK_FRAMES;
      const easedProgress = 1 - (1 - progress) ** 2;
      const offset = Math.round(pullbackTravel * easedProgress);
      for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
        this.setColumnOffset(column, offset, 0);
      }
      await this.wait(this.getTiming(REEL_FRAME_MS));
    }
  }

  private async animateCascadeReelTransition(finalBoard: SymbolId[]): Promise<void> {
    if (!this.animationsEnabled || this.reducedEffects) {
      this.renderBoard(finalBoard);
      this.resetAllColumnOffsets();
      return;
    }

    this.clearWinningEffects();
    this.reelMotionActive = true;
    this.sound.startLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);
    try {
      for (let frame = 0; frame < CASCADE_REEL_REFRESH_FRAMES; frame += 1) {
        for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
          this.setColumnOffset(
            column,
            (this.reelColumnTravelOffsets[column] ?? 0) + CASCADE_REEL_REFRESH_STEP_PX + column * 3,
            this.getReelBlurStrength(),
          );
        }
        if (frame % REEL_TICK_FRAME_INTERVAL === 0) {
          this.sound.play("tick");
        }
        await this.wait(this.getTiming(REEL_FRAME_MS));
      }

      this.renderBoard(finalBoard);
      this.resetAllColumnOffsets();
      for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
        this.createColumnLockEffect(column);
      }
    } finally {
      this.sound.stopLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);
      this.resetAllColumnOffsets();
      this.reelMotionActive = false;
    }
  }

  private async playCascadeSteps(
    steps: SpinStep[],
    gridEffectEvents: GridEffectEvent[] = [],
    { preserveInitialReelVisual = false }: { preserveInitialReelVisual?: boolean } = {},
  ): Promise<void> {
    const store = useGameStore.getState();
    let accumulatedWin = 0;

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const shouldRenderStep = !(preserveInitialReelVisual && index === 0);
      if (shouldRenderStep) {
        await this.animateCascadeReelTransition(step.board);
      } else {
        this.currentBoard = [...step.board];
      }
      store.setStatus(step.win > 0 ? "win" : "evaluating");
      this.playGridEffectEvents(gridEffectEvents.filter((event) => event.cascade === step.cascade));

      if (step.win > 0 && step.winningIndices.length > 0) {
        accumulatedWin += step.win;
        store.setWin(accumulatedWin);
        this.sound.play("cascade");
        if (this.vibrationEnabled) {
          navigator.vibrate?.(35);
        }
        this.showWinSymbolMotion(step.winningIndices, step.winningSymbols);
        await this.wait(this.getTiming(WIN_CASCADE_HOLD_MS));
      } else {
        this.clearWinningEffects();
        await this.wait(this.getTiming(NO_WIN_CASCADE_HOLD_MS));
      }
    }
  }

  private async animateColumnStop(
    column: number,
    stoppedColumns: Set<number>,
    _finalBoard: SymbolId[],
    { heldColumn = null }: { heldColumn?: number | null } = {},
  ): Promise<void> {
    const startOffset = this.reelColumnOffsets[column] ?? 0;
    const startTravel = this.reelColumnTravelOffsets[column] ?? startOffset;
    const targetTravel = this.getNextReelTrackBoundaryTravel(startTravel);
    const overshootTravel = targetTravel + this.getReelWeightShiftPx();
    const profile = this.getSpinFrameProfile();
    for (let frame = 0; frame < profile.stopFrames; frame += 1) {
      for (let currentColumn = 0; currentColumn < GAME_CONFIG.grid.columns; currentColumn += 1) {
        this.renderPersistentReelColumn(currentColumn);
      }

      const travelProgress = (frame + 1) / profile.stopFrames;
      const settleProgress = 1 - (1 - travelProgress) ** 3;
      const offset =
        frame >= profile.stopFrames - 1
          ? overshootTravel
          : Math.round(startTravel + (overshootTravel - startTravel) * settleProgress);
      this.setColumnOffset(column, offset, this.getStoppingReelBlurStrength(travelProgress));
      this.advanceRollingColumns(
        this.getHeldRollingColumns(column, heldColumn),
        REEL_STOP_ROLL_STEP_PX,
      );
      await this.wait(this.getTiming(REEL_FRAME_MS));
    }
    await this.settleColumnLandingOvershoot(column, targetTravel, { heldColumn });
    this.setColumnOffset(column, targetTravel, 0);
    this.createColumnLockEffect(column);
    const stopSoundEvent = this.getReelStopSoundEvent(stoppedColumns.size + 1);
    this.sound.play(stopSoundEvent);
  }

  private getReelStopSoundEvent(stopIndex: number): ReelStopSoundEvent {
    const normalizedIndex = Math.max(1, Math.min(5, Math.round(stopIndex)));
    return `reelStop${normalizedIndex}` as ReelStopSoundEvent;
  }

  private async settleColumnLandingOvershoot(
    column: number,
    targetTravel: number,
    { heldColumn = null }: { heldColumn?: number | null } = {},
  ): Promise<void> {
    const profile = this.getSpinFrameProfile();
    const overshootTravel = targetTravel + this.getReelWeightShiftPx();
    for (let frame = 0; frame < profile.landingFrames; frame += 1) {
      for (let currentColumn = 0; currentColumn < GAME_CONFIG.grid.columns; currentColumn += 1) {
        this.renderPersistentReelColumn(currentColumn);
      }

      const progress = (frame + 1) / profile.landingFrames;
      const settleProgress = 1 - (1 - progress) ** 3;
      const settleTravel = Math.round(
        overshootTravel + (targetTravel - overshootTravel) * settleProgress,
      );
      this.setColumnOffset(column, settleTravel, 0);
      this.setReelColumnBlur(column, 0);
      this.advanceRollingColumns(
        this.getHeldRollingColumns(column, heldColumn),
        REEL_LANDING_ROLL_STEP_PX,
      );
      await this.wait(this.getTiming(REEL_FRAME_MS));
    }
    this.setColumnOffset(column, targetTravel, 0);
  }

  private getHeldRollingColumns(column: number, heldColumn: number | null): number[] {
    const rollingColumns: number[] = [];
    for (
      let currentColumn = column + 1;
      currentColumn < GAME_CONFIG.grid.columns;
      currentColumn += 1
    ) {
      rollingColumns.push(currentColumn);
    }

    if (heldColumn !== null && heldColumn !== column && !rollingColumns.includes(heldColumn)) {
      rollingColumns.push(heldColumn);
    }

    return rollingColumns.sort((left, right) => left - right);
  }

  private advanceRollingColumns(columns: number[], baseStepPx: number): void {
    for (const currentColumn of columns) {
      this.setColumnOffset(
        currentColumn,
        (this.reelColumnTravelOffsets[currentColumn] ?? 0) + baseStepPx + currentColumn * 3,
        this.getReelBlurStrength(),
      );
    }
  }

  private async animateWildDramaReel(column: number, finalBoard: SymbolId[]): Promise<void> {
    let sequenceRoot: Container | null = null;
    try {
      this.sound.stopLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);
      await this.fadeWildDramaColumnItems(column, 0);
      this.prepareWildDramaColumnForSequence(column);
      this.sound.play(WILD_REEL_SEQUENCE_SOUND_EVENT);
      await this.wait(WILD_REEL_SEQUENCE_START_DELAY_MS);
      sequenceRoot = await this.playWildReelSequence(column);
    } finally {
      sequenceRoot?.destroy({ children: true });
      this.renderFinalColumnSymbols(finalBoard, column);
      this.setWildDramaColumnItemsAlpha(column, 1);
      this.setColumnOffset(column, 0, 0);
      this.createColumnLockEffect(column);
    }
  }

  private async fadeWildDramaColumnItems(column: number, targetAlpha: number): Promise<void> {
    const startAlpha = this.symbolCells[column]?.alpha ?? 1;
    const frameCount = Math.max(1, Math.round(WILD_REEL_CLEAR_DURATION_MS / REEL_FRAME_MS));
    for (let frame = 0; frame < frameCount; frame += 1) {
      const progress = (frame + 1) / frameCount;
      const easedProgress = 1 - (1 - progress) ** 2;
      const alpha = startAlpha + (targetAlpha - startAlpha) * easedProgress;
      this.setWildDramaColumnItemsAlpha(column, alpha);
      this.setColumnOffset(
        column,
        (this.reelColumnTravelOffsets[column] ?? 0) + REEL_STOP_ROLL_STEP_PX + column * 3,
        this.getReelBlurStrength(),
      );
      await this.wait(this.getTiming(REEL_FRAME_MS));
    }
    this.setWildDramaColumnItemsAlpha(column, targetAlpha);
  }

  private prepareWildDramaColumnForSequence(column: number): void {
    this.setReelColumnBlur(column, 0);
    const reelColumn = this.reelColumns[column];
    if (reelColumn) {
      reelColumn.alpha = 1;
    }
  }

  private setWildDramaColumnItemsAlpha(column: number, alpha: number): void {
    for (let row = 0; row < GAME_CONFIG.grid.rows; row += 1) {
      const index = row * GAME_CONFIG.grid.columns + column;
      const cell = this.symbolCells[index];
      if (cell) {
        cell.alpha = alpha;
      }
    }

    const bufferCells = this.reelBufferCells[column] ?? [];
    for (const bufferCell of bufferCells) {
      bufferCell.cell.alpha = alpha;
    }
  }

  private async playWildReelSequence(column: number): Promise<Container | null> {
    const textures = this.wildReelSequenceTextures;
    const reelColumn = this.reelColumns[column];
    if (!reelColumn || textures.length <= 0) {
      await this.wait(WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS);
      return null;
    }

    const sequenceRoot = new Container();
    sequenceRoot.sortableChildren = true;
    sequenceRoot.zIndex = 30;
    const sequenceMask = new Graphics()
      .rect(0, 0, GAME_CONFIG.grid.cellSize, GRID_HEIGHT)
      .fill(0xffffff);
    sequenceRoot.addChild(sequenceMask);

    const sequenceSprite = new Sprite(textures[0] ?? Texture.EMPTY);
    const sequenceWidth = Math.round(GRID_HEIGHT * WILD_REEL_SEQUENCE_ASPECT_RATIO);
    sequenceSprite.position.set(0, 0);
    sequenceSprite.x = Math.round((GAME_CONFIG.grid.cellSize - sequenceWidth) / 2);
    sequenceSprite.width = sequenceWidth;
    sequenceSprite.height = GRID_HEIGHT;
    sequenceSprite.zIndex = 1;
    sequenceSprite.mask = sequenceMask;
    sequenceRoot.addChild(sequenceSprite);
    reelColumn.addChild(sequenceRoot);

    const frameCount = Math.max(
      1,
      Math.ceil(WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS / REEL_FRAME_MS),
    );
    for (let frame = 0; frame < frameCount; frame += 1) {
      const elapsedMs = Math.min(WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS, frame * REEL_FRAME_MS);
      const sequenceProgress = Math.min(1, elapsedMs / WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS);
      const frameIndex = Math.min(
        textures.length - 1,
        Math.floor(sequenceProgress * textures.length),
      );
      sequenceSprite.texture = textures[frameIndex] ?? sequenceSprite.texture;
      await this.wait(REEL_FRAME_MS);
    }
    sequenceSprite.texture = textures[textures.length - 1] ?? sequenceSprite.texture;
    return sequenceRoot;
  }

  private renderFinalColumnSymbols(finalBoard: SymbolId[], column: number): void {
    for (let row = 0; row < GAME_CONFIG.grid.rows; row += 1) {
      const index = row * GAME_CONFIG.grid.columns + column;
      const symbolId = finalBoard[index];
      this.renderSymbolAt(index, symbolId, index);
      if (symbolId) {
        this.currentBoard[index] = symbolId;
      }
    }

    this.renderReelBufferColumn(finalBoard, column);
    this.resetPersistentReelColumnState(column, 0);
  }

  private createColumnLockEffect(column: number): void {
    if (!this.visualEffectsEnabled || this.reducedEffects) {
      return;
    }

    const graphic = new Graphics()
      .rect(0, 0, GAME_CONFIG.grid.cellSize - 6, GRID_HEIGHT - 6)
      .fill({ color: HUD_LABEL_GOLD, alpha: 0.075 })
      .stroke({ color: HUD_LABEL_GOLD, width: 4, alpha: 0.82 });
    graphic.position.set(column * GAME_CONFIG.grid.cellStep + 3, 3);
    graphic.zIndex = 13;
    this.effectsLayer.addChild(graphic);
    this.gridEffects.push({
      graphic,
      type: "reelLock",
      elapsedMs: 0,
      durationMs: REEL_LOCK_FLASH_DURATION_MS,
    });
  }

  private setColumnOffset(
    column: number,
    offset: number,
    blurStrength = this.getReelBlurStrength(),
  ): void {
    this.setContinuousColumnOffset(column, offset, blurStrength);
  }

  private setContinuousColumnOffset(
    column: number,
    offset: number,
    blurStrength = this.getReelBlurStrength(),
  ): void {
    const wrappedOffset =
      ((offset % GAME_CONFIG.grid.cellStep) + GAME_CONFIG.grid.cellStep) %
      GAME_CONFIG.grid.cellStep;
    this.reelColumnOffsets[column] = wrappedOffset;
    this.reelColumnTravelOffsets[column] = offset;
    this.renderPersistentReelColumn(column);
    this.setReelColumnBlur(column, wrappedOffset === 0 ? 0 : blurStrength);
    const reelColumn = this.reelColumns[column];
    if (reelColumn) {
      reelColumn.alpha = wrappedOffset === 0 ? 1 : REEL_SPIN_ALPHA;
    }

    const trackHeight = REEL_TRACK_ROWS * GAME_CONFIG.grid.cellStep;
    const trackTop = -REEL_BUFFER_ROWS * GAME_CONFIG.grid.cellStep;
    const wrapTrackY = (baseY: number) => {
      const y = baseY + offset;
      return ((((y - trackTop) % trackHeight) + trackHeight) % trackHeight) + trackTop;
    };

    const bufferCells = this.reelBufferCells[column] ?? [];
    for (let bufferRow = 0; bufferRow < bufferCells.length; bufferRow += 1) {
      const baseY = (bufferRow - REEL_BUFFER_ROWS) * GAME_CONFIG.grid.cellStep;
      bufferCells[bufferRow].cell.y = wrapTrackY(baseY);
    }

    for (let row = 0; row < GAME_CONFIG.grid.rows; row += 1) {
      const index = row * GAME_CONFIG.grid.columns + column;
      const cell = this.symbolCells[index];
      if (!cell) {
        continue;
      }
      const baseY = row * GAME_CONFIG.grid.cellStep;
      cell.y = wrapTrackY(baseY);
    }
  }

  private setReelColumnBlur(column: number, strength: number): void {
    const reelColumn = this.reelColumns[column];
    const filter = this.reelBlurFilters[column];
    if (!reelColumn || !filter) {
      return;
    }

    if (strength <= 0) {
      reelColumn.filters = null;
      filter.strengthY = 0;
      return;
    }

    filter.strengthX = 0;
    filter.strengthY = strength;
    filter.quality = 1;
    reelColumn.filters = [filter];
  }

  private resetReelBlurFilters(): void {
    for (let column = 0; column < this.reelColumns.length; column += 1) {
      this.setReelColumnBlur(column, 0);
    }
  }

  private resetAllColumnOffsets(): void {
    this.reelColumns.forEach((reelColumn, column) => {
      reelColumn.alpha = 1;
      reelColumn.position.set(column * GAME_CONFIG.grid.cellStep, 0);
      reelColumn.scale.set(1);
      this.reelColumnOffsets[column] = 0;
      this.reelColumnTravelOffsets[column] = 0;
      this.resetPersistentReelColumnState(column, 0);
      this.setReelColumnBlur(column, 0);
      const bufferCells = this.reelBufferCells[column] ?? [];
      for (let bufferRow = 0; bufferRow < bufferCells.length; bufferRow += 1) {
        bufferCells[bufferRow].cell.y = (bufferRow - REEL_BUFFER_ROWS) * GAME_CONFIG.grid.cellStep;
      }
    });

    for (let index = 0; index < this.symbolCells.length; index += 1) {
      const row = Math.floor(index / GAME_CONFIG.grid.columns);
      const cell = this.symbolCells[index];
      const sprite = this.symbolSprites[index];
      const text = this.symbolTexts[index];
      if (!cell || !sprite || !text) {
        continue;
      }
      cell.x = 0;
      cell.y = row * GAME_CONFIG.grid.cellStep;
      cell.scale.set(1);
      sprite.width = SYMBOL_SIZE;
      sprite.height = SYMBOL_SIZE;
      this.applySymbolVisualTransform(index, this.getCurrentSymbolRenderInfo(index));
      text.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER);
      text.scale.set(1);
    }
  }

  private playWinningEffects(winningIndices: number[], winningSymbols: WinningSymbol[] = []): void {
    this.clearWinningEffects();
    for (const index of winningIndices) {
      const base = this.symbolBasePositions[index];
      if (!base) {
        continue;
      }
      this.activeWinningIndices.add(index);
    }

    const lineGroups: WinningSymbolLine[] =
      winningSymbols.length > 0
        ? winningSymbols.map((winningSymbol) => winningSymbol.positions)
        : [this.sortWinningLineIndices(winningIndices)];

    const drawnLines = new Set<string>();
    for (const positions of lineGroups) {
      const linePositions = positions.filter((index) => this.symbolBasePositions[index]);
      if (linePositions.length < 2) {
        continue;
      }

      const lineKey = linePositions.join("-");
      if (drawnLines.has(lineKey)) {
        continue;
      }

      drawnLines.add(lineKey);
      this.createWinningLineEffect(linePositions);
    }
  }

  private createWinningLineEffect(positions: number[]): void {
    if (positions.length < 1) {
      return;
    }

    positions.forEach((index, order) => {
      this.createWinningCellEffect(index, order);
    });
  }

  private createWinningCellEffect(index: number, order: number): void {
    const base = this.symbolBasePositions[index];
    if (!base) {
      return;
    }

    const color = WIN_GRID_EFFECT_COLORS[order % WIN_GRID_EFFECT_COLORS.length];
    const graphic = new Graphics()
      .roundRect(
        -SYMBOL_SIZE / 2 + 10,
        -SYMBOL_SIZE / 2 + 10,
        SYMBOL_SIZE - 20,
        SYMBOL_SIZE - 20,
        14,
      )
      .fill({ color, alpha: 0.12 })
      .stroke({ color, width: 5, alpha: 0.92 })
      .roundRect(
        -SYMBOL_SIZE / 2 + 18,
        -SYMBOL_SIZE / 2 + 18,
        SYMBOL_SIZE - 36,
        SYMBOL_SIZE - 36,
        10,
      )
      .stroke({ color: 0xfff0a3, width: 2, alpha: 0.72 });

    graphic.position.set(base.x, base.y);
    graphic.zIndex = 9;
    this.effectsLayer.addChild(graphic);
    this.winningEffects.push({
      graphic,
      index,
      elapsedMs: 0,
      durationMs: WIN_EFFECT_DURATION_MS,
    });
  }

  private sortWinningLineIndices(indices: number[]): number[] {
    return [...indices].sort((left, right) => {
      const leftBase = this.symbolBasePositions[left];
      const rightBase = this.symbolBasePositions[right];

      if (!leftBase || !rightBase) {
        return left - right;
      }

      if (leftBase.x === rightBase.x) {
        return leftBase.y - rightBase.y;
      }

      return leftBase.x - rightBase.x;
    });
  }

  private showWinSymbolMotion(
    winningIndices: number[],
    winningSymbols: WinningSymbol[] = [],
  ): void {
    if (!this.visualEffectsEnabled) {
      return;
    }

    this.playWinningEffects(winningIndices, winningSymbols);
    if (this.animationsEnabled && !this.reducedEffects) {
      this.playWinningSymbolAnimations(winningIndices);
    }
  }

  private clearWinningEffects(): void {
    this.clearWinningSymbolAnimations();
    this.activeWinningIndices.clear();
    for (const effect of this.winningEffects) {
      effect.graphic.destroy();
    }
    this.winningEffects.length = 0;
  }

  private playGridEffectEvents(events: GridEffectEvent[]): void {
    if (!this.visualEffectsEnabled || this.reducedEffects) {
      return;
    }

    for (const event of events) {
      if (event.audioEvent) {
        this.sound.play(event.audioEvent);
      }

      switch (event.type) {
        case "wildExpandVisual":
          this.createWildExpandEffects(event.columns ?? []);
          break;
        case "scatterTease":
          this.createCellRingEffects(event.indices ?? [], 0xffb21f, 1040);
          break;
        case "nearMiss":
          this.createCellRingEffects(event.indices ?? [], 0xff7a18, 720);
          break;
        case "freeSpinAward":
          this.createCellRingEffects(event.indices ?? [], 0xfff0a3, 1180);
          this.createGridPulseEffect(0xffb21f, 980);
          break;
        case "paylineTrace":
          this.createPaylineTraceEffect(event.indices ?? []);
          break;
        case "coinPop":
          this.createCellRingEffects(event.indices ?? [], 0xffd36b, 760);
          break;
        case "cascadeImpact":
          this.createGridPulseEffect(0xffd36b, 620);
          this.triggerBoardShake(120, 2.5);
          break;
        case "cascadeChain":
          this.createGridPulseEffect(0xed254e, 780);
          break;
        case "bigWinGridPulse":
          this.createGridPulseEffect(0xfff0a3, 1180);
          break;
        default:
          break;
      }
    }
  }

  private setupCelebrationLayer(): void {
    this.celebrationLayer.zIndex = 18;
    this.celebrationLayer.sortableChildren = true;
    this.board.addChild(this.celebrationLayer);
  }

  private clearWinCelebrations(): void {
    for (const celebration of this.winCelebrations) {
      celebration.container.destroy({ children: true });
    }
    this.winCelebrations.length = 0;
    this.setGridStatusTextVisible(true);
  }

  private updateWinCelebrations(ticker: { deltaMS: number }): void {
    for (let index = this.winCelebrations.length - 1; index >= 0; index -= 1) {
      const celebration = this.winCelebrations[index];
      celebration.elapsedMs += ticker.deltaMS;
      const progress = Math.min(1, celebration.elapsedMs / celebration.durationMs);

      for (const element of celebration.elements) {
        const localElapsed = celebration.elapsedMs - element.delayMs;
        if (localElapsed < 0) {
          element.node.visible = false;
          continue;
        }
        element.node.visible = true;
        const localProgress = Math.min(
          1,
          localElapsed / Math.max(1, celebration.durationMs - element.delayMs),
        );
        const easeOut = 1 - (1 - localProgress) * (1 - localProgress);
        const exitProgress = Math.max(0, (progress - 0.78) / 0.22);

        if (element.motion === "sequence") {
          const sequenceDurationMs = Math.max(
            1,
            element.sequenceDurationMs ?? celebration.durationMs - element.delayMs,
          );
          const sequenceProgress = Math.min(1, localElapsed / sequenceDurationMs);
          const sequenceHoldDurationMs = element.sequenceHoldDurationMs ?? 0;
          const sequenceFadeProgress =
            element.fadeOutDurationMs === undefined
              ? exitProgress
              : Math.min(
                  1,
                  Math.max(0, localElapsed - sequenceDurationMs - sequenceHoldDurationMs) /
                    Math.max(1, element.fadeOutDurationMs),
                );
          const textures = element.sequenceTextures ?? [];
          if (textures.length > 0 && element.node instanceof Sprite) {
            const frameIndex = Math.min(
              textures.length - 1,
              Math.floor(sequenceProgress * textures.length),
            );
            element.node.texture = textures[frameIndex];
          }
          element.node.alpha =
            sequenceProgress < 0.04 ? sequenceProgress * 25 : Math.max(0, 1 - sequenceFadeProgress);
        } else if (element.motion === "pop") {
          const popScale =
            localProgress < 0.22
              ? 0.65 + localProgress * 2.2
              : 1 + Math.sin(localProgress * Math.PI) * 0.08;
          element.node.scale.set(element.baseScaleX * popScale, element.baseScaleY * popScale);
          element.node.alpha = Math.max(0, 1 - exitProgress);
        } else if (element.motion === "winBannerPop") {
          const introProgress = Math.min(1, localProgress / 0.24);
          const bannerScale =
            localProgress < 0.24
              ? 0.38 + introProgress * 0.62
              : 1 + Math.sin(localProgress * Math.PI) * 0.025;
          element.node.scale.set(
            element.baseScaleX * bannerScale,
            element.baseScaleY * bannerScale,
          );
          element.node.alpha =
            localProgress < 0.12 ? localProgress / 0.12 : Math.max(0, 1 - exitProgress);
        } else if (element.motion === "float") {
          element.node.position.set(element.originX, element.originY - easeOut * 18);
          element.node.alpha = Math.max(0, 1 - exitProgress);
        } else if (element.motion === "amountFloat") {
          const amountScale = 1 + Math.sin(localElapsed * 0.01) * 0.035;
          element.node.position.set(element.originX, element.originY - easeOut * 16);
          element.node.scale.set(
            element.baseScaleX * amountScale,
            element.baseScaleY * amountScale,
          );
          element.node.alpha = Math.max(0, 1 - exitProgress);
        } else if (element.motion === "amountGlow") {
          const pulse = Math.sin(localElapsed * 0.012);
          const glowScale = 1.02 + pulse * 0.08 + easeOut * 0.04;
          element.node.position.set(element.originX, element.originY - easeOut * 16);
          element.node.scale.set(element.baseScaleX * glowScale, element.baseScaleY * glowScale);
          element.node.alpha = Math.max(0, (0.52 + pulse * 0.18) * (1 - exitProgress));
        } else if (element.motion === "confetti") {
          element.node.position.set(element.originX, element.originY + easeOut * 460);
          element.node.alpha =
            localProgress < 0.1 ? localProgress * 10 : Math.max(0, 1 - exitProgress);
        } else {
          element.node.alpha = Math.max(0, 1 - exitProgress);
        }
      }

      if (progress >= 1) {
        celebration.container.destroy({ children: true });
        this.winCelebrations.splice(index, 1);
      }
    }

    if (this.winCelebrations.length === 0) {
      this.setGridStatusTextVisible(true);
    }
  }

  private createCelebrationRoot(
    tier: WinCelebrationTier,
    amount: number,
    counterDelayMs = 260,
  ): WinCelebrationRecord {
    this.clearWinCelebrations();
    this.setGridStatusTextVisible(false);
    const container = new Container();
    container.zIndex = tier === "win" ? 16 : 18;
    container.sortableChildren = true;
    this.celebrationLayer.addChild(container);

    const record: WinCelebrationRecord = {
      container,
      tier,
      elapsedMs: 0,
      durationMs: WIN_CELEBRATION_DURATIONS_MS[tier],
      elements: [],
    };
    this.winCelebrations.push(record);

    const counterGlow = this.createCelebrationAmountGlow(tier);
    record.container.addChild(counterGlow);
    this.registerCelebrationElement(record, counterGlow, "amountGlow", counterDelayMs);

    const counter = this.createCelebrationAmountText({
      text: formatCelebrationAmount(amount),
      tier,
    });
    record.container.addChild(counter);
    this.registerCelebrationElement(record, counter, "amountFloat", counterDelayMs);

    return record;
  }

  private createCelebrationAmountGlow(tier: WinCelebrationTier): Graphics {
    const radius = tier === "win" ? WIN_AMOUNT_GLOW_RADIUS : BIG_WIN_AMOUNT_GLOW_RADIUS;
    const y =
      CELEBRATION_CENTER_Y + (tier === "jackpot" ? JACKPOT_AMOUNT_OFFSET_Y : WIN_AMOUNT_OFFSET_Y);
    const glow = new Graphics()
      .ellipse(0, 0, radius * 1.35, radius * 0.62)
      .fill({ color: 0xffd36a, alpha: 0.34 })
      .ellipse(0, 0, radius * 0.84, radius * 0.38)
      .fill({ color: 0xfff0a3, alpha: 0.3 });
    glow.filters = [new BlurFilter({ strength: 18, quality: 1 })];
    glow.position.set(CELEBRATION_CENTER_X, y);
    glow.zIndex = 54;
    return glow;
  }

  private registerCelebrationElement(
    record: WinCelebrationRecord,
    node: CelebrationNode,
    motion: WinCelebrationMotion,
    delayMs = 0,
  ): void {
    node.visible = delayMs <= 0;
    record.elements.push({
      node,
      motion,
      originX: node.position.x,
      originY: node.position.y,
      baseScaleX: node.scale.x,
      baseScaleY: node.scale.y,
      delayMs,
    });
  }

  private registerCelebrationSequenceElement(
    record: WinCelebrationRecord,
    node: Sprite,
    delayMs = 0,
    sequenceTextures?: Texture[],
    sequenceDurationMs?: number,
    fadeOutDurationMs?: number,
    sequenceHoldDurationMs?: number,
  ): WinCelebrationElementRecord {
    node.visible = delayMs <= 0;
    const element: WinCelebrationElementRecord = {
      node,
      motion: "sequence",
      originX: node.position.x,
      originY: node.position.y,
      baseScaleX: node.scale.x,
      baseScaleY: node.scale.y,
      delayMs,
      sequenceTextures: sequenceTextures ?? this.bigWinSequenceTextures,
      sequenceDurationMs,
      fadeOutDurationMs,
      sequenceHoldDurationMs,
    };
    record.elements.push(element);
    return element;
  }

  private createCelebrationAmountText(input: {
    text: string;
    tier: WinCelebrationTier;
  }): Text | BitmapText {
    const fontSize = input.tier === "win" ? WIN_AMOUNT_FONT_SIZE : BIG_WIN_AMOUNT_FONT_SIZE;
    const y =
      CELEBRATION_CENTER_Y +
      (input.tier === "jackpot" ? JACKPOT_AMOUNT_OFFSET_Y : WIN_AMOUNT_OFFSET_Y);
    const sharedStyle = {
      fontFamily: GOLD_NUMBER_FONT_FACE,
      fontSize,
      align: "center" as const,
    };
    const text = this.goldNumberFontLoaded
      ? new BitmapText({
          text: input.text,
          style: {
            ...sharedStyle,
            fill: 0xffffff,
          },
        })
      : new Text({
          text: input.text,
          style: {
            ...sharedStyle,
            fill: 0xfff0b5,
            fontWeight: "900",
            stroke: { color: 0x421005, width: Math.max(5, Math.round(fontSize * 0.09)) },
            dropShadow: { color: 0x000000, alpha: 0.6, blur: 10, distance: 6 },
          },
        });
    text.anchor.set(0.5);
    text.position.set(CELEBRATION_CENTER_X, y);
    text.zIndex = 60;
    return text;
  }

  private createCelebrationConfetti(
    record: WinCelebrationRecord,
    count: number,
    zIndexBase = 42,
  ): void {
    if (this.reducedEffects) {
      return;
    }

    for (let index = 0; index < count; index += 1) {
      const color = WIN_CELEBRATION_CONFETTI_COLORS[index % WIN_CELEBRATION_CONFETTI_COLORS.length];
      const width = 6 + (index % 4) * 3;
      const height = 4 + (index % 3) * 2;
      const x = 22 + ((index * 47) % Math.max(1, GRID_WIDTH - 44));
      const y = BOARD_GRID_Y - 70 - (index % 5) * 22;
      const piece = new Graphics()
        .roundRect(-width / 2, -height / 2, width, height, 1)
        .fill({ color, alpha: 0.95 });
      piece.position.set(x, y);
      piece.rotation = ((index % 9) - 4) * 0.18;
      piece.zIndex = zIndexBase + (index % 8);
      record.container.addChild(piece);
      this.registerCelebrationElement(record, piece, "confetti", (index % 8) * 48);
    }
  }

  private playWinCelebration(
    tier: WinCelebrationTier,
    amount: number,
    options: { legendaryJackpot?: boolean } = {},
  ): void {
    if (!this.visualEffectsEnabled || this.reducedEffects) {
      return;
    }

    void this.loadGoldNumberFont();

    if (tier === "jackpot") {
      if (options.legendaryJackpot) {
        this.createLegendaryJackpotSequence(amount);
        return;
      }
      this.createJackpotSequence(amount);
      return;
    }
    if (tier === "bigWin") {
      this.createBigWinSequence(amount);
      return;
    }
    this.createPalenqueGoldWin(amount);
  }

  private playJackpotCelebrationSound(isLegendary: boolean): void {
    if (!isLegendary) {
      this.sound.play("jackpot");
      return;
    }

    window.setTimeout(() => {
      if (this.destroyed) {
        return;
      }
      this.sound.play("legendaryJackpot");
    }, LEGENDARY_JACKPOT_SOUND_DELAY_MS);
  }

  private duckMusicForCelebration(
    tier: WinCelebrationTier,
    options: { legendaryJackpot?: boolean } = {},
  ): void {
    const durationMs =
      tier === "jackpot" && options.legendaryJackpot
        ? LEGENDARY_JACKPOT_MUSIC_DUCK_DURATION_MS
        : WIN_CELEBRATION_MUSIC_DUCK_DURATIONS_MS[tier];
    this.sound.duckMusicFor(durationMs);
  }

  private createPalenqueGoldWin(amount: number): void {
    const record = this.createCelebrationRoot("win", amount);
    this.createCelebrationConfetti(record, 42, 42);
    const winSprite = new Sprite(Texture.EMPTY);
    winSprite.anchor.set(0.5);
    winSprite.width = WIN_IMAGE_WIDTH;
    winSprite.height = WIN_IMAGE_WIDTH;
    winSprite.position.set(CELEBRATION_CENTER_X, WIN_IMAGE_Y);
    winSprite.zIndex = 56;
    record.container.addChild(winSprite);
    this.registerCelebrationElement(record, winSprite, "winBannerPop", 0);
  }

  private createBigWinSequence(amount: number): void {
    const record = this.createCelebrationRoot("bigWin", amount);
    record.durationMs = BIG_WIN_SEQUENCE_DURATION_MS;
    const sequenceSprite = new Sprite(this.bigWinSequenceTextures[0] ?? Texture.EMPTY);
    sequenceSprite.position.set(-V2_BOARD_LAYOUT.x / BOARD_SCALE, -V2_BOARD_LAYOUT.y / BOARD_SCALE);
    sequenceSprite.width = UI_CONFIG.design.width / BOARD_SCALE;
    sequenceSprite.height = UI_CONFIG.design.height / BOARD_SCALE;
    sequenceSprite.zIndex = 35;
    record.container.addChild(sequenceSprite);

    const sequenceElement = this.registerCelebrationSequenceElement(record, sequenceSprite, 0);
    sequenceElement.sequenceTextures = this.bigWinSequenceTextures;
  }

  private createJackpotSequence(amount: number): void {
    const record = this.createCelebrationRoot("jackpot", amount, JACKPOT_SEQUENCE_START_DELAY_MS);
    record.durationMs =
      JACKPOT_SEQUENCE_START_DELAY_MS +
      JACKPOT_SEQUENCE_DURATION_MS +
      JACKPOT_SEQUENCE_HOLD_MS +
      JACKPOT_SEQUENCE_FADE_OUT_MS;
    const sequenceSprite = new Sprite(this.jackpotSequenceTextures[0] ?? Texture.EMPTY);
    sequenceSprite.position.set(-V2_BOARD_LAYOUT.x / BOARD_SCALE, -V2_BOARD_LAYOUT.y / BOARD_SCALE);
    sequenceSprite.width = UI_CONFIG.design.width / BOARD_SCALE;
    sequenceSprite.height = UI_CONFIG.design.height / BOARD_SCALE;
    sequenceSprite.zIndex = 35;
    record.container.addChild(sequenceSprite);

    const sequenceElement = this.registerCelebrationSequenceElement(
      record,
      sequenceSprite,
      JACKPOT_SEQUENCE_START_DELAY_MS,
      this.jackpotSequenceTextures,
      JACKPOT_SEQUENCE_DURATION_MS,
      JACKPOT_SEQUENCE_FADE_OUT_MS,
      JACKPOT_SEQUENCE_HOLD_MS,
    );
    sequenceElement.sequenceTextures = this.jackpotSequenceTextures;
  }

  private createLegendaryJackpotSequence(amount: number): void {
    const record = this.createCelebrationRoot("jackpot", amount, JACKPOT_SEQUENCE_START_DELAY_MS);
    record.durationMs =
      JACKPOT_SEQUENCE_START_DELAY_MS +
      LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS +
      LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS +
      LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS;
    const sequenceSprite = new Sprite(this.legendaryJackpotSequenceTextures[0] ?? Texture.EMPTY);
    sequenceSprite.position.set(-V2_BOARD_LAYOUT.x / BOARD_SCALE, -V2_BOARD_LAYOUT.y / BOARD_SCALE);
    sequenceSprite.width = UI_CONFIG.design.width / BOARD_SCALE;
    sequenceSprite.height = UI_CONFIG.design.height / BOARD_SCALE;
    sequenceSprite.zIndex = 35;
    record.container.addChild(sequenceSprite);

    const sequenceElement = this.registerCelebrationSequenceElement(
      record,
      sequenceSprite,
      JACKPOT_SEQUENCE_START_DELAY_MS,
      this.legendaryJackpotSequenceTextures,
      LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS,
      LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS,
      LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS,
    );
    sequenceElement.sequenceTextures = this.legendaryJackpotSequenceTextures;
  }

  private createWildExpandEffects(columns: number[]): void {
    for (const column of columns) {
      const graphic = new Graphics()
        .roundRect(4, 4, GAME_CONFIG.grid.cellSize - 8, GRID_HEIGHT - 8, 18)
        .fill({ color: 0xff4b36, alpha: 0.2 })
        .stroke({ color: 0xfff0a3, width: 4, alpha: 0.88 });
      graphic.position.set(column * GAME_CONFIG.grid.cellStep, 0);
      graphic.zIndex = 10;
      this.effectsLayer.addChild(graphic);
      this.gridEffects.push({
        graphic,
        type: "wildExpandVisual",
        elapsedMs: 0,
        durationMs: 820,
      });
    }
  }

  private createCellRingEffects(indices: number[], color: number, durationMs: number): void {
    indices.forEach((index, order) => {
      const base = this.symbolBasePositions[index];
      if (!base) {
        return;
      }
      const accentColor = WIN_GRID_EFFECT_COLORS[order % WIN_GRID_EFFECT_COLORS.length] ?? color;
      const graphic = new Graphics()
        .roundRect(
          -SYMBOL_SIZE / 2 + 12,
          -SYMBOL_SIZE / 2 + 12,
          SYMBOL_SIZE - 24,
          SYMBOL_SIZE - 24,
          14,
        )
        .stroke({ color: accentColor, width: 4, alpha: 0.9 })
        .roundRect(
          -SYMBOL_SIZE / 2 + 22,
          -SYMBOL_SIZE / 2 + 22,
          SYMBOL_SIZE - 44,
          SYMBOL_SIZE - 44,
          10,
        )
        .fill({ color, alpha: 0.12 });
      graphic.position.set(base.x, base.y);
      graphic.zIndex = 11;
      this.effectsLayer.addChild(graphic);
      this.gridEffects.push({
        graphic,
        type: "coinPop",
        elapsedMs: 0,
        durationMs,
      });
    });
  }

  private createPaylineTraceEffect(indices: number[]): void {
    this.createCellRingEffects(indices, 0xfff0a3, 620);
  }

  private createGridPulseEffect(color: number, durationMs: number): void {
    for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
      const accentColor = WIN_GRID_EFFECT_COLORS[column % WIN_GRID_EFFECT_COLORS.length] ?? color;
      const graphic = new Graphics()
        .roundRect(4, 4, GAME_CONFIG.grid.cellSize - 8, GRID_HEIGHT - 8, 18)
        .fill({ color, alpha: 0.08 })
        .stroke({ color: accentColor, width: 4, alpha: 0.76 });
      graphic.position.set(column * GAME_CONFIG.grid.cellStep, 0);
      graphic.zIndex = 8;
      this.effectsLayer.addChild(graphic);
      this.gridEffects.push({
        graphic,
        type: "bigWinGridPulse",
        elapsedMs: 0,
        durationMs,
      });
    }
  }

  private clearGridEffects(): void {
    for (const effect of this.gridEffects) {
      effect.graphic.destroy();
    }
    this.gridEffects.length = 0;
  }

  private updateWinningEffects(ticker: { deltaMS: number }): void {
    for (let index = this.winningEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.winningEffects[index];
      effect.elapsedMs += ticker.deltaMS;
      const progress = Math.min(1, effect.elapsedMs / effect.durationMs);
      effect.graphic.alpha = 1 - progress;
      effect.graphic.scale.set(1 + Math.sin(progress * Math.PI) * 0.04);
      if (progress >= 1) {
        effect.graphic.destroy();
        this.winningEffects.splice(index, 1);
      }
    }
  }

  private updateGridEffects(ticker: { deltaMS: number }): void {
    for (let index = this.gridEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.gridEffects[index];
      effect.elapsedMs += ticker.deltaMS;
      const progress = Math.min(1, effect.elapsedMs / effect.durationMs);
      effect.graphic.alpha = 1 - progress;
      effect.graphic.scale.set(
        effect.type === "coinPop" ? 1 + Math.sin(progress * Math.PI) * 0.04 : 1,
      );
      if (progress >= 1) {
        effect.graphic.destroy();
        this.gridEffects.splice(index, 1);
      }
    }
  }

  private playWinningSymbolAnimations(winningIndices: number[]): void {
    if (!this.animationsEnabled || this.reducedEffects) {
      return;
    }

    for (const index of winningIndices) {
      const symbolId = this.currentBoard[index];
      if (!symbolId) {
        continue;
      }

      if (symbolId === "WILD") {
        this.startWildWinningSymbolAnimation(index);
        continue;
      }

      if (this.isFloatingWinSymbol(symbolId)) {
        this.startFloatingWinningSymbol(index);
        continue;
      }

      const renderInfo = this.getCurrentSymbolRenderInfo(index);
      const textures = renderInfo
        ? this.symbolAnimationTextures.get(renderInfo.atlasBase)
        : undefined;
      if (!textures || textures.length <= 1) {
        this.restoreStaticSymbolTexture(index);
        continue;
      }

      this.winningSymbolAnimations.set(index, {
        textures,
        frame: 0,
        elapsedMs: 0,
        motion: "frames",
      });
      this.setSymbolTexture(index, textures[0]);
    }
  }

  private isFloatingWinSymbol(symbolId: SymbolId): boolean {
    return symbolId === "SCATTER";
  }

  private startWildWinningSymbolAnimation(index: number): void {
    const renderInfo = this.getCurrentSymbolRenderInfo(index);
    const wildTextSprite = this.wildSymbolTextSprites[index];
    if (this.wildSymbolWinTextures.length <= 1 || !this.wildSymbolTextTexture || !wildTextSprite) {
      this.startFloatingWinningSymbol(index);
      return;
    }

    this.setSymbolTexture(index, this.wildSymbolWinTextures[0]);
    this.applySymbolVisualTransform(index, renderInfo);
    wildTextSprite.texture = this.wildSymbolTextTexture;
    wildTextSprite.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER + WILD_SYMBOL_TEXT_OFFSET_Y);
    wildTextSprite.width = SYMBOL_SIZE;
    wildTextSprite.height = SYMBOL_SIZE;
    wildTextSprite.zIndex = 6;
    wildTextSprite.visible = true;
    this.winningSymbolAnimations.set(index, {
      textures: this.wildSymbolWinTextures,
      frame: 0,
      elapsedMs: 0,
      motion: "frames",
    });
  }

  private startFloatingWinningSymbol(index: number): void {
    const sprite = this.symbolSprites[index];
    const shadow = this.symbolShadowSprites[index];
    const renderInfo = this.getCurrentSymbolRenderInfo(index);
    const texture = renderInfo ? this.symbolTextures.get(renderInfo.atlasBase) : undefined;
    if (!sprite || !texture) {
      this.restoreStaticSymbolTexture(index);
      return;
    }

    this.setSymbolTexture(index, texture);
    this.winningSymbolAnimations.set(index, {
      textures: [texture],
      frame: 0,
      elapsedMs: 0,
      motion: "float",
      originSpriteX: sprite.x,
      originSpriteY: sprite.y,
      originShadowX: shadow?.x,
      originShadowY: shadow?.y,
    });
  }

  private clearWinningSymbolAnimations(): void {
    for (const index of this.winningSymbolAnimations.keys()) {
      this.restoreStaticSymbolTexture(index);
    }
    this.winningSymbolAnimations.clear();
  }

  private restoreStaticSymbolTexture(index: number): void {
    const renderInfo = this.getCurrentSymbolRenderInfo(index);
    const texture = renderInfo ? this.symbolTextures.get(renderInfo.atlasBase) : undefined;
    if (texture) {
      this.setSymbolTexture(index, texture);
      this.applySymbolVisualTransform(index, renderInfo);
    }
    this.updateStaticWildSymbolTextSprite(index, this.currentBoard[index] === "WILD");
  }

  private updateStaticWildSymbolTextSprite(index: number, visible: boolean): void {
    const wildTextSprite = this.wildSymbolTextSprites[index];
    if (!wildTextSprite || !this.wildSymbolTextTexture || !visible) {
      this.hideWildSymbolTextSprite(index);
      return;
    }

    wildTextSprite.texture = this.wildSymbolTextTexture;
    wildTextSprite.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER + WILD_SYMBOL_TEXT_OFFSET_Y);
    wildTextSprite.width = SYMBOL_SIZE;
    wildTextSprite.height = SYMBOL_SIZE;
    wildTextSprite.zIndex = 6;
    wildTextSprite.visible = true;
  }

  private hideWildSymbolTextSprite(index: number): void {
    const wildTextSprite = this.wildSymbolTextSprites[index];
    if (wildTextSprite) {
      wildTextSprite.visible = false;
    }
  }

  private getCurrentSymbolRenderInfo(index: number): SymbolRenderInfo | null {
    return this.getSymbolRenderInfo(
      this.currentBoard[index],
      index,
      this.symbolVariantSeeds[index] ?? index,
    );
  }

  private setSymbolTexture(index: number, texture: Texture): void {
    const sprite = this.symbolSprites[index];
    const shadow = this.symbolShadowSprites[index];
    if (sprite) {
      sprite.texture = texture;
      sprite.visible = true;
    }
    if (shadow) {
      shadow.texture = texture;
      shadow.visible = true;
    }
  }

  private updateWinningSymbolAnimations(ticker: { deltaMS: number }): void {
    for (const [index, record] of this.winningSymbolAnimations) {
      if (!this.activeWinningIndices.has(index)) {
        this.restoreStaticSymbolTexture(index);
        this.winningSymbolAnimations.delete(index);
        this.markSymbolsDirty();
        continue;
      }

      record.elapsedMs += ticker.deltaMS;
      if (record.motion === "float") {
        const sprite = this.symbolSprites[index];
        const shadow = this.symbolShadowSprites[index];
        const floatOffset = Math.sin(record.elapsedMs * 0.006) * 7 - 6;
        if (sprite && record.originSpriteX !== undefined && record.originSpriteY !== undefined) {
          sprite.position.set(record.originSpriteX, record.originSpriteY + floatOffset);
        }
        if (shadow && record.originShadowX !== undefined && record.originShadowY !== undefined) {
          shadow.position.set(record.originShadowX, record.originShadowY + floatOffset);
        }
        continue;
      }

      if (record.elapsedMs < SYMBOL_WIN_FRAME_MS) {
        continue;
      }

      record.elapsedMs = 0;
      record.frame = (record.frame + 1) % record.textures.length;
      this.setSymbolTexture(index, record.textures[record.frame]);
    }
  }

  private triggerBoardShake(durationMs: number, magnitude: number): void {
    if (!this.visualEffectsEnabled || this.reducedEffects) {
      this.clearBoardShake();
      return;
    }

    this.boardShake = { elapsedMs: 0, durationMs, magnitude };
  }

  private clearBoardShake(): void {
    this.boardShake = { elapsedMs: 0, durationMs: 0, magnitude: 0 };
    this.board.position.set(this.boardBasePosition.x, this.boardBasePosition.y);
  }

  private updateBoardShake(ticker: { deltaMS: number }): void {
    if (this.boardShake.durationMs <= 0) {
      return;
    }

    this.boardShake.elapsedMs += ticker.deltaMS;
    const progress = Math.min(1, this.boardShake.elapsedMs / this.boardShake.durationMs);
    const power = (1 - progress) * this.boardShake.magnitude;
    this.board.position.set(
      this.boardBasePosition.x + Math.sin(this.boardShake.elapsedMs * 0.09) * power,
      this.boardBasePosition.y + Math.cos(this.boardShake.elapsedMs * 0.13) * power,
    );

    if (progress >= 1) {
      this.boardShake = { elapsedMs: 0, durationMs: 0, magnitude: 0 };
      this.board.position.set(this.boardBasePosition.x, this.boardBasePosition.y);
    }
  }

  private resetIdleSymbolsToStaticPositions(): void {
    if (this.reelMotionActive) {
      return;
    }

    for (let index = 0; index < this.symbolSprites.length; index += 1) {
      if (this.winningSymbolAnimations.has(index)) {
        continue;
      }

      const base = this.symbolBasePositions[index];
      const sprite = this.symbolSprites[index];
      const text = this.symbolTexts[index];
      if (!base || !sprite || !text) {
        continue;
      }

      sprite.width = SYMBOL_SIZE;
      sprite.height = SYMBOL_SIZE;
      this.applySymbolVisualTransform(index, this.getCurrentSymbolRenderInfo(index));
      text.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER);
      text.scale.set(1);
    }
  }

  private markSymbolsDirty(): void {
    this.symbolsDirty = true;
  }

  private async loadGoldNumberFont(): Promise<void> {
    this.goldNumberFontLoaded = false;
  }

  private async loadSymbolTextures(
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    this.symbolTextures.clear();
    this.symbolAnimationTextures.clear();
    const { staticTextures, animationTextures } = await loadDeliverySymbolTextures();
    for (const [symbol, texture] of staticTextures) {
      this.symbolTextures.set(symbol, texture);
    }
    for (const [symbol, textures] of animationTextures) {
      this.symbolAnimationTextures.set(symbol, textures);
    }
    onProgress?.(staticTextures.size, Math.max(1, staticTextures.size));
  }

  private resize(): void {
    const viewportWidth = Math.max(1, this.host.clientWidth || window.innerWidth);
    const viewportHeight = Math.max(1, this.host.clientHeight || window.innerHeight);
    this.app.renderer.resize(viewportWidth, viewportHeight);
    const layoutViewport = readLayoutViewportSize(viewportWidth, viewportHeight);
    const layoutOffset = computeLayoutViewportOffset({
      viewportWidth,
      viewportHeight,
      layoutViewportWidth: layoutViewport.width,
      layoutViewportHeight: layoutViewport.height,
    });
    const viewport = computeDesignViewport({
      viewportWidth: layoutViewport.width,
      viewportHeight: layoutViewport.height,
      designWidth: UI_CONFIG.design.width,
      designHeight: UI_CONFIG.design.height,
      fitMode: UI_CONFIG.canvas.fitMode,
    });
    this.app.stage.scale.set(viewport.scaleX, viewport.scaleY);
    this.app.stage.position.set(
      viewport.offsetX + layoutOffset.x,
      viewport.offsetY + layoutOffset.y,
    );
  }

  private animateSequences(ticker: { deltaMS: number }): void {
    if (this.animationsEnabled && !this.reducedEffects) {
      for (const record of this.animatedSprites) {
        record.elapsedMs += ticker.deltaMS;
        if (record.elapsedMs < record.intervalMs) {
          continue;
        }

        record.elapsedMs = 0;
        record.frame = (record.frame + 1) % record.textures.length;
        record.sprite.texture = record.textures[record.frame];
        const shadow = record.shadow;
        if (shadow) {
          shadow.texture = record.sprite.texture;
        }
      }
    }

    if (this.animationsEnabled && !this.reducedEffects) {
      this.updateWinningSymbolAnimations(ticker);
    }
    if (this.visualEffectsEnabled) {
      this.updateWinningEffects(ticker);
      this.updateGridEffects(ticker);
      this.updateWinCelebrations(ticker);
    }
    this.updateBoardShake(ticker);
    if (this.symbolsDirty && this.animationsEnabled && !this.reducedEffects) {
      if (!this.reelMotionActive) {
        this.resetIdleSymbolsToStaticPositions();
        this.symbolsDirty = false;
      }
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private getTiming(ms: number): number {
    const multiplier = SPIN_MODE_SPEED_MULTIPLIERS[this.spinMode] ?? 1;
    return multiplier === 1 ? ms : Math.max(8, Math.round(ms * multiplier));
  }

  private getSpinFrameProfile(): SpinFrameProfile {
    return SPIN_MODE_FRAME_PROFILES[this.spinMode] ?? SPIN_MODE_FRAME_PROFILES[1];
  }

  private getReelBlurStrength(): number {
    if (!this.visualEffectsEnabled || this.reducedEffects) {
      return 0;
    }
    return REEL_BLUR_STRENGTH_BY_SPIN_MODE[this.spinMode] ?? REEL_BLUR_STRENGTH;
  }

  private getStoppingReelBlurStrength(progress: number): number {
    const baseStrength = this.getReelBlurStrength();
    if (baseStrength <= 0) {
      return 0;
    }

    return baseStrength * Math.max(0.2, 1 - progress * 0.7);
  }
}
