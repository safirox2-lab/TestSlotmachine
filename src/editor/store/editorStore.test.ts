import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EDITOR_ACCENT,
  DEFAULT_EDITOR_DATA_COLOR,
  DEFAULT_EDITOR_GLOW_COLOR,
  DEFAULT_EDITOR_HOVER_COLOR,
  DEFAULT_EDITOR_TEXT_COLOR,
} from "../config/editorModules.config";
import { useEditorStore } from "./editorStore";

describe("editor store", () => {
  beforeEach(() => {
    useEditorStore.getState().resetEditor();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts with Botones y Datos active and default HUD layers visible", () => {
    const state = useEditorStore.getState();

    expect(state.activeModuleId).toBe("buttons-data");
    expect(state.moduleVisibility["buttons-data"]).toBe(true);
    expect(state.moduleVisibility["rules-wins"]).toBe(true);
    expect(state.moduleVisibility["rules-combinations"]).toBe(true);
    expect(state.accentColor).toBe(DEFAULT_EDITOR_ACCENT);
    expect(state.glowColor).toBe(DEFAULT_EDITOR_GLOW_COLOR);
    expect(state.glowEnabled).toBe(true);
    expect(state.buttonGlowDistance).toBe(10);
    expect(state.hoverGlowDistance).toBe(12);
    expect(state.dataColor).toBe(DEFAULT_EDITOR_DATA_COLOR);
    expect(state.dataColor).toBe("#ffffff");
    expect(state.textColor).toBe(DEFAULT_EDITOR_TEXT_COLOR);
    expect(state.hoverColor).toBe(DEFAULT_EDITOR_HOVER_COLOR);
    expect(state.canvasBackground).toBe("black");
    expect(state.canvasAspectRatio).toBe("9:16");
    expect(state.canvasZoom).toBe(0.44);
    expect(state.spinSpeed).toBe("normal");
    expect(state.scatterSettings).toEqual({
      claimMode: "auto",
      enabled: false,
      readMode: "individual",
      scatterCount: 1,
      scatterSymbols: [1],
    });
    expect(state.wildSettings).toEqual({
      enabled: false,
      lineRule: "all",
      wildCount: 1,
      wildSymbols: [1],
    });
    expect(state.jackpotSettings).toEqual({
      enabled: false,
      jackpotCount: 1,
      jackpotSymbols: [1],
    });
    expect(state.cardGroupSettings).toEqual({
      groupCount: 0,
      groups: [],
    });
    expect(state.wildPayouts).toEqual({});
    expect(state.scatterFreespins).toEqual({
      1: {
        2: 1,
        3: 2,
        4: 3,
        5: 4,
      },
    });
    expect(state.scatterFreespinIncrements).toEqual({
      1: 2,
    });
    expect(state.lineTraceSettings).toEqual({
      diagonal: true,
      firstReel: false,
      horizontal: true,
      vertical: false,
      zigzag: true,
    });
    expect(state.lineValidationMode).toBe("classic");
    expect(state.getActiveModuleLayers().map((layer) => layer.label)).toEqual([
      "Bajar Apuesta",
      "Spin / Jugar",
      "Subir Apuesta",
      "Reglas / Info",
      "AutoPlay config",
      "Apuesta",
      "Menu principal",
      "Flechas / Siguiente",
      "Usuario",
      "Ronda",
      "Balance",
      "Apuesta",
      "Freespins",
    ]);
    expect(state.getActiveModuleLayers().every((layer) => layer.canvasAspectRatio === "9:16")).toBe(
      true,
    );
    expect(state.layers.find((layer) => layer.id === "button-spin")).toMatchObject({
      canvasAspectRatio: "9:16",
      x: 432,
      y: 1406,
      size: 1.1657,
      color: DEFAULT_EDITOR_ACCENT,
    });
    expect(state.layers.find((layer) => layer.id === "button-info")).toMatchObject({
      x: 86,
      y: 1666,
      size: 1.2343,
      color: DEFAULT_EDITOR_ACCENT,
    });
    expect(state.layers.find((layer) => layer.id === "button-autoplay")).toMatchObject({
      x: 271,
      y: 1666,
      size: 1.2343,
      color: DEFAULT_EDITOR_ACCENT,
    });
    expect(state.layers.find((layer) => layer.id === "button-bet")).toMatchObject({
      x: 662,
      y: 1666,
      size: 1.2343,
      color: DEFAULT_EDITOR_ACCENT,
    });
    expect(state.layers.find((layer) => layer.id === "button-menu")).toMatchObject({
      x: 850,
      y: 1666,
      size: 1.2343,
      color: DEFAULT_EDITOR_ACCENT,
    });
    expect(state.layers.find((layer) => layer.id === "button-arrow")).toMatchObject({
      x: 446,
      y: 1666,
      size: 1.2343,
      color: DEFAULT_EDITOR_ACCENT,
      iconSrc: "/raw/icon_arrow.svg",
    });
    expect(state.layers.find((layer) => layer.id === "button-betDecrease")).toMatchObject({
      x: 267,
      y: 1474,
      size: 1.3714,
      color: DEFAULT_EDITOR_ACCENT,
    });
    expect(state.layers.find((layer) => layer.id === "button-betIncrease")).toMatchObject({
      x: 679,
      y: 1474,
      size: 1.3714,
      color: DEFAULT_EDITOR_ACCENT,
    });
    expect(state.layers.find((layer) => layer.id === "data-balance")).toMatchObject({
      x: 223,
      y: 1783,
      size: 2.4,
      color: DEFAULT_EDITOR_TEXT_COLOR,
      textLabel: "BALANCE",
      textValue: "$1,000",
    });
    expect(state.layers.find((layer) => layer.id === "data-roundLabel")).toMatchObject({
      x: 223,
      y: 1845,
      size: 2.4,
      color: DEFAULT_EDITOR_TEXT_COLOR,
      textLabel: "RONDA",
      textValue: "#000001",
    });
    expect(state.layers.some((layer) => layer.id === "data-roundNumber")).toBe(false);
  });

  it("starts the reels module with default reel settings but no reel layers selected", () => {
    const state = useEditorStore.getState();

    expect(state.moduleVisibility["reels-cards"]).toBe(true);
    expect(state.reelSettings).toEqual({
      cardCount: 15,
      columns: 5,
      mode: "procedural",
      paddingX: 4,
      paddingY: 4,
      rows: 4,
      scale: 1,
      slotFrameEnabled: true,
      stopMode: "left-to-right",
    });

    state.setActiveModule("reels-cards");

    expect(useEditorStore.getState().activeModuleId).toBe("reels-cards");
    expect(useEditorStore.getState().getActiveModuleLayers()).toEqual([]);
    expect(useEditorStore.getState().selectedLayerId).toBeNull();
  });

  it("adds placeholder reel card layers from the current reel settings", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelMode("tape");
    useEditorStore.getState().addReel();

    const reelLayers = useEditorStore.getState().getActiveModuleLayers();

    expect(reelLayers).toHaveLength(20);
    expect(reelLayers[0]).toMatchObject({
      id: "reel-card-1-1",
      moduleId: "reels-cards",
      canvasAspectRatio: "9:16",
      elementType: "card",
      label: "Carta 1",
      symbolIndex: 1,
      x: 146,
      y: 584,
      size: 1,
      color: "#263142",
    });
    expect(reelLayers.at(-1)).toMatchObject({
      id: "reel-card-5-4",
      label: "Carta 20",
      symbolIndex: 5,
    });
  });

  it("centers generated reel grids inside the active canvas by default", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelMode("tape");
    useEditorStore.getState().addReel();

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      x: 146,
      y: 584,
    });
    const lastCard = useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-5-4");
    expect(lastCard?.x).toBeCloseTo(779.1428);
    expect(lastCard?.y).toBeCloseTo(1151.4285);
  });

  it("uses card count as possible RNG symbols and dimensions as the visible grid", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelMode("tape");
    useEditorStore.getState().setReelSetting("cardCount", 12);
    useEditorStore.getState().setReelSetting("columns", 3);
    useEditorStore.getState().setReelSetting("rows", 2);
    useEditorStore.getState().addReel();

    const state = useEditorStore.getState();

    expect(state.reelSettings).toEqual({
      cardCount: 12,
      columns: 3,
      mode: "tape",
      paddingX: 4,
      paddingY: 4,
      rows: 2,
      scale: 1,
      slotFrameEnabled: true,
      stopMode: "left-to-right",
    });
    expect(state.getActiveModuleLayers()).toHaveLength(12);
    expect(state.getActiveModuleLayers().map((layer) => layer.id)).toEqual([
      "reel-card-1-1",
      "reel-card-2-1",
      "reel-card-3-1",
      "reel-card-1-2",
      "reel-card-2-2",
      "reel-card-3-2",
      "reel-card-1-3",
      "reel-card-2-3",
      "reel-card-3-3",
      "reel-card-1-4",
      "reel-card-2-4",
      "reel-card-3-4",
    ]);
  });

  it("creates every requested reel card layer beyond the visible grid size", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelMode("tape");
    useEditorStore.getState().setReelSetting("cardCount", 45);
    useEditorStore.getState().setReelSetting("columns", 5);
    useEditorStore.getState().setReelSetting("rows", 4);
    useEditorStore.getState().addReel();

    const reelLayers = useEditorStore.getState().getActiveModuleLayers();

    expect(reelLayers).toHaveLength(45);
    expect(reelLayers.at(-1)).toMatchObject({
      id: "reel-card-5-9",
      label: "Carta 45",
      symbolIndex: 45,
    });
  });

  it("creates enough canvas slot layers for the configured reel grid even with fewer RNG symbols", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelMode("procedural");
    useEditorStore.getState().setReelSetting("cardCount", 15);
    useEditorStore.getState().setReelSetting("columns", 7);
    useEditorStore.getState().setReelSetting("rows", 7);
    useEditorStore.getState().addReel();

    const reelLayers = useEditorStore.getState().getActiveModuleLayers();

    expect(reelLayers).toHaveLength(49);
    expect(reelLayers.at(-1)).toMatchObject({
      id: "reel-card-7-7",
      label: "Carta 49",
    });
    expect(reelLayers.every((layer) => (layer.symbolIndex ?? 0) >= 1)).toBe(true);
    expect(reelLayers.every((layer) => (layer.symbolIndex ?? 0) <= 15)).toBe(true);
  });

  it("stores whether reel slot frames are visible", () => {
    expect(useEditorStore.getState().reelSettings.slotFrameEnabled).toBe(true);

    useEditorStore.getState().setReelSlotFrameEnabled(false);

    expect(useEditorStore.getState().reelSettings.slotFrameEnabled).toBe(false);
  });

  it("stores editable symbol weights and resizes them with the card count", () => {
    expect(useEditorStore.getState().symbolWeights.slice(0, 3)).toEqual([1, 1, 1]);

    useEditorStore.getState().setSymbolWeight(2, 8);

    expect(useEditorStore.getState().symbolWeights[1]).toBe(8);

    useEditorStore.getState().setReelSetting("cardCount", 3);

    expect(useEditorStore.getState().symbolWeights).toEqual([1, 8, 1]);

    useEditorStore.getState().setReelSetting("cardCount", 5);

    expect(useEditorStore.getState().symbolWeights).toEqual([1, 8, 1, 1, 1]);
  });

  it("stores combination payouts by symbol and match count", () => {
    useEditorStore.getState().setReelSetting("cardCount", 5);
    useEditorStore.getState().setCombinationPayout(1, 3, 12.5);
    useEditorStore.getState().setCombinationPayout(1, 5, 40);

    expect(useEditorStore.getState().combinationPayouts).toEqual({
      1: {
        3: 12.5,
        5: 40,
      },
    });
  });

  it("stores scatter freespins by symbol and appearance count", () => {
    useEditorStore.getState().setScatterFreespins(1, 3, 12);
    useEditorStore.getState().setScatterFreespins(1, 5, 20);
    useEditorStore.getState().setScatterFreespinIncrement(1, 2);

    expect(useEditorStore.getState().scatterFreespins).toEqual({
      1: {
        2: 1,
        3: 12,
        4: 3,
        5: 20,
      },
    });
    expect(useEditorStore.getState().scatterFreespinIncrements).toEqual({
      1: 2,
    });
  });

  it("stores scatter rule settings and clamps them to existing cards", () => {
    expect(useEditorStore.getState().scatterSettings).toEqual({
      claimMode: "auto",
      enabled: false,
      readMode: "individual",
      scatterCount: 1,
      scatterSymbols: [1],
    });

    useEditorStore.getState().setReelSetting("cardCount", 4);
    useEditorStore.getState().setScatterEnabled(true);
    useEditorStore.getState().setScatterCount(3);
    useEditorStore.getState().setScatterSymbol(1, 4);

    expect(useEditorStore.getState().scatterSettings).toEqual({
      claimMode: "auto",
      enabled: true,
      readMode: "individual",
      scatterCount: 3,
      scatterSymbols: [1, 4, 3],
    });

    useEditorStore.getState().setReelSetting("cardCount", 2);

    expect(useEditorStore.getState().scatterSettings).toEqual({
      claimMode: "auto",
      enabled: true,
      readMode: "individual",
      scatterCount: 2,
      scatterSymbols: [1, 2],
    });
  });

  it("stores how scatter symbols are read by line tracing", () => {
    expect(useEditorStore.getState().scatterSettings.readMode).toBe("individual");

    useEditorStore.getState().setScatterReadMode("traces");

    expect(useEditorStore.getState().scatterSettings.readMode).toBe("traces");
  });

  it("stores how scatter freespins are claimed", () => {
    expect(useEditorStore.getState().scatterSettings.claimMode).toBe("auto");

    useEditorStore.getState().setScatterClaimMode("save");

    expect(useEditorStore.getState().scatterSettings.claimMode).toBe("save");
  });

  it("stores editor freespins and updates the HUD data layers", () => {
    expect(useEditorStore.getState().editorFreeSpins).toBe(0);

    useEditorStore.getState().addEditorFreeSpins(6);

    expect(useEditorStore.getState().editorFreeSpins).toBe(6);
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-freeSpins")?.textValue,
    ).toBe("6");
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "landscape-data-freeSpins")
        ?.textValue,
    ).toBe("6");

    expect(useEditorStore.getState().consumeEditorFreeSpin()).toBe(true);
    expect(useEditorStore.getState().editorFreeSpins).toBe(5);
  });

  it("cycles editor bet presets and updates the bet HUD layer", () => {
    expect(useEditorStore.getState().editorBet).toBe(10);
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-bet")?.textValue,
    ).toBe("$10");

    useEditorStore.getState().increaseEditorBet();
    expect(useEditorStore.getState().editorBet).toBe(20);
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-bet")?.textValue,
    ).toBe("$20");

    useEditorStore.getState().decreaseEditorBet();
    expect(useEditorStore.getState().editorBet).toBe(10);

    useEditorStore.getState().decreaseEditorBet();
    expect(useEditorStore.getState().editorBet).toBe(10);
  });

  it("deducts paid spins from balance but not freespins", () => {
    expect(useEditorStore.getState().editorBalance).toBe(1000);

    expect(useEditorStore.getState().tryDebitEditorBet()).toBe(true);
    expect(useEditorStore.getState().editorBalance).toBe(990);
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-balance")?.textValue,
    ).toBe("$990");

    useEditorStore.getState().increaseEditorBet();
    useEditorStore.getState().addEditorFreeSpins(1);
    expect(useEditorStore.getState().consumeEditorFreeSpin()).toBe(true);

    expect(useEditorStore.getState().editorBalance).toBe(990);
  });

  it("advances the editor round and updates the HUD data layers", () => {
    expect(useEditorStore.getState().editorRound).toBe(0);
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-roundLabel")?.textValue,
    ).toBe("#000001");

    useEditorStore.getState().advanceEditorRound();

    expect(useEditorStore.getState().editorRound).toBe(1);
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-roundLabel")?.textValue,
    ).toBe("#000001");

    useEditorStore.getState().advanceEditorRound();

    expect(useEditorStore.getState().editorRound).toBe(2);
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-roundLabel")?.textValue,
    ).toBe("#000002");
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "landscape-data-roundLabel")
        ?.textValue,
    ).toBe("#000002");
  });

  it("stores wild rule settings and clamps them to existing cards", () => {
    expect(useEditorStore.getState().wildSettings).toEqual({
      enabled: false,
      lineRule: "all",
      wildCount: 1,
      wildSymbols: [1],
    });

    useEditorStore.getState().setReelSetting("cardCount", 5);
    useEditorStore.getState().setWildEnabled(true);
    useEditorStore.getState().setWildCount(2);
    useEditorStore.getState().setWildSymbol(0, 5);

    expect(useEditorStore.getState().wildSettings).toEqual({
      enabled: true,
      lineRule: "all",
      wildCount: 2,
      wildSymbols: [5, 2],
    });

    useEditorStore.getState().setWildLineRule("highest-paying");

    expect(useEditorStore.getState().wildSettings.lineRule).toBe("highest-paying");

    useEditorStore.getState().setReelSetting("cardCount", 1);

    expect(useEditorStore.getState().wildSettings).toEqual({
      enabled: true,
      lineRule: "highest-paying",
      wildCount: 1,
      wildSymbols: [1],
    });
  });

  it("keeps scatter and wild symbols from selecting the same card", () => {
    useEditorStore.getState().setReelSetting("cardCount", 4);
    useEditorStore.getState().setScatterEnabled(true);
    useEditorStore.getState().setWildEnabled(true);

    expect(useEditorStore.getState().scatterSettings.scatterSymbols).toEqual([1]);
    expect(useEditorStore.getState().wildSettings.wildSymbols).toEqual([2]);

    useEditorStore.getState().setWildSymbol(0, 1);

    expect(useEditorStore.getState().wildSettings.wildSymbols).toEqual([1]);
    expect(useEditorStore.getState().scatterSettings.scatterSymbols).toEqual([2]);

    useEditorStore.getState().setScatterSymbol(0, 1);

    expect(useEditorStore.getState().scatterSettings.scatterSymbols).toEqual([1]);
    expect(useEditorStore.getState().wildSettings.wildSymbols).toEqual([2]);
  });

  it("keeps jackpot symbols separate from scatter and wild", () => {
    useEditorStore.getState().setReelSetting("cardCount", 5);
    useEditorStore.getState().setScatterEnabled(true);
    useEditorStore.getState().setWildEnabled(true);
    useEditorStore.getState().setJackpotEnabled(true);

    expect(useEditorStore.getState().scatterSettings.scatterSymbols).toEqual([1]);
    expect(useEditorStore.getState().wildSettings.wildSymbols).toEqual([2]);
    expect(useEditorStore.getState().jackpotSettings.jackpotSymbols).toEqual([3]);

    useEditorStore.getState().setJackpotCount(2);
    useEditorStore.getState().setJackpotSymbol(1, 5);

    expect(useEditorStore.getState().jackpotSettings).toEqual({
      enabled: true,
      jackpotCount: 2,
      jackpotSymbols: [3, 5],
    });

    useEditorStore.getState().setReelSetting("cardCount", 2);

    expect(useEditorStore.getState().jackpotSettings).toEqual({
      enabled: true,
      jackpotCount: 1,
      jackpotSymbols: [1],
    });
  });

  it("stores jackpot payouts by symbol and match count", () => {
    useEditorStore.getState().setReelSetting("cardCount", 5);
    useEditorStore.getState().setJackpotPayout(3, 3, 100);
    useEditorStore.getState().setJackpotPayout(3, 5, 500);

    expect(useEditorStore.getState().jackpotPayouts).toEqual({
      3: {
        3: 100,
        5: 500,
      },
    });
  });

  it("stores wild payouts by symbol and match count", () => {
    useEditorStore.getState().setReelSetting("cardCount", 5);
    useEditorStore.getState().setWildPayout(2, 3, 75);
    useEditorStore.getState().setWildPayout(2, 5, 250);

    expect(useEditorStore.getState().wildPayouts).toEqual({
      2: {
        3: 75,
        5: 250,
      },
    });
  });

  it("stores card group settings and clamps symbols to existing cards", () => {
    useEditorStore.getState().setReelSetting("cardCount", 5);
    useEditorStore.getState().setCardGroupCount(1);
    useEditorStore.getState().setCardGroupSize(0, 3);
    useEditorStore.getState().setCardGroupSymbol(0, 0, 1);
    useEditorStore.getState().setCardGroupSymbol(0, 1, 2);
    useEditorStore.getState().setCardGroupSymbol(0, 2, 3);

    expect(useEditorStore.getState().cardGroupSettings).toEqual({
      groupCount: 1,
      groups: [[1, 2, 3]],
    });

    useEditorStore.getState().setReelSetting("cardCount", 2);

    expect(useEditorStore.getState().cardGroupSettings).toEqual({
      groupCount: 1,
      groups: [[1, 2]],
    });
  });

  it("keeps card groups away from special cards and other groups", () => {
    useEditorStore.getState().setReelSetting("cardCount", 10);
    useEditorStore.getState().setScatterEnabled(true);
    useEditorStore.getState().setScatterSymbol(0, 1);
    useEditorStore.getState().setWildEnabled(true);
    useEditorStore.getState().setWildSymbol(0, 2);
    useEditorStore.getState().setJackpotEnabled(true);
    useEditorStore.getState().setJackpotSymbol(0, 3);

    useEditorStore.getState().setCardGroupCount(2);

    expect(useEditorStore.getState().cardGroupSettings.groups).toEqual([
      [4, 5, 6],
      [7, 8, 9],
    ]);

    useEditorStore.getState().setCardGroupSymbol(1, 0, 4);

    expect(useEditorStore.getState().cardGroupSettings.groups).toEqual([
      [4, 5, 6],
      [7, 8, 9],
    ]);

    useEditorStore.getState().setCardGroupSymbol(0, 0, 1);

    expect(useEditorStore.getState().cardGroupSettings.groups).toEqual([
      [4, 5, 6],
      [7, 8, 9],
    ]);
  });

  it("stores line tracing rule settings", () => {
    expect(useEditorStore.getState().lineTraceSettings).toEqual({
      diagonal: true,
      firstReel: false,
      horizontal: true,
      vertical: false,
      zigzag: true,
    });

    useEditorStore.getState().setLineTraceEnabled("vertical", true);

    expect(useEditorStore.getState().lineTraceSettings).toEqual({
      diagonal: true,
      firstReel: false,
      horizontal: true,
      vertical: true,
      zigzag: true,
    });

    useEditorStore.getState().setLineTraceEnabled("firstReel", true);

    expect(useEditorStore.getState().lineTraceSettings).toEqual({
      diagonal: true,
      firstReel: true,
      horizontal: true,
      vertical: true,
      zigzag: true,
    });
  });

  it("stores line validation mode", () => {
    expect(useEditorStore.getState().lineValidationMode).toBe("classic");

    useEditorStore.getState().setLineValidationMode("cascade");

    expect(useEditorStore.getState().lineValidationMode).toBe("cascade");
  });

  it("regenerates possible RNG card layers when grid dimensions change", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelMode("tape");
    useEditorStore.getState().setReelSetting("cardCount", 45);
    useEditorStore.getState().setReelSetting("columns", 5);
    useEditorStore.getState().addReel();

    useEditorStore.getState().setReelSetting("columns", 4);
    useEditorStore.getState().setReelSetting("rows", 8);
    useEditorStore.getState().addReel();

    const reelLayers = useEditorStore.getState().getActiveModuleLayers();

    expect(reelLayers).toHaveLength(45);
    expect(useEditorStore.getState().reelSettings.columns).toBe(4);
    expect(useEditorStore.getState().reelSettings.rows).toBe(8);
    expect(reelLayers.map((layer) => layer.id)).not.toContain("reel-card-5-9");
    expect(reelLayers.at(-1)).toMatchObject({
      id: "reel-card-1-12",
      label: "Carta 45",
      symbolIndex: 45,
    });
  });

  it("uses reel padding X and Y to space the placeholder cards", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelSetting("paddingX", 10);
    useEditorStore.getState().setReelSetting("paddingY", 12);
    useEditorStore.getState().addReel();

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      x: 134,
      y: 572,
    });
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.x,
    ).toBeCloseTo(298.2857);
    expect(useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.y).toBe(
      572,
    );
    expect(useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-2")?.x).toBe(
      134,
    );
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-2")?.y,
    ).toBeCloseTo(769.1428);
  });

  it("uses reel scale to resize all generated grid slots", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelSetting("scale", 1.4);
    useEditorStore.getState().addReel();

    const reelLayers = useEditorStore.getState().getActiveModuleLayers();

    expect(useEditorStore.getState().reelSettings.scale).toBe(1.4);
    expect(reelLayers).not.toHaveLength(0);
    expect(reelLayers.every((layer) => layer.size === 1.4)).toBe(true);
    expect(reelLayers[0]).toMatchObject({
      x: -8,
      y: 436,
    });
    expect(reelLayers[1]?.x).toBeCloseTo(212);
    expect(reelLayers[5]?.y).toBeCloseTo(699.2);
  });

  it("reflows existing reel cards immediately when padding X or Y changes", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().addReel();

    useEditorStore.getState().setReelSetting("paddingX", 10);
    useEditorStore.getState().setReelSetting("paddingY", 12);

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      x: 146,
      y: 584,
    });
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.x,
    ).toBeCloseTo(310.2857);
    expect(useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.y).toBe(
      584,
    );
    expect(useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-2")?.x).toBe(
      146,
    );
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-2")?.y,
    ).toBeCloseTo(781.1428);
  });

  it("assigns random symbols to each card in procedural reel mode", () => {
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.66)
      .mockReturnValueOnce(0.99);

    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelSetting("cardCount", 4);
    useEditorStore.getState().setReelSetting("columns", 2);
    useEditorStore.getState().setReelSetting("rows", 2);
    useEditorStore.getState().setReelMode("procedural");
    useEditorStore.getState().addReel();

    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .map((layer) => layer.symbolIndex),
    ).toEqual([1, 1, 3, 4]);
    expect(randomSpy).toHaveBeenCalledTimes(4);
  });

  it("rerolls procedural reel symbols when the current card count changes", () => {
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.93)
      .mockReturnValueOnce(0.86)
      .mockReturnValueOnce(0.8)
      .mockReturnValueOnce(0.73)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.49)
      .mockReturnValueOnce(0.12)
      .mockReturnValueOnce(0);

    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelSetting("columns", 2);
    useEditorStore.getState().setReelSetting("rows", 2);
    useEditorStore.getState().setReelSetting("cardCount", 4);
    useEditorStore.getState().setReelMode("procedural");
    useEditorStore.getState().addReel();

    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .map((layer) => layer.symbolIndex),
    ).toEqual([4, 4, 4, 3]);

    useEditorStore.getState().setReelSetting("cardCount", 8);

    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .map((layer) => layer.symbolIndex),
    ).toEqual(expect.arrayContaining([8, 4, 1, 1]));
    expect(useEditorStore.getState().getActiveModuleLayers()).toHaveLength(8);
    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .every((layer) => (layer.symbolIndex ?? 0) <= 8),
    ).toBe(true);
    expect(randomSpy).toHaveBeenCalledTimes(12);
  });

  it("adds newly requested possible RNG card layers when card count grows after grid creation", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelMode("tape");
    useEditorStore.getState().addReel();

    expect(useEditorStore.getState().getActiveModuleLayers()).toHaveLength(20);

    useEditorStore.getState().setReelSetting("cardCount", 45);

    const reelLayers = useEditorStore.getState().getActiveModuleLayers();
    expect(reelLayers).toHaveLength(45);
    expect(reelLayers.at(-1)).toMatchObject({
      id: "reel-card-5-9",
      label: "Carta 45",
      symbolIndex: 45,
    });
  });

  it("assigns an image sequence to a reel card layer", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().addReel();

    useEditorStore.getState().setLayerSymbolImages("reel-card-1-1", [
      { name: "idle-001.png", src: "blob:idle-001" },
      { name: "idle-002.png", src: "blob:idle-002" },
    ]);

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      symbolImages: [
        { name: "idle-001.png", src: "blob:idle-001" },
        { name: "idle-002.png", src: "blob:idle-002" },
      ],
    });
  });

  it("removing a reel card updates the available RNG card count without removing canvas cells", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelSetting("cardCount", 10);
    useEditorStore.getState().setReelMode("procedural");
    useEditorStore.getState().addReel();

    expect(useEditorStore.getState().getActiveModuleLayers()).toHaveLength(20);

    useEditorStore.getState().removeLayer("reel-card-5-2");

    const state = useEditorStore.getState();
    const reelCanvasLayers = state.layers.filter(
      (layer) => layer.moduleId === "reels-cards" && layer.canvasAspectRatio === "9:16",
    );

    expect(state.reelSettings.cardCount).toBe(9);
    expect(reelCanvasLayers).toHaveLength(20);
    expect(reelCanvasLayers.some((layer) => layer.id === "reel-card-5-2")).toBe(true);
    expect(reelCanvasLayers.every((layer) => (layer.symbolIndex ?? 0) <= 9)).toBe(true);
    expect(randomSpy).toHaveBeenCalledTimes(40);
  });

  it("removing the last possible reel card clears the whole active grid", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelSetting("cardCount", 1);
    useEditorStore.getState().addReel();

    expect(useEditorStore.getState().getActiveModuleLayers()).not.toHaveLength(0);

    useEditorStore.getState().removeLayer("reel-card-1-1");

    expect(useEditorStore.getState().reelSettings.cardCount).toBe(0);
    expect(useEditorStore.getState().getActiveModuleLayers()).toEqual([]);
    expect(useEditorStore.getState().selectedLayerId).toBeNull();
  });

  it("removes the active reel grid and possible cards on request", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().setReelSetting("cardCount", 12);
    useEditorStore.getState().addReel();

    expect(useEditorStore.getState().getActiveModuleLayers()).not.toHaveLength(0);

    useEditorStore.getState().removeReel();

    expect(useEditorStore.getState().getActiveModuleLayers()).toEqual([]);
    expect(useEditorStore.getState().selectedLayerId).toBeNull();
  });

  it("moves all reel card layers together when one card position changes", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().addReel();

    useEditorStore.getState().updateLayer("reel-card-1-1", { x: 91, y: 170 });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-1"),
    ).toMatchObject({
      x: 91,
      y: 170,
    });
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.x,
    ).toBeCloseTo(249.2857);
    expect(useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-2-1")?.y).toBe(
      170,
    );
    expect(useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-2")?.x).toBe(
      91,
    );
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "reel-card-1-2")?.y,
    ).toBeCloseTo(359.1428);
  });

  it("keeps reel layers independent per aspect ratio", () => {
    useEditorStore.getState().setActiveModule("reels-cards");
    useEditorStore.getState().addReel();
    useEditorStore.getState().setCanvasAspectRatio("16:9");

    expect(useEditorStore.getState().getActiveModuleLayers()).toEqual([]);

    useEditorStore.getState().addReel();

    const landscapeLayers = useEditorStore.getState().getActiveModuleLayers();
    expect(landscapeLayers).toHaveLength(20);
    expect(landscapeLayers[0]).toMatchObject({
      id: "landscape-reel-card-1-1",
      canvasAspectRatio: "16:9",
      x: 541,
      y: 205,
    });
    expect(landscapeLayers.map((layer) => layer.id)).not.toContain("reel-card-1-1");
  });

  it("adds a single button layer without duplicating existing layers", () => {
    useEditorStore.getState().removeLayer("button-spin");
    useEditorStore.getState().addButton("spin");
    useEditorStore.getState().addButton("spin");

    const spinLayers = useEditorStore
      .getState()
      .layers.filter((layer) => layer.id === "button-spin");
    expect(spinLayers).toHaveLength(1);
    expect(spinLayers[0]).toMatchObject({
      elementType: "button",
      iconSrc: "/raw/icon_spin.svg",
      visible: true,
      x: 432,
      y: 1406,
      size: 1.1657,
      color: DEFAULT_EDITOR_ACCENT,
    });
  });

  it("adds a data layer and keeps layers filterable by module", () => {
    useEditorStore.getState().removeLayer("data-user");
    useEditorStore.getState().addData("user");

    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .map((layer) => layer.id),
    ).toContain("data-user");
    expect(useEditorStore.getState().getActiveModuleLayers()).toEqual(
      useEditorStore
        .getState()
        .layers.filter(
          (layer) => layer.moduleId === "buttons-data" && layer.canvasAspectRatio === "9:16",
        ),
    );
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-user"),
    ).toMatchObject({
      x: 75,
      y: 62,
      size: 2.4,
      color: DEFAULT_EDITOR_TEXT_COLOR,
    });
  });

  it("restores all default data layers from Datos Por Default", () => {
    useEditorStore.getState().removeLayer("data-balance");
    useEditorStore.getState().removeLayer("data-roundLabel");
    useEditorStore.getState().addData("defaultData");

    expect(useEditorStore.getState().layers.map((layer) => layer.id)).toEqual(
      expect.arrayContaining([
        "data-user",
        "data-roundLabel",
        "data-balance",
        "data-bet",
        "data-freeSpins",
      ]),
    );
    expect(useEditorStore.getState().layers.map((layer) => layer.id)).not.toContain(
      "data-roundNumber",
    );
  });

  it("adds date and time data layers with the current day, month, hour, and minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 9, 7));

    useEditorStore.getState().addData("date");
    useEditorStore.getState().addData("time");

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-date"),
    ).toMatchObject({
      label: "Fecha",
      textLabel: "FECHA",
      textValue: "11/06",
    });
    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "data-time"),
    ).toMatchObject({
      label: "Hora",
      textLabel: "HORA",
      textValue: "09:07",
    });
  });

  it("toggles module and layer visibility", () => {
    useEditorStore.getState().toggleModuleVisibility("buttons-data");
    useEditorStore.getState().toggleLayerVisibility("button-spin");

    const state = useEditorStore.getState();
    expect(state.moduleVisibility["buttons-data"]).toBe(false);
    expect(state.layers.find((layer) => layer.id === "button-spin")?.visible).toBe(false);
  });

  it("removes and reorders layers with elevator actions", () => {
    useEditorStore.getState().moveLayer("button-spin", "down");
    expect(useEditorStore.getState().layers[2]?.id).toBe("button-spin");

    useEditorStore.getState().moveLayer("button-spin", "up");
    expect(useEditorStore.getState().layers[1]?.id).toBe("button-spin");

    useEditorStore.getState().removeLayer("button-spin");
    expect(useEditorStore.getState().layers.some((layer) => layer.id === "button-spin")).toBe(
      false,
    );
  });

  it("updates module colors and canvas zoom", () => {
    useEditorStore.getState().setAccentColor("#38bdf8");
    useEditorStore.getState().setGlowColor("#f97316");
    useEditorStore.getState().setDataColor("#ffffff");
    useEditorStore.getState().setTextColor("#eab308");
    useEditorStore.getState().setHoverColor("#22c55e");
    useEditorStore.getState().setCanvasZoom(1.8);
    useEditorStore.getState().setCanvasZoom(0.2);

    const state = useEditorStore.getState();
    expect(state.accentColor).toBe("#38bdf8");
    expect(state.glowColor).toBe("#f97316");
    expect(state.dataColor).toBe("#ffffff");
    expect(state.textColor).toBe("#eab308");
    expect(state.layers.find((layer) => layer.id === "data-balance")?.color).toBe("#eab308");
    expect(state.hoverColor).toBe("#22c55e");
    expect(state.canvasZoom).toBe(0.2);
    useEditorStore.getState().setCanvasZoom(0.05);
    expect(useEditorStore.getState().canvasZoom).toBe(0.15);
  });

  it("updates button glow controls", () => {
    useEditorStore.getState().setGlowEnabled(false);
    useEditorStore.getState().setButtonGlowDistance(64);
    useEditorStore.getState().setHoverGlowDistance(88);

    const state = useEditorStore.getState();
    expect(state.glowEnabled).toBe(false);
    expect(state.buttonGlowDistance).toBe(64);
    expect(state.hoverGlowDistance).toBe(88);

    useEditorStore.getState().setButtonGlowDistance(-4);
    useEditorStore.getState().setHoverGlowDistance(999);

    expect(useEditorStore.getState().buttonGlowDistance).toBe(0);
    expect(useEditorStore.getState().hoverGlowDistance).toBe(160);
  });

  it("updates the canvas background mode", () => {
    useEditorStore.getState().setCanvasBackground("white");
    expect(useEditorStore.getState().canvasBackground).toBe("white");

    useEditorStore.getState().setCanvasBackground("transparent");
    expect(useEditorStore.getState().canvasBackground).toBe("transparent");
  });

  it("cycles the spin speed used by the arrow HUD button", () => {
    expect(useEditorStore.getState().spinSpeed).toBe("normal");

    useEditorStore.getState().cycleSpinSpeed();
    expect(useEditorStore.getState().spinSpeed).toBe("fast");

    useEditorStore.getState().cycleSpinSpeed();
    expect(useEditorStore.getState().spinSpeed).toBe("turbo");

    useEditorStore.getState().cycleSpinSpeed();
    expect(useEditorStore.getState().spinSpeed).toBe("normal");
  });

  it("updates the canvas aspect ratio", () => {
    useEditorStore.getState().setCanvasAspectRatio("16:9");
    expect(useEditorStore.getState().canvasAspectRatio).toBe("16:9");

    useEditorStore.getState().setCanvasAspectRatio("9:16");
    expect(useEditorStore.getState().canvasAspectRatio).toBe("9:16");
  });

  it("keeps a separate layer set for the 16:9 canvas with default positions", () => {
    useEditorStore.getState().setCanvasAspectRatio("16:9");

    const activeLayers = useEditorStore.getState().getActiveModuleLayers();

    expect(activeLayers).toHaveLength(13);
    expect(activeLayers.every((layer) => layer.canvasAspectRatio === "16:9")).toBe(true);
    expect(activeLayers.map((layer) => layer.id)).not.toContain("button-spin");
    expect(activeLayers.find((layer) => layer.id === "landscape-button-spin")).toMatchObject({
      x: 850,
      y: 651,
      size: 1.1657,
      canvasAspectRatio: "16:9",
    });
    expect(activeLayers.find((layer) => layer.id === "landscape-button-arrow")).toMatchObject({
      x: 960,
      y: 857,
      size: 1.2343,
    });
    expect(activeLayers.find((layer) => layer.id === "landscape-data-balance")).toMatchObject({
      x: 720,
      y: 977,
      size: 2.4,
      textLabel: "BALANCE",
      textValue: "$1,000",
    });
  });

  it("adds buttons only to the currently selected aspect ratio", () => {
    useEditorStore.getState().setCanvasAspectRatio("16:9");
    useEditorStore.getState().removeLayer("landscape-button-spin");
    useEditorStore.getState().addButton("spin");

    expect(useEditorStore.getState().layers.some((layer) => layer.id === "button-spin")).toBe(true);
    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .some((layer) => layer.id === "button-spin"),
    ).toBe(false);
    expect(
      useEditorStore
        .getState()
        .getActiveModuleLayers()
        .find((layer) => layer.id === "landscape-button-spin"),
    ).toMatchObject({
      canvasAspectRatio: "16:9",
    });
  });

  it("updates button color without changing data layer text colors", () => {
    useEditorStore.getState().setAccentColor("#ed49f8");

    const state = useEditorStore.getState();
    expect(state.accentColor).toBe("#ed49f8");
    expect(state.layers.find((layer) => layer.id === "button-spin")?.color).toBe("#ed49f8");
    expect(state.layers.find((layer) => layer.id === "button-menu")?.color).toBe("#ed49f8");
    expect(state.layers.find((layer) => layer.id === "data-balance")?.color).toBe(
      DEFAULT_EDITOR_TEXT_COLOR,
    );
    expect(state.layers.find((layer) => layer.id === "data-roundLabel")?.color).toBe(
      DEFAULT_EDITOR_TEXT_COLOR,
    );
  });

  it("updates selected layer properties", () => {
    useEditorStore.getState().setSelectedLayer("button-spin");
    useEditorStore.getState().updateLayer("button-spin", {
      x: 88,
      y: 410,
      size: 0.62,
      color: "#22c55e",
      visible: false,
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 88,
      y: 410,
      size: 0.62,
      color: "#22c55e",
      visible: false,
    });
  });

  it("undoes the last editor change", () => {
    const initialSpinLayer = useEditorStore
      .getState()
      .layers.find((layer) => layer.id === "button-spin");

    useEditorStore.getState().updateLayer("button-spin", {
      x: 88,
      y: 410,
    });

    expect(
      useEditorStore.getState().layers.find((layer) => layer.id === "button-spin"),
    ).toMatchObject({
      x: 88,
      y: 410,
    });

    useEditorStore.getState().undo();

    expect(useEditorStore.getState().layers.find((layer) => layer.id === "button-spin")).toEqual(
      initialSpinLayer,
    );
  });
});
