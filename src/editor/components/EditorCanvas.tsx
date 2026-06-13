import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveCascadeWins } from "../cascadeWins";
import {
  REELS_CARDS_MODULE_ID,
  ROUND_HISTORY_MODULE_ID,
  RULES_COMBINATIONS_MODULE_ID,
} from "../config/editorModules.config";
import type {
  EditorCanvasAspectRatio,
  EditorLayer,
  EditorScatterHit,
  EditorTraceSummary,
} from "../editor.types";
import { countLineTracePossibilities, detectLineWins } from "../lineWins";
import {
  advanceReelMotionWindow,
  createReelMotionWindow,
  createReelStopSchedule,
  getVisibleReelMotionSymbols,
  type ReelMotionWindow,
} from "../reelMotion";
import { useEditorStore } from "../store/editorStore";
import { getSymbolWeightPercentages } from "../symbolWeights";
import { EditorButtonPreview } from "./EditorButtonPreview";

const BUTTON_CLASS_BY_ID: Record<string, string> = {
  "button-betDecrease": "is-minus",
  "button-spin": "is-spin",
  "button-betIncrease": "is-plus",
  "button-info": "is-info",
  "button-autoplay": "is-autoplay",
  "button-bet": "is-bet",
  "button-menu": "is-menu",
  "button-arrow": "is-arrow",
};
const PLAY_LOCKED_BUTTON_IDS = new Set([
  "button-autoplay",
  "button-bet",
  "button-betDecrease",
  "button-betIncrease",
  "button-spin",
]);

const DATA_CLASS_BY_ID: Record<string, string> = {
  "data-user": "is-user",
  "data-roundLabel": "is-round-label",
  "data-freeSpins": "is-free-spins",
  "data-balance": "is-balance",
  "data-bet": "is-bet-data",
};

const REEL_CARD_SIZE_BY_ASPECT = {
  "9:16": { height: 185.1428571429, width: 154.2857142857 },
  "16:9": { height: 164.5714285714, width: 164.5714285714 },
} as const;

const REEL_SELECTION_PADDING = 5;
const REEL_PLAY_STEP_MS_BY_SPEED = {
  fast: 55,
  normal: 80,
  turbo: 35,
} as const;
const REEL_PLAY_STOP_STEP_SCALE_BY_SPEED = {
  fast: 0.68,
  normal: 1,
  turbo: 0.42,
} as const;
const REEL_PLAY_MIN_STOP_STEP = 24;
const REEL_PLAY_MAX_STOP_STEP = 64;
const CASCADE_DROP_MS = 720;
const AUTOPLAY_NEXT_SPIN_MS = 650;
const CASCADE_TRACE_PAUSE_MS = 850;
const CASCADE_SETTLE_PAUSE_MS = 360;
const STOP_ICON_SRC = "/raw/icon_stop.svg";
const DEFAULT_SCATTER_FREESPIN_INCREMENT = 2;
const DEFAULT_NORMAL_PAYOUT_MULTIPLIER = 1;
const DEFAULT_WILD_PAYOUT_MULTIPLIER = 2;
const DEFAULT_JACKPOT_PAYOUT_MULTIPLIER = 3;
const DEFAULT_CANVAS_PAN_BY_ASPECT: Record<EditorCanvasAspectRatio, { x: number; y: number }> = {
  "9:16": { x: 0, y: -520 },
  "16:9": { x: 0, y: -180 },
};

function toStablePixelValue(value: number): number {
  return Number(value.toFixed(4));
}

function formatEditorMoney(amount: number): string {
  const safeAmount = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return `$${safeAmount.toLocaleString("en-US")}`;
}

interface ReelPlayFrame {
  cardHeight: number;
  cardWidth: number;
  height: number;
  left: number;
  scale: number;
  stepX: number;
  stepY: number;
  top: number;
  visualCardHeight: number;
  visualCardWidth: number;
  width: number;
}

interface ReelPlayState {
  cascadeDropDistances?: number[];
  currentStep: number;
  frame: ReelPlayFrame;
  phase?: "cascade-drop" | "settled" | "spin";
  stopSchedule: number[];
  window: ReelMotionWindow;
}

function baseLayerId(layerId: string): string {
  return layerId.replace(/^landscape-/, "");
}

function reelGridPosition(layerId: string): { column: number; row: number } | null {
  const match = /^reel-card-(\d+)-(\d+)$/.exec(baseLayerId(layerId));
  if (!match) {
    return null;
  }
  return {
    column: Number(match[1]),
    row: Number(match[2]),
  };
}

function cardSymbolNumber(label: string): number | null {
  const match = /^Carta\s+(\d+)$/.exec(label);
  return match ? Number(match[1]) : null;
}

function getReelCardCatalogItems(
  layers: EditorLayer[],
  canvasAspectRatio: EditorCanvasAspectRatio,
  cardCount: number,
) {
  const itemsBySymbol = new Map<number, EditorLayer>();

  for (const layer of layers) {
    if (
      layer.canvasAspectRatio !== canvasAspectRatio ||
      layer.elementType !== "card" ||
      layer.moduleId !== REELS_CARDS_MODULE_ID
    ) {
      continue;
    }

    const symbolIndex = cardSymbolNumber(layer.label);
    if (symbolIndex === null || symbolIndex > cardCount || itemsBySymbol.has(symbolIndex)) {
      continue;
    }

    itemsBySymbol.set(symbolIndex, layer);
  }

  return Array.from(itemsBySymbol.entries())
    .map(([symbolIndex, layer]) => ({ layer, symbolIndex }))
    .sort((leftItem, rightItem) => leftItem.symbolIndex - rightItem.symbolIndex);
}

function getCombinationManifestChance({
  isScatterTraceBlocked,
  isWild,
  matchCount,
  symbolProbability,
  traceCount,
  wildProbability,
}: {
  isScatterTraceBlocked: boolean;
  isWild: boolean;
  matchCount: number;
  symbolProbability: number;
  traceCount: number;
  wildProbability: number;
}): number {
  if (traceCount <= 0 || isScatterTraceBlocked) {
    return 0;
  }

  const singleTraceChance =
    isWild || wildProbability <= 0
      ? symbolProbability ** matchCount
      : (symbolProbability + wildProbability) ** matchCount - wildProbability ** matchCount;
  const boundedSingleTraceChance = Math.min(1, Math.max(0, singleTraceChance));

  return (1 - (1 - boundedSingleTraceChance) ** traceCount) * 100;
}

function getCombinationCount(totalItems: number, selectedItems: number): number {
  if (selectedItems < 0 || selectedItems > totalItems) {
    return 0;
  }

  const safeSelectedItems = Math.min(selectedItems, totalItems - selectedItems);
  let result = 1;

  for (let index = 1; index <= safeSelectedItems; index += 1) {
    result = (result * (totalItems - safeSelectedItems + index)) / index;
  }

  return result;
}

function getAppearanceManifestChance({
  appearanceCount,
  slotCount,
  symbolProbability,
}: {
  appearanceCount: number;
  slotCount: number;
  symbolProbability: number;
}): number {
  if (appearanceCount > slotCount || slotCount <= 0 || symbolProbability <= 0) {
    return 0;
  }

  const boundedSymbolProbability = Math.min(1, Math.max(0, symbolProbability));
  let chance = 0;

  for (let count = appearanceCount; count <= slotCount; count += 1) {
    chance +=
      getCombinationCount(slotCount, count) *
      boundedSymbolProbability ** count *
      (1 - boundedSymbolProbability) ** (slotCount - count);
  }

  return chance * 100;
}

function getScatterFreespinAward({
  appearanceCount,
  freespinIncrement,
  freespins,
}: {
  appearanceCount: number;
  freespinIncrement: number;
  freespins: Record<number, number> | undefined;
}): number {
  if (appearanceCount < 2) {
    return 0;
  }
  if (appearanceCount <= 5) {
    return freespins?.[appearanceCount] ?? 0;
  }

  return (freespins?.[5] ?? 0) + freespinIncrement * (appearanceCount - 5);
}

interface EditorCanvasProps {
  onTraceSummaryChange?: (summary: EditorTraceSummary) => void;
  selectedTraceIndex?: number | null;
}

