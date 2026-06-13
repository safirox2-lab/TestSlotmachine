import { create } from "zustand";
import type { LineValidationMode } from "../cascadeWins";
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
  ROUND_HISTORY_MODULE_ID,
  RULES_COMBINATIONS_MODULE_ID,
  RULES_WINS_MODULE_ID,
} from "../config/editorModules.config";
import type {
  EditorButtonOptionId,
  EditorCanvasAspectRatio,
  EditorDataOptionId,
  EditorLayer,
  EditorLayerImage,
  EditorModuleId,
  EditorReelMode,
  EditorReelStopMode,
  EditorRoundHistoryEntry,
  EditorSpinSpeed,
} from "../editor.types";
import type { LineTraceSettingKey, LineTraceSettings, WildLineRule } from "../lineWins";
import { normalizeSymbolWeights, randomWeightedSymbol } from "../symbolWeights";

type MoveDirection = "up" | "down";
type CanvasBackground = "black" | "transparent" | "white";
type LayerUpdate = Partial<Pick<EditorLayer, "color" | "size" | "visible" | "x" | "y">>;
type ScatterClaimMode = "auto" | "save";
type ScatterReadMode = "individual" | "traces";
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
  slotFrameEnabled: boolean;
  stopMode: EditorReelStopMode;
}

interface ScatterSettings {
  claimMode: ScatterClaimMode;
  enabled: boolean;
  readMode: ScatterReadMode;
  scatterCount: number;
  scatterSymbols: number[];
}

interface WildSettings {
  enabled: boolean;
  lineRule: WildLineRule;
  wildCount: number;
  wildSymbols: number[];
}

interface JackpotSettings {
  enabled: boolean;
  jackpotCount: number;
  jackpotSymbols: number[];
}

interface CardGroupSettings {
  groupCount: number;
  groups: number[][];
}

type CombinationPayouts = Record<number, Record<number, number>>;
type ScatterFreespins = Record<number, Record<number, number>>;
type ScatterFreespinIncrements = Record<number, number>;
type WildPayouts = Record<number, Record<number, number>>;
type JackpotPayouts = Record<number, Record<number, number>>;

const DEFAULT_SCATTER_FREESPINS: ScatterFreespins = {
  1: {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
  },
};
const DEFAULT_SCATTER_FREESPIN_INCREMENTS: ScatterFreespinIncrements = {
  1: 2,
};
const DEFAULT_EDITOR_BALANCE = 1000;
const EDITOR_BET_PRESETS = [10, 20, 50, 100, 250, 500, 1000] as const;

type EditorSnapshot = Pick<
  EditorStoreState,
  | "accentColor"
  | "canvasAspectRatio"
  | "canvasBackground"
  | "canvasZoom"
  | "buttonGlowDistance"
  | "dataColor"
  | "editorBalance"
  | "editorBet"
  | "editorFreeSpins"
  | "editorRound"
  | "roundHistory"
  | "selectedRoundHistoryRound"
  | "glowEnabled"
  | "glowColor"
  | "hoverGlowDistance"
  | "hoverColor"
  | "layers"
  | "lineTraceSettings"
  | "lineValidationMode"
  | "moduleVisibility"
  | "reelSettings"
  | "scatterSettings"
  | "scatterFreespins"
  | "scatterFreespinIncrements"
  | "combinationPayouts"
  | "wildPayouts"
  | "cardGroupSettings"
  | "jackpotSettings"
  | "jackpotPayouts"
  | "symbolWeights"
  | "selectedLayerId"
  | "textColor"
  | "wildSettings"
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
  slotFrameEnabled: true,
  stopMode: "left-to-right",
};
const DEFAULT_SYMBOL_WEIGHTS = Array.from({ length: DEFAULT_REEL_SETTINGS.cardCount }, () => 1);

const DEFAULT_SCATTER_SETTINGS: ScatterSettings = {
  claimMode: "auto",
  enabled: false,
  readMode: "individual",
  scatterCount: 1,
  scatterSymbols: [1],
};

const DEFAULT_WILD_SETTINGS: WildSettings = {
  enabled: false,
  lineRule: "all",
  wildCount: 1,
  wildSymbols: [1],
};

const DEFAULT_JACKPOT_SETTINGS: JackpotSettings = {
  enabled: false,
  jackpotCount: 1,
  jackpotSymbols: [1],
};

const DEFAULT_CARD_GROUP_SETTINGS: CardGroupSettings = {
  groupCount: 0,
  groups: [],
};

