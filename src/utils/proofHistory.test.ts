import { describe, expect, it, vi } from "vitest";
import type { DetectedItem, ManualItem } from "@/types";
import {
  calculateTrustScore,
  createSavedScanRecord,
  exportAllProofBundles,
  exportProofBundle,
} from "./proofHistory";

function makeDetectedItem(overrides: Partial<DetectedItem> = {}): DetectedItem {
  return {
    id: "detected-1",
    category: "laptop",
    confidence: 0.92,
    boundingBox: { originX: 0, originY: 0, width: 100, height: 80 },
    categories: [{ categoryName: "laptop", score: 0.92, displayName: "Laptop" }],
    coverage: {
      status: "covered",
      color: "green",
      estimatedValue: 1800,
      note: "Covered under policy.",
      conditions: [],
      upgrade: null,
    },
    ownership: {
      status: "verified",
      serialNumber: "SN-0001",
      modelNumber: "LPT-15",
      fraudFlags: [],
      ledger: [],
    },
    valuation: {
      estimatedValue: 1800,
      finalValue: 1800,
      source: "ai",
    },
    ...overrides,
  };
}

function makeManualItem(overrides: Partial<ManualItem> = {}): ManualItem {
  return {
    id: "manual-1",
    name: "Camera Body",
    category: "camera",
    estimatedValue: 900,
    ownership: {
      status: "serial_captured",
      serialNumber: "CAM-123",
      fraudFlags: [],
      ledger: [],
    },
    valuation: {
      estimatedValue: 900,
      finalValue: 900,
      source: "user",
    },
    ...overrides,
  };
}

describe("proofHistory utilities", () => {
  it("creates a saved scan record with ownership summary", () => {
    const scan = createSavedScanRecord({
      policyType: "renters",
      totalValue: 2700,
      protectedValue: 1800,
      unprotectedValue: 900,
      coverageGapPercentage: 33.3,
      detectedItems: [makeDetectedItem()],
      manualItems: [makeManualItem()],
      gps: { lat: 33.45, lng: -112.07, accuracy: 14 },
      evidenceHash: "abc123",
      createdAt: 1710000000000,
    });

    expect(scan.itemCount).toBe(2);
    expect(scan.ownershipSummary).toEqual({
      verifiedItems: 1,
      pendingItems: 1,
      reviewFlags: 0,
    });
    expect(scan.gpsLat).toBe(33.45);
    expect(scan.evidenceHash).toBe("abc123");
  });

  it("calculates portfolio trust factors across repeated scans", () => {
    const scans = [
      createSavedScanRecord({
        policyType: "renters",
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0,
        detectedItems: [makeDetectedItem()],
        manualItems: [],
        gps: { lat: 33.45, lng: -112.07, accuracy: 10 },
        createdAt: new Date("2026-01-01").getTime(),
      }),
      createSavedScanRecord({
        policyType: "renters",
        totalValue: 1900,
        protectedValue: 1800,
        unprotectedValue: 100,
        coverageGapPercentage: 5.2,
        detectedItems: [makeDetectedItem({ id: "detected-2" })],
        manualItems: [],
        gps: { lat: 33.4502, lng: -112.0701, accuracy: 11 },
        createdAt: new Date("2026-01-05").getTime(),
      }),
      createSavedScanRecord({
        policyType: "renters",
        totalValue: 2800,
        protectedValue: 1800,
        unprotectedValue: 1000,
        coverageGapPercentage: 35.7,
        detectedItems: [makeDetectedItem({ id: "detected-3" })],
        manualItems: [makeManualItem()],
        gps: { lat: 33.4501, lng: -112.0702, accuracy: 9 },
        createdAt: new Date("2026-01-12").getTime(),
      }),
    ];

    const trust = calculateTrustScore(scans);

    expect(trust.level).toBe("VERIFIED");
    expect(trust.score).toBeGreaterThanOrEqual(80);
    expect(trust.factors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("GPS"),
        expect.stringContaining("same location"),
        expect.stringContaining("days"),
      ]),
    );
  });

  it("exports individual and portfolio proof bundles", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));

    const scan = createSavedScanRecord({
      policyType: "homeowners",
      totalValue: 2700,
      protectedValue: 1800,
      unprotectedValue: 900,
      coverageGapPercentage: 33.3,
      detectedItems: [makeDetectedItem()],
      manualItems: [makeManualItem()],
      gps: { lat: 33.45, lng: -112.07, accuracy: 14 },
      evidenceHash: "hash-001",
      createdAt: 1710000000000,
    });

    const singleBundle = JSON.parse(exportProofBundle(scan));
    const portfolioBundle = JSON.parse(exportAllProofBundles([scan]));

    expect(singleBundle.scanId).toBe(scan.id);
    expect(singleBundle.location.lat).toBe(33.45);
    expect(singleBundle.items).toHaveLength(2);
    expect(portfolioBundle.totalScans).toBe(1);
    expect(portfolioBundle.scans[0].evidenceHash).toBe("hash-001");

    vi.useRealTimers();
  });
});
