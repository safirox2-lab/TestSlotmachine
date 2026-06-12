import { create } from "zustand";
import {
  BUTTONS_DATA_MODULE_ID,
  DEFAULT_EDITOR_ACCENT,
  DEFAULT_EDITOR_BUTTON_IDS,
  DEFAULT_EDITOR_DATA_COLOR,
  DEFAULT_EDITOR_DATA_IDS,
  DEFAULT_EDITOR_GLOW_COLOR,
  DEFAULT_EDITOR_HOVER_COLOR,
  DEFAULT_EDITOR_TEXT_COLOR,
  EDITOR_BUTTON_OPTIONS,
  EDITOR_DATA_OPTIONS,
  REELS_CARDS_MODULE_ID,
} from "../config/editorModules.config";
import type {
  EditorButtonOptionId,
  EditorCanvasAspectRatio,
  EditorDataOptionId,
  EditorLayer,
  EditorModuleId,
  EditorReelMode,
  EditorReelStopMode,
  EditorSpinSpeed,
} from "../editor.types";

type MoveDirection = "up" | "down";
type CanvasBackground = "black" | "transparent" | "white";
type LayerUpdate = Partial<Pick<EditorLayer, "color" | "size" | "visible" | "x" | "y">>;
type ReelSettingKey = "cardCount" | "columns" | "paddingX" | "paddingY" | "rows" | "scale";
const CANVAS_SCALE = 1080 / 315;

function scaleCanvasValue(value: number): number {
  return Math.round(value * CANVAS_SCALE);
}

function scaleLayerSize(value: number): number {
  return Number((value * CANVAS_SCALE).toFixed(4));
}

interface ReelSettings {
  cardCount: number;
  columns: number;
  mode: EditorReelMode;
  paddingX: number;
  paddingY: number;
  rows: number;
  scale: number;
  stopMode: EditorReelStopMode;
}
type EditorSnapshot = Pick<
  EditorStoreState,
  | "accentColor"
  | "canvasAspectRatio"
  | "canvasBackground"
  | "canvasZoom"
  | "buttonGlowDistance"
  | "dataColor"
  | "glowEnabled"
  | "glowColor"
  | "hoverGlowDistance"
  | "hoverColor"
  | "layers"
  | "moduleVisibility"
  | "reelSettings"
  | "selectedLayerId"
  | "textColor"
>;

const DEFAULT_BUTTON_LAYOUT: Record<
  EditorCanvasAspectRatio,
  Partial<Record<EditorButtonOptionId, { size: number; x: number; y: number }>>
> = {
  "9:16": {
    betDecrease: { x: scaleCanvasValue(78), y: scaleCanvasValue(430), size: scaleLayerSize(0.4) },
    spin: { x: scaleCanvasValue(126), y: scaleCanvasValue(410), size: scaleLayerSize(0.34) },
    betIncrease: {
      x: scaleCanvasValue(198),
      y: scaleCanvasValue(430),
      size: scaleLayerSize(0.4),
    },
    info: { x: scaleCanvasValue(25), y: scaleCanvasValue(486), size: scaleLayerSize(0.36) },
    autoplay: { x: scaleCanvasValue(79), y: scaleCanvasValue(486), size: scaleLayerSize(0.36) },
    arrow: { x: scaleCanvasValue(130), y: scaleCanvasValue(486), size: scaleLayerSize(0.36) },
    bet: { x: scaleCanvasValue(193), y: scaleCanvasValue(486), size: scaleLayerSize(0.36) },
    menu: { x: scaleCanvasValue(248), y: scaleCanvasValue(486), size: scaleLayerSize(0.36) },
  },
  "16:9": {
    betDecrease: { x: scaleCanvasValue(205), y: scaleCanvasValue(205), size: scaleLayerSize(0.4) },
    spin: { x: scaleCanvasValue(248), y: scaleCanvasValue(190), size: scaleLayerSize(0.34) },
    betIncrease: {
      x: scaleCanvasValue(315),
      y: scaleCanvasValue(205),
      size: scaleLayerSize(0.4),
    },
    info: { x: scaleCanvasValue(160), y: scaleCanvasValue(250), size: scaleLayerSize(0.36) },
    autoplay: { x: scaleCanvasValue(215), y: scaleCanvasValue(250), size: scaleLayerSize(0.36) },
    arrow: { x: scaleCanvasValue(280), y: scaleCanvasValue(250), size: scaleLayerSize(0.36) },
    bet: { x: scaleCanvasValue(345), y: scaleCanvasValue(250), size: scaleLayerSize(0.36) },
    menu: { x: scaleCanvasValue(400), y: scaleCanvasValue(250), size: scaleLayerSize(0.36) },
  },
};

const DEFAULT_DATA_LAYOUT: Record<
  EditorCanvasAspectRatio,
  Record<Exclude<EditorDataOptionId, "defaultData">, { x: number; y: number }>
