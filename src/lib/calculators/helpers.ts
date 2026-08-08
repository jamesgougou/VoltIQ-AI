export function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isNonNegativeFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function roundSignificant(value: number, digits = 4): number {
  if (!Number.isFinite(value) || value === 0) {
    return value;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, digits = 4): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  const rounded = roundSignificant(value, digits);
  return String(rounded);
}

export function product(values: number[]): number {
  return values.reduce((acc, value) => acc * value, 1);
}
