import { useState } from "react";
import {
  BUTTONS_DATA_MODULE_ID,
  EDITOR_BUTTON_OPTIONS,
  EDITOR_DATA_OPTIONS,
  EDITOR_MODULES,
  REELS_CARDS_MODULE_ID,
} from "../config/editorModules.config";
import type { EditorModuleId } from "../editor.types";
import { useEditorStore } from "../store/editorStore";

export function ModulePanel() {
  const [openModuleIds, setOpenModuleIds] = useState<Record<EditorModuleId, boolean>>({
    [BUTTONS_DATA_MODULE_ID]: false,
    [REELS_CARDS_MODULE_ID]: false,
  });
  const {
    accentColor,
    activeModuleId,
    addButton,
    addData,
    addReel,
    buttonGlowDistance,
    dataColor,
    glowColor,
    glowEnabled,
    hoverGlowDistance,
    hoverColor,
    moduleVisibility,
    reelSettings,
    removeReel,
    setAccentColor,
    setActiveModule,
    setButtonGlowDistance,
    setDataColor,
    setGlowColor,
    setGlowEnabled,
    setHoverGlowDistance,
    setHoverColor,
    setReelMode,
    setReelSetting,
    setReelStopMode,
    setTextColor,
    textColor,
    toggleModuleVisibility,
  } = useEditorStore();

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

          <label className="slot-editor__color-control">
            <span>Color hover</span>
            <input
              aria-label="Color hover"
              type="color"
              value={hoverColor}
              onInput={(event) => setHoverColor(event.currentTarget.value)}
            />
          </label>

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
                : renderReelsCardsActions()}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
