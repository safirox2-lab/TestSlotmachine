import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const fromRoot = (path: string) => new URL(path, root);
const readText = (path: string) => readFileSync(fromRoot(path), "utf8");
const readJson = (path: string) => JSON.parse(readText(path));
const exists = (path: string) => existsSync(fromRoot(path));

function walkFiles(path: string): string[] {
  const absolutePath = fromRoot(path);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = join(path, entry.name).replace(/\\/g, "/");
    return entry.isDirectory() ? walkFiles(relativePath) : [relativePath];
  });
}

function walkAuthoredFiles(path: string): string[] {
  const absolutePath = fromRoot(path);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = join(path, entry.name).replace(/\\/g, "/").replace(/^\.\//, "");
    const rootSegment = relativePath.split("/")[0];
    if (entry.isDirectory() && [".git", ".vercel", "dist", "node_modules"].includes(rootSegment)) {
      return [];
    }
    return entry.isDirectory() ? walkAuthoredFiles(relativePath) : [relativePath];
  });
}

const requiredPublicFiles = [
  "assets-v2/audio/manifest.json",
  "assets-v2/audio/ui/button.wav",
  "assets-v2/delivery/loading/background_loading.webp",
  "assets-v2/delivery/loading/titular.webp",
  "assets-v2/delivery/manifests/loading.json",
  "assets-v2/delivery/manifests/scene.json",
  "assets-v2/delivery/manifests/symbols.json",
  "assets-v2/delivery/scene/background_city.webp",
  "assets-v2/delivery/scene/background_sky.webp",
  "assets-v2/delivery/scene/slot_machine_board.webp",
  "assets-v2/delivery/symbols/delivery_symbols.webp",
  "raw/icon_arrow.svg",
  "raw/icon_autospin.svg",
  "raw/icon_coin.svg",
  "raw/icon_info.svg",
  "raw/icon_menu.svg",
  "raw/icon_minus.svg",
  "raw/icon_plus.svg",
  "raw/icon_spin.svg",
  "raw/icon_stop.svg",
];

const packageJson = readJson("package.json");
const vercelConfig = readJson("vercel.json");
const appSource = readText("src/app/App.tsx");
const pixiSource = readText("src/engine/PixiGame.ts");
const hudSource = readText("src/ui/GameHud.tsx");
const hooksSource = readText("src/ui/GameHud.hooks.ts");
const loadingSource = readText("src/ui/LoadingOverlay.tsx");
const symbolConfigSource = readText("src/symbol-config.ts");
const audioManifest = readJson("public/assets-v2/audio/manifest.json");
const publicFiles = walkFiles("public").map((path) => path.replace(/^public\//, "")).sort();

const authoredJsFiles = walkAuthoredFiles(".").filter((path) => path.endsWith(".js"));
assert.deepEqual(authoredJsFiles, []);

assert.equal(packageJson.name, "slot-game-kit");
assert.equal(exists("src/app/main.tsx"), true);
assert.equal(exists("src/app/App.tsx"), true);
assert.equal(exists("src/engine/PixiGame.ts"), true);
assert.equal(exists("src/sound-system.ts"), true);
assert.equal(exists("src/symbol-config.ts"), true);
assert.equal(exists("src/config/layout.config.ts"), true);

assert.equal(appSource.includes("createLayoutEditorPanel"), false);
assert.equal(appSource.includes("window.slotMachine"), false);
assert.equal(pixiSource.includes("LAYOUT_EDITOR_TARGETS"), false);
assert.equal(pixiSource.includes("getLayoutEditorSnapshot"), false);
assert.equal(pixiSource.includes("/__layout-editor/save"), false);
assert.equal(hudSource.includes("EDITAR LAYOUT"), false);

const scriptNames = Object.keys(packageJson.scripts);
assert.deepEqual(scriptNames.filter((name) => name.startsWith("agents:")), []);
assert.equal(packageJson.scripts.build, "tsc --noEmit && vite build --outDir dist --emptyOutDir");
assert.equal(packageJson.scripts.check, "biome check src scripts");
assert.equal(packageJson.scripts["test:smoke"], "tsx scripts/smoke-test.ts");
assert.equal(packageJson.scripts.test, "vitest run && npm run test:smoke");

const globalHeaders = vercelConfig.headers.find((entry: { source: string }) => entry.source === "/(.*)");
const globalHeaderKeys = new Set(
  globalHeaders?.headers?.map((header: { key: string }) => header.key),
);
assert.equal(globalHeaderKeys.has("Content-Security-Policy"), true);
assert.equal(globalHeaderKeys.has("Referrer-Policy"), true);
assert.equal(globalHeaderKeys.has("Permissions-Policy"), true);
assert.equal(globalHeaderKeys.has("X-Content-Type-Options"), true);

const audioCacheRule = vercelConfig.headers.find(
  (entry: { source: string }) => entry.source === "/assets-v2/audio/(.*)",
);
assert.equal(
  audioCacheRule?.headers?.some(
    (header: { key: string; value: string }) =>
      header.key === "Cache-Control" && header.value === "public, max-age=0, must-revalidate",
  ),
  true,
);

for (const file of requiredPublicFiles) {
  assert.equal(exists(`public/${file}`), true);
}
assert.equal(publicFiles.filter((file) => file.startsWith("assets-v2/delivery/scene/motorizado/")).length, 49);
assert.equal(statSync(fromRoot("public/assets-v2/audio/ui/button.wav")).size > 1000, true);
assert.deepEqual(Object.keys(audioManifest.music), []);
assert.deepEqual(Object.keys(audioManifest.events), ["button"]);
assert.deepEqual(audioManifest.assets, [
  { id: "ui/button", file: "ui/button.wav", format: "wav", source: "slot-game-kit" },
]);

assert.equal(exists("public/raw/background.png"), false);
assert.equal(exists("public/assets-v2/manifest.json"), false);
assert.equal(exists("public/assets-v2/body"), false);
assert.equal(exists("public/assets-v2/header"), false);
assert.equal(exists("public/assets-v2/ui"), false);

assert.equal(pixiSource.includes("loadDeliverySceneManifest"), true);
assert.equal(pixiSource.includes("loadDeliverySymbolTextures"), true);
assert.equal(pixiSource.includes("drawTemplateBoard"), true);
assert.equal(pixiSource.includes("SCENE_BACKGROUND_PATH"), false);
assert.equal(pixiSource.includes("loadSymbolTextures"), true);
assert.equal(pixiSource.includes("loadCriticalTextures"), false);
assert.equal(loadingSource.includes("<img"), true);
assert.equal(hooksSource.includes("SYMBOL_ATLAS_MANIFEST_PATH"), false);
assert.equal(symbolConfigSource.includes("/raw/slot symbols"), false);

console.log("smoke-test: ok");
