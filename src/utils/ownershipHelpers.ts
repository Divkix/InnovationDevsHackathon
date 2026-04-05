import type {
  DetectedItem,
  FraudFlag,
  ManualItem,
  OwnershipRecord,
  OwnershipStatus,
  ValuationRecord,
} from "@/types";

const HIGH_VALUE_CATEGORIES = new Set([
  "laptop",
  "tv",
  "cell phone",
  "camera",
  "bicycle",
  "gaming_equipment",
  "jewelry",
  "musical_instruments",
  "art_collectibles",
  "firearms",
]);

export function isHighValueCategory(category: string): boolean {
  return HIGH_VALUE_CATEGORIES.has(category.toLowerCase());
}

export function getDefaultOwnershipStatus(category: string): OwnershipStatus {
  return isHighValueCategory(category) ? "needs_serial" : "unverified";
}

export function buildDefaultOwnershipRecord(category: string): OwnershipRecord {
  return {
    status: getDefaultOwnershipStatus(category),
    fraudFlags: [],
    ledger: [],
  };
}

export function buildValuationRecord(
  estimatedValue: number,
  source: ValuationRecord["source"],
  overrideValue?: number,
  overrideReason?: string,
): ValuationRecord {
  const finalValue = typeof overrideValue === "number" ? overrideValue : estimatedValue;

  return {
    estimatedValue,
    finalValue,
    source: typeof overrideValue === "number" ? "user" : source,
    overrideValue,
    overrideReason,
  };
}

export function getFinalItemValue(item: Pick<ManualItem, "estimatedValue" | "valuation">): number {
  return item.valuation?.finalValue ?? item.estimatedValue;
}

export function countOwnershipStatus(
  items: Array<ManualItem | DetectedItem>,
  status: OwnershipStatus,
): number {
  return items.filter((item) => item.ownership?.status === status).length;
}

export function countReviewFlags(items: Array<ManualItem | DetectedItem>): number {
  return items.reduce((count, item) => {
    const flags = item.ownership?.fraudFlags ?? [];
    return (
      count + flags.filter((flag) => flag.severity === "review" || flag.severity === "high").length
    );
  }, 0);
}

export function summarizeFraudFlags(flags: FraudFlag[] = []): string {
  if (flags.length === 0) {
    return "No ownership anomalies detected.";
  }

  const highest =
    flags.find((flag) => flag.severity === "high") ??
    flags.find((flag) => flag.severity === "review") ??
    flags[0];

  return highest.message;
}
