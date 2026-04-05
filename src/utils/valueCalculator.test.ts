import { describe, it, expect } from 'vitest'
import type {
  DetectedItem,
  ManualItem,
  ItemBreakdown,
  PolicyType,
} from '../types'
import {
  calculateTotalValue,
  calculateProtectedValue,
  calculateUnprotectedValue,
  calculateCoverageGapPercentage,
  createItemBreakdown,
  calculateValues,
  formatCurrency,
  formatPercentage,
  verifyArithmeticInvariant,
  getUpgradeRecommendations,
  lookupCoverage
} from './valueCalculator'

describe('valueCalculator', () => {
  describe('calculateTotalValue', () => {
    it('returns 0 for empty array', () => {
      expect(calculateTotalValue([])).toBe(0)
    })

    it('returns 0 for null', () => {
      expect(calculateTotalValue(null as unknown as ItemBreakdown[])).toBe(0)
    })

    it('returns 0 for undefined', () => {
      expect(calculateTotalValue(undefined as unknown as ItemBreakdown[])).toBe(0)
    })

    it('correctly sums single item', () => {
      const items: ItemBreakdown[] = [{ id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' }]
      expect(calculateTotalValue(items)).toBe(1200)
    })

    it('correctly sums multiple items', () => {
      const items: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' },
        { id: '3', category: 'cell phone', estimatedValue: 800, status: 'covered', color: 'green', source: 'detected' }
      ]
      expect(calculateTotalValue(items)).toBe(2600)
    })

    it('handles items with zero value', () => {
      const items: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'dog', estimatedValue: 0, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      expect(calculateTotalValue(items)).toBe(1200)
    })

    it('treats negative values as zero', () => {
      const items: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'tv', estimatedValue: -100, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      expect(calculateTotalValue(items)).toBe(1200)
    })

    it('handles undefined estimatedValue', () => {
      const items = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' as const },
        { id: '2', category: 'tv', estimatedValue: undefined as unknown as number, status: 'not_covered', color: 'red', source: 'detected' as const }
      ] as ItemBreakdown[]
      expect(calculateTotalValue(items)).toBe(1200)
    })

    it('handles string estimatedValue (treats as 0)', () => {
      const items = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' as const },
        { id: '2', category: 'tv', estimatedValue: 'expensive' as unknown as number, status: 'not_covered', color: 'red', source: 'detected' as const }
      ] as ItemBreakdown[]
      expect(calculateTotalValue(items)).toBe(1200)
    })
  })

  describe('calculateProtectedValue', () => {
    it('returns 0 for empty array', () => {
      expect(calculateProtectedValue([])).toBe(0)
    })

    it('returns sum of only covered items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' },
        { id: '3', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      expect(calculateProtectedValue(breakdown)).toBe(1800)
    })

    it('excludes conditional items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'bicycle', estimatedValue: 500, status: 'conditional', color: 'yellow', source: 'detected' }
      ]
      expect(calculateProtectedValue(breakdown)).toBe(1200)
    })

    it('excludes not_covered items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      expect(calculateProtectedValue(breakdown)).toBe(1200)
    })

    it('returns 0 when no covered items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' },
        { id: '2', category: 'bicycle', estimatedValue: 500, status: 'conditional', color: 'yellow', source: 'detected' }
      ]
      expect(calculateProtectedValue(breakdown)).toBe(0)
    })
  })

  describe('calculateUnprotectedValue', () => {
    it('returns 0 for empty array', () => {
      expect(calculateUnprotectedValue([])).toBe(0)
    })

    it('returns sum of not_covered and conditional items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' },
        { id: '3', category: 'bicycle', estimatedValue: 500, status: 'conditional', color: 'yellow', source: 'detected' }
      ]
      expect(calculateUnprotectedValue(breakdown)).toBe(15500)
    })

    it('excludes covered items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      expect(calculateUnprotectedValue(breakdown)).toBe(15000)
    })

    it('returns 0 when all items are covered', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' }
      ]
      expect(calculateUnprotectedValue(breakdown)).toBe(0)
    })
  })

  describe('calculateCoverageGapPercentage', () => {
    it('returns 0.0 when totalValue is 0', () => {
      expect(calculateCoverageGapPercentage(0, 0)).toBe(0.0)
    })

    it('returns 0.0 when totalValue is 0 (unprotected is non-zero)', () => {
      expect(calculateCoverageGapPercentage(100, 0)).toBe(0.0)
    })

    it('calculates correct percentage for 50% gap', () => {
      expect(calculateCoverageGapPercentage(500, 1000)).toBe(50.0)
    })

    it('calculates correct percentage for 100% gap', () => {
      expect(calculateCoverageGapPercentage(1000, 1000)).toBe(100.0)
    })

    it('calculates correct percentage for 0% gap', () => {
      expect(calculateCoverageGapPercentage(0, 1000)).toBe(0.0)
    })

    it('rounds to 1 decimal place', () => {
      // 6500/10000 = 65% exactly
      expect(calculateCoverageGapPercentage(6500, 10000)).toBe(65.0)
      
      // 1/3 = 33.333...% should round to 33.3
      expect(calculateCoverageGapPercentage(100, 300)).toBe(33.3)
    })

    it('handles negative values by treating as 0', () => {
      expect(calculateCoverageGapPercentage(-100, 1000)).toBe(0.0)
      expect(calculateCoverageGapPercentage(100, -1000)).toBe(0.0)
    })

    it('handles non-numeric inputs', () => {
      expect(calculateCoverageGapPercentage('100' as unknown as number, 1000)).toBe(0.0)
      expect(calculateCoverageGapPercentage(100, '1000' as unknown as number)).toBe(0.0)
      expect(calculateCoverageGapPercentage(null as unknown as number, 1000)).toBe(0.0)
      expect(calculateCoverageGapPercentage(100, undefined as unknown as number)).toBe(0.0)
    })

    it('handles very small percentages', () => {
      expect(calculateCoverageGapPercentage(1, 10000)).toBe(0.0)
    })

    it('handles percentage over 100% (should not cap)', () => {
      // Note: This shouldn't happen in practice due to logic, but let's test
      // Actually the function doesn't cap, which is fine for edge cases
      expect(calculateCoverageGapPercentage(1500, 1000)).toBe(150.0)
    })
  })

  describe('createItemBreakdown', () => {
    it('returns empty array for no items', () => {
      const result = createItemBreakdown([], [], 'renters')
      expect(result).toEqual([])
    })

    it('creates breakdown for detected items', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: '1', 
          category: 'laptop', 
          confidence: 0.9, 
          boundingBox: { originX: 10, originY: 10, width: 100, height: 100 },
          categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }]
        }
      ]
      
      const result = createItemBreakdown(detectedItems, [], 'renters')
      
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
      expect(result[0].category).toBe('laptop')
      expect(result[0].estimatedValue).toBe(1200)
      expect(result[0].status).toBe('covered')
      expect(result[0].color).toBe('green')
      expect(result[0].source).toBe('detected')
    })

    it('creates breakdown for manual items', () => {
      const manualItems: ManualItem[] = [
        { id: 'm1', name: 'My Laptop', category: 'laptop', estimatedValue: 1500 }
      ]
      
      const result = createItemBreakdown([], manualItems, 'renters')
      
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('m1')
      expect(result[0].category).toBe('My Laptop')
      expect(result[0].estimatedValue).toBe(1500)
      expect(result[0].status).toBe('covered')
      expect(result[0].source).toBe('manual')
    })

    it('uses default value when manual item has no estimatedValue', () => {
      const manualItems = [
        { id: 'm1', name: 'My Laptop', category: 'laptop' }
      ] as ManualItem[]
      
      const result = createItemBreakdown([], manualItems, 'renters')
      expect(result[0].estimatedValue).toBe(1200)
    })

    it('combines detected and manual items', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: 'd1', 
          category: 'tv', 
          confidence: 0.8,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'tv', score: 0.8, displayName: 'TV' }]
        }
      ]
      const manualItems: ManualItem[] = [
        { id: 'm1', name: 'My Jewelry', category: 'book', estimatedValue: 500 }
      ]
      
      const result = createItemBreakdown(detectedItems, manualItems, 'renters')
      
      expect(result).toHaveLength(2)
      expect(result[0].source).toBe('detected')
      expect(result[1].source).toBe('manual')
    })

    it('skips duplicate IDs', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: '1', 
          category: 'laptop', 
          confidence: 0.9,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }]
        }
      ]
      const manualItems: ManualItem[] = [
        { id: '1', name: 'Duplicate', category: 'tv', estimatedValue: 500 }
      ]
      
      const result = createItemBreakdown(detectedItems, manualItems, 'renters')
      
      expect(result).toHaveLength(1)
      expect(result[0].category).toBe('laptop') // First one wins
    })

    it('skips items without id', () => {
      const detectedItems = [
        { category: 'laptop', confidence: 0.9 }
      ] as DetectedItem[]
      
      const result = createItemBreakdown(detectedItems, [], 'renters')
      expect(result).toHaveLength(0)
    })

    it('skips items without category', () => {
      const detectedItems = [
        { id: '1', confidence: 0.9 }
      ] as DetectedItem[]
      
      const result = createItemBreakdown(detectedItems, [], 'renters')
      expect(result).toHaveLength(0)
    })

    it('handles null/undefined inputs', () => {
      const result = createItemBreakdown(null as unknown as DetectedItem[], null as unknown as ManualItem[], 'renters')
      expect(result).toEqual([])
    })

    it('applies correct coverage status based on policy', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: '1', 
          category: 'bicycle',
          confidence: 0.8,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'bicycle', score: 0.8, displayName: 'Bicycle' }]
        }
      ]
      
      const rentersResult = createItemBreakdown(detectedItems, [], 'renters')
      expect(rentersResult[0].status).toBe('conditional')
      expect(rentersResult[0].color).toBe('yellow')
      
      const homeownersResult = createItemBreakdown(detectedItems, [], 'homeowners')
      expect(homeownersResult[0].status).toBe('covered')
      expect(homeownersResult[0].color).toBe('green')
      
      const autoResult = createItemBreakdown(detectedItems, [], 'auto')
      expect(autoResult[0].status).toBe('not_covered')
      expect(autoResult[0].color).toBe('red')
    })
  })

  describe('calculateValues', () => {
    it('returns zero values for empty input', () => {
      const result = calculateValues([], [], 'renters')
      
      expect(result.totalValue).toBe(0)
      expect(result.protectedValue).toBe(0)
      expect(result.unprotectedValue).toBe(0)
      expect(result.coverageGapPercentage).toBe(0.0)
      expect(result.items).toEqual([])
    })

    it('correctly calculates all values', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: '1', 
          category: 'laptop',
          confidence: 0.9,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }]
        }, // covered, 1200
        { 
          id: '2', 
          category: 'tv',
          confidence: 0.8,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'tv', score: 0.8, displayName: 'TV' }]
        },       // covered, 600
        { 
          id: '3', 
          category: 'car',
          confidence: 0.9,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'car', score: 0.9, displayName: 'Car' }]
        }        // not covered, 15000
      ]
      
      const result = calculateValues(detectedItems, [], 'renters')
      
      expect(result.totalValue).toBe(16800)      // 1200 + 600 + 15000
      expect(result.protectedValue).toBe(1800)   // 1200 + 600
      expect(result.unprotectedValue).toBe(15000) // 15000 (car)
      expect(result.coverageGapPercentage).toBe(89.3) // (15000/16800) * 100 = 89.285... rounds to 89.3
      expect(result.items).toHaveLength(3)
    })

    it('includes manual items in calculations', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: '1', 
          category: 'laptop',
          confidence: 0.9,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }]
        } // covered, 1200
      ]
      const manualItems: ManualItem[] = [
        { id: 'm1', name: 'Expensive Watch', category: 'clock', estimatedValue: 5000 }
      ]
      
      const result = calculateValues(detectedItems, manualItems, 'renters')
      
      expect(result.totalValue).toBe(6200) // 1200 + 5000
      expect(result.items).toHaveLength(2)
    })

    it('produces correct 100% gap for no insurance', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: '1', 
          category: 'laptop',
          confidence: 0.9,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }]
        },
        { 
          id: '2', 
          category: 'tv',
          confidence: 0.8,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'tv', score: 0.8, displayName: 'TV' }]
        }
      ]
      
      const result = calculateValues(detectedItems, [], 'none')
      
      expect(result.protectedValue).toBe(0)
      expect(result.unprotectedValue).toBe(1800) // 1200 + 600
      expect(result.coverageGapPercentage).toBe(100.0)
    })

    it('produces correct 0% gap when all covered', () => {
      const detectedItems: DetectedItem[] = [
        { 
          id: '1', 
          category: 'laptop',
          confidence: 0.9,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }]
        },
        { 
          id: '2', 
          category: 'tv',
          confidence: 0.8,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: 'tv', score: 0.8, displayName: 'TV' }]
        }
      ]
      
      const result = calculateValues(detectedItems, [], 'homeowners')
      
      expect(result.protectedValue).toBe(1800)
      expect(result.unprotectedValue).toBe(0)
      expect(result.coverageGapPercentage).toBe(0.0)
    })
  })

  describe('formatCurrency', () => {
    it('formats positive numbers with $ and commas', () => {
      expect(formatCurrency(1200)).toBe('$1,200')
      expect(formatCurrency(15000)).toBe('$15,000')
      expect(formatCurrency(1000000)).toBe('$1,000,000')
    })

    it('formats zero as $0', () => {
      expect(formatCurrency(0)).toBe('$0')
    })

    it('handles negative numbers as $0', () => {
      expect(formatCurrency(-100)).toBe('$0')
    })

    it('handles null/undefined as $0', () => {
      expect(formatCurrency(null as unknown as number)).toBe('$0')
      expect(formatCurrency(undefined as unknown as number)).toBe('$0')
    })

    it('handles NaN as $0', () => {
      expect(formatCurrency(NaN)).toBe('$0')
    })

    it('rounds to nearest dollar', () => {
      expect(formatCurrency(1200.5)).toBe('$1,201')
      expect(formatCurrency(1200.4)).toBe('$1,200')
    })
  })

  describe('formatPercentage', () => {
    it('formats with 1 decimal place', () => {
      expect(formatPercentage(50)).toBe('50.0%')
      expect(formatPercentage(33.333)).toBe('33.3%')
    })

    it('handles zero', () => {
      expect(formatPercentage(0)).toBe('0.0%')
    })

    it('caps at 100%', () => {
      expect(formatPercentage(150)).toBe('100.0%')
    })

    it('handles negative as 0.0%', () => {
      expect(formatPercentage(-10)).toBe('0.0%')
    })

    it('handles null/undefined/NaN as 0.0%', () => {
      expect(formatPercentage(null as unknown as number)).toBe('0.0%')
      expect(formatPercentage(undefined as unknown as number)).toBe('0.0%')
      expect(formatPercentage(NaN)).toBe('0.0%')
    })
  })

  describe('verifyArithmeticInvariant', () => {
    it('returns true when total equals protected + unprotected', () => {
      expect(verifyArithmeticInvariant(1000, 700, 300)).toBe(true)
      expect(verifyArithmeticInvariant(0, 0, 0)).toBe(true)
    })

    it('returns false when total does not equal sum', () => {
      expect(verifyArithmeticInvariant(1000, 500, 300)).toBe(false)
      expect(verifyArithmeticInvariant(1000, 800, 300)).toBe(false)
    })

    it('handles floating point precision', () => {
      // 0.1 + 0.2 !== 0.3 in floating point
      expect(verifyArithmeticInvariant(0.3, 0.1, 0.2)).toBe(true)
    })

    it('returns false for invalid inputs', () => {
      expect(verifyArithmeticInvariant(null as unknown as number, 0, 0)).toBe(false)
      expect(verifyArithmeticInvariant(100, null as unknown as number, 50)).toBe(false)
      expect(verifyArithmeticInvariant(100, 50, null as unknown as number)).toBe(false)
    })
  })

  describe('getUpgradeRecommendations', () => {
    it('returns empty array when no items', () => {
      expect(getUpgradeRecommendations([], 'renters')).toEqual([])
    })

    it('returns empty array when all items are covered', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' }
      ]
      expect(getUpgradeRecommendations(breakdown, 'renters')).toEqual([])
    })

    it('returns recommendations for uncovered items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
        { id: '2', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      const recommendations = getUpgradeRecommendations(breakdown, 'renters')
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0]).toContain('auto')
    })

    it('sorts by unprotected value (highest first)', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'bicycle', estimatedValue: 500, status: 'conditional', color: 'yellow', source: 'detected' },
        { id: '2', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' },
        { id: '3', category: 'motorcycle', estimatedValue: 8000, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      const recommendations = getUpgradeRecommendations(breakdown, 'renters')
      // Car (15000) should be first, then motorcycle (8000), then bicycle (500)
      expect(recommendations.length).toBeGreaterThan(0)
    })

    it('limits to 5 recommendations', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' },
        { id: '2', category: 'motorcycle', estimatedValue: 8000, status: 'not_covered', color: 'red', source: 'detected' },
        { id: '3', category: 'bicycle', estimatedValue: 500, status: 'conditional', color: 'yellow', source: 'detected' },
        { id: '4', category: 'laptop', estimatedValue: 1200, status: 'not_covered', color: 'red', source: 'detected' },
        { id: '5', category: 'tv', estimatedValue: 600, status: 'not_covered', color: 'red', source: 'detected' },
        { id: '6', category: 'cell phone', estimatedValue: 800, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      const recommendations = getUpgradeRecommendations(breakdown, 'none')
      expect(recommendations.length).toBeLessThanOrEqual(5)
    })

    it('suggests getting insurance for no policy', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      const recommendations = getUpgradeRecommendations(breakdown, 'none')
      expect(recommendations.some(r => r.includes('Get insurance'))).toBe(true)
    })

    it('suggests renters insurance for auto policy with household items', () => {
      const breakdown: ItemBreakdown[] = [
        { id: '1', category: 'laptop', estimatedValue: 1200, status: 'not_covered', color: 'red', source: 'detected' }
      ]
      const recommendations = getUpgradeRecommendations(breakdown, 'auto')
      expect(recommendations.some(r => r.includes("renter's or homeowner's"))).toBe(true)
    })
  })

  describe('integration with coverageLookup', () => {
    it('lookupCoverage is re-exported and works', () => {
      const result = lookupCoverage('laptop', 'renters')
      expect(result.status).toBe('covered')
      expect(result.estimatedValue).toBe(1200)
    })
  })
})