> = {
  "9:16": {
    user: { x: scaleCanvasValue(22), y: scaleCanvasValue(18) },
    roundLabel: { x: scaleCanvasValue(65), y: scaleCanvasValue(538) },
    freeSpins: { x: scaleCanvasValue(188), y: scaleCanvasValue(538) },
    balance: { x: scaleCanvasValue(65), y: scaleCanvasValue(520) },
    bet: { x: scaleCanvasValue(188), y: scaleCanvasValue(520) },
    date: { x: scaleCanvasValue(22), y: scaleCanvasValue(36) },
    time: { x: scaleCanvasValue(218), y: scaleCanvasValue(18) },
  },
  "16:9": {
    user: { x: scaleCanvasValue(22), y: scaleCanvasValue(18) },
    roundLabel: { x: scaleCanvasValue(210), y: scaleCanvasValue(300) },
    freeSpins: { x: scaleCanvasValue(305), y: scaleCanvasValue(300) },
    balance: { x: scaleCanvasValue(210), y: scaleCanvasValue(285) },
    bet: { x: scaleCanvasValue(305), y: scaleCanvasValue(285) },
    date: { x: scaleCanvasValue(22), y: scaleCanvasValue(36) },
    time: { x: scaleCanvasValue(482), y: scaleCanvasValue(18) },
  },
};

const DEFAULT_REEL_SETTINGS: ReelSettings = {
  cardCount: 15,
  columns: 5,
  mode: "procedural",
  paddingX: 4,
  paddingY: 4,
  rows: 4,
  scale: 1,
  stopMode: "random-one-by-one",
};

const REEL_GRID_LAYOUT: Record<
  EditorCanvasAspectRatio,
  { cellHeight: number; cellWidth: number; surfaceHeight: number; surfaceWidth: number }
> = {
  "9:16": {
    cellHeight: 54 * CANVAS_SCALE,
    cellWidth: 45 * CANVAS_SCALE,
    surfaceHeight: 1920,
    surfaceWidth: 1080,
  },
  "16:9": {
    cellHeight: 48 * CANVAS_SCALE,
    cellWidth: 48 * CANVAS_SCALE,
    surfaceHeight: 1080,
    surfaceWidth: 1920,
  },
};

interface EditorStoreState {
  activeModuleId: EditorModuleId;
  moduleVisibility: Record<EditorModuleId, boolean>;
  layers: EditorLayer[];
  selectedLayerId: string | null;
  accentColor: string;
  glowColor: string;
  glowEnabled: boolean;
  buttonGlowDistance: number;
  hoverGlowDistance: number;
  dataColor: string;
  textColor: string;
  hoverColor: string;
  canvasBackground: CanvasBackground;
  canvasAspectRatio: EditorCanvasAspectRatio;
  canvasZoom: number;
  reelSettings: ReelSettings;
  spinSpeed: EditorSpinSpeed;
  pastSnapshots: EditorSnapshot[];
  setActiveModule: (moduleId: EditorModuleId) => void;
  toggleModuleVisibility: (moduleId: EditorModuleId) => void;
  addButton: (buttonId: EditorButtonOptionId) => void;
  addData: (dataId: EditorDataOptionId) => void;
  addReel: () => void;
  removeReel: () => void;
  removeLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  moveLayer: (layerId: string, direction: MoveDirection) => void;
  setSelectedLayer: (layerId: string | null) => void;
  pushUndoSnapshot: () => void;
  updateLayer: (layerId: string, update: LayerUpdate) => void;
  updateLayerDraft: (layerId: string, update: LayerUpdate) => void;
  setAccentColor: (color: string) => void;
  setGlowColor: (color: string) => void;
  setGlowEnabled: (enabled: boolean) => void;
  setButtonGlowDistance: (distance: number) => void;
  setHoverGlowDistance: (distance: number) => void;
  setDataColor: (color: string) => void;
  setTextColor: (color: string) => void;
  setHoverColor: (color: string) => void;
  setCanvasBackground: (background: CanvasBackground) => void;
  setCanvasAspectRatio: (aspectRatio: EditorCanvasAspectRatio) => void;
  setCanvasZoom: (zoom: number) => void;
  setReelMode: (mode: EditorReelMode) => void;
  setReelStopMode: (mode: EditorReelStopMode) => void;
  setReelSetting: (key: ReelSettingKey, value: number) => void;
  cycleSpinSpeed: () => void;
  setVisibleReelSymbols: (symbols: number[]) => void;
  undo: () => void;
  getActiveModuleLayers: () => EditorLayer[];
  resetEditor: () => void;
}

function aspectLayerPrefix(aspectRatio: EditorCanvasAspectRatio): string {
  return aspectRatio === "16:9" ? "landscape-" : "";
}

