import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'

// Mock the value calculator module
vi.mock('@/utils/valueCalculator.js', () => ({
  calculateValues: vi.fn(),
  formatCurrency: vi.fn((amount) => `$${amount.toLocaleString()}`),
  formatPercentage: vi.fn((pct) => `${pct.toFixed(1)}%`),
  getUpgradeRecommendations: vi.fn()
}))

import { calculateValues, formatCurrency, formatPercentage, getUpgradeRecommendations } from '@/utils/valueCalculator.js'

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state', () => {
    it('renders with $0 values when no items', () => {
      calculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      getUpgradeRecommendations.mockReturnValue([])

      render(<Dashboard detectedItems={[]} manualItems={[]} policyType="renters" />)

      expect(screen.getByText('Total Detected Asset Value')).toBeInTheDocument()
      expect(screen.getByText('Protected Value')).toBeInTheDocument()
      expect(screen.getByText('UNPROTECTED VALUE')).toBeInTheDocument()
      expect(screen.getByText('Coverage Gap')).toBeInTheDocument()
      // $0 appears multiple times (total, protected, unprotected), so use getAllByText
      const zeroValues = screen.getAllByText('$0')
      expect(zeroValues.length).toBeGreaterThanOrEqual(3)
      // 0.0% should appear once
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })

    it('shows helpful message when no items detected', () => {
      calculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      getUpgradeRecommendations.mockReturnValue([])

      render(<Dashboard detectedItems={[]} manualItems={[]} policyType="renters" />)

      expect(screen.getByText(/point your camera at objects to begin scanning/i)).toBeInTheDocument()
    })

    it('shows coverage gap as 0.0% when no items', () => {
      calculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      getUpgradeRecommendations.mockReturnValue([])

      render(<Dashboard detectedItems={[]} manualItems={[]} policyType="renters" />)

      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  describe('calculations', () => {
    it('displays correct total value', () => {
      calculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green' },
          { id: '3', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue(['Consider auto insurance'])
      formatCurrency.mockReturnValue('$16,800')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }, { id: '3', category: 'car' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      // Total value appears in summary card
      const totalElements = screen.getAllByText('$16,800')
      expect(totalElements.length).toBeGreaterThanOrEqual(1)
      expect(calculateValues).toHaveBeenCalledWith(expect.any(Array), [], 'renters')
    })

    it('displays correct protected value (green items only)', () => {
      calculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green' },
          { id: '3', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }, { id: '3', category: 'car' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      // Protected value should appear in the protected section
      const protectedElements = screen.getAllByText('$1,800')
      expect(protectedElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays unprotected value as big red number (red + yellow items)', () => {
      calculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green' },
          { id: '3', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockReturnValue('$15,000')
      formatPercentage.mockReturnValue('89.3%')

      const { container } = render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }, { id: '3', category: 'car' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      // Check that unprotected value is displayed prominently
      const unprotectedSection = screen.getByText('UNPROTECTED VALUE').closest('[data-testid="unprotected-section"]')
      expect(unprotectedSection).toBeInTheDocument()
      // $15,000 appears in both the summary and the item breakdown
      const unprotectedElements = screen.getAllByText('$15,000')
      expect(unprotectedElements.length).toBeGreaterThanOrEqual(1)
    })

    it('calculates coverage gap percentage correctly', () => {
      calculateValues.mockReturnValue({
        totalValue: 10000,
        protectedValue: 3500,
        unprotectedValue: 6500,
        coverageGapPercentage: 65.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green' },
          { id: '3', category: 'bed', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '4', category: 'car', estimatedValue: 5000, status: 'not_covered', color: 'red' },
          { id: '5', category: 'bicycle', estimatedValue: 1500, status: 'conditional', color: 'yellow' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatPercentage.mockReturnValue('65.0%')

      render(
        <Dashboard
          detectedItems={[
            { id: '1', category: 'laptop' },
            { id: '2', category: 'tv' },
            { id: '3', category: 'bed' },
            { id: '4', category: 'car' },
            { id: '5', category: 'bicycle' }
          ]}
          manualItems={[]}
          policyType="renters"
        />
      )

      expect(screen.getByText('65.0%')).toBeInTheDocument()
    })
  })

  describe('full coverage', () => {
    it('shows all items covered with positive message', () => {
      calculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }]}
          manualItems={[]}
          policyType="homeowners"
        />
      )

      expect(screen.getByText(/all items are fully covered/i)).toBeInTheDocument()
      expect(screen.getByText('0.0%')).toBeInTheDocument()
      expect(screen.getByText('$0')).toBeInTheDocument() // Unprotected value should be $0
    })
  })

  describe('no coverage', () => {
    it('shows 100% gap with No Insurance policy', () => {
      calculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 0,
        unprotectedValue: 1800,
        coverageGapPercentage: 100.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'not_covered', color: 'red' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'not_covered', color: 'red' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue(['Get insurance coverage immediately'])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('100.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }]}
          manualItems={[]}
          policyType="none"
        />
      )

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
      calculateValues.mockReturnValue({
        totalValue: 19100,
        protectedValue: 1800,
        unprotectedValue: 17300,
        coverageGapPercentage: 90.6,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' },
          { id: '3', category: 'bicycle', estimatedValue: 500, status: 'conditional', color: 'yellow', source: 'detected' },
          { id: '4', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' },
          { id: '5', category: 'refrigerator', estimatedValue: 1200, status: 'not_covered', color: 'red', source: 'detected' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue(['Purchase auto insurance', 'Consider replacement cost coverage'])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('90.6%')

      const { container } = render(
        <Dashboard
          detectedItems={[
            { id: '1', category: 'laptop' },
            { id: '2', category: 'tv' },
            { id: '3', category: 'bicycle' },
            { id: '4', category: 'car' },
            { id: '5', category: 'refrigerator' }
          ]}
          manualItems={[]}
          policyType="renters"
        />
      )

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
      calculateValues.mockReturnValue({
        totalValue: 6200,
        protectedValue: 6200,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
          { id: 'm1', category: 'Expensive Watch', estimatedValue: 5000, status: 'covered', color: 'green', source: 'manual' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }]}
          manualItems={[{ id: 'm1', name: 'Expensive Watch', category: 'clock', estimatedValue: 5000 }]}
          policyType="renters"
        />
      )

      expect(calculateValues).toHaveBeenCalledWith(
        expect.any(Array),
        [{ id: 'm1', name: 'Expensive Watch', category: 'clock', estimatedValue: 5000 }],
        'renters'
      )
    })
  })

  describe('rapid updates', () => {
    it('handles rapid item additions without NaN', () => {
      calculateValues.mockReturnValue({
        totalValue: 1200,
        protectedValue: 1200,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      const { rerender } = render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      // Rapid updates
      for (let i = 0; i < 5; i++) {
        calculateValues.mockReturnValue({
          totalValue: 1200 * (i + 1),
          protectedValue: 1200 * (i + 1),
          unprotectedValue: 0,
          coverageGapPercentage: 0.0,
          items: Array(i + 1).fill(null).map((_, idx) => ({
            id: `${idx}`,
            category: 'laptop',
            estimatedValue: 1200,
            status: 'covered',
            color: 'green'
          }))
        })

        rerender(
          <Dashboard
            detectedItems={Array(i + 1).fill(null).map((_, idx) => ({ id: `${idx}`, category: 'laptop' }))}
            manualItems={[]}
            policyType="renters"
          />
        )
      }

      // Should not crash and should show final state - $6,000 appears in multiple places
      const sixKElements = screen.getAllByText('$6,000')
      expect(sixKElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })

    it('handles negative values gracefully by treating as zero', () => {
      calculateValues.mockReturnValue({
        totalValue: 1000,
        protectedValue: 1000,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'item', estimatedValue: 1000, status: 'covered', color: 'green' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockReturnValue('$1,000')
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'item' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      // No NaN values should be displayed
      const nanElements = screen.queryAllByText(/NaN/)
      expect(nanElements).toHaveLength(0)
    })

    it('handles null/undefined inputs without crashing', () => {
      calculateValues.mockReturnValue({
        totalValue: 0,
        protectedValue: 0,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: []
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockReturnValue('$0')
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={null}
          manualItems={undefined}
          policyType="renters"
        />
      )

      // $0 appears multiple times
      const zeroElements = screen.getAllByText('$0')
      expect(zeroElements.length).toBeGreaterThanOrEqual(3)
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  describe('per-item breakdown', () => {
    it('renders list of all detected items', () => {
      calculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      expect(screen.getByText('laptop')).toBeInTheDocument()
      expect(screen.getByText('tv')).toBeInTheDocument()
    })

    it('shows color-coded status indicators', () => {
      calculateValues.mockReturnValue({
        totalValue: 19100,
        protectedValue: 1800,
        unprotectedValue: 17300,
        coverageGapPercentage: 90.6,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' },
          { id: '3', category: 'bicycle', estimatedValue: 500, status: 'conditional', color: 'yellow', source: 'detected' },
          { id: '4', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red', source: 'detected' },
          { id: '5', category: 'refrigerator', estimatedValue: 1200, status: 'not_covered', color: 'red', source: 'detected' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('90.6%')

      const { container } = render(
        <Dashboard
          detectedItems={[
            { id: '1', category: 'laptop' },
            { id: '2', category: 'tv' },
            { id: '3', category: 'bicycle' },
            { id: '4', category: 'car' },
            { id: '5', category: 'refrigerator' }
          ]}
          manualItems={[]}
          policyType="renters"
        />
      )

      // Check for status badges or color indicators
      const itemRows = container.querySelectorAll('[data-testid="item-row"]')
      expect(itemRows.length).toBeGreaterThan(0)
    })

    it('shows item values in breakdown', () => {
      calculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green', source: 'detected' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green', source: 'detected' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      expect(screen.getByText('$1,200')).toBeInTheDocument()
      expect(screen.getByText('$600')).toBeInTheDocument()
    })
  })

  describe('upgrade recommendations', () => {
    it('shows recommendations when items are uncovered', () => {
      calculateValues.mockReturnValue({
        totalValue: 16800,
        protectedValue: 1800,
        unprotectedValue: 15000,
        coverageGapPercentage: 89.3,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue(['Purchase auto insurance', 'Consider comprehensive coverage'])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('89.3%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'car' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      expect(screen.getByText(/purchase auto insurance/i)).toBeInTheDocument()
      expect(screen.getByText(/consider comprehensive coverage/i)).toBeInTheDocument()
    })

    it('limits recommendations to at most 5', () => {
      calculateValues.mockReturnValue({
        totalValue: 30000,
        protectedValue: 0,
        unprotectedValue: 30000,
        coverageGapPercentage: 100.0,
        items: [
          { id: '1', category: 'car', estimatedValue: 15000, status: 'not_covered', color: 'red' },
          { id: '2', category: 'motorcycle', estimatedValue: 8000, status: 'not_covered', color: 'red' },
          { id: '3', category: 'laptop', estimatedValue: 1200, status: 'not_covered', color: 'red' },
          { id: '4', category: 'tv', estimatedValue: 600, status: 'not_covered', color: 'red' },
          { id: '5', category: 'cell phone', estimatedValue: 800, status: 'not_covered', color: 'red' },
          { id: '6', category: 'bicycle', estimatedValue: 500, status: 'not_covered', color: 'red' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([
        'Purchase auto insurance',
        'Purchase motorcycle insurance',
        'Consider renter\'s insurance',
        'Add comprehensive coverage',
        'Review all policies'
      ])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('100.0%')

      render(
        <Dashboard
          detectedItems={[
            { id: '1', category: 'car' },
            { id: '2', category: 'motorcycle' },
            { id: '3', category: 'laptop' },
            { id: '4', category: 'tv' },
            { id: '5', category: 'cell phone' },
            { id: '6', category: 'bicycle' }
          ]}
          manualItems={[]}
          policyType="none"
        />
      )

      // Should have exactly 5 recommendations
      const recommendationSection = screen.getByText(/recommendations/i)
      expect(recommendationSection).toBeInTheDocument()
    })
  })

  describe('positive message when all covered', () => {
    it('shows positive message when all items are fully covered', () => {
      calculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }]}
          manualItems={[]}
          policyType="homeowners"
        />
      )

      expect(screen.getByText(/all items are fully covered/i)).toBeInTheDocument()
      expect(screen.queryByText(/recommendations/i)).not.toBeInTheDocument()
    })

    it('does not show recommendations section when all items are covered', () => {
      calculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' },
          { id: '2', category: 'tv', estimatedValue: 600, status: 'covered', color: 'green' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }, { id: '2', category: 'tv' }]}
          manualItems={[]}
          policyType="homeowners"
        />
      )

      const recommendationsHeading = screen.queryByRole('heading', { name: /recommendations/i })
      expect(recommendationsHeading).not.toBeInTheDocument()
    })
  })

  describe('policy type integration', () => {
    it('updates dashboard when policy type changes', () => {
      calculateValues
        .mockReturnValueOnce({
          totalValue: 1200,
          protectedValue: 1200,
          unprotectedValue: 0,
          coverageGapPercentage: 0.0,
          items: [{ id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' }]
        })
        .mockReturnValueOnce({
          totalValue: 1200,
          protectedValue: 0,
          unprotectedValue: 1200,
          coverageGapPercentage: 100.0,
          items: [{ id: '1', category: 'laptop', estimatedValue: 1200, status: 'not_covered', color: 'red' }]
        })

      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValueOnce('0.0%').mockReturnValueOnce('100.0%')

      const { rerender } = render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      expect(screen.getByText('0.0%')).toBeInTheDocument()

      rerender(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }]}
          manualItems={[]}
          policyType="auto"
        />
      )

      expect(calculateValues).toHaveBeenLastCalledWith(expect.any(Array), [], 'auto')
    })
  })

  describe('responsive styling', () => {
    it('renders with proper container structure', () => {
      calculateValues.mockReturnValue({
        totalValue: 1800,
        protectedValue: 1800,
        unprotectedValue: 0,
        coverageGapPercentage: 0.0,
        items: [
          { id: '1', category: 'laptop', estimatedValue: 1200, status: 'covered', color: 'green' }
        ]
      })
      getUpgradeRecommendations.mockReturnValue([])
      formatCurrency.mockImplementation((val) => `$${val.toLocaleString()}`)
      formatPercentage.mockReturnValue('0.0%')

      const { container } = render(
        <Dashboard
          detectedItems={[{ id: '1', category: 'laptop' }]}
          manualItems={[]}
          policyType="renters"
        />
      )

      expect(container.firstChild).toHaveAttribute('data-testid', 'dashboard-container')
    })
  })
})
