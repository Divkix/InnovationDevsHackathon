import coverageRules from '@/data/coverageRules.json';

/**
 * Policy types supported by the coverage rules engine
 * @typedef {'renters' | 'homeowners' | 'auto' | 'none'} PolicyType
 */

/**
 * Coverage status for an item
 * @typedef {'covered' | 'conditional' | 'not_covered'} CoverageStatus
 */

/**
 * Color coding for coverage status
 * @typedef {'green' | 'yellow' | 'red'} CoverageColor
 */

/**
 * Coverage result returned by the lookup function
 * @typedef {Object} CoverageResult
 * @property {CoverageStatus} status - The coverage status
 * @property {CoverageColor} color - The color code for UI display
 * @property {number} estimatedValue - Estimated dollar value of the item
 * @property {string} note - Human-readable explanation of coverage
 * @property {string[]} [conditions] - Optional conditions that apply to coverage
 * @property {string} upgrade - Recommendation for upgrading coverage
 */

/**
 * Default coverage result for unknown categories
 * @type {CoverageResult}
 */
const DEFAULT_COVERAGE_RESULT = {
  status: 'not_covered',
  color: 'red',
  estimatedValue: 0,
  note: 'Unknown category — assuming not covered. Please verify with your insurance provider.',
  conditions: [],
  upgrade: 'Consult with an insurance agent about coverage for this item'
};

/**
 * Valid policy types
 * @type {PolicyType[]}
 */
export const VALID_POLICY_TYPES = ['renters', 'homeowners', 'auto', 'none'];

/**
 * Normalizes a category name to match the keys in coverageRules.json
 * Handles case insensitivity and common variations
 * @param {string} category - The category name to normalize
 * @returns {string} Normalized category name
 */
function normalizeCategory(category) {
  if (!category || typeof category !== 'string') {
    return '';
  }
  
  // Convert to lowercase and trim
  return category.toLowerCase().trim();
}

/**
 * Normalizes a policy type to ensure it's valid
 * @param {string} policyType - The policy type to normalize
 * @returns {PolicyType} Valid policy type or 'none' as fallback
 */
function normalizePolicyType(policyType) {
  if (!policyType || typeof policyType !== 'string') {
    return 'none';
  }
  
  const normalized = policyType.toLowerCase().trim();
  
  // Map common variations to valid types
  const policyMap = {
    'renters': 'renters',
    'renter': 'renters',
    "renter's": 'renters',
    'homeowners': 'homeowners',
    'homeowner': 'homeowners',
    "homeowner's": 'homeowners',
    'auto': 'auto',
    'car': 'auto',
    'vehicle': 'auto',
    'none': 'none',
    'no': 'none',
    'uninsured': 'none'
  };
  
  return policyMap[normalized] || 'none';
}

/**
 * Looks up coverage information for a given category and policy type
 * Pure function: (category, policyType) → CoverageResult
 * 
 * @param {string} category - The COCO category name (e.g., 'laptop', 'car', 'bicycle')
 * @param {string} policyType - The policy type ('renters', 'homeowners', 'auto', 'none')
 * @returns {CoverageResult} Coverage result with status, color, value, note, conditions, and upgrade
 * 
 * @example
 * const result = lookupCoverage('laptop', 'renters');
 * // Returns: { status: 'covered', color: 'green', estimatedValue: 1200, ... }
 * 
 * const result = lookupCoverage('car', 'renters');
 * // Returns: { status: 'not_covered', color: 'red', estimatedValue: 15000, ... }
 */
export function lookupCoverage(category, policyType) {
  // Normalize inputs
  const normalizedCategory = normalizeCategory(category);
  const normalizedPolicy = normalizePolicyType(policyType);
  
  // Get the policy rules
  const policyRules = coverageRules[normalizedPolicy];
  
  // If policy doesn't exist, return default
  if (!policyRules) {
    return { ...DEFAULT_COVERAGE_RESULT };
  }
  
  // Look up the category in the policy rules
  const categoryRule = policyRules[normalizedCategory];
  
  // If category not found, return default with the category name in the note
  if (!categoryRule) {
    return {
      ...DEFAULT_COVERAGE_RESULT,
      note: `Category "${category}" not found in coverage rules — assuming not covered. Please verify with your insurance provider.`
    };
  }
  
  // Return the coverage result with a copy to avoid mutations
  return {
    status: categoryRule.status,
    color: categoryRule.color,
    estimatedValue: categoryRule.estimatedValue,
    note: categoryRule.note,
    conditions: categoryRule.conditions ? [...categoryRule.conditions] : [],
    upgrade: categoryRule.upgrade
  };
}

/**
 * Gets all available categories for a given policy type
 * @param {string} policyType - The policy type to query
 * @returns {string[]} Array of category names
 */
export function getCategoriesForPolicy(policyType) {
  // Don't normalize - check if it's a valid policy type
  if (!policyType || typeof policyType !== 'string') {
    return [];
  }
  
  const normalizedPolicy = policyType.toLowerCase().trim();
  
  // Check if it's a valid policy type before returning categories
  if (!VALID_POLICY_TYPES.includes(normalizedPolicy)) {
    return [];
  }
  
  const policyRules = coverageRules[normalizedPolicy];
  
  if (!policyRules) {
    return [];
  }
  
  return Object.keys(policyRules).sort();
}

/**
 * Gets all available policy types
 * @returns {string[]} Array of policy type names
 */
export function getAvailablePolicyTypes() {
  return [...VALID_POLICY_TYPES];
}

/**
 * Checks if a category exists in the coverage rules for any policy
 * @param {string} category - The category to check
 * @returns {boolean} True if the category exists
 */
export function isValidCategory(category) {
  const normalizedCategory = normalizeCategory(category);
  
  // Check if category exists in any policy
  for (const policyType of VALID_POLICY_TYPES) {
    const policyRules = coverageRules[policyType];
    if (policyRules && policyRules[normalizedCategory]) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets coverage comparison across all policy types for a category
 * @param {string} category - The category to compare
 * @returns {Object.<string, CoverageResult>} Map of policy type to coverage result
 */
export function compareCoverageAcrossPolicies(category) {
  const normalizedCategory = normalizeCategory(category);
  const comparison = {};
  
  for (const policyType of VALID_POLICY_TYPES) {
    comparison[policyType] = lookupCoverage(normalizedCategory, policyType);
  }
  
  return comparison;
}

export default lookupCoverage;