function buttonLayerId(
  buttonId: EditorButtonOptionId,
  aspectRatio: EditorCanvasAspectRatio,
): string {
  return `${aspectLayerPrefix(aspectRatio)}button-${buttonId}`;
}

function dataLayerId(dataId: EditorDataOptionId, aspectRatio: EditorCanvasAspectRatio): string {
  return `${aspectLayerPrefix(aspectRatio)}data-${dataId}`;
}

function reelCardLayerId(
  column: number,
  row: number,
  aspectRatio: EditorCanvasAspectRatio,
): string {
  return `${aspectLayerPrefix(aspectRatio)}reel-card-${column}-${row}`;
}

function parseReelCardLayerId(layerId: string): { column: number; row: number } | null {
  const match = /^(?:landscape-)?reel-card-(\d+)-(\d+)$/.exec(layerId);
  if (!match) {
    return null;
  }

  return {
    column: Number(match[1]),
    row: Number(match[2]),
  };
}

function twoDigit(value: number): string {
  return value.toString().padStart(2, "0");
}

function createCurrentDataValue(dataId: EditorDataOptionId, now = new Date()): string | undefined {
  if (dataId === "date") {
    return `${twoDigit(now.getDate())}/${twoDigit(now.getMonth() + 1)}`;
  }
  if (dataId === "time") {
    return `${twoDigit(now.getHours())}:${twoDigit(now.getMinutes())}`;
  }
  return undefined;
}

function createButtonLayer(
  buttonId: EditorButtonOptionId,
  aspectRatio: EditorCanvasAspectRatio,
): EditorLayer | null {
  const definition = EDITOR_BUTTON_OPTIONS.find((option) => option.id === buttonId);
  if (!definition || definition.id === "defaultButtons") {
    return null;
  }

  const layout = DEFAULT_BUTTON_LAYOUT[aspectRatio][buttonId];
  return {
    id: buttonLayerId(buttonId, aspectRatio),
    moduleId: BUTTONS_DATA_MODULE_ID,
    canvasAspectRatio: aspectRatio,
    elementType: definition.elementType,
    label: definition.layerLabel,
    visible: true,
    x: layout?.x ?? 88,
    y: layout?.y ?? 410,
    size: layout?.size ?? scaleLayerSize(0.45),
    color: DEFAULT_EDITOR_ACCENT,
    iconSrc: definition.iconSrc,
  };
}

function createDataLayer(
  dataId: EditorDataOptionId,
  aspectRatio: EditorCanvasAspectRatio,
): EditorLayer | null {
  if (dataId === "defaultData") {
    return null;
  }
  const definition = EDITOR_DATA_OPTIONS.find((option) => option.id === dataId);
  if (!definition) {
    throw new Error(`Unknown editor data id: ${dataId}`);
  }

  const layout = DEFAULT_DATA_LAYOUT[aspectRatio][dataId];
  return {
    id: dataLayerId(dataId, aspectRatio),
    moduleId: BUTTONS_DATA_MODULE_ID,
    canvasAspectRatio: aspectRatio,
    elementType: "data",
    label: definition.layerLabel,
    visible: true,
    x: layout.x,
    y: layout.y,
    size: scaleLayerSize(0.7),
    color: DEFAULT_EDITOR_TEXT_COLOR,
    textLabel: definition.textLabel,
    textValue: createCurrentDataValue(dataId) ?? definition.textValue,
  };
}

function createInitialLayers(): EditorLayer[] {
  return [...createLayersForAspectRatio("9:16"), ...createLayersForAspectRatio("16:9")];
}

function createLayersForAspectRatio(aspectRatio: EditorCanvasAspectRatio): EditorLayer[] {
  return [
    ...DEFAULT_EDITOR_BUTTON_IDS.map((buttonId) => createButtonLayer(buttonId, aspectRatio)).filter(
      (layer): layer is EditorLayer => Boolean(layer),
    ),
    ...DEFAULT_EDITOR_DATA_IDS.map((dataId) => createDataLayer(dataId, aspectRatio)).filter(
      (layer): layer is EditorLayer => Boolean(layer),
    ),
  ];
}

function getReelLayoutMetrics(settings: ReelSettings, aspectRatio: EditorCanvasAspectRatio) {
  const layout = REEL_GRID_LAYOUT[aspectRatio];
  const cellWidth = layout.cellWidth * settings.scale;
  const cellHeight = layout.cellHeight * settings.scale;

  return {
    cellHeight,
    cellWidth,
    gridHeight: settings.rows * cellHeight + Math.max(0, settings.rows - 1) * settings.paddingY,
    gridWidth: settings.columns * cellWidth + Math.max(0, settings.columns - 1) * settings.paddingX,
    stepX: cellWidth + settings.paddingX,
    stepY: cellHeight + settings.paddingY,
    surfaceHeight: layout.surfaceHeight,
    surfaceWidth: layout.surfaceWidth,
  };
}

