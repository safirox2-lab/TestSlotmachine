export type Rng = () => number;

export function createDemoRng(seed: number): Rng {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
