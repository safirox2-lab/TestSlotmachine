export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function snapToGrid(value: number, gridSize = 8): number {
  return Math.round(value / gridSize) * gridSize;
}
