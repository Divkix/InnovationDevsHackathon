import { describe, expect, it } from "vitest";
import type { Detection } from "@/types";
import { getHazardCategories, getHazardWarnings } from "./hazardRules";

function makeDetection(
  categoryName: string,
  originX: number,
  originY: number,
  width = 80,
  height = 80,
): Detection {
  return {
    boundingBox: {
      originX,
      originY,
      width,
      height,
    },
    categories: [
      {
        categoryName,
        score: 0.9,
        displayName: categoryName,
      },
    ],
  };
}

describe("hazardRules", () => {
  it("returns a toaster and book fire risk when detections are nearby", () => {
    const warnings = getHazardWarnings([
      makeDetection("toaster", 100, 100),
      makeDetection("book", 130, 120),
    ]);

    expect(warnings.some((warning) => warning.id === "hazard-toaster-book")).toBe(true);
  });

  it("returns a missing extinguisher warning for kitchen appliances", () => {
    const warnings = getHazardWarnings([makeDetection("microwave", 120, 100)]);

    expect(warnings.some((warning) => warning.id === "hazard-missing-extinguisher")).toBe(true);
  });

  it("returns a positive safety signal when an extinguisher is present", () => {
    const warnings = getHazardWarnings([
      makeDetection("oven", 100, 100),
      makeDetection("fire extinguisher", 300, 100),
    ]);

    const positive = warnings.find((warning) => warning.id === "hazard-extinguisher-positive");
    expect(positive?.positive).toBe(true);
  });

  it("maps negative warnings into a hazard category set", () => {
    const warnings = getHazardWarnings([
      makeDetection("refrigerator", 100, 100),
      makeDetection("microwave", 200, 100),
      makeDetection("oven", 300, 100),
    ]);

    const categories = getHazardCategories(warnings);

    expect(categories.has("microwave")).toBe(true);
    expect(categories.has("oven")).toBe(true);
    expect(categories.has("refrigerator")).toBe(true);
  });
});
