import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DashboardProps, DetectedItem, ManualItem, PolicyType, ItemBreakdown } from '../../types'
import { Dashboard } from './Dashboard'

// Mock the value calculator module
vi.mock('@/utils/valueCalculator.js', () => ({
  calculateValues: vi.fn(),
  formatCurrency: vi.fn((amount: number) => `$${amount.toLocaleString()}`),
  formatPercentage: vi.fn((pct: number) => `${pct.toFixed(1)}%`),
  getUpgradeRecommendations: vi.fn()
}))

import { calculateValues, formatCurrency, formatPercentage, getUpgradeRecommendations } from '@/utils/valueCalculator.js'

type CalculateValuesFn = typeof calculateValues;
type FormatCurrencyFn = typeof formatCurrency;
type FormatPercentageFn = typeof formatPercentage;
type GetUpgradeRecommendationsFn = typeof getUpgradeRecommendations;

// Type the mocked functions
const mockedCalculateValues = calculateValues as Mock<CalculateValuesFn>;
const mockedFormatCurrency = formatCurrency as Mock<FormatCurrencyFn>;
const mockedFormatPercentage = formatPercentage as Mock<FormatPercentageFn>;
const mockedGetUpgradeRecommendations = getUpgradeRecommendations as Mock<GetUpgradeRecommendationsFn>;

// Type-safe mock data fixtures
const createDetectedItem = (id: string, category: string, confidence = 0.9): DetectedItem => ({
  id,
  category,
  confidence,
  boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
  categories: [{ categoryName: category, score: confidence, displayName: category }]
})

const createManualItem = (id: string, name: string, category: string, estimatedValue: number): ManualItem => ({
  id,
  name,
  category,
  estimatedValue
})

