import { describe, expect, it } from "vitest";
import {
  BUTTONS_DATA_MODULE_ID,
  DEFAULT_EDITOR_ACCENT,
  DEFAULT_EDITOR_BUTTON_IDS,
  EDITOR_BUTTON_OPTIONS,
  EDITOR_DATA_OPTIONS,
  EDITOR_MODULES,
  REELS_CARDS_MODULE_ID,
  RULES_COMBINATIONS_MODULE_ID,
  RULES_WINS_MODULE_ID,
} from "./editorModules.config";

describe("editor module config", () => {
  it("defines the editor modules", () => {
    expect(EDITOR_MODULES).toHaveLength(4);
    expect(EDITOR_MODULES[0]).toMatchObject({
      id: BUTTONS_DATA_MODULE_ID,
      title: "Botones y Datos",
    });
    expect(EDITOR_MODULES[1]).toMatchObject({
      id: REELS_CARDS_MODULE_ID,
      title: "Reels y Cartas",
    });
    expect(EDITOR_MODULES[2]).toMatchObject({
      id: RULES_WINS_MODULE_ID,
      title: "Trazados de Victoria",
    });
    expect(EDITOR_MODULES[3]).toMatchObject({
      id: RULES_COMBINATIONS_MODULE_ID,
      title: "Reglas y Combinaciones",
    });
    expect(EDITOR_MODULES.map((module) => module.title)).not.toContain("Datos del panel");
  });

  it("exposes the required add button options in the requested order", () => {
    expect(EDITOR_BUTTON_OPTIONS.map((option) => option.label)).toEqual([
      "Botones Por Default",
      "+ Subir Apuesta",
      "- Bajar Apuesta",
      "Spin/Jugar",
      "Menu",
      "Apuesta",
      "Informacion de Reglas",
      "AutoPlay",
      "Flechas / Siguiente",
    ]);
  });

  it("exposes the required add data options in the requested order", () => {
    expect(EDITOR_DATA_OPTIONS.map((option) => option.label)).toEqual([
      "Datos Por Default",
      "Usuario",
      "Ronda",
      "Freespins",
      "Balance",
      "Apuesta",
      "Fecha",
      "Hora",
    ]);
  });

  it("maps default buttons to the raw icon assets from slot-game-kit", () => {
    expect(DEFAULT_EDITOR_BUTTON_IDS).toEqual([
      "betDecrease",
      "spin",
      "betIncrease",
      "info",
      "autoplay",
      "bet",
      "menu",
      "arrow",
    ]);
    expect(EDITOR_BUTTON_OPTIONS.find((option) => option.id === "spin")?.iconSrc).toBe(
      "/raw/icon_spin.svg",
    );
    expect(EDITOR_BUTTON_OPTIONS.find((option) => option.id === "autoplay")?.iconSrc).toBe(
      "/raw/icon_autospin.svg",
    );
    expect(EDITOR_BUTTON_OPTIONS.find((option) => option.id === "arrow")?.iconSrc).toBe(
      "/raw/icon_arrow.svg",
    );
    expect(DEFAULT_EDITOR_ACCENT).toBe("#f8c048");
  });
});
