export function normalizeSymbolWeights(weights: number[], cardCount: number): number[] {
  const safeCardCount = Math.max(1, Math.round(Number.isFinite(cardCount) ? cardCount : 1));

  return Array.from({ length: safeCardCount }, (_, index) => {
    const weight = weights[index] ?? 1;
    return Math.max(0, Number.isFinite(weight) ? Number(weight) : 1);
  });
}

export function getSymbolWeightPercentages(weights: number[], cardCount: number): number[] {
  const normalizedWeights = normalizeSymbolWeights(weights, cardCount);
  const totalWeight = normalizedWeights.reduce((total, weight) => total + weight, 0);

  if (totalWeight <= 0) {
    const evenPercentage = 100 / normalizedWeights.length;
    return normalizedWeights.map(() => evenPercentage);
  }

  return normalizedWeights.map((weight) => (weight / totalWeight) * 100);
}

export function randomWeightedSymbol({
  cardCount,
  random,
  weights,
}: {
  cardCount: number;
  random: () => number;
  weights?: number[];
}): number {
  if (!weights || weights.length === 0) {
    return Math.floor(random() * Math.max(1, cardCount)) + 1;
  }

  const normalizedWeights = normalizeSymbolWeights(weights ?? [], cardCount);
  const firstWeight = normalizedWeights[0] ?? 1;
  const usesEvenWeights = normalizedWeights.every((weight) => weight === firstWeight);

  if (usesEvenWeights) {
    return Math.floor(random() * Math.max(1, cardCount)) + 1;
  }

  const totalWeight = normalizedWeights.reduce((total, weight) => total + weight, 0);

  if (totalWeight <= 0) {
    return Math.floor(random() * Math.max(1, cardCount)) + 1;
  }

  let roll = random() * totalWeight;
  for (let index = 0; index < normalizedWeights.length; index += 1) {
    roll -= normalizedWeights[index] ?? 0;
    if (roll <= 0) {
      return index + 1;
    }
  }

  return normalizedWeights.length;
}
