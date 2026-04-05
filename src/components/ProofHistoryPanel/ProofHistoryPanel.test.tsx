import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectedItem, ManualItem } from "@/types";
import type { SavedScanRecord } from "@/utils/proofHistory";
import { ProofHistoryPanel } from "../ProofHistoryPanel";

const valueCalculatorMocks = vi.hoisted(() => ({
  calculateValues: vi.fn(),
  formatCurrency: vi.fn((value: number) => `$${value}`),
  formatPercentage: vi.fn((value: number) => `${value.toFixed(1)}%`),
}));

vi.mock("@/utils/valueCalculator", () => valueCalculatorMocks);

const proofHistoryMocks = vi.hoisted(() => {
  let savedScans: SavedScanRecord[] = [];

  return {
    getSavedScans: () => savedScans,
    setSavedScans: (next: SavedScanRecord[]) => {
      savedScans = next;
    },
    captureGPS: vi.fn(async () => ({ lat: 33.45, lng: -112.07, accuracy: 12 })),
    generateEvidenceHash: vi.fn(async () => "hash-123"),
    loadSavedScans: vi.fn(() => savedScans),
    upsertSavedScan: vi.fn((scan: SavedScanRecord) => {
      savedScans = [scan, ...savedScans.filter((entry) => entry.id !== scan.id)];
      return savedScans;
    }),
    deleteSavedScan: vi.fn((id: string) => {
      savedScans = savedScans.filter((entry) => entry.id !== id);
      return savedScans;
    }),
    clearSavedScans: vi.fn(() => {
      savedScans = [];
      return [];
    }),
    downloadJson: vi.fn(),
    exportProofBundle: vi.fn((scan: SavedScanRecord) => JSON.stringify({ scanId: scan.id })),
    exportAllProofBundles: vi.fn((scans: SavedScanRecord[]) =>
      JSON.stringify({ totalScans: scans.length }),
    ),
    calculateTrustScore: vi.fn((scans: SavedScanRecord[]) => ({
      score: scans.length > 0 ? 80 : 0,
      level: scans.length > 0 ? ("HIGH" as const) : ("LOW" as const),
      factors: [],
    })),
  };
});

vi.mock("@/utils/proofHistory", async () => {
  const actual =
    await vi.importActual<typeof import("@/utils/proofHistory")>("@/utils/proofHistory");

  return {
    ...actual,
    ...proofHistoryMocks,
  };
});

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <button {...props}>{children}</button>
    ),
    section: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <section {...props}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function createDetectedItem(overrides: Partial<DetectedItem> = {}): DetectedItem {
  return {
    id: "detected-1",
    category: "laptop",
    confidence: 0.96,
    boundingBox: { originX: 0, originY: 0, width: 100, height: 80 },
    categories: [{ categoryName: "laptop", score: 0.96, displayName: "Laptop" }],
    ...overrides,
  };
}

function createManualItem(overrides: Partial<ManualItem> = {}): ManualItem {
  return {
    id: "manual-1",
    name: "Camera",
    category: "camera",
    estimatedValue: 900,
    ...overrides,
  };
}

function createSavedScan(overrides: Partial<SavedScanRecord> = {}): SavedScanRecord {
  return {
    id: "scan-1",
    createdAt: new Date("2026-04-05T12:00:00Z").getTime(),
    policyType: "renters",
    totalValue: 2500,
    protectedValue: 1500,
    unprotectedValue: 1000,
    coverageGapPercentage: 40,
    itemCount: 2,
    items: [
      {
        id: "detected-1",
        label: "Laptop",
        category: "laptop",
        source: "detected",
        estimatedValue: 1600,
        coverageStatus: "covered",
        ownershipStatus: "verified",
        fraudFlags: [],
      },
    ],
    ownershipSummary: {
      verifiedItems: 1,
      pendingItems: 0,
      reviewFlags: 0,
    },
    gpsLat: 33.45,
    gpsLng: -112.07,
    gpsAccuracy: 12,
    evidenceHash: "hash-abc",
    ...overrides,
  };
}

describe("ProofHistoryPanel", () => {
  beforeEach(() => {
    valueCalculatorMocks.calculateValues.mockReturnValue({
      totalValue: 2500,
      protectedValue: 1500,
      unprotectedValue: 1000,
      coverageGapPercentage: 40,
      items: [
        {
          id: "detected-1",
          category: "laptop",
          estimatedValue: 1600,
          status: "covered",
          color: "green",
          source: "detected",
        },
        {
          id: "manual-1",
          category: "camera",
          estimatedValue: 900,
          status: "conditional",
          color: "yellow",
          source: "manual",
        },
      ],
    });
    proofHistoryMocks.setSavedScans([]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves the active scan into proof history", async () => {
    const user = userEvent.setup();

    render(
      <ProofHistoryPanel
        detectedItems={[createDetectedItem()]}
        manualItems={[createManualItem()]}
        policyType="renters"
        totalValue={2500}
        protectedValue={1500}
        unprotectedValue={1000}
        coverageGapPercentage={40}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save current scan/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/saved scan with gps proof and evidence hash\./i),
      ).toBeInTheDocument();
      expect(proofHistoryMocks.upsertSavedScan).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/1 saved scan/i)).toBeInTheDocument();
    });
  });

  it("exports and clears saved proof bundles", async () => {
    const user = userEvent.setup();
    proofHistoryMocks.setSavedScans([createSavedScan()]);

    render(
      <ProofHistoryPanel
        detectedItems={[createDetectedItem()]}
        manualItems={[createManualItem()]}
        policyType="renters"
        totalValue={2500}
        protectedValue={1500}
        unprotectedValue={1000}
        coverageGapPercentage={40}
      />,
    );

    expect(screen.getByText("Saved scan history and exportable proof bundles")).toBeInTheDocument();
    expect(screen.getByText(/1 saved scan/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /export all bundles/i }));
    expect(proofHistoryMocks.downloadJson).toHaveBeenCalledWith(
      expect.stringContaining('"totalScans":1'),
      expect.stringMatching(/insurescope-proof-portfolio/i),
    );

    await user.click(screen.getByRole("button", { name: /clear history/i }));
    await waitFor(() => {
      expect(proofHistoryMocks.clearSavedScans).toHaveBeenCalledTimes(1);
    });
  });
});
