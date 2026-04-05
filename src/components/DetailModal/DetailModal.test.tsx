import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, fireEvent, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppProvider } from '@/context/AppContext'
import { DetailModal } from './DetailModal'
import type { DetectedItem, ManualItem, PolicyType, CoverageResult, DetailModalProps } from '@/types'

// Mock localStorage
const localStorageMock: {
  getItem: Mock<() => string | null>
  setItem: Mock<() => void>
  removeItem: Mock<() => void>
  clear: Mock<() => void>
} = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock coverageLookup
vi.mock('@/utils/coverageLookup', () => ({
  lookupCoverage: vi.fn((category: string, policyType: PolicyType): CoverageResult => {
    // Return different coverage based on category and policy
    if (category === 'laptop') {
      if (policyType === 'renters') {
        return {
          status: 'covered',
          color: 'green',
          estimatedValue: 1200,
          note: 'Personal electronics are covered under renter\'s personal property coverage',
          conditions: [],
          upgrade: 'Consider replacement cost coverage for full value reimbursement'
        }
      }
      if (policyType === 'auto') {
        return {
          status: 'not_covered',
          color: 'red',
          estimatedValue: 1200,
          note: 'Household electronics NOT covered under auto insurance',
          conditions: [],
          upgrade: 'You need renter\'s or homeowner\'s insurance for personal property'
        }
      }
    }
    if (category === 'car') {
      if (policyType === 'renters') {
        return {
          status: 'not_covered',
          color: 'red',
          estimatedValue: 15000,
          note: 'Vehicles are NOT covered under renter\'s insurance — requires auto insurance',
          conditions: [],
          upgrade: 'Purchase auto insurance with comprehensive coverage'
        }
      }
      if (policyType === 'auto') {
        return {
          status: 'covered',
          color: 'green',
          estimatedValue: 15000,
          note: 'Vehicle covered under auto insurance (with comprehensive/collision)',
          conditions: ['Comprehensive and collision coverage required for full protection'],
          upgrade: 'Consider gap insurance if you have a loan/lease'
        }
      }
    }
    if (category === 'bicycle') {
      return {
        status: 'conditional',
        color: 'yellow',
        estimatedValue: 500,
        note: 'Bicycles may have limited coverage — typically $1,000-$2,500 limit',
        conditions: ['Bike value may exceed policy sub-limits', 'High-end bikes need scheduled coverage'],
        upgrade: 'Add scheduled personal property endorsement for expensive bikes'
      }
    }
    if (category === 'dog') {
      return {
        status: 'not_covered',
        color: 'red',
        estimatedValue: 0,
        note: 'Pets are NOT covered property — but liability for bites may be',
        conditions: [],
        upgrade: 'Consider pet insurance or animal liability coverage'
      }
    }
    // Default fallback
    return {
      status: 'not_covered',
      color: 'red',
      estimatedValue: 100,
      note: 'Unknown category — assuming not covered',
      conditions: [],
      upgrade: 'Consult with an insurance agent'
    }
  })
}))

// Mock common claim scenarios data
vi.mock('@/data/coverageRules.json', () => ({
  default: {
    renters: {
      laptop: {
        commonScenarios: ['Theft from home', 'Accidental damage (limited)', 'Fire damage', 'Water damage from burst pipes']
      },
      car: {
        commonScenarios: ['N/A - Not covered under renter\'s insurance']
      },
      bicycle: {
        commonScenarios: ['Theft from home (up to policy limits)', 'Theft from locked vehicle (up to $200)', 'Accidental damage (usually not covered)']
      }
    },
    homeowners: {
      laptop: {
        commonScenarios: ['Theft', 'Fire damage', 'Lightning strike', 'Vandalism', 'Falling objects']
      },
      car: {
        commonScenarios: ['N/A - Requires separate auto insurance']
      }
    },
    auto: {
      laptop: {
        commonScenarios: ['N/A - Not covered under auto insurance']
      },
      car: {
        commonScenarios: ['Collision damage', 'Theft of vehicle', 'Vandalism', 'Weather damage (hail, flood)', 'Animal collision']
      }
    }
  }
}))

// Helper to create a DetectedItem with source
type DetectedItemWithSource = DetectedItem & { source: 'camera' | 'dashboard' }