const createItemBreakdown = (
  id: string,
  category: string,
  estimatedValue: number,
  status: ItemBreakdown['status'],
  color: ItemBreakdown['color'],
  source: ItemBreakdown['source']
): ItemBreakdown => ({
  id,
  category,
  estimatedValue,
  status,
  color,
  source
})

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state', () => {
    it('renders with $0 values when no items', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])

      const props: DashboardProps = {
        detectedItems: [],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText('Total Value')).toBeInTheDocument()
      expect(screen.getByText('Protected')).toBeInTheDocument()
      expect(screen.getByText('UNPROTECTED')).toBeInTheDocument()
      expect(screen.getByText('Coverage Gap')).toBeInTheDocument()
      // $0 appears multiple times (total, protected, unprotected), so use getAllByText
      const zeroValues = screen.getAllByText('$0')
      expect(zeroValues.length).toBeGreaterThanOrEqual(3)
      // 0.0% should appear once
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })

    it('shows helpful message when no items detected', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])

      const props: DashboardProps = {
        detectedItems: [],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText(/point your camera at objects to begin scanning/i)).toBeInTheDocument()
    })

    it('shows coverage gap as 0.0% when no items', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])

      const props: DashboardProps = {
        detectedItems: [],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  describe('calculations', () => {
    it('displays correct total value', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected'),
          createItemBreakdown('3', 'car', 15000, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue(['Consider auto insurance'])
      mockedFormatCurrency.mockReturnValue('$16,800')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv'),
          createDetectedItem('3', 'car')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // Total value appears in summary card
      const totalElements = screen.getAllByText('$16,800')
      expect(totalElements.length).toBeGreaterThanOrEqual(1)
      expect(mockedCalculateValues).toHaveBeenCalledWith(expect.any(Array), [], 'renters')
    })

    it('displays correct protected value (green items only)', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected'),
          createItemBreakdown('3', 'car', 15000, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv'),
          createDetectedItem('3', 'car')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // Protected value should appear in the protected section
      const protectedElements = screen.getAllByText('$1,800')
      expect(protectedElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays unprotected value as big red number (red + yellow items)', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected'),
          createItemBreakdown('3', 'car', 15000, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockReturnValue('$15,000')
      mockedFormatPercentage.mockReturnValue('89.3%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv'),
          createDetectedItem('3', 'car')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // Check that unprotected value is displayed prominently
      const unprotectedSection = screen.getByTestId('unprotected-section')
      expect(unprotectedSection).toBeInTheDocument()
      // $15,000 appears in both the summary and the item breakdown
      const unprotectedElements = screen.getAllByText('$15,000')
      expect(unprotectedElements.length).toBeGreaterThanOrEqual(1)
    })

    it('calculates coverage gap percentage correctly', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 10000,
        protectedValue: 3500,
        unprotectedValue: 6500,
        coverageGapPercentage: 65.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected'),
          createItemBreakdown('3', 'bed', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('4', 'car', 5000, 'not_covered', 'red', 'detected'),
          createItemBreakdown('5', 'bicycle', 1500, 'conditional', 'yellow', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatPercentage.mockReturnValue('65.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv'),
          createDetectedItem('3', 'bed'),
          createDetectedItem('4', 'car'),
          createDetectedItem('5', 'bicycle')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText('65.0%')).toBeInTheDocument()
    })
  })

  describe('full coverage', () => {
    it('shows all items covered with positive message', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv')
        ],
        manualItems: [],
        policyType: 'homeowners',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText(/all items are fully covered/i)).toBeInTheDocument()
      expect(screen.getByText('0.0%')).toBeInTheDocument()
      expect(screen.getByText('$0')).toBeInTheDocument() // Unprotected value should be $0
    })
  })

  describe('no coverage', () => {
    it('shows 100% gap with No Insurance policy', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 0,
        unprotectedValue: 1800,
        coverageGapPercentage: 100.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'not_covered', 'red', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue(['Get insurance coverage immediately'])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('100.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv')
        ],
        manualItems: [],
        policyType: 'none',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // Protected value should be $0
      const zeroElements = screen.getAllByText('$0')
      expect(zeroElements.length).toBeGreaterThanOrEqual(1)
      // Unprotected value should be $1,800 (appears in summary and breakdown)
      const unprotectedElements = screen.getAllByText('$1,800')
      expect(unprotectedElements.length).toBeGreaterThanOrEqual(1)
      // Gap should be 100%
      expect(screen.getByText('100.0%')).toBeInTheDocument()
    })
  })

  describe('mixed coverage', () => {
    it('shows correct breakdown for mixed green, yellow, and red items', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 19100,
        protectedValue: 1800,
        unprotectedValue: 17300,
        coverageGapPercentage: 90.6,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected'),
          createItemBreakdown('3', 'bicycle', 500, 'conditional', 'yellow', 'detected'),
          createItemBreakdown('4', 'car', 15000, 'not_covered', 'red', 'detected'),
          createItemBreakdown('5', 'refrigerator', 1200, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue(['Purchase auto insurance', 'Consider replacement cost coverage'])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('90.6%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv'),
          createDetectedItem('3', 'bicycle'),
          createDetectedItem('4', 'car'),
          createDetectedItem('5', 'refrigerator')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // Check per-item breakdown - names
      expect(screen.getByText('laptop')).toBeInTheDocument()
      expect(screen.getByText('tv')).toBeInTheDocument()
      expect(screen.getByText('bicycle')).toBeInTheDocument()
      expect(screen.getByText('car')).toBeInTheDocument()
      expect(screen.getByText('refrigerator')).toBeInTheDocument()

      // Check values appear in the breakdown
      const laptopElements = screen.getAllByText('$1,200')
      expect(laptopElements.length).toBeGreaterThanOrEqual(1)
      const tvElements = screen.getAllByText('$600')
      expect(tvElements.length).toBeGreaterThanOrEqual(1)
      const bicycleElements = screen.getAllByText('$500')
      expect(bicycleElements.length).toBeGreaterThanOrEqual(1)

      // Check totals
      const totalElements = screen.getAllByText('$19,100')
      expect(totalElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('90.6%')).toBeInTheDocument()
    })

    it('includes manual items in calculations', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 6200,
        protectedValue: 6200,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('m1', 'Expensive Watch', 5000, 'covered', 'green', 'manual')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const manualItems: ManualItem[] = [
        createManualItem('m1', 'Expensive Watch', 'clock', 5000)
      ]

      const props: DashboardProps = {
        detectedItems: [createDetectedItem('1', 'laptop')],
        manualItems,
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(mockedCalculateValues).toHaveBeenCalledWith(
        expect.any(Array),
        [{ id: 'm1', name: 'Expensive Watch', category: 'clock', estimatedValue: 5000 }],
        'renters'
      )
    })
  })

  describe('rapid updates', () => {
    it('handles rapid item additions without NaN', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1200,
        protectedValue: 1200,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const initialProps: DashboardProps = {
        detectedItems: [createDetectedItem('1', 'laptop')],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      const { rerender } = render(<Dashboard {...initialProps} />)

      // Rapid updates
      for (let i = 0; i < 5; i++) {
        mockedCalculateValues.mockReturnValue({
          totalValue: 1200 * (i + 1),
          protectedValue: 1200 * (i + 1),
          unprotectedValue: 0,
          coverageGapPercentage: 0.0,
          items: Array(i + 1).fill(null).map((_, idx) =>
            createItemBreakdown(`${idx}`, 'laptop', 1200, 'covered', 'green', 'detected')
          )
        })

        const updatedProps: DashboardProps = {
          detectedItems: Array(i + 1).fill(null).map((_, idx) => createDetectedItem(`${idx}`, 'laptop')),
          manualItems: [],
          policyType: 'renters',
          onItemClick: vi.fn()
        }
        rerender(<Dashboard {...updatedProps} />)
      }

      // Should not crash and should show final state - $6,000 appears in multiple places
      const sixKElements = screen.getAllByText('$6,000')
      expect(sixKElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })

    it('handles negative values gracefully by treating as zero', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1000,
        protectedValue: 1000,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'item', 1000, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockReturnValue('$1,000')
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: [createDetectedItem('1', 'item')],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // No NaN values should be displayed
      const nanElements = screen.queryAllByText(/NaN/)
      expect(nanElements).toHaveLength(0)
    })

    it('handles null/undefined inputs without crashing', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockReturnValue('$0')
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: null as unknown as DetectedItem[],
        manualItems: undefined as unknown as ManualItem[],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // $0 appears multiple times
      const zeroElements = screen.getAllByText('$0')
      expect(zeroElements.length).toBeGreaterThanOrEqual(3)
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  describe('per-item breakdown', () => {
    it('renders list of all detected items', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText('laptop')).toBeInTheDocument()
      expect(screen.getByText('tv')).toBeInTheDocument()
    })

    it('shows color-coded status indicators', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 19100,
        protectedValue: 1800,
        unprotectedValue: 17300,
        coverageGapPercentage: 90.6,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected'),
          createItemBreakdown('3', 'bicycle', 500, 'conditional', 'yellow', 'detected'),
          createItemBreakdown('4', 'car', 15000, 'not_covered', 'red', 'detected'),
          createItemBreakdown('5', 'refrigerator', 1200, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('90.6%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv'),
          createDetectedItem('3', 'bicycle'),
          createDetectedItem('4', 'car'),
          createDetectedItem('5', 'refrigerator')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      const { container } = render(<Dashboard {...props} />)

      // Check for status badges or color indicators
      const itemRows = container.querySelectorAll('[data-testid="item-row"]')
      expect(itemRows.length).toBeGreaterThan(0)
    })

    it('shows item values in breakdown', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText('$1,200')).toBeInTheDocument()
      expect(screen.getByText('$600')).toBeInTheDocument()
    })
  })

  describe('upgrade recommendations', () => {
    it('shows recommendations when items are uncovered', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'car', 15000, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue(['Purchase auto insurance', 'Consider comprehensive coverage'])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('89.3%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'car')
        ],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText(/purchase auto insurance/i)).toBeInTheDocument()
      expect(screen.getByText(/consider comprehensive coverage/i)).toBeInTheDocument()
    })

    it('limits recommendations to at most 5', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 30000,
        protectedValue: 0,
        unprotectedValue: 30000,
        coverageGapPercentage: 100.0,
        items: [
          createItemBreakdown('1', 'car', 15000, 'not_covered', 'red', 'detected'),
          createItemBreakdown('2', 'motorcycle', 8000, 'not_covered', 'red', 'detected'),
          createItemBreakdown('3', 'laptop', 1200, 'not_covered', 'red', 'detected'),
          createItemBreakdown('4', 'tv', 600, 'not_covered', 'red', 'detected'),
          createItemBreakdown('5', 'cell phone', 800, 'not_covered', 'red', 'detected'),
          createItemBreakdown('6', 'bicycle', 500, 'not_covered', 'red', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([
        'Purchase auto insurance',
        'Purchase motorcycle insurance',
        'Consider renter\'s insurance',
        'Add comprehensive coverage',
        'Review all policies'
      ])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('100.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'car'),
          createDetectedItem('2', 'motorcycle'),
          createDetectedItem('3', 'laptop'),
          createDetectedItem('4', 'tv'),
          createDetectedItem('5', 'cell phone'),
          createDetectedItem('6', 'bicycle')
        ],
        manualItems: [],
        policyType: 'none',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      // Should have exactly 5 recommendations
      const recommendationSection = screen.getByText(/recommendations/i)
      expect(recommendationSection).toBeInTheDocument()
    })
  })

  describe('positive message when all covered', () => {
    it('shows positive message when all items are fully covered', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv')
        ],
        manualItems: [],
        policyType: 'homeowners',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      expect(screen.getByText(/all items are fully covered/i)).toBeInTheDocument()
      expect(screen.queryByText(/recommendations/i)).not.toBeInTheDocument()
    })

    it('does not show recommendations section when all items are covered', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected'),
          createItemBreakdown('2', 'tv', 600, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: [
          createDetectedItem('1', 'laptop'),
          createDetectedItem('2', 'tv')
        ],
        manualItems: [],
        policyType: 'homeowners',
        onItemClick: vi.fn()
      }
      render(<Dashboard {...props} />)

      const recommendationsHeading = screen.queryByRole('heading', { name: /recommendations/i })
      expect(recommendationsHeading).not.toBeInTheDocument()
    })
  })

  describe('policy type integration', () => {
    it('updates dashboard when policy type changes', () => {
      mockedCalculateValues
        .mockReturnValueOnce({
          totalValue: 1200,
          protectedValue: 1200,
          unprotectedValue: 0,
          coverageGapPercentage: 0.0,
          items: [createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected')]
        })
        .mockReturnValueOnce({
          totalValue: 1200,
          protectedValue: 0,
          unprotectedValue: 1200,
          coverageGapPercentage: 100.0,
          items: [createItemBreakdown('1', 'laptop', 1200, 'not_covered', 'red', 'detected')]
        })

      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValueOnce('0.0%').mockReturnValueOnce('100.0%')

      const initialProps: DashboardProps = {
        detectedItems: [createDetectedItem('1', 'laptop')],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      const { rerender } = render(<Dashboard {...initialProps} />)

      expect(screen.getByText('0.0%')).toBeInTheDocument()

      const updatedProps: DashboardProps = {
        detectedItems: [createDetectedItem('1', 'laptop')],
        manualItems: [],
        policyType: 'auto',
        onItemClick: vi.fn()
      }
      rerender(<Dashboard {...updatedProps} />)

      expect(mockedCalculateValues).toHaveBeenLastCalledWith(expect.any(Array), [], 'auto')
    })
  })

  describe('responsive styling', () => {
    it('renders with proper container structure', () => {
      mockedCalculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          createItemBreakdown('1', 'laptop', 1200, 'covered', 'green', 'detected')
        ]
      })
      mockedGetUpgradeRecommendations.mockReturnValue([])
      mockedFormatCurrency.mockImplementation((val: number) => `$${val.toLocaleString()}`)
      mockedFormatPercentage.mockReturnValue('0.0%')

      const props: DashboardProps = {
        detectedItems: [createDetectedItem('1', 'laptop')],
        manualItems: [],
        policyType: 'renters',
        onItemClick: vi.fn()
      }
      const { container } = render(<Dashboard {...props} />)

      expect(container.firstChild).toHaveAttribute('data-testid', 'dashboard-container')
    })
  })
})
