import { lookupCoverage } from './coverageLookup.js';

/**
 * Represents a detected item with coverage information
 * @typedef {Object} DetectedItem
 * @property {string} id - Unique identifier for the item
 * @property {string} category - COCO category name
 * @property {number} [confidence] - Detection confidence score (0-1)
 * @property {Object} [bbox] - Bounding box coordinates
 * @property {number} bbox.x - X coordinate
 * @property {number} bbox.y - Y coordinate
 * @property {number} bbox.width - Width
 * @property {number} bbox.height - Height
 */

/**
 * Represents a manual item added by the user
 * @typedef {Object} ManualItem
 * @property {string} id - Unique identifier
 * @property {string} name - User-defined name
 * @property {string} category - Insurance category
 * @property {number} estimatedValue - User-provided estimated value
 */

/**
 * Result of value calculations
 * @typedef {Object} ValueCalculationResult
 * @property {number} totalValue - Sum of all item values
 * @property {number} protectedValue - Sum of covered (green) item values
 * @property {number} unprotectedValue - Sum of not_covered (red) and conditional (yellow) item values
 * @property {number} coverageGapPercentage - Percentage of value not covered, rounded to 1 decimal
 * @property {ItemBreakdown[]} items - Breakdown of each item's status and value
 */

/**
 * Individual item breakdown
 * @typedef {Object} ItemBreakdown
 * @property {string} id - Item identifier
 * @property {string} category - Item category/name
 * @property {number} estimatedValue - Item value
 * @property {string} status - Coverage status
 * @property {string} color - UI color code
 */

/**
 * Calculates the total value of all items
 * @param {DetectedItem[] | ManualItem[]} items - Array of detected or manual items
 * @returns {number} Total value, always >= 0
 */
export function calculateTotalValue(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }
  
  return items.reduce((total, item) => {
    const value = typeof item.estimatedValue === 'number' ? item.estimatedValue : 0;
    return total + Math.max(0, value);
  }, 0);
}

/**
 * Calculates the protected value (sum of covered/green items)
 * @param {ItemBreakdown[]} breakdown - Item breakdown with status
 * @returns {number} Protected value, always >= 0
 */
export function calculateProtectedValue(breakdown) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) {
    return 0;
  }
  
  return breakdown
    .filter(item => item.status === 'covered')
    .reduce((total, item) => total + Math.max(0, item.estimatedValue), 0);
}

/**
 * Calculates the unprotected value (sum of not_covered and conditional items)
 * @param {ItemBreakdown[]} breakdown - Item breakdown with status
 * @returns {number} Unprotected value, always >= 0
 */
export function calculateUnprotectedValue(breakdown) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) {
    return 0;
  }
  
  return breakdown
    .filter(item => item.status === 'not_covered' || item.status === 'conditional')
    .reduce((total, item) => total + Math.max(0, item.estimatedValue), 0);
}

/**
 * Calculates the coverage gap percentage
 * Formula: (unprotectedValue / totalValue) * 100, rounded to 1 decimal place
 * Returns 0.0 when totalValue is 0 to avoid division by zero
 * 
 * @param {number} unprotectedValue - Sum of unprotected/conditional item values
 * @param {number} totalValue - Sum of all item values
 * @returns {number} Coverage gap percentage (0.0 - 100.0), rounded to 1 decimal
 */
export function calculateCoverageGapPercentage(unprotectedValue, totalValue) {
  // Handle edge cases
  if (typeof unprotectedValue !== 'number' || typeof totalValue !== 'number') {
    return 0.0;
  }
  
  // Ensure non-negative values
  const safeUnprotected = Math.max(0, unprotectedValue);
  const safeTotal = Math.max(0, totalValue);
  
  // If no items or total is 0, return 0.0%
  if (safeTotal === 0) {
    return 0.0;
  }
  
  // Calculate percentage and round to 1 decimal place
  const percentage = (safeUnprotected / safeTotal) * 100;
  return Math.round(percentage * 10) / 10;
}

/**
 * Creates a breakdown of all items with their coverage status for a given policy
 * @param {DetectedItem[]} detectedItems - Array of detected items from camera
 * @param {ManualItem[]} manualItems - Array of manually added items
 * @param {string} policyType - The active policy type
 * @returns {ItemBreakdown[]} Array of items with status and value information
 */
export function createItemBreakdown(detectedItems, manualItems, policyType) {
  const breakdown = [];
  const seenIds = new Set();
  
  // Process detected items
  if (Array.isArray(detectedItems)) {
    for (const item of detectedItems) {
      // Skip items without required fields
      if (!item || !item.id || !item.category) {
        continue;
      }
      
      // Skip duplicates
      if (seenIds.has(item.id)) {
        continue;
      }
      seenIds.add(item.id);
      
      // Look up coverage for this category
      const coverage = lookupCoverage(item.category, policyType);
      
      breakdown.push({
        id: item.id,
        category: item.category,
        estimatedValue: coverage.estimatedValue,
        status: coverage.status,
        color: coverage.color,
        source: 'detected',
        confidence: item.confidence || 0
      });
    }
  }
  
  // Process manual items
  if (Array.isArray(manualItems)) {
    for (const item of manualItems) {
      // Skip items without required fields
      if (!item || !item.id || !item.category) {
        continue;
      }
      
      // Skip duplicates (manual items take precedence? No, skip if ID already exists)
      if (seenIds.has(item.id)) {
        continue;
      }
      seenIds.add(item.id);
      
      // Look up coverage for this category
      const coverage = lookupCoverage(item.category, policyType);
      
      // For manual items, use the user-provided value if available, otherwise use the default
      const estimatedValue = typeof item.estimatedValue === 'number' 
        ? item.estimatedValue 
        : coverage.estimatedValue;
      
      breakdown.push({
        id: item.id,
        category: item.name || item.category, // Use custom name if available
        estimatedValue: Math.max(0, estimatedValue),
        status: coverage.status,
        color: coverage.color,
        source: 'manual'
      });
    }
  }
  
  return breakdown;
}