const DEFAULT_LINE_TRACE_SETTINGS: LineTraceSettings = {
  diagonal: true,
  firstReel: false,
  horizontal: true,
  vertical: false,
  zigzag: true,
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
  lineTraceSettings: LineTraceSettings;
  lineValidationMode: LineValidationMode;
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
  editorBalance: number;
  editorBet: number;
  editorFreeSpins: number;
  editorRound: number;
  roundHistory: EditorRoundHistoryEntry[];
  selectedRoundHistoryRound: number | null;
  cardGroupSettings: CardGroupSettings;
  combinationPayouts: CombinationPayouts;
  wildPayouts: WildPayouts;
  jackpotPayouts: JackpotPayouts;
  jackpotSettings: JackpotSettings;
  reelSettings: ReelSettings;
  scatterSettings: ScatterSettings;
  scatterFreespins: ScatterFreespins;
  scatterFreespinIncrements: ScatterFreespinIncrements;
  spinSpeed: EditorSpinSpeed;
  symbolWeights: number[];
  wildSettings: WildSettings;
  pastSnapshots: EditorSnapshot[];
  setActiveModule: (moduleId: EditorModuleId) => void;
  toggleModuleVisibility: (moduleId: EditorModuleId) => void;
  addEditorFreeSpins: (freeSpins: number) => void;
  addEditorWinnings: (winnings: number) => void;
  advanceEditorRound: () => void;
  decreaseEditorBet: () => void;
  increaseEditorBet: () => void;
  recordEditorRoundHistory: (entry: EditorRoundHistoryEntry) => void;
  setSelectedRoundHistory: (round: number | null) => void;
  tryDebitEditorBet: () => boolean;
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
  setLineTraceEnabled: (direction: LineTraceSettingKey, enabled: boolean) => void;
  setLineValidationMode: (mode: LineValidationMode) => void;
  setCanvasBackground: (background: CanvasBackground) => void;
  setCanvasAspectRatio: (aspectRatio: EditorCanvasAspectRatio) => void;
  setCanvasZoom: (zoom: number) => void;
  setCardGroupCount: (count: number) => void;
  setCardGroupSize: (groupIndex: number, size: number) => void;
  setCardGroupSymbol: (
    groupIndex: number,
    symbolIndexPosition: number,
    symbolIndex: number,
  ) => void;
  setScatterClaimMode: (mode: ScatterClaimMode) => void;
  setScatterEnabled: (enabled: boolean) => void;
  setScatterCount: (count: number) => void;
  setScatterReadMode: (mode: ScatterReadMode) => void;
  setScatterSymbol: (index: number, symbolIndex: number) => void;
  setWildEnabled: (enabled: boolean) => void;
  setWildCount: (count: number) => void;
  setWildLineRule: (rule: WildLineRule) => void;
  setWildSymbol: (index: number, symbolIndex: number) => void;
  setJackpotEnabled: (enabled: boolean) => void;
  setJackpotCount: (count: number) => void;
  setJackpotSymbol: (index: number, symbolIndex: number) => void;
  setSymbolWeight: (symbolIndex: number, weight: number) => void;
  setCombinationPayout: (symbolIndex: number, matchCount: number, payout: number) => void;
  setWildPayout: (symbolIndex: number, matchCount: number, payout: number) => void;
  setJackpotPayout: (symbolIndex: number, matchCount: number, payout: number) => void;
  setScatterFreespins: (symbolIndex: number, appearanceCount: number, freespins: number) => void;
  setScatterFreespinIncrement: (symbolIndex: number, increment: number) => void;
  setReelSlotFrameEnabled: (enabled: boolean) => void;
  setReelMode: (mode: EditorReelMode) => void;
  setReelStopMode: (mode: EditorReelStopMode) => void;
  setReelSetting: (key: ReelSettingKey, value: number) => void;
  setLayerSymbolImages: (layerId: string, images: EditorLayerImage[]) => void;
  cycleSpinSpeed: () => void;
  setVisibleReelSymbols: (symbols: number[]) => void;
  consumeEditorFreeSpin: () => boolean;
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
  symbolWeights: number[] = [],
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
        ? randomWeightedSymbol({
            cardCount: settings.cardCount,
            random: Math.random,
            weights: symbolWeights,
          })
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
    [RULES_WINS_MODULE_ID]: true,
    [ROUND_HISTORY_MODULE_ID]: true,
    [RULES_COMBINATIONS_MODULE_ID]: true,
  },
  layers: createInitialLayers(),
  lineTraceSettings: { ...DEFAULT_LINE_TRACE_SETTINGS },
  lineValidationMode: "classic" as LineValidationMode,
  selectedLayerId: "button-spin",
  accentColor: DEFAULT_EDITOR_ACCENT,
  glowColor: DEFAULT_EDITOR_GLOW_COLOR,
  glowEnabled: true,
  buttonGlowDistance: 10,
  hoverGlowDistance: 12,
  dataColor: DEFAULT_EDITOR_DATA_COLOR,
  textColor: DEFAULT_EDITOR_TEXT_COLOR,
  hoverColor: DEFAULT_EDITOR_HOVER_COLOR,
  editorBalance: DEFAULT_EDITOR_BALANCE,
  editorBet: EDITOR_BET_PRESETS[0],
  editorFreeSpins: 0,
  editorRound: 0,
  roundHistory: [] as EditorRoundHistoryEntry[],
  selectedRoundHistoryRound: null as number | null,
  cardGroupSettings: {
    ...DEFAULT_CARD_GROUP_SETTINGS,
    groups: DEFAULT_CARD_GROUP_SETTINGS.groups.map((group) => [...group]),
  },
  combinationPayouts: {} as CombinationPayouts,
  wildPayouts: {} as WildPayouts,
  jackpotPayouts: {} as JackpotPayouts,
  scatterFreespins: cloneScatterFreespins(DEFAULT_SCATTER_FREESPINS),
  scatterFreespinIncrements: cloneScatterFreespinIncrements(DEFAULT_SCATTER_FREESPIN_INCREMENTS),
  canvasBackground: "black" as CanvasBackground,
  canvasAspectRatio: "9:16" as EditorCanvasAspectRatio,
  canvasZoom: 0.44,
  reelSettings: { ...DEFAULT_REEL_SETTINGS },
  scatterSettings: {
    ...DEFAULT_SCATTER_SETTINGS,
    scatterSymbols: [...DEFAULT_SCATTER_SETTINGS.scatterSymbols],
  },
  spinSpeed: "normal" as EditorSpinSpeed,
  symbolWeights: [...DEFAULT_SYMBOL_WEIGHTS],
  wildSettings: {
    ...DEFAULT_WILD_SETTINGS,
    wildSymbols: [...DEFAULT_WILD_SETTINGS.wildSymbols],
  },
  jackpotSettings: {
    ...DEFAULT_JACKPOT_SETTINGS,
    jackpotSymbols: [...DEFAULT_JACKPOT_SETTINGS.jackpotSymbols],
  },
};

const SPIN_SPEED_SEQUENCE: EditorSpinSpeed[] = ["normal", "fast", "turbo"];

function clampZoom(zoom: number): number {
  return Math.min(2, Math.max(0.15, Number.isFinite(zoom) ? zoom : 1));
}

function clampGlowDistance(distance: number): number {
  return Math.min(160, Math.max(0, Math.round(Number.isFinite(distance) ? distance : 0)));
}

function cloneCombinationPayouts(payouts: CombinationPayouts): CombinationPayouts {
  return Object.fromEntries(
    Object.entries(payouts).map(([symbolIndex, matchPayouts]) => [
      symbolIndex,
      { ...matchPayouts },
    ]),
  );
}

