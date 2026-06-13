import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveCascadeWins } from "../cascadeWins";
import {
  REELS_CARDS_MODULE_ID,
  RULES_COMBINATIONS_MODULE_ID,
} from "../config/editorModules.config";
import type { EditorCanvasAspectRatio, EditorLayer } from "../editor.types";
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
const DEFAULT_CANVAS_PAN_BY_ASPECT: Record<EditorCanvasAspectRatio, { x: number; y: number }> = {
  "9:16": { x: 0, y: -520 },
  "16:9": { x: 0, y: -180 },
};

function toStablePixelValue(value: number): number {
  return Number(value.toFixed(4));
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

export function EditorCanvas() {
  const [canvasPanByAspect, setCanvasPanByAspect] = useState(DEFAULT_CANVAS_PAN_BY_ASPECT);
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
    scatterSettings,
    scatterFreespins,
    selectedLayerId,
    spinSpeed,
    symbolWeights,
    wildPayouts,
    wildSettings,
    cycleSpinSpeed,
    setCanvasAspectRatio,
    setCanvasBackground,
    setCanvasZoom,
    setCombinationPayout,
    setJackpotPayout,
    setWildPayout,
    setScatterFreespins,
    setSelectedLayer,
    setVisibleReelSymbols,
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
    const maxAppearanceCount = Math.max(2, reelSettings.columns, reelSettings.rows);
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
  const linePayouts = useMemo(
    () => ({
      ...combinationPayouts,
      ...wildPayouts,
    }),
    [combinationPayouts, wildPayouts],
  );
  const winningCombinationCount = useMemo(
    () =>
      [...cardGroupCombinationItems, ...normalCombinationItems].reduce((total) => {
        return (
          total +
          combinationMatchCounts.filter(
            (matchCount) =>
              countLineTracePossibilities({
                columns: reelSettings.columns,
                matchCount,
                rows: reelSettings.rows,
                settings: lineTraceSettings,
              }) > 0,
          ).length
        );
      }, 0),
    [
      cardGroupCombinationItems,
      combinationMatchCounts,
      lineTraceSettings,
      normalCombinationItems,
      reelSettings.columns,
      reelSettings.rows,
    ],
  );
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
        ...symbolWeights,
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
      symbolWeights,
      visibleReelLayers,
    ],
  );
  const reelLineWins = useMemo(() => {
    if (!reelPlay) {
      return [];
    }

    const finalReelPlayStep = Math.max(...reelPlay.stopSchedule);
    if (reelPlay.currentStep < finalReelPlayStep) {
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
      symbols: getVisibleReelMotionSymbols(reelPlay.window, reelSettings.rows),
      wildBridgeBlockedSymbols,
      wildLineRule: wildSettings.lineRule,
      wildSymbols: wildSettings.enabled ? wildSettings.wildSymbols : [],
    });
  }, [
    wildBridgeBlockedSymbols,
    linePayouts,
    lineTraceSettings,
    cardGroupSettings.groups,
    reelPlay,
    reelSettings.columns,
    reelSettings.rows,
    scatterSettings.enabled,
    scatterSettings.readMode,
    scatterSettings.scatterSymbols,
    wildSettings.enabled,
    wildSettings.lineRule,
    wildSettings.wildSymbols,
  ]);

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
  };

  const startAutoPlay = () => {
    if (reelPlayTimerRef.current !== null || isCascadeRunning) {
      return;
    }

    autoPlayActiveRef.current = true;
    setIsAutoPlayActive(true);
    startReelPlay();
  };

  const startReelPlay = (initialVisibleSymbols?: number[]) => {
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
      symbolWeights,
      visibleSymbols:
        initialVisibleSymbols ?? visibleReelLayers.map((layer) => layer.symbolIndex ?? 1),
    });

    const scheduleNextAutoPlay = (nextVisibleSymbols: number[]) => {
      if (!autoPlayActiveRef.current) {
        setIsAutoPlayActive(false);
        return;
      }

      autoPlayTimerRef.current = window.setTimeout(() => {
        autoPlayTimerRef.current = null;
        if (!autoPlayActiveRef.current) {
          setIsAutoPlayActive(false);
          return;
        }
        startReelPlay(nextVisibleSymbols);
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
        symbolWeights,
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
          symbolWeights,
          symbols: visibleSymbols,
          validationMode: lineValidationMode,
          wildBridgeBlockedSymbols,
          wildLineRule: wildSettings.lineRule,
          wildSymbols: wildSettings.enabled ? wildSettings.wildSymbols : [],
        });
        setVisibleReelSymbols(
          lineValidationMode === "cascade" ? cascadeResult.finalSymbols : visibleSymbols,
        );
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
              scheduleNextAutoPlay(cascadeResult.finalSymbols);
              return;
            }

            const cascadeWindow = createReelMotionWindow({
              columns: reelSettings.columns,
              rows: reelSettings.rows,
              symbolCount: reelSettings.cardCount,
              symbolWeights,
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

    return (
      <svg
        className="slot-editor__win-traces"
        aria-hidden="true"
        data-win-traces="true"
        style={{
          height: `${reelPlay.frame.height}px`,
          left: `${reelPlay.frame.left}px`,
          top: `${reelPlay.frame.top}px`,
          width: `${reelPlay.frame.width}px`,
        }}
        viewBox={`0 0 ${reelPlay.frame.width} ${reelPlay.frame.height}`}
      >
        {reelLineWins.map((win, index) => (
          <polyline
            data-win-trace={index + 1}
            data-win-trace-direction={win.direction}
            data-win-trace-symbol={win.symbol}
            // biome-ignore lint/suspicious/noArrayIndexKey: win traces are transient detection results.
            key={`${win.direction}-${win.symbol}-${index}`}
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
        ))}
      </svg>
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
    const isReelPlayActive = Boolean(reelPlay && reelPlay.currentStep < finalReelPlayStep);
    const isPlayLockedButton =
      (isReelPlayActive || isCascadeRunning || isAutoPlayActive) &&
      PLAY_LOCKED_BUTTON_IDS.has(buttonBaseId) &&
      !(isSpinButton && isAutoPlayActive);
    const isSpinMotionActive = Boolean(isSpinButton && isReelPlayActive);
    const isSpinSettling = Boolean(
      isSpinButton && reelPlay && reelPlay.currentStep >= finalReelPlayStep,
    );
    const previewIconSrc = isSpinButton && isAutoPlayActive ? STOP_ICON_SRC : layer.iconSrc;

    return (
      <EditorButtonPreview
        className={[
          BUTTON_CLASS_BY_ID[buttonBaseId] ?? "",
          isSpinButton && isAutoPlayActive ? "is-autoplay-stop" : "",
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
                    {combinationMatchCounts.map((matchCount) => (
                      <label
                        className="slot-editor__wild-payout-control"
                        key={`wild-${symbolIndex}-match-${matchCount}`}
                      >
                        <span>{`x${matchCount}`}</span>
                        <span className="slot-editor__special-chance">
                          {`${getAppearanceManifestChance({
                            appearanceCount: matchCount,
                            slotCount: reelSlotCount,
                            symbolProbability,
                          }).toFixed(4)}% chance`}
                        </span>
                        <input
                          aria-label={`Wild ${layer.label} x${matchCount}`}
                          min="0"
                          step="0.01"
                          type="number"
                          value={wildPayouts[symbolIndex]?.[matchCount] ?? 0}
                          onInput={(event) =>
                            setWildPayout(
                              symbolIndex,
                              matchCount,
                              Number(event.currentTarget.value),
                            )
                          }
                        />
                      </label>
                    ))}
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
                    {combinationMatchCounts.map((matchCount) => (
                      <label
                        className="slot-editor__jackpot-payout-control"
                        key={`jackpot-${symbolIndex}-match-${matchCount}`}
                      >
                        <span>{`x${matchCount}`}</span>
                        <span className="slot-editor__special-chance">
                          {`${getAppearanceManifestChance({
                            appearanceCount: matchCount,
                            slotCount: reelSlotCount,
                            symbolProbability,
                          }).toFixed(4)}% chance`}
                        </span>
                        <input
                          aria-label={`Jackpot ${layer.label} x${matchCount}`}
                          min="0"
                          step="0.01"
                          type="number"
                          value={jackpotPayouts[symbolIndex]?.[matchCount] ?? 0}
                          onInput={(event) =>
                            setJackpotPayout(
                              symbolIndex,
                              matchCount,
                              Number(event.currentTarget.value),
                            )
                          }
                        />
                      </label>
                    ))}
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
                        value={combinationPayouts[symbolIndex]?.[matchCount] ?? 0}
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
