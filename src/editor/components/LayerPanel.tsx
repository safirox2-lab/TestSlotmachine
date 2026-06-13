import {
  EDITOR_MODULES,
  REELS_CARDS_MODULE_ID,
  ROUND_HISTORY_MODULE_ID,
  RULES_COMBINATIONS_MODULE_ID,
  RULES_WINS_MODULE_ID,
} from "../config/editorModules.config";
import type { EditorCanvasAspectRatio, EditorLayer, EditorTraceSummary } from "../editor.types";
import { useEditorStore } from "../store/editorStore";
import { getSymbolWeightPercentages, normalizeSymbolWeights } from "../symbolWeights";

const CARD_PIXEL_SIZE_BY_ASPECT = {
  "9:16": { height: 185.1428571429, width: 154.2857142857 },
  "16:9": { height: 164.5714285714, width: 164.5714285714 },
} as const;

function layerTypeLabel(type: string): string {
  if (type === "button") {
    return "Boton";
  }
  if (type === "menu") {
    return "Menu";
  }
  if (type === "card") {
    return "Carta";
  }
  return "Dato";
}

function renderLayerTitle(layer: ReturnType<typeof useEditorStore.getState>["layers"][number]) {
  if (layer.elementType === "card" && layer.symbolImages?.[0]) {
    return (
      <>
        <img
          className="slot-editor__layer-thumbnail"
          data-layer-thumbnail={layer.id}
          src={layer.symbolImages[0].src}
          alt=""
        />
        <span>{layer.label}</span>
      </>
    );
  }

  return <span>{`[${layerTypeLabel(layer.elementType)}] ${layer.label}`}</span>;
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

function symbolAt(symbols: number[], columns: number, column: number, row: number): number | null {
  return symbols[(row - 1) * columns + (column - 1)] ?? null;
}

export function LayerPanel({
  onSelectedTraceChange,
  selectedTraceIndex,
  traceSummary,
}: {
  onSelectedTraceChange?: (index: number | null) => void;
  selectedTraceIndex?: number | null;
  traceSummary?: EditorTraceSummary;
}) {
  const {
    activeModuleId,
    cardGroupSettings,
    canvasAspectRatio,
    getActiveModuleLayers,
    jackpotSettings,
    layers: allLayers,
    moveLayer,
    removeLayer,
    reelSettings,
    roundHistory,
    scatterSettings,
    selectedLayerId,
    selectedRoundHistoryRound,
    setSelectedLayer,
    setLayerSymbolImages,
    setSelectedRoundHistory,
    setSymbolWeight,
    symbolWeights,
    toggleLayerVisibility,
    updateLayer,
    wildSettings,
  } = useEditorStore();
  const layers = getActiveModuleLayers().filter(
    (layer) =>
      layer.elementType !== "card" ||
      Number(layer.label.replace("Carta ", "")) <= reelSettings.cardCount,
  );
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
  const selectedCardPixelSize =
    selectedLayer?.elementType === "card"
      ? {
          height: Math.round(
            CARD_PIXEL_SIZE_BY_ASPECT[selectedLayer.canvasAspectRatio].height * selectedLayer.size,
          ),
          width: Math.round(
            CARD_PIXEL_SIZE_BY_ASPECT[selectedLayer.canvasAspectRatio].width * selectedLayer.size,
          ),
        }
      : null;
  const activeModuleTitle =
    EDITOR_MODULES.find((module) => module.id === activeModuleId)?.title ?? "Layers";
  const reelCardCatalogItems = getReelCardCatalogItems(
    allLayers,
    canvasAspectRatio,
    reelSettings.cardCount,
  );
  const normalizedSymbolWeights = normalizeSymbolWeights(symbolWeights, reelSettings.cardCount);
  const symbolWeightPercentages = getSymbolWeightPercentages(symbolWeights, reelSettings.cardCount);
  const groupedSymbolSet = new Set(cardGroupSettings.groups.flat());
  const reelCardBySymbol = new Map(
    reelCardCatalogItems.map(({ layer, symbolIndex }) => [symbolIndex, layer]),
  );

  if (activeModuleId === RULES_WINS_MODULE_ID) {
    return (
      <aside className="slot-editor__panel slot-editor__layer-panel" aria-label="Trazados">
        <span className="slot-editor__panel-label">Layers</span>
        <div className="slot-editor__layer-panel-header">
          <strong className="slot-editor__layer-title">Trazados de Victoria</strong>
        </div>
        <div className="slot-editor__paying-traces">
          {traceSummary && (traceSummary.scatterHits.length > 0 || traceSummary.wins.length > 0) ? (
            <>
              {traceSummary.scatterHits.map((hit, index) => {
                const targetLayer = reelCardBySymbol.get(hit.symbol);
                const targetThumbnail = targetLayer?.symbolImages?.[0];
                const hitKey = hit.cells.map((cell) => `${cell.column}-${cell.row}`).join("_");
                return (
                  <article
                    className="slot-editor__paying-trace is-scatter-hit"
                    data-scatter-hit={index + 1}
                    data-scatter-hit-symbol={hit.symbol}
                    key={`scatter-hit-${hit.symbol}-${hitKey}`}
                    style={{ borderColor: "#22c55e" }}
                  >
                    <div className="slot-editor__paying-trace-header">
                      <span style={{ backgroundColor: "#22c55e" }} aria-hidden="true" />
                      <strong>{`${targetLayer?.label ?? `Carta ${hit.symbol}`} x${hit.count}`}</strong>
                    </div>
                    <div className="slot-editor__trace-symbol-row">
                      {hit.cells.map((cell, cellIndex) => (
                        <span
                          className="slot-editor__trace-symbol is-scatter"
                          data-scatter-symbol-thumb={cellIndex + 1}
                          key={`scatter-hit-cell-${hit.symbol}-${cell.column}-${cell.row}`}
                          title={targetLayer?.label}
                        >
                          {targetThumbnail ? (
                            <img src={targetThumbnail.src} alt="" />
                          ) : (
                            <span>{hit.symbol}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
              {traceSummary.wins.map((win, index) => {
                const targetLayer = reelCardBySymbol.get(win.symbol);
                const targetThumbnail = targetLayer?.symbolImages?.[0];
                const winKey = win.cells.map((cell) => `${cell.column}-${cell.row}`).join("_");
                return (
                  <button
                    className={[
                      "slot-editor__paying-trace",
                      selectedTraceIndex === index ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-paying-trace={index + 1}
                    data-paying-trace-symbol={win.symbol}
                    data-selected={selectedTraceIndex === index ? "true" : "false"}
                    key={`paying-trace-${win.direction}-${win.symbol}-${winKey}`}
                    onClick={() =>
                      onSelectedTraceChange?.(selectedTraceIndex === index ? null : index)
                    }
                    style={{ borderColor: win.color }}
                    type="button"
                  >
                    <div className="slot-editor__paying-trace-header">
                      <span style={{ backgroundColor: win.color }} aria-hidden="true" />
                      <strong>{`${targetLayer?.label ?? `Carta ${win.symbol}`} x${win.cells.length}`}</strong>
                    </div>
                    <div className="slot-editor__trace-symbol-row">
                      {win.cells.map((cell, cellIndex) => {
                        const actualSymbol = symbolAt(
                          traceSummary.symbols,
                          traceSummary.columns,
                          cell.column,
                          cell.row,
                        );
                        const isWildTransform =
                          actualSymbol !== null &&
                          wildSettings.enabled &&
                          wildSettings.wildSymbols.includes(actualSymbol) &&
                          actualSymbol !== win.symbol;
                        return (
                          <span
                            className={[
                              "slot-editor__trace-symbol",
                              isWildTransform ? "is-wild-transform" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            data-trace-symbol-thumb={cellIndex + 1}
                            data-wild-transform={isWildTransform ? "true" : "false"}
                            key={`trace-cell-${cell.column}-${cell.row}`}
                            title={
                              isWildTransform
                                ? `Wild transformada en ${targetLayer?.label ?? `Carta ${win.symbol}`}`
                                : targetLayer?.label
                            }
                          >
                            {targetThumbnail ? (
                              <img src={targetThumbnail.src} alt="" />
                            ) : (
                              <span>{win.symbol}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="slot-editor__rules-empty is-compact">
              <strong>Sin trazados pagados</strong>
              <span>Al completar un giro, aqui veras las lineas y sus Wild.</span>
            </div>
          )}
        </div>
      </aside>
    );
  }

  if (activeModuleId === ROUND_HISTORY_MODULE_ID) {
    const selectedHistoryRound =
      roundHistory.find((entry) => entry.round === selectedRoundHistoryRound) ?? roundHistory[0];

    return (
      <aside className="slot-editor__panel slot-editor__layer-panel" aria-label="Historial">
        <span className="slot-editor__panel-label">Layers</span>
        <div className="slot-editor__layer-panel-header">
          <strong className="slot-editor__layer-title">Historial de Rondas</strong>
        </div>
        <div className="slot-editor__round-history-list">
          {roundHistory.length > 0 ? (
            roundHistory.map((entry) => {
              const isSelected = selectedHistoryRound?.round === entry.round;
              return (
                <article
                  className={["slot-editor__round-history-row", isSelected ? "is-selected" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  data-round-history-row={entry.round}
                  key={`round-history-${entry.round}`}
                >
                  <button type="button" onClick={() => setSelectedRoundHistory(entry.round)}>
                    <strong>{`Ronda #${String(entry.round).padStart(6, "0")}`}</strong>
                    <span>{`${entry.spinType === "free-spin" ? "Freespin" : "Pagada"} / ${
                      entry.wins.length
                    } trazos / ${entry.scatterHits.length} scatter`}</span>
                  </button>
                  {isSelected ? (
                    <div className="slot-editor__round-history-trace-list">
                      {entry.wins.length > 0 || entry.scatterHits.length > 0 ? (
                        <>
                          {entry.wins.map((win, index) => {
                            const targetLayer = reelCardBySymbol.get(win.symbol);
                            const targetThumbnail = targetLayer?.symbolImages?.[0];
                            const winKey = win.cells
                              .map((cell) => `${cell.column}-${cell.row}`)
                              .join("_");
                            return (
                              <button
                                className={[
                                  "slot-editor__paying-trace",
                                  selectedTraceIndex === index ? "is-selected" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                data-round-history-trace={index + 1}
                                key={`history-trace-${entry.round}-${winKey}`}
                                onClick={() =>
                                  onSelectedTraceChange?.(
                                    selectedTraceIndex === index ? null : index,
                                  )
                                }
                                style={{ borderColor: win.color }}
                                type="button"
                              >
                                <div className="slot-editor__paying-trace-header">
                                  <span style={{ backgroundColor: win.color }} aria-hidden="true" />
                                  <strong>{`${targetLayer?.label ?? `Carta ${win.symbol}`} x${win.cells.length}`}</strong>
                                </div>
                                <div className="slot-editor__trace-symbol-row">
                                  {win.cells.map((cell, cellIndex) => (
                                    <span
                                      className="slot-editor__trace-symbol"
                                      data-trace-symbol-thumb={cellIndex + 1}
                                      key={`history-trace-cell-${cell.column}-${cell.row}`}
                                    >
                                      {targetThumbnail ? (
                                        <img src={targetThumbnail.src} alt="" />
                                      ) : (
                                        <span>{win.symbol}</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                          {entry.scatterHits.map((hit, index) => {
                            const targetLayer = reelCardBySymbol.get(hit.symbol);
                            const hitKey = hit.cells
                              .map((cell) => `${cell.column}-${cell.row}`)
                              .join("_");
                            return (
                              <article
                                className="slot-editor__paying-trace is-scatter-hit"
                                data-round-history-trace={`scatter-${index + 1}`}
                                key={`history-scatter-${entry.round}-${hit.symbol}-${hitKey}`}
                                style={{ borderColor: "#22c55e" }}
                              >
                                <div className="slot-editor__paying-trace-header">
                                  <span style={{ backgroundColor: "#22c55e" }} aria-hidden="true" />
                                  <strong>{`${targetLayer?.label ?? `Carta ${hit.symbol}`} x${hit.count}`}</strong>
                                </div>
                              </article>
                            );
                          })}
                        </>
                      ) : (
                        <div className="slot-editor__rules-empty is-compact">
                          <strong>Sin trazos pagados</strong>
                          <span>Esta ronda no tuvo lineas cobradas.</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="slot-editor__rules-empty is-compact">
              <strong>Sin rondas</strong>
              <span>Al completar un giro, aqui se guardara su historial.</span>
            </div>
          )}
        </div>
      </aside>
    );
  }

  if (activeModuleId === RULES_COMBINATIONS_MODULE_ID) {
    return (
      <aside className="slot-editor__panel slot-editor__layer-panel" aria-label="Combinaciones">
        <span className="slot-editor__panel-label">Reglas</span>
        <div className="slot-editor__layer-panel-header">
          <strong className="slot-editor__layer-title">Reglas y Combinaciones</strong>
        </div>
        <div className="slot-editor__rules-side-list">
          {reelCardCatalogItems.length > 0 ? (
            reelCardCatalogItems
              .filter(({ symbolIndex }) => !groupedSymbolSet.has(symbolIndex))
              .map(({ layer, symbolIndex }) => {
                const isScatter =
                  scatterSettings.enabled && scatterSettings.scatterSymbols.includes(symbolIndex);
                const isWild =
                  wildSettings.enabled && wildSettings.wildSymbols.includes(symbolIndex);
                const isJackpot =
                  jackpotSettings.enabled && jackpotSettings.jackpotSymbols.includes(symbolIndex);
                const thumbnail = layer.symbolImages?.[0];

                return (
                  <article
                    className={[
                      "slot-editor__rules-side-card",
                      isScatter ? "is-scatter" : "",
                      isWild ? "is-wild" : "",
                      isJackpot ? "is-jackpot" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={layer.id}
                  >
                    <div className="slot-editor__rules-side-thumbnail">
                      {thumbnail ? <img src={thumbnail.src} alt="" /> : <span>{symbolIndex}</span>}
                    </div>
                    <div className="slot-editor__rules-side-body">
                      <strong>{layer.label}</strong>
                      <span>
                        {[
                          isScatter ? "Scatter" : "",
                          isWild ? "Wild" : "",
                          isJackpot ? "Jackpot" : "",
                        ]
                          .filter(Boolean)
                          .join(" / ") || "Normal"}
                      </span>
                    </div>
                    <label className="slot-editor__rules-weight-control">
                      <span>Peso</span>
                      <input
                        aria-label={`Peso de ${layer.label}`}
                        min="0"
                        step="0.1"
                        type="number"
                        value={normalizedSymbolWeights[symbolIndex - 1] ?? 1}
                        onInput={(event) =>
                          setSymbolWeight(symbolIndex, Number(event.currentTarget.value))
                        }
                      />
                    </label>
                    <div className="slot-editor__rules-probability">
                      <span>%</span>
                      <strong>{`${(symbolWeightPercentages[symbolIndex - 1] ?? 0).toFixed(2)}%`}</strong>
                    </div>
                  </article>
                );
              })
          ) : (
            <div className="slot-editor__rules-empty is-compact">
              <strong>Sin cartas</strong>
              <span>Crea placeholders en Reels y Cartas.</span>
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="slot-editor__panel slot-editor__layer-panel" aria-label="Layers">
      <span className="slot-editor__panel-label">Layers</span>
      <div className="slot-editor__layer-panel-header">
        <strong className="slot-editor__layer-title">{activeModuleTitle}</strong>
        <fieldset
          className="slot-editor__elevator slot-editor__selected-layer-elevator"
          aria-label="Orden del layer seleccionado"
          disabled={!selectedLayer}
        >
          <button
            className="slot-editor__selected-layer-order-button"
            type="button"
            aria-label="Subir layer seleccionado"
            onClick={(event) => {
              event.stopPropagation();
              if (selectedLayer) {
                moveLayer(selectedLayer.id, "up");
              }
            }}
          >
            &#9650;
          </button>
          <button
            className="slot-editor__selected-layer-order-button"
            type="button"
            aria-label="Bajar layer seleccionado"
            onClick={(event) => {
              event.stopPropagation();
              if (selectedLayer) {
                moveLayer(selectedLayer.id, "down");
              }
            }}
          >
            &#9660;
          </button>
        </fieldset>
      </div>
      <div className="slot-editor__layers">
        {layers.map((layer) => (
          <article
            className={[
              "slot-editor__layer",
              `is-${layer.elementType}`,
              selectedLayerId === layer.id ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={layer.id}
            onClick={() => setSelectedLayer(layer.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedLayer(layer.id);
              }
            }}
          >
            <span className="slot-editor__layer-name">{renderLayerTitle(layer)}</span>
            <button
              className={`slot-editor__layer-action slot-editor__visibility-button ${
                layer.visible ? "" : "is-hidden"
              }`}
              type="button"
              aria-label={`${layer.visible ? "Ocultar" : "Mostrar"} ${layer.label}`}
              aria-pressed={!layer.visible}
              onClick={(event) => {
                event.stopPropagation();
                toggleLayerVisibility(layer.id);
              }}
            >
              <span className="slot-editor__visibility-eye" aria-hidden="true">
                &#128065;
              </span>
              <span className="slot-editor__visibility-slash" aria-hidden="true" />
            </button>
            <button
              className="slot-editor__layer-action slot-editor__settings-action"
              type="button"
              aria-label={`Configurar efectos de ${layer.label}`}
              onClick={(event) => event.stopPropagation()}
            >
              &#9881;
            </button>
            {layer.elementType === "card" ? (
              <>
                <button
                  className="slot-editor__layer-action slot-editor__load-symbol-action"
                  type="button"
                  aria-label={`Cargar simbolo de ${layer.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedLayer(layer.id);
                    document.getElementById(`symbol-files-${layer.id}`)?.click();
                  }}
                >
                  &#8593;
                </button>
                <input
                  id={`symbol-files-${layer.id}`}
                  className="slot-editor__symbol-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  aria-label={`Seleccionar imagenes para ${layer.label}`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    event.stopPropagation();
                    const files = Array.from(event.currentTarget.files ?? []);
                    if (files.length === 0) {
                      return;
                    }
                    setLayerSymbolImages(
                      layer.id,
                      files.map((file) => ({
                        name: file.name,
                        src: URL.createObjectURL(file),
                      })),
                    );
                    event.currentTarget.value = "";
                  }}
                />
              </>
            ) : null}
            <button
              className="slot-editor__layer-action slot-editor__delete-action"
              type="button"
              aria-label={`Eliminar ${layer.label}`}
              onClick={(event) => {
                event.stopPropagation();
                removeLayer(layer.id);
              }}
            >
              X
            </button>
          </article>
        ))}
      </div>
      {selectedLayer ? (
        <section className="slot-editor__properties" aria-label="Propiedades del layer">
          <strong>Propiedades</strong>
          <label>
            <span>X</span>
            <input
              aria-label="Posicion X"
              type="number"
              value={selectedLayer.x}
              onInput={(event) =>
                updateLayer(selectedLayer.id, { x: Number(event.currentTarget.value) })
              }
            />
          </label>
          <label>
            <span>Y</span>
            <input
              aria-label="Posicion Y"
              type="number"
              value={selectedLayer.y}
              onInput={(event) =>
                updateLayer(selectedLayer.id, { y: Number(event.currentTarget.value) })
              }
            />
          </label>
          <label>
            <span>Tamano</span>
            <input
              aria-label="Tamano"
              type="number"
              min="0.2"
              max="8"
              step="0.05"
              value={selectedLayer.size}
              onInput={(event) =>
                updateLayer(selectedLayer.id, { size: Number(event.currentTarget.value) })
              }
            />
          </label>
          {selectedCardPixelSize ? (
            <div className="slot-editor__property-readout" data-card-pixel-size="true">
              <span>Tamano px</span>
              <strong>{`${selectedCardPixelSize.width} x ${selectedCardPixelSize.height} px`}</strong>
            </div>
          ) : null}
          {selectedLayer.elementType === "card" && selectedLayer.symbolImages?.length ? (
            <div className="slot-editor__property-readout" data-card-image-count="true">
              <span>Imagenes</span>
              <strong>{`${selectedLayer.symbolImages.length} imagenes`}</strong>
            </div>
          ) : null}
          <label className="slot-editor__property-color">
            <span>Color</span>
            <input
              aria-label="Color del layer"
              type="color"
              value={selectedLayer.color}
              onInput={(event) =>
                updateLayer(selectedLayer.id, { color: event.currentTarget.value })
              }
            />
          </label>
        </section>
      ) : null}
    </aside>
  );
}