function cloneScatterFreespins(freespins: ScatterFreespins): ScatterFreespins {
  return Object.fromEntries(
    Object.entries(freespins).map(([symbolIndex, appearanceFreespins]) => [
      symbolIndex,
      { ...appearanceFreespins },
    ]),
  );
}

function cloneScatterFreespinIncrements(
  increments: ScatterFreespinIncrements,
): ScatterFreespinIncrements {
  return { ...increments };
}

function baseEditorLayerId(layerId: string): string {
  return layerId.startsWith("landscape-") ? layerId.slice("landscape-".length) : layerId;
}

function updateFreeSpinsDataLayers(layers: EditorLayer[], freeSpins: number): EditorLayer[] {
  const textValue = String(Math.max(0, Math.round(Number.isFinite(freeSpins) ? freeSpins : 0)));
  return layers.map((layer) =>
    baseEditorLayerId(layer.id) === "data-freeSpins" ? { ...layer, textValue } : layer,
  );
}

function formatEditorMoney(amount: number): string {
  const safeAmount = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return `$${safeAmount.toLocaleString("en-US")}`;
}

function updateBalanceDataLayers(layers: EditorLayer[], balance: number): EditorLayer[] {
  const textValue = formatEditorMoney(balance);
  return layers.map((layer) =>
    baseEditorLayerId(layer.id) === "data-balance" ? { ...layer, textValue } : layer,
  );
}

function updateBetDataLayers(layers: EditorLayer[], bet: number): EditorLayer[] {
  const textValue = formatEditorMoney(bet);
  return layers.map((layer) =>
    baseEditorLayerId(layer.id) === "data-bet" ? { ...layer, textValue } : layer,
  );
}

function formatEditorRound(round: number): string {
  const safeRound = Math.max(1, Math.round(Number.isFinite(round) ? round : 1));
  return `#${String(safeRound).padStart(6, "0")}`;
}

function updateRoundDataLayers(layers: EditorLayer[], round: number): EditorLayer[] {
  const textValue = formatEditorRound(round);
  return layers.map((layer) =>
    baseEditorLayerId(layer.id) === "data-roundLabel" ? { ...layer, textValue } : layer,
  );
}

function clampPayout(payout: number): number {
  return Math.max(0, Number.isFinite(payout) ? Number(payout) : 0);
}

function clampFreespins(freespins: number): number {
  return Math.max(0, Math.round(Number.isFinite(freespins) ? freespins : 0));
}

function createSnapshot(state: EditorStoreState): EditorSnapshot {
  return {
    accentColor: state.accentColor,
    canvasAspectRatio: state.canvasAspectRatio,
    canvasBackground: state.canvasBackground,
    canvasZoom: state.canvasZoom,
    buttonGlowDistance: state.buttonGlowDistance,
    dataColor: state.dataColor,
    editorBalance: state.editorBalance,
    editorBet: state.editorBet,
    editorFreeSpins: state.editorFreeSpins,
    editorRound: state.editorRound,
    roundHistory: state.roundHistory.map((entry) => ({
      ...entry,
      scatterHits: entry.scatterHits.map((hit) => ({
        ...hit,
        cells: hit.cells.map((cell) => ({ ...cell })),
      })),
      symbols: [...entry.symbols],
      wins: entry.wins.map((win) => ({
        ...win,
        cells: win.cells.map((cell) => ({ ...cell })),
      })),
    })),
    selectedRoundHistoryRound: state.selectedRoundHistoryRound,
    glowEnabled: state.glowEnabled,
    glowColor: state.glowColor,
    hoverGlowDistance: state.hoverGlowDistance,
    hoverColor: state.hoverColor,
    cardGroupSettings: {
      ...state.cardGroupSettings,
      groups: state.cardGroupSettings.groups.map((group) => [...group]),
    },
    combinationPayouts: cloneCombinationPayouts(state.combinationPayouts),
    wildPayouts: cloneCombinationPayouts(state.wildPayouts),
    jackpotPayouts: cloneCombinationPayouts(state.jackpotPayouts),
    scatterFreespins: cloneScatterFreespins(state.scatterFreespins),
    scatterFreespinIncrements: cloneScatterFreespinIncrements(state.scatterFreespinIncrements),
    layers: state.layers.map((layer) => ({
      ...layer,
      symbolImages: layer.symbolImages?.map((image) => ({ ...image })),
    })),
    moduleVisibility: { ...state.moduleVisibility },
    lineTraceSettings: { ...state.lineTraceSettings },
    lineValidationMode: state.lineValidationMode,
    reelSettings: { ...state.reelSettings },
    scatterSettings: {
      ...state.scatterSettings,
      scatterSymbols: [...state.scatterSettings.scatterSymbols],
    },
    symbolWeights: [...state.symbolWeights],
    selectedLayerId: state.selectedLayerId,
    textColor: state.textColor,
    wildSettings: {
      ...state.wildSettings,
      wildSymbols: [...state.wildSettings.wildSymbols],
    },
    jackpotSettings: {
      ...state.jackpotSettings,
      jackpotSymbols: [...state.jackpotSettings.jackpotSymbols],
    },
  };
}

function resizeRuleSymbols(symbols: number[], count: number, cardCount: number): number[] {
  const safeCardCount = Math.max(1, cardCount);
  const nextCount = Math.min(
    safeCardCount,
    Math.max(1, Math.round(Number.isFinite(count) ? count : 1)),
  );

  return Array.from({ length: nextCount }, (_, index) =>
    Math.min(safeCardCount, Math.max(1, symbols[index] ?? index + 1)),
  );
}

function resizeCardGroups(groups: number[][], count: number, cardCount: number): number[][] {
  const safeCardCount = Math.max(1, cardCount);
  const safeCount = Math.min(
    safeCardCount,
    Math.max(0, Math.round(Number.isFinite(count) ? count : 0)),
  );

  return Array.from({ length: safeCount }, (_, groupIndex) => {
    const group = groups[groupIndex] ?? [];
    const groupSize = Math.min(
      safeCardCount,
      Math.max(1, Math.round(Number.isFinite(group.length) ? group.length : 3) || 3),
    );
    return Array.from({ length: groupSize }, (_, symbolIndexPosition) =>
      clampRuleSymbol(group[symbolIndexPosition] ?? symbolIndexPosition + 1, safeCardCount),
    ).filter((symbol, index, resizedGroup) => resizedGroup.indexOf(symbol) === index);
  });
}

