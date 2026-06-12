import type { JackpotDemoState } from "../types/game.types";

const JACKPOT_TIERS = [
  { tier: "MINI", seed: 1250, rate: 0.01 },
  { tier: "MINOR", seed: 4000, rate: 0.006 },
  { tier: "MAJOR", seed: 15000, rate: 0.003 },
  { tier: "GRAND", seed: 50000, rate: 0.0015 },
  { tier: "GALLO", seed: 100000, rate: 0.001 },
] as const;

export class JackpotModel {
  private values: JackpotDemoState[] = JACKPOT_TIERS.map(({ tier, seed }) => ({
    tier,
    value: seed,
  }));

  contribute(bet: number): void {
    this.values = this.values.map((jackpot, index) => ({
      ...jackpot,
      value: jackpot.value + bet * JACKPOT_TIERS[index].rate,
    }));
  }

  getDisplayValues(): JackpotDemoState[] {
    return this.values.map((jackpot) => ({
      tier: jackpot.tier,
      value: Number(jackpot.value.toFixed(2)),
    }));
  }
}