function createReelLayers(
  settings: ReelSettings,
  aspectRatio: EditorCanvasAspectRatio,
): EditorLayer[] {
  const layout = getReelLayoutMetrics(settings, aspectRatio);
  const gridOrigin = getCenteredReelGridOrigin(settings, aspectRatio);
  const layers: EditorLayer[] = [];
  const slotCount = settings.columns * settings.rows;
  const layerCount = Math.max(settings.cardCount, slotCount);

  for (let layerIndex = 1; layerIndex <= layerCount; layerIndex += 1) {
    const column = ((layerIndex - 1) % settings.columns) + 1;
    const row = Math.floor((layerIndex - 1) / settings.columns) + 1;
    const sequenceIndex = ((layerIndex - 1) % settings.cardCount) + 1;
    const symbolIndex =
      settings.mode === "procedural"
        ? Math.floor(Math.random() * settings.cardCount) + 1
        : sequenceIndex;
    layers.push({
      id: reelCardLayerId(column, row, aspectRatio),
      moduleId: REELS_CARDS_MODULE_ID,
      canvasAspectRatio: aspectRatio,
      elementType: "card",
      label: `Carta ${layerIndex}`,
      visible: true,
      x: gridOrigin.x + (column - 1) * layout.stepX,
      y: gridOrigin.y + (row - 1) * layout.stepY,
      size: settings.scale,
      color: "#263142",
      symbolIndex,
    });
  }

  return layers;
}

function getCenteredReelGridOrigin(
  settings: ReelSettings,
  aspectRatio: EditorCanvasAspectRatio,
): { x: number; y: number } {
  const layout = getReelLayoutMetrics(settings, aspectRatio);

  return {
    x: Math.round((layout.surfaceWidth - layout.gridWidth) / 2),
    y: Math.round((layout.surfaceHeight - layout.gridHeight) / 2),
  };
}

const initialState = {
  activeModuleId: BUTTONS_DATA_MODULE_ID,
  moduleVisibility: {
    [BUTTONS_DATA_MODULE_ID]: true,
    [REELS_CARDS_MODULE_ID]: true,
  },
  layers: createInitialLayers(),
  selectedLayerId: "button-spin",
  accentColor: DEFAULT_EDITOR_ACCENT,
  glowColor: DEFAULT_EDITOR_GLOW_COLOR,
  glowEnabled: true,
  buttonGlowDistance: 10,
  hoverGlowDistance: 12,
  dataColor: DEFAULT_EDITOR_DATA_COLOR,
  textColor: DEFAULT_EDITOR_TEXT_COLOR,
  hoverColor: DEFAULT_EDITOR_HOVER_COLOR,
  canvasBackground: "black" as CanvasBackground,
  canvasAspectRatio: "9:16" as EditorCanvasAspectRatio,
  canvasZoom: 1,
  reelSettings: { ...DEFAULT_REEL_SETTINGS },
  spinSpeed: "normal" as EditorSpinSpeed,
};

const SPIN_SPEED_SEQUENCE: EditorSpinSpeed[] = ["normal", "fast", "turbo"];

function clampZoom(zoom: number): number {
  return Math.min(2, Math.max(0.15, Number.isFinite(zoom) ? zoom : 1));
}

function clampGlowDistance(distance: number): number {
  return Math.min(160, Math.max(0, Math.round(Number.isFinite(distance) ? distance : 0)));
}

function createSnapshot(state: EditorStoreState): EditorSnapshot {
  return {
    accentColor: state.accentColor,
    canvasAspectRatio: state.canvasAspectRatio,
    canvasBackground: state.canvasBackground,
    canvasZoom: state.canvasZoom,
    buttonGlowDistance: state.buttonGlowDistance,
    dataColor: state.dataColor,
    glowEnabled: state.glowEnabled,
    glowColor: state.glowColor,
    hoverGlowDistance: state.hoverGlowDistance,
    hoverColor: state.hoverColor,
    layers: state.layers.map((layer) => ({ ...layer })),
    moduleVisibility: { ...state.moduleVisibility },
    reelSettings: { ...state.reelSettings },
    selectedLayerId: state.selectedLayerId,
    textColor: state.textColor,
  };
}

function withUndoSnapshot<T extends Partial<EditorStoreState>>(
  state: EditorStoreState,
  update: T,
): T & { pastSnapshots: EditorSnapshot[] } {
  return {
    ...update,
    pastSnapshots: [...state.pastSnapshots, createSnapshot(state)],
  };
}

