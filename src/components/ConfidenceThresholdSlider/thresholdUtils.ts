export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5
export const MIN_CONFIDENCE_THRESHOLD = 0.1
export const MAX_CONFIDENCE_THRESHOLD = 0.9
export const THRESHOLD_STEP = 0.05

export function formatThresholdPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}
