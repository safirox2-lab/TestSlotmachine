# Slot Modular Editor

Editor modular para configurar una slot machine desde una superficie visual React. La pantalla principal abre directamente el editor.

## Ejecutar

```bash
npm install
npm run dev
```

## Verificacion

```bash
npm run check
npm test
npm run build
```

## Que Incluye

- `src/editor/SlotEditorApp.tsx`: superficie principal del editor.
- `src/editor/components/ModulePanel.tsx`: panel de modulos y acciones.
- `src/editor/components/EditorCanvas.tsx`: canvas editable con zoom, paneo, fondos y aspecto 9:16 / 16:9.
- `src/editor/components/LayerPanel.tsx`: listado de layers, orden, visibilidad, borrado y propiedades.
- `src/editor/store/editorStore.ts`: estado temporal del editor con layers, colores, canvas y undo.
- `src/editor/config/editorModules.config.ts`: definicion de modulos, botones, datos y defaults.

## Modulos Actuales

- `Botones y Datos`: botones HUD, datos visibles, colores y layers.
- `Reels y Cartas`: placeholders de reels/cartas con parametros de filas, columnas y padding.
