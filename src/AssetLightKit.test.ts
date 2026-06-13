import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(templateRoot, "public");
const requiredPublicAssets = new Set([
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
]);

function listFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const absolutePath = join(root, entry);
    return statSync(absolutePath).isDirectory() ? listFiles(absolutePath) : [absolutePath];
  });
}

const readProjectFile = (path: string) => readFileSync(join(templateRoot, path), "utf8");

describe("Delivery slot assets", () => {
  it("ships generated Delivery assets, manifests, footer control SVGs and audio", () => {
    const publicFiles = listFiles(publicRoot)
      .map((path) => relative(publicRoot, path).replaceAll("\\", "/"))
      .sort();

    expect(publicFiles).toEqual(expect.arrayContaining([...requiredPublicAssets]));
    expect(
      publicFiles.filter((file) => file.startsWith("assets-v2/delivery/scene/motorizado/")),
    ).toHaveLength(49);
  });

  it("keeps the spin icon viewBox padded so the lower arrow is not clipped", () => {
    const spinIcon = readProjectFile("public/raw/icon_spin.svg");

    expect(spinIcon).toContain('viewBox="-12 -12 884.82 885.23"');
  });

  it("keeps Delivery runtime paths routed through manifests/configured assets", () => {
    const pixiSource = readProjectFile("src/engine/PixiGame.ts");
    const loadingSource = readProjectFile("src/ui/LoadingOverlay.tsx");
    const html = readProjectFile("index.html");

    expect(existsSync(join(publicRoot, "raw/background.png"))).toBe(false);
    expect(existsSync(join(publicRoot, "assets-v2/body/atlas/symbols"))).toBe(false);
    expect(pixiSource).toContain("loadDeliverySceneManifest");
    expect(pixiSource).toContain("loadDeliverySymbolTextures");
    expect(pixiSource).toContain("drawTemplateBoard");
    expect(pixiSource).not.toContain("SCENE_BACKGROUND_PATH");
    expect(loadingSource).toContain("<img");
    expect(loadingSource).toContain("ASSETS_CONFIG.delivery.basePath");
    expect(html).not.toContain("/raw/Win/win.png");
  });
});
