export function gramsForQuantity(
  quantity: number,
  gramsEach: number,
): number {
  return quantity * gramsEach;
}

export function defaultGrams(
  lastGrams: number | null,
  servingGrams: number | null,
): number {
  if (lastGrams != null && lastGrams > 0) {
    return lastGrams;
  }

  if (servingGrams != null && servingGrams > 0) {
    return servingGrams;
  }

  return 100;
}
