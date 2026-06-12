import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readTemplateFile = (path: string) => readFileSync(resolve(templateRoot, path), "utf8");

describe("slot editor routing", () => {
  it("mounts SlotEditorApp directly as the only app surface", () => {
    const app = readTemplateFile("src/app/App.tsx");

    expect(app).toContain('import { SlotEditorApp } from "../editor/SlotEditorApp";');
    expect(app).toContain("return <SlotEditorApp />;");
    expect(app).not.toContain("URLSearchParams");
    expect(app).not.toContain('import { GameCanvas } from "../ui/GameCanvas";');
    expect(app).not.toContain('import { GameHud } from "../ui/GameHud";');
    expect(app).not.toContain('import { LoadingOverlay } from "../ui/LoadingOverlay";');
    expect(app).not.toContain("<GameCanvas");
    expect(app).not.toContain("<GameHud");
    expect(app).not.toContain("<LoadingOverlay");
  });
});