/**
 * Performs a complete value calculation for all items under a given policy
 * Main entry point for dashboard calculations
 * 
 * @param {DetectedItem[]} detectedItems - Array of detected items from camera
 * @param {ManualItem[]} manualItems - Array of manually added items
 * @param {string} policyType - The active policy type
 * @returns {ValueCalculationResult} Complete calculation result
 * 
 * @example
 * const result = calculateValues(detectedItems, manualItems, 'renters');
 * // Returns: {
 * //   totalValue: 2500,
 * //   protectedValue: 1800,
 * //   unprotectedValue: 700,
 * //   coverageGapPercentage: 28.0,
 * //   items: [...]
 * // }
 */
export function calculateValues(detectedItems, manualItems, policyType) {
  // Create the item breakdown with coverage status
  const items = createItemBreakdown(detectedItems, manualItems, policyType);
  
  // Calculate total value
  const totalValue = calculateTotalValue(items);
  
  // Calculate protected value (only covered items)
  const protectedValue = calculateProtectedValue(items);
  
  // Calculate unprotected value (not_covered + conditional)
  const unprotectedValue = calculateUnprotectedValue(items);
  
  // Calculate coverage gap percentage
  const coverageGapPercentage = calculateCoverageGapPercentage(unprotectedValue, totalValue);
  
  return {
    totalValue,
    protectedValue,
    unprotectedValue,
    coverageGapPercentage,
    items
  };
}

/**
 * Formats a dollar amount for display
 * @param {number} amount - Dollar amount
 * @returns {string} Formatted string (e.g., "$1,200")
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0';
  }
  
  const safeAmount = Math.max(0, amount);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safeAmount);
}

/**
 * Formats a coverage gap percentage for display
 * @param {number} percentage - Gap percentage (0-100)
 * @returns {string} Formatted string with % symbol (e.g., "28.0%")
 */
export function formatPercentage(percentage) {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return '0.0%';
  }
  
  const safePercentage = Math.max(0, Math.min(100, percentage));
  return `${safePercentage.toFixed(1)}%`;
}

/**
 * Checks if the dashboard arithmetic invariant holds
 * Invariant: totalValue == protectedValue + unprotectedValue
 * 
 * @param {number} totalValue - Total value of all items
 * @param {number} protectedValue - Sum of covered items
 * @param {number} unprotectedValue - Sum of not_covered + conditional items
 * @returns {boolean} True if invariant holds (within floating point tolerance)
 */
export function verifyArithmeticInvariant(totalValue, protectedValue, unprotectedValue) {
  if (typeof totalValue !== 'number' || typeof protectedValue !== 'number' || typeof unprotectedValue !== 'number') {
    return false;
  }
  
  const sum = protectedValue + unprotectedValue;
  // Use a small epsilon for floating point comparison
  const epsilon = 0.01;
  
  return Math.abs(totalValue - sum) < epsilon;
}

/**
 * Gets policy upgrade recommendations based on uncovered items
 * @param {ItemBreakdown[]} breakdown - Item breakdown with status
 * @param {string} currentPolicy - Current policy type
 * @returns {string[]} Array of upgrade recommendation strings
 */
export function getUpgradeRecommendations(breakdown, currentPolicy) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) {
    return [];
  }
  
  const recommendations = new Set();
  
  // Get unique uncovered categories sorted by value
  const uncoveredItems = breakdown
    .filter(item => item.status === 'not_covered' || item.status === 'conditional')
    .sort((a, b) => b.estimatedValue - a.estimatedValue);
  
  if (uncoveredItems.length === 0) {
    return [];
  }
  
  // Add recommendations based on current policy and uncovered items
  for (const item of uncoveredItems.slice(0, 5)) {
    // Look up upgrade suggestion from coverage rules
    const coverage = lookupCoverage(item.category, currentPolicy);
    if (coverage.upgrade) {
      recommendations.add(coverage.upgrade);
    }
  }
  
  // Add general recommendations based on policy type
  if (currentPolicy === 'none') {
    recommendations.add('Get insurance coverage immediately — you have no protection');
  } else if (currentPolicy === 'auto' && uncoveredItems.some(item => 
    ['laptop', 'tv', 'cell phone', 'couch', 'bed'].includes(item.category.toLowerCase())
  )) {
    recommendations.add('Consider adding renter\'s or homeowner\'s insurance for household items');
  } else if (currentPolicy === 'renters' && uncoveredItems.some(item =>
    ['car', 'motorcycle'].includes(item.category.toLowerCase())
  )) {
    recommendations.add('Add auto insurance to cover your vehicle(s)');
  }
  
  return Array.from(recommendations).slice(0, 5);
}

// Re-export lookupCoverage functions for convenience
export { lookupCoverage };
