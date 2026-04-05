import { describe, expect, it } from "vitest";
import type { DetectedItem, ItemBreakdown, ManualItem } from "@/types";
import { buildQuoteHandoffDocument } from "./quoteDocument";

const items: ItemBreakdown[] = [
  {
    id: "1",
    category: "laptop",
    estimatedValue: 1200,
    status: "covered",
    color: "green",
    source: "detected",
  },
  {
    id: "2",
    category: "car",
    estimatedValue: 15000,
    status: "not_covered",
    color: "red",
    source: "detected",
  },
];

describe("quoteDocument", () => {
  it("builds a quote handoff document with totals and actions", () => {
    const result = buildQuoteHandoffDocument({
      policyType: "renters",
      language: "es",
      totalValue: 16200,
      protectedValue: 1200,
      unprotectedValue: 15000,
      coverageGapPercentage: 92.6,
      items,
      contactName: "Alex Morgan",
      contactEmail: "alex@example.com",
      generatedAt: new Date("2026-04-05T12:00:00Z"),
    });

    expect(result.title).toBe("InsureScope Quote Handoff");
    expect(result.fileName).toBe("insurescope-quote-handoff-2026-04-05.txt");
    expect(result.documentText).toContain("Policy: Renters Insurance");
    expect(result.documentText).toContain("Language: Spanish");
    expect(result.documentText).toContain("Exposure: $15,000");
    expect(result.documentText).toContain("Review car ($15,000 at risk)");
    expect(result.documentText).toContain("Alex Morgan");
    expect(result.topActions).toHaveLength(1);
  });

  it("includes the richer packet export when raw items are available", () => {
    const detectedItems: DetectedItem[] = [
      {
        id: "det-1",
        category: "laptop",
        confidence: 0.9,
        boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
        categories: [{ categoryName: "laptop", score: 0.9, displayName: "Laptop" }],
        ownership: {
          status: "verified",
          evidence: {
            itemPhotoUrl: "https://example.com/photo.jpg",
          },
        },
      },
    ];
    const manualItems: ManualItem[] = [
      {
        id: "man-1",
        name: "Desk Lamp",
        category: "lamp",
        estimatedValue: 80,
      },
    ];

    const result = buildQuoteHandoffDocument({
      policyType: "renters",
      language: "en",
      totalValue: 1280,
      protectedValue: 1200,
      unprotectedValue: 80,
      coverageGapPercentage: 6.3,
      items,
      detectedItems,
      manualItems,
      contactName: "Alex Morgan",
      contactEmail: "alex@example.com",
      generatedAt: new Date("2026-04-05T12:00:00Z"),
    });

    expect(result.documentText).toContain("# InsureScope Quote Packet");
    expect(result.documentText).toContain("https://example.com/photo.jpg");
    expect(result.topActions.length).toBeGreaterThan(0);
  });
});
