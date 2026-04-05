import { describe, expect, it } from "vitest";
import type { DetectedItem, ManualItem, PolicyType } from "@/types";
import { simulateDisaster } from "./disasterSimulator";

function makeDetectedItem(category: string, id: string): DetectedItem {
  return {
    id,
    category,
    confidence: 0.9,
    boundingBox: {
      originX: 0,
      originY: 0,
      width: 100,
      height: 100,
    },
    categories: [
      {
        categoryName: category,
        score: 0.9,
        displayName: category,
      },
    ],
  };
}

function runSimulation(policyType: PolicyType, manualItems: ManualItem[] = []) {
  return simulateDisaster({
    disasterType: "fire",
    detectedItems: [makeDetectedItem("laptop", "det-1"), makeDetectedItem("tv", "det-2")],
    manualItems,
    policyType,
  });
}

describe("disasterSimulator", () => {
  it("returns fire simulation totals and impacted items", () => {
    const result = runSimulation("renters");

    expect(result.type).toBe("fire");
    expect(result.totalLoss).toBeGreaterThan(0);
    expect(result.impactedItems.length).toBeGreaterThan(0);
    expect(result.insight).toContain("fire");
  });

  it("shows worse out-of-pocket exposure for no insurance than renters", () => {
    const uninsured = runSimulation("none");
    const renters = runSimulation("renters");

    expect(uninsured.currentPolicyOutOfPocket).toBeGreaterThan(renters.currentPolicyOutOfPocket);
  });

  it("includes manual items in the simulation", () => {
    const manualItems: ManualItem[] = [
      {
        id: "manual-1",
        name: "Studio Camera",
        category: "cameras",
        estimatedValue: 2200,
      },
    ];

    const result = runSimulation("renters", manualItems);

    expect(result.impactedItems.some((item) => item.itemId === "manual-1")).toBe(true);
  });
});