function getSpecialRuleSymbols(
  state: Pick<EditorStoreState, "jackpotSettings" | "scatterSettings" | "wildSettings">,
): number[] {
  return [
    ...(state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : []),
    ...(state.wildSettings.enabled ? state.wildSettings.wildSymbols : []),
    ...(state.jackpotSettings.enabled ? state.jackpotSettings.jackpotSymbols : []),
  ];
}

function resolveCardGroups({
  cardCount,
  groups,
  reservedSymbols,
}: {
  cardCount: number;
  groups: number[][];
  reservedSymbols: number[];
}): number[][] {
  const safeCardCount = Math.max(1, cardCount);
  const assignedSymbols = new Set(
    reservedSymbols.map((symbol) => clampRuleSymbol(symbol, safeCardCount)),
  );

  return groups.map((group) => {
    const resolvedGroup: number[] = [];
    for (const symbol of group) {
      const resolvedSymbol = getAvailableRuleSymbol(
        safeCardCount,
        new Set([...assignedSymbols, ...resolvedGroup]),
        symbol,
      );
      resolvedGroup.push(resolvedSymbol);
      assignedSymbols.add(resolvedSymbol);
    }
    return resolvedGroup;
  });
}

function clampRuleSymbol(symbolIndex: number, cardCount: number): number {
  const safeCardCount = Math.max(1, cardCount);
  return Math.min(
    safeCardCount,
    Math.max(1, Math.round(Number.isFinite(symbolIndex) ? symbolIndex : 1)),
  );
}

function getAvailableRuleSymbol(
  cardCount: number,
  reservedSymbols: Set<number>,
  preferredSymbol?: number,
): number {
  const safeCardCount = Math.max(1, cardCount);
  if (preferredSymbol !== undefined) {
    const safePreferredSymbol = clampRuleSymbol(preferredSymbol, safeCardCount);
    if (!reservedSymbols.has(safePreferredSymbol)) {
      return safePreferredSymbol;
    }
  }

  for (let symbolIndex = 1; symbolIndex <= safeCardCount; symbolIndex += 1) {
    if (!reservedSymbols.has(symbolIndex)) {
      return symbolIndex;
    }
  }

  return clampRuleSymbol(preferredSymbol ?? 1, safeCardCount);
}

function resolveRuleSymbolConflicts(
  primarySymbols: number[],
  secondarySymbols: number[],
  cardCount: number,
  preferredReplacement?: number,
): number[] {
  const primarySymbolSet = new Set(
    primarySymbols.map((symbol) => clampRuleSymbol(symbol, cardCount)),
  );
  const assignedSecondarySymbols = new Set<number>();

  return secondarySymbols.map((symbol) => {
    const safeSymbol = clampRuleSymbol(symbol, cardCount);
    if (!primarySymbolSet.has(safeSymbol) && !assignedSecondarySymbols.has(safeSymbol)) {
      assignedSecondarySymbols.add(safeSymbol);
      return safeSymbol;
    }

    const replacement = getAvailableRuleSymbol(
      cardCount,
      new Set([...primarySymbolSet, ...assignedSecondarySymbols]),
      preferredReplacement,
    );
    assignedSecondarySymbols.add(replacement);
    return replacement;
  });
}

function resolveJackpotSettings(
  jackpotSettings: JackpotSettings,
  reservedSymbols: number[],
  cardCount: number,
): JackpotSettings {
  const maxJackpotCount = Math.max(1, cardCount - new Set(reservedSymbols).size);
  const jackpotSymbols = resizeRuleSymbols(
    jackpotSettings.jackpotSymbols,
    Math.min(jackpotSettings.jackpotCount, maxJackpotCount),
    cardCount,
  );

  return {
    ...jackpotSettings,
    jackpotCount: jackpotSymbols.length,
    jackpotSymbols: resolveRuleSymbolConflicts(reservedSymbols, jackpotSymbols, cardCount),
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
  symbolWeights: number[] = [],
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
          ? randomWeightedSymbol({
              cardCount: settings.cardCount,
              random: Math.random,
              weights: symbolWeights,
            })
          : sequenceIndex,
    };
  });
}

