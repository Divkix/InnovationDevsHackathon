import coverageRules from "@/data/coverageRules.json";
import type { CoverageColor, CoverageResult, CoverageStatus, PolicyType } from "../types";

/**
 * Default coverage result for unknown categories
 */
const DEFAULT_COVERAGE_RESULT: CoverageResult = {
  status: "not_covered",
  color: "red",
  estimatedValue: 0,
  note: "Unknown category — assuming not covered. Please verify with your insurance provider.",
  conditions: [],
  upgrade: "Consult with an insurance agent about coverage for this item",
};

/**
 * Valid policy types
 */
export const VALID_POLICY_TYPES: PolicyType[] = ["renters", "homeowners", "auto", "none"];

/**
 * Normalizes a category name to match the keys in coverageRules.json
 * Handles case insensitivity and common variations
 */
function normalizeCategory(category: string): string {
  if (!category || typeof category !== "string") {
    return "";
  }

  // Convert to lowercase and trim
  return category.toLowerCase().trim();
}

/**
 * Normalizes a policy type to ensure it's valid
 */
function normalizePolicyType(policyType: string): PolicyType {
  if (!policyType || typeof policyType !== "string") {
    return "none";
  }

  const normalized = policyType.toLowerCase().trim();

  // Map common variations to valid types
  const policyMap: Record<string, PolicyType> = {
    renters: "renters",
    renter: "renters",
    "renter's": "renters",
    homeowners: "homeowners",
    homeowner: "homeowners",
    "homeowner's": "homeowners",
    auto: "auto",
    car: "auto",
    vehicle: "auto",
    none: "none",
    no: "none",
    uninsured: "none",
  };

  return policyMap[normalized] || "none";
}

/**
 * Looks up coverage information for a given category and policy type
 * Pure function: (category, policyType) → CoverageResult
 *
 * @example
 * const result = lookupCoverage('laptop', 'renters');
 * // Returns: { status: 'covered', color: 'green', estimatedValue: 1200, ... }
 *
 * const result = lookupCoverage('car', 'renters');
 * // Returns: { status: 'not_covered', color: 'red', estimatedValue: 15000, ... }
 */
export function lookupCoverage(category: string, policyType: string): CoverageResult {
  // Normalize inputs
  const normalizedCategory = normalizeCategory(category);
  const normalizedPolicy = normalizePolicyType(policyType);

  // Get the policy rules
  const policyRules = coverageRules[normalizedPolicy as keyof typeof coverageRules];

  // If policy doesn't exist, return default
  if (!policyRules) {
    return { ...DEFAULT_COVERAGE_RESULT };
  }

  // Look up the category in the policy rules
  const categoryRule = policyRules[normalizedCategory as keyof typeof policyRules];

  // If category not found, return default with the category name in the note
  if (!categoryRule) {
    return {
      ...DEFAULT_COVERAGE_RESULT,
      note: `Category "${category}" not found in coverage rules — assuming not covered. Please verify with your insurance provider.`,
    };
  }

  // Return the coverage result with a copy to avoid mutations
  return {
    status: categoryRule.status as CoverageStatus,
    color: categoryRule.color as CoverageColor,
    estimatedValue: categoryRule.estimatedValue,
    note: categoryRule.note,
    conditions: categoryRule.conditions ? [...categoryRule.conditions] : [],
    upgrade: categoryRule.upgrade,
  };
}

/**
 * Gets all available categories for a given policy type
 */
export function getCategoriesForPolicy(policyType: string): string[] {
  // Don't normalize - check if it's a valid policy type
  if (!policyType || typeof policyType !== "string") {
    return [];
  }

  const normalizedPolicy = policyType.toLowerCase().trim() as PolicyType;

  // Check if it's a valid policy type before returning categories
  if (!VALID_POLICY_TYPES.includes(normalizedPolicy)) {
    return [];
  }

  const policyRules = coverageRules[normalizedPolicy as keyof typeof coverageRules];

  if (!policyRules) {
    return [];
  }

  return Object.keys(policyRules).sort();
}

/**
 * Gets all available policy types
 */
export function getAvailablePolicyTypes(): PolicyType[] {
  return [...VALID_POLICY_TYPES];
}

/**
 * Checks if a category exists in the coverage rules for any policy
 */
export function isValidCategory(category: string): boolean {
  const normalizedCategory = normalizeCategory(category);

  // Check if category exists in any policy
  for (const policyType of VALID_POLICY_TYPES) {
    const policyRules = coverageRules[policyType as keyof typeof coverageRules];
    if (policyRules?.[normalizedCategory as keyof typeof policyRules]) {
      return true;
    }
  }

  return false;
}

/**
 * Gets coverage comparison across all policy types for a category
 */
export function compareCoverageAcrossPolicies(
  category: string,
): Record<PolicyType, CoverageResult> {
  const normalizedCategory = normalizeCategory(category);
  const comparison: Record<PolicyType, CoverageResult> = {
    renters: DEFAULT_COVERAGE_RESULT,
    homeowners: DEFAULT_COVERAGE_RESULT,
    auto: DEFAULT_COVERAGE_RESULT,
    none: DEFAULT_COVERAGE_RESULT,
  };

  for (const policyType of VALID_POLICY_TYPES) {
    comparison[policyType] = lookupCoverage(normalizedCategory, policyType);
  }

  return comparison;
}

export default lookupCoverage;
