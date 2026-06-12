import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EditorCanvasAspectRatio } from "../editor.types";
import {
  advanceReelMotionWindow,
  createReelMotionWindow,
  createReelStopSchedule,
  getVisibleReelMotionSymbols,
  type ReelMotionWindow,
} from "../reelMotion";
import { useEditorStore } from "../store/editorStore";
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
const REEL_PLAY_MIN_STOP_STEP = 24;
const REEL_PLAY_MAX_STOP_STEP = 64;
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
  currentStep: number;
  frame: ReelPlayFrame;
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

export function EditorCanvas() {
  const [canvasPanByAspect, setCanvasPanByAspect] = useState(DEFAULT_CANVAS_PAN_BY_ASPECT);
  const [isPanning, setIsPanning] = useState(false);
  const [reelPlay, setReelPlay] = useState<ReelPlayState | null>(null);
  const skipNextReelSignatureClearRef = useRef(false);
  const reelPlayTimerRef = useRef<number | null>(null);
  const {
    activeModuleId,
    canvasAspectRatio,
    canvasBackground,
    canvasZoom,
    layers,
    moduleVisibility,
    pushUndoSnapshot,
    reelSettings,
    selectedLayerId,
    spinSpeed,
    cycleSpinSpeed,
    setCanvasAspectRatio,
    setCanvasBackground,
    setCanvasZoom,
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
  const reelStructureSignature = useMemo(
    () =>
      [
        reelSettings.cardCount,
        reelSettings.columns,
        reelSettings.paddingX,
        reelSettings.paddingY,
        reelSettings.rows,
        reelSettings.scale,
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
      visibleReelLayers,
    ],
  );

  useEffect(
    () => () => {
      if (reelPlayTimerRef.current !== null) {
        window.clearInterval(reelPlayTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    void reelStructureSignature;
    if (skipNextReelSignatureClearRef.current) {
      skipNextReelSignatureClearRef.current = false;
      return;
    }

    if (reelPlayTimerRef.current !== null) {
      window.clearInterval(reelPlayTimerRef.current);
      reelPlayTimerRef.current = null;
    }
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

  const startReelPlay = () => {
    if (visibleReelLayers.length === 0 || reelSettings.cardCount <= 0) {
      return;
    }
    if (reelPlayTimerRef.current !== null) {
      window.clearInterval(reelPlayTimerRef.current);
    }

    const frame = createReelPlayFrame();
    if (!frame) {
      return;
    }

    let stepCount = 0;
    const stopSchedule = createReelStopSchedule({
      columns: reelSettings.columns,
      maxStep: REEL_PLAY_MAX_STOP_STEP,
      minStep: REEL_PLAY_MIN_STOP_STEP,
      mode: reelSettings.stopMode,
    });
    const finalStopStep = Math.max(...stopSchedule);
    let motionWindow = createReelMotionWindow({
      columns: reelSettings.columns,
      rows: reelSettings.rows,
      symbolCount: reelSettings.cardCount,
      visibleSymbols: visibleReelLayers.map((layer) => layer.symbolIndex ?? 1),
    });

    setReelPlay({ currentStep: stepCount, frame, stopSchedule, window: motionWindow });
    reelPlayTimerRef.current = window.setInterval(() => {
      motionWindow = advanceReelMotionWindow(motionWindow, {
        currentStep: stepCount,
        symbolCount: reelSettings.cardCount,
        stopSchedule,
      });
      stepCount += 1;

      if (stepCount >= finalStopStep) {
        window.clearInterval(reelPlayTimerRef.current ?? undefined);
        reelPlayTimerRef.current = null;
        skipNextReelSignatureClearRef.current = true;
        setVisibleReelSymbols(getVisibleReelMotionSymbols(motionWindow, reelSettings.rows));
        setReelPlay({
          currentStep: finalStopStep,
          frame,
          stopSchedule,
          window: motionWindow,
        });
        return;
      }

      setReelPlay({ currentStep: stepCount, frame, stopSchedule, window: motionWindow });
    }, REEL_PLAY_STEP_MS_BY_SPEED[spinSpeed]);
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
              const symbolImage = symbolImagesByIndex.get(symbolIndex)?.[0];
              return (
                <div
                  className={[
                    "slot-editor__reel-card",
                    "slot-editor__reel-motion-symbol",
                    isColumnStopped ? "is-stopped" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-reel-motion-symbol={`${columnIndex + 1}-${rowIndex}`}
                  // biome-ignore lint/suspicious/noArrayIndexKey: motion cells are fixed column/row positions in a transient reel window.
                  key={`${columnIndex}-${rowIndex}-${symbolIndex}`}
                  style={
                    {
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

      return (
        <button
          className={[
            "slot-editor__reel-card",
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
          style={layerStyle}
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
    const isArrowButton = buttonBaseId === "button-arrow";
    const isReelPlayActive = Boolean(reelPlay && reelPlay.currentStep < finalReelPlayStep);
    const isPlayLockedButton = isReelPlayActive && PLAY_LOCKED_BUTTON_IDS.has(buttonBaseId);
    const isSpinMotionActive = Boolean(isSpinButton && isReelPlayActive);
    const isSpinSettling = Boolean(
      isSpinButton && reelPlay && reelPlay.currentStep >= finalReelPlayStep,
    );

    return (
      <EditorButtonPreview
        className={[
          BUTTON_CLASS_BY_ID[buttonBaseId] ?? "",
          isSpinMotionActive ? "is-spinning" : "",
          isSpinSettling ? "is-spin-settling" : "",
          isArrowButton ? `has-speed-${spinSpeed}` : "",
          ...layerClassNames,
        ]
          .filter(Boolean)
          .join(" ")}
        iconSrc={layer.iconSrc}
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
                if (isReelPlayActive) {
                  return;
                }
                startReelPlay();
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

  return (
    <main
      className={`slot-editor__canvas-shell ${isPanning ? "is-panning" : ""}`}
      onPointerDown={onCanvasPointerDown}
      onWheel={onWheel}
    >
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
        style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})` }}
      >
        {visibleLayers.map((layer) => renderLayer(layer, "outside"))}
        <div className="slot-editor__phone-clip">
          {visibleLayers.map((layer) => renderLayer(layer, "inside"))}
          {renderReelMotionWindow()}
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
    </main>
  );
}
