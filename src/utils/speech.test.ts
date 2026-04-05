import { describe, expect, it } from "vitest";
import type { CoverageResult } from "../types";
import { buildCoverageVoiceCopy } from "./speech";

const coveredCoverage: CoverageResult = {
  status: "covered",
  color: "green",
  estimatedValue: 1200,
  note: "Personal electronics are covered under renter's personal property coverage.",
  conditions: [],
  upgrade: "Consider replacement cost coverage for full value reimbursement.",
};

describe("speech helpers", () => {
  it("builds a compact coverage summary when no explanation text is provided", () => {
    const copy = buildCoverageVoiceCopy({
      category: "Laptop",
      policyType: "renters",
      coverage: coveredCoverage,
    });

    expect(copy).toContain("Laptop.");
    expect(copy).toContain("This item is covered under renter's insurance.");
    expect(copy).toContain("Personal electronics are covered");
    expect(copy).toContain("Upgrade option: Consider replacement cost coverage");
  });

  it("prefers explanation text when Gemini content is available", () => {
    const copy = buildCoverageVoiceCopy({
      category: "Laptop",
      policyType: "renters",
      coverage: coveredCoverage,
      explanation: "Your laptop is covered under renters insurance in this case.",
    });

    expect(copy).toBe("Your laptop is covered under renters insurance in this case.");
  });
});
