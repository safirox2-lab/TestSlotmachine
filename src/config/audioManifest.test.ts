import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface AudioManifest {
  basePath: string;
  music: Record<string, unknown>;
  events: Record<string, { assetId: string; bus?: string; gain?: number }>;
  assets: Array<{ id: string; file: string; format?: string; source?: string }>;
}

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(templateRoot, path), "utf8")) as T;

describe("asset-light audio manifest", () => {
  it("ships only the footer button sound as a file-backed audio asset", () => {
    const manifest = readJson<AudioManifest>("public/assets-v2/audio/manifest.json");

    expect(manifest.basePath).toBe("/assets-v2/audio");
    expect(manifest.music).toEqual({});
    expect(Object.keys(manifest.events)).toEqual(["button"]);
    expect(manifest.events.button).toEqual({ assetId: "ui/button", bus: "ui", gain: 0.85 });
    expect(manifest.assets).toEqual([
      { id: "ui/button", file: "ui/button.wav", format: "wav", source: "slot-game-kit" },
    ]);
  });
});
