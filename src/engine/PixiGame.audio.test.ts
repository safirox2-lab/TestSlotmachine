import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readTemplateFile = (path: string) => readFileSync(resolve(templateRoot, path), "utf8");
const pixiRuntimeSourceFiles = ["src/engine/PixiGame.ts", "src/engine/winSequenceAssets.ts"];
const pixiRuntimeSource = () => pixiRuntimeSourceFiles.map(readTemplateFile).join("\n");

describe("PixiGame audio event choreography", () => {
  it("keeps long win stingers for spin completion instead of every cascade", () => {
    const source = pixiRuntimeSource();

    expect(source).not.toContain(
      'this.sound.play(step.win >= store.bet * 20 ? "cascadeChain" : "coinPop");',
    );
    expect(source).toContain('if (celebrationTier === "jackpot")');
    expect(source).toContain('} else if (celebrationTier === "bigWin")');
    expect(source).toContain('} else if (celebrationTier === "win")');
  });

  it("renders the Delivery manifest scene and vibrates on winning cascades", () => {
    const source = pixiRuntimeSource();

    expect(source).toContain("private async drawDeliveryScene(): Promise<void>");
    expect(source).toContain("const title = await loadDeliverySprite(manifest.assets.title.src);");
    expect(source).toContain("this.deliveryBoardSprite = await loadDeliverySprite");
    expect(source).not.toContain("addFootShadow");
    expect(source).not.toContain("HEADER_LAYOUT.items.whiteCock.shadow");
    expect(source).not.toContain("HEADER_LAYOUT.items.blackRoaster.shadow");
    expect(source).toContain("private vibrationEnabled = true");
    expect(source).toContain("setVibrationEnabled(enabled: boolean): void");
    expect(source).toContain("if (this.vibrationEnabled) {");
    expect(source).toContain("navigator.vibrate?.(35)");
    expect(source).toContain("setAudioVolume");
  });

  it("locks spin without awaiting audio unlock so browser audio policy cannot freeze reels", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const lockIndex = source.indexOf("this.spinning = true;", spinStart);
    const busyIndex = source.indexOf("store.setSpinBusy(true);", spinStart);
    const spinSoundIndex = source.indexOf('this.playSoundEvent("spin");', spinStart);

    expect(lockIndex).toBeGreaterThan(spinStart);
    expect(busyIndex).toBeGreaterThan(lockIndex);
    expect(spinSoundIndex).toBeGreaterThan(busyIndex);
    expect(spinSource).not.toContain("await this.unlockAudio();");
    expect(source).toContain("gameplay must never wait on browser audio policy");
  });

  it("starts base music after the loading screen and retries on the first gesture if autoplay is blocked", () => {
    const source = pixiRuntimeSource();

    expect(source).toContain("private loadingScreenMusicRequested = false;");
    expect(source).toContain("private loadingMusicGestureCleanup: (() => void) | null = null;");
    expect(source).toContain("startMusicAfterLoadingScreen(): void");
    expect(source).toContain("void this.tryStartLoadingScreenMusic();");
    expect(source).toContain("private async tryStartLoadingScreenMusic(): Promise<void>");
    expect(source).toContain("this.installLoadingMusicGestureFallback();");
    expect(source).toContain("this.clearLoadingMusicGestureFallback();");
    expect(source).toContain("return this.unlockAudioInternal({ awaitMusicStart: false });");
    expect(source).toContain("this.unlockAudioInternal({ awaitMusicStart: true })");
    expect(source).toContain('window.addEventListener("pointerdown", retry, listenerOptions);');
    expect(source).toContain('window.addEventListener("keydown", retry, listenerOptions);');
  });

  it("reports startup loading progress while Pixi prepares scene resources", () => {
    const source = pixiRuntimeSource();
    const mountStart = source.indexOf("async mount(): Promise<void>");
    const mountEnd = source.indexOf("destroy(): void", mountStart);
    const mountSource = source.slice(mountStart, mountEnd);

    expect(source).toContain('import { useUiStore } from "../store/uiStore";');
    expect(mountSource).toContain("const setLoadingProgress = (progress: number) =>");
    expect(mountSource).toContain("useUiStore.getState().setLoadingProgress(progress);");
    expect(mountSource).toContain("setLoadingProgress(1);");
    expect(mountSource).toContain("setLoadingProgress(100);");
    expect(mountSource).toContain("this.loadSymbolTextures((loaded, total) => {");
  });

  it("supports three spin speed modes with a faster x1 cadence and faster turbo modes", () => {
    const source = pixiRuntimeSource();

    expect(source).toContain("type SpinMode = 1 | 2 | 3;");
    expect(source).toContain("SPIN_MODE_SPEED_MULTIPLIERS: Record<SpinMode, number>");
    expect(source).toContain("const SPIN_MODE_FRAME_PROFILES: Record<SpinMode, SpinFrameProfile>");
    expect(source).toContain("const REEL_TARGET_SPIN_DURATION_MS = 4100;");
    expect(source).toContain("const REEL_BASE_FRAME_MS = REEL_TARGET_SPIN_DURATION_MS / 100;");
    expect(source).toContain("const REEL_FRAME_MS = 1000 / 60;");
    expect(source).toContain("const REEL_FRAME_RATE_SCALE = REEL_BASE_FRAME_MS / REEL_FRAME_MS;");
    expect(source).toContain("const REEL_STEP_SCALE = REEL_FRAME_MS / REEL_BASE_FRAME_MS;");
    expect(source).toContain(
      "const REEL_TICK_FRAME_INTERVAL = Math.round(4 * REEL_FRAME_RATE_SCALE);",
    );
    expect(source).toContain("const REEL_PRESPIN_FRAMES = Math.round(34 * REEL_FRAME_RATE_SCALE);");
    expect(source).toContain("const REEL_STOP_FRAMES = Math.round(7 * REEL_FRAME_RATE_SCALE);");
    expect(source).toContain("const REEL_LANDING_FRAMES = Math.round(5 * REEL_FRAME_RATE_SCALE);");
    expect(source).toContain("const WIN_CASCADE_HOLD_MS = 650;");
    expect(source).toContain("const NO_WIN_CASCADE_HOLD_MS = 180;");
    expect(source).not.toContain("const REEL_FRAME_MS = REEL_TARGET_SPIN_DURATION_MS / 100;");
    expect(source).toContain("1: 0.88");
    expect(source).toContain("2: 0.8");
    expect(source).toContain("3: 0.72");
    expect(source).toContain("preSpinFrames: REEL_PRESPIN_FRAMES");
    expect(source).toContain(
      "preSpinFrames: REEL_PRESPIN_FRAMES - Math.round(8 * REEL_FRAME_RATE_SCALE)",
    );
    expect(source).toContain(
      "preSpinFrames: REEL_PRESPIN_FRAMES - Math.round(14 * REEL_FRAME_RATE_SCALE)",
    );
    expect(source).toContain(
      "stopFrames: REEL_STOP_FRAMES - Math.round(2 * REEL_FRAME_RATE_SCALE)",
    );
    expect(source).toContain(
      "landingFrames: REEL_LANDING_FRAMES - Math.round(REEL_FRAME_RATE_SCALE)",
    );
    expect(source).toContain(
      "finalRevealFrames: REEL_FINAL_REVEAL_FRAMES - Math.round(REEL_FRAME_RATE_SCALE)",
    );
    expect(source).toContain("const REEL_BLUR_STRENGTH_BY_SPIN_MODE: Record<SpinMode, number>");
    expect(source).toContain("1: 1.2");
    expect(source).toContain("private spinMode: SpinMode = 1");
    expect(source).toContain("setSpinMode(mode: SpinMode): void");
    expect(source).toContain("this.spinMode = normalizeSpinMode(mode);");
    expect(source).toContain("private getSpinFrameProfile(): SpinFrameProfile");
    expect(source).toContain("private getReelBlurStrength(): number");
    expect(source).toContain("this.getTiming(REEL_FRAME_MS)");
    expect(source).toContain("Math.max(8, Math.round(ms * multiplier))");
    expect(source).toContain("this.getTiming(WIN_CASCADE_HOLD_MS)");
    expect(source).toContain("this.getTiming(NO_WIN_CASCADE_HOLD_MS)");
    expect(source).not.toContain("private turboMode = false");
  });

  it("exposes mobile performance controls and gates expensive visual work", () => {
    const source = pixiRuntimeSource();
    const animateStart = source.indexOf("private animateSequences(");
    const animateEnd = source.indexOf("private wait(", animateStart);
    const animateSource = source.slice(animateStart, animateEnd);
    const animationsStart = source.indexOf("setAnimationsEnabled(enabled: boolean): void");
    const animationsEnd = source.indexOf(
      "setVisualEffectsEnabled(enabled: boolean): void",
      animationsStart,
    );
    const animationsSource = source.slice(animationsStart, animationsEnd);

    expect(source).toContain("private animationsEnabled = true;");
    expect(source).toContain("private visualEffectsEnabled = true;");
    expect(source).toContain("private reducedEffects = false;");
    expect(source).toContain("setAnimationsEnabled(enabled: boolean): void");
    expect(source).toContain("setVisualEffectsEnabled(enabled: boolean): void");
    expect(source).toContain("setReducedEffects(enabled: boolean): void");
    expect(source).toContain("this.clearGridEffects();");
    expect(source).toContain("this.clearWinningEffects();");
    expect(source).toContain("if (!this.visualEffectsEnabled || this.reducedEffects) {");
    expect(source).toContain("private resetAnimationState(): void");
    expect(source).toContain("private resetAnimatedSpritesToInitialFrames(): void");
    expect(animationsSource).toContain("this.resetAnimationState();");
    expect(animateSource).toContain("if (this.animationsEnabled && !this.reducedEffects) {");
    expect(animateSource).not.toContain("&& !this.reelMotionActive");
    expect(source).toContain(
      "this.setReelColumnBlur(column, wrappedOffset === 0 ? 0 : blurStrength);",
    );
    expect(source).toContain("getAdaptiveCanvasResolution,");
    expect(source).toContain("getBrowserDevicePerformanceClass,");
    expect(source).toContain('} from "../utils/deviceQuality";');
    expect(source).toContain('powerPreference: "high-performance",');
    expect(source).toContain("private devicePerformanceClass");
    expect(source).toContain("this.devicePerformanceClass = getBrowserDevicePerformanceClass();");
    expect(source).toContain('if (this.devicePerformanceClass === "low") {');
    expect(source).toContain("this.setReducedEffects(true);");
    expect(source).toContain("antialias: false,");
    expect(source).toContain("resolution: getAdaptiveCanvasResolution({");
    expect(animateSource).not.toContain("Array.from(");
    expect(animateSource).not.toContain(".map(");
    expect(animateSource).not.toContain(".filter(");
    expect(animateSource).not.toContain(".flatMap(");
    expect(animateSource).toContain(
      "if (this.symbolsDirty && this.animationsEnabled && !this.reducedEffects) {",
    );
    expect(animateSource).toContain("this.symbolsDirty = false;");
    expect(source).toContain("private symbolsDirty = true;");
    expect(source).toContain("private markSymbolsDirty(): void");
  });

  it("uses the standard stage viewport transform without fullscreen-specific foreground locking", () => {
    const source = pixiRuntimeSource();
    const resizeStart = source.indexOf("private resize(): void");
    const resizeEnd = source.indexOf("private animateSequences", resizeStart);
    const resizeSource = source.slice(resizeStart, resizeEnd);

    expect(source).not.toContain("private readonly backgroundLayer = new Container();");
    expect(source).not.toContain("private readonly gameplayLayer = new Container();");
    expect(source).not.toContain('private getGameplayFitMode(): "contain" | "mobilePortraitFill"');
    expect(source).not.toContain("private applyBackgroundCoverTransform");
    expect(resizeSource).toContain("fitMode: UI_CONFIG.canvas.fitMode,");
    expect(resizeSource).toContain(
      "const layoutViewport = readLayoutViewportSize(viewportWidth, viewportHeight);",
    );
    expect(resizeSource).toContain("const layoutOffset = computeLayoutViewportOffset({");
    expect(resizeSource).toContain("this.app.stage.scale.set(viewport.scaleX, viewport.scaleY);");
    expect(resizeSource).toContain("this.app.stage.position.set(");
    expect(resizeSource).toContain("viewport.offsetX + layoutOffset.x,");
    expect(resizeSource).toContain("viewport.offsetY + layoutOffset.y,");
    expect(resizeSource).not.toContain(
      "this.gameplayLayer.scale.set(viewport.scaleX, viewport.scaleY);",
    );
  });

  it("treats board shake as a visual effect for reduced mobile performance modes", () => {
    const source = pixiRuntimeSource();
    const visualEffectsStart = source.indexOf("setVisualEffectsEnabled(enabled: boolean): void");
    const visualEffectsEnd = source.indexOf(
      "setReducedEffects(enabled: boolean): void",
      visualEffectsStart,
    );
    const visualEffectsSource = source.slice(visualEffectsStart, visualEffectsEnd);
    const reducedEffectsStart = source.indexOf("setReducedEffects(enabled: boolean): void");
    const reducedEffectsEnd = source.indexOf(
      "setTurboMode(enabled: boolean): void",
      reducedEffectsStart,
    );
    const reducedEffectsSource = source.slice(reducedEffectsStart, reducedEffectsEnd);
    const shakeStart = source.indexOf("private triggerBoardShake(");
    const shakeEnd = source.indexOf("private updateBoardShake", shakeStart);
    const shakeSource = source.slice(shakeStart, shakeEnd);

    expect(source).toContain("private clearBoardShake(): void");
    expect(visualEffectsSource).toContain("this.clearBoardShake();");
    expect(reducedEffectsSource).toContain("this.clearBoardShake();");
    expect(shakeSource).toContain("if (!this.visualEffectsEnabled || this.reducedEffects) {");
    expect(shakeSource).toContain("this.clearBoardShake();");
    expect(shakeSource).toContain("return;");
  });

  it("keeps the game store busy for the whole spin lifecycle", () => {
    const source = pixiRuntimeSource();
    const storeSource = readTemplateFile("src/store/gameStore.ts");

    expect(storeSource).toContain("spinBusy: boolean;");
    expect(storeSource).toContain("setSpinBusy: (spinBusy: boolean) => void;");
    expect(source).toContain("store.setSpinBusy(true);");
    expect(source).toContain("store.incrementRoundNumber();");
    expect(source).toContain("store.setSpinBusy(false);");
    expect(source).toContain("const isFreeSpin = store.freeSpins > 0;");
    expect(source).toContain("store.setFreeSpins(store.freeSpins - 1);");
    expect(source).toContain("const debugScenarioMode = getActiveDebugScenario(store);");
    expect(source).toContain(
      "? createDebugSpinResult(debugScenarioMode, { bet, tensionLevel: store.tensionLevel })",
    );
    expect(source).toContain("const resolvedWin = result.totalWin;");
    expect(source).toContain("this.getFinalSpinStatus(result, resolvedWin, bet);");
    expect(source).toContain("store.setStatus(finalStatus);");
  });

  it("draws the Delivery scene from generated manifests before creating the board", () => {
    const source = pixiRuntimeSource();
    const createSceneStart = source.indexOf("private async createScene(): Promise<void>");
    const baseBackgroundIndex = source.indexOf("this.drawBackground();", createSceneStart);
    const deliverySceneIndex = source.indexOf("await this.drawDeliveryScene();", createSceneStart);
    const boardIndex = source.indexOf("this.drawTemplateBoard();", createSceneStart);

    expect(source).toContain("private async drawDeliveryScene(): Promise<void>");
    expect(source).toContain("loadDeliverySceneManifest");
    expect(source).toContain("loadDeliverySprite");
    expect(source).toContain("this.deliveryBoardSprite = await loadDeliverySprite");
    expect(source).toContain("private drawTemplateBoard(): void");
    expect(source).not.toContain('const SCENE_BACKGROUND_PATH = "/raw/background.png";');
    expect(source).not.toContain("grid_background.png");
    expect(source).not.toContain("frame-grid-slots.png");
    expect(baseBackgroundIndex).toBeGreaterThan(createSceneStart);
    expect(deliverySceneIndex).toBeGreaterThan(baseBackgroundIndex);
    expect(boardIndex).toBeGreaterThan(deliverySceneIndex);
  });

  it("renders winning symbol effects as bounded cell highlights instead of payline strokes", () => {
    const source = pixiRuntimeSource();
    const methodStart = source.indexOf("private playWinningEffects(");
    const methodEnd = source.indexOf("private showWinSymbolMotion", methodStart);
    const methodSource = source.slice(methodStart, methodEnd);

    expect(source).toContain("type WinningSymbol");
    expect(source).toContain("private createWinningLineEffect(positions: number[]): void");
    expect(source).toContain("const WIN_GRID_EFFECT_COLORS = [");
    expect(source).toContain("private createWinningCellEffect(index: number, order: number): void");
    expect(source).toContain("SYMBOL_SIZE - 20");
    expect(source).toContain(".roundRect(");
    expect(methodSource).toContain("this.createWinningLineEffect");
    expect(methodSource).toContain("this.createWinningCellEffect(index, order);");
    expect(source).not.toContain("graphic.moveTo");
    expect(source).not.toContain("graphic.lineTo");
    expect(methodSource).not.toContain(".fill({ color: 0xffd95a");
  });

  it("draws static vertical needle separators behind reel symbols", () => {
    const source = pixiRuntimeSource();
    const boardStart = source.indexOf("private drawTemplateBoard(): void");
    const boardEnd = source.indexOf("private setupReelsLayer(): void", boardStart);
    const boardSource = source.slice(boardStart, boardEnd);
    const separatorStart = source.indexOf("private drawGridNeedleSeparators(): void");
    const separatorEnd = source.indexOf("private setupReelsLayer(): void", separatorStart);
    const separatorSource = source.slice(separatorStart, separatorEnd);

    expect(source).toContain("const GRID_SEPARATOR_Z_INDEX = 3;");
    expect(source).toContain("const GRID_SEPARATOR_COLOR = HUD_LABEL_GOLD;");
    expect(source).toContain("private readonly gridSeparatorLayer = new Container();");
    expect(source).toContain("private drawGridNeedleSeparators(): void");
    expect(boardSource).toContain("this.drawGridNeedleSeparators();");
    expect(boardSource.indexOf("const boardBackground = new Graphics()")).toBeLessThan(
      boardSource.indexOf("this.drawGridNeedleSeparators();"),
    );
    expect(boardSource.indexOf("this.drawGridNeedleSeparators();")).toBeLessThan(
      boardSource.indexOf("this.setupReelsLayer();"),
    );
    expect(separatorSource).toContain(
      "for (let column = 1; column < GAME_CONFIG.grid.columns; column += 1)",
    );
    expect(separatorSource).toContain(
      "const x = column * GAME_CONFIG.grid.cellStep - GRID_SEPARATOR_WIDTH / 2;",
    );
    expect(separatorSource).toContain("needle.moveTo(GRID_SEPARATOR_WIDTH / 2, 0);");
    expect(separatorSource).toContain(
      "needle.lineTo(GRID_SEPARATOR_WIDTH * 0.68, GRID_SEPARATOR_CAP_HEIGHT);",
    );
    expect(separatorSource).toContain(
      "needle.lineTo(GRID_SEPARATOR_WIDTH * 0.6, GRID_SEPARATOR_HEIGHT / 2);",
    );
    expect(separatorSource).toContain(
      "needle.lineTo(GRID_SEPARATOR_WIDTH / 2, GRID_SEPARATOR_HEIGHT);",
    );
    expect(separatorSource).toContain(
      "needle.fill({ color: GRID_SEPARATOR_COLOR, alpha: GRID_SEPARATOR_ALPHA });",
    );
  });

  it("renders Delivery atlas symbols without legacy character borders", () => {
    const source = pixiRuntimeSource();
    const symbolConfig = readTemplateFile("src/symbol-config.ts");
    const idleStart = source.indexOf("private resetIdleSymbolsToStaticPositions(");
    const idleEnd = source.indexOf("private async addSprite", idleStart);
    const idleSource = source.slice(idleStart, idleEnd);

    expect(symbolConfig).toContain("TELEFONO7: {");
    expect(symbolConfig).toContain('atlasBase: "telefono7"');
    expect(symbolConfig).toContain('atlasBase: "dwild"');
    expect(symbolConfig).toContain('atlasBase: "pizza"');
    expect(symbolConfig).not.toContain("PERSONAJE: {");
    expect(symbolConfig).not.toContain("visualVariants: [");
    expect(symbolConfig).not.toContain('tier: "character"');
    expect(source).not.toContain('const CHARACTER_SYMBOL_TIER = "character";');
    expect(source).not.toContain("SYMBOL_FRAME_PADDING");
    expect(source).not.toContain("private isFramedCharacterSymbol");
    expect(source).not.toContain("private updateSymbolFrame");
    expect(source).not.toContain("private updateReelBufferFrame");
    expect(source).toContain("private applySymbolVisualTransform(");
    expect(source).toContain(
      "sprite.position.set(SYMBOL_CELL_CENTER + offsetX, SYMBOL_CELL_CENTER + offsetY);",
    );
    expect(source).toContain(
      "shadow.position.set(sprite.x + SYMBOL_SHADOW_OFFSET_X, sprite.y + SYMBOL_SHADOW_OFFSET_Y);",
    );
    expect(source).toContain("offsetY: variant?.offsetY ?? 0,");
    expect(source).not.toContain("this.updateSymbolFrame(index, symbolId, symbol);");
    expect(idleSource).toContain("private resetIdleSymbolsToStaticPositions(): void");
    expect(idleSource).toContain(
      "this.applySymbolVisualTransform(index, this.getCurrentSymbolRenderInfo(index));",
    );
    expect(idleSource).toContain("sprite.width = SYMBOL_SIZE;");
    expect(idleSource).toContain("sprite.height = SYMBOL_SIZE;");
    expect(idleSource).toContain("text.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER);");
    expect(idleSource).toContain("text.scale.set(1);");
    expect(idleSource).not.toContain("const pulse = Math.sin(this.idleElapsedMs");
    expect(idleSource).not.toContain("pulse * (winning ? 4 : 1.4)");
  });

  it("updates the top grid label from the actual game state instead of leaving it static", () => {
    const source = pixiRuntimeSource();

    expect(source).toContain("private readonly gridStatusTexts: Text[] = [];");
    expect(source).toContain("private gameStoreUnsubscribe: (() => void) | null = null;");
    expect(source).toContain("this.gameStoreUnsubscribe = useGameStore.subscribe");
    expect(source).toContain(
      "state.status !== previous.status || state.lastWin !== previous.lastWin",
    );
    expect(source).toContain("private updateGridStatusText(state = useGameStore.getState()): void");
    expect(source).toContain(
      "private getGridStatusText(state: { status: GameStatus; lastWin: number }): string",
    );
    expect(source).toContain('return "GIRANDO";');
    expect(source).toContain('return "EVALUANDO";');
    expect(source).toContain('return "JACKPOT";');
    expect(source).toContain('return "ERROR";');
    expect(source).toContain('return "LISTO PARA GIRAR";');
    expect(source).toContain("this.gameStoreUnsubscribe?.();");
  });

  it("adds premium reel lock feedback without starting stop frames at wrapped zero", () => {
    const source = pixiRuntimeSource();
    const stopStart = source.indexOf("private async animateColumnStop(");
    const stopEnd = source.indexOf("private async settleColumnLandingOvershoot", stopStart);
    const stopSource = source.slice(stopStart, stopEnd);

    expect(source).not.toContain("const REEL_LANDING_OVERSHOOT_RATIO");
    expect(source).not.toContain("const REEL_LANDING_RETURN_START_PROGRESS");
    expect(source).toContain("const REEL_LOCK_FLASH_DURATION_MS = 180;");
    expect(source).toContain("private createColumnLockEffect(column: number): void");
    expect(source).toContain("private async settleColumnLandingOvershoot(");
    expect(source).not.toContain("private getReelLandingCorrectionTravel(");
    expect(source).toContain("graphic.position.set(column * GAME_CONFIG.grid.cellStep + 3, 3);");
    expect(source).toContain('type: "reelLock"');
    expect(source).toContain("effect.graphic.scale.set(");
    expect(source).toContain(
      'effect.type === "coinPop" ? 1 + Math.sin(progress * Math.PI) * 0.04 : 1',
    );
    expect(stopSource).toContain("const profile = this.getSpinFrameProfile();");
    expect(stopSource).toContain("for (let frame = 0; frame < profile.stopFrames; frame += 1)");
    expect(stopSource).toContain("const travelProgress = (frame + 1) / profile.stopFrames;");
    expect(stopSource).toContain("const settleProgress = 1 - (1 - travelProgress) ** 3;");
    expect(stopSource).toContain(
      "const targetTravel = this.getNextReelTrackBoundaryTravel(startTravel);",
    );
    expect(stopSource).toContain(
      "const overshootTravel = targetTravel + this.getReelWeightShiftPx();",
    );
    expect(stopSource).toContain(
      "Math.round(startTravel + (overshootTravel - startTravel) * settleProgress)",
    );
    expect(stopSource).toContain(
      "await this.settleColumnLandingOvershoot(column, targetTravel, { heldColumn });",
    );
    expect(stopSource).toContain("this.setColumnOffset(column, targetTravel, 0);");
    expect(stopSource).toContain("this.createColumnLockEffect(column);");
    expect(stopSource).not.toContain("REEL_STOP_OVERSHOOT_PX");
    expect(stopSource).not.toContain("this.setColumnOffset(column, 0, 0);");
    expect(stopSource).not.toContain("Math.sin(travelProgress * Math.PI)");
    expect(stopSource).not.toContain(
      "const offset = Math.round((1 - progress) * GAME_CONFIG.grid.cellStep + bounce);",
    );
  });

  it("keeps the stopping reel icons persistent instead of swapping to the final board", () => {
    const source = pixiRuntimeSource();
    const stopStart = source.indexOf("private async animateColumnStop(");
    const stopEnd = source.indexOf("private async settleColumnLandingOvershoot", stopStart);
    const stopSource = source.slice(stopStart, stopEnd);

    expect(source).toContain(
      "const REEL_FINAL_REVEAL_FRAMES = Math.max(1, Math.round(2 * REEL_FRAME_RATE_SCALE));",
    );
    expect(stopSource).toContain("this.renderPersistentReelColumn(currentColumn);");
    expect(stopSource).toContain("this.setColumnOffset(column, targetTravel, 0);");
    expect(stopSource).not.toContain(
      "const landingFrame = frame >= profile.stopFrames - profile.finalRevealFrames;",
    );
    expect(stopSource).not.toContain("this.renderContinuousReelColumn(finalBoard, currentColumn);");
    expect(stopSource).not.toContain("this.renderContinuousReelColumn(finalBoard, column);");
    expect(stopSource).not.toContain(
      "this.renderContinuousReelColumn(rollingBoard, currentColumn, frame + currentColumn);",
    );
  });

  it("settles stopped landing overshoot with persistent icons instead of repainting final board", () => {
    const source = pixiRuntimeSource();
    const landingStart = source.indexOf("private async settleColumnLandingOvershoot(");
    const landingEnd = source.indexOf("private updateSymbolFrame", landingStart);
    const landingSource = source.slice(landingStart, landingEnd);

    expect(landingSource).toContain("this.renderPersistentReelColumn(currentColumn);");
    expect(landingSource).toContain(
      "const overshootTravel = targetTravel + this.getReelWeightShiftPx();",
    );
    expect(landingSource).toContain("const settleTravel = Math.round(");
    expect(landingSource).toContain("this.setColumnOffset(column, settleTravel, 0);");
    expect(landingSource).toContain("this.setColumnOffset(column, targetTravel, 0);");
    expect(landingSource).not.toContain("this.getReelLandingCorrectionTravel(");
    expect(landingSource).not.toContain("this.setReelColumnLandingOffset(");
    expect(landingSource).not.toContain(
      "this.renderContinuousReelColumn(finalBoard, currentColumn);",
    );
  });

  it("adds reel weight pullback and a single final half-cell settle while preserving faster item travel", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("private async animateReelSpin(");
    const spinEnd = source.indexOf("private async playCascadeSteps", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const stopStart = source.indexOf("private async animateColumnStop(");
    const stopEnd = source.indexOf("private updateSymbolFrame", stopStart);
    const stopSource = source.slice(stopStart, stopEnd);

    expect(source).toContain("const REEL_TARGET_SPIN_DURATION_MS = 4100;");
    expect(source).toContain("const REEL_WEIGHT_SHIFT_RATIO = 0.2;");
    expect(source).toContain(
      "const REEL_START_PULLBACK_FRAMES = Math.round(4 * REEL_FRAME_RATE_SCALE);",
    );
    expect(source).toContain("const REEL_LANDING_FRAMES = Math.round(5 * REEL_FRAME_RATE_SCALE);");
    expect(source).toContain("landingFrames: REEL_LANDING_FRAMES");
    expect(source).toContain("private getReelWeightShiftPx(): number");
    expect(source).toContain("private async animateReelStartPullback(");
    expect(source).toContain("private async settleColumnLandingOvershoot(");
    expect(source).not.toContain("private getReelLandingCorrectionTravel(");
    expect(source).not.toContain("REEL_LANDING_RETURN_START_PROGRESS");
    expect(spinSource).toContain("await this.animateReelStartPullback();");
    expect(spinSource).toContain("const columnTravel = this.getReelPreSpinTravel(column, frame);");
    expect(stopSource).toContain(
      "const overshootTravel = targetTravel + this.getReelWeightShiftPx();",
    );
    expect(stopSource).toContain(
      "await this.settleColumnLandingOvershoot(column, targetTravel, { heldColumn });",
    );
    expect(stopSource).toContain(
      "this.setColumnOffset(column, offset, this.getStoppingReelBlurStrength(travelProgress));",
    );
    expect(stopSource).toContain("this.createColumnLockEffect(column);");
    expect(
      stopSource.indexOf(
        "await this.settleColumnLandingOvershoot(column, targetTravel, { heldColumn });",
      ),
    ).toBeLessThan(stopSource.indexOf("this.createColumnLockEffect(column);"));
  });

  it("uses only column-level blur while reels spin", () => {
    const source = pixiRuntimeSource();
    const offsetStart = source.indexOf("private setContinuousColumnOffset(");
    const offsetEnd = source.indexOf("private setReelColumnBlur", offsetStart);
    const offsetSource = source.slice(offsetStart, offsetEnd);
    const resetStart = source.indexOf("private resetAllColumnOffsets(): void");
    const resetEnd = source.indexOf("private updateSymbolLayers", resetStart);
    const resetSource = source.slice(resetStart, resetEnd);

    expect(source).not.toContain("const REEL_ITEM_BLUR_MULTIPLIER");
    expect(source).not.toContain("private readonly reelItemBlurFilters");
    expect(source).not.toContain("private readonly reelBufferItemBlurFilters");
    expect(source).not.toContain("private createReelItemBlurFilter");
    expect(source).not.toContain("private setReelItemBlur");
    expect(source).not.toContain("private applyItemBlurFilter");
    expect(source).toContain("private readonly reelBlurFilters: BlurFilter[] = [];");
    expect(source).toContain("private setReelColumnBlur(column: number, strength: number): void");
    expect(offsetSource).toContain(
      "this.setReelColumnBlur(column, wrappedOffset === 0 ? 0 : blurStrength);",
    );
    expect(resetSource).toContain("this.setReelColumnBlur(column, 0);");
  });

  it("uses 60fps reel pacing with scaled steps for faster visual travel without shortening stop cadence", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("private async animateReelSpin(");
    const spinEnd = source.indexOf("private async playCascadeSteps", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const stopStart = source.indexOf("private async animateColumnStop(");
    const stopEnd = source.indexOf("private updateSymbolFrame", stopStart);
    const stopSource = source.slice(stopStart, stopEnd);

    expect(source).toContain("const REEL_TARGET_SPIN_DURATION_MS = 4100;");
    expect(source).toContain("const REEL_FRAME_MS = 1000 / 60;");
    expect(source).toContain("const REEL_STEP_SCALE = REEL_FRAME_MS / REEL_BASE_FRAME_MS;");
    expect(source).toContain("const REEL_PRESPIN_STEP_PX = 88 * REEL_STEP_SCALE;");
    expect(source).toContain("const REEL_STOP_ROLL_STEP_PX = 78 * REEL_STEP_SCALE;");
    expect(source).toContain("const REEL_LANDING_ROLL_STEP_PX = 70 * REEL_STEP_SCALE;");
    expect(spinSource).toContain("const columnTravel = this.getReelPreSpinTravel(column, frame);");
    expect(spinSource).toContain(
      "this.setColumnOffset(column, columnTravel, this.getReelBlurStrength());",
    );
    expect(spinSource).toContain("frame % REEL_TICK_FRAME_INTERVAL === 0");
    expect(spinSource).not.toContain(
      "this.renderContinuousReelColumn(rollingBoard, column, frame + column);",
    );
    expect(stopSource).toContain("REEL_STOP_ROLL_STEP_PX");
    expect(stopSource).toContain("REEL_LANDING_ROLL_STEP_PX");
    expect(source).not.toContain("frame * 43");
    expect(source).not.toContain("const REEL_PRESPIN_STEP_PX = 88;");
    expect(source).not.toContain("const REEL_STOP_ROLL_STEP_PX = 78;");
    expect(source).not.toContain("const REEL_LANDING_ROLL_STEP_PX = 70;");
    expect(source).not.toContain("const REEL_PRESPIN_STEP_PX = 44;");
    expect(source).not.toContain("const REEL_STOP_ROLL_STEP_PX = 39;");
    expect(source).not.toContain("const REEL_LANDING_ROLL_STEP_PX = 35;");
  });

  it("keeps reel item identity persistent until a track cell wraps", () => {
    const source = pixiRuntimeSource();
    const offsetStart = source.indexOf("private setContinuousColumnOffset(");
    const offsetEnd = source.indexOf("private setReelColumnBlur", offsetStart);
    const offsetSource = source.slice(offsetStart, offsetEnd);
    const resetStart = source.indexOf("private resetAllColumnOffsets(): void");
    const resetEnd = source.indexOf("private playWinningEffects", resetStart);
    const resetSource = source.slice(resetStart, resetEnd);

    expect(source).toContain("private readonly reelColumnTravelOffsets = Array.from");
    expect(source).toContain("private readonly reelTrackCellCycles: number[][] = [];");
    expect(source).toContain("private readonly reelRecycleSeeds = Array.from");
    expect(source).toContain("private readonly symbolVariantSeeds: number[] = [];");
    expect(source).toContain("private renderPersistentReelColumn(column: number): void");
    expect(source).toContain(
      "private recyclePersistentReelCells(column: number, offset: number): void",
    );
    expect(source).toContain(
      "private getReelTrackCellCycle(trackIndex: number, offset: number): number",
    );
    expect(source).toContain(
      "private getReelVariantSeed(column: number, trackIndex: number, cycle: number): number",
    );
    expect(source).toContain("private renderReelTrackCellSymbol(");
    expect(source).toContain("private getNextPersistentReelSymbol(");
    expect(offsetSource).toContain("this.reelColumnTravelOffsets[column] = offset;");
    expect(offsetSource).toContain("this.renderPersistentReelColumn(column);");
    expect(source).toContain(
      "this.renderSymbolAt(row * GAME_CONFIG.grid.columns + column, symbolId, variantSeed);",
    );
    expect(source).toContain("this.symbolVariantSeeds[index] = variantSeed;");
    expect(source).toContain("private getCurrentSymbolRenderInfo(");
    expect(resetSource).toContain("this.reelColumnTravelOffsets[column] = 0;");
    expect(resetSource).toContain("this.resetPersistentReelColumnState(column, 0);");
  });

  it("moves reels when a cascade replaces the board after a win or scatter award", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const cascadeStart = source.indexOf("private async playCascadeSteps(");
    const cascadeEnd = source.indexOf("private async animateColumnStop(", cascadeStart);
    const cascadeSource = source.slice(cascadeStart, cascadeEnd);

    expect(spinSource).toContain(
      "const visibleCascadeSteps = this.getVisibleCascadeSteps(result.steps);",
    );
    expect(spinSource).toContain(
      "const firstStepBoard = visibleCascadeSteps[0]?.board ?? result.board;",
    );
    expect(spinSource).toContain(
      "await this.playCascadeSteps(visibleCascadeSteps, gridEffectEvents, {",
    );
    expect(spinSource).toContain("preserveInitialReelVisual: true,");
    expect(spinSource).not.toContain("this.renderBoard(result.board);");
    expect(source).toContain("private getVisibleCascadeSteps(steps: SpinStep[]): SpinStep[]");
    expect(source).toContain("const lastStep = steps[steps.length - 1];");
    expect(source).toContain("const hasPreviousAward = steps");
    expect(source).toContain(
      "if (lastStep && hasPreviousAward && !this.isAwardedCascadeStep(lastStep)) {",
    );
    expect(source).toContain("return steps.slice(0, -1);");
    expect(source).toContain("private isAwardedCascadeStep(step: SpinStep): boolean");
    expect(source).toContain(
      "return step.win > 0 || step.freeSpinsAwarded > 0 || Boolean(step.jackpotAward);",
    );
    expect(source).toContain("preserveInitialReelVisual = false");
    expect(source).toContain(
      "const CASCADE_REEL_REFRESH_FRAMES = Math.round(10 * REEL_FRAME_RATE_SCALE);",
    );
    expect(source).toContain("const CASCADE_REEL_REFRESH_STEP_PX = 82 * REEL_STEP_SCALE;");
    expect(source).toContain(
      "private async animateCascadeReelTransition(finalBoard: SymbolId[]): Promise<void>",
    );
    expect(cascadeSource).toContain(
      "const shouldRenderStep = !(preserveInitialReelVisual && index === 0);",
    );
    expect(cascadeSource).toContain("if (shouldRenderStep) {");
    expect(cascadeSource).toContain("await this.animateCascadeReelTransition(step.board);");
    expect(cascadeSource).not.toContain("this.renderBoard(step.board);");
    expect(cascadeSource).not.toContain("this.resetAllColumnOffsets();");
    expect(cascadeSource).toContain("} else {");
    expect(cascadeSource).toContain("this.currentBoard = [...step.board];");
    expect(source).toContain("this.sound.startLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);");
    expect(source).toContain("this.sound.stopLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);");
    expect(source).toContain("this.setColumnOffset(");
    expect(source).toContain("this.renderBoard(finalBoard);");
  });

  it("uses a weighted reel tape and schedules final symbols into the tape before stop", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("private async animateReelSpin(");
    const spinEnd = source.indexOf("private async playCascadeSteps", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const symbolStart = source.indexOf("private getNextPersistentReelSymbol(");
    const symbolEnd = source.indexOf("private renderReelBufferCell", symbolStart);
    const symbolSource = source.slice(symbolStart, symbolEnd);
    const stopStart = source.indexOf("private async animateColumnStop(");
    const stopEnd = source.indexOf("private async settleColumnLandingOvershoot", stopStart);
    const stopSource = source.slice(stopStart, stopEnd);

    expect(source).toContain("import {");
    expect(source).toContain("createLandingSymbolSchedule");
    expect(source).toContain("createWeightedReelSymbolPicker");
    expect(source).toContain("private readonly reelLandingSymbolSchedules = Array.from");
    expect(source).toContain(
      "private readonly pickReelTapeSymbol = createWeightedReelSymbolPicker(SYMBOLS);",
    );
    expect(source).toContain(
      "private prepareReelLandingSchedules(finalBoard: SymbolId[], profile: SpinFrameProfile): void",
    );
    expect(source).toContain(
      "private getProjectedColumnStopRows(column: number, profile: SpinFrameProfile): number",
    );
    expect(source).toContain("private getNextReelTrackBoundaryTravel(travel: number): number");
    expect(spinSource).toContain("this.prepareReelLandingSchedules(finalBoard, profile);");
    expect(symbolSource).toContain(
      "const scheduledSymbol = this.getScheduledLandingSymbol(column, trackIndex, cycle);",
    );
    expect(symbolSource).toContain("if (scheduledSymbol) {");
    expect(symbolSource).toContain("return scheduledSymbol;");
    expect(symbolSource).toContain("return this.getNextRandomReelTapeSymbol(column);");
    expect(symbolSource).not.toContain("this.engine.createRollingBoard(seed)");
    expect(stopSource).toContain(
      "const targetTravel = this.getNextReelTrackBoundaryTravel(startTravel);",
    );
    expect(stopSource).toContain("this.setColumnOffset(column, targetTravel, 0);");
    expect(stopSource).not.toContain("commitStoppedColumnResult");
  });

  it("sets bigWin as a real spin completion status before rendering celebrations", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);

    expect(source).toContain("private getFinalSpinStatus(");
    expect(source).toContain("result: { freeSpinsAwarded: number; jackpotAward?: unknown },");
    expect(source).toContain("totalWin: number,");
    expect(source).toContain("if (result.jackpotAward) {");
    expect(source).toContain('return "megaWin";');
    expect(source).toContain("return getSpinWinStatus(totalWin, bet);");
    expect(source).toContain("const resolvedWin = result.totalWin;");
    expect(source).toContain("store.setStatus(finalStatus);");
    expect(spinSource).toContain("const celebrationTier = getWinCelebrationTier({");
    expect(spinSource).toContain("status: finalStatus,");
    expect(spinSource).toContain("lastWin: resolvedWin,");
    expect(spinSource).toContain("bet,");
    expect(spinSource).toContain("if (celebrationTier) {");
    expect(spinSource).toContain("this.playWinCelebration(celebrationTier, resolvedWin, {");
    expect(spinSource).toContain("legendaryJackpot: Boolean(result.jackpotAward),");
    expect(source).not.toContain(
      'result.totalWin >= bet * 50 ? "megaWin" : result.totalWin > 0 ? "win" : "idle"',
    );
  });

  it("triggers the selected celebration tier from layout test states", () => {
    const source = pixiRuntimeSource();
    const methodStart = source.indexOf(
      'triggerLayoutTestState(type: "win" | "bigWin" | "jackpot"): void',
    );
    const methodEnd = source.indexOf("triggerGridEffectPreset", methodStart);
    const methodSource = source.slice(methodStart, methodEnd);

    expect(methodSource).toContain(
      'const celebrationTier: WinCelebrationTier = type === "jackpot" ? "jackpot" : type;',
    );
    expect(methodSource).toContain("this.playWinCelebration(celebrationTier, wins[type]);");
    expect(methodSource).toContain("this.clearWinCelebrations();");
    expect(methodSource).toContain("this.clearGridEffects();");
  });

  it("uses the stronger approved Big Win board shake in spin and layout test states", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const methodStart = source.indexOf(
      'triggerLayoutTestState(type: "win" | "bigWin" | "jackpot"): void',
    );
    const methodEnd = source.indexOf("triggerGridEffectPreset", methodStart);
    const methodSource = source.slice(methodStart, methodEnd);

    expect(source).toContain("const BIG_WIN_BOARD_SHAKE_DURATION_MS = 420;");
    expect(source).toContain("const BIG_WIN_BOARD_SHAKE_MAGNITUDE = 12;");
    expect(spinSource).toContain(
      "this.triggerBoardShake(BIG_WIN_BOARD_SHAKE_DURATION_MS, BIG_WIN_BOARD_SHAKE_MAGNITUDE);",
    );
    expect(methodSource).toContain("const shakeDurationMs =");
    expect(methodSource).toContain('type === "bigWin" ? BIG_WIN_BOARD_SHAKE_DURATION_MS');
    expect(methodSource).toContain("const shakeMagnitude =");
    expect(methodSource).toContain('type === "bigWin" ? BIG_WIN_BOARD_SHAKE_MAGNITUDE');
    expect(methodSource).toContain("this.triggerBoardShake(shakeDurationMs, shakeMagnitude);");
  });

  it("uses only the raw jackpot sounds for jackpot celebrations", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const methodStart = source.indexOf(
      'triggerLayoutTestState(type: "win" | "bigWin" | "jackpot"): void',
    );
    const methodEnd = source.indexOf("triggerGridEffectPreset", methodStart);
    const methodSource = source.slice(methodStart, methodEnd);

    expect(source).not.toContain("private playJackpotCascadeFxSound(): void");
    expect(spinSource).toContain("this.duckMusicForCelebration(celebrationTier, {");
    expect(spinSource).toContain("legendaryJackpot: Boolean(result.jackpotAward),");
    expect(spinSource).toContain("this.playJackpotCelebrationSound(Boolean(result.jackpotAward));");
    expect(source).toContain('this.sound.play("jackpot");');
    expect(source).toContain('this.sound.play("legendaryJackpot");');
    expect(spinSource).not.toContain('this.sound.play("megaWin");');
    expect(spinSource).not.toContain("this.playJackpotCascadeFxSound();");
    expect(methodSource).toContain('this.playSoundEvent(type === "jackpot" ? "jackpot"');
    expect(methodSource).toContain("this.duckMusicForCelebration(celebrationTier);");
    expect(methodSource).not.toContain("this.playJackpotCascadeFxSound();");
  });

  it("uses the selected debug scenario as a real spin result before animation", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);

    expect(source).toContain("getActiveDebugScenario");
    expect(source).toContain("createDebugSpinResult");
    expect(source).not.toContain("private getDebugWinAmount(");
    expect(source).not.toContain("private getDebugWinStatus(");
    expect(spinSource).toContain("const debugScenarioMode = getActiveDebugScenario(store);");
    expect(spinSource).toContain(
      "? createDebugSpinResult(debugScenarioMode, { bet, tensionLevel: store.tensionLevel })",
    );
    expect(spinSource).toContain(": this.engine.spin({ bet, tensionLevel: store.tensionLevel });");
    expect(spinSource).toContain(
      "await this.animateReelSpin(firstStepBoard, { wildDramaColumn });",
    );
    expect(spinSource).not.toContain("this.showWinSymbolMotion([0, 1, 2, 5, 6]);");
  });

  it("does not let WILD reel drama replace Big Win or Jackpot celebrations", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);

    expect(source).toContain("private shouldPlayWildCompleteDrama(");
    expect(source).toContain("debugScenarioMode: DebugScenarioMode | null,");
    expect(source).toContain("celebrationTier: WinCelebrationTier | null,");
    expect(source).toContain('debugScenarioMode === "wildComplete"');
    expect(source).toContain(
      'return celebrationTier === "bigWin" || celebrationTier === "jackpot";',
    );
    expect(spinSource).toContain(
      "const finalStatus = this.getFinalSpinStatus(result, resolvedWin, bet);",
    );
    expect(spinSource).toContain("const celebrationTier = getWinCelebrationTier({");
    expect(spinSource).toContain(
      "const wildDramaColumn = this.shouldPlayWildCompleteDrama(debugScenarioMode, celebrationTier)",
    );
    expect(spinSource).toContain("? selectWildDramaColumn(firstStepBoard)");
    expect(spinSource).toContain(": null;");
    expect(spinSource.indexOf("const celebrationTier = getWinCelebrationTier({")).toBeLessThan(
      spinSource.indexOf(
        "const wildDramaColumn = this.shouldPlayWildCompleteDrama(debugScenarioMode, celebrationTier)",
      ),
    );
    expect(
      spinSource.indexOf(
        "const wildDramaColumn = this.shouldPlayWildCompleteDrama(debugScenarioMode, celebrationTier)",
      ),
    ).toBeLessThan(
      spinSource.indexOf("await this.animateReelSpin(firstStepBoard, { wildDramaColumn });"),
    );
  });

  it("loops the raw slot reel sound while reels spin and stops it at the last real encaje", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("private async animateReelSpin(");
    const spinEnd = source.indexOf("private async playCascadeSteps", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const columnStopStart = source.indexOf("private async animateColumnStop(");
    const columnStopEnd = source.indexOf("private getReelStopSoundEvent", columnStopStart);
    const columnStopSource = source.slice(columnStopStart, columnStopEnd);
    const wildStart = source.indexOf("private async animateWildDramaReel(");
    const wildEnd = source.indexOf("private async fadeWildDramaColumnItems", wildStart);
    const wildSource = source.slice(wildStart, wildEnd);

    expect(source).toContain('const REEL_SPIN_LOOP_SOUND_EVENT = "slotReel";');
    expect(spinSource).toContain("this.sound.startLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);");
    expect(spinSource).toContain("const reelSpinLoopStopCount =");
    expect(spinSource).toContain(
      "heldWildColumn === null ? GAME_CONFIG.grid.columns : GAME_CONFIG.grid.columns - 1;",
    );
    expect(spinSource).toContain(
      "this.stopReelSpinLoopIfFinalEncaje(stoppedColumns, reelSpinLoopStopCount);",
    );
    expect(spinSource).toContain("this.sound.stopLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);");
    expect(columnStopSource).toContain("this.sound.play(stopSoundEvent);");
    expect(
      wildSource.indexOf("this.sound.stopLoopingEvent(REEL_SPIN_LOOP_SOUND_EVENT);"),
    ).toBeLessThan(wildSource.indexOf("this.sound.play(WILD_REEL_SEQUENCE_SOUND_EVENT);"));
  });

  it("holds one WILD drama reel and keeps the asset hook empty for plug-in sequences", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const reelSpinStart = source.indexOf("private async animateReelSpin(");
    const reelSpinEnd = source.indexOf("private async animateReelStartPullback", reelSpinStart);
    const reelSpinSource = source.slice(reelSpinStart, reelSpinEnd);
    const stopStart = source.indexOf("private async animateColumnStop(");
    const stopEnd = source.indexOf("private async animateWildDramaReel", stopStart);
    const stopSource = source.slice(stopStart, stopEnd);

    expect(source).toContain("selectWildDramaColumn");
    expect(source).toContain("WILD_REEL_SEQUENCE_SOUND_EVENT");
    expect(source).toContain("WILD_REEL_SEQUENCE_ASPECT_RATIO");
    expect(source).toContain("WILD_REEL_SEQUENCE_START_DELAY_MS");
    expect(source).toContain("WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS");
    expect(source).toContain("private wildReelSequenceTextures: Texture[] = [];");
    expect(source).not.toContain("WILD_REEL_SEQUENCE_PATHS");
    expect(source).not.toContain("loadWildReelSequenceTextures");
    expect(spinSource).toContain(
      "const wildDramaColumn = this.shouldPlayWildCompleteDrama(debugScenarioMode, celebrationTier)",
    );
    expect(spinSource).toContain("? selectWildDramaColumn(firstStepBoard)");
    expect(spinSource).toContain(
      "await this.animateReelSpin(firstStepBoard, { wildDramaColumn });",
    );
    expect(reelSpinSource).toContain("wildDramaColumn = null");
    expect(reelSpinSource).toContain(
      "const heldWildColumn = this.shouldPlayWildReelDrama() ? wildDramaColumn : null;",
    );
    expect(reelSpinSource).toContain("if (column === heldWildColumn) {");
    expect(reelSpinSource).toContain(
      "await this.animateColumnStop(column, stoppedColumns, finalBoard, {",
    );
    expect(reelSpinSource).toContain("heldColumn: heldWildColumn,");
    expect(reelSpinSource).toContain(
      "await this.animateWildDramaReel(heldWildColumn, finalBoard);",
    );
    expect(stopSource).toContain("heldColumn = null");
    expect(stopSource).toContain("this.advanceRollingColumns(");
    expect(stopSource).toContain("this.getHeldRollingColumns(column, heldColumn),");
    expect(stopSource).toContain("REEL_STOP_ROLL_STEP_PX,");
    expect(source).toContain(
      "private async animateWildDramaReel(column: number, finalBoard: SymbolId[]): Promise<void>",
    );
    expect(source).toContain("await this.fadeWildDramaColumnItems(column, 0);");
    expect(source).toContain("this.prepareWildDramaColumnForSequence(column);");
    expect(source).toContain("private prepareWildDramaColumnForSequence(column: number): void");
    expect(source).toContain("this.setReelColumnBlur(column, 0);");
    expect(source).toContain("reelColumn.alpha = 1;");
    expect(source).toContain("this.sound.play(WILD_REEL_SEQUENCE_SOUND_EVENT);");
    expect(source).toContain("await this.wait(WILD_REEL_SEQUENCE_START_DELAY_MS);");
    expect(source).toContain("await this.playWildReelSequence(column);");
    expect(source).toContain("const sequenceSprite = new Sprite(textures[0] ?? Texture.EMPTY);");
    expect(source).not.toContain("sequenceSprite.roundPixels = true;");
    expect(source).toContain(
      "const sequenceWidth = Math.round(GRID_HEIGHT * WILD_REEL_SEQUENCE_ASPECT_RATIO);",
    );
    expect(source).toContain(
      "sequenceSprite.x = Math.round((GAME_CONFIG.grid.cellSize - sequenceWidth) / 2);",
    );
    expect(source).toContain("sequenceSprite.width = sequenceWidth;");
    expect(source).toContain("sequenceSprite.height = GRID_HEIGHT;");
    expect(source).toContain("Math.ceil(WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS / REEL_FRAME_MS)");
    expect(source).toContain("frame * REEL_FRAME_MS);");
    expect(source).toContain("elapsedMs / WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS");
    expect(source).toContain("const frameIndex = Math.min(");
    expect(source).toContain("Math.floor(sequenceProgress * textures.length),");
    expect(source).toContain("const textures = this.wildReelSequenceTextures;");
    expect(source).toContain("if (!reelColumn || textures.length <= 0) {");
    expect(source).toContain("await this.wait(WILD_REEL_SEQUENCE_VISIBLE_DURATION_MS);");
    expect(source).not.toContain(
      "this.wildReelSequenceTextures.length > 0\n        ? this.wildReelSequenceTextures",
    );
    expect(source).not.toContain("private sharpenWildReelSequenceTextures");
    expect(source).not.toContain('texture.source.scaleMode = "nearest";');
    expect(source).toContain(
      "private renderFinalColumnSymbols(finalBoard: SymbolId[], column: number): void",
    );
    expect(source).toContain("this.renderFinalColumnSymbols(finalBoard, column);");
  });

  it("derives scatter and wild feature FX from the selected debug spin result", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);

    expect(source).not.toContain("private playDebugFeatureEffects");
    expect(source).toContain("deriveGridEffectEvents(result, { bet })");
    expect(source).toContain("createDebugSpinResult");
    expect(source).toContain("triggerGridEffectPreset(type: GridEffectPreset): void");
    expect(source).toContain("this.playGridEffectEvents(createGridEffectPreset(type));");
    expect(spinSource).not.toContain("this.playDebugFeatureEffects");
    expect(spinSource).toContain(
      "const gridEffectEvents = deriveGridEffectEvents(result, { bet });",
    );
  });

  it("plays the normal WILD symbol sound without replaying the full WILD audio", () => {
    const gridEffects = readTemplateFile("src/logic/gridEffects.ts");
    const presets = readTemplateFile("src/logic/gridEffects.presets.ts");
    const wildStart = gridEffects.indexOf("function deriveWildEvents(");
    const wildEnd = gridEffects.indexOf("function deriveScatterEvents(", wildStart);
    const wildSource = gridEffects.slice(wildStart, wildEnd);
    const presetStart = presets.indexOf('case "wildExpand":');
    const presetEnd = presets.indexOf('case "scatterTease":', presetStart);
    const presetSource = presets.slice(presetStart, presetEnd);

    expect(wildSource).toContain('type: "wildExpandVisual"');
    expect(wildSource).toContain('audioEvent: "wildSymbol"');
    expect(wildSource).not.toContain('audioEvent: "wildExpand"');
    expect(presetSource).toContain('type: "wildExpandVisual"');
    expect(presetSource).toContain('audioEvent: "wildSymbol"');
    expect(presetSource).not.toContain('audioEvent: "wildExpand"');
  });

  it("owns a board-level win celebration layer with cleanup and ticker updates", () => {
    const source = pixiRuntimeSource();
    const destroyStart = source.indexOf("destroy(): void");
    const destroyEnd = source.indexOf("increaseBet(): void", destroyStart);
    const destroySource = source.slice(destroyStart, destroyEnd);

    expect(source).toContain("private readonly celebrationLayer = new Container();");
    expect(source).toContain("private readonly winCelebrations: WinCelebrationRecord[] = [];");
    expect(source).toContain("this.setupCelebrationLayer();");
    expect(source).toContain("private setupCelebrationLayer(): void");
    expect(source).toContain("private clearWinCelebrations(): void");
    expect(source).toContain("private updateWinCelebrations(ticker: { deltaMS: number }): void");
    expect(source).toContain("private setGridStatusTextVisible(visible: boolean): void");
    expect(source).toContain("this.setGridStatusTextVisible(false);");
    expect(source).toContain("this.setGridStatusTextVisible(true);");
    expect(source).toContain("this.updateWinCelebrations(ticker);");
    expect(destroySource).toContain("this.clearGridEffects();");
    expect(destroySource).toContain("this.clearWinCelebrations();");
  });

  it("defines celebration drawing helpers for amount text, confetti, and registration", () => {
    const source = pixiRuntimeSource();

    expect(source).toContain("private createCelebrationRoot(");
    expect(source).toContain("counterDelayMs = 260,");
    expect(source).toContain("private registerCelebrationElement(");
    expect(source).toContain("private createCelebrationAmountText(");
    expect(source).toContain("private createCelebrationConfetti(");
    expect(source).toContain("piece.zIndex = zIndexBase + (index % 8);");
    expect(source).toContain("WIN_CELEBRATION_CONFETTI_COLORS");
  });

  it("renders asset-light win and prize celebrations through procedural placeholders", () => {
    const source = pixiRuntimeSource();
    const dispatcherStart = source.indexOf("private playWinCelebration(");
    const dispatcherEnd = source.indexOf("private createPalenqueGoldWin", dispatcherStart);
    const dispatcherSource = source.slice(dispatcherStart, dispatcherEnd);
    const registerStart = source.indexOf("private registerCelebrationElement(");
    const registerEnd = source.indexOf("private createCelebrationConfetti", registerStart);
    const registerSource = source.slice(registerStart, registerEnd);
    const updateStart = source.indexOf("private updateWinCelebrations(");
    const updateEnd = source.indexOf("private createCelebrationRoot", updateStart);
    const updateSource = source.slice(updateStart, updateEnd);

    expect(source).toContain("private playWinCelebration(");
    expect(dispatcherSource).toContain("tier: WinCelebrationTier,");
    expect(dispatcherSource).toContain("amount: number,");
    expect(source).toContain("private createPalenqueGoldWin(amount: number): void");
    const winStart = source.indexOf("private createPalenqueGoldWin(amount: number): void");
    const winEnd = source.indexOf("private createBigWinSequence", winStart);
    const winSource = source.slice(winStart, winEnd);
    expect(source).toContain("BIG_WIN_SEQUENCE_DURATION_MS,");
    expect(source).toContain("private bigWinSequenceTextures: Texture[] = [];");
    expect(source).toContain("private createBigWinSequence(amount: number): void");
    expect(source).toContain("this.registerCelebrationSequenceElement(record, sequenceSprite, 0);");
    expect(source).toContain("this.createBigWinSequence(amount);");
    expect(source).toContain(
      "const WIN_GRID_EFFECT_COLORS = [0xffd36b, 0xfff0a3, 0xffb21f, 0xed254e] as const;",
    );
    expect(source).not.toContain("0x44c8ff");
    expect(source).not.toContain("0x96e8ff");
    expect(source).not.toContain("0xff56df");
    expect(source).toContain("const WIN_IMAGE_WIDTH = 520;");
    expect(source).not.toContain('const WIN_IMAGE_PATH = "/raw/Win/win.png";');
    expect(source).not.toContain('BIG_WIN_SEQUENCE_BASE_PATH = "/raw/BigWin"');
    expect(source).not.toContain("private winCelebrationTexture: Texture | null = null;");
    expect(source).not.toContain("loadWinCelebrationTexture");
    expect(source).not.toContain("loadBigWinSequenceTextures");
    expect(source).not.toContain("loadJackpotSequenceTextures");
    expect(source).not.toContain("loadLegendaryJackpotSequenceTextures");
    expect(source).not.toContain("private createBigWinGlass(amount: number): void");
    expect(source).not.toContain('for (const [index, letter] of ["B", "I", "G"].entries())');
    expect(winSource).toContain('const record = this.createCelebrationRoot("win", amount);');
    expect(winSource).toContain("const winSprite = new Sprite(Texture.EMPTY);");
    expect(winSource).toContain("winSprite.anchor.set(0.5);");
    expect(winSource).toContain("winSprite.width = WIN_IMAGE_WIDTH;");
    expect(winSource).toContain("winSprite.height = WIN_IMAGE_WIDTH;");
    expect(winSource).toContain("winSprite.position.set(CELEBRATION_CENTER_X, WIN_IMAGE_Y);");
    expect(winSource).toContain("this.createCelebrationConfetti(record, 42, 42);");
    expect(winSource).toContain(
      'this.registerCelebrationElement(record, winSprite, "winBannerPop", 0);',
    );
    expect(source).toContain("sequenceElement.sequenceTextures = this.bigWinSequenceTextures;");
    expect(source).toContain("sequenceElement.sequenceTextures = this.jackpotSequenceTextures;");
    expect(source).toContain(
      "sequenceElement.sequenceTextures = this.legendaryJackpotSequenceTextures;",
    );
    expect(winSource).not.toContain('text: "WIN"');
    expect(winSource).not.toContain("this.createCelebrationConfetti(record, 8);");
    expect(winSource).not.toContain("this.createGridPulseEffect(0xffd36b, 980);");
    expect(dispatcherSource).toContain("if (!this.visualEffectsEnabled || this.reducedEffects) {");
    expect(registerSource).toContain("node.visible = delayMs <= 0;");
    expect(updateSource).toContain("const localElapsed = celebration.elapsedMs - element.delayMs;");
    expect(updateSource).toContain("if (localElapsed < 0) {");
    expect(updateSource).toContain("element.node.visible = false;");
    expect(updateSource).toContain("element.node.visible = true;");
    expect(updateSource).toContain('element.motion === "sequence"');
    expect(updateSource).toContain("element.sequenceTextures");
    expect(updateSource).toContain("const sequenceDurationMs =");
    expect(updateSource).toContain('element.motion === "winBannerPop"');
    expect(updateSource).toContain("const bannerScale =");
    expect(updateSource).toContain("0.38 + introProgress * 0.62");
    expect(updateSource).toContain("1 + Math.sin(localProgress * Math.PI) * 0.025");
    expect(updateSource).toContain("element.baseScaleX * bannerScale");
    expect(updateSource).toContain(
      "const sequenceProgress = Math.min(1, localElapsed / sequenceDurationMs);",
    );
    expect(updateSource).toContain(
      "const sequenceHoldDurationMs = element.sequenceHoldDurationMs ?? 0;",
    );
    expect(updateSource).toContain("const sequenceFadeProgress =");
    expect(updateSource).toContain("localElapsed - sequenceDurationMs - sequenceHoldDurationMs");
  });

  it("preloads critical prize textures before the loading screen completes", () => {
    const source = pixiRuntimeSource();
    const mountStart = source.indexOf("async mount(): Promise<void>");
    const mountEnd = source.indexOf("destroy(): void", mountStart);
    const mountSource = source.slice(mountStart, mountEnd);
    const preloadStart = source.indexOf("private async preloadCriticalPrizeAssets(");
    const preloadEnd = source.indexOf("private async createScene", preloadStart);
    const preloadSource = source.slice(preloadStart, preloadEnd);

    expect(source).not.toContain("private warmCriticalCelebrationTextures");
    expect(mountSource).toContain("await this.preloadCriticalPrizeAssets((loaded, total) => {");
    expect(mountSource).toContain("setLoadingProgress(88 + Math.round((loaded / total) * 10));");
    expect(preloadSource).toContain("onProgress?.(1, 1);");
    expect(preloadSource).not.toContain("loadWinCelebrationTexture");
    expect(preloadSource).not.toContain("loadBigWinSequenceTextures");
    expect(preloadSource).not.toContain("loadJackpotSequenceTextures");
    expect(preloadSource).not.toContain("loadLegendaryJackpotSequenceTextures");
    expect(preloadSource).not.toContain("loadWildReelSequenceTextures");
    expect(preloadSource).not.toContain("loadWildSymbolWinAssets");
    expect(source).not.toContain("private async loadCriticalTextures(");
    expect(source).not.toContain("Assets.load<Texture>(WIN_IMAGE_PATH)");
  });

  it("renders the selected jackpot placeholder instead of the old sunburst", () => {
    const source = pixiRuntimeSource();

    expect(source).not.toContain('JACKPOT_SEQUENCE_BASE_PATH = "/raw/Jackpot"');
    expect(source).not.toContain("const JACKPOT_SEQUENCE_PATHS = Array.from(");
    expect(source).not.toContain("JACKPOT_SEQUENCE_FRAME_COUNT,");
    expect(source).toContain("JACKPOT_SEQUENCE_DURATION_MS,");
    expect(source).toContain("JACKPOT_SEQUENCE_FADE_OUT_MS,");
    expect(source).toContain("JACKPOT_SEQUENCE_HOLD_MS,");
    expect(source).toContain("JACKPOT_SEQUENCE_START_DELAY_MS,");
    expect(source).toContain("private jackpotSequenceTextures: Texture[] = [];");
    expect(source).toContain("private createJackpotSequence(amount: number): void");
    expect(source).toContain("this.createJackpotSequence(amount);");
    expect(source).not.toContain("this.loadJackpotSequenceTextures()");
    expect(source).toContain(
      'const record = this.createCelebrationRoot("jackpot", amount, JACKPOT_SEQUENCE_START_DELAY_MS);',
    );
    expect(source).toContain("JACKPOT_SEQUENCE_START_DELAY_MS +");
    expect(source).toContain("JACKPOT_SEQUENCE_DURATION_MS +");
    expect(source).toContain("JACKPOT_SEQUENCE_HOLD_MS +");
    expect(source).toContain("JACKPOT_SEQUENCE_FADE_OUT_MS;");
    expect(source).toContain(
      "JACKPOT_SEQUENCE_START_DELAY_MS,\n      this.jackpotSequenceTextures,",
    );
    expect(source).toContain("JACKPOT_SEQUENCE_DURATION_MS,\n      JACKPOT_SEQUENCE_FADE_OUT_MS,");
    expect(source).toContain("JACKPOT_SEQUENCE_FADE_OUT_MS,\n      JACKPOT_SEQUENCE_HOLD_MS,");
    expect(source).not.toContain("WIN_CELEBRATION_ROOSTER_PATH");
    expect(source).not.toContain("private createJackpotSunburst(amount: number): void");
    expect(source).not.toContain(
      "const rooster = new Sprite(this.jackpotRoosterTexture ?? Texture.EMPTY);",
    );
    expect(source).not.toContain("ray.rotation = (index / 18) * Math.PI * 2;");
    expect(source).not.toContain('text: "JACKPOT"');
    expect(source).not.toContain("const JACKPOT_SEQUENCE_FRAME_INDICES = [");
  });

  it("renders the legendary jackpot placeholder only for real jackpot awards", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const dispatcherStart = source.indexOf("private playWinCelebration(");
    const dispatcherEnd = source.indexOf("private createPalenqueGoldWin", dispatcherStart);
    const dispatcherSource = source.slice(dispatcherStart, dispatcherEnd);

    expect(source).not.toContain(
      'LEGENDARY_JACKPOT_SEQUENCE_BASE_PATH = "/raw/jackpot legendario"',
    );
    expect(source).not.toContain("const LEGENDARY_JACKPOT_SEQUENCE_PATHS = Array.from(");
    expect(source).not.toContain("{ length: LEGENDARY_JACKPOT_SEQUENCE_FRAME_COUNT },");
    expect(source).toContain("private legendaryJackpotSequenceTextures: Texture[] = [];");
    expect(source).not.toContain("void this.loadLegendaryJackpotSequenceTextures().then");
    expect(source).toContain("private createLegendaryJackpotSequence(amount: number): void");
    expect(source).not.toContain("this.loadLegendaryJackpotSequenceTextures()");
    expect(spinSource).toContain("Boolean(result.jackpotAward)");
    expect(spinSource).toContain("this.playJackpotCelebrationSound(Boolean(result.jackpotAward));");
    expect(dispatcherSource).toContain("options: { legendaryJackpot?: boolean } = {},");
    expect(dispatcherSource).toContain("if (options.legendaryJackpot) {");
    expect(dispatcherSource).toContain("this.createLegendaryJackpotSequence(amount);");
    expect(source).toContain("LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS,");
    expect(source).toContain("LEGENDARY_JACKPOT_SOUND_DELAY_MS,");
    expect(source).toContain(
      "LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS +\n      LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS +\n      LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS;",
    );
    expect(source).toContain(
      "LEGENDARY_JACKPOT_SEQUENCE_DURATION_MS,\n      LEGENDARY_JACKPOT_SEQUENCE_FADE_OUT_MS,\n      LEGENDARY_JACKPOT_SEQUENCE_HOLD_MS,",
    );
    expect(source).toContain("private playJackpotCelebrationSound(isLegendary: boolean): void");
    expect(source).toContain("window.setTimeout(() => {");
    expect(source).toContain('this.sound.play("legendaryJackpot");');
    expect(source).toContain("}, LEGENDARY_JACKPOT_SOUND_DELAY_MS);");
  });

  it("uses asset-light fallback font settings for central win amounts", () => {
    const source = pixiRuntimeSource();
    const rootStart = source.indexOf("private createCelebrationRoot(");
    const rootEnd = source.indexOf("private registerCelebrationElement", rootStart);
    const rootSource = source.slice(rootStart, rootEnd);
    const amountStart = source.indexOf("private createCelebrationAmountText(");
    const amountEnd = source.indexOf("private createCelebrationConfetti", amountStart);
    const amountSource = source.slice(amountStart, amountEnd);

    expect(source).toContain("BitmapText,");
    expect(source).not.toContain(
      'const GOLD_NUMBER_FONT_PATH = "/raw/general/el_gallero_gold_letters.fnt";',
    );
    expect(source).not.toContain(
      'const GOLD_NUMBER_FONT_ATLAS_PATH = "/raw/general/el_gallero_gold_letters_atlas.png";',
    );
    expect(source).toContain('const GOLD_NUMBER_FONT_FACE = "SlotGameKitGold";');
    expect(source).toContain("const WIN_AMOUNT_OFFSET_Y = 92;");
    expect(source).toContain("const JACKPOT_AMOUNT_OFFSET_Y = 112;");
    expect(source).toContain("const WIN_AMOUNT_FONT_SIZE = 60;");
    expect(source).toContain("const BIG_WIN_AMOUNT_FONT_SIZE = 78;");
    expect(source).toContain("private goldNumberFontLoaded = false;");
    expect(source).toContain("void this.loadGoldNumberFont();");
    expect(source).toContain("private async loadGoldNumberFont(): Promise<void>");
    expect(source).toContain("this.goldNumberFontLoaded = false;");
    expect(source).not.toContain("await Assets.load(GOLD_NUMBER_FONT_PATH);");
    expect(rootSource).toContain("this.createCelebrationAmountText({");
    expect(rootSource).toContain("text: formatCelebrationAmount(amount),");
    expect(rootSource).toContain("tier,");
    expect(amountSource).toContain("this.goldNumberFontLoaded");
    expect(amountSource).toContain("new BitmapText({");
    expect(amountSource).toContain("fontFamily: GOLD_NUMBER_FONT_FACE,");
    expect(amountSource).toContain(
      'tier === "jackpot" ? JACKPOT_AMOUNT_OFFSET_Y : WIN_AMOUNT_OFFSET_Y',
    );
  });

  it("keeps winning grid effects inside symbol cells with alternating colors", () => {
    const source = pixiRuntimeSource();
    const lineStart = source.indexOf("private createWinningLineEffect(");
    const lineEnd = source.indexOf("private sortWinningLineIndices", lineStart);
    const lineSource = source.slice(lineStart, lineEnd);
    const pulseStart = source.indexOf("private createGridPulseEffect(");
    const pulseEnd = source.indexOf("private clearGridEffects", pulseStart);
    const pulseSource = source.slice(pulseStart, pulseEnd);
    const updateStart = source.indexOf("private updateWinningEffects(");
    const updateEnd = source.indexOf("private updateGridEffects", updateStart);
    const updateSource = source.slice(updateStart, updateEnd);

    expect(source).toContain("const WIN_GRID_EFFECT_COLORS = [");
    expect(lineSource).toContain("this.createWinningCellEffect(index, order);");
    expect(lineSource).toContain(
      "private createWinningCellEffect(index: number, order: number): void",
    );
    expect(lineSource).toContain("WIN_GRID_EFFECT_COLORS[order % WIN_GRID_EFFECT_COLORS.length]");
    expect(lineSource).toContain("roundRect(");
    expect(lineSource).toContain("SYMBOL_SIZE - 20");
    expect(lineSource).not.toContain("lineTo(");
    expect(pulseSource).toContain(
      "for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1)",
    );
    expect(pulseSource).toContain("WIN_GRID_EFFECT_COLORS[column % WIN_GRID_EFFECT_COLORS.length]");
    expect(pulseSource).toContain("GAME_CONFIG.grid.cellSize - 8");
    expect(pulseSource).toContain("graphic.position.set(column * GAME_CONFIG.grid.cellStep, 0);");
    expect(pulseSource).not.toContain("GRID_WIDTH - 6");
    expect(updateSource).toContain("1 + Math.sin(progress * Math.PI) * 0.04");
    expect(updateSource).not.toContain("1 + progress * 0.32");
  });

  it("adds a pulsing glow behind central win amounts", () => {
    const source = pixiRuntimeSource();
    const rootStart = source.indexOf("private createCelebrationRoot(");
    const rootEnd = source.indexOf("private registerCelebrationElement", rootStart);
    const rootSource = source.slice(rootStart, rootEnd);
    const updateStart = source.indexOf("private updateWinCelebrations(");
    const updateEnd = source.indexOf("private createCelebrationRoot", updateStart);
    const updateSource = source.slice(updateStart, updateEnd);
    const glowStart = source.indexOf("private createCelebrationAmountGlow(");
    const glowEnd = source.indexOf("private registerCelebrationElement", glowStart);
    const glowSource = source.slice(glowStart, glowEnd);

    expect(source).toContain('"amountGlow"');
    expect(source).toContain("const WIN_AMOUNT_GLOW_RADIUS = 126;");
    expect(source).toContain("const BIG_WIN_AMOUNT_GLOW_RADIUS = 168;");
    expect(source).toContain("private createCelebrationAmountGlow(");
    expect(rootSource).toContain("const counterGlow = this.createCelebrationAmountGlow(tier);");
    expect(rootSource).toContain("record.container.addChild(counterGlow);");
    expect(rootSource).toContain(
      'this.registerCelebrationElement(record, counterGlow, "amountGlow", counterDelayMs);',
    );
    expect(rootSource).toContain(
      'this.registerCelebrationElement(record, counter, "amountFloat", counterDelayMs);',
    );
    expect(glowSource).toContain("new BlurFilter({ strength: 18, quality: 1 })");
    expect(glowSource).toContain("ellipse(0, 0, radius * 1.35, radius * 0.62)");
    expect(updateSource).toContain('element.motion === "amountGlow"');
    expect(updateSource).toContain("const pulse = Math.sin(localElapsed * 0.012);");
    expect(updateSource).toContain(
      "element.node.scale.set(element.baseScaleX * glowScale, element.baseScaleY * glowScale);",
    );
    expect(updateSource).toContain('element.motion === "amountFloat"');
    expect(updateSource).toContain(
      "const amountScale = 1 + Math.sin(localElapsed * 0.01) * 0.035;",
    );
  });

  it("plays progressive reel stop sounds and omits the fifth stop when WILD drama holds a reel", () => {
    const source = pixiRuntimeSource();
    const stopStart = source.indexOf("private async animateColumnStop(");
    const stopEnd = source.indexOf("private async settleColumnLandingOvershoot", stopStart);
    const stopSource = source.slice(stopStart, stopEnd);
    const wildStart = source.indexOf("private async animateWildDramaReel(");
    const wildEnd = source.indexOf("private async fadeWildDramaColumnItems", wildStart);
    const wildSource = source.slice(wildStart, wildEnd);

    expect(source).toContain(
      'type ReelStopSoundEvent = "reelStop1" | "reelStop2" | "reelStop3" | "reelStop4" | "reelStop5";',
    );
    expect(source).toContain(
      "private getReelStopSoundEvent(stopIndex: number): ReelStopSoundEvent",
    );
    expect(stopSource).toContain(
      "const stopSoundEvent = this.getReelStopSoundEvent(stoppedColumns.size + 1);",
    );
    expect(stopSource).toContain("this.sound.play(stopSoundEvent);");
    expect(wildSource).toContain("this.sound.play(WILD_REEL_SEQUENCE_SOUND_EVENT);");
    expect(wildSource).not.toContain('this.sound.play("reelStop");');
    expect(wildSource).not.toContain('this.sound.play("reelStop5");');
  });

  it("plays a slot lose sound only after a spin resolves with no prize", () => {
    const source = pixiRuntimeSource();
    const spinStart = source.indexOf("async spin(): Promise<void>");
    const spinEnd = source.indexOf("triggerLayoutTestState", spinStart);
    const spinSource = source.slice(spinStart, spinEnd);
    const helperStart = source.indexOf("private shouldPlaySlotLoseSound(");
    const helperEnd = source.indexOf("async spin(): Promise<void>", helperStart);
    const helperSource = source.slice(helperStart, helperEnd);

    expect(source).toContain('type SlotLoseSoundEvent = "slotLose1" | "slotLose2";');
    expect(source).toContain("private shouldPlaySlotLoseSound(");
    expect(source).toContain("private getSlotLoseSoundEvent(): SlotLoseSoundEvent");
    expect(helperSource).toContain("resolvedWin <= 0");
    expect(helperSource).toContain("freeSpinsAwarded <= 0");
    expect(helperSource).toContain("celebrationTier === null");
    expect(spinSource).toContain(
      "this.shouldPlaySlotLoseSound(resolvedWin, result.freeSpinsAwarded, celebrationTier)",
    );
    expect(spinSource).toContain("this.sound.play(this.getSlotLoseSoundEvent());");
    expect(spinSource.indexOf("store.setStatus(finalStatus);")).toBeLessThan(
      spinSource.indexOf(
        "this.shouldPlaySlotLoseSound(resolvedWin, result.freeSpinsAwarded, celebrationTier)",
      ),
    );
    expect(spinSource.indexOf('this.sound.play("smallWin");')).toBeLessThan(
      spinSource.indexOf(
        "this.shouldPlaySlotLoseSound(resolvedWin, result.freeSpinsAwarded, celebrationTier)",
      ),
    );
  });

  it("uses sharp reel lock rectangles and composes the WILD win symbol sequence under its text overlay", () => {
    const source = pixiRuntimeSource();
    const lockStart = source.indexOf("private createColumnLockEffect(column: number): void");
    const lockEnd = source.indexOf("private getReelBlurStrength", lockStart);
    const lockSource = source.slice(lockStart, lockEnd);
    const playStart = source.indexOf(
      "private playWinningSymbolAnimations(winningIndices: number[]): void",
    );
    const playEnd = source.indexOf("private clearWinningSymbolAnimations", playStart);
    const playSource = source.slice(playStart, playEnd);
    const wildStart = source.indexOf(
      "private startWildWinningSymbolAnimation(index: number): void",
    );
    const wildEnd = source.indexOf("private isFloatingWinSymbol", wildStart);
    const wildSource = source.slice(wildStart, wildEnd);
    const updateStart = source.indexOf("private updateWinningSymbolAnimations(");
    const updateEnd = source.indexOf("private triggerBoardShake", updateStart);
    const updateSource = source.slice(updateStart, updateEnd);

    expect(lockSource).toContain(".rect(0, 0, GAME_CONFIG.grid.cellSize - 6, GRID_HEIGHT - 6)");
    expect(lockSource).not.toContain(
      ".roundRect(0, 0, GAME_CONFIG.grid.cellSize - 6, GRID_HEIGHT - 6, 18)",
    );
    expect(source).not.toContain("WILD_SYMBOL_SEQUENCE_PATHS");
    expect(source).not.toContain("WILD_SYMBOL_TEXT_PATH");
    expect(source).toContain("WILD_SYMBOL_TEXT_OFFSET_Y");
    expect(source).toContain("private wildSymbolWinTextures: Texture[] = [];");
    expect(source).toContain("private wildSymbolTextTexture: Texture | null = null;");
    expect(source).toContain("private readonly wildSymbolTextSprites: Sprite[] = [];");
    expect(source).not.toContain("void this.loadWildSymbolWinAssets();");
    expect(source).not.toContain("loadWildSymbolWinAssets");
    expect(source).not.toContain("loadCriticalTextures(WILD_SYMBOL_SEQUENCE_PATHS");
    expect(source).toContain(
      "private updateStaticWildSymbolTextSprite(index: number, visible: boolean): void",
    );
    expect(source).toContain('this.updateStaticWildSymbolTextSprite(index, symbolId === "WILD");');
    expect(source).toContain(
      "wildTextSprite.position.set(SYMBOL_CELL_CENTER, SYMBOL_CELL_CENTER + WILD_SYMBOL_TEXT_OFFSET_Y);",
    );
    expect(playSource).toContain('if (symbolId === "WILD") {');
    expect(playSource).toContain("this.startWildWinningSymbolAnimation(index);");
    expect(source).toContain("private isFloatingWinSymbol(symbolId: SymbolId): boolean");
    expect(source).toContain('return symbolId === "SCATTER";');
    expect(playSource).toContain("if (this.isFloatingWinSymbol(symbolId)) {");
    expect(playSource).toContain("this.startFloatingWinningSymbol(index);");
    expect(playSource).toContain("continue;");
    expect(wildSource).toContain("this.wildSymbolWinTextures.length <= 1");
    expect(wildSource).toContain("this.wildSymbolTextTexture");
    expect(wildSource).toContain("this.wildSymbolTextSprites[index]");
    expect(wildSource).toContain("wildTextSprite.texture = this.wildSymbolTextTexture;");
    expect(wildSource).toContain("wildTextSprite.zIndex = 6;");
    expect(wildSource).toContain("this.setSymbolTexture(index, this.wildSymbolWinTextures[0]);");
    expect(wildSource).toContain("textures: this.wildSymbolWinTextures,");
    expect(source).toContain("private startFloatingWinningSymbol(index: number): void");
    expect(source).toContain("private hideWildSymbolTextSprite(index: number): void");
    expect(updateSource).toContain('if (record.motion === "float") {');
    expect(updateSource).toContain(
      "const floatOffset = Math.sin(record.elapsedMs * 0.006) * 7 - 6;",
    );
    expect(updateSource).toContain(
      "sprite.position.set(record.originSpriteX, record.originSpriteY + floatOffset);",
    );
  });
});
