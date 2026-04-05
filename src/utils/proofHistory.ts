import type { DetectedItem, FraudFlag, ManualItem, OwnershipStatus, PolicyType } from "@/types";

export interface SavedScanItem {
  id: string;
  label: string;
  category: string;
  source: "detected" | "manual";
  estimatedValue: number;
  coverageStatus: "covered" | "conditional" | "not_covered";
  ownershipStatus: OwnershipStatus;
  serialNumber?: string;
  modelNumber?: string;
  receiptUrl?: string;
  fraudFlags: FraudFlag[];
}

export interface SavedScanRecord {
  id: string;
  createdAt: number;
  policyType: PolicyType;
  totalValue: number;
  protectedValue: number;
  unprotectedValue: number;
  coverageGapPercentage: number;
  itemCount: number;
  items: SavedScanItem[];
  ownershipSummary: {
    verifiedItems: number;
    pendingItems: number;
    reviewFlags: number;
  };
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracy?: number;
  evidenceHash?: string;
}

export type TrustLevel = "LOW" | "MEDIUM" | "HIGH" | "VERIFIED";

export interface TrustResult {
  score: number;
  level: TrustLevel;
  factors: string[];
}

export const SAVED_SCAN_HISTORY_KEY = "insurescope_saved_scan_history";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildSavedScanItemFromDetected(item: DetectedItem): SavedScanItem {
  return {
    id: item.id,
    label: item.category,
    category: item.category,
    source: "detected",
    estimatedValue: item.valuation?.finalValue ?? item.coverage?.estimatedValue ?? 0,
    coverageStatus: item.coverage?.status ?? "not_covered",
    ownershipStatus: item.ownership?.status ?? "unverified",
    serialNumber: item.ownership?.serialNumber,
    modelNumber: item.ownership?.modelNumber,
    receiptUrl: item.ownership?.evidence?.receiptUrl,
    fraudFlags: item.ownership?.fraudFlags ?? [],
  };
}

function buildSavedScanItemFromManual(item: ManualItem): SavedScanItem {
  const coverageStatus =
    item.estimatedValue > 0 && item.ownership?.status === "verified" ? "covered" : "conditional";

  return {
    id: item.id,
    label: item.name,
    category: item.category,
    source: "manual",
    estimatedValue: item.valuation?.finalValue ?? item.estimatedValue ?? 0,
    coverageStatus,
    ownershipStatus: item.ownership?.status ?? "unverified",
    serialNumber: item.ownership?.serialNumber,
    modelNumber: item.ownership?.modelNumber,
    receiptUrl: item.ownership?.evidence?.receiptUrl,
    fraudFlags: item.ownership?.fraudFlags ?? [],
  };
}

export function buildSavedScanItems(
  detectedItems: DetectedItem[],
  manualItems: ManualItem[],
): SavedScanItem[] {
  const detected = Array.isArray(detectedItems)
    ? detectedItems.map(buildSavedScanItemFromDetected)
    : [];
  const manual = Array.isArray(manualItems) ? manualItems.map(buildSavedScanItemFromManual) : [];
  return [...detected, ...manual];
}

export async function captureGPS(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true },
    );
  });
}