const createDetectedItem = (
  id: string,
  category: string,
  source: 'camera' | 'dashboard',
  overrides: Partial<DetectedItem> = {}
): DetectedItemWithSource => ({
  id,
  category,
  confidence: 0.9,
  boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
  categories: [{ categoryName: category, score: 0.9, displayName: category }],
  source,
  ...overrides
})

// Helper to create a ManualItem with source
type ManualItemWithSource = ManualItem & { source: 'dashboard' }

const createManualItem = (
  id: string,
  category: string,
  estimatedValue: number,
  overrides: Partial<ManualItem> = {}
): ManualItemWithSource => ({
  id,
  name: category,
  category,
  estimatedValue,
  source: 'dashboard',
  ...overrides
})

describe('DetailModal', () => {
  const mockOnClose: Mock<() => void> = vi.fn()

  const renderWithProvider = (component: ReactNode): RenderResult => {
    return render(
      <AppProvider>
        {component}
      </AppProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  // VAL-DM-001: Detail modal opens on bounding box tap/click
  describe('Modal Opening', () => {
    it('renders when isOpen is true', () => {
      const item = createDetectedItem('1', 'laptop', 'camera')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={item}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('detail-modal')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      const item = createDetectedItem('1', 'laptop', 'camera')

      renderWithProvider(
        <DetailModal
          isOpen={false}
          onClose={mockOnClose}
          item={item}
          policyType="renters"
        />
      )

      expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument()
    })

    it('renders with item data when opened from camera overlay', () => {
      const item = createDetectedItem('cam-1', 'laptop', 'camera')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={item}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-name')).toHaveTextContent(/laptop/i)
      expect(screen.getByTestId('item-value')).toHaveTextContent(/\$1,200/)
    })

    it('renders with item data when opened from dashboard', () => {
      const item = createDetectedItem('dash-1', 'car', 'dashboard')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={item}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-name')).toHaveTextContent(/car/i)
      expect(screen.getByTestId('item-value')).toHaveTextContent(/\$15,000/)
    })
  })

  // VAL-DM-002: Detail modal shows complete information for covered item
  describe('Covered Item Display', () => {
    const coveredItem = createDetectedItem('1', 'laptop', 'camera')

    it('shows item name for covered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={coveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-name')).toHaveTextContent(/laptop/i)
    })

    it('shows estimated value for covered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={coveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-value')).toHaveTextContent('$1,200')
    })

    it('shows "Covered" status with green indicator for covered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={coveredItem}
          policyType="renters"
        />
      )

      const statusBadge = screen.getByTestId('coverage-status')
      expect(statusBadge).toHaveTextContent('Covered')
      expect(statusBadge).toHaveClass('bg-green-100')
    })

    it('shows why it is covered', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={coveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('coverage-note')).toHaveTextContent(/covered under renter/)
    })

    it('shows what policy covers it', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={coveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('policy-info')).toHaveTextContent(/renter|Renter/i)
    })

    it('shows common claim scenarios for covered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={coveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('common-scenarios')).toBeInTheDocument()
      expect(screen.getByText(/Theft from home/i)).toBeInTheDocument()
    })

    it('shows upgrade options for covered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={coveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('upgrade-options')).toHaveTextContent(/replacement cost coverage/)
    })
  })

  // VAL-DM-003: Detail modal shows complete information for uncovered item
  describe('Uncovered Item Display', () => {
    const uncoveredItem = createDetectedItem('1', 'car', 'camera')

    it('shows item name for uncovered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={uncoveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-name')).toHaveTextContent(/car/i)
    })

    it('shows estimated value for uncovered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={uncoveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-value')).toHaveTextContent('$15,000')
    })

    it('shows "Not Covered" status with red indicator for uncovered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={uncoveredItem}
          policyType="renters"
        />
      )

      const statusBadge = screen.getByTestId('coverage-status')
      expect(statusBadge).toHaveTextContent(/Not Covered/)
      expect(statusBadge).toHaveClass('bg-red-100')
    })

    it('shows why it is not covered', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={uncoveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('coverage-note')).toHaveTextContent(/NOT covered/)
    })

    it('shows what policy would cover it', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={uncoveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('upgrade-options')).toHaveTextContent(/auto insurance/)
    })

    it('shows upgrade suggestions for uncovered item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={uncoveredItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('upgrade-options')).toBeInTheDocument()
    })
  })

  // VAL-DM-004: Detail modal shows complete information for conditional item
  describe('Conditional Item Display', () => {
    const conditionalItem = createDetectedItem('1', 'bicycle', 'camera')

    it('shows item name for conditional item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={conditionalItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-name')).toHaveTextContent(/bicycle/i)
    })

    it('shows estimated value for conditional item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={conditionalItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-value')).toHaveTextContent('$500')
    })

    it('shows "Conditional" status with yellow indicator for conditional item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={conditionalItem}
          policyType="renters"
        />
      )

      const statusBadge = screen.getByTestId('coverage-status')
      expect(statusBadge).toHaveTextContent(/Conditional/)
      expect(statusBadge).toHaveClass('bg-yellow-100')
    })

    it('shows specific conditions that apply', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={conditionalItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('conditions-list')).toBeInTheDocument()
      expect(screen.getByText(/Bike value may exceed policy sub-limits/i)).toBeInTheDocument()
      expect(screen.getByText(/High-end bikes need scheduled coverage/i)).toBeInTheDocument()
    })

    it('shows what happens if conditions are not met', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={conditionalItem}
          policyType="renters"
        />
      )

      // Check for explanation about partial coverage
      expect(screen.getByTestId('coverage-note')).toHaveTextContent(/limited coverage/)
    })

    it('shows how to get full coverage for conditional item', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={conditionalItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('upgrade-options')).toHaveTextContent(/scheduled personal property/)
    })
  })

  // VAL-DM-005: Detail modal closes via X button, backdrop click, Escape key
  describe('Modal Closing', () => {
    const modalItem = createDetectedItem('1', 'laptop', 'camera')

    it('closes via X button click', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={modalItem}
          policyType="renters"
        />
      )

      const closeButton = screen.getByTestId('modal-close-button')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('closes via backdrop click', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={modalItem}
          policyType="renters"
        />
      )

      const backdrop = screen.getByTestId('modal-backdrop')
      fireEvent.click(backdrop)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('closes via Escape key', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={modalItem}
          policyType="renters"
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      // onClose is called synchronously via document event listener
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when clicking modal content (not backdrop)', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={modalItem}
          policyType="renters"
        />
      )

      const modalContent = screen.getByTestId('modal-content')
      fireEvent.click(modalContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  // VAL-DM-006: Camera feed continues when modal is opened from camera view
  describe('Camera View Context', () => {
    it('applies dimmed backdrop when source is camera', () => {
      const cameraItem = createDetectedItem('1', 'laptop', 'camera')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={cameraItem}
          policyType="renters"
        />
      )

      const backdrop = screen.getByTestId('modal-backdrop')
      expect(backdrop).toHaveClass('bg-black/60')
    })

    it('applies standard backdrop when source is dashboard', () => {
      const dashboardItem = createDetectedItem('1', 'laptop', 'dashboard')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={dashboardItem}
          policyType="renters"
        />
      )

      const backdrop = screen.getByTestId('modal-backdrop')
      expect(backdrop).toHaveClass('bg-black/50')
    })
  })

  // VAL-DM-007: Detail modal content updates on policy change
  describe('Policy Change Updates', () => {
    const policyItem = createDetectedItem('1', 'laptop', 'camera')

    it('updates content when policyType prop changes', () => {
      const { rerender } = renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={policyItem}
          policyType="renters"
        />
      )

      // Initially covered under renters
      expect(screen.getByTestId('coverage-status')).toHaveTextContent('Covered')

      // Change to auto policy (laptop not covered)
      rerender(
        <AppProvider>
          <DetailModal
            isOpen={true}
            onClose={mockOnClose}
            item={policyItem}
            policyType="auto"
          />
        </AppProvider>
      )

      // Should now show not covered
      expect(screen.getByTestId('coverage-status')).toHaveTextContent(/Not Covered/)
    })

    it('shows updated coverage note when policy changes', () => {
      const carItem = createDetectedItem('1', 'car', 'camera')

      const { rerender } = renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={carItem}
          policyType="renters"
        />
      )

      // Initially not covered under renters
      expect(screen.getByTestId('coverage-note')).toHaveTextContent(/requires auto insurance/)

      // Change to auto policy (car covered)
      rerender(
        <AppProvider>
          <DetailModal
            isOpen={true}
            onClose={mockOnClose}
            item={carItem}
            policyType="auto"
          />
        </AppProvider>
      )

      // Should now show covered note
      expect(screen.getByTestId('coverage-note')).toHaveTextContent(/Vehicle covered under auto/)
    })
  })

  // Focus trap and accessibility
  describe('Focus Trap and Accessibility', () => {
    const accessibleItem = createDetectedItem('1', 'laptop', 'camera')

    it('has focusable close button', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={accessibleItem}
          policyType="renters"
        />
      )

      const closeButton = screen.getByTestId('modal-close-button')
      expect(closeButton).toHaveAttribute('tabIndex', '0')
    })

    it('close button has aria-label', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={accessibleItem}
          policyType="renters"
        />
      )

      const closeButton = screen.getByTestId('modal-close-button')
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal')
    })

    it('modal has role dialog', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={accessibleItem}
          policyType="renters"
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('modal has aria-modal attribute', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={accessibleItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('detail-modal')).toHaveAttribute('aria-modal', 'true')
    })

    it('modal has aria-labelledby for title', () => {
      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={accessibleItem}
          policyType="renters"
        />
      )

      const modal = screen.getByTestId('detail-modal')
      const titleId = modal.getAttribute('aria-labelledby')
      expect(screen.getByTestId('modal-title')).toHaveAttribute('id', titleId)
    })
  })

  // Edge cases
  describe('Edge Cases', () => {
    it('handles items with zero value', () => {
      const zeroValueItem = createDetectedItem('1', 'dog', 'camera')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={zeroValueItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-value')).toHaveTextContent('$0')
    })

    it('handles unknown categories gracefully', () => {
      const unknownItem = createManualItem('1', 'unknown_item', 100, { name: 'Unknown Item' })

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={unknownItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-name')).toHaveTextContent(/unknown/i)
      expect(screen.getByTestId('coverage-status')).toHaveTextContent(/Not Covered/i)
    })

    it('capitalizes category name in display', () => {
      const cellPhoneItem = createManualItem('1', 'cell phone', 800, { name: 'Cell Phone' })

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={cellPhoneItem}
          policyType="renters"
        />
      )

      expect(screen.getByTestId('item-name')).toHaveTextContent('Cell Phone')
    })

    it('shows policy name in policy info section', () => {
      const laptopItem = createDetectedItem('1', 'laptop', 'camera')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={laptopItem}
          policyType="homeowners"
        />
      )

      expect(screen.getByTestId('policy-info')).toHaveTextContent(/homeowner/i)
    })

    it('shows "No Insurance" when policyType is none', () => {
      const laptopItem = createDetectedItem('1', 'laptop', 'camera')

      renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={laptopItem}
          policyType="none"
        />
      )

      expect(screen.getByTestId('policy-info')).toHaveTextContent(/No Insurance|none/i)
    })
  })

  // VAL-CROSS-007: Detail modal consistency across entry points
  describe('Consistency Across Entry Points', () => {
    it('shows identical information regardless of source', () => {
      const itemData = createDetectedItem('1', 'laptop', 'camera')

      const { rerender } = renderWithProvider(
        <DetailModal
          isOpen={true}
          onClose={mockOnClose}
          item={{ ...itemData, source: 'camera' }}
          policyType="renters"
        />
      )

      const cameraName = screen.getByTestId('item-name').textContent
      const cameraValue = screen.getByTestId('item-value').textContent
      const cameraStatus = screen.getByTestId('coverage-status').textContent

      rerender(
        <AppProvider>
          <DetailModal
            isOpen={true}
            onClose={mockOnClose}
            item={{ ...itemData, source: 'dashboard' }}
            policyType="renters"
          />
        </AppProvider>
      )

      const dashboardName = screen.getByTestId('item-name').textContent
      const dashboardValue = screen.getByTestId('item-value').textContent
      const dashboardStatus = screen.getByTestId('coverage-status').textContent

      expect(cameraName).toBe(dashboardName)
      expect(cameraValue).toBe(dashboardValue)
      expect(cameraStatus).toBe(dashboardStatus)
    })
  })
})
