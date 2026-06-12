import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASSETS_CONFIG } from "./config/assets.config";
import { AUDIO_CONFIG } from "./config/audio.config";
import { GAME_CONFIG } from "./config/game.config";
import { UI_CONFIG } from "./config/ui.config";
import { JackpotModel } from "./logic/JackpotModel";
import { SlotGameEngine } from "./logic/SlotGameEngine";
import { useAudioStore } from "./store/audioStore";
import { getActiveDebugScenario, useGameStore } from "./store/gameStore";
import { useUiStore } from "./store/uiStore";
import { computeDesignViewport } from "./utils/designViewport";
import { formatMoney } from "./utils/format";
import {
  computeLayoutViewportOffset,
  computeMobilePortraitLayoutViewport,
} from "./utils/layoutViewport";
import { clamp, snapToGrid } from "./utils/math";
import { createDemoRng } from "./utils/random";
import { getViewportMode } from "./utils/viewport";

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readProjectFile = (path: string) => readFileSync(join(templateRoot, path), "utf8");
const listProjectFiles = (path: string): string[] => {
  const root = join(templateRoot, path);
  return readdirSync(root).flatMap((entry) => {
    const absolutePath = join(root, entry);
    const relativePath = `${path}/${entry}`.replaceAll("\\", "/");
    return statSync(absolutePath).isDirectory() ? listProjectFiles(relativePath) : [relativePath];
  });
};

