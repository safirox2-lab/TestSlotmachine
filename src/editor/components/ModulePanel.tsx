import { useState } from "react";
import {
  BUTTONS_DATA_MODULE_ID,
  EDITOR_BUTTON_OPTIONS,
  EDITOR_DATA_OPTIONS,
  EDITOR_MODULES,
  REELS_CARDS_MODULE_ID,
  RULES_COMBINATIONS_MODULE_ID,
  RULES_WINS_MODULE_ID,
} from "../config/editorModules.config";
import type { EditorModuleId } from "../editor.types";
import { useEditorStore } from "../store/editorStore";

export function ModulePanel() {
  const [openModuleIds, setOpenModuleIds] = useState<Record<EditorModuleId, boolean>>({
    [BUTTONS_DATA_MODULE_ID]: false,
    [REELS_CARDS_MODULE_ID]: false,
    [RULES_WINS_MODULE_ID]: false,
    [RULES_COMBINATIONS_MODULE_ID]: false,
  });
  const {
    accentColor,
    activeModuleId,
    addButton,
    addData,
    addReel,
    buttonGlowDistance,
    cardGroupSettings,
    canvasAspectRatio,
    dataColor,
    glowColor,
    glowEnabled,
    hoverGlowDistance,
    hoverColor,
    jackpotSettings,
    layers,
    lineTraceSettings,
    lineValidationMode,
    moduleVisibility,
    reelSettings,
    removeReel,
    scatterSettings,
    setAccentColor,
    setActiveModule,
    setButtonGlowDistance,
    setCardGroupCount,
    setCardGroupSize,
    setCardGroupSymbol,
    setDataColor,
    setGlowColor,
    setGlowEnabled,
    setHoverGlowDistance,
    setHoverColor,
    setJackpotCount,
    setJackpotEnabled,
    setJackpotSymbol,
    setLineTraceEnabled,
    setLineValidationMode,
    setReelMode,
    setReelSetting,
    setReelSlotFrameEnabled,
    setReelStopMode,
    setScatterCount,
    setScatterEnabled,
    setScatterReadMode,
    setScatterSymbol,
    setTextColor,
    setWildCount,
    setWildEnabled,
    setWildLineRule,
    setWildSymbol,
    textColor,
    toggleModuleVisibility,
    wildSettings,
  } = useEditorStore();
  const shouldShowHoverControls = canvasAspectRatio === "16:9";
  const reelCardOptions = layers
    .filter(
      (layer) =>
        layer.canvasAspectRatio === canvasAspectRatio &&
        layer.elementType === "card" &&
        layer.moduleId === REELS_CARDS_MODULE_ID &&
        Number(layer.label.replace("Carta ", "")) <= reelSettings.cardCount,
    )
    .sort((leftLayer, rightLayer) => {
      const leftIndex = Number(leftLayer.label.replace("Carta ", ""));
      const rightIndex = Number(rightLayer.label.replace("Carta ", ""));
      return leftIndex - rightIndex;
    })
    .map((layer) => {
      const symbolIndex = Number(layer.label.replace("Carta ", ""));
      return {
        label: layer.label,
        symbolIndex,
      };
    });
  const specialRuleSymbols = new Set([
    ...(scatterSettings.enabled ? scatterSettings.scatterSymbols : []),
    ...(wildSettings.enabled ? wildSettings.wildSymbols : []),
    ...(jackpotSettings.enabled ? jackpotSettings.jackpotSymbols : []),
  ]);
  const getAvailableGroupCardOptions = (
    currentGroupIndex: number,
    currentSymbolPosition: number,
    currentSymbolIndex: number,
  ) => {
    const takenGroupSymbols = new Set(
      cardGroupSettings.groups.flatMap((group, groupIndex) =>
        groupIndex === currentGroupIndex
          ? group.filter((_, position) => position !== currentSymbolPosition)
          : group,
      ),
    );

    return reelCardOptions.filter(
      (option) =>
        option.symbolIndex === currentSymbolIndex ||
        (!specialRuleSymbols.has(option.symbolIndex) && !takenGroupSymbols.has(option.symbolIndex)),
    );
  };

  const toggleModule = (moduleId: EditorModuleId) => {
    setActiveModule(moduleId);
    setOpenModuleIds((current) => ({
      ...current,
      [moduleId]: !current[moduleId],
    }));
  };

  const renderButtonsDataActions = () => (
    <>
      <details>
        <summary>
          <span>Agregar Boton</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list">
          {EDITOR_BUTTON_OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => addButton(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </details>

      <details>
        <summary>
          <span>Agregar Datos</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list">
          {EDITOR_DATA_OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => addData(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </details>

      <details>
        <summary>
          <span>Colores</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list">
          <label className="slot-editor__color-control">
            <span>Color de botones</span>
            <input
              aria-label="Color de botones"
              type="color"
              value={accentColor}
              onInput={(event) => setAccentColor(event.currentTarget.value)}
            />
          </label>

          <label className="slot-editor__color-control">
            <span>Color del Texto</span>
            <input
              aria-label="Color del Texto"
              type="color"
              value={textColor}
              onInput={(event) => setTextColor(event.currentTarget.value)}
            />
          </label>

          <label className="slot-editor__color-control">
            <span>Color de datos</span>
            <input
              aria-label="Color de datos"
              type="color"
              value={dataColor}
              onInput={(event) => setDataColor(event.currentTarget.value)}
            />
          </label>

          <label className="slot-editor__color-control">
            <span>Color del glow</span>
            <input
              aria-label="Color del glow"
              type="color"
              value={glowColor}
              onInput={(event) => setGlowColor(event.currentTarget.value)}
            />
          </label>

          {shouldShowHoverControls ? (
            <label className="slot-editor__color-control">
              <span>Color hover</span>
              <input
                aria-label="Color hover"
                type="color"
                value={hoverColor}
                onInput={(event) => setHoverColor(event.currentTarget.value)}
              />
            </label>
          ) : null}

          <label className="slot-editor__toggle-control">
            <span>Glow activo</span>
            <input
              aria-label="Glow activo"
              type="checkbox"
              checked={glowEnabled}
              onChange={(event) => setGlowEnabled(event.currentTarget.checked)}
            />
          </label>

          <label className="slot-editor__number-control">
            <span>Distancia glow botones</span>
            <input
              aria-label="Distancia glow botones"
              min="0"
              max="160"
              type="number"
              value={buttonGlowDistance}
              onInput={(event) => setButtonGlowDistance(Number(event.currentTarget.value))}
            />
          </label>

          {shouldShowHoverControls ? (
            <label className="slot-editor__number-control">
              <span>Distancia glow hover</span>
              <input
                aria-label="Distancia glow hover"
                min="0"
                max="160"
                type="number"
                value={hoverGlowDistance}
                onInput={(event) => setHoverGlowDistance(Number(event.currentTarget.value))}
              />
            </label>
          ) : null}
        </div>
      </details>
    </>
  );

  const renderReelsCardsActions = () => (
    <>
      <details>
        <summary>
          <span>Agregar Reel</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <strong>Tipo De Reels</strong>
          <fieldset className="slot-editor__segmented-control" aria-label="Tipo De Reels">
            <button
              type="button"
              aria-label="Reel procedural"
              aria-pressed={reelSettings.mode === "procedural"}
              onClick={() => setReelMode("procedural")}
            >
              Procedural
            </button>
            <button
              type="button"
              aria-label="Reel por cinta"
              aria-pressed={reelSettings.mode === "tape"}
              onClick={() => setReelMode("tape")}
            >
              Cinta
            </button>
          </fieldset>
          <label className="slot-editor__number-control">
            <span>Cantidad de Cartas Actual</span>
            <input
              aria-label="Cantidad de Cartas Actual"
              min="1"
              type="number"
              value={reelSettings.cardCount}
              onInput={(event) => setReelSetting("cardCount", Number(event.currentTarget.value))}
            />
          </label>
          <label className="slot-editor__number-control">
            <span>Cantidad de Rodillos</span>
            <input
              aria-label="Cantidad de Rodillos"
              min="1"
              max="8"
              type="number"
              value={reelSettings.columns}
              onInput={(event) => setReelSetting("columns", Number(event.currentTarget.value))}
            />
          </label>
          <label className="slot-editor__number-control">
            <span>Cantidad de Filas</span>
            <input
              aria-label="Cantidad de Filas"
              min="1"
              max="8"
              type="number"
              value={reelSettings.rows}
              onInput={(event) => setReelSetting("rows", Number(event.currentTarget.value))}
            />
          </label>
          <label className="slot-editor__number-control">
            <span>Padding X</span>
            <input
              aria-label="Padding X"
              min="0"
              max="80"
              type="number"
              value={reelSettings.paddingX}
              onInput={(event) => setReelSetting("paddingX", Number(event.currentTarget.value))}
            />
          </label>
          <label className="slot-editor__number-control">
            <span>Padding Y</span>
            <input
              aria-label="Padding Y"
              min="0"
              max="80"
              type="number"
              value={reelSettings.paddingY}
              onInput={(event) => setReelSetting("paddingY", Number(event.currentTarget.value))}
            />
          </label>
          <label className="slot-editor__number-control">
            <span>Tamano</span>
            <input
              aria-label="Tamano del grid"
              min="0.2"
              max="3"
              step="0.05"
              type="number"
              value={reelSettings.scale}
              onInput={(event) => setReelSetting("scale", Number(event.currentTarget.value))}
            />
          </label>
          <label className="slot-editor__toggle-control">
            <span>Marco de slots</span>
            <input
              aria-label="Marco de slots"
              type="checkbox"
              checked={reelSettings.slotFrameEnabled}
              onChange={(event) => setReelSlotFrameEnabled(event.currentTarget.checked)}
            />
          </label>
          <button type="button" onClick={addReel}>
            Crear placeholders
          </button>
          <button type="button" onClick={removeReel}>
            Eliminar Grid y Cartas
          </button>
        </div>
      </details>
      <details>
        <summary>
          <span>Reel Stop</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <fieldset className="slot-editor__segmented-control is-reel-stop" aria-label="Reel Stop">
            <button
              type="button"
              aria-label="Detener columnas al mismo tiempo"
              aria-pressed={reelSettings.stopMode === "all-at-once"}
              onClick={() => setReelStopMode("all-at-once")}
            >
              Todas
            </button>
            <button
              type="button"
              aria-label="Detener columnas izquierda a derecha"
              aria-pressed={reelSettings.stopMode === "left-to-right"}
              onClick={() => setReelStopMode("left-to-right")}
            >
              Izq a Der
            </button>
            <button
              type="button"
              aria-label="Detener columnas aleatorio uno por uno"
              aria-pressed={reelSettings.stopMode === "random-one-by-one"}
              onClick={() => setReelStopMode("random-one-by-one")}
            >
              Aleatorio
            </button>
          </fieldset>
        </div>
      </details>
      <details>
        <summary>
          <span>Scatter</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <label className="slot-editor__toggle-control">
            <span>Tiene Scatter</span>
            <input
              aria-label="Tiene Scatter"
              type="checkbox"
              checked={scatterSettings.enabled}
              onChange={(event) => setScatterEnabled(event.currentTarget.checked)}
            />
          </label>
          {scatterSettings.enabled ? (
            <>
              <label className="slot-editor__number-control">
                <span># Scatter</span>
                <input
                  aria-label="# Scatter"
                  min="1"
                  max={Math.max(1, reelSettings.cardCount)}
                  type="number"
                  value={scatterSettings.scatterCount}
                  onInput={(event) => setScatterCount(Number(event.currentTarget.value))}
                />
              </label>
              {scatterSettings.scatterSymbols.map((symbolIndex, index) => (
                <label
                  className="slot-editor__select-control"
                  // biome-ignore lint/suspicious/noArrayIndexKey: scatter rows are fixed positional settings controlled by count.
                  key={`scatter-symbol-${index}`}
                >
                  <span>{`Scatter ${index + 1}`}</span>
                  <select
                    aria-label={`Carta Scatter ${index + 1}`}
                    disabled={reelCardOptions.length === 0}
                    value={symbolIndex}
                    onChange={(event) => setScatterSymbol(index, Number(event.currentTarget.value))}
                  >
                    {reelCardOptions.length === 0 ? (
                      <option value={symbolIndex}>Sin cartas</option>
                    ) : (
                      reelCardOptions.map((option) => (
                        <option key={option.symbolIndex} value={option.symbolIndex}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              ))}
            </>
          ) : null}
        </div>
      </details>
      <details>
        <summary>
          <span>Wild</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <label className="slot-editor__toggle-control">
            <span>Tiene Wild</span>
            <input
              aria-label="Tiene Wild"
              type="checkbox"
              checked={wildSettings.enabled}
              onChange={(event) => setWildEnabled(event.currentTarget.checked)}
            />
          </label>
          {wildSettings.enabled ? (
            <>
              <label className="slot-editor__number-control">
                <span># Wild</span>
                <input
                  aria-label="# Wild"
                  min="1"
                  max={Math.max(1, reelSettings.cardCount)}
                  type="number"
                  value={wildSettings.wildCount}
                  onInput={(event) => setWildCount(Number(event.currentTarget.value))}
                />
              </label>
              {wildSettings.wildSymbols.map((symbolIndex, index) => (
                <label
                  className="slot-editor__select-control"
                  // biome-ignore lint/suspicious/noArrayIndexKey: wild rows are fixed positional settings controlled by count.
                  key={`wild-symbol-${index}`}
                >
                  <span>{`Wild ${index + 1}`}</span>
                  <select
                    aria-label={`Carta Wild ${index + 1}`}
                    disabled={reelCardOptions.length === 0}
                    value={symbolIndex}
                    onChange={(event) => setWildSymbol(index, Number(event.currentTarget.value))}
                  >
                    {reelCardOptions.length === 0 ? (
                      <option value={symbolIndex}>Sin cartas</option>
                    ) : (
                      reelCardOptions.map((option) => (
                        <option key={option.symbolIndex} value={option.symbolIndex}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              ))}
            </>
          ) : null}
        </div>
      </details>
      <details>
        <summary>
          <span>Jackpot</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <label className="slot-editor__toggle-control">
            <span>Tiene Jackpot</span>
            <input
              aria-label="Tiene Jackpot"
              type="checkbox"
              checked={jackpotSettings.enabled}
              onChange={(event) => setJackpotEnabled(event.currentTarget.checked)}
            />
          </label>
          {jackpotSettings.enabled ? (
            <>
              <label className="slot-editor__number-control">
                <span># Jackpot</span>
                <input
                  aria-label="# Jackpot"
                  min="1"
                  max={Math.max(1, reelSettings.cardCount)}
                  type="number"
                  value={jackpotSettings.jackpotCount}
                  onInput={(event) => setJackpotCount(Number(event.currentTarget.value))}
                />
              </label>
              {jackpotSettings.jackpotSymbols.map((symbolIndex, index) => (
                <label
                  className="slot-editor__select-control"
                  // biome-ignore lint/suspicious/noArrayIndexKey: jackpot rows are fixed positional settings controlled by count.
                  key={`jackpot-symbol-${index}`}
                >
                  <span>{`Jackpot ${index + 1}`}</span>
                  <select
                    aria-label={`Carta Jackpot ${index + 1}`}
                    disabled={reelCardOptions.length === 0}
                    value={symbolIndex}
                    onChange={(event) => setJackpotSymbol(index, Number(event.currentTarget.value))}
                  >
                    {reelCardOptions.length === 0 ? (
                      <option value={symbolIndex}>Sin cartas</option>
                    ) : (
                      reelCardOptions.map((option) => (
                        <option key={option.symbolIndex} value={option.symbolIndex}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              ))}
            </>
          ) : null}
        </div>
      </details>
    </>
  );

  const renderRulesWinsActions = () => (
    <>
      <details>
        <summary>
          <span>Trazados</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <label className="slot-editor__toggle-control">
            <span>Horizontal</span>
            <input
              aria-label="Trazado Horizontal"
              type="checkbox"
              checked={lineTraceSettings.horizontal}
              onChange={(event) => setLineTraceEnabled("horizontal", event.currentTarget.checked)}
            />
          </label>
          <label className="slot-editor__toggle-control">
            <span>Vertical</span>
            <input
              aria-label="Trazado Vertical"
              type="checkbox"
              checked={lineTraceSettings.vertical}
              onChange={(event) => setLineTraceEnabled("vertical", event.currentTarget.checked)}
            />
          </label>
          <label className="slot-editor__toggle-control">
            <span>Diagonal</span>
            <input
              aria-label="Trazado Diagonal"
              type="checkbox"
              checked={lineTraceSettings.diagonal}
              onChange={(event) => setLineTraceEnabled("diagonal", event.currentTarget.checked)}
            />
          </label>
          <label className="slot-editor__toggle-control">
            <span>Zigzag</span>
            <input
              aria-label="Trazado Zigzag"
              type="checkbox"
              checked={lineTraceSettings.zigzag}
              onChange={(event) => setLineTraceEnabled("zigzag", event.currentTarget.checked)}
            />
          </label>
          <label className="slot-editor__toggle-control">
            <span>1er Reel</span>
            <input
              aria-label="Trazado 1er Reel"
              type="checkbox"
              checked={lineTraceSettings.firstReel}
              onChange={(event) => setLineTraceEnabled("firstReel", event.currentTarget.checked)}
            />
          </label>
        </div>
      </details>
      <details>
        <summary>
          <span>Lectura de Scatter</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <fieldset className="slot-editor__segmented-control" aria-label="Lectura de Scatter">
            <button
              type="button"
              aria-label="Scatter con valor individual"
              aria-pressed={scatterSettings.readMode === "individual"}
              onClick={() => setScatterReadMode("individual")}
            >
              Valor Individual
            </button>
            <button
              type="button"
              aria-label="Scatter cuenta para trazados"
              aria-pressed={scatterSettings.readMode === "traces"}
              onClick={() => setScatterReadMode("traces")}
            >
              Cuenta trazados
            </button>
          </fieldset>
        </div>
      </details>
      <details>
        <summary>
          <span>Validacion de Trazados</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <fieldset className="slot-editor__segmented-control" aria-label="Validacion de Trazados">
            <button
              type="button"
              aria-label="Validacion clasica de trazados"
              aria-pressed={lineValidationMode === "classic"}
              onClick={() => setLineValidationMode("classic")}
            >
              Clasico
            </button>
            <button
              type="button"
              aria-label="Validacion cascada de trazados"
              aria-pressed={lineValidationMode === "cascade"}
              onClick={() => setLineValidationMode("cascade")}
            >
              Cascada
            </button>
          </fieldset>
        </div>
      </details>
    </>
  );

  const renderRulesCombinationsActions = () => (
    <>
      <details>
        <summary>
          <span>Catalogo de Cartas</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__module-note">
          <span>Cartas normales, Scatter, Wild y Jackpot.</span>
        </div>
      </details>
      <details>
        <summary>
          <span>Regla de Wild</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <label className="slot-editor__toggle-control">
            <span>Mayor pago</span>
            <input
              aria-label="Wild solo apoya la linea de mayor pago"
              type="checkbox"
              checked={wildSettings.lineRule === "highest-paying"}
              onChange={(event) =>
                setWildLineRule(event.currentTarget.checked ? "highest-paying" : "all")
              }
            />
          </label>
        </div>
      </details>
      <details>
        <summary>
          <span>Grupos de Cartas</span>
          <span className="slot-editor__submenu-chevron" aria-hidden="true" />
        </summary>
        <div className="slot-editor__option-list slot-editor__reel-options">
          <label className="slot-editor__number-control">
            <span># Grupos</span>
            <input
              aria-label="# Grupos"
              min="0"
              max={Math.max(0, reelSettings.cardCount)}
              type="number"
              value={cardGroupSettings.groupCount}
              onInput={(event) => setCardGroupCount(Number(event.currentTarget.value))}
            />
          </label>
          {cardGroupSettings.groups.map((group, groupIndex) => (
            <div
              className="slot-editor__group-rule-card"
              // biome-ignore lint/suspicious/noArrayIndexKey: group rows are fixed positional settings controlled by count.
              key={`card-group-${groupIndex}`}
            >
              <strong>{`Grupo ${groupIndex + 1}`}</strong>
              <label className="slot-editor__number-control">
                <span>{`# Cartas Grupo ${groupIndex + 1}`}</span>
                <input
                  aria-label={`# Cartas Grupo ${groupIndex + 1}`}
                  min="1"
                  max={Math.max(1, reelSettings.cardCount)}
                  type="number"
                  value={group.length}
                  onInput={(event) =>
                    setCardGroupSize(groupIndex, Number(event.currentTarget.value))
                  }
                />
              </label>
              {group.map((symbolIndex, symbolIndexPosition) => (
                <label
                  className="slot-editor__select-control"
                  // biome-ignore lint/suspicious/noArrayIndexKey: group symbol slots are fixed positional settings controlled by group size.
                  key={`card-group-${groupIndex}-symbol-${symbolIndexPosition}`}
                >
                  <span>{`Carta ${symbolIndexPosition + 1}`}</span>
                  <select
                    aria-label={`Carta Grupo ${groupIndex + 1}.${symbolIndexPosition + 1}`}
                    disabled={reelCardOptions.length === 0}
                    value={symbolIndex}
                    onChange={(event) =>
                      setCardGroupSymbol(
                        groupIndex,
                        symbolIndexPosition,
                        Number(event.currentTarget.value),
                      )
                    }
                  >
                    {getAvailableGroupCardOptions(groupIndex, symbolIndexPosition, symbolIndex)
                      .length === 0 ? (
                      <option value={symbolIndex}>Sin cartas</option>
                    ) : (
                      getAvailableGroupCardOptions(
                        groupIndex,
                        symbolIndexPosition,
                        symbolIndex,
                      ).map((option) => (
                        <option key={option.symbolIndex} value={option.symbolIndex}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              ))}
            </div>
          ))}
        </div>
      </details>
    </>
  );

  return (
    <aside className="slot-editor__panel slot-editor__module-panel" aria-label="Modulos">
      <span className="slot-editor__panel-label">Modulos</span>
      {EDITOR_MODULES.map((module) => {
        const isModuleOpen = openModuleIds[module.id];
        const isModuleVisible = moduleVisibility[module.id];

        return (
          <section
            className={`slot-editor__module ${activeModuleId === module.id ? "is-active" : ""}`}
            key={module.id}
            onPointerDownCapture={() => {
              if (activeModuleId !== module.id) {
                setActiveModule(module.id);
              }
            }}
          >
            <header className="slot-editor__module-header">
              <button
                className="slot-editor__module-title-button"
                type="button"
                aria-expanded={isModuleOpen}
                aria-controls={`slot-editor-module-${module.id}-actions`}
                aria-label={`${isModuleOpen ? "Contraer" : "Desplegar"} modulo ${module.title}`}
                onClick={() => toggleModule(module.id)}
              >
                <strong>{module.title}</strong>
                <span
                  className={`slot-editor__module-chevron ${
                    isModuleOpen ? "is-open" : "is-closed"
                  }`}
                  aria-hidden="true"
                />
              </button>
              <button
                className={`slot-editor__icon-button slot-editor__visibility-button ${
                  isModuleVisible ? "" : "is-hidden"
                }`}
                type="button"
                aria-label={`${isModuleVisible ? "Ocultar" : "Mostrar"} modulo ${module.title}`}
                aria-pressed={!isModuleVisible}
                onClick={() => toggleModuleVisibility(module.id)}
              >
                <span className="slot-editor__visibility-eye" aria-hidden="true">
                  &#128065;
                </span>
                <span className="slot-editor__visibility-slash" aria-hidden="true" />
              </button>
            </header>

            <div
              id={`slot-editor-module-${module.id}-actions`}
              className="slot-editor__module-actions"
              hidden={!isModuleOpen}
            >
              {module.id === BUTTONS_DATA_MODULE_ID
                ? renderButtonsDataActions()
                : module.id === REELS_CARDS_MODULE_ID
                  ? renderReelsCardsActions()
                  : module.id === RULES_WINS_MODULE_ID
                    ? renderRulesWinsActions()
                    : renderRulesCombinationsActions()}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
