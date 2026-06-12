import { type CSSProperties, useEffect } from "react";
import { EditorCanvas } from "./components/EditorCanvas";
import { LayerPanel } from "./components/LayerPanel";
import { ModulePanel } from "./components/ModulePanel";
import { useEditorStore } from "./store/editorStore";
import "./slot-editor.css";

function hexToRgbTriplet(hexColor: string): string {
  const normalized = hexColor.replace("#", "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;

  const value = Number.parseInt(fullHex, 16);
  if (!Number.isFinite(value)) {
    return "248, 192, 72";
  }

  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea" ||
    target.isContentEditable
  );
}

export function SlotEditorApp() {
  const accentColor = useEditorStore((state) => state.accentColor);
  const glowColor = useEditorStore((state) => state.glowColor);
  const glowEnabled = useEditorStore((state) => state.glowEnabled);
  const buttonGlowDistance = useEditorStore((state) => state.buttonGlowDistance);
  const hoverGlowDistance = useEditorStore((state) => state.hoverGlowDistance);
  const dataColor = useEditorStore((state) => state.dataColor);
  const textColor = useEditorStore((state) => state.textColor);
  const hoverColor = useEditorStore((state) => state.hoverColor);
  const undo = useEditorStore((state) => state.undo);
  const buttonColorRgb = hexToRgbTriplet(accentColor);
  const glowColorRgb = hexToRgbTriplet(glowColor);
  const hoverColorRgb = hexToRgbTriplet(hoverColor);
  const buttonGlowOuterDistance = Math.round(buttonGlowDistance * 1.8);
  const hoverGlowOuterDistance = Math.round(hoverGlowDistance * 1.9);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      const arrowDeltaByKey: Partial<Record<string, { x: number; y: number }>> = {
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
      };
      const delta = arrowDeltaByKey[event.key];
      if (!delta || isEditableKeyboardTarget(event.target)) {
        return;
      }

      const { activeModuleId, canvasAspectRatio, layers, selectedLayerId, updateLayer } =
        useEditorStore.getState();
      if (!selectedLayerId) {
        return;
      }
      const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
      if (
        !selectedLayer ||
        selectedLayer.moduleId !== activeModuleId ||
        selectedLayer.canvasAspectRatio !== canvasAspectRatio
      ) {
        return;
      }

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      updateLayer(selectedLayer.id, {
        x: selectedLayer.x + delta.x * step,
        y: selectedLayer.y + delta.y * step,
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  return (
    <section
      className="slot-editor"
      style={
        {
          "--slot-editor-button-color": accentColor,
          "--slot-editor-button-color-rgb": buttonColorRgb,
          "--slot-editor-glow": glowColor,
          "--slot-editor-glow-rgb": glowColorRgb,
          "--slot-editor-button-glow-distance": `${buttonGlowDistance}px`,
          "--slot-editor-button-glow-outer-distance": `${buttonGlowOuterDistance}px`,
          "--slot-editor-button-glow-alpha": glowEnabled ? "0.42" : "0",
          "--slot-editor-button-glow-outer-alpha": glowEnabled ? "0.18" : "0",
          "--slot-editor-data-color": dataColor,
          "--slot-editor-text-color": textColor,
          "--slot-editor-hover": hoverColor,
          "--slot-editor-hover-rgb": hoverColorRgb,
          "--slot-editor-hover-glow-distance": `${hoverGlowDistance}px`,
          "--slot-editor-hover-glow-outer-distance": `${hoverGlowOuterDistance}px`,
          "--slot-editor-hover-glow-alpha": glowEnabled ? "0.56" : "0",
          "--slot-editor-hover-glow-outer-alpha": glowEnabled ? "0.26" : "0",
          "--hud-label-gold-rgb": glowColorRgb,
          "--hud-button-glow": `rgba(${glowColorRgb}, ${glowEnabled ? "0.62" : "0"})`,
        } as CSSProperties
      }
    >
      <ModulePanel />
      <EditorCanvas />
      <LayerPanel />
    </section>
  );
}
