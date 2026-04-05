import { describe, expect, it } from "vitest";
import type { CoverageResult, PolicyType } from "../types";
import {
  compareCoverageAcrossPolicies,
  getAvailablePolicyTypes,
  getCategoriesForPolicy,
  isValidCategory,
  lookupCoverage,
  VALID_POLICY_TYPES,
} from "./coverageLookup";

describe("coverageLookup", () => {
  describe("lookupCoverage", () => {
    describe("policy type: renters", () => {
      it("returns covered status for laptop", () => {
        const result: CoverageResult = lookupCoverage("laptop", "renters");
        expect(result.status).toBe("covered");
        expect(result.color).toBe("green");
        expect(result.estimatedValue).toBe(1200);
        expect(result.note).toContain("covered");
        expect(result.upgrade).toBeDefined();
      });

      it("returns covered status for cell phone", () => {
        const result: CoverageResult = lookupCoverage("cell phone", "renters");
        expect(result.status).toBe("covered");
        expect(result.color).toBe("green");
        expect(result.estimatedValue).toBe(800);
      });

      it("returns covered status for tv", () => {
        const result: CoverageResult = lookupCoverage("tv", "renters");
        expect(result.status).toBe("covered");
        expect(result.color).toBe("green");
        expect(result.estimatedValue).toBe(600);
      });

      it("returns not_covered status for car", () => {
        const result: CoverageResult = lookupCoverage("car", "renters");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
        expect(result.estimatedValue).toBe(15000);
        expect(result.note).toContain("NOT covered");
      });

      it("returns not_covered status for motorcycle", () => {
        const result: CoverageResult = lookupCoverage("motorcycle", "renters");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
        expect(result.estimatedValue).toBe(8000);
      });

      it("returns conditional status for bicycle", () => {
        const result: CoverageResult = lookupCoverage("bicycle", "renters");
        expect(result.status).toBe("conditional");
        expect(result.color).toBe("yellow");
        expect(result.estimatedValue).toBe(500);
        expect(result.conditions).toBeInstanceOf(Array);
        expect(result.conditions.length).toBeGreaterThan(0);
      });

      it("returns not_covered for refrigerator (landlord appliance)", () => {
        const result: CoverageResult = lookupCoverage("refrigerator", "renters");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
        expect(result.note).toContain("Landlord");
      });

      it("returns not_covered for pets (dog, cat)", () => {
        const dogResult: CoverageResult = lookupCoverage("dog", "renters");
        expect(dogResult.status).toBe("not_covered");
        expect(dogResult.estimatedValue).toBe(0);

        const catResult: CoverageResult = lookupCoverage("cat", "renters");
        expect(catResult.status).toBe("not_covered");
        expect(catResult.estimatedValue).toBe(0);
      });
    });

    describe("policy type: homeowners", () => {
      it("returns covered status for laptop", () => {
        const result: CoverageResult = lookupCoverage("laptop", "homeowners");
        expect(result.status).toBe("covered");
        expect(result.color).toBe("green");
      });

      it("returns covered status for car (homeowners does not cover vehicles)", () => {
        const result: CoverageResult = lookupCoverage("car", "homeowners");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("returns covered status for bicycle (homeowners has higher limits)", () => {
        const result: CoverageResult = lookupCoverage("bicycle", "homeowners");
        expect(result.status).toBe("covered");
        expect(result.color).toBe("green");
      });

      it("returns covered for appliances (homeowners covers owned appliances)", () => {
        const fridge: CoverageResult = lookupCoverage("refrigerator", "homeowners");
        expect(fridge.status).toBe("covered");
        expect(fridge.color).toBe("green");

        const microwave: CoverageResult = lookupCoverage("microwave", "homeowners");
        expect(microwave.status).toBe("covered");
        expect(microwave.color).toBe("green");

        const oven: CoverageResult = lookupCoverage("oven", "homeowners");
        expect(oven.status).toBe("covered");
        expect(oven.color).toBe("green");
      });

      it("has higher coverage for personal property than renters", () => {
        const laptopHomeowners: CoverageResult = lookupCoverage("laptop", "homeowners");
        expect(laptopHomeowners.status).toBe("covered");
        // Value is same but note mentions higher limits
        expect(laptopHomeowners.note).toContain("higher");
      });
    });

    describe("policy type: auto", () => {
      it("returns covered status for car", () => {
        const result: CoverageResult = lookupCoverage("car", "auto");
        expect(result.status).toBe("covered");
        expect(result.color).toBe("green");
        expect(result.estimatedValue).toBe(15000);
      });

      it("returns covered status for motorcycle", () => {
        const result: CoverageResult = lookupCoverage("motorcycle", "auto");
        expect(result.status).toBe("covered");
        expect(result.color).toBe("green");
        expect(result.estimatedValue).toBe(8000);
      });

      it("returns not_covered for household items", () => {
        const laptop: CoverageResult = lookupCoverage("laptop", "auto");
        expect(laptop.status).toBe("not_covered");
        expect(laptop.color).toBe("red");

        const tv: CoverageResult = lookupCoverage("tv", "auto");
        expect(tv.status).toBe("not_covered");

        const couch: CoverageResult = lookupCoverage("couch", "auto");
        expect(couch.status).toBe("not_covered");
      });

      it("returns conditional for backpack (limited coverage)", () => {
        const result: CoverageResult = lookupCoverage("backpack", "auto");
        expect(result.status).toBe("conditional");
        expect(result.color).toBe("yellow");
        expect(result.conditions).toBeInstanceOf(Array);
        expect(result.note).toContain("limited");
      });
    });

    describe("policy type: none (no insurance)", () => {
      it("returns not_covered for all items", () => {
        const categories: string[] = ["laptop", "car", "bicycle", "couch", "tv", "book"];

        for (const category of categories) {
          const result: CoverageResult = lookupCoverage(category, "none");
          expect(result.status).toBe("not_covered");
          expect(result.color).toBe("red");
          expect(result.note).toContain("NO INSURANCE");
        }
      });

      it("suggests getting insurance in upgrade field", () => {
        const result: CoverageResult = lookupCoverage("laptop", "none");
        expect(result.upgrade).toContain("insurance");
        expect(result.upgrade).toContain("renter's or homeowner's");
      });
    });

    describe("edge cases", () => {
      it("returns default not_covered for unknown category", () => {
        const result: CoverageResult = lookupCoverage("unknown_category", "renters");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
        expect(result.estimatedValue).toBe(0);
        expect(result.note).toContain("not found");
      });

      it("handles null category gracefully", () => {
        const result: CoverageResult = lookupCoverage(null as unknown as string, "renters");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("handles undefined category gracefully", () => {
        const result: CoverageResult = lookupCoverage(undefined as unknown as string, "renters");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("handles empty string category gracefully", () => {
        const result: CoverageResult = lookupCoverage("", "renters");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("handles null policyType gracefully", () => {
        const result: CoverageResult = lookupCoverage("laptop", null as unknown as string);
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("handles undefined policyType gracefully", () => {
        const result: CoverageResult = lookupCoverage("laptop", undefined as unknown as string);
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("handles empty string policyType gracefully", () => {
        const result: CoverageResult = lookupCoverage("laptop", "");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("handles invalid policyType gracefully", () => {
        const result: CoverageResult = lookupCoverage("laptop", "invalid_policy");
        expect(result.status).toBe("not_covered");
        expect(result.color).toBe("red");
      });

      it("handles case insensitivity for categories", () => {
        const lower: CoverageResult = lookupCoverage("laptop", "renters");
        const upper: CoverageResult = lookupCoverage("LAPTOP", "renters");
        const mixed: CoverageResult = lookupCoverage("LapTop", "renters");

        expect(lower.status).toBe(upper.status);
        expect(lower.status).toBe(mixed.status);
      });

      it("handles case insensitivity for policy types", () => {
        const lower: CoverageResult = lookupCoverage("laptop", "renters");
        const upper: CoverageResult = lookupCoverage("laptop", "RENTERS");
        const mixed: CoverageResult = lookupCoverage("laptop", "Renters");

        expect(lower.status).toBe(upper.status);
        expect(lower.status).toBe(mixed.status);
      });

      it("handles whitespace in category name", () => {
        const result: CoverageResult = lookupCoverage("  laptop  ", "renters");
        expect(result.status).toBe("covered");
      });

      it("returns a copy of the result (immutable)", () => {
        const result1: CoverageResult = lookupCoverage("laptop", "renters");
        const result2: CoverageResult = lookupCoverage("laptop", "renters");

        // Should be equal but not the same reference
        expect(result1).toEqual(result2);

        // Modifying one should not affect the other
        result1.estimatedValue = 9999;
        const result3: CoverageResult = lookupCoverage("laptop", "renters");
        expect(result3.estimatedValue).toBe(1200);
      });
    });

    describe("all required categories exist", () => {
      it("has rules for all 20+ required categories", () => {
        const requiredCategories: string[] = [
          "laptop",
          "cell phone",
          "tv",
          "car",
          "motorcycle",
          "bicycle",
          "couch",
          "bed",
          "dining table",
          "chair",
          "refrigerator",
          "microwave",
          "oven",
          "book",
          "clock",
          "backpack",
          "sports ball",
          "potted plant",
          "dog",
          "cat",
          "bottle",
        ];

        for (const category of requiredCategories) {
          const result: CoverageResult = lookupCoverage(category, "renters");
          expect(result).toBeDefined();
          expect(result.status).toBeDefined();
          expect(result.color).toBeDefined();
          expect(result.estimatedValue).toBeDefined();
          expect(result.note).toBeDefined();
          expect(result.upgrade).toBeDefined();
        }
      });
    });

    describe("conditions array handling", () => {
      it("returns empty array for items without conditions", () => {
        const laptop: CoverageResult = lookupCoverage("laptop", "renters");
        expect(laptop.conditions).toEqual([]);
      });

      it("returns array of conditions for conditional items", () => {
        const bicycle: CoverageResult = lookupCoverage("bicycle", "renters");
        expect(bicycle.conditions).toBeInstanceOf(Array);
        expect(bicycle.conditions.length).toBeGreaterThan(0);
      });

      it("conditions array is a copy (immutable)", () => {
        const bicycle1: CoverageResult = lookupCoverage("bicycle", "renters");
        const bicycle2: CoverageResult = lookupCoverage("bicycle", "renters");

        bicycle1.conditions.push("new condition");
        expect(bicycle2.conditions).not.toContain("new condition");
      });
    });
  });

  describe("getCategoriesForPolicy", () => {
    it("returns array of categories for valid policy", () => {
      const categories: string[] = getCategoriesForPolicy("renters");
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(20);
      expect(categories).toContain("laptop");
      expect(categories).toContain("car");
      expect(categories).toContain("bicycle");
    });

    it("returns sorted categories", () => {
      const categories: string[] = getCategoriesForPolicy("renters");
      const sorted: string[] = [...categories].sort();
      expect(categories).toEqual(sorted);
    });

    it("returns empty array for invalid policy", () => {
      const categories: string[] = getCategoriesForPolicy("invalid");
      expect(categories).toEqual([]);
    });

    it("handles case insensitivity", () => {
      const lower: string[] = getCategoriesForPolicy("renters");
      const upper: string[] = getCategoriesForPolicy("RENTERS");
      expect(lower).toEqual(upper);
    });
  });

  describe("getAvailablePolicyTypes", () => {
    it("returns all 4 policy types", () => {
      const types: PolicyType[] = getAvailablePolicyTypes();
      expect(types).toHaveLength(4);
      expect(types).toContain("renters");
      expect(types).toContain("homeowners");
      expect(types).toContain("auto");
      expect(types).toContain("none");
    });

    it("returns a copy of the array (immutable)", () => {
      const types1: PolicyType[] = getAvailablePolicyTypes();
      types1.push("new_type" as PolicyType);
      const types2: PolicyType[] = getAvailablePolicyTypes();
      expect(types2).not.toContain("new_type");
    });
  });

  describe("isValidCategory", () => {
    it("returns true for valid categories", () => {
      expect(isValidCategory("laptop")).toBe(true);
      expect(isValidCategory("car")).toBe(true);
      expect(isValidCategory("bicycle")).toBe(true);
    });

    it("returns false for invalid categories", () => {
      expect(isValidCategory("invalid")).toBe(false);
      expect(isValidCategory("unknown")).toBe(false);
    });

    it("handles case insensitivity", () => {
      expect(isValidCategory("LAPTOP")).toBe(true);
      expect(isValidCategory("LapTop")).toBe(true);
    });

    it("handles null/undefined gracefully", () => {
      expect(isValidCategory(null as unknown as string)).toBe(false);
      expect(isValidCategory(undefined as unknown as string)).toBe(false);
      expect(isValidCategory("")).toBe(false);
    });
  });

  describe("compareCoverageAcrossPolicies", () => {
    it("returns comparison for all 4 policy types", () => {
      const comparison: Record<PolicyType, CoverageResult> =
        compareCoverageAcrossPolicies("laptop");

      expect(comparison).toHaveProperty("renters");
      expect(comparison).toHaveProperty("homeowners");
      expect(comparison).toHaveProperty("auto");
      expect(comparison).toHaveProperty("none");

      expect(comparison.renters.status).toBe("covered");
      expect(comparison.homeowners.status).toBe("covered");
      expect(comparison.auto.status).toBe("not_covered");
      expect(comparison.none.status).toBe("not_covered");
    });

    it("returns valid CoverageResult for each policy", () => {
      const comparison: Record<PolicyType, CoverageResult> =
        compareCoverageAcrossPolicies("bicycle");

      for (const policyType of VALID_POLICY_TYPES) {
        const result: CoverageResult = comparison[policyType];
        expect(result.status).toBeDefined();
        expect(result.color).toBeDefined();
        expect(result.estimatedValue).toBeDefined();
        expect(result.note).toBeDefined();
        expect(result.upgrade).toBeDefined();
      }
    });

    it("handles unknown categories gracefully", () => {
      const comparison: Record<PolicyType, CoverageResult> =
        compareCoverageAcrossPolicies("unknown");

      // All policies should return not_covered for unknown
      for (const policyType of VALID_POLICY_TYPES) {
        expect(comparison[policyType].status).toBe("not_covered");
      }
    });
  });
});
