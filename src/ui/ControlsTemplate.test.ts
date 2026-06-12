import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fromTemplateRoot = (path: string) => resolve(templateRoot, path);
const readTemplateFile = (path: string) => readFileSync(fromTemplateRoot(path), "utf8");

describe("controls template surface", () => {
  it("keeps the kit free of standalone web preview routes", () => {
    const app = readTemplateFile("src/app/App.tsx");
    const css = readTemplateFile("src/ui/game-shell.css");

    expect(existsSync(fromTemplateRoot("src/ui/ButtonPreview.tsx"))).toBe(false);
    expect(app).not.toContain('"/buttons-preview"');
    expect(app).not.toContain("ButtonPreview");
    expect(css).not.toContain("slot-button-preview");
  });

  it("uses one accent variable for the full controls color system", () => {
    const css = readTemplateFile("src/ui/game-shell.css");

    expect(css).toContain("--slot-game-kit-accent: 248, 192, 72;");
    expect(css).toContain("--hud-label-gold: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-button-stroke: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-icon-yellow: rgb(var(--slot-game-kit-accent));");
    expect(css).toContain("--hud-label-gold-rgb: var(--slot-game-kit-accent);");
    expect(css).not.toContain("--slot-game-kit-accent-rgb");
  });
});
