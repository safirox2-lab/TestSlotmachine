import type {
  EditorButtonDefinition,
  EditorButtonOptionId,
  EditorDataDefinition,
  EditorDataOptionId,
  EditorModuleDefinition,
} from "../editor.types";

export const BUTTONS_DATA_MODULE_ID = "buttons-data" as const;
export const REELS_CARDS_MODULE_ID = "reels-cards" as const;
export const RULES_WINS_MODULE_ID = "rules-wins" as const;
export const ROUND_HISTORY_MODULE_ID = "round-history" as const;
export const RULES_COMBINATIONS_MODULE_ID = "rules-combinations" as const;
export const DEFAULT_EDITOR_ACCENT = "#f8c048";
export const DEFAULT_EDITOR_GLOW_COLOR = "#f8c048";
export const DEFAULT_EDITOR_HOVER_COLOR = "#fff3a3";
export const DEFAULT_EDITOR_DATA_COLOR = "#ffffff";
export const DEFAULT_EDITOR_TEXT_COLOR = "#f8c048";

export const EDITOR_MODULES: EditorModuleDefinition[] = [
  {
    id: BUTTONS_DATA_MODULE_ID,
    title: "Botones y Datos",
  },
  {
    id: REELS_CARDS_MODULE_ID,
    title: "Reels y Cartas",
  },
  {
    id: RULES_WINS_MODULE_ID,
    title: "Trazados de Victoria",
  },
  {
    id: ROUND_HISTORY_MODULE_ID,
    title: "Historial de Rondas",
  },
  {
    id: RULES_COMBINATIONS_MODULE_ID,
    title: "Reglas y Combinaciones",
  },
];

export const DEFAULT_EDITOR_BUTTON_IDS: EditorButtonOptionId[] = [
  "betDecrease",
  "spin",
  "betIncrease",
  "info",
  "autoplay",
  "bet",
  "menu",
  "arrow",
];

export const DEFAULT_EDITOR_DATA_IDS: Exclude<EditorDataOptionId, "defaultData">[] = [
  "user",
  "roundLabel",
  "balance",
  "bet",
  "freeSpins",
];

export const EDITOR_BUTTON_OPTIONS: EditorButtonDefinition[] = [
  {
    id: "defaultButtons",
    label: "Botones Por Default",
    layerLabel: "Botones Por Default",
    elementType: "button",
  },
  {
    id: "betIncrease",
    label: "+ Subir Apuesta",
    layerLabel: "Subir Apuesta",
    elementType: "button",
    iconSrc: "/raw/icon_plus.svg",
  },
  {
    id: "betDecrease",
    label: "- Bajar Apuesta",
    layerLabel: "Bajar Apuesta",
    elementType: "button",
    iconSrc: "/raw/icon_minus.svg",
  },
  {
    id: "spin",
    label: "Spin/Jugar",
    layerLabel: "Spin / Jugar",
    elementType: "button",
    iconSrc: "/raw/icon_spin.svg",
  },
  {
    id: "menu",
    label: "Menu",
    layerLabel: "Menu principal",
    elementType: "menu",
    iconSrc: "/raw/icon_menu.svg",
  },
  {
    id: "bet",
    label: "Apuesta",
    layerLabel: "Apuesta",
    elementType: "button",
    iconSrc: "/raw/icon_coin.svg",
  },
  {
    id: "info",
    label: "Informacion de Reglas",
    layerLabel: "Reglas / Info",
    elementType: "menu",
    iconSrc: "/raw/icon_info.svg",
  },
  {
    id: "autoplay",
    label: "AutoPlay",
    layerLabel: "AutoPlay config",
    elementType: "menu",
    iconSrc: "/raw/icon_autospin.svg",
  },
  {
    id: "arrow",
    label: "Flechas / Siguiente",
    layerLabel: "Flechas / Siguiente",
    elementType: "button",
    iconSrc: "/raw/icon_arrow.svg",
  },
];

export const EDITOR_DATA_OPTIONS: EditorDataDefinition[] = [
  { id: "defaultData", label: "Datos Por Default", layerLabel: "Datos Por Default" },
  { id: "user", label: "Usuario", layerLabel: "Usuario", textLabel: "USUARIO:", textValue: "demo" },
  {
    id: "roundLabel",
    label: "Ronda",
    layerLabel: "Ronda",
    textLabel: "RONDA",
    textValue: "#000001",
  },
  {
    id: "freeSpins",
    label: "Freespins",
    layerLabel: "Freespins",
    textLabel: "FREESPINS",
    textValue: "0",
  },
  {
    id: "balance",
    label: "Balance",
    layerLabel: "Balance",
    textLabel: "BALANCE",
    textValue: "$1,000",
  },
  { id: "bet", label: "Apuesta", layerLabel: "Apuesta", textLabel: "APUESTA", textValue: "$10" },
  { id: "date", label: "Fecha", layerLabel: "Fecha", textLabel: "FECHA" },
  { id: "time", label: "Hora", layerLabel: "Hora", textLabel: "HORA" },
];