export function EditorCanvas({
  onTraceSummaryChange,
  selectedTraceIndex = null,
}: EditorCanvasProps = {}) {
  const [canvasPanByAspect, setCanvasPanByAspect] = useState(DEFAULT_CANVAS_PAN_BY_ASPECT);
  const [isAutoFreeSpinActive, setIsAutoFreeSpinActive] = useState(false);
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(false);
  const [isCascadeRunning, setIsCascadeRunning] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [reelPlay, setReelPlay] = useState<ReelPlayState | null>(null);
  const [rulesSheetTab, setRulesSheetTab] = useState<"catalog" | "groups">("catalog");
  const autoPlayActiveRef = useRef(false);
  const autoPlayTimerRef = useRef<number | null>(null);
  const skipNextReelSignatureClearRef = useRef(false);
  const reelCascadeTimerRef = useRef<number | null>(null);
  const reelPlayTimerRef = useRef<number | null>(null);
  const spinSpeedRef = useRef<keyof typeof REEL_PLAY_STEP_MS_BY_SPEED>("normal");
  const symbolWeightsRef = useRef<number[]>([]);
  const {
    activeModuleId,
    canvasAspectRatio,
    canvasBackground,
    canvasZoom,
    cardGroupSettings,
    combinationPayouts,
    jackpotPayouts,
    jackpotSettings,
    layers,
    lineTraceSettings,
    lineValidationMode,
    moduleVisibility,
    pushUndoSnapshot,
    reelSettings,
    recordEditorRoundHistory,
    roundHistory,
    scatterSettings,
    scatterFreespins,
    scatterFreespinIncrements,
    selectedLayerId,
    selectedRoundHistoryRound,
    spinSpeed,
    symbolWeights,
    wildPayouts,
    wildSettings,
    addEditorFreeSpins,
    addEditorWinnings,
    advanceEditorRound,
    consumeEditorFreeSpin,
    cycleSpinSpeed,
    setCanvasAspectRatio,
    setCanvasBackground,
    setCanvasZoom,
    setCombinationPayout,
    setJackpotPayout,
    setWildPayout,
    setScatterFreespins,
    setScatterFreespinIncrement,
    setSelectedLayer,
    setVisibleReelSymbols,
    decreaseEditorBet,
    increaseEditorBet,
    tryDebitEditorBet,
    updateLayerDraft,
  } = useEditorStore();
  const canvasPan = canvasPanByAspect[canvasAspectRatio];
  const zoomPercent = Math.round(canvasZoom * 100);
  const visibleLayers = useMemo(
    () =>
      layers.filter(
        (layer) =>
          layer.canvasAspectRatio === canvasAspectRatio &&
          layer.visible &&
          moduleVisibility[layer.moduleId] &&
          (layer.elementType !== "card" ||
            (() => {
              const position = reelGridPosition(layer.id);
              return (
                position !== null &&
                position.column <= reelSettings.columns &&
                position.row <= reelSettings.rows
              );
            })()),
      ),
    [canvasAspectRatio, layers, moduleVisibility, reelSettings.columns, reelSettings.rows],
  );
  const selectedReelGridFrame = useMemo(() => {
    if (!selectedLayerId || !reelGridPosition(selectedLayerId)) {
      return null;
    }

    const reelLayers = visibleLayers.filter(
      (layer) => layer.elementType === "card" && reelGridPosition(layer.id),
    );
    if (reelLayers.length === 0) {
      return null;
    }

    const cardSize = REEL_CARD_SIZE_BY_ASPECT[canvasAspectRatio];
    const left = Math.min(...reelLayers.map((layer) => layer.x));
    const top = Math.min(...reelLayers.map((layer) => layer.y));
    const right = Math.max(...reelLayers.map((layer) => layer.x + cardSize.width * layer.size));
    const bottom = Math.max(...reelLayers.map((layer) => layer.y + cardSize.height * layer.size));

    return {
      height: bottom - top + REEL_SELECTION_PADDING * 2,
      left: left - REEL_SELECTION_PADDING,
      top: top - REEL_SELECTION_PADDING,
      width: right - left + REEL_SELECTION_PADDING * 2,
    };
  }, [canvasAspectRatio, selectedLayerId, visibleLayers]);
  const visibleReelLayers = useMemo(
    () =>
      visibleLayers
        .filter((layer) => layer.elementType === "card" && reelGridPosition(layer.id))
        .sort((leftLayer, rightLayer) => {
          const leftPosition = reelGridPosition(leftLayer.id);
          const rightPosition = reelGridPosition(rightLayer.id);
          if (!leftPosition || !rightPosition) {
            return 0;
          }
          return leftPosition.row - rightPosition.row || leftPosition.column - rightPosition.column;
        }),
    [visibleLayers],
  );
  const symbolImagesByIndex = useMemo(() => {
    const imagesByIndex = new Map<number, (typeof layers)[number]["symbolImages"]>();
    for (const layer of layers) {
      if (
        layer.canvasAspectRatio !== canvasAspectRatio ||
        layer.elementType !== "card" ||
        !layer.symbolImages?.length
      ) {
        continue;
      }

      const symbolNumber = cardSymbolNumber(layer.label);
      if (symbolNumber !== null) {
        imagesByIndex.set(symbolNumber, layer.symbolImages);
      }
    }
    return imagesByIndex;
  }, [canvasAspectRatio, layers]);
  const reelCardCatalogItems = useMemo(
    () => getReelCardCatalogItems(layers, canvasAspectRatio, reelSettings.cardCount),
    [canvasAspectRatio, layers, reelSettings.cardCount],
  );
  const symbolWeightPercentages = useMemo(
    () => getSymbolWeightPercentages(symbolWeights, reelSettings.cardCount),
    [reelSettings.cardCount, symbolWeights],
  );
  const combinationMatchCounts = useMemo(() => {
    const maxMatchCount = Math.max(3, reelSettings.columns, reelSettings.rows);
    return Array.from({ length: maxMatchCount - 2 }, (_, index) => index + 3);
  }, [reelSettings.columns, reelSettings.rows]);
  const scatterAppearanceCounts = useMemo(() => {
    const maxAppearanceCount = Math.min(5, Math.max(2, reelSettings.columns, reelSettings.rows));
    return Array.from({ length: maxAppearanceCount - 1 }, (_, index) => index + 2);
  }, [reelSettings.columns, reelSettings.rows]);
  const reelSlotCount = reelSettings.columns * reelSettings.rows;
  const groupedSymbolSet = useMemo(
    () => new Set(cardGroupSettings.groups.flat()),
    [cardGroupSettings.groups],
  );
  const wildBridgeBlockedSymbols = useMemo(
    () => [
      ...(scatterSettings.enabled ? scatterSettings.scatterSymbols : []),
      ...(jackpotSettings.enabled ? jackpotSettings.jackpotSymbols : []),
    ],
    [
      jackpotSettings.enabled,
      jackpotSettings.jackpotSymbols,
      scatterSettings.enabled,
      scatterSettings.scatterSymbols,
    ],
  );
  const normalCombinationItems = useMemo(
    () =>
      reelCardCatalogItems.filter(
        ({ symbolIndex }) =>
          !(scatterSettings.enabled && scatterSettings.scatterSymbols.includes(symbolIndex)) &&
          !(wildSettings.enabled && wildSettings.wildSymbols.includes(symbolIndex)) &&
          !(jackpotSettings.enabled && jackpotSettings.jackpotSymbols.includes(symbolIndex)) &&
          !groupedSymbolSet.has(symbolIndex),
      ),
    [
      groupedSymbolSet,
      jackpotSettings.enabled,
      jackpotSettings.jackpotSymbols,
      reelCardCatalogItems,
      scatterSettings.enabled,
      scatterSettings.scatterSymbols,
      wildSettings.enabled,
      wildSettings.wildSymbols,
    ],
  );
  const wildCombinationItems = useMemo(
    () =>
      wildSettings.enabled
        ? reelCardCatalogItems.filter(({ symbolIndex }) =>
            wildSettings.wildSymbols.includes(symbolIndex),
          )
        : [],
    [reelCardCatalogItems, wildSettings.enabled, wildSettings.wildSymbols],
  );
  const scatterCombinationItems = useMemo(
    () =>
      scatterSettings.enabled
        ? reelCardCatalogItems.filter(({ symbolIndex }) =>
            scatterSettings.scatterSymbols.includes(symbolIndex),
          )
        : [],
    [reelCardCatalogItems, scatterSettings.enabled, scatterSettings.scatterSymbols],
  );
  const jackpotCombinationItems = useMemo(
    () =>
      jackpotSettings.enabled
        ? reelCardCatalogItems.filter(({ symbolIndex }) =>
            jackpotSettings.jackpotSymbols.includes(symbolIndex),
          )
        : [],
    [jackpotSettings.enabled, jackpotSettings.jackpotSymbols, reelCardCatalogItems],
  );
  const cardGroupCombinationItems = useMemo(
    () =>
      cardGroupSettings.groups.map((group, index) => ({
        group,
        label: `Grupo ${index + 1}`,
        payoutSymbol: -(index + 1),
      })),
    [cardGroupSettings.groups],
  );
  const linePayouts = useMemo(() => {
    const payouts = {
      ...combinationPayouts,
      ...wildPayouts,
      ...jackpotPayouts,
    };

    for (const { symbolIndex } of reelCardCatalogItems) {
      const defaultMultiplier =
        jackpotSettings.enabled && jackpotSettings.jackpotSymbols.includes(symbolIndex)
          ? DEFAULT_JACKPOT_PAYOUT_MULTIPLIER
          : wildSettings.enabled && wildSettings.wildSymbols.includes(symbolIndex)
            ? DEFAULT_WILD_PAYOUT_MULTIPLIER
            : DEFAULT_NORMAL_PAYOUT_MULTIPLIER;
      payouts[symbolIndex] = Object.fromEntries(
        combinationMatchCounts.map((matchCount) => [
          matchCount,
          payouts[symbolIndex]?.[matchCount] ?? defaultMultiplier,
        ]),
      );
    }

    for (const { payoutSymbol } of cardGroupCombinationItems) {
      payouts[payoutSymbol] = Object.fromEntries(
        combinationMatchCounts.map((matchCount) => [
          matchCount,
          payouts[payoutSymbol]?.[matchCount] ?? DEFAULT_NORMAL_PAYOUT_MULTIPLIER,
        ]),
      );
    }

    return payouts;
  }, [
    cardGroupCombinationItems,
    combinationMatchCounts,
    combinationPayouts,
    jackpotPayouts,
    jackpotSettings.enabled,
    jackpotSettings.jackpotSymbols,
    reelCardCatalogItems,
    wildPayouts,
    wildSettings.enabled,
    wildSettings.wildSymbols,
  ]);
  const winningCombinationCount = useMemo(() => {
    const validLineMatchCount = combinationMatchCounts.filter(
      (matchCount) =>
        countLineTracePossibilities({
          columns: reelSettings.columns,
          matchCount,
          rows: reelSettings.rows,
          settings: lineTraceSettings,
        }) > 0,
    ).length;
    const lineCombinationCount =
      (cardGroupCombinationItems.length + normalCombinationItems.length) * validLineMatchCount;
    const wildCombinationCount = wildCombinationItems.length * combinationMatchCounts.length;
    const scatterCombinationCount =
      scatterCombinationItems.length *
      (scatterAppearanceCounts.length + (scatterSettings.readMode === "individual" ? 1 : 0));
    const jackpotCombinationCount = jackpotCombinationItems.length * combinationMatchCounts.length;

    return (
      lineCombinationCount +
      wildCombinationCount +
      scatterCombinationCount +
      jackpotCombinationCount
    );
  }, [
    cardGroupCombinationItems.length,
    combinationMatchCounts,
    jackpotCombinationItems.length,
    lineTraceSettings,
    normalCombinationItems.length,
    reelSettings.columns,
    reelSettings.rows,
    scatterAppearanceCounts.length,
    scatterCombinationItems.length,
    scatterSettings.readMode,
    wildCombinationItems.length,
  ]);
  const reelStructureSignature = useMemo(
    () =>
      [
        reelSettings.cardCount,
        reelSettings.columns,
        reelSettings.paddingX,
        reelSettings.paddingY,
        reelSettings.rows,
        reelSettings.scale,
        reelSettings.slotFrameEnabled,
        ...visibleReelLayers.map(
          (layer) => `${layer.id}:${layer.x}:${layer.y}:${layer.size}:${layer.symbolIndex ?? ""}`,
        ),
      ].join("|"),
    [
      reelSettings.cardCount,
      reelSettings.columns,
      reelSettings.paddingX,
      reelSettings.paddingY,
      reelSettings.rows,
      reelSettings.scale,
      reelSettings.slotFrameEnabled,
      visibleReelLayers,
    ],
  );
  const visibleReelMotionSymbols = useMemo(() => {
    if (!reelPlay) {
      return [];
    }

    const finalReelPlayStep = Math.max(...reelPlay.stopSchedule);
    if (reelPlay.currentStep < finalReelPlayStep) {
      return [];
    }

    return getVisibleReelMotionSymbols(reelPlay.window, reelSettings.rows);
  }, [reelPlay, reelSettings.rows]);
  const reelLineWins = useMemo(() => {
    if (visibleReelMotionSymbols.length === 0) {
      return [];
    }

    return detectLineWins({
      columns: reelSettings.columns,
      linePayouts,
      rows: reelSettings.rows,
      scatterSymbols:
        scatterSettings.enabled && scatterSettings.readMode === "individual"
          ? scatterSettings.scatterSymbols
          : [],
      settings: lineTraceSettings,
      symbolGroups: cardGroupSettings.groups,
      symbols: visibleReelMotionSymbols,
      wildBridgeBlockedSymbols,
      wildLineRule: wildSettings.lineRule,
      wildSymbols: wildSettings.enabled ? wildSettings.wildSymbols : [],
    });
  }, [
    wildBridgeBlockedSymbols,
    linePayouts,
    lineTraceSettings,
    cardGroupSettings.groups,
    reelSettings.columns,
    reelSettings.rows,
    scatterSettings.enabled,
    scatterSettings.readMode,
    scatterSettings.scatterSymbols,
    visibleReelMotionSymbols,
    wildSettings.enabled,
    wildSettings.lineRule,
    wildSettings.wildSymbols,
  ]);
  const scatterHits = useMemo<EditorScatterHit[]>(() => {
    if (
      !scatterSettings.enabled ||
      scatterSettings.readMode !== "individual" ||
      visibleReelMotionSymbols.length === 0
    ) {
      return [];
    }

    return scatterSettings.scatterSymbols
      .map((symbol) => {
        const cells = visibleReelMotionSymbols.flatMap((visibleSymbol, index) =>
          visibleSymbol === symbol
            ? [
                {
                  column: (index % reelSettings.columns) + 1,
                  row: Math.floor(index / reelSettings.columns) + 1,
                },
              ]
            : [],
        );
        const freespinAward = getScatterFreespinAward({
          appearanceCount: cells.length,
          freespinIncrement:
            scatterFreespinIncrements[symbol] ?? DEFAULT_SCATTER_FREESPIN_INCREMENT,
          freespins: scatterFreespins[symbol],
        });

        return freespinAward > 0
          ? {
              cells,
              count: cells.length,
              symbol,
            }
          : null;
      })
      .filter((hit): hit is EditorScatterHit => hit !== null);
  }, [
    reelSettings.columns,
    scatterFreespinIncrements,
    scatterFreespins,
    scatterSettings.enabled,
    scatterSettings.readMode,
    scatterSettings.scatterSymbols,
    visibleReelMotionSymbols,
  ]);
  const getScatterFreespinAwardForSymbols = (symbols: number[]) => {
    if (
      !scatterSettings.enabled ||
      scatterSettings.readMode !== "individual" ||
      symbols.length === 0
    ) {
      return 0;
    }

    return scatterSettings.scatterSymbols.reduce((total, symbol) => {
      const appearanceCount = symbols.filter((visibleSymbol) => visibleSymbol === symbol).length;
      return (
        total +
        getScatterFreespinAward({
          appearanceCount,
          freespinIncrement:
            scatterFreespinIncrements[symbol] ?? DEFAULT_SCATTER_FREESPIN_INCREMENT,
          freespins: scatterFreespins[symbol],
        })
      );
    }, 0);
  };
  const getScatterHitsForSymbols = (symbols: number[]) => {
    if (
      !scatterSettings.enabled ||
      scatterSettings.readMode !== "individual" ||
      symbols.length === 0
    ) {
      return [];
    }

    return scatterSettings.scatterSymbols
      .map((symbol) => {
        const cells = symbols.flatMap((visibleSymbol, index) =>
          visibleSymbol === symbol
            ? [
                {
                  column: (index % reelSettings.columns) + 1,
                  row: Math.floor(index / reelSettings.columns) + 1,
                },
              ]
            : [],
        );
        const freespinAward = getScatterFreespinAward({
          appearanceCount: cells.length,
          freespinIncrement:
            scatterFreespinIncrements[symbol] ?? DEFAULT_SCATTER_FREESPIN_INCREMENT,
          freespins: scatterFreespins[symbol],
        });

        return freespinAward > 0
          ? {
              cells,
              count: cells.length,
              symbol,
            }
          : null;
      })
      .filter((hit): hit is EditorScatterHit => hit !== null);
  };

  useEffect(
    () => () => {
      if (reelPlayTimerRef.current !== null) {
        window.clearTimeout(reelPlayTimerRef.current);
      }
      if (reelCascadeTimerRef.current !== null) {
        window.clearTimeout(reelCascadeTimerRef.current);
      }
      if (autoPlayTimerRef.current !== null) {
        window.clearTimeout(autoPlayTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    spinSpeedRef.current = spinSpeed;
  }, [spinSpeed]);

  useEffect(() => {
    symbolWeightsRef.current = symbolWeights;
  }, [symbolWeights]);

  useEffect(() => {
    onTraceSummaryChange?.({
      columns: reelSettings.columns,
      scatterHits,
      symbols: visibleReelMotionSymbols,
      wins: reelLineWins,
    });
  }, [
    onTraceSummaryChange,
    reelLineWins,
    reelSettings.columns,
    scatterHits,
    visibleReelMotionSymbols,
  ]);

  useEffect(() => {
    void reelStructureSignature;
    if (skipNextReelSignatureClearRef.current) {
      skipNextReelSignatureClearRef.current = false;
      return;
    }

    if (reelPlayTimerRef.current !== null) {
      window.clearTimeout(reelPlayTimerRef.current);
      reelPlayTimerRef.current = null;
    }
    if (reelCascadeTimerRef.current !== null) {
      window.clearTimeout(reelCascadeTimerRef.current);
      reelCascadeTimerRef.current = null;
    }
    if (autoPlayTimerRef.current !== null) {
      window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    autoPlayActiveRef.current = false;
    setIsAutoPlayActive(false);
    setIsCascadeRunning(false);
    setReelPlay(null);
  }, [reelStructureSignature]);

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    setCanvasZoom(canvasZoom + direction);
  };

  const onCanvasPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    if ((event.target as HTMLElement).closest(".slot-editor__canvas-toolbar")) {
      return;
    }

    event.preventDefault();
    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: canvasPan.x,
      panY: canvasPan.y,
    };

    setIsPanning(true);

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      setCanvasPanByAspect((current) => ({
        ...current,
        [canvasAspectRatio]: {
          x: start.panX + moveEvent.clientX - start.pointerX,
          y: start.panY + moveEvent.clientY - start.pointerY,
        },
      }));
    };
    const onPointerUp = () => {
      setIsPanning(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onLayerPointerDown = (
    layerId: string,
    layerStart: { x: number; y: number },
    event: PointerEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedLayer(layerId);
    if (reelGridPosition(layerId) && reelPlay) {
      const finalReelPlayStep = Math.max(...reelPlay.stopSchedule);
      if (reelPlay.currentStep >= finalReelPlayStep) {
        setReelPlay(null);
      }
    }

    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      layerX: layerStart.x,
      layerY: layerStart.y,
    };
    let hasRecordedDragUndo = false;

    const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (!hasRecordedDragUndo) {
        pushUndoSnapshot();
        hasRecordedDragUndo = true;
      }
      updateLayerDraft(layerId, {
        x: start.layerX + (moveEvent.clientX - start.pointerX) / canvasZoom,
        y: start.layerY + (moveEvent.clientY - start.pointerY) / canvasZoom,
      });
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const createReelPlayFrame = (): ReelPlayFrame | null => {
    if (visibleReelLayers.length === 0) {
      return null;
    }

    const cardSize = REEL_CARD_SIZE_BY_ASPECT[canvasAspectRatio];
    const scale = visibleReelLayers[0]?.size ?? reelSettings.scale;
    const left = Math.min(...visibleReelLayers.map((layer) => layer.x));
    const top = Math.min(...visibleReelLayers.map((layer) => layer.y));
    const visualCardHeight = toStablePixelValue(cardSize.height * scale);
    const visualCardWidth = toStablePixelValue(cardSize.width * scale);
    const stepX = visualCardWidth + reelSettings.paddingX;
    const stepY = visualCardHeight + reelSettings.paddingY;

    return {
      cardHeight: cardSize.height,
      cardWidth: cardSize.width,
      height:
        reelSettings.rows * visualCardHeight +
        Math.max(0, reelSettings.rows - 1) * reelSettings.paddingY,
      left,
      scale,
      stepX,
      stepY,
      top,
      visualCardHeight,
      visualCardWidth,
      width:
        reelSettings.columns * visualCardWidth +
        Math.max(0, reelSettings.columns - 1) * reelSettings.paddingX,
    };
  };

  const stopAutoPlay = () => {
    autoPlayActiveRef.current = false;
    setIsAutoPlayActive(false);
    if (autoPlayTimerRef.current !== null) {
      window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setIsAutoFreeSpinActive(false);
  };

  const startAutoPlay = () => {
    if (reelPlayTimerRef.current !== null || isCascadeRunning) {
      return;
    }

    autoPlayActiveRef.current = true;
    setIsAutoPlayActive(true);
    startReelPlay();
  };

  const startReelPlay = ({
    initialVisibleSymbols,
    isFreeSpin = false,
  }: {
    initialVisibleSymbols?: number[];
    isFreeSpin?: boolean;
  } = {}) => {
    if (visibleReelLayers.length === 0 || reelSettings.cardCount <= 0) {
      return;
    }
    if (reelPlayTimerRef.current !== null) {
      window.clearTimeout(reelPlayTimerRef.current);
    }
    if (reelCascadeTimerRef.current !== null) {
      window.clearTimeout(reelCascadeTimerRef.current);
      reelCascadeTimerRef.current = null;
    }
    if (autoPlayTimerRef.current !== null) {
      window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setIsCascadeRunning(false);

    const frame = createReelPlayFrame();
    if (!frame) {
      return;
    }
    const balanceBeforeSpin = useEditorStore.getState().editorBalance;
    const payoutBaseBet = useEditorStore.getState().editorBet;
    const wager = isFreeSpin ? 0 : payoutBaseBet;
    if (!isFreeSpin && !tryDebitEditorBet()) {
      stopAutoPlay();
      return;
    }
    advanceEditorRound();

    let stepCount = 0;
    const normalStopSchedule = createReelStopSchedule({
      columns: reelSettings.columns,
      maxStep: REEL_PLAY_MAX_STOP_STEP,
      minStep: REEL_PLAY_MIN_STOP_STEP,
      mode: reelSettings.stopMode,
    });
    let stopSchedule = normalStopSchedule.map((step) =>
      Math.max(1, Math.round(step * REEL_PLAY_STOP_STEP_SCALE_BY_SPEED[spinSpeedRef.current])),
    );
    let finalStopStep = Math.max(...stopSchedule);
    let motionWindow = createReelMotionWindow({
      columns: reelSettings.columns,
      rows: reelSettings.rows,
      symbolCount: reelSettings.cardCount,
      symbolWeights: symbolWeightsRef.current,
      visibleSymbols:
        initialVisibleSymbols ?? visibleReelLayers.map((layer) => layer.symbolIndex ?? 1),
    });

    const scheduleNextAutoPlay = (nextVisibleSymbols: number[]) => {
      const hasAutoFreeSpins = () =>
        scatterSettings.claimMode === "auto" && useEditorStore.getState().editorFreeSpins > 0;

      if (!autoPlayActiveRef.current && !hasAutoFreeSpins()) {
        setIsAutoFreeSpinActive(false);
        setIsAutoPlayActive(false);
        return;
      }

      setIsAutoFreeSpinActive(hasAutoFreeSpins());
      setIsAutoPlayActive(autoPlayActiveRef.current);
      autoPlayTimerRef.current = window.setTimeout(() => {
        autoPlayTimerRef.current = null;
        if (!autoPlayActiveRef.current && !hasAutoFreeSpins()) {
          setIsAutoFreeSpinActive(false);
          setIsAutoPlayActive(false);
          return;
        }
        const shouldUseFreeSpin = hasAutoFreeSpins();
        if (shouldUseFreeSpin) {
          setIsAutoFreeSpinActive(true);
          consumeEditorFreeSpin();
        } else {
          setIsAutoFreeSpinActive(false);
        }
        startReelPlay({ initialVisibleSymbols: nextVisibleSymbols, isFreeSpin: shouldUseFreeSpin });
      }, AUTOPLAY_NEXT_SPIN_MS);
    };

    setReelPlay({
      currentStep: stepCount,
      frame,
      phase: "spin",
      stopSchedule,
      window: motionWindow,
    });

    const playNextReelStep = () => {
      const currentSpeed = spinSpeedRef.current;
      stopSchedule = normalStopSchedule.map((step) =>
        Math.max(1, Math.round(step * REEL_PLAY_STOP_STEP_SCALE_BY_SPEED[currentSpeed])),
      );
      finalStopStep = Math.max(...stopSchedule);
      motionWindow = advanceReelMotionWindow(motionWindow, {
        currentStep: stepCount,
        symbolCount: reelSettings.cardCount,
        symbolWeights: symbolWeightsRef.current,
        stopSchedule,
      });
      stepCount += 1;

      if (stepCount >= finalStopStep) {
        window.clearTimeout(reelPlayTimerRef.current ?? undefined);
        reelPlayTimerRef.current = null;
        skipNextReelSignatureClearRef.current = true;
        const visibleSymbols = getVisibleReelMotionSymbols(motionWindow, reelSettings.rows);
        const cascadeResult = resolveCascadeWins({
          columns: reelSettings.columns,
          linePayouts,
          rows: reelSettings.rows,
          scatterSymbols:
            scatterSettings.enabled && scatterSettings.readMode === "individual"
              ? scatterSettings.scatterSymbols
              : [],
          settings: lineTraceSettings,
          symbolGroups: cardGroupSettings.groups,
          symbolCount: reelSettings.cardCount,
          symbolWeights: symbolWeightsRef.current,
          symbols: visibleSymbols,
          validationMode: lineValidationMode,
          wildBridgeBlockedSymbols,
          wildLineRule: wildSettings.lineRule,
          wildSymbols: wildSettings.enabled ? wildSettings.wildSymbols : [],
        });
        setVisibleReelSymbols(
          lineValidationMode === "cascade" ? cascadeResult.finalSymbols : visibleSymbols,
        );
        const scatterFreespinAward = getScatterFreespinAwardForSymbols(visibleSymbols);
        if (scatterFreespinAward > 0) {
          addEditorFreeSpins(scatterFreespinAward);
        }
        const recordRoundHistoryForSymbols = (historySymbols: number[]) => {
          const historyWins = detectLineWins({
            columns: reelSettings.columns,
            linePayouts,
            rows: reelSettings.rows,
            scatterSymbols:
              scatterSettings.enabled && scatterSettings.readMode === "individual"
                ? scatterSettings.scatterSymbols
                : [],
            settings: lineTraceSettings,
            symbolGroups: cardGroupSettings.groups,
            symbols: historySymbols,
            wildBridgeBlockedSymbols,
            wildLineRule: wildSettings.lineRule,
            wildSymbols: wildSettings.enabled ? wildSettings.wildSymbols : [],
          });
          const payout = historyWins.reduce(
            (total, win) =>
              total + payoutBaseBet * (linePayouts[win.symbol]?.[win.cells.length] ?? 1),
            0,
          );
          if (payout > 0) {
            addEditorWinnings(payout);
          }
          const balanceAfter = useEditorStore.getState().editorBalance;
          recordEditorRoundHistory({
            balanceAfter,
            balanceBefore: balanceBeforeSpin,
            columns: reelSettings.columns,
            netBalanceChange: balanceAfter - balanceBeforeSpin,
            payout,
            round: useEditorStore.getState().editorRound,
            rows: reelSettings.rows,
            scatterHits: getScatterHitsForSymbols(historySymbols),
            spinType: isFreeSpin ? "free-spin" : "paid",
            symbols: historySymbols,
            wager,
            wins: historyWins,
          });
        };
        setReelPlay({
          currentStep: finalStopStep,
          frame,
          phase: "settled",
          stopSchedule,
          window: motionWindow,
        });
        if (lineValidationMode === "cascade" && cascadeResult.steps.length > 0) {
          setIsCascadeRunning(true);
          let cascadeStepIndex = 0;
          const playNextCascadeStep = () => {
            const cascadeStep = cascadeResult.steps[cascadeStepIndex];
            if (!cascadeStep) {
              reelCascadeTimerRef.current = null;
              setIsCascadeRunning(false);
              recordRoundHistoryForSymbols(cascadeResult.finalSymbols);
              scheduleNextAutoPlay(cascadeResult.finalSymbols);
              return;
            }

            const cascadeWindow = createReelMotionWindow({
              columns: reelSettings.columns,
              rows: reelSettings.rows,
              symbolCount: reelSettings.cardCount,
              symbolWeights: symbolWeightsRef.current,
              visibleSymbols: cascadeStep.symbols,
            });
            skipNextReelSignatureClearRef.current = true;
            setVisibleReelSymbols(cascadeStep.symbols);
            setReelPlay({
              cascadeDropDistances: cascadeStep.dropDistances,
              currentStep: finalStopStep,
              frame,
              phase: "cascade-drop",
              stopSchedule,
              window: cascadeWindow,
            });
            reelCascadeTimerRef.current = window.setTimeout(() => {
              setReelPlay({
                currentStep: finalStopStep,
                frame,
                phase: "settled",
                stopSchedule,
                window: cascadeWindow,
              });
              cascadeStepIndex += 1;
              reelCascadeTimerRef.current = window.setTimeout(
                playNextCascadeStep,
                CASCADE_SETTLE_PAUSE_MS,
              );
            }, CASCADE_DROP_MS);
          };

          reelCascadeTimerRef.current = window.setTimeout(
            playNextCascadeStep,
            CASCADE_TRACE_PAUSE_MS,
          );
        } else {
          recordRoundHistoryForSymbols(visibleSymbols);
          scheduleNextAutoPlay(
            lineValidationMode === "cascade" ? cascadeResult.finalSymbols : visibleSymbols,
          );
        }
        return;
      }

      setReelPlay({
        currentStep: stepCount,
        frame,
        phase: "spin",
        stopSchedule,
        window: motionWindow,
      });
      reelPlayTimerRef.current = window.setTimeout(
        playNextReelStep,
        REEL_PLAY_STEP_MS_BY_SPEED[spinSpeedRef.current],
      );
    };

    reelPlayTimerRef.current = window.setTimeout(
      playNextReelStep,
      REEL_PLAY_STEP_MS_BY_SPEED[spinSpeedRef.current],
    );
  };

  const renderReelMotionWindow = () => {
    if (!reelPlay) {
      return null;
    }

    return (
      <div
        className="slot-editor__reel-motion-window"
        data-reel-motion-window="true"
        style={
          {
            "--slot-reel-motion-duration": `${REEL_PLAY_STEP_MS_BY_SPEED[spinSpeed]}ms`,
            height: `${reelPlay.frame.height}px`,
            left: `${reelPlay.frame.left}px`,
            top: `${reelPlay.frame.top}px`,
            width: `${reelPlay.frame.width}px`,
          } as CSSProperties
        }
      >
        {reelPlay.window.map((columnSymbols, columnIndex) => (
          <div
            className="slot-editor__reel-motion-column"
            data-reel-motion-column={columnIndex + 1}
            // biome-ignore lint/suspicious/noArrayIndexKey: reel motion columns are fixed positional tracks in a transient window.
            key={`reel-motion-column-${columnIndex}`}
            style={{
              height: `${reelPlay.frame.height}px`,
              left: `${columnIndex * reelPlay.frame.stepX}px`,
              overflow: "hidden",
              top: "0px",
              width: `${reelPlay.frame.visualCardWidth}px`,
            }}
          >
            {columnSymbols.map((symbolIndex, rowIndex) => {
              const isColumnStopped =
                reelPlay.currentStep >= (reelPlay.stopSchedule[columnIndex] ?? 0);
              const visibleRowIndex = rowIndex - 1;
              const cascadeDropDistance =
                visibleRowIndex >= 0 && visibleRowIndex < reelSettings.rows
                  ? (reelPlay.cascadeDropDistances?.[
                      visibleRowIndex * reelSettings.columns + columnIndex
                    ] ?? 0)
                  : 0;
              const symbolImage = symbolImagesByIndex.get(symbolIndex)?.[0];
              return (
                <div
                  className={[
                    "slot-editor__reel-card",
                    "slot-editor__reel-motion-symbol",
                    reelPlay.phase === "cascade-drop" ? "is-cascade-dropping" : "",
                    reelSettings.slotFrameEnabled ? "" : "has-no-frame",
                    symbolImage ? "has-symbol-image" : "",
                    isColumnStopped && reelPlay.phase !== "cascade-drop" ? "is-stopped" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-reel-motion-symbol={`${columnIndex + 1}-${rowIndex}`}
                  // biome-ignore lint/suspicious/noArrayIndexKey: motion cells are fixed column/row positions in a transient reel window.
                  key={`${columnIndex}-${rowIndex}-${symbolIndex}`}
                  style={
                    {
                      "--slot-cascade-drop-duration": `${CASCADE_DROP_MS}ms`,
                      "--slot-cascade-drop-offset": `${cascadeDropDistance * reelPlay.frame.stepY}px`,
                      "--slot-layer-color": "#263142",
                      "--slot-reel-motion-step": `${reelPlay.frame.stepY}px`,
                      height: `${reelPlay.frame.visualCardHeight}px`,
                      left: "0px",
                      top: `${(rowIndex - 1) * reelPlay.frame.stepY}px`,
                      width: `${reelPlay.frame.visualCardWidth}px`,
                    } as CSSProperties
                  }
                >
                  {symbolImage ? (
                    <img
                      className="slot-editor__reel-card-image"
                      data-reel-motion-symbol-image={symbolIndex}
                      src={symbolImage.src}
                      alt=""
                    />
                  ) : (
                    <span>{symbolIndex}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderLineWinTraces = () => {
    if (!reelPlay || reelLineWins.length === 0) {
      return null;
    }
    const visibleLineWins =
      selectedTraceIndex === null
        ? reelLineWins
        : reelLineWins.slice(selectedTraceIndex, selectedTraceIndex + 1);

    return (
      <svg
        className="slot-editor__win-traces"
        aria-hidden="true"
        data-selected-trace={selectedTraceIndex === null ? "false" : "true"}
        data-win-traces="true"
        style={{
          height: `${reelPlay.frame.height}px`,
          left: `${reelPlay.frame.left}px`,
          top: `${reelPlay.frame.top}px`,
          width: `${reelPlay.frame.width}px`,
        }}
        viewBox={`0 0 ${reelPlay.frame.width} ${reelPlay.frame.height}`}
      >
        {visibleLineWins.map((win) => {
          const traceIndex = reelLineWins.indexOf(win);
          return (
            <polyline
              data-win-trace={traceIndex + 1}
              data-win-trace-direction={win.direction}
              data-win-trace-symbol={win.symbol}
              data-selected-trace={selectedTraceIndex === null ? "false" : "true"}
              key={`${win.direction}-${win.symbol}-${traceIndex}`}
              points={win.cells
                .map((cell) =>
                  [
                    (cell.column - 1) * reelPlay.frame.stepX + reelPlay.frame.visualCardWidth / 2,
                    (cell.row - 1) * reelPlay.frame.stepY + reelPlay.frame.visualCardHeight / 2,
                  ].join(","),
                )
                .join(" ")}
              style={{ stroke: win.color }}
            />
          );
        })}
      </svg>
    );
  };

  const renderScatterGlows = () => {
    if (!reelPlay || scatterHits.length === 0) {
      return null;
    }

    const totalScatterCells = scatterHits.reduce((total, hit) => total + hit.cells.length, 0);

    return (
      <svg
        className="slot-editor__scatter-glows"
        aria-hidden="true"
        data-scatter-count={totalScatterCells}
        data-scatter-glows="true"
        style={{
          height: `${reelPlay.frame.height}px`,
          left: `${reelPlay.frame.left}px`,
          top: `${reelPlay.frame.top}px`,
          width: `${reelPlay.frame.width}px`,
        }}
        viewBox={`0 0 ${reelPlay.frame.width} ${reelPlay.frame.height}`}
      >
        {scatterHits.flatMap((hit) =>
          hit.cells.map((cell) => (
            <rect
              className="slot-editor__scatter-glow-cell"
              data-scatter-glow-cell={`${cell.column}-${cell.row}`}
              data-scatter-glow-symbol={hit.symbol}
              height={reelPlay.frame.visualCardHeight}
              key={`scatter-glow-${hit.symbol}-${cell.column}-${cell.row}`}
              rx="12"
              style={{ stroke: "#22c55e" }}
              width={reelPlay.frame.visualCardWidth}
              x={(cell.column - 1) * reelPlay.frame.stepX}
              y={(cell.row - 1) * reelPlay.frame.stepY}
            />
          )),
        )}
      </svg>
    );
  };

  const selectedRoundHistory =
    roundHistory.find((entry) => entry.round === selectedRoundHistoryRound) ?? roundHistory[0];

  const getHistorySymbolImage = (symbolIndex: number) =>
    layers.find(
      (layer) =>
        layer.canvasAspectRatio === canvasAspectRatio &&
        layer.elementType === "card" &&
        layer.moduleId === REELS_CARDS_MODULE_ID &&
        layer.symbolIndex === symbolIndex,
    )?.symbolImages?.[0];

  const renderRoundHistoryWorkspace = () => {
    if (!selectedRoundHistory) {
      return (
        <section className="slot-editor__round-history-workspace" aria-label="Historial de Rondas">
          <div className="slot-editor__rules-empty">
            <strong>Sin rondas registradas</strong>
            <span>Al completar un giro, aqui veras el grid y los trazos cobrados.</span>
          </div>
        </section>
      );
    }

    const historyCellSize = 82;
    const historyGap = 4;
    const gridWidth =
      selectedRoundHistory.columns * historyCellSize +
      Math.max(0, selectedRoundHistory.columns - 1) * historyGap;
    const gridHeight =
      selectedRoundHistory.rows * historyCellSize +
      Math.max(0, selectedRoundHistory.rows - 1) * historyGap;
    const visibleHistoryWins =
      selectedTraceIndex === null
        ? selectedRoundHistory.wins
        : selectedRoundHistory.wins.slice(selectedTraceIndex, selectedTraceIndex + 1);
    const netLabel =
      selectedRoundHistory.netBalanceChange > 0
        ? `+${formatEditorMoney(selectedRoundHistory.netBalanceChange)}`
        : selectedRoundHistory.netBalanceChange < 0
          ? `-${formatEditorMoney(Math.abs(selectedRoundHistory.netBalanceChange))}`
          : formatEditorMoney(0);

    return (
      <section className="slot-editor__round-history-workspace" aria-label="Historial de Rondas">
        <div
          className="slot-editor__round-history-stage"
          data-round-history-grid="true"
          style={{
            height: `${gridHeight}px`,
            gridTemplateColumns: `repeat(${selectedRoundHistory.columns}, ${historyCellSize}px)`,
            width: `${gridWidth}px`,
          }}
        >
          {selectedRoundHistory.symbols.map((symbolIndex, index) => {
            const symbolImage = getHistorySymbolImage(symbolIndex);
            return (
              <div
                className="slot-editor__round-history-cell"
                data-round-history-symbol={symbolIndex}
                // biome-ignore lint/suspicious/noArrayIndexKey: history cells are a fixed snapshot grid.
                key={`history-cell-${selectedRoundHistory.round}-${index}`}
              >
                {symbolImage ? <img src={symbolImage.src} alt="" /> : <span>{symbolIndex}</span>}
              </div>
            );
          })}
          {visibleHistoryWins.length > 0 ? (
            <svg
              className="slot-editor__win-traces slot-editor__round-history-traces"
              aria-hidden="true"
              data-selected-trace={selectedTraceIndex === null ? "false" : "true"}
              data-win-traces="true"
              style={{ height: `${gridHeight}px`, width: `${gridWidth}px` }}
              viewBox={`0 0 ${gridWidth} ${gridHeight}`}
            >
              {visibleHistoryWins.map((win) => {
                const traceIndex = selectedRoundHistory.wins.indexOf(win);
                return (
                  <polyline
                    data-history-win-trace={traceIndex + 1}
                    data-win-trace={traceIndex + 1}
                    data-win-trace-direction={win.direction}
                    data-win-trace-symbol={win.symbol}
                    key={`history-trace-${selectedRoundHistory.round}-${traceIndex}`}
                    points={win.cells
                      .map((cell) =>
                        [
                          (cell.column - 1) * (historyCellSize + historyGap) + historyCellSize / 2,
                          (cell.row - 1) * (historyCellSize + historyGap) + historyCellSize / 2,
                        ].join(","),
                      )
                      .join(" ")}
                    style={{ stroke: win.color }}
                  />
                );
              })}
            </svg>
          ) : null}
        </div>
        <div className="slot-editor__round-history-economy" data-round-history-economy="true">
          <span>
            <strong>Origen</strong>
            {selectedRoundHistory.spinType === "free-spin" ? "Freespin" : "Pagada"}
          </span>
          <span>
            <strong>Apuesta</strong>
            {formatEditorMoney(selectedRoundHistory.wager)}
          </span>
          <span>
            <strong>Ganancia</strong>
            {formatEditorMoney(selectedRoundHistory.payout)}
          </span>
          <span>
            <strong>Neto</strong>
            {netLabel}
          </span>
          <span>
            <strong>Balance</strong>
            {`${formatEditorMoney(selectedRoundHistory.balanceBefore)} -> ${formatEditorMoney(
              selectedRoundHistory.balanceAfter,
            )}`}
          </span>
        </div>
      </section>
    );
  };

  const renderLayer = (layer: (typeof visibleLayers)[number], surface: "inside" | "outside") => {
    const isOutsideSurface = surface === "outside";
    const isActiveModuleLayer = layer.moduleId === activeModuleId;
    const finalReelPlayStep = reelPlay ? Math.max(...reelPlay.stopSchedule) : 0;
    const isReelPlaySettled = Boolean(reelPlay && reelPlay.currentStep >= finalReelPlayStep);
    const layerClassNames = [
      isOutsideSurface ? "slot-editor__outside-layer" : "",
      isActiveModuleLayer ? "" : "is-locked-by-module",
      selectedLayerId === layer.id && layer.elementType !== "card" ? "is-selected" : "",
    ];
    const layerStyle = {
      "--slot-layer-color": layer.color,
      "--slot-layer-size": layer.size,
      left: `${layer.x}px`,
      top: `${layer.y}px`,
    } as CSSProperties;

    if (layer.elementType === "data") {
      return (
        <span
          className={[
            "slot-editor__data",
            DATA_CLASS_BY_ID[baseLayerId(layer.id)] ?? "",
            ...layerClassNames,
          ]
            .filter(Boolean)
            .join(" ")}
          {...(isOutsideSurface
            ? { "data-outside-layer-id": layer.id }
            : { "data-layer-id": layer.id })}
          {...(isActiveModuleLayer ? {} : { "data-layer-disabled": "true" })}
          key={`${surface}-${layer.id}`}
          onPointerDown={
            isActiveModuleLayer
              ? (event) => onLayerPointerDown(layer.id, { x: layer.x, y: layer.y }, event)
              : undefined
          }
          style={layerStyle}
        >
          {layer.textLabel ? (
            <span className="slot-editor__data-label">{layer.textLabel}</span>
          ) : null}
          {layer.textValue ? (
            <span className="slot-editor__data-value">{layer.textValue}</span>
          ) : null}
        </span>
      );
    }

    if (layer.elementType === "card") {
      if (!isOutsideSurface && reelPlay && !isReelPlaySettled) {
        return null;
      }

      const symbolImage =
        layer.symbolIndex === undefined
          ? undefined
          : symbolImagesByIndex.get(layer.symbolIndex)?.[0];
      const cardSize = REEL_CARD_SIZE_BY_ASPECT[layer.canvasAspectRatio];
      const cardStyle = {
        "--slot-layer-color": layer.color,
        fontSize: `${toStablePixelValue(16 * layer.size)}px`,
        height: `${toStablePixelValue(cardSize.height * layer.size)}px`,
        left: `${layer.x}px`,
        top: `${layer.y}px`,
        width: `${toStablePixelValue(cardSize.width * layer.size)}px`,
      } as CSSProperties;

      return (
        <button
          className={[
            "slot-editor__reel-card",
            reelSettings.slotFrameEnabled ? "" : "has-no-frame",
            symbolImage ? "has-symbol-image" : "",
            !isOutsideSurface && isReelPlaySettled ? "is-reel-hit-target" : "",
            ...layerClassNames,
          ]
            .filter(Boolean)
            .join(" ")}
          type="button"
          aria-label={layer.label}
          {...(isOutsideSurface
            ? { "data-outside-layer-id": layer.id }
            : { "data-layer-id": layer.id })}
          {...(isActiveModuleLayer ? {} : { "data-layer-disabled": "true" })}
          key={`${surface}-${layer.id}`}
          onPointerDown={
            isActiveModuleLayer
              ? (event) => onLayerPointerDown(layer.id, { x: layer.x, y: layer.y }, event)
              : undefined
          }
          style={cardStyle}
        >
          {symbolImage ? (
            <img
              className="slot-editor__reel-card-image"
              data-symbol-image={layer.symbolIndex}
              src={symbolImage.src}
              alt=""
            />
          ) : (
            <span>{layer.symbolIndex ?? "?"}</span>
          )}
        </button>
      );
    }

    if (!layer.iconSrc) {
      return null;
    }

    const buttonBaseId = baseLayerId(layer.id);
    const isSpinButton = buttonBaseId === "button-spin";
    const isAutoPlayButton = buttonBaseId === "button-autoplay";
    const isArrowButton = buttonBaseId === "button-arrow";
    const isBetDecreaseButton = buttonBaseId === "button-betDecrease";
    const isBetIncreaseButton = buttonBaseId === "button-betIncrease";
    const isReelPlayActive = Boolean(reelPlay && reelPlay.currentStep < finalReelPlayStep);
    const isPlayLockedButton =
      (isReelPlayActive || isCascadeRunning || isAutoPlayActive || isAutoFreeSpinActive) &&
      PLAY_LOCKED_BUTTON_IDS.has(buttonBaseId) &&
      !(isSpinButton && isAutoPlayActive && !isAutoFreeSpinActive);
    const isSpinMotionActive = Boolean(isSpinButton && isReelPlayActive);
    const isSpinSettling = Boolean(
      isSpinButton && reelPlay && reelPlay.currentStep >= finalReelPlayStep,
    );
    const previewIconSrc =
      isSpinButton && isAutoPlayActive && !isAutoFreeSpinActive ? STOP_ICON_SRC : layer.iconSrc;

    return (
      <EditorButtonPreview
        className={[
          BUTTON_CLASS_BY_ID[buttonBaseId] ?? "",
          isSpinButton && isAutoPlayActive && !isAutoFreeSpinActive ? "is-autoplay-stop" : "",
          isSpinMotionActive ? "is-spinning" : "",
          isSpinSettling ? "is-spin-settling" : "",
          isArrowButton ? `has-speed-${spinSpeed}` : "",
          ...layerClassNames,
        ]
          .filter(Boolean)
          .join(" ")}
        iconSrc={previewIconSrc}
        isOutsideCanvas={isOutsideSurface}
        isDisabledByModule={!isActiveModuleLayer}
        isPlayLocked={!isOutsideSurface && isPlayLockedButton}
        key={`${surface}-${layer.id}`}
        label={layer.label}
        layerId={layer.id}
        onPointerDown={
          isActiveModuleLayer && !isPlayLockedButton
            ? (event) => onLayerPointerDown(layer.id, { x: layer.x, y: layer.y }, event)
            : undefined
        }
        onClick={
          !isOutsideSurface && isSpinButton
            ? (event) => {
                event.stopPropagation();
                if (isAutoPlayActive) {
                  stopAutoPlay();
                  return;
                }
                if (isReelPlayActive || isCascadeRunning) {
                  return;
                }
                startReelPlay();
              }
            : !isOutsideSurface && isAutoPlayButton
              ? (event) => {
                  event.stopPropagation();
                  startAutoPlay();
                }
              : !isOutsideSurface && isArrowButton
                ? (event) => {
                    event.stopPropagation();
                    cycleSpinSpeed();
                  }
                : !isOutsideSurface && isBetDecreaseButton
                  ? (event) => {
                      event.stopPropagation();
                      decreaseEditorBet();
                    }
                  : !isOutsideSurface && isBetIncreaseButton
                    ? (event) => {
                        event.stopPropagation();
                        increaseEditorBet();
                      }
                    : undefined
        }
        style={layerStyle}
      />
    );
  };

  const renderRulesSpecialSections = () => (
    <>
      {wildCombinationItems.length > 0 ? (
        <section className="slot-editor__rules-special-section" aria-label="Wild Joker">
          <h3>Wild Joker</h3>
          <div className="slot-editor__rules-special-list">
            {wildCombinationItems.map(({ layer, symbolIndex }) => {
              const thumbnail = layer.symbolImages?.[0];
              const symbolProbability = (symbolWeightPercentages[symbolIndex - 1] ?? 0) / 100;
              return (
                <article className="slot-editor__rules-special-card is-wild" key={layer.id}>
                  <div className="slot-editor__combination-thumb">
                    {thumbnail ? <img src={thumbnail.src} alt="" /> : <span>{symbolIndex}</span>}
                  </div>
                  <div>
                    <strong>{layer.label}</strong>
                    <span>
                      Actua como joker y vale como la carta del trazo que ayuda a completar.
                    </span>
                  </div>
                  <div className="slot-editor__wild-payout-grid">
                    {combinationMatchCounts.map((matchCount) => {
                      const traceCount = countLineTracePossibilities({
                        columns: reelSettings.columns,
                        matchCount,
                        rows: reelSettings.rows,
                        settings: lineTraceSettings,
                      });
                      const chance = getCombinationManifestChance({
                        isScatterTraceBlocked: false,
                        isWild: true,
                        matchCount,
                        symbolProbability,
                        traceCount,
                        wildProbability: 0,
                      });
                      return (
                        <label
                          className="slot-editor__wild-payout-control"
                          key={`wild-${symbolIndex}-match-${matchCount}`}
                        >
                          <span>{`x${matchCount}`}</span>
                          <span className="slot-editor__special-chance">
                            {`${chance.toFixed(4)}% chance`}
                          </span>
                          <input
                            aria-label={`Wild ${layer.label} x${matchCount}`}
                            min="0"
                            step="0.01"
                            type="number"
                            value={
                              wildPayouts[symbolIndex]?.[matchCount] ??
                              DEFAULT_WILD_PAYOUT_MULTIPLIER
                            }
                            onInput={(event) =>
                              setWildPayout(
                                symbolIndex,
                                matchCount,
                                Number(event.currentTarget.value),
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {scatterCombinationItems.length > 0 ? (
        <section className="slot-editor__rules-special-section" aria-label="Scatter Freespins">
          <h3>Scatter Freespins</h3>
          <div className="slot-editor__rules-special-list">
            {scatterCombinationItems.map(({ layer, symbolIndex }) => {
              const thumbnail = layer.symbolImages?.[0];
              const symbolProbability = (symbolWeightPercentages[symbolIndex - 1] ?? 0) / 100;
              const scatterIncrement =
                scatterFreespinIncrements[symbolIndex] ?? DEFAULT_SCATTER_FREESPIN_INCREMENT;
              const maxScatterAppearanceCount = Math.max(
                2,
                reelSettings.columns,
                reelSettings.rows,
              );
              const x5Freespins = scatterFreespins[symbolIndex]?.[5] ?? 0;
              const maxExtraFreespins =
                x5Freespins + scatterIncrement * Math.max(0, maxScatterAppearanceCount - 5);
              return (
                <article className="slot-editor__rules-special-card is-scatter" key={layer.id}>
                  <div className="slot-editor__combination-thumb">
                    {thumbnail ? <img src={thumbnail.src} alt="" /> : <span>{symbolIndex}</span>}
                  </div>
                  <div>
                    <strong>{layer.label}</strong>
                    <span>Otorga Freespins y no paga como trazo normal.</span>
                  </div>
                  <div className="slot-editor__scatter-freespins-grid">
                    {scatterAppearanceCounts.map((appearanceCount) => (
                      <label
                        className="slot-editor__scatter-freespins-control"
                        key={`scatter-${symbolIndex}-appearance-${appearanceCount}`}
                      >
                        <span>{`x${appearanceCount}`}</span>
                        <span className="slot-editor__special-chance">
                          {`${getAppearanceManifestChance({
                            appearanceCount,
                            slotCount: reelSlotCount,
                            symbolProbability,
                          }).toFixed(4)}% chance`}
                        </span>
                        <input
                          aria-label={`Freespins ${layer.label} x${appearanceCount}`}
                          min="0"
                          step="1"
                          type="number"
                          value={scatterFreespins[symbolIndex]?.[appearanceCount] ?? 0}
                          onInput={(event) =>
                            setScatterFreespins(
                              symbolIndex,
                              appearanceCount,
                              Number(event.currentTarget.value),
                            )
                          }
                        />
                      </label>
                    ))}
                    {scatterSettings.readMode === "individual" ? (
                      <label
                        className="slot-editor__scatter-freespins-control"
                        key={`scatter-${symbolIndex}-increment`}
                      >
                        <span>+5</span>
                        <span className="slot-editor__special-chance">
                          {maxScatterAppearanceCount > 5
                            ? `x${maxScatterAppearanceCount} = ${maxExtraFreespins}`
                            : "Suma extra"}
                        </span>
                        <input
                          aria-label={`Incremento Freespins ${layer.label} +5`}
                          min="0"
                          step="1"
                          type="number"
                          value={scatterIncrement}
                          onInput={(event) =>
                            setScatterFreespinIncrement(
                              symbolIndex,
                              Number(event.currentTarget.value),
                            )
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {jackpotCombinationItems.length > 0 ? (
        <section className="slot-editor__rules-special-section" aria-label="Jackpot">
          <h3>Jackpot</h3>
          <div className="slot-editor__rules-special-list">
            {jackpotCombinationItems.map(({ layer, symbolIndex }) => {
              const thumbnail = layer.symbolImages?.[0];
              const symbolProbability = (symbolWeightPercentages[symbolIndex - 1] ?? 0) / 100;
              return (
                <article className="slot-editor__rules-special-card is-jackpot" key={layer.id}>
                  <div className="slot-editor__combination-thumb">
                    {thumbnail ? <img src={thumbnail.src} alt="" /> : <span>{symbolIndex}</span>}
                  </div>
                  <div>
                    <strong>{layer.label}</strong>
                    <span>Paga Jackpot cuando cumple sus apariciones.</span>
                  </div>
                  <div className="slot-editor__jackpot-payout-grid">
                    {combinationMatchCounts.map((matchCount) => {
                      const traceCount = countLineTracePossibilities({
                        columns: reelSettings.columns,
                        matchCount,
                        rows: reelSettings.rows,
                        settings: lineTraceSettings,
                      });
                      const chance = getCombinationManifestChance({
                        isScatterTraceBlocked: false,
                        isWild: false,
                        matchCount,
                        symbolProbability,
                        traceCount,
                        wildProbability: 0,
                      });
                      return (
                        <label
                          className="slot-editor__jackpot-payout-control"
                          key={`jackpot-${symbolIndex}-match-${matchCount}`}
                        >
                          <span>{`x${matchCount}`}</span>
                          <span className="slot-editor__special-chance">
                            {`${chance.toFixed(4)}% chance`}
                          </span>
                          <input
                            aria-label={`Jackpot ${layer.label} x${matchCount}`}
                            min="0"
                            step="0.01"
                            type="number"
                            value={
                              jackpotPayouts[symbolIndex]?.[matchCount] ??
                              DEFAULT_JACKPOT_PAYOUT_MULTIPLIER
                            }
                            onInput={(event) =>
                              setJackpotPayout(
                                symbolIndex,
                                matchCount,
                                Number(event.currentTarget.value),
                              )
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );

  const renderRulesCombinationsWorkspace = () => (
    <section
      className="slot-editor__rules-combinations-workspace"
      aria-label="Reglas y Combinaciones"
    >
      <header className="slot-editor__rules-combinations-header">
        <div>
          <span className="slot-editor__rules-combinations-eyebrow">Tabla de pagos</span>
          <h2>Reglas y Combinaciones</h2>
        </div>
        <div className="slot-editor__rules-combinations-stats">
          <strong>{`${reelCardCatalogItems.length} cartas`}</strong>
          <strong>{`${winningCombinationCount} combinaciones`}</strong>
        </div>
      </header>
      <div className="slot-editor__rules-sheet-tabs" role="tablist" aria-label="Hoja de reglas">
        <button
          type="button"
          role="tab"
          aria-label="Ver Catalogo de Cartas"
          aria-selected={rulesSheetTab === "catalog"}
          onClick={() => setRulesSheetTab("catalog")}
        >
          Catalogo de Cartas
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Ver Grupos de Cartas"
          aria-selected={rulesSheetTab === "groups"}
          onClick={() => setRulesSheetTab("groups")}
        >
          Grupos de Cartas
        </button>
      </div>
      {rulesSheetTab === "catalog" ? renderRulesSpecialSections() : null}
      {(rulesSheetTab === "catalog" ? normalCombinationItems : cardGroupCombinationItems).length >
      0 ? (
        <>
          <div
            className="slot-editor__combination-table-head"
            style={{
              gridTemplateColumns: `minmax(180px, 220px) repeat(${combinationMatchCounts.length}, minmax(96px, 1fr))`,
            }}
          >
            <div className="slot-editor__combination-head">Carta</div>
            {combinationMatchCounts.map((matchCount) => (
              <div className="slot-editor__combination-head" key={`head-${matchCount}`}>
                {`x${matchCount}`}
              </div>
            ))}
          </div>
          <div
            className="slot-editor__combination-table"
            style={{
              gridTemplateColumns: `minmax(180px, 220px) repeat(${combinationMatchCounts.length}, minmax(96px, 1fr))`,
            }}
          >
            {[
              ...(rulesSheetTab === "groups"
                ? cardGroupCombinationItems.map((item) => ({ ...item, type: "group" as const }))
                : []),
              ...(rulesSheetTab === "catalog"
                ? normalCombinationItems.map((item) => ({ ...item, type: "card" as const }))
                : []),
            ].flatMap((item) => {
              const isGroup = item.type === "group";
              const symbolIndex = isGroup ? item.payoutSymbol : item.symbolIndex;
              const label = isGroup ? item.label : item.layer.label;
              const thumbnail = isGroup ? null : item.layer.symbolImages?.[0];
              const symbolProbability = isGroup
                ? item.group.reduce(
                    (total, groupSymbol) =>
                      total + (symbolWeightPercentages[groupSymbol - 1] ?? 0) / 100,
                    0,
                  )
                : (symbolWeightPercentages[item.symbolIndex - 1] ?? 0) / 100;

              return [
                <div
                  className="slot-editor__combination-symbol"
                  data-combination-symbol={symbolIndex}
                  key={`symbol-${symbolIndex}`}
                >
                  <div className="slot-editor__combination-thumb">
                    {thumbnail ? (
                      <img src={thumbnail.src} alt="" />
                    ) : (
                      <span>{isGroup ? `G${Math.abs(symbolIndex)}` : symbolIndex}</span>
                    )}
                  </div>
                  <div>
                    <strong>{label}</strong>
                    <span>
                      {isGroup
                        ? item.group.map((symbol) => `Carta ${symbol}`).join(", ")
                        : "Normal"}
                    </span>
                  </div>
                </div>,
                ...combinationMatchCounts.map((matchCount) => {
                  const traceCount = countLineTracePossibilities({
                    columns: reelSettings.columns,
                    matchCount,
                    rows: reelSettings.rows,
                    settings: lineTraceSettings,
                  });
                  const wildProbability = wildSettings.enabled
                    ? wildSettings.wildSymbols.reduce(
                        (total, wildSymbol) =>
                          total + (symbolWeightPercentages[wildSymbol - 1] ?? 0) / 100,
                        0,
                      )
                    : 0;
                  const chance = getCombinationManifestChance({
                    isScatterTraceBlocked: false,
                    isWild: false,
                    matchCount,
                    symbolProbability,
                    traceCount,
                    wildProbability,
                  });
                  return (
                    <label
                      className="slot-editor__combination-cell"
                      key={`symbol-${symbolIndex}-match-${matchCount}`}
                    >
                      <span>{`${chance.toFixed(4)}% chance`}</span>
                      <input
                        aria-label={`Pago ${label} x${matchCount}`}
                        min="0"
                        step="0.01"
                        type="number"
                        value={
                          combinationPayouts[symbolIndex]?.[matchCount] ??
                          DEFAULT_NORMAL_PAYOUT_MULTIPLIER
                        }
                        onInput={(event) =>
                          setCombinationPayout(
                            symbolIndex,
                            matchCount,
                            Number(event.currentTarget.value),
                          )
                        }
                      />
                    </label>
                  );
                }),
              ];
            })}
          </div>
        </>
      ) : (
        <div className="slot-editor__rules-empty">
          <strong>{rulesSheetTab === "groups" ? "Sin grupos" : "Sin cartas normales"}</strong>
          <span>
            {rulesSheetTab === "groups"
              ? "Crea grupos desde el menu Grupos de Cartas."
              : "Las cartas Wild, Scatter y Jackpot se administran en sus secciones separadas."}
          </span>
        </div>
      )}
    </section>
  );

  return (
    <main
      className={`slot-editor__canvas-shell ${isPanning ? "is-panning" : ""}`}
      onPointerDown={
        activeModuleId === RULES_COMBINATIONS_MODULE_ID ? undefined : onCanvasPointerDown
      }
      onWheel={activeModuleId === RULES_COMBINATIONS_MODULE_ID ? undefined : onWheel}
    >
      {activeModuleId === RULES_COMBINATIONS_MODULE_ID ? (
        renderRulesCombinationsWorkspace()
      ) : activeModuleId === ROUND_HISTORY_MODULE_ID ? (
        renderRoundHistoryWorkspace()
      ) : (
        <>
          <div className="slot-editor__canvas-toolbar">
            <div className="slot-editor__canvas-background-control">
              <span>Fondo</span>
              <button
                className="slot-editor__canvas-background-button is-black"
                type="button"
                aria-label="Fondo negro"
                aria-pressed={canvasBackground === "black"}
                onClick={() => setCanvasBackground("black")}
              />
              <button
                className="slot-editor__canvas-background-button is-white"
                type="button"
                aria-label="Fondo blanco"
                aria-pressed={canvasBackground === "white"}
                onClick={() => setCanvasBackground("white")}
              />
              <button
                className="slot-editor__canvas-background-button is-transparency-grid"
                type="button"
                aria-label="Cuadricula de transparencia"
                aria-pressed={canvasBackground === "transparent"}
                onClick={() => setCanvasBackground("transparent")}
              />
            </div>
            <fieldset
              className="slot-editor__canvas-aspect-control"
              aria-label="Aspect ratio del canvas"
            >
              <button
                className="slot-editor__canvas-aspect-button"
                type="button"
                aria-label="Aspect ratio 9:16"
                aria-pressed={canvasAspectRatio === "9:16"}
                onClick={() => setCanvasAspectRatio("9:16")}
              >
                9:16
              </button>
              <button
                className="slot-editor__canvas-aspect-button"
                type="button"
                aria-label="Aspect ratio 16:9"
                aria-pressed={canvasAspectRatio === "16:9"}
                onClick={() => setCanvasAspectRatio("16:9")}
              >
                16:9
              </button>
            </fieldset>
          </div>
          <div className="slot-editor__zoom-indicator" aria-label="Zoom del canvas" role="status">
            {zoomPercent}%
          </div>
          <section
            className={`slot-editor__phone is-background-${canvasBackground} is-aspect-${canvasAspectRatio.replace(":", "-")}`}
            aria-label="Canvas mobile"
            style={{
              transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
            }}
          >
            {visibleLayers.map((layer) => renderLayer(layer, "outside"))}
            <div className="slot-editor__phone-clip">
              {visibleLayers.map((layer) => renderLayer(layer, "inside"))}
              {renderReelMotionWindow()}
              {renderScatterGlows()}
              {renderLineWinTraces()}
              {selectedReelGridFrame ? (
                <div
                  className="slot-editor__reel-grid-selection"
                  data-reel-grid-selection="true"
                  style={{
                    height: `${selectedReelGridFrame.height}px`,
                    left: `${selectedReelGridFrame.left}px`,
                    top: `${selectedReelGridFrame.top}px`,
                    width: `${selectedReelGridFrame.width}px`,
                  }}
                />
              ) : null}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
