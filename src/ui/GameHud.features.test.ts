import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readTemplateFile = (path: string) => readFileSync(resolve(templateRoot, path), "utf8");
const hudSourceFiles = [
  "src/ui/GameHud.tsx",
  "src/ui/GameHud.shared.ts",
  "src/ui/GameHud.hooks.ts",
  "src/ui/GameHud.components.tsx",
];
const hudSource = () => hudSourceFiles.map(readTemplateFile).join("\n");
const appSource = () => readTemplateFile("src/app/App.tsx");
const loadingOverlaySource = () => readTemplateFile("src/ui/LoadingOverlay.tsx");
const cssSource = () => readTemplateFile("src/ui/game-shell.css");
const layoutSource = () => readTemplateFile("src/config/layout.config.ts");
const pixiSource = () => readTemplateFile("src/engine/PixiGame.ts");
const rawIconSource = (name: string) => readTemplateFile(`public/raw/${name}`);

function cssBlock(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = css.indexOf("\n}", start);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe("GameHud feature surface", () => {
  it("uses the new canonical yellow across HUD, Pixi and raw SVG icons", () => {
    const css = cssSource();
    const pixi = pixiSource();
    const rawIcons = [
      "icon_arrow.svg",
      "icon_autospin.svg",
      "icon_coin.svg",
      "icon_info.svg",
      "icon_menu.svg",
      "icon_minus.svg",
      "icon_plus.svg",
      "icon_spin.svg",
      "icon_stop.svg",
    ]
      .map(rawIconSource)
      .join("\n");

    expect(css).toContain("--slot-game-kit-accent: 248, 192, 72;");
    expect(css).toContain("--hud-label-gold: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-label-gold-rgb: var(--slot-game-kit-accent);");
    expect(css).toContain("--hud-icon-yellow: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-icon-yellow-rgb: var(--slot-game-kit-accent);");
    expect(css).toContain("--hud-button-stroke: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-button-stroke-rgb: var(--slot-game-kit-accent);");
    expect(css).not.toContain("--slot-game-kit-accent-rgb");
    expect(pixi).toContain("const HUD_LABEL_GOLD = 0xf8c048");
    expect(rawIcons).toContain("#f8c048");
    expect(`${css}\n${pixi}\n${rawIcons}`).not.toMatch(/#fabc01|0xfabc01|250, 188, 1/i);
    expect(rawIcons).not.toMatch(/#000000|#09244B|#fff\b/i);
  });

  it("renders the new footer line, clock and modal entry points", () => {
    const source = hudSource();

    expect(source).toContain("game-hud__balance-line");
    expect(source).toContain("game-hud__local-time");
    expect(source).not.toContain('label="i"');
    expect(source).toContain('openModal("menu")');
    expect(source).not.toContain('setActiveModal("audio")');
    expect(source).toContain('openModal("autoplay")');
    expect(source).toContain('openModal("info")');
    expect(source).toContain('openModal("bet")');
    expect(source).not.toContain("game-hud__win-test-banner");
    expect(source).not.toContain("onOpenLayoutEditor");
    expect(source).not.toContain("EDITAR LAYOUT");
    expect(cssSource()).not.toContain(".game-hud__win-test-banner");
  });

  it("shows audio and mobile performance controls directly in the menu modal", () => {
    const hud = hudSource();
    const app = appSource();
    const css = cssSource();

    expect(hud).toContain('type ModalKind = "menu" | "autoplay" | "info" | "bet" | null;');
    expect(hud).toContain('activeModal === "menu"');
    expect(hud).toContain("game-hud__menu-modal");
    expect(hud).toContain("game-hud__audio-panel");
    expect(hud).toContain("game-hud__effects-panel");
    expect(hud).toContain("Musica");
    expect(hud).toContain("Efectos de sonido");
    expect(hud).toContain("Vibracion");
    expect(hud).toContain("Animaciones");
    expect(hud).toContain("runtime?.setAnimationsEnabled(animationsEnabled);");
    expect(hud).toContain("runtime?.setVisualEffectsEnabled(animationsEnabled);");
    expect(hud).not.toContain(
      "const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(true);",
    );
    expect(hud).not.toContain("const [reducedEffects, setReducedEffects] = useState(false);");
    expect(hud).not.toContain("Efectos visuales");
    expect(hud).not.toContain("Efectos minimos");
    expect(hud).toContain("game-hud__debug-panel");
    expect(hud).toContain("Debug");
    expect(hud).toContain("WIN");
    expect(hud).toContain("JACKPOT NORMAL");
    expect(hud).toContain("LEGENDARIO");
    expect(hud).toContain("BIG WIN");
    expect(hud).toContain("SCATTER");
    expect(hud).toContain("WILD NORMAL");
    expect(hud).toContain("WILD COMPLETO");
    expect(hud).toContain("setDebugWinMode(mode, enabled);");
    expect(hud).toContain("setDebugFeatureMode(mode, enabled);");
    expect(hud).not.toContain('activeModal === "audio"');
    expect(hud).not.toContain("onOpenLayoutEditor();");
    expect(hud).not.toContain("EDITAR LAYOUT");
    expect(app).not.toContain('new URLSearchParams(window.location.search).has("layout")');
    expect(app).not.toContain("layoutEditorEnabled");
    expect(app).toContain("return <SlotEditorApp />;");
    expect(app).not.toContain("<GameHud");
    expect(css).toContain(".game-hud__menu-modal");
    expect(css).toContain(".game-hud__effects-panel");
    expect(css).toContain(".game-hud__debug-panel");
    expect(css).toContain(".slot-shell.is-animations-disabled");
  });

  it("uses the button sound for every bottom HUD and modal interaction", () => {
    const source = hudSource();

    expect(source).toContain('const HUD_INTERACTION_SOUND = "button";');
    expect(source).toContain("function playUiInteractionSound()");
    expect(source).toContain("const openModal = useCallback(");
    expect(source).toContain("const closeModal = useCallback(");
    expect(source).toContain("runtime?.playSoundEvent(HUD_INTERACTION_SOUND);");
    expect(source).not.toContain('playSoundEvent("toggleOff")');
    expect(source).not.toContain('playSoundEvent("bet")');
    expect(source).toContain('openModal("autoplay")');
    expect(source).toContain('openModal("info")');
    expect(source).toContain('openModal("bet")');
    expect(source).toContain('openModal("menu")');
    expect(source).toContain("onClose={closeModal}");
  });

  it("uses a stable 9:16 mobile portrait viewport instead of fullscreen foreground locking", () => {
    const app = appSource();
    const hud = hudSource();
    const pixi = pixiSource();

    expect(app).toContain("return <SlotEditorApp />;");
    expect(app).not.toContain("computeMobilePortraitLayoutViewport");
    expect(app).not.toContain("--elgallero-layout-viewport-width");
    expect(app).not.toContain("document.fullscreenElement");
    expect(hud).toContain(
      'import { computeLayoutViewportOffset, readLayoutViewportSize } from "../utils/layoutViewport";',
    );
    expect(hud).toContain("useDesignLayerStyle(containerRef, animationsEnabled)");
    expect(hud).toContain('fitMode: "mobilePortraitFill",');
    expect(hud).toContain("const layoutViewport = readLayoutViewportSize(width, height);");
    expect(hud).toContain("const layoutOffset = computeLayoutViewportOffset({");
    expect(hud).toContain("layoutViewportWidth: layoutViewport.width,");
    expect(hud).toContain("layoutViewportHeight: layoutViewport.height,");
    expect(hud).toContain("viewport.offsetX + layoutOffset.x");
    expect(hud).toContain("viewport.offsetY + layoutOffset.y");
    expect(hud).toContain("viewportWidth: layoutViewport.width,");
    expect(hud).toContain("viewportHeight: layoutViewport.height,");
    expect(pixi).toContain(
      'import { computeLayoutViewportOffset, readLayoutViewportSize } from "../utils/layoutViewport";',
    );
    expect(pixi).toContain(
      "const layoutViewport = readLayoutViewportSize(viewportWidth, viewportHeight);",
    );
    expect(pixi).toContain("const layoutOffset = computeLayoutViewportOffset({");
    expect(hud).not.toContain('document.fullscreenElement ? "contain" : "mobilePortraitFill"');
    expect(pixi).not.toContain("private readonly backgroundLayer = new Container();");
    expect(pixi).not.toContain("private readonly gameplayLayer = new Container();");
    expect(pixi).not.toContain('private getGameplayFitMode(): "contain" | "mobilePortraitFill"');
    expect(pixi).not.toContain("private applyBackgroundCoverTransform");
    expect(pixi).toContain("this.app.stage.scale.set(viewport.scaleX, viewport.scaleY);");
    expect(pixi).toContain("this.app.stage.position.set(");
    expect(pixi).toContain("viewport.offsetX + layoutOffset.x,");
    expect(pixi).toContain("viewport.offsetY + layoutOffset.y,");
  });

  it("can toggle an FPS counter from the menu and render it below the clock", () => {
    const hud = hudSource();
    const css = cssSource();

    expect(hud).toContain("const [fpsVisible, setFpsVisible] = useState(false);");
    expect(hud).toContain("const fps = useFpsCounter(fpsVisible);");
    expect(hud).toContain('label="FPS"');
    expect(hud).toContain("checked={fpsVisible}");
    expect(hud).toContain("playUiInteractionSound();\n                    setFpsVisible(checked);");
    expect(hud).toContain("game-hud__time-stack");
    expect(hud).toContain("game-hud__fps-counter");
    expect(hud).toContain(
      '{fpsVisible ? <span className="game-hud__fps-counter">{fps} FPS</span> : null}',
    );
    expect(hud).toContain("function useFpsCounter(enabled: boolean): number");
    expect(hud).toContain("window.requestAnimationFrame(tick);");
    expect(hud).toContain("window.cancelAnimationFrame(frameId);");
    expect(css).toContain(".game-hud__time-stack");
    expect(css).toContain(".game-hud__fps-counter");
  });

  it("suppresses native mobile tap highlight and focus trails on HUD controls", () => {
    const css = cssSource();
    const shellBlock = cssBlock(css, ".slot-shell");
    const descendantsBlock = cssBlock(css, ".slot-shell *");
    const creatorButtonStart = css.indexOf(".game-hud__creator-button,");
    const creatorButtonEnd = css.indexOf(".game-hud__creator-button img", creatorButtonStart);
    const creatorButtonBlock = css.slice(creatorButtonStart, creatorButtonEnd);
    const referenceButtonBlock = cssBlock(css, ".game-hud__reference-button");
    const modalButtonStart = css.indexOf(".game-hud__modal-header button,");
    const modalButtonEnd = css.indexOf(".game-hud__modal-header button::before", modalButtonStart);
    const modalButtonBlock = css.slice(modalButtonStart, modalButtonEnd);

    expect(shellBlock).toContain("-webkit-tap-highlight-color: transparent;");
    expect(descendantsBlock).toContain("-webkit-tap-highlight-color: transparent;");
    expect(creatorButtonBlock).toContain("-webkit-tap-highlight-color: transparent;");
    expect(referenceButtonBlock).toContain("-webkit-tap-highlight-color: transparent;");
    expect(referenceButtonBlock).toContain("outline: none;");
    expect(modalButtonBlock).toContain("-webkit-tap-highlight-color: transparent;");
    expect(modalButtonBlock).toContain("outline: none;");
    expect(css).toContain(".game-hud__reference-button:focus-visible");
    expect(css).toContain(".game-hud__modal-control-button:focus-visible");
  });

  it("mounts the loading overlay while startup resources are preparing", () => {
    const app = appSource();
    const css = cssSource();

    expect(app).toContain("return <SlotEditorApp />;");
    expect(app).not.toContain('import { useUiStore } from "../store/uiStore";');
    expect(app).not.toContain('import { LoadingOverlay } from "../ui/LoadingOverlay";');
    expect(app).not.toContain("<LoadingOverlay");
    expect(css).toContain(".game-loading-overlay");
    expect(css).toContain(".game-loading__");
  });

  it("requests base music after the loading overlay completes", () => {
    const app = appSource();

    expect(app).toContain("return <SlotEditorApp />;");
    expect(app).not.toContain("const handleLoadingComplete = useCallback(() => {");
    expect(app).not.toContain("runtime?.startMusicAfterLoadingScreen();");
    expect(app).not.toContain("onComplete={handleLoadingComplete}");
    expect(app).not.toContain("if (!runtime) {");
  });

  it("keeps the loading title compact and separated from the loading bar", () => {
    const css = cssSource();
    const brandBlock = cssBlock(css, ".game-loading__brand-mark");
    const barBlock = cssBlock(css, ".game-loading__bar");

    expect(brandBlock).toContain("top: clamp(360px, 44vh, 820px);");
    expect(brandBlock).toContain("width: min(72vw, 720px);");
    expect(barBlock).toContain("top: clamp(620px, 70vh, 1210px);");
    expect(barBlock).toContain("width: min(72vw, 640px);");
  });

  it("runs the loading bar sequence visibly from first frame to final frame", () => {
    const source = loadingOverlaySource();

    expect(source).toContain("function getLoadingBarLabel(frame: number): string");
    expect(source).toContain("const [loadingBarFrame, setLoadingBarFrame] = useState(1);");
    expect(source).toContain("setLoadingBarFrame(1);");
    expect(source).toContain("setDisplayedProgress(0);");
    expect(source).toContain('if (phase !== "brand") {');
    expect(source).toContain("const targetFrameRef = useRef(1);");
    expect(source).toContain("targetFrameRef.current = runtimeReady");
    expect(source).toContain("? LOADING_BAR_FRAME_COUNT");
    expect(source).toContain("LOADING_BAR_FRAME_COUNT - 1");
    expect(source).toContain("Math.min(targetFrameRef.current, current + 1)");
    expect(source).toContain("loadingBarFrame < LOADING_BAR_FRAME_COUNT");
    expect(source).toContain("getLoadingBarLabel(loadingBarFrame)");
    expect(source).toContain("loadingBarImage");
    expect(source).toContain("loading_bar_");
    expect(source).toContain('role="progressbar"');
    expect(source).toContain("aria-valuenow={Math.round(displayedProgress)}");
    expect(source).toContain("<img");
  });

  it("lets the loading overlay complete after the leaving fade", () => {
    const source = loadingOverlaySource();
    const brandGateStart = source.indexOf('phase !== "brand" ||');
    const leavingEffectStart = source.indexOf('if (phase !== "leaving") {');
    const barLabelStart = source.indexOf("const barLabel", leavingEffectStart);
    const brandGateSource = source.slice(brandGateStart, leavingEffectStart);
    const leavingEffectSource = source.slice(leavingEffectStart, barLabelStart);

    expect(brandGateStart).toBeGreaterThanOrEqual(0);
    expect(leavingEffectStart).toBeGreaterThan(brandGateStart);
    expect(brandGateSource).toContain('setPhase("leaving");');
    expect(brandGateSource).not.toContain("window.setTimeout");
    expect(leavingEffectSource).toContain("const timeoutId = window.setTimeout(() => {");
    expect(leavingEffectSource).toContain('setPhase("complete");');
    expect(leavingEffectSource).toContain("onComplete();");
    expect(leavingEffectSource).toContain("}, FADE_OUT_MS);");
    expect(leavingEffectSource).toContain("}, [onComplete, phase]);");
  });

  it("supports fullscreen and autoplay options", () => {
    const source = hudSource();
    const stopAutoplayStart = source.indexOf("const stopAutoplay = useCallback(() => {");
    const startAutoplayStart = source.indexOf("const startAutoplay = useCallback(async () => {");
    const stopAutoplaySource = source.slice(stopAutoplayStart, startAutoplayStart);
    const startAutoplaySource = source.slice(
      startAutoplayStart,
      source.indexOf("const handleAudioVolume", startAutoplayStart),
    );

    expect(source).toContain("requestFullscreen");
    expect(source).toContain('closest(".slot-shell") ?? document.documentElement');
    expect(source).toContain("untilWin");
    expect(source).toContain("fullAuto");
    expect(source).toContain("[10, 25, 50, 100]");
    expect(source).toContain("game-hud__autoplay-summary");
    expect(source).toContain(
      "const [autoplayCompletedSpins, setAutoplayCompletedSpins] = useState(0);",
    );
    expect(source).toContain("let completedSpins = 0;");
    expect(source).toContain("completedSpins += 1;");
    expect(source).toContain("setAutoplayCompletedSpins(completedSpins);");
    expect(startAutoplaySource).toContain("setAutoplayCompletedSpins(0);");
    expect(stopAutoplaySource).not.toContain("setAutoplayCompletedSpins(0);");
    expect(stopAutoplaySource).not.toContain("setAutoplayRunning(false);");
    expect(source).toContain("game-hud__autoplay-counter");
    expect(source).toContain("formatAutoplayCounter(autoplayCompletedSpins, autoplayTotalSpins)");
    expect(source).toContain(
      'autoplayConfig.fullAuto ? "FULL AUTO" : `$' + "{autoplayConfig.count} GIROS`",
    );
    expect(source).toContain("Apuesta activa");
    expect(source).toContain('autoplayConfig.fullAuto ? "is-disabled" : ""');
    expect(source).toContain("autoplayConfig.count === count && !autoplayConfig.fullAuto");
    expect(source).toContain('? "is-selected"');
    expect(source).toContain(
      "aria-pressed={autoplayConfig.count === count && !autoplayConfig.fullAuto}",
    );
    expect(source).toContain("!autoplayRunning && spinBusy");
  });

  it("keeps footer buttons at the width-based size when fullscreen changes viewport height", () => {
    const source = hudSource();
    const css = cssSource();

    expect(source).toContain('"--hud-button-counter-scale-x": 1');
    expect(source).toContain(
      '"--hud-button-counter-scale-y": viewport.scaleY > 0 ? viewport.scaleX / viewport.scaleY : 1',
    );
    expect(source).toContain('className="game-hud__reference-button-frame"');
    expect(css).toContain(".game-hud__reference-button-frame");
    expect(css).toContain(
      "transform: scale(var(--hud-button-counter-scale-x, 1), var(--hud-button-counter-scale-y, 1));",
    );
    expect(css).toContain("transform-origin: center;");
  });

  it("uses the RAW reference footer controls and keeps time in the top HUD", () => {
    const source = hudSource();

    [
      "/raw/icon_minus.svg",
      "/raw/icon_spin.svg",
      "/raw/icon_plus.svg",
      "/raw/icon_info.svg",
      "/raw/icon_autospin.svg",
      "/raw/icon_arrow.svg",
      "/raw/icon_coin.svg",
      "/raw/icon_menu.svg",
      "/raw/icon_stop.svg",
    ].forEach((path) => {
      expect(source).toContain(path);
    });
    expect(source).toContain("game-hud__reference-footer");
    expect(source).toContain("game-hud__reference-spin");
    expect(source).toContain("game-hud__reference-button--spin-mode");
    expect(source).toContain("roundNumber={roundNumber}");
    expect(source).toContain("RONDA #");
    expect(source).toContain("formatRoundNumber(roundNumber)");
    expect(source).toContain("game-hud__round-number");
    expect(source).toContain("game-hud__balance-values");
    expect(source).toContain("BALANCE");
    expect(source).toContain("APUESTA");
    expect(source).toContain("game-hud__local-time");
    expect(source).not.toContain('label=">>>"');
    expect(source).not.toContain("EL GALLERO ·");
    expect(source).not.toContain("creatorAssets.map");
  });

  it("wires three spin speed modes and bet selector interactions", () => {
    const source = hudSource();

    expect(source).toContain("type SpinMode = 1 | 2 | 3;");
    expect(source).toContain("const SPIN_MODES = [1, 2, 3] as const;");
    expect(source).toContain("AUTOPLAY_DELAY_BY_SPIN_MODE");
    expect(source).toContain("1: 360");
    expect(source).toContain("2: 180");
    expect(source).toContain("3: 100");
    expect(source).toContain("const [spinMode, setSpinMode] = useState<SpinMode>(1);");
    expect(source).toContain("const spinModeRef = useRef<SpinMode>(1);");
    expect(source).toContain(
      'const spinMotionActive = status === "spinning" || status === "stopping";',
    );
    expect(source).toContain("const [spinSettling, setSpinSettling] = useState(false);");
    expect(source).toContain("const previousSpinMotionActiveRef = useRef(false);");
    expect(source).toContain("spinModeRef.current = spinMode;");
    expect(source).toContain("runtime?.setSpinMode(spinMode);");
    expect(source).toContain(
      "const nextSpinMode = spinMode === 3 ? 1 : ((spinMode + 1) as SpinMode);",
    );
    expect(source).toContain("AUTOPLAY_DELAY_BY_SPIN_MODE[spinModeRef.current]");
    expect(source).not.toContain("runtime?.setSpinMode(nextSpinMode);");
    expect(source).toContain('mode <= spinMode ? "is-active" : "is-muted"');
    expect(source).toContain("game-hud__spin-mode-arrows");
    expect(source).toContain("game-hud__spin-mode-arrow");
    expect(source).not.toContain("turboEnabled");
    expect(source).not.toContain("setTurboEnabled");
    expect(source).toContain("GAME_CONFIG.betting.levels");
    expect(source).toContain("game-hud__bet-modal");
  });

  it("styles modal overlays and disabled spin controls", () => {
    const css = cssSource();

    expect(css).toContain("game-hud__modal-backdrop");
    expect(css).toContain("game-hud__audio-slider");
    expect(css).toContain("game-hud__switch-track");
    expect(css).toContain("game-hud__paytable");
    expect(css).toContain("game-hud__creator-button--locked");
    expect(css).toContain("game-hud__reference-footer");
    expect(css).toContain("game-hud__reference-button--spin");
    expect(css).toContain("game-hud__bet-modal");
    expect(css).toContain("game-hud__autoplay-summary");
    expect(css).toContain("game-hud__autoplay-counter");
    expect(css).toContain("game-hud__round-number");
    expect(css).toContain("game-hud__effects-panel");
  });

  it("uses the balance and bet typeface across HUD and Pixi text", () => {
    const css = cssSource();
    const pixi = pixiSource();

    expect(css).toContain("--hud-typeface: Arial, sans-serif;");
    expect(css).toContain("font-family: var(--hud-typeface);");
    expect(css).not.toContain("font-family: Arial, sans-serif;");
    expect(pixi).toContain('const HUD_TYPEFACE = "Arial"');
    expect(pixi).toContain("fontFamily: HUD_TYPEFACE");
    expect(pixi).not.toContain('fontFamily: "Arial"');
  });

  it("scales information screens for larger readable rules and paytable content", () => {
    const source = hudSource();
    const css = cssSource();

    expect(source).toContain("const RULE_EXPLAINERS");
    expect(source).toContain("game-hud__rules-grid");
    expect(source).toContain("game-hud__rule-icon");
    expect(source).not.toContain('className="game-hud__rules-list"');
    expect(css).toContain("width: 960px;");
    expect(css).toContain("max-height: 1390px;");
    expect(css).toContain(".game-hud__info-panel");
    expect(css).toContain("max-height: 1240px;");
    expect(css).toContain(".game-hud__rules-grid");
    expect(css).toContain("grid-template-columns: 96px minmax(0, 1fr);");
    expect(css).toContain(".game-hud__rule-copy p");
    expect(css).toContain("grid-template-columns: 124px minmax(0, 1fr) 96px 96px 96px;");
    expect(css).toContain("min-height: 138px;");
    expect(css).toContain(".game-hud__paytable-row strong");
    expect(css).toContain("font-size: 32px;");
    expect(css).toContain(".game-hud__paytable-row span");
    expect(css).toContain("font-size: 27px;");
    expect(css).toContain(".game-hud__paytable-row em");
    expect(css).toContain("font-size: 26px;");
    expect(css).toContain("width: 108px;");
    expect(css).toContain("height: 108px;");
  });

  it("matches bottom-button styling across autoplay and bet submenus without submenu glow", () => {
    const source = hudSource();
    const css = cssSource();

    expect(source).toContain("function ModalIcon");
    expect(source).toContain("function ModalIconButton");
    expect(source).toContain("game-hud__autoplay-count-grid");
    expect(source).toContain("game-hud__autoplay-count-button");
    expect(source).toContain("game-hud__autoplay-action-icon");
    expect(source).toContain("iconSrc={RAW_ICON_PATHS.minus}");
    expect(source).toContain("iconSrc={RAW_ICON_PATHS.plus}");
    expect(source).toContain("iconSrc={RAW_ICON_PATHS.coin}");
    expect(css).toContain(".game-hud__modal-control-button");
    expect(css).toContain(".game-hud__modal-icon-button");
    expect(css).toContain(".game-hud__modal-action-button");
    expect(css).toContain("box-shadow: none;");
    expect(css).toContain("border-radius: 38px;");
    expect(css).toContain(".game-hud__modal-icon-button .game-hud__reference-icon");
    expect(css).toContain(".game-hud__autoplay-count-button.is-selected");
  });

  it("rounds opened modal screens and aligns bet svg buttons with press animation", () => {
    const css = cssSource();

    expect(css).toContain(".game-hud__modal {");
    expect(css).toContain("border: 4px solid rgba(var(--hud-label-gold-rgb), 0.9);");
    expect(css).toContain("border-radius: 42px;");
    expect(css).toContain(".game-hud__modal-header {");
    expect(css).toContain("border-radius: 38px 38px 0 0;");
    expect(css).toContain(".game-hud__modal-icon-button {");
    expect(css).toContain("display: grid;");
    expect(css).toContain("place-items: center;");
    expect(css).toContain("aspect-ratio: 1;");
    expect(css).toContain("justify-self: center;");
    expect(css).toContain("@keyframes hud-button-press");
    expect(css).toContain("animation: hud-button-press 180ms ease-out;");
    expect(css).toContain(".game-hud__modal-close:active");
    expect(css).toContain("animation: hud-modal-close-press 180ms ease-out;");
  });

  it("standardizes reference button glow, border and neutral shell material", () => {
    const css = cssSource();

    expect(css).toContain("--hud-icon-yellow: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-icon-yellow-rgb: var(--slot-game-kit-accent);");
    expect(css).toContain("--hud-button-shell: rgba(18, 20, 21, 0.5)");
    expect(css).toContain("--hud-button-shell-top: rgba(30, 34, 35, 0.5)");
    expect(css).toContain("--hud-button-shell-bottom: rgba(4, 6, 7, 0.5)");
    expect(css).toContain("--hud-button-glow: rgba(var(--hud-label-gold-rgb), 0.62)");
    expect(css).toContain("--hud-button-stroke: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-button-stroke-rgb: var(--slot-game-kit-accent);");
    expect(css).toContain("border: 5px solid var(--hud-button-stroke)");
    expect(css).toContain("border-color: rgba(var(--hud-button-stroke-rgb), 0.96)");
    expect(css).toContain(".game-hud__reference-button:hover:not(:disabled)");
    expect(css).toContain(".game-hud__reference-button:hover:not(:disabled)::after");
    expect(css).toContain("linear-gradient(180deg, rgb(36, 41, 42), rgb(8, 11, 12))");
    expect(css).toContain("linear-gradient(180deg, rgb(38, 43, 44), rgb(9, 12, 14))");
    expect(css).toContain("background-color: var(--hud-icon-yellow);");
    expect(css).toContain("drop-shadow(0 7px 7px rgba(0, 0, 0, 0.58))");
    expect(css).toContain("drop-shadow(0 0 13px rgba(var(--hud-icon-yellow-rgb), 0.96))");
    expect(css).toContain("0 0 42px rgba(var(--hud-label-gold-rgb), 0.42)");
    expect(css).toContain("filter: blur(26px)");
    expect(css).not.toContain("border: 5px solid rgba(255, 234, 149, 0.82)");
    expect(css).not.toContain("#fcb60c");
  });

  it("adds a dark premium glass material to footer and modal buttons", () => {
    const css = cssSource();
    const referenceButtonStart = css.indexOf(".game-hud__reference-button {");
    const referenceButtonEnd = css.indexOf(
      ".game-hud__reference-button::before",
      referenceButtonStart,
    );
    const referenceButtonBlock = css.slice(referenceButtonStart, referenceButtonEnd);
    const referenceBeforeStart = css.indexOf(".game-hud__reference-button::before");
    const referenceBeforeEnd = css.indexOf(
      ".game-hud__reference-button::after",
      referenceBeforeStart,
    );
    const referenceBeforeBlock = css.slice(referenceBeforeStart, referenceBeforeEnd);
    const modalButtonStart = css.indexOf(".game-hud__modal-header button,");
    const modalButtonEnd = css.indexOf(".game-hud__modal-header button::before", modalButtonStart);
    const modalButtonBlock = css.slice(modalButtonStart, modalButtonEnd);
    const modalBeforeStart = css.indexOf(".game-hud__modal-header button::before,");
    const modalBeforeEnd = css.indexOf(".game-hud__modal-action-button > span", modalBeforeStart);
    const modalBeforeBlock = css.slice(modalBeforeStart, modalBeforeEnd);

    expect(css).toContain("--hud-button-background-opacity: 0.32");
    expect(css).not.toContain("--hud-button-background-opacity: 0.5");
    expect(css).toContain("--hud-button-material: rgb(18, 20, 21)");
    expect(css).toContain("--hud-button-material-top: rgb(30, 34, 35)");
    expect(css).toContain("--hud-button-material-bottom: rgb(4, 6, 7)");
    expect(css).toContain("--hud-button-glass-highlight: rgba(255, 255, 255, 0.2)");
    expect(css).toContain("--hud-button-glass-sheen: rgba(255, 255, 255, 0.11)");
    expect(css).toContain("--hud-button-glass-edge: rgba(255, 255, 255, 0.32)");
    expect(css).toContain("-webkit-backdrop-filter: blur(14px) saturate(1.18);");
    expect(css).toContain("backdrop-filter: blur(14px) saturate(1.18);");
    expect(css).toContain(".game-hud__reference-button::before");
    expect(css).toContain(
      "linear-gradient(135deg, var(--hud-button-glass-highlight) 0%, rgba(255, 255, 255, 0.07) 31%, rgba(255, 255, 255, 0.018) 53%, transparent 54%)",
    );
    expect(css).toContain(
      "linear-gradient(180deg, var(--hud-button-material-top), var(--hud-button-material-bottom))",
    );
    expect(css).toContain("var(--hud-button-material);");
    expect(css).not.toContain(
      "linear-gradient(180deg, rgba(36, 41, 42, 0.5), rgba(8, 11, 12, 0.5))",
    );
    expect(css).toContain("inset 0 0 0 1px var(--hud-button-glass-edge)");
    expect(css).toContain(".game-hud__modal-header button::before");
    expect(css).toContain(".game-hud__modal-control-button::before");
    expect(css).toContain(".game-hud__modal-action-button::before");
    expect(css).toContain("opacity: var(--hud-button-background-opacity);");
    expect(referenceButtonBlock).toContain("background: transparent;");
    expect(referenceButtonBlock).toContain("border: 5px solid var(--hud-button-stroke)");
    expect(modalButtonBlock).toContain("background: transparent;");
    expect(modalButtonBlock).toContain("border: 4px solid var(--hud-button-stroke)");
    expect(referenceButtonBlock).not.toContain("inset ");
    expect(referenceButtonBlock).not.toContain("backdrop-filter");
    expect(modalButtonBlock).not.toContain("backdrop-filter");
    expect(referenceBeforeBlock).toContain("box-shadow:");
    expect(referenceBeforeBlock).toContain("inset 0 0 0 1px var(--hud-button-glass-edge)");
    expect(referenceBeforeBlock).toContain("inset 0 3px 0 rgba(255, 255, 255, 0.22)");
    expect(referenceBeforeBlock).toContain("inset 0 -12px 20px rgba(0, 0, 0, 0.42)");
    expect(referenceBeforeBlock).toContain("-webkit-backdrop-filter: blur(14px) saturate(1.18);");
    expect(referenceBeforeBlock).toContain("backdrop-filter: blur(14px) saturate(1.18);");
    expect(modalBeforeBlock).toContain("box-shadow:");
    expect(modalBeforeBlock).toContain("inset 0 0 0 1px var(--hud-button-glass-edge)");
    expect(modalBeforeBlock).toContain("-webkit-backdrop-filter: blur(14px) saturate(1.18);");
    expect(modalBeforeBlock).toContain("backdrop-filter: blur(14px) saturate(1.18);");
    expect(referenceButtonBlock).not.toContain("opacity: 0.5;");
    expect(modalButtonBlock).not.toContain("opacity: 0.5;");
  });

  it("colors yellow SVG controls and the clock with the canonical brand yellow", () => {
    const source = hudSource();
    const css = cssSource();
    const localTimeStart = css.indexOf(".game-hud__local-time {");
    const localTimeEnd = css.indexOf(".game-hud__creator-button--footer img", localTimeStart);
    const localTimeBlock = css.slice(localTimeStart, localTimeEnd);

    expect(source).toContain("--hud-icon-url");
    expect(source).toContain('aria-hidden="true"');
    expect(source).not.toContain('<img className="game-hud__reference-icon"');
    expect(css).toContain("--hud-icon-yellow: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-icon-yellow-rgb: var(--slot-game-kit-accent);");
    expect(css).toContain(".game-hud__reference-icon");
    expect(css).toContain("background-color: var(--hud-icon-yellow);");
    expect(css).toContain("-webkit-mask: var(--hud-icon-url) center / contain no-repeat;");
    expect(css).toContain("mask: var(--hud-icon-url) center / contain no-repeat;");
    expect(css).not.toContain("brightness(0) saturate(100%)");
    expect(css).toContain(".game-hud__reference-label");
    expect(css).toContain("color: var(--hud-icon-yellow);");
    expect(css).toContain(".game-hud__reference-button--spin-mode");
    expect(css).toContain(".game-hud__spin-mode-arrow");
    expect(css).toContain(".game-hud__reference-button--info .game-hud__reference-icon");
    expect(css).toContain(
      ".game-hud__reference-button:hover:not(:disabled) .game-hud__spin-mode-arrow",
    );
    expect(css).toContain("drop-shadow(0 0 13px rgba(var(--hud-icon-yellow-rgb), 0.96))");
    expect(localTimeBlock).toContain("color: var(--hud-icon-yellow);");
    expect(localTimeBlock).toContain("0 2px 4px rgba(0, 0, 0, 0.86)");
    expect(localTimeBlock).not.toContain("0 0 12px");
    expect(localTimeBlock).not.toContain("var(--hud-label-gold-rgb)");
  });

  it("renders three icon_arrow indicators with full and muted alpha states", () => {
    const source = hudSource();
    const css = cssSource();

    expect(source).toContain('arrow: "/raw/icon_arrow.svg"');
    expect(source).toContain("SPIN_MODES.map((mode)");
    expect(source).toContain(
      'style={{ "--hud-icon-url": `url("$' + '{RAW_ICON_PATHS.arrow}")` } as CSSProperties}',
    );
    expect(css).toContain(".game-hud__spin-mode-arrows");
    expect(css).toContain(".game-hud__spin-mode-arrow");
    expect(css).toContain(".game-hud__spin-mode-arrow.is-active");
    expect(css).toContain(".game-hud__spin-mode-arrow.is-muted");
    expect(css).toContain("opacity: 1;");
    expect(css).toContain("opacity: 0.5;");
    expect(css).toContain(
      ".game-hud__reference-button:hover:not(:disabled) .game-hud__spin-mode-arrow",
    );
  });

  it("tunes reference footer spacing and control scale", () => {
    const source = hudSource();
    const css = cssSource();
    const autoplayCounterBlock = cssBlock(css, ".game-hud__autoplay-counter");
    const balanceLineBlock = cssBlock(css, ".game-hud__balance-line");
    const roundNumberBlock = cssBlock(css, ".game-hud__round-number");
    const scopedRoundNumberBlock = cssBlock(css, ".game-hud__balance-line .game-hud__round-number");

    expect(source).toContain("game-hud__reference-button--info");
    expect(css).toContain("gap: 24px;");
    expect(css).toContain(".game-hud__round-number");
    expect(css).toContain("transform: translateY(-18px);");
    expect(autoplayCounterBlock).toContain("top: 208px;");
    expect(autoplayCounterBlock).toContain("color: #ffffff;");
    expect(autoplayCounterBlock).not.toContain("rgba(");
    expect(balanceLineBlock).toContain("display: grid;");
    expect(balanceLineBlock).toContain("grid-template-rows: auto auto;");
    expect(balanceLineBlock).toContain("overflow: visible;");
    expect(css).toContain(".game-hud__balance-values");
    expect(roundNumberBlock).toContain("grid-row: 2;");
    expect(roundNumberBlock).toContain("color: #ffffff;");
    expect(scopedRoundNumberBlock).toContain("color: #ffffff;");
    expect(roundNumberBlock).toContain("font-weight: 400;");
    expect(roundNumberBlock).toContain("transform: translateY(8px);");
    expect(roundNumberBlock).not.toContain("rgba(");
    expect(css).toContain("transform: translateY(18px);");
    expect(css).toContain("width: 100px;");
    expect(css).toContain("height: 100px;");
    expect(css).toContain("width: 116px;");
    expect(css).toContain("height: 76px;");
    expect(css).toContain("border-radius: 38px;");
    expect(css).toContain(".game-hud__reference-button--info .game-hud__reference-icon");
    expect(css).toContain("width: 60%;");
    expect(source).toContain("game-hud__reference-button--coin");
    expect(source).toContain("game-hud__reference-button--menu");
    expect(css).toContain(".game-hud__reference-button--coin .game-hud__reference-icon");
    expect(css).toContain(".game-hud__reference-button--menu .game-hud__reference-icon");
    expect(css).toContain("width: 64%;");
    expect(css).toContain("width: 70%;");
  });

  it("uses black bottom-menu modals with centered yellow headers and animated switches", () => {
    const source = hudSource();
    const css = cssSource();

    expect(source).toContain("const [vibrationEnabled, setVibrationEnabled] = useState(true);");
    expect(source).toContain("const [animationsEnabled, setAnimationsEnabled] = useState(true);");
    expect(source).toContain("runtime?.setVibrationEnabled(vibrationEnabled);");
    expect(source).toContain("runtime?.setAnimationsEnabled(animationsEnabled);");
    expect(source).toContain("runtime?.setVisualEffectsEnabled(animationsEnabled);");
    expect(source).toContain('classList.toggle("is-animations-disabled", !animationsEnabled);');
    expect(source).not.toContain(
      "const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(true);",
    );
    expect(source).not.toContain("const [reducedEffects, setReducedEffects] = useState(false);");
    expect(source).toContain("function HudSwitch");
    expect(source).toContain("game-hud__switch-row");
    expect(source).toContain("game-hud__switch-track");
    expect(source).toContain("game-hud__volume-control");
    expect(source).toContain("Vibracion");
    expect(source).toContain("Animaciones");
    expect(source).not.toContain("Efectos visuales");
    expect(source).not.toContain("Efectos minimos");
    expect(source).not.toContain('className="game-hud__check-row"');
    expect(css).toContain("background: #000000;");
    expect(css).toContain(".game-hud__modal-header");
    expect(css).toContain("justify-content: center;");
    expect(css).toContain(".game-hud__modal-close");
    expect(css).toContain("color: var(--hud-label-gold);");
    expect(css).toContain(".game-hud__switch-input:checked + .game-hud__switch-track");
    expect(css).toContain("transform: translateX(58px);");
    expect(css).toContain(".game-hud__audio-slider::-webkit-slider-thumb");
  });

  it("renders the coin view as centered bet rows with max bet action", () => {
    const source = hudSource();
    const css = cssSource();
    const betRowBlock = cssBlock(css, ".game-hud__bet-control-row");
    const betLabelBlock = cssBlock(css, ".game-hud__bet-control-label");
    const maxBetBlock = cssBlock(css, ".game-hud__max-bet-button");

    expect(source).toContain("function BetControlRow");
    expect(source).toContain("COIN_VALUE_OPTIONS");
    expect(source).toContain("Apuesta Total");
    expect(source).toContain("Valor Moneda");
    expect(source).toContain("APUESTA MAXIMA");
    expect(source).toContain("game-hud__bet-control-row");
    expect(source).toContain("game-hud__max-bet-button");
    expect(css).toContain(".game-hud__bet-control-row");
    expect(css).toContain("grid-template-columns: 96px minmax(0, 1fr) 96px;");
    expect(css).toContain(".game-hud__bet-control-label");
    expect(css).toContain(".game-hud__max-bet-button");
    expect(betRowBlock).toContain("border: 2px solid rgba(var(--hud-label-gold-rgb), 0.34);");
    expect(betRowBlock).toContain(
      "background: linear-gradient(180deg, rgba(14, 16, 16, 0.96), rgba(0, 0, 0, 0.98));",
    );
    expect(betLabelBlock).toContain("justify-items: start;");
    expect(maxBetBlock).toContain("color: var(--hud-label-gold);");
    expect(maxBetBlock).not.toContain("background: var(--hud-label-gold);");
    expect(maxBetBlock).not.toContain("color: #1b1204;");
  });

  it("uses dark overscan fallbacks so bottom background never flashes light pixels", () => {
    const css = cssSource();
    const shellBlock = cssBlock(css, ".slot-shell");
    const canvasHostBlock = cssBlock(css, ".slot-canvas-host");

    expect(shellBlock).toContain("background: #050303;");
    expect(canvasHostBlock).toContain("inset: 0 0 -4px 0;");
    expect(canvasHostBlock).toContain("background: #050303;");
    expect(css).not.toContain("background: #696969;");
  });

  it("updates the information modal copy for legendary jackpot, wild, scatter and free spins", () => {
    const source = hudSource();

    expect(source).toContain('title: "Delivery Legendario"');
    expect(source).toContain(
      'text: "5 TELEFONO 7 puros en una linea activan DELIVERY LEGENDARIO: paga 250x la apuesta mas el premio de linea."',
    );
    expect(source).toContain(
      'text: "El WILD completa simbolos pagadores. No reemplaza SCATTER ni cuenta como TELEFONO 7 puro para el jackpot."',
    );
    expect(source).toContain(
      'text: "4 SCATTER activan 8 free spins; cada SCATTER adicional suma 2 giros."',
    );
    expect(source).toContain(
      'text: "Los free spins no descuentan saldo y pueden volver a ganar por lineas, WILD, cascadas o DELIVERY LEGENDARIO."',
    );
  });

  it("uses balance and bet gold for HUD glow while the clock uses the icon orange without glow", () => {
    const css = cssSource();
    const layout = layoutSource();
    const pixi = pixiSource();
    const localTimeStart = css.indexOf(".game-hud__local-time {");
    const localTimeEnd = css.indexOf(".game-hud__creator-button--footer img", localTimeStart);
    const localTimeBlock = css.slice(localTimeStart, localTimeEnd);

    expect(css).toContain("--hud-label-gold: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-label-gold-rgb: var(--slot-game-kit-accent);");
    expect(css).toContain("color: var(--hud-label-gold);");
    expect(css).toContain("rgba(var(--hud-label-gold-rgb), 0.62)");
    expect(css).toContain("rgba(var(--hud-icon-yellow-rgb), 0.96)");
    expect(localTimeBlock).toContain("color: var(--hud-icon-yellow);");
    expect(localTimeBlock).not.toContain("rgba(var(--hud-label-gold-rgb)");
    expect(layout).toContain("v2Board: {\n    x: 64,");
    expect(layout).toContain("localTime: {\n      x: 856,\n      y: 16");
    expect(css).not.toContain("#ffcf35");
    expect(css).not.toContain("255, 207, 53");
    expect(pixi).toContain("const HUD_LABEL_GOLD = 0xf8c048");
    expect(pixi).not.toContain("const HUD_LABEL_GOLD = 0xffcf35");
    expect(pixi).toContain("fill: HUD_LABEL_GOLD");
    expect(pixi).toContain("this.board.addChild(labelGlow)");
  });

  it("animates the spin icon without the outer yellow ring", () => {
    const source = hudSource();
    const css = cssSource();

    expect(source).toContain("spinButtonClassName");
    expect(source).toContain('className="game-hud__reference-icon"');
    expect(source).toContain('spinMotionActive && !autoplayRunning ? "is-spinning" : ""');
    expect(source).toContain('spinSettling && !autoplayRunning ? "is-spin-settling" : ""');
    expect(source).toContain("disabled={disabled || (!autoplayRunning && spinBusy)}");
    expect(css).toContain("@keyframes spin-button-rotate");
    expect(css).toContain("@keyframes spin-button-settle");
    expect(css).toContain("@keyframes spin-button-idle-nudge");
    expect(css).toContain("rotate(-18deg)");
    expect(css).toContain(".game-hud__reference-spin.is-spinning .game-hud__reference-icon");
    expect(css).toContain("animation: spin-button-rotate 760ms linear infinite;");
    expect(css).toContain(".game-hud__reference-spin.is-spin-settling .game-hud__reference-icon");
    expect(css).toContain(
      "animation: spin-button-settle 360ms cubic-bezier(0.16, 0.9, 0.24, 1) both;",
    );
    expect(css).toContain(".game-hud__reference-spin:not(.is-spinning) .game-hud__reference-icon");
    expect(css).toContain("animation: spin-button-idle-nudge 5200ms ease-in-out infinite;");
    expect(css).not.toContain(".game-hud__reference-spin.is-spinning {");
    expect(css).not.toContain(".game-hud__reference-spin:not(.is-spinning) {");
    expect(css).not.toContain("outline: 14px solid rgba(255, 234, 149, 0.28)");
    expect(css).not.toContain("0 0 50px rgba(255, 207, 53, 0.44)");
    expect(css).toContain("0 0 64px 18px rgba(var(--hud-label-gold-rgb), 0.14)");
  });
});