export async function generateEvidenceHash(data: {
  itemLabels: string[];
  timestamp: number;
  lat?: number;
  lng?: number;
  policyType: PolicyType;
}): Promise<string> {
  const payload = JSON.stringify({
    itemLabels: [...data.itemLabels].sort(),
    timestamp: data.timestamp,
    lat: typeof data.lat === "number" ? data.lat.toFixed(6) : null,
    lng: typeof data.lng === "number" ? data.lng.toFixed(6) : null,
    policyType: data.policyType,
  });

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return Array.from(new Uint8Array(buf))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createSavedScanRecord(input: {
  policyType: PolicyType;
  totalValue: number;
  protectedValue: number;
  unprotectedValue: number;
  coverageGapPercentage: number;
  detectedItems: DetectedItem[];
  manualItems: ManualItem[];
  gps?: { lat: number; lng: number; accuracy: number } | null;
  evidenceHash?: string;
  createdAt?: number;
}): SavedScanRecord {
  const createdAt = input.createdAt ?? Date.now();
  const items = buildSavedScanItems(input.detectedItems, input.manualItems);
  const verifiedItems = items.filter((item) => item.ownershipStatus === "verified").length;
  const pendingItems = items.filter(
    (item) => item.ownershipStatus === "needs_serial" || item.ownershipStatus === "serial_captured",
  ).length;
  const reviewFlags = items.reduce(
    (count, item) =>
      count +
      item.fraudFlags.filter((flag) => flag.severity === "review" || flag.severity === "high")
        .length,
    0,
  );

  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `scan-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    policyType: input.policyType,
    totalValue: input.totalValue,
    protectedValue: input.protectedValue,
    unprotectedValue: input.unprotectedValue,
    coverageGapPercentage: input.coverageGapPercentage,
    itemCount: items.length,
    items,
    ownershipSummary: {
      verifiedItems,
      pendingItems,
      reviewFlags,
    },
    gpsLat: input.gps?.lat,
    gpsLng: input.gps?.lng,
    gpsAccuracy: input.gps?.accuracy,
    evidenceHash: input.evidenceHash,
  };
}

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) {
    return storage;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return null;
}

export function loadSavedScans(storage?: Storage): SavedScanRecord[] {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(SAVED_SCAN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedScanRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedScans(scans: SavedScanRecord[], storage?: Storage): void {
  const targetStorage = resolveStorage(storage);
  if (!targetStorage) return;

  targetStorage.setItem(SAVED_SCAN_HISTORY_KEY, JSON.stringify(scans));
}

export function upsertSavedScan(scan: SavedScanRecord, storage?: Storage): SavedScanRecord[] {
  const existing = loadSavedScans(storage);
  const next = [scan, ...existing.filter((entry) => entry.id !== scan.id)].sort(
    (left, right) => right.createdAt - left.createdAt,
  );
  saveSavedScans(next, storage);
  return next;
}

export function deleteSavedScan(id: string, storage?: Storage): SavedScanRecord[] {
  const next = loadSavedScans(storage).filter((scan) => scan.id !== id);
  saveSavedScans(next, storage);
  return next;
}

export function clearSavedScans(storage?: Storage): SavedScanRecord[] {
  const targetStorage = resolveStorage(storage);
  targetStorage?.removeItem(SAVED_SCAN_HISTORY_KEY);
  return [];
}

export function calculateTrustScore(scans: SavedScanRecord[]): TrustResult {
  if (scans.length === 0) {
    return { score: 0, level: "LOW", factors: [] };
  }

  let score = 20;
  const factors: string[] = ["Single saved scan on record"];
  const scansWithGps = scans.filter(
    (scan) => typeof scan.gpsLat === "number" && typeof scan.gpsLng === "number",
  );

  if (scansWithGps.length > 0) {
    score += 15;
    factors.push("GPS coordinates captured");
  }

  if (scansWithGps.length >= 2) {
    let foundNearby = false;
    outer: for (let i = 0; i < scansWithGps.length; i += 1) {
      for (let j = i + 1; j < scansWithGps.length; j += 1) {
        const distance = haversineKm(
          scansWithGps[i].gpsLat as number,
          scansWithGps[i].gpsLng as number,
          scansWithGps[j].gpsLat as number,
          scansWithGps[j].gpsLng as number,
        );
        if (distance <= 0.5) {
          foundNearby = true;
          break outer;
        }
      }
    }

    if (foundNearby) {
      score += 20;
      factors.push("Multiple scans recorded at the same location");
    }
  }

  if (scans.length >= 3) {
    const sorted = [...scans].sort((left, right) => left.createdAt - right.createdAt);
    const spanDays =
      (sorted[sorted.length - 1].createdAt - sorted[0].createdAt) / (1000 * 60 * 60 * 24);
    if (spanDays >= 7) {
      score += 20;
      factors.push(`${scans.length} scans spread across ${Math.floor(spanDays)} days`);
    }
  }

  const hasIdentifiers = scans.some((scan) =>
    scan.items.some(
      (item) =>
        Boolean(item.serialNumber?.trim()) ||
        Boolean(item.modelNumber?.trim()) ||
        item.ownershipStatus === "verified",
    ),
  );
  if (hasIdentifiers) {
    score += 15;
    factors.push("Serial, model, or verified ownership evidence recorded");
  }

  if (scans.some((scan) => scan.itemCount >= 5)) {
    score += 10;
    factors.push("One or more scans documented 5+ items");
  }

  const level: TrustLevel =
    score >= 80 ? "VERIFIED" : score >= 60 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

  return { score, level, factors };
}

export function exportProofBundle(scan: SavedScanRecord): string {
  return JSON.stringify(
    {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      scanId: scan.id,
      createdAt: new Date(scan.createdAt).toISOString(),
      location:
        typeof scan.gpsLat === "number"
          ? { lat: scan.gpsLat, lng: scan.gpsLng, accuracy: scan.gpsAccuracy }
          : null,
      evidenceHash: scan.evidenceHash ?? null,
      policyType: scan.policyType,
      trustPreview: calculateTrustScore([scan]),
      totals: {
        totalValue: scan.totalValue,
        protectedValue: scan.protectedValue,
        unprotectedValue: scan.unprotectedValue,
        coverageGapPercentage: scan.coverageGapPercentage,
      },
      ownershipSummary: scan.ownershipSummary,
      items: scan.items,
    },
    null,
    2,
  );
}

export function exportAllProofBundles(scans: SavedScanRecord[]): string {
  return JSON.stringify(
    {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      totalScans: scans.length,
      portfolioTrust: calculateTrustScore(scans),
      scans: scans.map((scan) => JSON.parse(exportProofBundle(scan))),
    },
    null,
    2,
  );
}

export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
