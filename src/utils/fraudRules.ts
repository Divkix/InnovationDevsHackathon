import type { ManualItem } from "../types";
import {
  isHighValueItemCategory,
  normalizeImei,
  normalizeModelNumber,
  normalizeSerialNumber,
} from "./serialValidation";

export type FraudSeverity = "low" | "medium" | "high";

export type OwnershipAwareManualItem = ManualItem;

export interface FraudFinding {
  id: string;
  severity: FraudSeverity;
  title: string;
  message: string;
  itemIds: string[];
  code: string;
}

export interface FraudDetectionOptions {
  highValueThreshold?: number;
  overrideMultiplier?: number;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getItemValue(item: OwnershipAwareManualItem): number {
  const explicitFinal = safeNumber(item.valuation?.finalValue);
  if (explicitFinal !== null) {
    return Math.max(0, explicitFinal);
  }

  const overrideValue = safeNumber(item.valuation?.overrideValue);
  if (overrideValue !== null) {
    return Math.max(0, overrideValue);
  }

  const estimatedValue = safeNumber(item.valuation?.estimatedValue);
  if (estimatedValue !== null) {
    return Math.max(0, estimatedValue);
  }

  return Math.max(0, item.estimatedValue || 0);
}

function getSerialFingerprint(item: OwnershipAwareManualItem): string | null {
  const serial = normalizeSerialNumber(item.ownership?.serialNumber);
  if (serial) return `serial:${serial.replace(/[^A-Z0-9]/g, "")}`;

  const imei = normalizeImei(item.ownership?.imei);
  if (imei.length === 15) return `imei:${imei}`;

  const model = normalizeModelNumber(item.ownership?.modelNumber);
  if (model) return `model:${model.replace(/[^A-Z0-9]/g, "")}`;

  return null;
}

function createFinding(
  code: string,
  severity: FraudSeverity,
  title: string,
  message: string,
  itemIds: string[],
): FraudFinding {
  return {
    id: `${code}:${itemIds.join(",")}`,
    code,
    severity,
    title,
    message,
    itemIds,
  };
}

export function detectDuplicateOwnershipIdentifiers(
  items: OwnershipAwareManualItem[],
): FraudFinding[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const findings: FraudFinding[] = [];
  const seen = new Map<string, string>();

  for (const item of items) {
    if (!item?.id) continue;

    const fingerprint = getSerialFingerprint(item);
    if (!fingerprint) continue;

    const existingItemId = seen.get(fingerprint);
    if (existingItemId && existingItemId !== item.id) {
      findings.push(
        createFinding(
          "duplicate-ownership-identifier",
          "high",
          "Duplicate ownership identifier",
          "The same serial, IMEI, or model fingerprint appears on more than one item.",
          [existingItemId, item.id],
        ),
      );
      continue;
    }

    seen.set(fingerprint, item.id);
  }

  return findings;
}

export function detectValueOverrideAnomalies(
  items: OwnershipAwareManualItem[],
  options: FraudDetectionOptions = {},
): FraudFinding[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const findings: FraudFinding[] = [];
  const overrideMultiplier = options.overrideMultiplier ?? 2.5;

  for (const item of items) {
    if (!item?.id) continue;

    const estimatedValue =
      safeNumber(item.valuation?.estimatedValue) ?? Math.max(0, item.estimatedValue || 0);
    const overrideValue = safeNumber(item.valuation?.overrideValue);
    const finalValue = safeNumber(item.valuation?.finalValue);
    const declaredValue = finalValue ?? overrideValue;

    if (declaredValue === null) continue;

    const threshold = Math.max(500, estimatedValue * overrideMultiplier);
    if (declaredValue >= threshold) {
      findings.push(
        createFinding(
          "suspicious-value-override",
          declaredValue >= threshold * 1.5 ? "high" : "medium",
          "Suspicious value override",
          "The declared value is materially higher than the estimated value and should be reviewed.",
          [item.id],
        ),
      );
    }
  }

  return findings;
}

export function detectMissingOwnershipProof(
  items: OwnershipAwareManualItem[],
  options: FraudDetectionOptions = {},
): FraudFinding[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const findings: FraudFinding[] = [];
  const highValueThreshold = options.highValueThreshold ?? 1000;

  for (const item of items) {
    if (!item?.id) continue;

    const value = getItemValue(item);
    if (value < highValueThreshold && !isHighValueItemCategory(item.category)) {
      continue;
    }

    const ownership = item.ownership;
    const hasProof =
      ownership?.status === "verified" ||
      Boolean(normalizeSerialNumber(ownership?.serialNumber) || normalizeImei(ownership?.imei));

    if (!hasProof) {
      findings.push(
        createFinding(
          "missing-ownership-proof",
          "medium",
          "Ownership proof missing",
          "High-value items should capture a serial, IMEI, or equivalent proof before finalizing coverage evidence.",
          [item.id],
        ),
      );
    }
  }

  return findings;
}

export function detectFraudSignals(
  items: OwnershipAwareManualItem[],
  options: FraudDetectionOptions = {},
): FraudFinding[] {
  return [
    ...detectDuplicateOwnershipIdentifiers(items),
    ...detectValueOverrideAnomalies(items, options),
    ...detectMissingOwnershipProof(items, options),
  ];
}

export function summarizeFraudFindings(findings: FraudFinding[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
} {
  return (findings || []).reduce(
    (summary, finding) => {
      summary.total += 1;
      summary[finding.severity] += 1;
      return summary;
    },
    { total: 0, high: 0, medium: 0, low: 0 },
  );
}