function updateLayers(layers: EditorLayer[], layerId: string, update: LayerUpdate): EditorLayer[] {
  const targetLayer = layers.find((layer) => layer.id === layerId);
  if (targetLayer?.elementType === "card" && (update.x !== undefined || update.y !== undefined)) {
    const nextX = update.x === undefined ? targetLayer.x : Math.round(update.x);
    const nextY = update.y === undefined ? targetLayer.y : Math.round(update.y);
    const deltaX = nextX - targetLayer.x;
    const deltaY = nextY - targetLayer.y;

    return layers.map((layer) => {
      const isSameReelGroup =
        layer.elementType === "card" &&
        layer.moduleId === targetLayer.moduleId &&
        layer.canvasAspectRatio === targetLayer.canvasAspectRatio;
      const baseLayer = layer.id === layerId ? { ...layer, ...update } : layer;

      return {
        ...baseLayer,
        x: isSameReelGroup ? layer.x + deltaX : baseLayer.x,
        y: isSameReelGroup ? layer.y + deltaY : baseLayer.y,
        size:
          layer.id === layerId && update.size !== undefined
            ? Math.min(8, Math.max(0.2, Number.isFinite(update.size) ? update.size : 1))
            : baseLayer.size,
      };
    });
  }

  return layers.map((layer) =>
    layer.id === layerId
      ? {
          ...layer,
          ...update,
          x: update.x === undefined ? layer.x : Math.round(update.x),
          y: update.y === undefined ? layer.y : Math.round(update.y),
          size:
            update.size === undefined
              ? layer.size
              : Math.min(8, Math.max(0.2, Number.isFinite(update.size) ? update.size : 1)),
        }
      : layer,
  );
}

function reflowReelLayersForAspectRatio(
  layers: EditorLayer[],
  settings: ReelSettings,
  aspectRatio: EditorCanvasAspectRatio,
): EditorLayer[] {
  const layout = getReelLayoutMetrics(settings, aspectRatio);
  const reelLayers = layers.filter(
    (layer) =>
      layer.elementType === "card" &&
      layer.moduleId === REELS_CARDS_MODULE_ID &&
      layer.canvasAspectRatio === aspectRatio,
  );
  if (reelLayers.length === 0) {
    return layers;
  }

  const anchorX = Math.min(...reelLayers.map((layer) => layer.x));
  const anchorY = Math.min(...reelLayers.map((layer) => layer.y));

  return layers.map((layer) => {
    if (
      layer.elementType !== "card" ||
      layer.moduleId !== REELS_CARDS_MODULE_ID ||
      layer.canvasAspectRatio !== aspectRatio
    ) {
      return layer;
    }

    const position = parseReelCardLayerId(layer.id);
    if (!position) {
      return layer;
    }

    return {
      ...layer,
      x: anchorX + (position.column - 1) * layout.stepX,
      y: anchorY + (position.row - 1) * layout.stepY,
      size: settings.scale,
    };
  });
}

function refreshReelSymbolsForAspectRatio(
  layers: EditorLayer[],
  settings: ReelSettings,
  aspectRatio: EditorCanvasAspectRatio,
): EditorLayer[] {
  return layers.map((layer) => {
    if (
      layer.elementType !== "card" ||
      layer.moduleId !== REELS_CARDS_MODULE_ID ||
      layer.canvasAspectRatio !== aspectRatio
    ) {
      return layer;
    }

    const position = parseReelCardLayerId(layer.id);
    if (!position) {
      return layer;
    }

    const sequenceIndex =
      ((position.column + (position.row - 1) * settings.columns - 1) % settings.cardCount) + 1;

    return {
      ...layer,
      symbolIndex:
        settings.mode === "procedural"
          ? Math.floor(Math.random() * settings.cardCount) + 1
          : sequenceIndex,
    };
  });
}

function resizeReelLayersForAspectRatio(
  layers: EditorLayer[],
  settings: ReelSettings,
  aspectRatio: EditorCanvasAspectRatio,
): EditorLayer[] {
  const layout = getReelLayoutMetrics(settings, aspectRatio);
  const existingReelLayers = layers.filter(
    (layer) =>
      layer.elementType === "card" &&
      layer.moduleId === REELS_CARDS_MODULE_ID &&
      layer.canvasAspectRatio === aspectRatio,
  );
  if (existingReelLayers.length === 0) {
    return layers;
  }

  const anchorX = Math.min(...existingReelLayers.map((layer) => layer.x));
  const anchorY = Math.min(...existingReelLayers.map((layer) => layer.y));
  const existingById = new Map(existingReelLayers.map((layer) => [layer.id, layer]));
  const slotCount = settings.columns * settings.rows;
  const layerCount = Math.max(settings.cardCount, slotCount);
  const nextReelLayers: EditorLayer[] = [];

  for (let layerIndex = 1; layerIndex <= layerCount; layerIndex += 1) {
    const column = ((layerIndex - 1) % settings.columns) + 1;
    const row = Math.floor((layerIndex - 1) / settings.columns) + 1;
    const id = reelCardLayerId(column, row, aspectRatio);
    const existingLayer = existingById.get(id);
    const sequenceIndex = ((layerIndex - 1) % settings.cardCount) + 1;
    const symbolIndex =
      settings.mode === "procedural"
        ? Math.floor(Math.random() * settings.cardCount) + 1
        : sequenceIndex;

    nextReelLayers.push({
      ...(existingLayer ?? {
        id,
        moduleId: REELS_CARDS_MODULE_ID,
        canvasAspectRatio: aspectRatio,
        elementType: "card" as const,
        visible: true,
        color: "#263142",
      }),
      label: `Carta ${layerIndex}`,
      x: anchorX + (column - 1) * layout.stepX,
      y: anchorY + (row - 1) * layout.stepY,
      size: settings.scale,
      symbolIndex,
    });
  }

  return [
    ...layers.filter(
      (layer) =>
        !(
          layer.elementType === "card" &&
          layer.moduleId === REELS_CARDS_MODULE_ID &&
          layer.canvasAspectRatio === aspectRatio
        ),
    ),
    ...nextReelLayers,
  ];
}

