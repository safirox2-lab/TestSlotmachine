export type EditorModuleId = "buttons-data" | "reels-cards";

export type EditorElementType = "button" | "menu" | "data" | "card";

export type EditorCanvasAspectRatio = "16:9" | "9:16";

export type EditorReelMode = "procedural" | "tape";

export type EditorReelStopMode = "all-at-once" | "left-to-right" | "random-one-by-one";

export type EditorSpinSpeed = "fast" | "normal" | "turbo";

export type EditorButtonOptionId =
  | "defaultButtons"
  | "betIncrease"
  | "betDecrease"
  | "spin"
  | "menu"
  | "bet"
  | "info"
  | "autoplay"
  | "arrow";

export type EditorDataOptionId =
  | "defaultData"
  | "user"
  | "roundLabel"
  | "freeSpins"
  | "balance"
  | "bet"
  | "date"
  | "time";

export interface EditorModuleDefinition {
  id: EditorModuleId;
  title: string;
}

export interface EditorButtonDefinition {
  id: EditorButtonOptionId;
  label: string;
  layerLabel: string;
  elementType: EditorElementType;
  iconSrc?: string;
}

export interface EditorDataDefinition {
  id: EditorDataOptionId;
  label: string;
  layerLabel: string;
  textLabel?: string;
  textValue?: string;
}

export interface EditorLayer {
  id: string;
  moduleId: EditorModuleId;
  canvasAspectRatio: EditorCanvasAspectRatio;
  elementType: EditorElementType;
  label: string;
  visible: boolean;
  x: number;
  y: number;
  size: number;
  color: string;
  iconSrc?: string;
  symbolIndex?: number;
  textLabel?: string;
  textValue?: string;
}
