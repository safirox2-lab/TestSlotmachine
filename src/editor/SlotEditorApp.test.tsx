// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SlotEditorApp } from "./SlotEditorApp";
import { useEditorStore } from "./store/editorStore";

let host: HTMLDivElement;

function renderEditor() {
  host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<SlotEditorApp />);
  });
  return root;
}

function findModuleSection(title: string) {
  const header = Array.from(host.querySelectorAll(".slot-editor__module-header strong")).find(
    (element) => element.textContent === title,
  );

  return header?.closest("section");
}

describe("SlotEditorApp", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useEditorStore.getState().resetEditor();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders the module panel, mobile canvas, and filtered layer panel", () => {
    const root = renderEditor();

    expect(host.textContent).toContain("Modulos");
    expect(host.textContent).toContain("Botones y Datos");
    expect(host.textContent).toContain("Reels y Cartas");
    expect(host.textContent).toContain("Trazados de Victoria");
    expect(host.textContent).toContain("Reglas y Combinaciones");
    expect(host.textContent).toContain("Agregar Boton");
    expect(host.textContent).toContain("Agregar Datos");
    expect(host.textContent).toContain("Colores");
    expect(host.textContent).toContain("Color de botones");
    expect(host.textContent).toContain("Color del glow");
    expect(host.textContent).not.toContain("Color hover");
    expect(host.textContent).toContain("Color del Texto");
    expect(host.textContent).toContain("Color de datos");
    const moduleTitles = Array.from(
      host.querySelectorAll(".slot-editor__module-header strong"),
    ).map((element) => element.textContent);
    expect(moduleTitles).toEqual([
      "Botones y Datos",
      "Reels y Cartas",
      "Trazados de Victoria",
      "Reglas y Combinaciones",
    ]);
    expect(moduleTitles).not.toContain("Datos del panel");
    expect(host.querySelector(".slot-editor__phone")).not.toBeNull();
    expect(host.querySelector<HTMLElement>(".slot-editor")?.className).toContain("is-aspect-9-16");
    expect(host.textContent).toContain("[Boton] Spin / Jugar");
    expect(host.textContent).toContain("[Dato] Balance");
    expect(host.textContent).toContain("[Dato] Ronda");

    act(() => root.unmount());
  });

  it("renders the Reels y Cartas module menu with reel type and grid controls", () => {
    const root = renderEditor();
    const reelsToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Desplegar modulo Reels y Cartas"]',
    );

    act(() => {
      reelsToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().activeModuleId).toBe("reels-cards");
    expect(host.textContent).toContain("Agregar Reel");
    expect(host.textContent).toContain("Tipo De Reels");
    expect(
      host.querySelector<HTMLButtonElement>('button[aria-label="Reel procedural"]'),
    ).not.toBeNull();
    expect(
      host.querySelector<HTMLButtonElement>('button[aria-label="Reel por cinta"]'),
    ).not.toBeNull();
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Cantidad de Cartas Actual"]')?.value,
    ).toBe("15");
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Cantidad de Rodillos"]')?.value,
    ).toBe("5");
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Cantidad de Filas"]')?.value,
    ).toBe("4");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Padding X"]')?.value).toBe("4");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Padding Y"]')?.value).toBe("4");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Tamano del grid"]')?.value).toBe(
      "1",
    );
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Marco de slots"]')?.checked,
    ).toBe(true);
    expect(host.querySelector("button")?.textContent).toBeTruthy();
    expect(host.textContent).toContain("Eliminar Grid y Cartas");
    expect(host.textContent).toContain("Reel Stop");

    act(() => root.unmount());
  });

  it("toggles reel slot frames from the Reels y Cartas module", () => {
    const root = renderEditor();
    const reelsToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Desplegar modulo Reels y Cartas"]',
    );

    act(() => {
      reelsToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const frameToggle = host.querySelector<HTMLInputElement>('input[aria-label="Marco de slots"]');

    act(() => {
      frameToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(useEditorStore.getState().reelSettings.slotFrameEnabled).toBe(false);
    expect(host.querySelector<HTMLElement>('[data-layer-id="reel-card-1-1"]')?.className).toContain(
      "has-no-frame",
    );

    act(() => root.unmount());
  });

  it("configures the reel stop mode from the Reels y Cartas module", () => {
    const root = renderEditor();
    const reelsToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Desplegar modulo Reels y Cartas"]',
    );

    act(() => {
      reelsToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const stopSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Reel Stop"),
    );

    act(() => {
      stopSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const allAtOnce = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Detener columnas al mismo tiempo"]',
    );
    const leftToRight = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Detener columnas izquierda a derecha"]',
    );
    const randomOneByOne = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Detener columnas aleatorio uno por uno"]',
    );

    expect(allAtOnce).not.toBeNull();
    expect(leftToRight).not.toBeNull();
    expect(randomOneByOne).not.toBeNull();
    expect(leftToRight?.getAttribute("aria-pressed")).toBe("true");

    act(() => {
      leftToRight?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().reelSettings.stopMode).toBe("left-to-right");
    expect(
      host
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Detener columnas izquierda a derecha"]',
        )
        ?.getAttribute("aria-pressed"),
    ).toBe("true");

    act(() => root.unmount());
  });

  it("configures scatter symbols from existing reel cards", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelMode("tape");
      useEditorStore.getState().setReelSetting("cardCount", 5);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(useEditorStore.getState().activeModuleId).toBe("reels-cards");
    expect(findModuleSection("Reels y Cartas")?.textContent).toContain("Scatter");
    expect(findModuleSection("Trazados de Victoria")?.textContent).not.toContain("Tiene Scatter");

    const scatterSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Scatter"),
    );

    act(() => {
      scatterSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const scatterToggle = host.querySelector<HTMLInputElement>('input[aria-label="Tiene Scatter"]');

    expect(scatterToggle?.checked).toBe(false);
    expect(host.querySelector('input[aria-label="# Scatter"]')).toBeNull();

    act(() => {
      scatterToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const scatterCount = host.querySelector<HTMLInputElement>('input[aria-label="# Scatter"]');

    expect(useEditorStore.getState().scatterSettings.enabled).toBe(true);
    expect(scatterCount?.value).toBe("1");
    expect(
      Array.from(host.querySelectorAll<HTMLSelectElement>('select[aria-label^="Carta Scatter"]')),
    ).toHaveLength(1);

    act(() => {
      if (scatterCount) {
        scatterCount.value = "2";
      }
      scatterCount?.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });

    const selectors = Array.from(
      host.querySelectorAll<HTMLSelectElement>('select[aria-label^="Carta Scatter"]'),
    );

    expect(selectors).toHaveLength(2);
    expect(Array.from(selectors[0]?.options ?? []).map((option) => option.textContent)).toEqual([
      "Carta 1",
      "Carta 2",
      "Carta 3",
      "Carta 4",
      "Carta 5",
    ]);

    act(() => {
      if (selectors[1]) {
        selectors[1].value = "3";
        selectors[1].dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().scatterSettings).toEqual({
      enabled: true,
      readMode: "individual",
      scatterCount: 2,
      scatterSymbols: [1, 3],
    });

    act(() => root.unmount());
  });

  it("configures wild symbols from existing reel cards", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelMode("tape");
      useEditorStore.getState().setReelSetting("cardCount", 5);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(findModuleSection("Reels y Cartas")?.textContent).toContain("Wild");
    expect(findModuleSection("Trazados de Victoria")?.textContent).not.toContain("Wild");
    expect(useEditorStore.getState().activeModuleId).toBe("reels-cards");

    const wildSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Wild"),
    );

    act(() => {
      wildSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const wildToggle = host.querySelector<HTMLInputElement>('input[aria-label="Tiene Wild"]');

    expect(wildToggle?.checked).toBe(false);
    expect(host.querySelector('input[aria-label="# Wild"]')).toBeNull();

    act(() => {
      wildToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const wildCount = host.querySelector<HTMLInputElement>('input[aria-label="# Wild"]');

    expect(useEditorStore.getState().wildSettings.enabled).toBe(true);
    expect(wildCount?.value).toBe("1");

    act(() => {
      if (wildCount) {
        wildCount.value = "2";
      }
      wildCount?.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });

    const selectors = Array.from(
      host.querySelectorAll<HTMLSelectElement>('select[aria-label^="Carta Wild"]'),
    );

    expect(selectors).toHaveLength(2);
    expect(Array.from(selectors[0]?.options ?? []).map((option) => option.textContent)).toEqual([
      "Carta 1",
      "Carta 2",
      "Carta 3",
      "Carta 4",
      "Carta 5",
    ]);

    act(() => {
      if (selectors[0]) {
        selectors[0].value = "4";
        selectors[0].dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().wildSettings).toEqual({
      enabled: true,
      lineRule: "all",
      wildCount: 2,
      wildSymbols: [4, 2],
    });

    act(() => root.unmount());
  });

  it("defaults Wild to the next card when Scatter already uses Carta 1", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelSetting("cardCount", 5);
      useEditorStore.getState().addReel();
      useEditorStore.getState().setScatterEnabled(true);
      useEditorStore.getState().setWildEnabled(true);
      root.render(<SlotEditorApp />);
    });

    const scatterSelect = host.querySelector<HTMLSelectElement>(
      'select[aria-label="Carta Scatter 1"]',
    );
    const wildSelect = host.querySelector<HTMLSelectElement>('select[aria-label="Carta Wild 1"]');

    expect(scatterSelect?.value).toBe("1");
    expect(wildSelect?.value).toBe("2");

    act(() => {
      if (wildSelect) {
        wildSelect.value = "1";
        wildSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().wildSettings.wildSymbols).toEqual([1]);
    expect(useEditorStore.getState().scatterSettings.scatterSymbols).toEqual([2]);

    act(() => root.unmount());
  });

  it("configures jackpot symbols from existing reel cards", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelSetting("cardCount", 5);
      useEditorStore.getState().addReel();
      useEditorStore.getState().setScatterEnabled(true);
      useEditorStore.getState().setWildEnabled(true);
      useEditorStore.getState().setJackpotEnabled(true);
      root.render(<SlotEditorApp />);
    });

    expect(findModuleSection("Reels y Cartas")?.textContent).toContain("Jackpot");

    const jackpotSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Jackpot"),
    );

    act(() => {
      jackpotSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const jackpotSelect = host.querySelector<HTMLSelectElement>(
      'select[aria-label="Carta Jackpot 1"]',
    );

    expect(jackpotSelect?.value).toBe("3");
    expect(useEditorStore.getState().jackpotSettings.jackpotSymbols).toEqual([3]);

    act(() => root.unmount());
  });

  it("shows the Reglas y Combinaciones payout table with chances and editable payouts", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setReelSetting("cardCount", 5);
      useEditorStore.getState().addReel();
      useEditorStore
        .getState()
        .setLayerSymbolImages("reel-card-1-1", [{ name: "scatter.png", src: "blob:scatter.png" }]);
      useEditorStore.getState().setScatterEnabled(true);
      useEditorStore.getState().setScatterSymbol(0, 1);
      useEditorStore.getState().setWildEnabled(true);
      useEditorStore.getState().setWildSymbol(0, 2);
      useEditorStore.getState().setJackpotEnabled(true);
      useEditorStore.getState().setJackpotSymbol(0, 3);
      useEditorStore.getState().setCardGroupCount(1);
      useEditorStore.getState().setCardGroupSize(0, 1);
      useEditorStore.getState().setCardGroupSymbol(0, 0, 4);
      useEditorStore.getState().setActiveModule("rules-combinations");
      root.render(<SlotEditorApp />);
    });

    expect(host.querySelector(".slot-editor__phone")).toBeNull();
    expect(host.querySelector(".slot-editor__rules-combinations-workspace")).not.toBeNull();
    expect(host.textContent).toContain("6 combinaciones");
    expect(host.querySelector(".slot-editor__combination-table")?.textContent).not.toContain(
      "Carta 1",
    );
    expect(host.querySelector(".slot-editor__combination-table")?.textContent).not.toContain(
      "Carta 2",
    );
    expect(host.querySelector(".slot-editor__combination-table")?.textContent).not.toContain(
      "Carta 3",
    );
    expect(host.querySelector(".slot-editor__combination-table")?.textContent).toContain("Carta 5");
    expect(host.querySelector('[data-combination-symbol="4"]')).toBeNull();
    expect(host.querySelector('[data-combination-symbol="-1"]')).toBeNull();
    expect(host.querySelector(".slot-editor__combination-table")?.textContent).not.toContain(
      "Grupo 1",
    );
    expect(host.querySelector(".slot-editor__combination-table-head")?.textContent).toContain("x3");
    expect(host.querySelector(".slot-editor__combination-table-head")?.textContent).toContain("x5");
    expect(
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Ver Catalogo de Cartas"]')
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    const specialSectionsText = Array.from(
      host.querySelectorAll(".slot-editor__rules-special-section"),
    )
      .map((section) => section.textContent)
      .join(" ");
    expect(specialSectionsText).toContain("Wild Joker");
    expect(specialSectionsText).toContain("Scatter Freespins");
    expect(specialSectionsText).toContain("Jackpot");
    expect(specialSectionsText).toContain("chance");
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Freespins Carta 1 x2"]')?.value,
    ).toBe("0");
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Freespins Carta 1 x5"]'),
    ).not.toBeNull();
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Wild Carta 2 x3"]')?.value).toBe(
      "0",
    );
    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="Wild Carta 2 x5"]'),
    ).not.toBeNull();

    act(() => {
      const freespinsInput = host.querySelector<HTMLInputElement>(
        'input[aria-label="Freespins Carta 1 x3"]',
      );
      if (freespinsInput) {
        freespinsInput.value = "10";
        freespinsInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().scatterFreespins[1]?.[3]).toBe(10);
    act(() => {
      const wildInput = host.querySelector<HTMLInputElement>('input[aria-label="Wild Carta 2 x3"]');
      if (wildInput) {
        wildInput.value = "75";
        wildInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().wildPayouts[2]?.[3]).toBe(75);
    act(() => {
      const jackpotInput = host.querySelector<HTMLInputElement>(
        'input[aria-label="Jackpot Carta 3 x3"]',
      );
      if (jackpotInput) {
        jackpotInput.value = "250";
        jackpotInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().jackpotPayouts[3]?.[3]).toBe(250);
    act(() => {
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Ver Grupos de Cartas"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Ver Grupos de Cartas"]')
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(host.querySelector('[data-combination-symbol="-1"]')).not.toBeNull();
    expect(host.querySelector(".slot-editor__combination-table")?.textContent).toContain("Grupo 1");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Pago Grupo 1 x3"]')?.value).toBe(
      "0",
    );

    act(() => {
      const payoutInput = host.querySelector<HTMLInputElement>(
        'input[aria-label="Pago Grupo 1 x3"]',
      );
      if (payoutInput) {
        payoutInput.value = "12.5";
        payoutInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().combinationPayouts[-1]?.[3]).toBe(12.5);
    expect(host.querySelector(".slot-editor__rules-side-list")?.textContent).toContain("Carta 2");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Peso de Carta 1"]')?.value).toBe(
      "1",
    );

    act(() => {
      const weightInput = host.querySelector<HTMLInputElement>(
        'input[aria-label="Peso de Carta 1"]',
      );
      if (weightInput) {
        weightInput.value = "8";
        weightInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().symbolWeights).toEqual([8, 1, 1, 1, 1]);
    expect(host.querySelector(".slot-editor__rules-side-list")?.textContent).toContain("66.67%");

    act(() => root.unmount());
  });

  it("configures the wild line rule from Reglas y Combinaciones", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("rules-combinations");
      root.render(<SlotEditorApp />);
    });

    expect(findModuleSection("Reglas y Combinaciones")?.textContent).toContain("Regla de Wild");

    const wildRuleSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Regla de Wild"),
    );

    act(() => {
      wildRuleSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const highestPaying = host.querySelector<HTMLInputElement>(
      'input[aria-label="Wild solo apoya la linea de mayor pago"]',
    );

    expect(highestPaying?.checked).toBe(false);

    act(() => {
      highestPaying?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().wildSettings.lineRule).toBe("highest-paying");

    act(() => root.unmount());
  });

  it("configures line trace directions from Trazados de Victoria", () => {
    const root = renderEditor();

    expect(findModuleSection("Trazados de Victoria")?.textContent).toContain("Trazados");
    expect(findModuleSection("Reels y Cartas")?.textContent).not.toContain("Trazados");

    const traceSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Trazados"),
    );

    act(() => {
      traceSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const horizontal = host.querySelector<HTMLInputElement>(
      'input[aria-label="Trazado Horizontal"]',
    );
    const vertical = host.querySelector<HTMLInputElement>('input[aria-label="Trazado Vertical"]');
    const diagonal = host.querySelector<HTMLInputElement>('input[aria-label="Trazado Diagonal"]');
    const zigzag = host.querySelector<HTMLInputElement>('input[aria-label="Trazado Zigzag"]');
    const firstReel = host.querySelector<HTMLInputElement>('input[aria-label="Trazado 1er Reel"]');

    expect(horizontal?.checked).toBe(true);
    expect(vertical?.checked).toBe(false);
    expect(diagonal?.checked).toBe(true);
    expect(zigzag?.checked).toBe(true);
    expect(firstReel?.checked).toBe(false);

    act(() => {
      firstReel?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().lineTraceSettings).toEqual({
      diagonal: true,
      firstReel: true,
      horizontal: true,
      vertical: false,
      zigzag: true,
    });

    act(() => root.unmount());
  });

  it("configures scatter reading from Trazados de Victoria", () => {
    const root = renderEditor();

    expect(findModuleSection("Trazados de Victoria")?.textContent).toContain("Lectura de Scatter");

    const scatterReadSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Lectura de Scatter"),
    );

    act(() => {
      scatterReadSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const individualButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Scatter con valor individual"]',
    );
    const tracesButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Scatter cuenta para trazados"]',
    );

    expect(individualButton?.getAttribute("aria-pressed")).toBe("true");
    expect(tracesButton?.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      tracesButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().scatterSettings.readMode).toBe("traces");
    expect(tracesButton?.getAttribute("aria-pressed")).toBe("true");

    act(() => root.unmount());
  });

  it("configures trace validation mode from Trazados de Victoria", () => {
    const root = renderEditor();

    expect(findModuleSection("Trazados de Victoria")?.textContent).toContain(
      "Validacion de Trazados",
    );

    const validationSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Validacion de Trazados"),
    );

    act(() => {
      validationSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const classicButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Validacion clasica de trazados"]',
    );
    const cascadeButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Validacion cascada de trazados"]',
    );

    expect(classicButton?.getAttribute("aria-pressed")).toBe("true");
    expect(cascadeButton?.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      cascadeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().lineValidationMode).toBe("cascade");
    expect(cascadeButton?.getAttribute("aria-pressed")).toBe("true");

    act(() => root.unmount());
  });

  it("configures card groups from Reglas y Combinaciones", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("rules-combinations");
      useEditorStore.getState().setReelSetting("cardCount", 5);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(findModuleSection("Reglas y Combinaciones")?.textContent).toContain("Grupos de Cartas");

    const groupSummary = Array.from(host.querySelectorAll("summary")).find((summary) =>
      summary.textContent?.includes("Grupos de Cartas"),
    );

    act(() => {
      groupSummary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const groupCount = host.querySelector<HTMLInputElement>('input[aria-label="# Grupos"]');

    act(() => {
      if (groupCount) {
        groupCount.value = "1";
        groupCount.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    });

    expect(
      host.querySelector<HTMLInputElement>('input[aria-label="# Cartas Grupo 1"]')?.value,
    ).toBe("3");
    expect(
      Array.from(host.querySelectorAll<HTMLSelectElement>('select[aria-label^="Carta Grupo 1"]')),
    ).toHaveLength(3);
    expect(useEditorStore.getState().cardGroupSettings.groups).toEqual([[1, 2, 3]]);

    act(() => root.unmount());
  });

  it("highlights the active module with a green glow", () => {
    const root = renderEditor();
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");
    const buttonsModule = host.querySelector<HTMLElement>(".slot-editor__module");
    const reelsToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Desplegar modulo Reels y Cartas"]',
    );

    expect(buttonsModule?.className).toContain("is-active");
    expect(css).toContain(".slot-editor__module.is-active");
    expect(css).toContain("#22c55e");
    expect(css).toContain("box-shadow");

    act(() => {
      reelsToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const activeModuleTitles = Array.from(
      host.querySelectorAll(".slot-editor__module.is-active .slot-editor__module-header strong"),
    ).map((element) => element.textContent);

    expect(activeModuleTitles).toEqual(["Reels y Cartas"]);

    act(() => root.unmount());
  });

  it("selects a module when interacting with any option inside it", () => {
    const root = renderEditor();
    const reelsToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Desplegar modulo Reels y Cartas"]',
    );

    act(() => {
      reelsToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      useEditorStore.getState().setActiveModule("buttons-data");
      root.render(<SlotEditorApp />);
    });

    expect(useEditorStore.getState().activeModuleId).toBe("buttons-data");

    const columnsInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="Cantidad de Rodillos"]',
    );

    act(() => {
      columnsInput?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(useEditorStore.getState().activeModuleId).toBe("reels-cards");

    act(() => {
      useEditorStore.getState().setActiveModule("buttons-data");
      root.render(<SlotEditorApp />);
    });

    const createPlaceholdersButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Crear placeholders",
    );

    act(() => {
      createPlaceholdersButton?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(useEditorStore.getState().activeModuleId).toBe("reels-cards");

    act(() => root.unmount());
  });

  it("adds reel placeholders and exposes the load symbol action only for reel card layers", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(host.textContent).toContain("[Carta] Carta 1");
    expect(host.querySelector('[data-layer-id="reel-card-1-1"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Cargar simbolo de Carta 1"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Cargar simbolo de Spin / Jugar"]')).toBeNull();
    expect(host.textContent).toContain("[Carta] Carta 15");
    expect(host.textContent).not.toContain("[Carta] Carta 16");
    expect(host.textContent).not.toContain("[Carta] Carta 20");

    act(() => {
      useEditorStore.getState().setActiveModule("buttons-data");
      root.render(<SlotEditorApp />);
    });

    expect(host.querySelector('[aria-label="Cargar simbolo de Spin / Jugar"]')).toBeNull();
    expect(host.textContent).not.toContain("[Carta] Carta 1");

    act(() => root.unmount());
  });

  it("loads an image sequence from the green card layer action", () => {
    const createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
    vi.stubGlobal("URL", { ...URL, createObjectURL });
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().addReel();
      useEditorStore.getState().updateLayer("reel-card-2-1", { x: 304 });
      useEditorStore.setState({
        layers: useEditorStore
          .getState()
          .layers.map((layer) =>
            layer.id === "reel-card-2-1" ? { ...layer, symbolIndex: 1 } : layer,
          ),
      });
      root.render(<SlotEditorApp />);
    });

    const imageInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="Seleccionar imagenes para Carta 1"]',
    );
    const files = [
      new File(["frame-1"], "symbol-001.png", { type: "image/png" }),
      new File(["frame-2"], "symbol-002.png", { type: "image/png" }),
    ];

    expect(imageInput?.multiple).toBe(true);
    expect(imageInput?.accept).toBe("image/*");

    Object.defineProperty(imageInput, "files", {
      configurable: true,
      value: files,
    });

    act(() => {
      imageInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    const symbolOneImages = Array.from(
      host.querySelectorAll<HTMLImageElement>('[data-symbol-image="1"]'),
    );
    expect(symbolOneImages.length).toBeGreaterThanOrEqual(2);
    expect(symbolOneImages.every((image) => image.src === "blob:symbol-001.png")).toBe(true);
    expect(
      symbolOneImages.every((image) =>
        image.closest(".slot-editor__reel-card")?.className.includes("has-symbol-image"),
      ),
    ).toBe(true);
    expect(
      host.querySelector<HTMLImageElement>('[data-layer-thumbnail="reel-card-1-1"]')?.src,
    ).toBe("blob:symbol-001.png");
    expect(
      host
        .querySelector<HTMLImageElement>('[data-layer-thumbnail="reel-card-1-1"]')
        ?.closest(".slot-editor__layer")?.textContent,
    ).not.toContain("[Carta]");
    expect(host.textContent).toContain("2 imagenes");
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      symbolImages: [
        { name: "symbol-001.png", src: "blob:symbol-001.png" },
        { name: "symbol-002.png", src: "blob:symbol-002.png" },
      ],
    });

    act(() => root.unmount());
  });

  it("uses loaded symbol images inside the reel motion overlay", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().addReel();
      useEditorStore
        .getState()
        .setLayerSymbolImages("reel-card-1-1", [
          { name: "symbol-001.png", src: "blob:symbol-001.png" },
        ]);
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(80);
    });

    expect(host.querySelector<HTMLImageElement>('[data-reel-motion-symbol-image="1"]')?.src).toBe(
      "blob:symbol-001.png",
    );

    act(() => root.unmount());
  });

  it("lists all possible RNG cards but only renders the fixed 5x4 grid on the canvas", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelSetting("cardCount", 28);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(host.textContent).toContain("[Carta] Carta 28");
    expect(host.querySelector('[data-layer-id="reel-card-5-4"]')).not.toBeNull();
    expect(host.querySelector('[data-layer-id="reel-card-1-5"]')).toBeNull();
    expect(host.querySelector('[data-layer-id="reel-card-3-6"]')).toBeNull();
    expect(host.querySelectorAll('[data-layer-id^="reel-card-"]')).toHaveLength(20);

    act(() => root.unmount());
  });

  it("renders a configurable 5 by 4 RNG slot grid from a larger symbol set", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelSetting("cardCount", 35);
      useEditorStore.getState().setReelSetting("columns", 5);
      useEditorStore.getState().setReelSetting("rows", 4);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(host.textContent).toContain("[Carta] Carta 35");
    expect(host.querySelectorAll('[data-layer-id^="reel-card-"]')).toHaveLength(20);
    expect(host.querySelector('[data-layer-id="reel-card-1-4"]')).not.toBeNull();
    expect(host.querySelector('[data-layer-id="reel-card-5-4"]')).not.toBeNull();
    expect(host.querySelector('[data-layer-id="reel-card-1-5"]')).toBeNull();

    act(() => root.unmount());
  });

  it("keeps other module canvas layers visible but not interactive while editing Reels y Cartas", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLElement>('[data-layer-id="button-spin"]');
    const reelCard = host.querySelector<HTMLElement>('[data-layer-id="reel-card-1-1"]');
    expect(spinButton).not.toBeNull();
    expect(spinButton?.getAttribute("data-layer-disabled")).toBe("true");
    expect(reelCard?.getAttribute("data-layer-disabled")).toBeNull();

    act(() => {
      spinButton?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 140, clientY: 140 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(useEditorStore.getState().selectedLayerId).not.toBe("button-spin");
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 432,
      y: 1406,
    });

    act(() => {
      reelCard?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 115, clientY: 120 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(useEditorStore.getState().selectedLayerId).toBe("reel-card-1-1");
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      x: 180,
      y: 629,
    });
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.x,
    ).toBeCloseTo(338.2857);
    expect(useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.y).toBe(
      629,
    );

    act(() => root.unmount());
  });

  it("draws one selection frame around the whole reel grid", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelMode("tape");
      useEditorStore.getState().setLineTraceEnabled("vertical", true);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const selectionFrame = host.querySelector<HTMLElement>('[data-reel-grid-selection="true"]');
    const firstCard = host.querySelector<HTMLElement>('[data-layer-id="reel-card-1-1"]');

    expect(selectionFrame).not.toBeNull();
    expect(firstCard?.className).not.toContain("is-selected");
    expect(selectionFrame?.style.left).toBe("141px");
    expect(selectionFrame?.style.top).toBe("579px");
    expect(Number.parseFloat(selectionFrame?.style.width ?? "")).toBeCloseTo(797.4285);
    expect(Number.parseFloat(selectionFrame?.style.height ?? "")).toBeCloseTo(762.5714);

    act(() => root.unmount());
  });

  it("plays reels by moving a hidden 6-row motion window through the visible grid", () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelMode("tape");
      useEditorStore.getState().setLineTraceEnabled("vertical", true);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const motionWindow = host.querySelector<HTMLElement>('[data-reel-motion-window="true"]');
    expect(motionWindow).not.toBeNull();
    expect(host.querySelectorAll("[data-reel-motion-symbol]")).toHaveLength(30);
    expect(host.querySelector('[data-layer-id="reel-card-1-1"]')).toBeNull();
    expect(Number.parseFloat(motionWindow?.style.height ?? "")).toBeCloseTo(752.5716);

    act(() => {
      vi.advanceTimersByTime(940);
    });

    expect(host.querySelector('[data-reel-motion-window="true"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(host.querySelector('[data-reel-motion-window="true"]')).not.toBeNull();
    expect(host.querySelector('[data-layer-id="reel-card-1-1"]')).not.toBeNull();
    expect(host.querySelector<HTMLElement>('[data-layer-id="reel-card-1-1"]')?.className).toContain(
      "is-reel-hit-target",
    );
    expect(
      Array.from(host.querySelectorAll<HTMLElement>("[data-reel-motion-symbol]")).every((symbol) =>
        symbol.className.includes("is-stopped"),
      ),
    ).toBe(true);
    const winTraces = Array.from(host.querySelectorAll<HTMLElement>("[data-win-trace]"));
    expect(winTraces.length).toBeGreaterThan(1);
    expect(new Set(winTraces.map((trace) => trace.style.stroke)).size).toBeGreaterThan(1);
    expect(host.querySelector("[data-win-trace-direction='horizontal']")).not.toBeNull();
    expect(host.querySelector("[data-win-trace-direction='vertical']")).not.toBeNull();
    expect(host.querySelector("[data-win-trace-direction='diagonal']")).not.toBeNull();
    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .filter((layer) => layer.elementType === "card")
        .slice(0, 20)
        .every((layer) => layer.symbolIndex === 7),
    ).toBe(true);
    expect(randomSpy).toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("allows dragging the reel grid again after the spin result has stopped", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(5440);
    });

    const reelCard = host.querySelector<HTMLElement>('[data-layer-id="reel-card-1-1"]');

    expect(reelCard).not.toBeNull();
    expect(reelCard?.className).toContain("is-reel-hit-target");
    expect(host.querySelector('[data-reel-motion-window="true"]')).not.toBeNull();

    act(() => {
      reelCard?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 130, clientY: 140 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(useEditorStore.getState().selectedLayerId).toBe("reel-card-1-1");
    expect(host.querySelector('[data-reel-motion-window="true"]')).toBeNull();
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      x: 214,
      y: 675,
    });
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.x,
    ).toBeCloseTo(372.2857);

    act(() => root.unmount());
  });

  it("animates the editor Spin button while reels are spinning and settles when they stop", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelStopMode("all-at-once");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    expect(css).toContain(".slot-editor .game-hud__reference-spin:not(.is-spinning)");
    expect(css).toContain("animation: spin-button-idle-nudge 5200ms ease-in-out infinite;");
    expect(css).toContain(".slot-editor .game-hud__reference-spin.is-spinning");
    expect(css).toContain("animation: spin-button-rotate 760ms linear infinite;");
    expect(css).toContain(".slot-editor .game-hud__reference-spin.is-spin-settling");
    expect(css).toContain(
      "animation: spin-button-settle 360ms cubic-bezier(0.16, 0.9, 0.24, 1) both;",
    );

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(spinButton?.className).toContain("is-spinning");
    expect(spinButton?.className).not.toContain("is-spin-settling");

    act(() => {
      vi.advanceTimersByTime(5440);
    });

    expect(spinButton?.className).not.toContain("is-spinning");
    expect(spinButton?.className).toContain("is-spin-settling");

    act(() => root.unmount());
  });

  it("locks play buttons while reels are spinning and unlocks them after stop", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelStopMode("all-at-once");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const lockedButtonIds = [
      "button-spin",
      "button-betDecrease",
      "button-betIncrease",
      "button-autoplay",
      "button-bet",
    ];
    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');
    const arrowButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-arrow"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    for (const buttonId of lockedButtonIds) {
      const button = host.querySelector<HTMLButtonElement>(`[data-layer-id="${buttonId}"]`);

      expect(button?.disabled).toBe(true);
      expect(button?.className).toContain("is-play-locked");
    }
    expect(arrowButton?.disabled).toBe(false);
    expect(arrowButton?.className).not.toContain("is-play-locked");

    act(() => {
      vi.advanceTimersByTime(5440);
    });

    for (const buttonId of lockedButtonIds) {
      const button = host.querySelector<HTMLButtonElement>(`[data-layer-id="${buttonId}"]`);

      expect(button?.disabled).toBe(false);
      expect(button?.className).not.toContain("is-play-locked");
    }

    act(() => root.unmount());
  });

  it("keeps play buttons locked until cascade validation finishes", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.05);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setLineValidationMode("cascade");
      useEditorStore.getState().setLineTraceEnabled("vertical", false);
      useEditorStore.getState().setLineTraceEnabled("diagonal", false);
      useEditorStore.getState().setLineTraceEnabled("zigzag", false);
      useEditorStore.getState().setReelStopMode("all-at-once");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(5440);
    });

    expect(spinButton?.disabled).toBe(true);
    expect(spinButton?.className).toContain("is-play-locked");

    act(() => {
      vi.advanceTimersByTime(850);
    });

    expect(spinButton?.disabled).toBe(true);
    expect(spinButton?.className).toContain("is-play-locked");
    expect(host.querySelector<HTMLElement>("[data-reel-motion-symbol]")?.className).toContain(
      "is-cascade-dropping",
    );

    act(() => {
      vi.advanceTimersByTime(50000);
    });

    expect(spinButton?.disabled).toBe(false);
    expect(spinButton?.className).not.toContain("is-play-locked");

    act(() => root.unmount());
  });

  it("runs autoplay and turns the Spin button into a Stop control", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelStopMode("all-at-once");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const autoplayButton = host.querySelector<HTMLButtonElement>(
      '[data-layer-id="button-autoplay"]',
    );
    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');
    const spinIcon = host.querySelector<HTMLElement>('[data-editor-icon="button-spin"]');

    act(() => {
      autoplayButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(spinButton?.disabled).toBe(false);
    expect(spinButton?.className).toContain("is-autoplay-stop");
    expect(spinIcon?.style.getPropertyValue("--editor-icon-url")).toBe('url("/raw/icon_stop.svg")');
    expect(autoplayButton?.disabled).toBe(true);
    expect(autoplayButton?.className).toContain("is-play-locked");

    act(() => {
      vi.advanceTimersByTime(5440);
      vi.advanceTimersByTime(700);
    });

    expect(
      Array.from(host.querySelectorAll<HTMLElement>("[data-reel-motion-symbol]")).some(
        (symbol) => !symbol.className.includes("is-stopped"),
      ),
    ).toBe(true);

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(spinButton?.className).not.toContain("is-autoplay-stop");
    expect(spinIcon?.style.getPropertyValue("--editor-icon-url")).toBe('url("/raw/icon_spin.svg")');

    act(() => root.unmount());
  });

  it("keeps autoplay reel stop timing aligned with speed changes", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelStopMode("all-at-once");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const autoplayButton = host.querySelector<HTMLButtonElement>(
      '[data-layer-id="button-autoplay"]',
    );
    const arrowButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-arrow"]');

    act(() => {
      autoplayButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      arrowButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      arrowButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().spinSpeed).toBe("turbo");
    expect(arrowButton?.disabled).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(
      Array.from(host.querySelectorAll<HTMLElement>("[data-reel-motion-symbol]")).every((symbol) =>
        symbol.className.includes("is-stopped"),
      ),
    ).toBe(true);

    act(() => root.unmount());
  });

  it("cycles SpinSpeed from the arrow HUD button and uses it for the next Spin", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelMode("tape");
      useEditorStore.getState().setReelStopMode("all-at-once");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const arrowButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-arrow"]');
    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    expect(arrowButton?.className).toContain("has-speed-normal");

    act(() => {
      arrowButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().spinSpeed).toBe("fast");
    expect(arrowButton?.className).toContain("has-speed-fast");

    act(() => {
      arrowButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().spinSpeed).toBe("turbo");
    expect(arrowButton?.className).toContain("has-speed-turbo");

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(2300);
    });

    expect(
      host
        .querySelector<HTMLElement>('[data-reel-motion-window="true"]')
        ?.style.getPropertyValue("--slot-reel-motion-duration"),
    ).toBe("35ms");
    expect(
      Array.from(host.querySelectorAll<HTMLElement>("[data-reel-motion-symbol]")).every((symbol) =>
        symbol.className.includes("is-stopped"),
      ),
    ).toBe(true);

    act(() => root.unmount());
  });

  it("restarts the reel overlay directly when Play runs again after a stopped result", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(5440);
    });

    expect(
      Array.from(host.querySelectorAll<HTMLElement>("[data-reel-motion-symbol]")).every((symbol) =>
        symbol.className.includes("is-stopped"),
      ),
    ).toBe(true);

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      Array.from(host.querySelectorAll<HTMLElement>("[data-reel-motion-symbol]")).some((symbol) =>
        symbol.className.includes("is-stopped"),
      ),
    ).toBe(false);
    expect(host.querySelector('[data-layer-id="reel-card-1-1"]')).toBeNull();

    act(() => root.unmount());
  });

  it("visibly stops reel columns one by one from left to right", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelStopMode("left-to-right");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    act(() => {
      vi.advanceTimersByTime(2080);
    });

    const firstColumnSymbols = host.querySelectorAll<HTMLElement>(
      '[data-reel-motion-symbol^="1-"]',
    );
    const secondColumnSymbols = host.querySelectorAll<HTMLElement>(
      '[data-reel-motion-symbol^="2-"]',
    );

    expect(
      Array.from(firstColumnSymbols).every((symbol) => symbol.className.includes("is-stopped")),
    ).toBe(true);
    expect(
      Array.from(secondColumnSymbols).some((symbol) => symbol.className.includes("is-stopped")),
    ).toBe(false);

    act(() => root.unmount());
  });

  it("keeps reel symbol size stable when motion columns stop", () => {
    const root = renderEditor();
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");
    const stoppedRuleStart = css.indexOf(".slot-editor__reel-motion-symbol.is-stopped");
    const stoppedRuleEnd = css.indexOf("}", stoppedRuleStart);
    const stoppedRule = css.slice(stoppedRuleStart, stoppedRuleEnd);

    expect(css).toContain(".slot-editor__reel-motion-symbol.is-stopped");
    expect(stoppedRule).toContain("animation: none;");
    expect(stoppedRule).toContain("transform: translateY(0);");
    expect(css).toContain(
      "animation: slot-editor-reel-drop var(--slot-reel-motion-duration, 80ms) linear infinite;",
    );
    expect(css).toContain("transform: translateY(var(--slot-reel-motion-step, 58px));");
    expect(css).not.toContain("slot-reel-motion-step, 58px)) scale");

    act(() => root.unmount());
  });

  it("clips reel motion cards inside fixed-width column tracks", () => {
    vi.useFakeTimers();
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelSetting("scale", 1.4);
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const firstColumn = host.querySelector<HTMLElement>('[data-reel-motion-column="1"]');
    const secondColumn = host.querySelector<HTMLElement>('[data-reel-motion-column="2"]');
    const firstSymbol = host.querySelector<HTMLElement>('[data-reel-motion-symbol="1-1"]');

    expect(firstColumn).not.toBeNull();
    expect(firstColumn?.style.overflow).toBe("hidden");
    expect(firstColumn?.style.width).toBe("216px");
    expect(secondColumn?.style.left).toBe("220px");
    expect(host.querySelector<HTMLElement>('[data-reel-motion-window="true"]')?.style.width).toBe(
      "1096px",
    );
    expect(host.querySelector<HTMLElement>('[data-reel-motion-window="true"]')?.style.height).toBe(
      "1048.8px",
    );
    expect(firstSymbol?.style.width).toBe("216px");
    expect(firstSymbol?.style.height).toBe("259.2px");
    expect(firstSymbol?.style.left).toBe("0px");

    act(() => root.unmount());
  });

  it("keeps uploaded symbol image cards the same size before and during reel motion", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelSetting("scale", 1.4);
      useEditorStore.getState().addReel();
      useEditorStore
        .getState()
        .setLayerSymbolImages("reel-card-1-1", [
          { name: "symbol-001.png", src: "blob:symbol-001.png" },
        ]);
      root.render(<SlotEditorApp />);
    });

    const staticCard = host.querySelector<HTMLElement>('[data-layer-id="reel-card-1-1"]');
    const staticImage = staticCard?.querySelector<HTMLImageElement>('[data-symbol-image="1"]');

    expect(staticCard?.style.width).toBe("216px");
    expect(staticCard?.style.height).toBe("259.2px");
    expect(staticCard?.style.getPropertyValue("--slot-layer-size")).toBe("");
    expect(staticImage?.src).toBe("blob:symbol-001.png");

    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(80);
    });

    const motionSymbol = host.querySelector<HTMLElement>('[data-reel-motion-symbol="1-1"]');
    const motionImage = motionSymbol?.querySelector<HTMLImageElement>(
      '[data-reel-motion-symbol-image="1"]',
    );

    expect(motionSymbol?.style.width).toBe(staticCard?.style.width);
    expect(motionSymbol?.style.height).toBe(staticCard?.style.height);
    expect(motionImage?.src).toBe(staticImage?.src);

    act(() => root.unmount());
  });

  it("keeps the stopped reel result the same size as the grid before spinning", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const root = renderEditor();
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");
    const reelCardRuleStart = css.indexOf(".slot-editor__reel-card {");
    const reelCardRuleEnd = css.indexOf("}", reelCardRuleStart);
    const reelCardRule = css.slice(reelCardRuleStart, reelCardRuleEnd);
    const imageRuleStart = css.indexOf(".slot-editor__reel-card.has-symbol-image");
    const imageRuleEnd = css.indexOf("}", imageRuleStart);
    const imageRule = css.slice(imageRuleStart, imageRuleEnd);

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().setReelStopMode("all-at-once");
      useEditorStore.getState().setReelSetting("scale", 1.4);
      useEditorStore.getState().addReel();
      useEditorStore
        .getState()
        .setLayerSymbolImages("reel-card-1-1", [
          { name: "symbol-001.png", src: "blob:symbol-001.png" },
        ]);
      root.render(<SlotEditorApp />);
    });

    const staticCard = host.querySelector<HTMLElement>('[data-layer-id="reel-card-1-1"]');
    const spinButton = host.querySelector<HTMLButtonElement>('[data-layer-id="button-spin"]');

    expect(staticCard?.style.width).toBe("216px");
    expect(staticCard?.style.height).toBe("259.2px");
    expect(reelCardRule).toContain("padding: 0;");
    expect(staticCard?.className).toContain("has-symbol-image");
    expect(imageRule).toContain("background: transparent;");

    act(() => {
      spinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(5440);
    });

    const stoppedSymbol = host.querySelector<HTMLElement>('[data-reel-motion-symbol="1-1"]');
    const stoppedImage = stoppedSymbol?.querySelector<HTMLImageElement>(
      '[data-reel-motion-symbol-image="1"]',
    );

    expect(stoppedSymbol?.className).toContain("is-stopped");
    expect(stoppedSymbol?.className).toContain("has-symbol-image");
    expect(stoppedSymbol?.style.width).toBe(staticCard?.style.width);
    expect(stoppedSymbol?.style.height).toBe(staticCard?.style.height);
    expect(stoppedSymbol?.style.getPropertyValue("--slot-layer-size")).toBe("");
    expect(stoppedImage?.src).toBe("blob:symbol-001.png");

    act(() => root.unmount());
  });

  it("renders a frameless canvas without the middle guide board", () => {
    const root = renderEditor();
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(host.querySelector(".slot-editor__board")).toBeNull();
    expect(css).toContain(".slot-editor__phone");
    expect(css).toContain("border: 0;");
    expect(css).toContain("box-shadow: none;");

    act(() => root.unmount());
  });

  it("shows draggable gray layer previews outside the canvas bounds", () => {
    const root = renderEditor();
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".slot-editor__phone {\n  position: relative;");
    expect(css).toContain("overflow: visible;");
    expect(css).toContain(".slot-editor__phone-clip");
    expect(css).toContain("overflow: hidden;");
    expect(css).toContain(".slot-editor__outside-layer");
    expect(css).toContain("filter: grayscale(1)");
    expect(host.querySelector('[data-outside-layer-id="button-spin"]')).not.toBeNull();

    const outsideSpin = host.querySelector<HTMLElement>('[data-outside-layer-id="button-spin"]');
    act(() => {
      outsideSpin?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 120, clientY: 116 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 477,
      y: 1442,
    });

    act(() => root.unmount());
  });

  it("shrinks only the editor interface while keeping the mobile canvas size intact", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("--slot-editor-ui-scale: 0.7;");
    expect(css).toContain("grid-template-columns: 196px minmax(360px, 1fr) 252px;");
    expect(css).toContain("transform: scale(var(--slot-editor-ui-scale));");
    expect(css).toContain("width: calc(100% / var(--slot-editor-ui-scale));");
    expect(css).toContain("height: calc(100% / var(--slot-editor-ui-scale));");
    expect(css).not.toContain(".slot-editor__layer-panel {\n  transform-origin: top right;");
    expect(css).toContain("width: 1080px;");
    expect(css).toContain("height: 1920px;");
  });

  it("lets the top-left canvas toolbar switch the canvas background with icon buttons", () => {
    const root = renderEditor();
    const blackButton = host.querySelector<HTMLButtonElement>('button[aria-label="Fondo negro"]');
    const whiteButton = host.querySelector<HTMLButtonElement>('button[aria-label="Fondo blanco"]');
    const transparencyButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Cuadricula de transparencia"]',
    );
    const phoneCanvas = host.querySelector<HTMLElement>(".slot-editor__phone");

    expect(host.querySelector('select[aria-label="Fondo del canvas"]')).toBeNull();
    expect(blackButton).not.toBeNull();
    expect(whiteButton).not.toBeNull();
    expect(transparencyButton).not.toBeNull();
    expect(host.textContent).toContain("Fondo");
    expect(host.textContent).not.toContain("Zoom con scroll");
    expect(phoneCanvas?.className).toContain("is-background-black");
    expect(blackButton?.getAttribute("aria-pressed")).toBe("true");

    act(() => {
      whiteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().canvasBackground).toBe("white");
    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.className).toContain(
      "is-background-white",
    );

    act(() => {
      transparencyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().canvasBackground).toBe("transparent");
    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.className).toContain(
      "is-background-transparent",
    );

    act(() => root.unmount());
  });

  it("lets the top-left canvas toolbar switch between 9:16 and 16:9 aspect ratios", () => {
    const root = renderEditor();
    const portraitButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Aspect ratio 9:16"]',
    );
    const landscapeButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Aspect ratio 16:9"]',
    );

    expect(portraitButton).not.toBeNull();
    expect(landscapeButton).not.toBeNull();
    expect(portraitButton?.getAttribute("aria-pressed")).toBe("true");
    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.className).toContain(
      "is-aspect-9-16",
    );

    act(() => {
      landscapeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().canvasAspectRatio).toBe("16:9");
    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.className).toContain(
      "is-aspect-16-9",
    );
    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.style.transform).toBe(
      "translate(0px, -180px) scale(0.44)",
    );
    expect(host.querySelector('[data-layer-id="button-spin"]')).toBeNull();
    expect(host.querySelector('[data-layer-id="landscape-button-spin"]')).not.toBeNull();
    expect(
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Aspect ratio 16:9"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");

    act(() => root.unmount());
  });

  it("keeps independent canvas pan positions per aspect ratio", () => {
    const root = renderEditor();
    const canvasShell = host.querySelector<HTMLElement>(".slot-editor__canvas-shell");

    act(() => {
      canvasShell?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 130, clientY: 140 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.style.transform).toBe(
      "translate(30px, -480px) scale(0.44)",
    );

    act(() => {
      useEditorStore.getState().setCanvasAspectRatio("16:9");
      root.render(<SlotEditorApp />);
    });

    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.style.transform).toBe(
      "translate(0px, -180px) scale(0.44)",
    );

    act(() => {
      canvasShell?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 80, clientY: 115 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.style.transform).toBe(
      "translate(-20px, -165px) scale(0.44)",
    );

    act(() => {
      useEditorStore.getState().setCanvasAspectRatio("9:16");
      root.render(<SlotEditorApp />);
    });

    expect(host.querySelector<HTMLElement>(".slot-editor__phone")?.style.transform).toBe(
      "translate(30px, -480px) scale(0.44)",
    );

    act(() => root.unmount());
  });

  it("starts with Botones y Datos collapsed and toggles content from the module title", () => {
    const root = renderEditor();
    const moduleToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Desplegar modulo Botones y Datos"]',
    );
    const moduleActions = host.querySelector<HTMLElement>(
      "#slot-editor-module-buttons-data-actions",
    );

    expect(moduleToggle).not.toBeNull();
    expect(moduleToggle?.getAttribute("aria-expanded")).toBe("false");
    expect(moduleActions?.hidden).toBe(true);

    act(() => {
      moduleToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const expandedToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Contraer modulo Botones y Datos"]',
    );
    expect(expandedToggle?.getAttribute("aria-expanded")).toBe("true");
    expect(
      host.querySelector<HTMLElement>("#slot-editor-module-buttons-data-actions")?.hidden,
    ).toBe(false);

    act(() => {
      expandedToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Desplegar modulo Botones y Datos"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      host.querySelector<HTMLElement>("#slot-editor-module-buttons-data-actions")?.hidden,
    ).toBe(true);

    act(() => root.unmount());
  });

  it("marks the module title as a dropdown and crosses the eye when hidden", () => {
    const root = renderEditor();
    const moduleToggle = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Desplegar modulo Botones y Datos"]',
    );
    const chevron = moduleToggle?.querySelector<HTMLElement>(".slot-editor__module-chevron");
    const visibilityButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Ocultar modulo Botones y Datos"]',
    );

    expect(chevron).not.toBeNull();
    expect(chevron?.getAttribute("aria-hidden")).toBe("true");
    expect(chevron?.className).toContain("is-closed");
    expect(visibilityButton?.className).not.toContain("is-hidden");

    act(() => {
      moduleToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Contraer modulo Botones y Datos"]')
        ?.querySelector<HTMLElement>(".slot-editor__module-chevron")?.className,
    ).toContain("is-open");

    act(() => {
      visibilityButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const hiddenVisibilityButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Mostrar modulo Botones y Datos"]',
    );
    expect(hiddenVisibilityButton?.className).toContain("is-hidden");
    expect(hiddenVisibilityButton?.getAttribute("aria-pressed")).toBe("true");
    expect(hiddenVisibilityButton?.querySelector(".slot-editor__visibility-slash")).not.toBeNull();

    act(() => root.unmount());
  });

  it("shows dropdown arrows for the module action menus", () => {
    const root = renderEditor();
    const summaries = ["Agregar Boton", "Agregar Datos", "Colores"].map((label) =>
      Array.from(host.querySelectorAll("summary")).find((summary) => summary.textContent === label),
    );

    expect(summaries).toHaveLength(3);
    for (const summary of summaries) {
      const chevron = summary?.querySelector<HTMLElement>(".slot-editor__submenu-chevron");

      expect(summary).not.toBeUndefined();
      expect(chevron).not.toBeNull();
      expect(chevron?.getAttribute("aria-hidden")).toBe("true");
    }

    act(() => root.unmount());
  });

  it("starts module action menus closed by default", () => {
    const root = renderEditor();
    const details = Array.from(host.querySelectorAll("details"));

    expect(details).toHaveLength(14);
    for (const detail of details) {
      expect(detail.open).toBe(false);
    }

    act(() => root.unmount());
  });

  it("uses mask-based icons so default buttons can inherit the accent color", () => {
    const root = renderEditor();
    const spinIcon = host.querySelector<HTMLElement>('[data-editor-icon="button-spin"]');

    expect(spinIcon?.style.getPropertyValue("--editor-icon-url")).toBe('url("/raw/icon_spin.svg")');
    expect(spinIcon?.className).toContain("slot-editor__icon");

    act(() => root.unmount());
  });

  it("reuses the real slot-game-kit HUD button classes for default buttons", () => {
    const root = renderEditor();
    const spinButton = host.querySelector<HTMLButtonElement>('[aria-label="Spin / Jugar"]');
    const spinIcon = host.querySelector<HTMLElement>('[data-editor-icon="button-spin"]');

    expect(spinButton?.className).toContain("game-hud__reference-button");
    expect(spinButton?.className).toContain("game-hud__reference-button--spin");
    expect(spinButton?.className).toContain("game-hud__reference-spin");
    expect(spinIcon?.className).toContain("game-hud__reference-icon");

    act(() => root.unmount());
  });

  it("does not override the real HUD button shell styles with editor panel button styles", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).not.toContain(".slot-editor button,");
    expect(css).not.toContain(".slot-editor button {");
    expect(css).toContain(".slot-editor__panel button,");
  });

  it("adds data layers from the Agregar Datos section", () => {
    const root = renderEditor();

    const userLayerBefore = host.textContent?.includes("[Dato] Usuario") ?? false;
    expect(userLayerBefore).toBe(true);

    act(() => {
      useEditorStore.getState().removeLayer("data-user");
    });
    act(() => {
      root.render(<SlotEditorApp />);
    });
    expect(host.textContent).not.toContain("[Dato] Usuario");

    const addUserButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Usuario",
    );
    act(() => {
      addUserButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(host.textContent).toContain("[Dato] Usuario");

    act(() => root.unmount());
  });

  it("adds default data layers and renders label/value separately", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().removeLayer("data-balance");
      useEditorStore.getState().removeLayer("data-roundLabel");
      root.render(<SlotEditorApp />);
    });

    expect(host.textContent).not.toContain("[Dato] Balance");
    expect(host.textContent).not.toContain("[Dato] Ronda");

    const addDefaultDataButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Datos Por Default",
    );
    act(() => {
      addDefaultDataButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(host.textContent).toContain("[Dato] Balance");
    expect(host.textContent).toContain("[Dato] Ronda");
    expect(
      host.querySelector('[data-layer-id="data-balance"] .slot-editor__data-label'),
    ).not.toBeNull();
    expect(
      host.querySelector('[data-layer-id="data-balance"] .slot-editor__data-value'),
    ).not.toBeNull();

    act(() => root.unmount());
  });

  it("selects a layer from the canvas and shows editable properties", () => {
    const root = renderEditor();
    const balanceText = host.querySelector<HTMLElement>('[data-layer-id="data-balance"]');

    act(() => {
      balanceText?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(useEditorStore.getState().selectedLayerId).toBe("data-balance");
    expect(host.textContent).toContain("Propiedades");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Posicion X"]')?.value).toBe(
      "223",
    );
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Posicion Y"]')?.value).toBe(
      "1783",
    );
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Tamano"]')?.value).toBe("2.4");
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Color del layer"]')?.value).toBe(
      "#f8c048",
    );
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Layer visible"]')).toBeNull();
    expect(host.textContent).not.toContain("Visible");

    act(() => root.unmount());
  });

  it("shows selected card pixel dimensions in the properties panel", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setActiveModule("reels-cards");
      useEditorStore.getState().addReel();
      root.render(<SlotEditorApp />);
    });

    expect(host.querySelector<HTMLElement>('[data-card-pixel-size="true"]')?.textContent).toContain(
      "154 x 185 px",
    );

    act(() => {
      useEditorStore.getState().setReelSetting("scale", 1.4);
      root.render(<SlotEditorApp />);
    });

    expect(host.querySelector<HTMLElement>('[data-card-pixel-size="true"]')?.textContent).toContain(
      "216 x 259 px",
    );

    act(() => root.unmount());
  });

  it("updates selected layer properties from the layer panel", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setSelectedLayer("button-spin");
    });
    act(() => {
      root.render(<SlotEditorApp />);
    });

    const xInput = host.querySelector<HTMLInputElement>('input[aria-label="Posicion X"]');
    const yInput = host.querySelector<HTMLInputElement>('input[aria-label="Posicion Y"]');
    const sizeInput = host.querySelector<HTMLInputElement>('input[aria-label="Tamano"]');
    const colorInput = host.querySelector<HTMLInputElement>('input[aria-label="Color del layer"]');

    act(() => {
      if (xInput) {
        xInput.value = "91";
        xInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (yInput) {
        yInput.value = "401";
        yInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (sizeInput) {
        sizeInput.value = "0.6";
        sizeInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (colorInput) {
        colorInput.value = "#22c55e";
        colorInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 91,
      y: 401,
      size: 0.6,
      color: "#22c55e",
      visible: true,
    });

    act(() => root.unmount());
  });

  it("drags canvas layers and updates their position", () => {
    const root = renderEditor();
    const spinButton = host.querySelector<HTMLElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 130, clientY: 126 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(useEditorStore.getState().selectedLayerId).toBe("button-spin");
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 500,
      y: 1465,
    });

    act(() => root.unmount());
  });

  it("undoes a canvas layer drag in a single step", () => {
    const root = renderEditor();
    const spinButton = host.querySelector<HTMLElement>('[data-layer-id="button-spin"]');

    act(() => {
      spinButton?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 110, clientY: 110 }));
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 125, clientY: 118 }));
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 140, clientY: 132 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 523,
      y: 1479,
    });

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, ctrlKey: true, key: "z" }),
      );
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 432,
      y: 1406,
    });

    act(() => root.unmount());
  });

  it("pans the canvas view by dragging empty canvas space", () => {
    const root = renderEditor();
    const canvasShell = host.querySelector<HTMLElement>(".slot-editor__canvas-shell");
    const phoneCanvas = host.querySelector<HTMLElement>(".slot-editor__phone");

    expect(phoneCanvas?.style.transform).toBe("translate(0px, -520px) scale(0.44)");

    act(() => {
      canvasShell?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }),
      );
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 130, clientY: 140 }));
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(phoneCanvas?.style.transform).toBe("translate(30px, -480px) scale(0.44)");

    act(() => root.unmount());
  });

  it("shows the current canvas zoom percentage in the top right", () => {
    const root = renderEditor();
    const canvasShell = host.querySelector<HTMLElement>(".slot-editor__canvas-shell");
    const zoomIndicator = host.querySelector<HTMLElement>(".slot-editor__zoom-indicator");

    expect(zoomIndicator?.textContent).toBe("44%");
    expect(zoomIndicator?.getAttribute("aria-label")).toBe("Zoom del canvas");

    act(() => {
      canvasShell?.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 120 }));
    });

    expect(host.querySelector<HTMLElement>(".slot-editor__zoom-indicator")?.textContent).toBe(
      "36%",
    );

    act(() => root.unmount());
  });

  it("undoes the last editor change with Control Z", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().updateLayer("button-spin", { x: 302, y: 1406 });
      root.render(<SlotEditorApp />);
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 302,
      y: 1406,
    });

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, ctrlKey: true, key: "z" }),
      );
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 432,
      y: 1406,
    });

    act(() => root.unmount());
  });

  it("moves the selected layer with keyboard arrow keys", () => {
    useEditorStore.getState().setSelectedLayer("button-spin");
    const root = renderEditor();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
      window.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }),
      );
    });

    const movedSpinLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === "button-spin");
    expect(movedSpinLayer?.x).toBeLessThan(432);
    expect(movedSpinLayer?.y).toBeGreaterThan(1406);

    act(() => root.unmount());
  });

  it("does not move selected layers with arrow keys while editing property inputs", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setSelectedLayer("button-spin");
      root.render(<SlotEditorApp />);
    });

    const xInput = host.querySelector<HTMLInputElement>('input[aria-label="Posicion X"]');
    xInput?.focus();

    act(() => {
      xInput?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 432,
      y: 1406,
    });

    act(() => root.unmount());
  });

  it("changes accent color and exposes per-layer controls", () => {
    const root = renderEditor();
    const colorInput = host.querySelector<HTMLInputElement>('input[type="color"]');

    act(() => {
      if (colorInput) {
        colorInput.value = "#38bdf8";
        colorInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().accentColor).toBe("#38bdf8");
    expect(host.querySelector('[aria-label="Ocultar Spin / Jugar"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Configurar efectos de Spin / Jugar"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Subir layer seleccionado"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Bajar layer seleccionado"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Subir capa Spin / Jugar"]')).toBeNull();
    expect(host.querySelector('[aria-label="Bajar capa Spin / Jugar"]')).toBeNull();
    expect(host.querySelector('[aria-label="Eliminar Spin / Jugar"]')).not.toBeNull();

    act(() => root.unmount());
  });

  it("selects layers by clicking rows and moves the selected layer from the shared top control", () => {
    const root = renderEditor();
    const balanceLayer = Array.from(host.querySelectorAll<HTMLElement>(".slot-editor__layer")).find(
      (layer) => layer.textContent?.includes("[Dato] Balance"),
    );
    const upButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="Subir layer seleccionado"]',
    );
    const downButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="Bajar layer seleccionado"]',
    );

    expect(upButton).not.toBeNull();
    expect(downButton).not.toBeNull();
    expect(host.querySelectorAll(".slot-editor__elevator")).toHaveLength(1);
    expect(upButton?.className).toContain("slot-editor__selected-layer-order-button");
    expect(downButton?.className).toContain("slot-editor__selected-layer-order-button");

    act(() => {
      balanceLayer?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useEditorStore.getState().selectedLayerId).toBe("data-balance");
    expect(balanceLayer?.className).toContain("is-selected");

    const beforeMoveIds = useEditorStore.getState().layers.map((layer) => layer.id);
    const balanceIndexBefore = beforeMoveIds.indexOf("data-balance");

    act(() => {
      upButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const afterMoveIds = useEditorStore.getState().layers.map((layer) => layer.id);
    expect(afterMoveIds.indexOf("data-balance")).toBe(balanceIndexBefore - 1);

    act(() => {
      downButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      useEditorStore
        .getState()
        .layers.map((layer) => layer.id)
        .indexOf("data-balance"),
    ).toBe(balanceIndexBefore);

    act(() => root.unmount());
  });

  it("keeps selected layer order buttons wider and centered in one column", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".slot-editor__elevator");
    expect(css).toContain("width: 32px;");
    expect(css).toContain(".slot-editor__elevator button");
    expect(css).toContain("place-items: center;");
    expect(css).toContain("text-align: center;");
  });

  it("uses color-coded layer actions and the shared crossed-eye visibility state", () => {
    const root = renderEditor();
    const spinVisibilityButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="Ocultar Spin / Jugar"]',
    );
    const spinSettingsButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="Configurar efectos de Spin / Jugar"]',
    );
    const spinDeleteButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="Eliminar Spin / Jugar"]',
    );
    const moduleVisibilityButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="Ocultar modulo Botones y Datos"]',
    );

    expect(spinVisibilityButton?.className).toContain("slot-editor__visibility-button");
    expect(spinVisibilityButton?.className).not.toContain("is-hidden");
    expect(spinVisibilityButton?.getAttribute("aria-pressed")).toBe("false");
    expect(spinVisibilityButton?.querySelector(".slot-editor__visibility-eye")).not.toBeNull();
    expect(spinVisibilityButton?.querySelector(".slot-editor__visibility-slash")).not.toBeNull();
    expect(spinSettingsButton?.className).toContain("slot-editor__settings-action");
    expect(spinDeleteButton?.className).toContain("slot-editor__delete-action");
    expect(moduleVisibilityButton?.className).toContain("slot-editor__visibility-button");

    act(() => {
      spinVisibilityButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const hiddenSpinVisibilityButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="Mostrar Spin / Jugar"]',
    );
    expect(hiddenSpinVisibilityButton?.className).toContain("is-hidden");
    expect(hiddenSpinVisibilityButton?.getAttribute("aria-pressed")).toBe("true");
    expect(
      hiddenSpinVisibilityButton?.querySelector(".slot-editor__visibility-slash"),
    ).not.toBeNull();

    act(() => root.unmount());
  });

  it("gives layer action colors enough specificity to override panel button defaults", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".slot-editor__panel .slot-editor__settings-action");
    expect(css).toContain("color: #94a3b8;");
    expect(css).toContain(".slot-editor__panel .slot-editor__delete-action");
    expect(css).toContain("color: #ef4444;");
    expect(css).toContain(".slot-editor__panel .slot-editor__visibility-eye");
    expect(css).toContain("color: #a78bfa;");
  });

  it("applies button color only to canvas buttons without recoloring editor frames", () => {
    const root = renderEditor();
    const buttonColorInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="Color de botones"]',
    );

    act(() => {
      if (buttonColorInput) {
        buttonColorInput.value = "#ed49f8";
        buttonColorInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const editorRoot = host.querySelector<HTMLElement>(".slot-editor");
    const spinButton = host.querySelector<HTMLElement>('[data-layer-id="button-spin"]');
    const balanceData = host.querySelector<HTMLElement>('[data-layer-id="data-balance"]');

    expect(editorRoot?.style.getPropertyValue("--slot-editor-button-color")).toBe("#ed49f8");
    expect(editorRoot?.style.getPropertyValue("--slot-editor-accent")).toBe("");
    expect(spinButton?.style.getPropertyValue("--slot-layer-color")).toBe("#ed49f8");
    expect(balanceData?.style.getPropertyValue("--slot-layer-color")).toBe("#f8c048");

    act(() => root.unmount());
  });

  it("exposes editable glow and data text colors for the module", () => {
    const root = renderEditor();
    const glowInput = host.querySelector<HTMLInputElement>('input[aria-label="Color del glow"]');
    const dataInput = host.querySelector<HTMLInputElement>('input[aria-label="Color de datos"]');
    const textInput = host.querySelector<HTMLInputElement>('input[aria-label="Color del Texto"]');

    act(() => {
      if (glowInput) {
        glowInput.value = "#f97316";
        glowInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (dataInput) {
        dataInput.value = "#ffffff";
        dataInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (textInput) {
        textInput.value = "#eab308";
        textInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().glowColor).toBe("#f97316");
    expect(useEditorStore.getState().dataColor).toBe("#ffffff");
    expect(useEditorStore.getState().textColor).toBe("#eab308");
    expect(
      host.querySelector<HTMLElement>(".slot-editor")?.style.getPropertyValue("--slot-editor-glow"),
    ).toBe("#f97316");
    expect(
      host
        .querySelector<HTMLElement>(".slot-editor")
        ?.style.getPropertyValue("--slot-editor-data-color"),
    ).toBe("#ffffff");
    expect(
      host
        .querySelector<HTMLElement>(".slot-editor")
        ?.style.getPropertyValue("--slot-editor-text-color"),
    ).toBe("#eab308");

    act(() => root.unmount());
  });

  it("groups module color controls inside a collapsible colors tab", () => {
    const root = renderEditor();
    const editorRoot = host.querySelector<HTMLElement>(".slot-editor");
    const colorsDetails = Array.from(host.querySelectorAll("details")).find(
      (details) => details.querySelector("summary")?.textContent === "Colores",
    );

    expect(editorRoot?.style.getPropertyValue("--slot-editor-hover-glow-alpha")).toBe("0");
    expect(editorRoot?.style.getPropertyValue("--slot-editor-hover-glow-outer-alpha")).toBe("0");
    expect(colorsDetails).not.toBeUndefined();
    expect(colorsDetails?.querySelector('input[aria-label="Color de botones"]')).not.toBeNull();
    expect(colorsDetails?.querySelector('input[aria-label="Color del glow"]')).not.toBeNull();
    expect(colorsDetails?.querySelector('input[aria-label="Color hover"]')).toBeNull();
    expect(colorsDetails?.querySelector('input[aria-label="Color del Texto"]')).not.toBeNull();
    expect(colorsDetails?.querySelector('input[aria-label="Color de datos"]')).not.toBeNull();
    expect(colorsDetails?.querySelector('input[aria-label="Glow activo"]')).not.toBeNull();
    expect(
      colorsDetails?.querySelector('input[aria-label="Distancia glow botones"]'),
    ).not.toBeNull();
    expect(colorsDetails?.querySelector('input[aria-label="Distancia glow hover"]')).toBeNull();
    expect(
      Array.from(colorsDetails?.querySelectorAll("label span:first-child") ?? []).map(
        (element) => element.textContent,
      ),
    ).toEqual([
      "Color de botones",
      "Color del Texto",
      "Color de datos",
      "Color del glow",
      "Glow activo",
      "Distancia glow botones",
    ]);

    act(() => {
      useEditorStore.getState().setCanvasAspectRatio("16:9");
      root.render(<SlotEditorApp />);
    });

    expect(host.querySelector<HTMLElement>(".slot-editor")?.className).toContain("is-aspect-16-9");
    expect(
      host
        .querySelector<HTMLElement>(".slot-editor")
        ?.style.getPropertyValue("--slot-editor-hover-glow-alpha"),
    ).toBe("0.56");
    const landscapeColorsDetails = Array.from(host.querySelectorAll("details")).find(
      (details) => details.querySelector("summary")?.textContent === "Colores",
    );

    expect(landscapeColorsDetails?.querySelector('input[aria-label="Color hover"]')).not.toBeNull();
    expect(
      landscapeColorsDetails?.querySelector('input[aria-label="Distancia glow hover"]'),
    ).not.toBeNull();
    expect(
      Array.from(landscapeColorsDetails?.querySelectorAll("label span:first-child") ?? []).map(
        (element) => element.textContent,
      ),
    ).toEqual([
      "Color de botones",
      "Color del Texto",
      "Color de datos",
      "Color del glow",
      "Color hover",
      "Glow activo",
      "Distancia glow botones",
      "Distancia glow hover",
    ]);

    act(() => root.unmount());
  });

  it("controls button glow distance and hover glow distance from the colors tab", () => {
    const root = renderEditor();

    act(() => {
      useEditorStore.getState().setCanvasAspectRatio("16:9");
      root.render(<SlotEditorApp />);
    });

    const glowToggle = host.querySelector<HTMLInputElement>('input[aria-label="Glow activo"]');
    const buttonGlowDistance = host.querySelector<HTMLInputElement>(
      'input[aria-label="Distancia glow botones"]',
    );
    const hoverGlowDistance = host.querySelector<HTMLInputElement>(
      'input[aria-label="Distancia glow hover"]',
    );

    act(() => {
      if (glowToggle) {
        glowToggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
      if (buttonGlowDistance) {
        buttonGlowDistance.value = "70";
        buttonGlowDistance.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (hoverGlowDistance) {
        hoverGlowDistance.value = "96";
        hoverGlowDistance.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    const editorRoot = host.querySelector<HTMLElement>(".slot-editor");

    expect(useEditorStore.getState().glowEnabled).toBe(false);
    expect(useEditorStore.getState().buttonGlowDistance).toBe(70);
    expect(useEditorStore.getState().hoverGlowDistance).toBe(96);
    expect(editorRoot?.style.getPropertyValue("--slot-editor-button-glow-distance")).toBe("70px");
    expect(editorRoot?.style.getPropertyValue("--slot-editor-hover-glow-distance")).toBe("96px");
    expect(editorRoot?.style.getPropertyValue("--slot-editor-button-glow-alpha")).toBe("0");
    expect(editorRoot?.style.getPropertyValue("--slot-editor-hover-glow-alpha")).toBe("0");

    act(() => root.unmount());
  });

  it("exposes editable hover color for all canvas buttons", () => {
    const root = renderEditor();
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    act(() => {
      useEditorStore.getState().setCanvasAspectRatio("16:9");
      root.render(<SlotEditorApp />);
    });

    const hoverInput = host.querySelector<HTMLInputElement>('input[aria-label="Color hover"]');

    act(() => {
      if (hoverInput) {
        hoverInput.value = "#22c55e";
        hoverInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(useEditorStore.getState().hoverColor).toBe("#22c55e");
    expect(
      host
        .querySelector<HTMLElement>(".slot-editor")
        ?.style.getPropertyValue("--slot-editor-hover"),
    ).toBe("#22c55e");
    expect(
      host
        .querySelector<HTMLElement>(".slot-editor")
        ?.style.getPropertyValue("--slot-editor-hover-rgb"),
    ).toBe("34, 197, 94");
    expect(css).toContain(
      ".slot-editor.is-aspect-16-9 .game-hud__reference-button:hover:not(:disabled)",
    );
    expect(css).toContain(
      ".slot-editor.is-aspect-9-16 .game-hud__reference-button:hover:not(:disabled)",
    );
    expect(css).toContain(
      ".slot-editor.is-aspect-9-16 .game-hud__reference-button:hover:not(:disabled)::after",
    );
    expect(css).toContain(
      ".slot-editor.is-aspect-16-9 .slot-editor__hud-button:hover:not(:disabled)::after",
    );
    expect(css).not.toContain(".slot-editor .game-hud__reference-button:hover:not(:disabled) {");
    expect(css).not.toContain(".slot-editor .slot-editor__hud-button:hover:not(:disabled)::after");

    act(() => root.unmount());
  });

  it("lets editable layer coordinates control canvas button positions", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".slot-editor .slot-editor__hud-button");
    expect(css).toContain("position: absolute;");
    expect(css).toContain("display: grid;");
    expect(css).toContain("place-items: center;");
    expect(css).toContain(
      "width: calc(var(--slot-editor-button-base-width, 124px) * var(--slot-layer-size, 0.45));",
    );
    expect(css).toContain(
      "height: calc(var(--slot-editor-button-base-height, 124px) * var(--slot-layer-size, 0.45));",
    );
    expect(css).toContain(
      "border: calc(6px * var(--slot-layer-size, 0.45)) solid var(--hud-button-stroke);",
    );
    expect(css).not.toContain(".slot-editor__hud-button.is-info");
    expect(css).not.toContain(".slot-editor__hud-button.is-minus");
    expect(css).not.toContain(".slot-editor__hud-button.is-spin");
    expect(css).not.toContain("bottom: 116px;");
    expect(css).not.toContain("bottom: 30px;");
    expect(css).not.toContain("bottom: 4px;");
  });

  it("keeps the layer list scrollable when many reel cards are present", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".slot-editor__layer-panel {");
    expect(css).toContain("display: flex;");
    expect(css).toContain("flex-direction: column;");
    expect(css).toContain("min-height: 0;");
    expect(css).toContain(".slot-editor__layers {");
    expect(css).toContain("flex: 1 1 auto;");
    expect(css).toContain("align-content: start;");
    expect(css).toContain("grid-auto-rows: max-content;");
    expect(css).toContain("overflow-y: auto;");
    expect(css).toContain("padding-right: 4px;");
    expect(css).toContain(".slot-editor__properties {");
    expect(css).toContain("flex: 0 0 auto;");
  });

  it("keeps canvas buttons sharp by sizing them directly instead of scaling them", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".slot-editor .slot-editor__hud-button:active:not(:disabled)");
    expect(css).toContain("--slot-editor-button-base-width: 184px;");
    expect(css).toContain("--slot-editor-button-base-height: 184px;");
    expect(css).toContain("--editor-icon-mask-size: 100%;");
    expect(css).toContain("animation: none;");
    expect(css).not.toContain("transform: scale(var(--slot-layer-size, 0.45));");
    expect(css).not.toContain(
      ".slot-editor .slot-editor__hud-button:active:not(:disabled) {\n  transform: translateY",
    );
  });

  it("renders the arrow pill with large repeated arrow icons", () => {
    const cssPath = join(process.cwd(), "src/editor/slot-editor.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain(".slot-editor__arrow-icon-group");
    expect(css).toContain("width: 82%;");
    expect(css).toContain("height: 72%;");
    expect(css).toContain("width: 36%;");
    expect(css).toContain("height: 86%;");
  });
});
