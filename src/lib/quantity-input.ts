/** Coerces a quantity typed into an input into a whole number of at least one. */
export function parseQuantityInput(value: string): number {
  return Math.max(1, Math.trunc(Number(value)) || 1);
}
