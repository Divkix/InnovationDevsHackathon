import { describe, expect, it } from "vitest";
import type { DetectedItem, ManualItem, PolicyType } from "@/types";
import { getHazardWarnings } from "./hazardRules";
import { getCoverageRecommendations } from "./recommendationEngine";

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

function getRecommendations(policyType: PolicyType, manualItems: ManualItem[] = []) {
  const detectedItems = [
    makeDetectedItem("laptop", "det-1"),
    makeDetectedItem("car", "det-2"),
    makeDetectedItem("microwave", "det-3"),
  ];

  return getCoverageRecommendations({
    detectedItems,
    manualItems,
    policyType,
    hazards: getHazardWarnings(detectedItems),
  });
}

function getValuablesRecommendations() {
  return getCoverageRecommendations({
    detectedItems: [makeDetectedItem("laptop", "det-1")],
    manualItems: [
      {
        id: "manual-1",
        name: "Grandma Ring",
        category: "jewelry",
        estimatedValue: 3200,
      },
    ],
    policyType: "renters",
    hazards: [],
  });
}

describe("recommendationEngine", () => {
  it("recommends getting insured when the current policy is none", () => {
    const recommendations = getRecommendations("none");

    expect(
      recommendations.some((recommendation) => recommendation.id === "coverage-get-insured"),
    ).toBe(true);
  });

  it("recommends auto coverage when a vehicle is uncovered", () => {
    const recommendations = getRecommendations("renters");

    expect(
      recommendations.some((recommendation) => recommendation.id === "coverage-add-auto"),
    ).toBe(true);
  });

  it("recommends scheduled coverage for valuables", () => {
    const recommendations = getValuablesRecommendations();

    expect(
      recommendations.some((recommendation) => recommendation.id === "coverage-schedule-valuables"),
    ).toBe(true);
  });

  it("includes a prevention recommendation when hazards exist", () => {
    const recommendations = getRecommendations("renters");

    expect(
      recommendations.some(
        (recommendation) => recommendation.id === "prevention-reduce-hazard-risk",
      ),
    ).toBe(true);
  });
});
