import { describe, expect, it } from "vitest";
import type { ManualItem } from "../types";
import {
  detectDuplicateOwnershipIdentifiers,
  detectFraudSignals,
  detectMissingOwnershipProof,
  detectValueOverrideAnomalies,
  type OwnershipAwareManualItem,
  summarizeFraudFindings,
} from "./fraudRules";

function makeItem(
  id: string,
  overrides: Partial<OwnershipAwareManualItem> = {},
): OwnershipAwareManualItem {
  const base: ManualItem = {
    id,
    name: `Item ${id}`,
    category: "laptop",
    estimatedValue: 1200,
  };

  return {
    ...base,
    ...overrides,
  };
}

describe("fraudRules", () => {
  it("flags duplicate serial numbers", () => {
    const items = [
      makeItem("1", { ownership: { status: "serial_captured", serialNumber: "SN-ABC-123" } }),
      makeItem("2", { ownership: { status: "serial_captured", serialNumber: "sn abc 123" } }),
    ];

    const findings = detectDuplicateOwnershipIdentifiers(items);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: "duplicate-ownership-identifier",
      severity: "high",
      itemIds: ["1", "2"],
    });
  });

  it("flags suspicious value overrides", () => {
    const items = [
      makeItem("1", {
        valuation: {
          estimatedValue: 1200,
          overrideValue: 5000,
          finalValue: 5000,
          source: "user",
          overrideReason: "receipt upload",
        },
      }),
    ];

    const findings = detectValueOverrideAnomalies(items);

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("high");
  });

  it("flags high value items without ownership proof", () => {
    const items = [
      makeItem("1", {
        category: "camera",
        estimatedValue: 2500,
      }),
    ];

    const findings = detectMissingOwnershipProof(items);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("missing-ownership-proof");
  });

  it("respects verified ownership proof", () => {
    const items = [
      makeItem("1", {
        category: "camera",
        estimatedValue: 2500,
        ownership: {
          status: "verified",
          serialNumber: "SN123456",
        },
      }),
    ];

    expect(detectMissingOwnershipProof(items)).toEqual([]);
  });

  it("combines all fraud signals and summarizes them", () => {
    const items = [
      makeItem("1", {
        ownership: { status: "serial_captured", serialNumber: "SN-111" },
        valuation: { estimatedValue: 1000, overrideValue: 3500, finalValue: 3500, source: "user" },
      }),
      makeItem("2", {
        ownership: { status: "serial_captured", serialNumber: "sn 111" },
        category: "camera",
        estimatedValue: 2500,
      }),
      makeItem("3", {
        category: "camera",
        estimatedValue: 2500,
      }),
    ];

    const findings = detectFraudSignals(items);
    const summary = summarizeFraudFindings(findings);

    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(summary.total).toBe(findings.length);
    expect(summary.high).toBeGreaterThanOrEqual(1);
    expect(summary.medium).toBeGreaterThanOrEqual(1);
  });
});
