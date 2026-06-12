import type { CSSProperties } from "react";
import { GAME_CONFIG } from "../config/game.config";
import type { DebugFeatureMode, DebugWinMode } from "../types/game.types";
import { PAYLINE_COUNT } from "./paytable";

export interface RectLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

export interface AutoplayConfig {
  count: number;
  untilWin: boolean;
  fullAuto: boolean;
}

export type SpinMode = 1 | 2 | 3;

export interface AtlasPreviewFrame {
  image: string;
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  atlasSize: {
    w: number;
    h: number;
  };
}

interface RuleExplainer {
  iconSrc: string;
  title: string;
  text: string;
}

export type ModalKind = "menu" | "autoplay" | "info" | "bet" | null;

export const DESIGN_WIDTH = 1080;
export const DESIGN_HEIGHT = 1920;
export const AUTOPLAY_COUNTS = [10, 25, 50, 100] as const;
export const SPIN_MODES = [1, 2, 3] as const;
export const BET_LEVELS = GAME_CONFIG.betting.levels;
export const COIN_VALUE_OPTIONS = [1, 2, 5, 10, 25, 50, 100] as const;
export const DEBUG_WIN_OPTIONS: Array<{ mode: DebugWinMode; label: string }> = [
  { mode: "win", label: "WIN" },
  { mode: "bigWin", label: "BIG WIN" },
  { mode: "jackpot", label: "JACKPOT NORMAL" },
  { mode: "jackpotLegendario", label: "LEGENDARIO" },
];
export const DEBUG_FEATURE_OPTIONS: Array<{ mode: DebugFeatureMode; label: string }> = [
  { mode: "scatter", label: "SCATTER" },
  { mode: "wildNormal", label: "WILD NORMAL" },
  { mode: "wildComplete", label: "WILD COMPLETO" },
];
export const AUTOPLAY_DELAY_BY_SPIN_MODE: Record<SpinMode, number> = {
  1: 360,
  2: 180,
  3: 100,
};
export const HUD_INTERACTION_SOUND = "button";
export const RAW_ICON_PATHS = {
  autospin: "/raw/icon_autospin.svg",
  arrow: "/raw/icon_arrow.svg",
  coin: "/raw/icon_coin.svg",
  info: "/raw/icon_info.svg",
  menu: "/raw/icon_menu.svg",
  minus: "/raw/icon_minus.svg",
  plus: "/raw/icon_plus.svg",
  spin: "/raw/icon_spin.svg",
  stop: "/raw/icon_stop.svg",
} as const;

export const RULE_EXPLAINERS: RuleExplainer[] = [
  {
    iconSrc: RAW_ICON_PATHS.spin,
    title: "Grid 5 x 4",
    text: "Juegas con cinco rodillos y cuatro filas. Cada giro rellena todo el tablero.",
  },
  {
    iconSrc: RAW_ICON_PATHS.arrow,
    title: `${PAYLINE_COUNT} lineas fijas`,
    text: "No tienes que elegir lineas. Los premios se leen de izquierda a derecha.",
  },
  {
    iconSrc: RAW_ICON_PATHS.info,
    title: "Wild",
    text: "El WILD completa simbolos pagadores. No reemplaza SCATTER ni cuenta como TELEFONO 7 puro para el jackpot.",
  },
  {
    iconSrc: RAW_ICON_PATHS.coin,
    title: "Delivery Legendario",
    text: "5 TELEFONO 7 puros en una linea activan DELIVERY LEGENDARIO: paga 250x la apuesta mas el premio de linea.",
  },
  {
    iconSrc: RAW_ICON_PATHS.autospin,
    title: "Scatter",
    text: "4 SCATTER activan 8 free spins; cada SCATTER adicional suma 2 giros.",
  },
  {
    iconSrc: RAW_ICON_PATHS.autospin,
    title: "Free Spins",
    text: "Los free spins no descuentan saldo y pueden volver a ganar por lineas, WILD, cascadas o DELIVERY LEGENDARIO.",
  },
  {
    iconSrc: RAW_ICON_PATHS.coin,
    title: "Cascadas",
    text: "Los simbolos ganadores se muestran un momento y luego entra un nuevo grid.",
  },
];

export function rectStyle(rect: RectLayout): CSSProperties {
  return {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex: rect.zIndex ?? 1,
  };
}

export function clampOptionIndex(index: number, length: number): number {
  return Math.min(length - 1, Math.max(0, index));
}

export function getBetLevelIndex(currentBet: number): number {
  const levels: readonly number[] = BET_LEVELS;
  const exactIndex = levels.indexOf(currentBet);
  if (exactIndex >= 0) {
    return exactIndex;
  }
  return levels.reduce((nearestIndex, level, index) => {
    const nearestDistance = Math.abs(Number(levels[nearestIndex]) - currentBet);
    const distance = Math.abs(Number(level) - currentBet);
    return distance < nearestDistance ? index : nearestIndex;
  }, 0);
}

export function formatRoundNumber(roundNumber: number): string {
  return String(Math.max(0, Math.trunc(roundNumber))).padStart(6, "0");
}

export function formatAutoplayCounter(completed: number, total: number | null): string {
  const completedLabel = String(Math.max(0, Math.trunc(completed))).padStart(2, "0");
  if (total === null) {
    return `AUTO ${completedLabel}`;
  }
  const totalLabel = String(Math.max(0, Math.trunc(total))).padStart(2, "0");
  return `AUTO ${completedLabel}/${totalLabel}`;
}