describe("game foundation standard", () => {
  it("centralizes critical game, UI, asset and audio configuration", () => {
    expect(GAME_CONFIG.grid).toMatchObject({ columns: 5, rows: 4 });
    expect(GAME_CONFIG.stateMachine.statuses).toContain("spinning");
    expect(UI_CONFIG.design).toEqual({ width: 1080, height: 1920 });
    expect(UI_CONFIG.canvas.maxDevicePixelRatio).toBe(3);
    expect(ASSETS_CONFIG.runtimeBasePath).toBe("/assets-v2");
    expect(ASSETS_CONFIG.manifests.audio).toBe("/assets-v2/audio/manifest.json");
    expect(ASSETS_CONFIG.footerControls.icons).toContain("icon_spin.svg");
    expect(ASSETS_CONFIG.imagePolicy.format).toBe("svg");
    expect(AUDIO_CONFIG.runtimeFormats).toEqual(["wav", "mp3"]);
  });

  it("provides Zustand stores for game, audio and UI state", () => {
    useGameStore.getState().resetGame();
    useAudioStore.getState().resetAudio();
    useUiStore.getState().resetUi();

    useGameStore.getState().setStatus("spinning");
    useGameStore.getState().setWin(125);
    useGameStore.getState().setDebugWinMode("jackpotLegendario", true);
    useGameStore.getState().setDebugFeatureMode("scatter", true);
    useGameStore.getState().incrementRoundNumber();
    useGameStore.getState().setRoundNumber(42);
    useAudioStore.getState().setMusicMuted(true);
    useAudioStore.getState().setVolume(0.44);
    useUiStore.getState().setMenuOpen(true);

    expect(useGameStore.getState().status).toBe("spinning");
    expect(useGameStore.getState().lastWin).toBe(125);
    expect(useGameStore.getState().roundNumber).toBe(42);
    expect(useGameStore.getState().debugWinModes.jackpotLegendario).toBe(false);
    expect(useGameStore.getState().debugFeatureModes.scatter).toBe(true);
    expect(getActiveDebugScenario(useGameStore.getState())).toBe("scatter");
    useGameStore.getState().setDebugFeatureMode("wildComplete", true);
    expect(getActiveDebugScenario(useGameStore.getState())).toBe("wildComplete");
    expect(useAudioStore.getState().musicMuted).toBe(true);
    expect(useAudioStore.getState().volume).toBe(0.44);
    expect(useUiStore.getState().menuOpen).toBe(true);

    useGameStore.getState().resetGame();
    expect(useGameStore.getState().roundNumber).toBe(0);
  });

  it("keeps reusable utilities outside Pixi and React", () => {
    const rng = createDemoRng(42);

    expect(clamp(12, 0, 10)).toBe(10);
    expect(snapToGrid(19, 8)).toBe(16);
    expect(formatMoney(1234.5)).toBe("1,234.50");
    expect(getViewportMode({ width: 844, height: 390 })).toBe("landscape");
    expect(rng()).toBeGreaterThanOrEqual(0);
    expect(rng()).toBeLessThan(1);
  });

  it("keeps tall mobile viewports inside a uniform 9:16 layout frame", () => {
    const layoutViewport = computeMobilePortraitLayoutViewport({ width: 390, height: 844 });
    const viewport = computeDesignViewport({
      viewportWidth: layoutViewport.width,
      viewportHeight: layoutViewport.height,
      designWidth: UI_CONFIG.design.width,
      designHeight: UI_CONFIG.design.height,
      fitMode: UI_CONFIG.canvas.fitMode,
    });

    expect(layoutViewport.width).toBe(390);
    expect(layoutViewport.height).toBeCloseTo(693.333);
    expect(viewport.offsetX).toBe(0);
    expect(viewport.offsetY).toBeCloseTo(0);
    expect(viewport.scaleX).toBeCloseTo(390 / 1080);
    expect(viewport.scaleY).toBeCloseTo(viewport.scaleX);
    expect(viewport.isMobilePortraitFill).toBe(false);
  });

  it("centers a frozen mobile layout viewport inside expanded fullscreen bounds", () => {
    const layoutViewport = computeMobilePortraitLayoutViewport({ width: 390, height: 844 });
    const offset = computeLayoutViewportOffset({
      viewportWidth: 390,
      viewportHeight: 932,
      layoutViewportWidth: layoutViewport.width,
      layoutViewportHeight: layoutViewport.height,
    });

    expect(offset.x).toBe(0);
    expect(offset.y).toBeCloseTo((932 - 390 * (16 / 9)) / 2);
  });

  it("runs slot logic in TypeScript without depending on the Pixi renderer", () => {
    const engine = new SlotGameEngine({ rng: () => 0.12 });
    const spin = engine.spin({ bet: 50, tensionLevel: 1 });

    expect(spin.board).toHaveLength(GAME_CONFIG.grid.columns * GAME_CONFIG.grid.rows);
    expect(spin.steps.length).toBeGreaterThan(0);
    expect(Number.isFinite(spin.totalWin)).toBe(true);

    const jackpot = new JackpotModel();
    jackpot.contribute(50);

    expect(jackpot.getDisplayValues()).toHaveLength(5);
  });

  it("keeps the browser runtime on TypeScript modules without the layout editor", () => {
    const runtimeFiles = [
      "src/app/App.tsx",
      "src/ui/GameHud.tsx",
      "src/ui/GameHud.shared.ts",
      "src/ui/GameHud.hooks.ts",
      "src/ui/GameHud.components.tsx",
      "src/engine/PixiGame.ts",
      "src/engine/winSequenceAssets.ts",
      "src/logic/symbols.ts",
    ];

    const combinedSource = runtimeFiles.map(readProjectFile).join("\n");

    expect(combinedSource).not.toMatch(/from\s+["'](?:\.|\.\.)[^"']+\.js["']/);
    expect(combinedSource).not.toContain("createLayoutEditorPanel");
    expect(combinedSource).not.toContain("window.slotMachine");
    expect(combinedSource).not.toContain("LAYOUT_EDITOR_TARGETS");
  });

  it("keeps src TypeScript-only with typed sound runtime", () => {
    const tsconfig = JSON.parse(readProjectFile("tsconfig.json"));
    const srcJsFiles = listProjectFiles("src").filter((path) => /\.(?:js|jsx)$/.test(path));
    const pixiSource = readProjectFile("src/engine/PixiGame.ts");

    expect(srcJsFiles).toEqual([]);
    expect(tsconfig.compilerOptions.allowJs).toBe(false);
    expect(tsconfig.compilerOptions).not.toHaveProperty("checkJs", false);
    expect(existsSync(join(templateRoot, "src/sound-system.ts"))).toBe(true);
    expect(existsSync(join(templateRoot, "src/sound-system.js"))).toBe(false);
    expect(pixiSource).toContain('import { SoundSystem } from "../sound-system";');
  });

  it("splits production bundles into cached Pixi and React vendor chunks", () => {
    const viteConfig = readProjectFile("vite.config.ts");

    expect(viteConfig).toContain("rollupOptions:");
    expect(viteConfig).toContain("manualChunks:");
    expect(viteConfig).toContain('pixi: ["pixi.js"]');
    expect(viteConfig).toContain('vendor: ["react", "react-dom", "zustand"]');
  });

  it("keeps active routing fixtures on current TypeScript module paths", () => {
    const cases = JSON.parse(readProjectFile("fixtures/routing-cases.json")) as Array<{
      affectedModules: string[];
    }>;
    const legacySrcModules = cases.flatMap((routingCase) =>
      routingCase.affectedModules.filter((modulePath) => /^src\/.*\.js$/.test(modulePath)),
    );

    expect(legacySrcModules).toEqual([]);
  });

  it("configures global production security headers in Vercel", () => {
    const vercelConfig = JSON.parse(readProjectFile("vercel.json"));
    const globalHeaders = vercelConfig.headers?.find((entry: { source?: string }) =>
      ["/(.*)", "/:path*"].includes(entry.source ?? ""),
    );

    expect(globalHeaders?.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Content-Security-Policy" }),
        expect.objectContaining({ key: "Referrer-Policy" }),
        expect.objectContaining({ key: "Permissions-Policy" }),
        expect.objectContaining({ key: "X-Content-Type-Options", value: "nosniff" }),
      ]),
    );
  });

  it("keeps the Pixi runtime compatible with CSP without allowing eval", () => {
    const pixiGame = readProjectFile("src/engine/PixiGame.ts");
    const vercelConfig = JSON.parse(readProjectFile("vercel.json"));
    const globalHeaders = vercelConfig.headers?.find((entry: { source?: string }) =>
      ["/(.*)", "/:path*"].includes(entry.source ?? ""),
    );
    const csp = globalHeaders?.headers?.find(
      (header: { key?: string }) => header.key === "Content-Security-Policy",
    )?.value;

    expect(pixiGame).toContain('import "pixi.js/unsafe-eval";');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("connect-src 'self' data: blob:");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("does not preload original game images in the asset-light kit", () => {
    const html = readProjectFile("index.html");

    expect(html).not.toContain("/raw/Win/win.png");
    expect(html).not.toContain('rel="preload" as="image"');
  });
});