function setVisibleReelSymbolsForAspectRatio(
  layers: EditorLayer[],
  settings: ReelSettings,
  aspectRatio: EditorCanvasAspectRatio,
  symbols: number[],
): EditorLayer[] {
  return layers.map((layer) => {
    if (
      layer.elementType !== "card" ||
      layer.moduleId !== REELS_CARDS_MODULE_ID ||
      layer.canvasAspectRatio !== aspectRatio
    ) {
      return layer;
    }

    const position = parseReelCardLayerId(layer.id);
    if (!position || position.column > settings.columns || position.row > settings.rows) {
      return layer;
    }

    const symbolIndex = symbols[(position.row - 1) * settings.columns + position.column - 1];
    return {
      ...layer,
      symbolIndex: symbolIndex ?? layer.symbolIndex,
    };
  });
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  ...initialState,
  pastSnapshots: [],
  setActiveModule: (moduleId) =>
    set((state) => {
      const selectedLayerId =
        state.layers.find(
          (layer) =>
            layer.moduleId === moduleId && layer.canvasAspectRatio === state.canvasAspectRatio,
        )?.id ?? null;

      return {
        activeModuleId: moduleId,
        selectedLayerId,
      };
    }),
  toggleModuleVisibility: (moduleId) =>
    set((state) =>
      withUndoSnapshot(state, {
        moduleVisibility: {
          ...state.moduleVisibility,
          [moduleId]: !state.moduleVisibility[moduleId],
        },
      }),
    ),
  addButton: (buttonId) =>
    set((state) => {
      if (buttonId === "defaultButtons") {
        const existingIds = new Set(state.layers.map((layer) => layer.id));
        const missingDefaultLayers = DEFAULT_EDITOR_BUTTON_IDS.map((defaultButtonId) =>
          createButtonLayer(defaultButtonId, state.canvasAspectRatio),
        ).filter((layer): layer is EditorLayer => layer !== null && !existingIds.has(layer.id));
        if (missingDefaultLayers.length === 0) {
          return state;
        }
        return withUndoSnapshot(state, { layers: [...state.layers, ...missingDefaultLayers] });
      }

      const layer = createButtonLayer(buttonId, state.canvasAspectRatio);
      if (!layer || state.layers.some((existingLayer) => existingLayer.id === layer.id)) {
        return state;
      }
      return withUndoSnapshot(state, {
        layers: [...state.layers, layer],
        selectedLayerId: layer.id,
      });
    }),
  addData: (dataId) =>
    set((state) => {
      if (dataId === "defaultData") {
        const existingIds = new Set(state.layers.map((layer) => layer.id));
        const missingDefaultLayers = DEFAULT_EDITOR_DATA_IDS.map((defaultDataId) =>
          createDataLayer(defaultDataId, state.canvasAspectRatio),
        ).filter((layer): layer is EditorLayer => layer !== null && !existingIds.has(layer.id));
        if (missingDefaultLayers.length === 0) {
          return state;
        }
        return withUndoSnapshot(state, { layers: [...state.layers, ...missingDefaultLayers] });
      }
      const layer = createDataLayer(dataId, state.canvasAspectRatio);
      if (!layer || state.layers.some((existingLayer) => existingLayer.id === layer.id)) {
        return state;
      }
      return withUndoSnapshot(state, {
        layers: [...state.layers, layer],
        selectedLayerId: layer.id,
      });
    }),
  addReel: () =>
    set((state) => {
      const newReelLayers = createReelLayers(state.reelSettings, state.canvasAspectRatio);
      const layers = [
        ...state.layers.filter(
          (layer) =>
            !(
              layer.moduleId === REELS_CARDS_MODULE_ID &&
              layer.canvasAspectRatio === state.canvasAspectRatio
            ),
        ),
        ...newReelLayers,
      ];

      return withUndoSnapshot(state, {
        layers,
        selectedLayerId: newReelLayers[0]?.id ?? null,
      });
    }),
  removeReel: () =>
    set((state) => {
      const hasActiveAspectReelLayers = state.layers.some(
        (layer) =>
          layer.moduleId === REELS_CARDS_MODULE_ID &&
          layer.canvasAspectRatio === state.canvasAspectRatio,
      );
      if (!hasActiveAspectReelLayers) {
        return state;
      }

      return withUndoSnapshot(state, {
        layers: state.layers.filter(
          (layer) =>
            !(
              layer.moduleId === REELS_CARDS_MODULE_ID &&
              layer.canvasAspectRatio === state.canvasAspectRatio
            ),
        ),
        selectedLayerId: null,
      });
    }),
  removeLayer: (layerId) =>
    set((state) => {
      const layerToRemove = state.layers.find((layer) => layer.id === layerId);
      if (!layerToRemove) {
        return state;
      }
      if (
        layerToRemove.moduleId === REELS_CARDS_MODULE_ID &&
        layerToRemove.elementType === "card"
      ) {
        if (state.reelSettings.cardCount <= 1) {
          return withUndoSnapshot(state, {
            layers: state.layers.filter(
              (layer) =>
                !(
                  layer.moduleId === REELS_CARDS_MODULE_ID &&
                  layer.canvasAspectRatio === layerToRemove.canvasAspectRatio
                ),
            ),
            reelSettings: {
              ...state.reelSettings,
              cardCount: 0,
            },
            selectedLayerId: null,
          });
        }

        const reelSettings = {
          ...state.reelSettings,
          cardCount: Math.max(1, state.reelSettings.cardCount - 1),
        };
        return withUndoSnapshot(state, {
          layers: refreshReelSymbolsForAspectRatio(
            state.layers,
            reelSettings,
            layerToRemove.canvasAspectRatio,
          ),
          reelSettings,
          selectedLayerId: layerId,
        });
      }
      return withUndoSnapshot(state, {
        layers: state.layers.filter((layer) => layer.id !== layerId),
        selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      });
    }),
  toggleLayerVisibility: (layerId) =>
    set((state) => {
      if (!state.layers.some((layer) => layer.id === layerId)) {
        return state;
      }
      return withUndoSnapshot(state, {
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
        ),
      });
    }),
  moveLayer: (layerId, direction) =>
    set((state) => {
      const index = state.layers.findIndex((layer) => layer.id === layerId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= state.layers.length) {
        return state;
      }

      const layers = [...state.layers];
      const currentLayer = layers[index];
      const targetLayer = layers[targetIndex];
      if (!currentLayer || !targetLayer) {
        return state;
      }
      layers[index] = targetLayer;
      layers[targetIndex] = currentLayer;
      return withUndoSnapshot(state, { layers });
    }),
  setSelectedLayer: (layerId) => set({ selectedLayerId: layerId }),
  pushUndoSnapshot: () =>
    set((state) => ({
      pastSnapshots: [...state.pastSnapshots, createSnapshot(state)],
    })),
  updateLayer: (layerId, update) =>
    set((state) => {
      if (!state.layers.some((layer) => layer.id === layerId)) {
        return state;
      }
      return withUndoSnapshot(state, {
        layers: updateLayers(state.layers, layerId, update),
      });
    }),
  updateLayerDraft: (layerId, update) =>
    set((state) => {
      if (!state.layers.some((layer) => layer.id === layerId)) {
        return state;
      }
      return {
        layers: updateLayers(state.layers, layerId, update),
      };
    }),
  setAccentColor: (color) =>
    set((state) =>
      withUndoSnapshot(state, {
        accentColor: color,
        layers: state.layers.map((layer) =>
          layer.elementType !== "data" ? { ...layer, color } : layer,
        ),
      }),
    ),
  setGlowColor: (color) => set((state) => withUndoSnapshot(state, { glowColor: color })),
  setGlowEnabled: (enabled) => set((state) => withUndoSnapshot(state, { glowEnabled: enabled })),
  setButtonGlowDistance: (distance) =>
    set((state) => withUndoSnapshot(state, { buttonGlowDistance: clampGlowDistance(distance) })),
  setHoverGlowDistance: (distance) =>
    set((state) => withUndoSnapshot(state, { hoverGlowDistance: clampGlowDistance(distance) })),
  setDataColor: (color) => set((state) => withUndoSnapshot(state, { dataColor: color })),
  setTextColor: (color) =>
    set((state) =>
      withUndoSnapshot(state, {
        textColor: color,
        layers: state.layers.map((layer) =>
          layer.elementType === "data" ? { ...layer, color } : layer,
        ),
      }),
    ),
  setHoverColor: (color) => set((state) => withUndoSnapshot(state, { hoverColor: color })),
  setCanvasBackground: (background) =>
    set((state) => withUndoSnapshot(state, { canvasBackground: background })),
  setCanvasAspectRatio: (aspectRatio) =>
    set((state) => {
      const selectedLayerId =
        state.layers.find(
          (layer) =>
            layer.canvasAspectRatio === aspectRatio &&
            layer.moduleId === state.activeModuleId &&
            (layer.id.endsWith("button-spin") || state.activeModuleId !== BUTTONS_DATA_MODULE_ID),
        )?.id ?? null;
      return withUndoSnapshot(state, { canvasAspectRatio: aspectRatio, selectedLayerId });
    }),
  setCanvasZoom: (zoom) => set({ canvasZoom: clampZoom(zoom) }),
  setReelMode: (mode) =>
    set((state) =>
      withUndoSnapshot(state, {
        reelSettings: {
          ...state.reelSettings,
          mode,
        },
      }),
    ),
  setReelStopMode: (mode) =>
    set((state) =>
      withUndoSnapshot(state, {
        reelSettings: {
          ...state.reelSettings,
          stopMode: mode,
        },
      }),
    ),
  setReelSetting: (key, value) =>
    set((state) => {
      const maxByKey: Record<ReelSettingKey, number> = {
        cardCount: Number.MAX_SAFE_INTEGER,
        columns: 8,
        paddingX: 80,
        paddingY: 80,
        rows: 8,
        scale: 3,
      };
      const minByKey: Record<ReelSettingKey, number> = {
        cardCount: 1,
        columns: 1,
        paddingX: 0,
        paddingY: 0,
        rows: 1,
        scale: 0.2,
      };
      const numericValue = Number.isFinite(value) ? value : state.reelSettings[key];
      const roundedValue = key === "scale" ? numericValue : Math.round(numericValue);
      const reelSettings = {
        ...state.reelSettings,
        [key]: Math.min(maxByKey[key], Math.max(minByKey[key], roundedValue)),
      };
      const hasActiveAspectReelLayers = state.layers.some(
        (layer) =>
          layer.moduleId === REELS_CARDS_MODULE_ID &&
          layer.canvasAspectRatio === state.canvasAspectRatio,
      );
      const layers =
        key === "paddingX" || key === "paddingY"
          ? reflowReelLayersForAspectRatio(state.layers, reelSettings, state.canvasAspectRatio)
          : key === "scale"
            ? reflowReelLayersForAspectRatio(state.layers, reelSettings, state.canvasAspectRatio)
            : key === "columns" || key === "rows"
              ? hasActiveAspectReelLayers
                ? createReelLayers(reelSettings, state.canvasAspectRatio)
                : state.layers
              : key === "cardCount"
                ? resizeReelLayersForAspectRatio(
                    state.layers,
                    reelSettings,
                    state.canvasAspectRatio,
                  )
                : state.layers;

      const nextLayers =
        (key === "columns" || key === "rows") && hasActiveAspectReelLayers
          ? [
              ...state.layers.filter(
                (layer) =>
                  !(
                    layer.moduleId === REELS_CARDS_MODULE_ID &&
                    layer.canvasAspectRatio === state.canvasAspectRatio
                  ),
              ),
              ...layers,
            ]
          : layers;

      return withUndoSnapshot(state, {
        layers: nextLayers,
        reelSettings,
      });
    }),
  cycleSpinSpeed: () =>
    set((state) => {
      const currentIndex = SPIN_SPEED_SEQUENCE.indexOf(state.spinSpeed);
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % SPIN_SPEED_SEQUENCE.length;
      return {
        spinSpeed: SPIN_SPEED_SEQUENCE[nextIndex],
      };
    }),
  setVisibleReelSymbols: (symbols) =>
    set((state) => ({
      layers: setVisibleReelSymbolsForAspectRatio(
        state.layers,
        state.reelSettings,
        state.canvasAspectRatio,
        symbols,
      ),
    })),
  undo: () =>
    set((state) => {
      const previousSnapshot = state.pastSnapshots.at(-1);
      if (!previousSnapshot) {
        return state;
      }
      return {
        ...previousSnapshot,
        pastSnapshots: state.pastSnapshots.slice(0, -1),
      };
    }),
  getActiveModuleLayers: () => {
    const state = get();
    return state.layers.filter(
      (layer) =>
        layer.moduleId === state.activeModuleId &&
        layer.canvasAspectRatio === state.canvasAspectRatio,
    );
  },
  resetEditor: () =>
    set({
      ...initialState,
      moduleVisibility: { ...initialState.moduleVisibility },
      reelSettings: { ...initialState.reelSettings },
      spinSpeed: initialState.spinSpeed,
      glowEnabled: initialState.glowEnabled,
      buttonGlowDistance: initialState.buttonGlowDistance,
      hoverGlowDistance: initialState.hoverGlowDistance,
      layers: createInitialLayers(),
      pastSnapshots: [],
    }),
}));