function resizeReelLayersForAspectRatio(
  layers: EditorLayer[],
  settings: ReelSettings,
  aspectRatio: EditorCanvasAspectRatio,
  symbolWeights: number[] = [],
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
        ? randomWeightedSymbol({
            cardCount: settings.cardCount,
            random: Math.random,
            weights: symbolWeights,
          })
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
  addEditorFreeSpins: (freeSpins) =>
    set((state) => {
      const nextFreeSpins =
        state.editorFreeSpins + Math.max(0, Math.round(Number.isFinite(freeSpins) ? freeSpins : 0));
      return {
        editorFreeSpins: nextFreeSpins,
        layers: updateFreeSpinsDataLayers(state.layers, nextFreeSpins),
      };
    }),
  addEditorWinnings: (winnings) =>
    set((state) => {
      const safeWinnings = Math.max(0, Math.round(Number.isFinite(winnings) ? winnings : 0));
      if (safeWinnings <= 0) {
        return state;
      }
      const nextBalance = state.editorBalance + safeWinnings;
      return {
        editorBalance: nextBalance,
        layers: updateBalanceDataLayers(state.layers, nextBalance),
      };
    }),
  advanceEditorRound: () =>
    set((state) => {
      const nextRound = state.editorRound + 1;
      return {
        editorRound: nextRound,
        layers: updateRoundDataLayers(state.layers, nextRound),
      };
    }),
  decreaseEditorBet: () =>
    set((state) => {
      const currentIndex = (EDITOR_BET_PRESETS as readonly number[]).indexOf(state.editorBet);
      const nextIndex = Math.max(0, currentIndex === -1 ? 0 : currentIndex - 1);
      const nextBet = EDITOR_BET_PRESETS[nextIndex] ?? EDITOR_BET_PRESETS[0];
      return {
        editorBet: nextBet,
        layers: updateBetDataLayers(state.layers, nextBet),
      };
    }),
  increaseEditorBet: () =>
    set((state) => {
      const currentIndex = (EDITOR_BET_PRESETS as readonly number[]).indexOf(state.editorBet);
      const nextIndex = Math.min(
        EDITOR_BET_PRESETS.length - 1,
        currentIndex === -1 ? 0 : currentIndex + 1,
      );
      const nextBet = EDITOR_BET_PRESETS[nextIndex] ?? EDITOR_BET_PRESETS[0];
      return {
        editorBet: nextBet,
        layers: updateBetDataLayers(state.layers, nextBet),
      };
    }),
  recordEditorRoundHistory: (entry) =>
    set((state) => {
      const nextEntry = {
        ...entry,
        scatterHits: entry.scatterHits.map((hit) => ({
          ...hit,
          cells: hit.cells.map((cell) => ({ ...cell })),
        })),
        symbols: [...entry.symbols],
        wins: entry.wins.map((win) => ({
          ...win,
          cells: win.cells.map((cell) => ({ ...cell })),
        })),
      };
      const nextHistory = [
        nextEntry,
        ...state.roundHistory.filter((historyEntry) => historyEntry.round !== nextEntry.round),
      ].slice(0, 100);

      return {
        roundHistory: nextHistory,
        selectedRoundHistoryRound: nextEntry.round,
      };
    }),
  setSelectedRoundHistory: (round) =>
    set((state) => ({
      selectedRoundHistoryRound:
        round === null || state.roundHistory.some((entry) => entry.round === round) ? round : null,
    })),
  tryDebitEditorBet: () => {
    const state = get();
    if (state.editorBalance < state.editorBet) {
      return false;
    }
    const nextBalance = state.editorBalance - state.editorBet;
    set({
      editorBalance: nextBalance,
      layers: updateBalanceDataLayers(state.layers, nextBalance),
    });
    return true;
  },
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
      const newReelLayers = createReelLayers(
        state.reelSettings,
        state.canvasAspectRatio,
        state.symbolWeights,
      );
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
            state.symbolWeights,
          ),
          reelSettings,
          symbolWeights: normalizeSymbolWeights(state.symbolWeights, reelSettings.cardCount),
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
  setLineTraceEnabled: (direction, enabled) =>
    set((state) =>
      withUndoSnapshot(state, {
        lineTraceSettings: {
          ...state.lineTraceSettings,
          [direction]: enabled,
        },
      }),
    ),
  setLineValidationMode: (mode) =>
    set((state) => withUndoSnapshot(state, { lineValidationMode: mode })),
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
  setCardGroupCount: (count) =>
    set((state) => {
      const groups = resizeCardGroups(
        state.cardGroupSettings.groups,
        count,
        state.reelSettings.cardCount,
      ).map((group, index) =>
        state.cardGroupSettings.groups[index]
          ? group
          : resizeRuleSymbols([1, 2, 3], 3, state.reelSettings.cardCount),
      );
      const resolvedGroups = resolveCardGroups({
        cardCount: state.reelSettings.cardCount,
        groups,
        reservedSymbols: getSpecialRuleSymbols(state),
      });

      return withUndoSnapshot(state, {
        cardGroupSettings: {
          ...state.cardGroupSettings,
          groupCount: resolvedGroups.length,
          groups: resolvedGroups,
        },
      });
    }),
  setCardGroupSize: (groupIndex, size) =>
    set((state) => {
      if (groupIndex < 0 || groupIndex >= state.cardGroupSettings.groups.length) {
        return state;
      }

      const safeSize = Math.min(
        state.reelSettings.cardCount,
        Math.max(1, Math.round(Number.isFinite(size) ? size : 1)),
      );
      const groups = state.cardGroupSettings.groups.map((group, index) =>
        index === groupIndex
          ? resizeRuleSymbols(group, safeSize, state.reelSettings.cardCount)
          : [...group],
      );
      const resolvedGroups = resolveCardGroups({
        cardCount: state.reelSettings.cardCount,
        groups,
        reservedSymbols: getSpecialRuleSymbols(state),
      });

      return withUndoSnapshot(state, {
        cardGroupSettings: {
          ...state.cardGroupSettings,
          groups: resolvedGroups,
        },
      });
    }),
  setCardGroupSymbol: (groupIndex, symbolIndexPosition, symbolIndex) =>
    set((state) => {
      if (groupIndex < 0 || groupIndex >= state.cardGroupSettings.groups.length) {
        return state;
      }

      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const groups = state.cardGroupSettings.groups.map((group, index) =>
        index === groupIndex
          ? group.map((currentSymbol, position) =>
              position === symbolIndexPosition
                ? safeSymbolIndex
                : clampRuleSymbol(currentSymbol, state.reelSettings.cardCount),
            )
          : [...group],
      );
      const resolvedGroups = resolveCardGroups({
        cardCount: state.reelSettings.cardCount,
        groups,
        reservedSymbols: getSpecialRuleSymbols(state),
      });

      return withUndoSnapshot(state, {
        cardGroupSettings: {
          ...state.cardGroupSettings,
          groups: resolvedGroups,
        },
      });
    }),
  setScatterClaimMode: (mode) =>
    set((state) =>
      withUndoSnapshot(state, {
        scatterSettings: {
          ...state.scatterSettings,
          claimMode: mode,
        },
      }),
    ),
  setScatterEnabled: (enabled) =>
    set((state) => {
      const scatterSymbols = resizeRuleSymbols(
        state.scatterSettings.scatterSymbols,
        state.scatterSettings.scatterCount,
        state.reelSettings.cardCount,
      );
      return withUndoSnapshot(state, {
        scatterSettings: {
          ...state.scatterSettings,
          enabled,
          scatterSymbols: resolveRuleSymbolConflicts(
            state.wildSettings.enabled ? state.wildSettings.wildSymbols : [],
            scatterSymbols,
            state.reelSettings.cardCount,
          ),
        },
        jackpotSettings: state.jackpotSettings.enabled
          ? resolveJackpotSettings(
              state.jackpotSettings,
              [
                ...(enabled ? scatterSymbols : []),
                ...(state.wildSettings.enabled ? state.wildSettings.wildSymbols : []),
              ],
              state.reelSettings.cardCount,
            )
          : state.jackpotSettings,
      });
    }),
  setScatterCount: (count) =>
    set((state) => {
      const scatterSymbols = resizeRuleSymbols(
        state.scatterSettings.scatterSymbols,
        count,
        state.reelSettings.cardCount,
      );
      const nextScatterSymbols = resolveRuleSymbolConflicts(
        state.wildSettings.enabled ? state.wildSettings.wildSymbols : [],
        scatterSymbols,
        state.reelSettings.cardCount,
      );
      return withUndoSnapshot(state, {
        scatterSettings: {
          ...state.scatterSettings,
          scatterCount: nextScatterSymbols.length,
          scatterSymbols: nextScatterSymbols,
        },
        jackpotSettings: state.jackpotSettings.enabled
          ? resolveJackpotSettings(
              state.jackpotSettings,
              [
                ...nextScatterSymbols,
                ...(state.wildSettings.enabled ? state.wildSettings.wildSymbols : []),
              ],
              state.reelSettings.cardCount,
            )
          : state.jackpotSettings,
      });
    }),
  setScatterReadMode: (mode) =>
    set((state) =>
      withUndoSnapshot(state, {
        scatterSettings: {
          ...state.scatterSettings,
          readMode: mode,
        },
      }),
    ),
  setScatterSymbol: (index, symbolIndex) =>
    set((state) => {
      if (index < 0 || index >= state.scatterSettings.scatterSymbols.length) {
        return state;
      }
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const previousSymbolIndex = state.scatterSettings.scatterSymbols[index];
      const scatterSymbols = state.scatterSettings.scatterSymbols.map(
        (symbol, symbolIndexPosition) =>
          symbolIndexPosition === index
            ? safeSymbolIndex
            : clampRuleSymbol(symbol, state.reelSettings.cardCount),
      );
      const wildSymbols =
        state.wildSettings.enabled && state.wildSettings.wildSymbols.includes(safeSymbolIndex)
          ? resolveRuleSymbolConflicts(
              scatterSymbols,
              state.wildSettings.wildSymbols,
              state.reelSettings.cardCount,
              previousSymbolIndex,
            )
          : state.wildSettings.wildSymbols;

      return withUndoSnapshot(state, {
        scatterSettings: {
          ...state.scatterSettings,
          scatterSymbols,
        },
        jackpotSettings: state.jackpotSettings.enabled
          ? resolveJackpotSettings(
              state.jackpotSettings,
              [...scatterSymbols, ...(state.wildSettings.enabled ? wildSymbols : [])],
              state.reelSettings.cardCount,
            )
          : state.jackpotSettings,
        wildSettings: {
          ...state.wildSettings,
          wildSymbols,
        },
      });
    }),
  setWildEnabled: (enabled) =>
    set((state) => {
      const wildSymbols = resizeRuleSymbols(
        state.wildSettings.wildSymbols,
        state.wildSettings.wildCount,
        state.reelSettings.cardCount,
      );
      return withUndoSnapshot(state, {
        wildSettings: {
          ...state.wildSettings,
          enabled,
          wildSymbols: resolveRuleSymbolConflicts(
            state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : [],
            wildSymbols,
            state.reelSettings.cardCount,
          ),
        },
        jackpotSettings: state.jackpotSettings.enabled
          ? resolveJackpotSettings(
              state.jackpotSettings,
              [
                ...(state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : []),
                ...(enabled ? wildSymbols : []),
              ],
              state.reelSettings.cardCount,
            )
          : state.jackpotSettings,
      });
    }),
  setWildCount: (count) =>
    set((state) => {
      const wildSymbols = resizeRuleSymbols(
        state.wildSettings.wildSymbols,
        count,
        state.reelSettings.cardCount,
      );
      const nextWildSymbols = resolveRuleSymbolConflicts(
        state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : [],
        wildSymbols,
        state.reelSettings.cardCount,
      );
      return withUndoSnapshot(state, {
        wildSettings: {
          ...state.wildSettings,
          wildCount: nextWildSymbols.length,
          wildSymbols: nextWildSymbols,
        },
        jackpotSettings: state.jackpotSettings.enabled
          ? resolveJackpotSettings(
              state.jackpotSettings,
              [
                ...(state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : []),
                ...nextWildSymbols,
              ],
              state.reelSettings.cardCount,
            )
          : state.jackpotSettings,
      });
    }),
  setWildLineRule: (rule) =>
    set((state) =>
      withUndoSnapshot(state, {
        wildSettings: {
          ...state.wildSettings,
          lineRule: rule,
        },
      }),
    ),
  setWildSymbol: (index, symbolIndex) =>
    set((state) => {
      if (index < 0 || index >= state.wildSettings.wildSymbols.length) {
        return state;
      }
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const previousSymbolIndex = state.wildSettings.wildSymbols[index];
      const wildSymbols = state.wildSettings.wildSymbols.map((symbol, symbolIndexPosition) =>
        symbolIndexPosition === index
          ? safeSymbolIndex
          : clampRuleSymbol(symbol, state.reelSettings.cardCount),
      );
      const scatterSymbols =
        state.scatterSettings.enabled &&
        state.scatterSettings.scatterSymbols.includes(safeSymbolIndex)
          ? resolveRuleSymbolConflicts(
              wildSymbols,
              state.scatterSettings.scatterSymbols,
              state.reelSettings.cardCount,
              previousSymbolIndex,
            )
          : state.scatterSettings.scatterSymbols;

      return withUndoSnapshot(state, {
        scatterSettings: {
          ...state.scatterSettings,
          scatterSymbols,
        },
        jackpotSettings: state.jackpotSettings.enabled
          ? resolveJackpotSettings(
              state.jackpotSettings,
              [...(state.scatterSettings.enabled ? scatterSymbols : []), ...wildSymbols],
              state.reelSettings.cardCount,
            )
          : state.jackpotSettings,
        wildSettings: {
          ...state.wildSettings,
          wildSymbols,
        },
      });
    }),
  setJackpotEnabled: (enabled) =>
    set((state) => {
      const jackpotSymbols = resizeRuleSymbols(
        state.jackpotSettings.jackpotSymbols,
        state.jackpotSettings.jackpotCount,
        state.reelSettings.cardCount,
      );
      return withUndoSnapshot(state, {
        jackpotSettings: {
          ...state.jackpotSettings,
          enabled,
          jackpotSymbols: resolveRuleSymbolConflicts(
            [
              ...(state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : []),
              ...(state.wildSettings.enabled ? state.wildSettings.wildSymbols : []),
            ],
            jackpotSymbols,
            state.reelSettings.cardCount,
          ),
        },
      });
    }),
  setJackpotCount: (count) =>
    set((state) => {
      const jackpotSymbols = resizeRuleSymbols(
        state.jackpotSettings.jackpotSymbols,
        count,
        state.reelSettings.cardCount,
      );
      const nextJackpotSymbols = resolveRuleSymbolConflicts(
        [
          ...(state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : []),
          ...(state.wildSettings.enabled ? state.wildSettings.wildSymbols : []),
        ],
        jackpotSymbols,
        state.reelSettings.cardCount,
      );
      return withUndoSnapshot(state, {
        jackpotSettings: {
          ...state.jackpotSettings,
          jackpotCount: nextJackpotSymbols.length,
          jackpotSymbols: nextJackpotSymbols,
        },
      });
    }),
  setJackpotSymbol: (index, symbolIndex) =>
    set((state) => {
      if (index < 0 || index >= state.jackpotSettings.jackpotSymbols.length) {
        return state;
      }
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const previousSymbolIndex = state.jackpotSettings.jackpotSymbols[index];
      const jackpotSymbols = state.jackpotSettings.jackpotSymbols.map(
        (symbol, symbolIndexPosition) =>
          symbolIndexPosition === index
            ? safeSymbolIndex
            : clampRuleSymbol(symbol, state.reelSettings.cardCount),
      );

      return withUndoSnapshot(state, {
        jackpotSettings: {
          ...state.jackpotSettings,
          jackpotSymbols: resolveRuleSymbolConflicts(
            [
              ...(state.scatterSettings.enabled ? state.scatterSettings.scatterSymbols : []),
              ...(state.wildSettings.enabled ? state.wildSettings.wildSymbols : []),
            ],
            jackpotSymbols,
            state.reelSettings.cardCount,
            previousSymbolIndex,
          ),
        },
      });
    }),
  setReelSlotFrameEnabled: (enabled) =>
    set((state) =>
      withUndoSnapshot(state, {
        reelSettings: {
          ...state.reelSettings,
          slotFrameEnabled: enabled,
        },
      }),
    ),
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
      const resizedScatterSymbols = resizeRuleSymbols(
        state.scatterSettings.scatterSymbols,
        state.scatterSettings.scatterCount,
        reelSettings.cardCount,
      );
      const cardGroupSettings =
        key === "cardCount"
          ? {
              ...state.cardGroupSettings,
              groups: resizeCardGroups(
                state.cardGroupSettings.groups,
                state.cardGroupSettings.groupCount,
                reelSettings.cardCount,
              ),
            }
          : state.cardGroupSettings;
      const resizedWildSymbols = resizeRuleSymbols(
        state.wildSettings.wildSymbols,
        state.wildSettings.wildCount,
        reelSettings.cardCount,
      );
      const scatterSettings =
        key === "cardCount"
          ? {
              ...state.scatterSettings,
              scatterCount: resizedScatterSymbols.length,
              scatterSymbols: state.wildSettings.enabled
                ? resolveRuleSymbolConflicts(
                    resizedWildSymbols,
                    resizedScatterSymbols,
                    reelSettings.cardCount,
                  )
                : resizedScatterSymbols,
            }
          : state.scatterSettings;
      const wildSettings =
        key === "cardCount"
          ? {
              ...state.wildSettings,
              wildCount: resizedWildSymbols.length,
              wildSymbols: state.scatterSettings.enabled
                ? resolveRuleSymbolConflicts(
                    scatterSettings.scatterSymbols,
                    resizedWildSymbols,
                    reelSettings.cardCount,
                  )
                : resizedWildSymbols,
            }
          : state.wildSettings;
      const jackpotReservedSymbols = [
        ...(scatterSettings.enabled ? scatterSettings.scatterSymbols : []),
        ...(wildSettings.enabled ? wildSettings.wildSymbols : []),
      ];
      const maxJackpotCount = Math.max(
        1,
        reelSettings.cardCount - new Set(jackpotReservedSymbols).size,
      );
      const resizedAvailableJackpotSymbols = resizeRuleSymbols(
        state.jackpotSettings.jackpotSymbols,
        Math.min(state.jackpotSettings.jackpotCount, maxJackpotCount),
        reelSettings.cardCount,
      );
      const jackpotSettings =
        key === "cardCount"
          ? {
              ...state.jackpotSettings,
              jackpotCount: resizedAvailableJackpotSymbols.length,
              jackpotSymbols:
                state.scatterSettings.enabled || state.wildSettings.enabled
                  ? resolveRuleSymbolConflicts(
                      jackpotReservedSymbols,
                      resizedAvailableJackpotSymbols,
                      reelSettings.cardCount,
                    )
                  : resizedAvailableJackpotSymbols,
            }
          : state.jackpotSettings;
      const symbolWeights =
        key === "cardCount"
          ? normalizeSymbolWeights(state.symbolWeights, reelSettings.cardCount)
          : state.symbolWeights;
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
                ? createReelLayers(reelSettings, state.canvasAspectRatio, symbolWeights)
                : state.layers
              : key === "cardCount"
                ? resizeReelLayersForAspectRatio(
                    state.layers,
                    reelSettings,
                    state.canvasAspectRatio,
                    symbolWeights,
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
        cardGroupSettings: {
          ...cardGroupSettings,
          groupCount: cardGroupSettings.groups.length,
        },
        layers: nextLayers,
        reelSettings,
        scatterSettings,
        jackpotSettings,
        symbolWeights,
        wildSettings,
      });
    }),
  setLayerSymbolImages: (layerId, images) =>
    set((state) => {
      const layer = state.layers.find((candidate) => candidate.id === layerId);
      if (layer?.elementType !== "card") {
        return state;
      }

      return withUndoSnapshot(state, {
        layers: state.layers.map((candidate) =>
          candidate.id === layerId
            ? {
                ...candidate,
                symbolImages: images.map((image) => ({ ...image })),
              }
            : candidate,
        ),
        selectedLayerId: layerId,
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
  consumeEditorFreeSpin: () => {
    const state = get();
    if (state.editorFreeSpins <= 0) {
      return false;
    }
    const nextFreeSpins = state.editorFreeSpins - 1;
    set({
      editorFreeSpins: nextFreeSpins,
      layers: updateFreeSpinsDataLayers(state.layers, nextFreeSpins),
    });
    return true;
  },
  setSymbolWeight: (symbolIndex, weight) =>
    set((state) => {
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const normalizedWeights = normalizeSymbolWeights(
        state.symbolWeights,
        state.reelSettings.cardCount,
      );
      const nextWeight = Math.max(0, Number.isFinite(weight) ? Number(weight) : 0);

      return withUndoSnapshot(state, {
        symbolWeights: normalizedWeights.map((currentWeight, index) =>
          index === safeSymbolIndex - 1 ? nextWeight : currentWeight,
        ),
      });
    }),
  setCombinationPayout: (symbolIndex, matchCount, payout) =>
    set((state) => {
      const safeSymbolIndex =
        symbolIndex < 0
          ? Math.round(symbolIndex)
          : clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const maxMatchCount = Math.max(3, state.reelSettings.columns, state.reelSettings.rows);
      const safeMatchCount = Math.min(
        maxMatchCount,
        Math.max(3, Math.round(Number.isFinite(matchCount) ? matchCount : 3)),
      );

      return withUndoSnapshot(state, {
        combinationPayouts: {
          ...state.combinationPayouts,
          [safeSymbolIndex]: {
            ...(state.combinationPayouts[safeSymbolIndex] ?? {}),
            [safeMatchCount]: clampPayout(payout),
          },
        },
      });
    }),
  setWildPayout: (symbolIndex, matchCount, payout) =>
    set((state) => {
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const maxMatchCount = Math.max(3, state.reelSettings.columns, state.reelSettings.rows);
      const safeMatchCount = Math.min(
        maxMatchCount,
        Math.max(3, Math.round(Number.isFinite(matchCount) ? matchCount : 3)),
      );

      return withUndoSnapshot(state, {
        wildPayouts: {
          ...state.wildPayouts,
          [safeSymbolIndex]: {
            ...(state.wildPayouts[safeSymbolIndex] ?? {}),
            [safeMatchCount]: clampPayout(payout),
          },
        },
      });
    }),
  setJackpotPayout: (symbolIndex, matchCount, payout) =>
    set((state) => {
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const maxMatchCount = Math.max(3, state.reelSettings.columns, state.reelSettings.rows);
      const safeMatchCount = Math.min(
        maxMatchCount,
        Math.max(3, Math.round(Number.isFinite(matchCount) ? matchCount : 3)),
      );

      return withUndoSnapshot(state, {
        jackpotPayouts: {
          ...state.jackpotPayouts,
          [safeSymbolIndex]: {
            ...(state.jackpotPayouts[safeSymbolIndex] ?? {}),
            [safeMatchCount]: clampPayout(payout),
          },
        },
      });
    }),
  setScatterFreespins: (symbolIndex, appearanceCount, freespins) =>
    set((state) => {
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);
      const maxAppearanceCount = Math.max(2, state.reelSettings.columns, state.reelSettings.rows);
      const safeAppearanceCount = Math.min(
        maxAppearanceCount,
        Math.max(2, Math.round(Number.isFinite(appearanceCount) ? appearanceCount : 2)),
      );

      return withUndoSnapshot(state, {
        scatterFreespins: {
          ...state.scatterFreespins,
          [safeSymbolIndex]: {
            ...(state.scatterFreespins[safeSymbolIndex] ?? {}),
            [safeAppearanceCount]: clampFreespins(freespins),
          },
        },
      });
    }),
  setScatterFreespinIncrement: (symbolIndex, increment) =>
    set((state) => {
      const safeSymbolIndex = clampRuleSymbol(symbolIndex, state.reelSettings.cardCount);

      return withUndoSnapshot(state, {
        scatterFreespinIncrements: {
          ...state.scatterFreespinIncrements,
          [safeSymbolIndex]: clampFreespins(increment),
        },
      });
    }),
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
      lineTraceSettings: { ...initialState.lineTraceSettings },
      lineValidationMode: initialState.lineValidationMode,
      cardGroupSettings: {
        ...initialState.cardGroupSettings,
        groups: initialState.cardGroupSettings.groups.map((group) => [...group]),
      },
      combinationPayouts: cloneCombinationPayouts(initialState.combinationPayouts),
      wildPayouts: cloneCombinationPayouts(initialState.wildPayouts),
      jackpotPayouts: cloneCombinationPayouts(initialState.jackpotPayouts),
      scatterFreespins: cloneScatterFreespins(initialState.scatterFreespins),
      scatterFreespinIncrements: cloneScatterFreespinIncrements(
        initialState.scatterFreespinIncrements,
      ),
      moduleVisibility: { ...initialState.moduleVisibility },
      reelSettings: { ...initialState.reelSettings },
      scatterSettings: {
        ...initialState.scatterSettings,
        scatterSymbols: [...initialState.scatterSettings.scatterSymbols],
      },
      spinSpeed: initialState.spinSpeed,
      symbolWeights: [...initialState.symbolWeights],
      wildSettings: {
        ...initialState.wildSettings,
        wildSymbols: [...initialState.wildSettings.wildSymbols],
      },
      jackpotSettings: {
        ...initialState.jackpotSettings,
        jackpotSymbols: [...initialState.jackpotSettings.jackpotSymbols],
      },
      glowEnabled: initialState.glowEnabled,
      buttonGlowDistance: initialState.buttonGlowDistance,
      hoverGlowDistance: initialState.hoverGlowDistance,
      layers: createInitialLayers(),
      pastSnapshots: [],
    }),
}));
