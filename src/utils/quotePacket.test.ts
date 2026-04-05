import { describe, expect, it } from "vitest";
import type { DetectedItem, ManualItem } from "@/types";
import { buildQuotePacket, buildQuotePacketFilename, buildQuotePacketJson } from "./quotePacket";

const detectedItems: DetectedItem[] = [
  {
    id: "det-1",
    category: "laptop",
    confidence: 0.94,
    boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
    categories: [{ categoryName: "laptop", score: 0.94, displayName: "Laptop" }],
    valuation: { estimatedValue: 1400, finalValue: 1400, source: "ai" },
    ownership: {
      status: "verified",
      verifiedAt: "2026-04-05T12:00:00.000Z",
      evidence: {
        itemPhotoUrl: "https://example.com/item-photo.jpg",
        serialPhotoUrl: "https://example.com/serial-photo.jpg",
      },
    },
  },
];

const manualItems: ManualItem[] = [
  {
    id: "man-1",
    name: "Studio Camera",
    category: "camera",
    estimatedValue: 900,
    valuation: {
      estimatedValue: 900,
      finalValue: 975,
      source: "user",
      overrideValue: 975,
      overrideReason: "Replacement estimate",
    },
    ownership: {
      status: "serial_captured",
      evidence: {
        receiptUrl: "https://example.com/receipt.pdf",
        sourceNotes: "Receipt attached during quote prep.",
      },
    },
  },
];

describe("quotePacket", () => {
  it("builds a packet with evidence and handoff copy", () => {
    const packet = buildQuotePacket({
      detectedItems,
      manualItems,
      policyType: "renters",
      language: "es",
    });

    expect(packet.itemCount).toBe(2);
    expect(packet.photoCount).toBe(2);
    expect(packet.documentCount).toBe(1);
    expect(packet.evidenceCount).toBe(2);
    expect(packet.brief).toContain("InsureScope quote packet ready for agent handoff.");
    expect(packet.brief).toContain("Studio Camera");
    expect(packet.markdown).toContain("https://example.com/item-photo.jpg");
    expect(packet.markdown).toContain("https://example.com/receipt.pdf");
    expect(packet.recommendedActions.length).toBeGreaterThan(0);
  });

  it("builds stable export filenames and JSON", () => {
    const packet = buildQuotePacket({
      detectedItems,
      manualItems,
      policyType: "renters",
      language: "en",
    });

    expect(buildQuotePacketFilename(packet, "md")).toMatch(/^insurescope-packet-/);
    expect(buildQuotePacketFilename(packet, "json")).toMatch(/\.json$/);
    expect(() => JSON.parse(buildQuotePacketJson(packet))).not.toThrow();
  });
});
