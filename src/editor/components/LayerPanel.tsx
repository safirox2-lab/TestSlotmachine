import { EDITOR_MODULES } from "../config/editorModules.config";
import { useEditorStore } from "../store/editorStore";

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

export function LayerPanel() {
  const {
    activeModuleId,
    getActiveModuleLayers,
    moveLayer,
    removeLayer,
    reelSettings,
    selectedLayerId,
    setSelectedLayer,
    setLayerSymbolImages,
    toggleLayerVisibility,
    updateLayer,
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
