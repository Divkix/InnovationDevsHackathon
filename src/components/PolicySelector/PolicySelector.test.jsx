import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppProvider } from '@/context/AppContext.jsx'
import { PolicySelector } from './PolicySelector.jsx'

// Mock localStorage for jsdom
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock the coverageLookup module
vi.mock('@/utils/coverageLookup.js', () => ({
  lookupCoverage: vi.fn((category, policyType) => {
    // Get estimated value based on category
    const categoryValues = {
      'laptop': 1200,
      'car': 15000,
      'cell phone': 800
    }
    const estimatedValue = categoryValues[category] || 1000
    
    // Return different coverage based on policy type
    if (policyType === 'none') {
      return {
        status: 'not_covered',
        color: 'red',
        estimatedValue,
        note: 'Not covered - no insurance',
        upgrade: 'Get insurance'
      }
    }
    if (policyType === 'renters') {
      // Laptop covered, car and cell phone not covered under renters
      if (category === 'laptop') {
        return {
          status: 'covered',
          color: 'green',
          estimatedValue,
          note: 'Covered under renters',
          upgrade: null
        }
      }
      return {
        status: 'not_covered',
        color: 'red',
        estimatedValue,
        note: 'Not covered under renters',
        upgrade: 'Consider appropriate coverage'
      }
    }
    if (policyType === 'auto') {
      // Car covered, laptop and cell phone not covered under auto
      if (category === 'car') {
        return {
          status: 'covered',
          color: 'green',
          estimatedValue,
          note: 'Covered under auto',
          upgrade: null
        }
      }
      return {
        status: 'not_covered',
        color: 'red',
        estimatedValue,
        note: 'Not covered - auto only covers vehicles',
        upgrade: 'Consider renters insurance'
      }
    }
    if (policyType === 'homeowners') {
      // All covered under homeowners
      return {
        status: 'covered',
        color: 'green',
        estimatedValue,
        note: 'Covered under homeowners',
        upgrade: null
      }
    }
    // Default fallback
    return {
      status: 'not_covered',
      color: 'red',
      estimatedValue,
      note: 'Unknown category',
      upgrade: 'Consult agent'
    }
  }),
  VALID_POLICY_TYPES: ['renters', 'homeowners', 'auto', 'none']
}))

describe('PolicySelector', () => {
  const renderWithProvider = (component) => {
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

  describe('Rendering', () => {
    it('renders all 4 policy options', () => {
      renderWithProvider(<PolicySelector />)
      
      expect(screen.getAllByText(/Renter's Insurance/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Homeowner's Insurance/i)).toBeInTheDocument()
      expect(screen.getByText(/Auto Insurance/i)).toBeInTheDocument()
      expect(screen.getByText(/No Insurance/i)).toBeInTheDocument()
    })

    it('renders policy icons for each option', () => {
      renderWithProvider(<PolicySelector />)
      
      // Each policy option should have an icon (using data-testid)
      const policyButtons = screen.getAllByTestId('policy-option')
      expect(policyButtons).toHaveLength(4)
    })

    it('has accessible labels for screen readers', () => {
      renderWithProvider(<PolicySelector />)
      
      expect(screen.getByLabelText(/Select Renter's Insurance/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Select Homeowner's Insurance/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Select Auto Insurance/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Select No Insurance/i)).toBeInTheDocument()
    })
  })

  describe('Policy Selection', () => {
    it('highlights the current policy type', () => {
      renderWithProvider(<PolicySelector />)
      
      // Default policy is 'renters' - should be highlighted
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      expect(rentersOption).toHaveAttribute('aria-pressed', 'true')
    })

    it('updates selection when a policy is clicked', async () => {
      renderWithProvider(<PolicySelector />)
      
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i)
      
      fireEvent.click(autoOption)
      
      await waitFor(() => {
        expect(autoOption).toHaveAttribute('aria-pressed', 'true')
      })
      
      // Previous selection should no longer be pressed
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      expect(rentersOption).toHaveAttribute('aria-pressed', 'false')
    })

    it('allows switching between all policy types', async () => {
      renderWithProvider(<PolicySelector />)
      
      const policies = [
        { label: /Select Homeowner's Insurance/i, name: 'homeowners' },
        { label: /Select Auto Insurance/i, name: 'auto' },
        { label: /Select No Insurance/i, name: 'none' },
        { label: /Select Renter's Insurance/i, name: 'renters' }
      ]
      
      for (const policy of policies) {
        const option = screen.getByLabelText(policy.label)
        fireEvent.click(option)
        
        await waitFor(() => {
          expect(option).toHaveAttribute('aria-pressed', 'true')
        })
      }
    })

    it('persists selected policy to localStorage', async () => {
      renderWithProvider(<PolicySelector />)
      
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i)
      fireEvent.click(autoOption)
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('insurescope_policyType', 'auto')
      })
    })
  })

  describe('Red Moment - No Insurance Mode', () => {
    it('shows all items as not covered when No Insurance is selected', async () => {
      // Mock detected items
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]
      
      renderWithProvider(
        <PolicySelector detectedItems={mockItems} />
      )
      
      // Select No Insurance
      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i)
      fireEvent.click(noInsuranceOption)
      
      await waitFor(() => {
        // Check that the "all red" indicator is shown
        expect(screen.getByTestId('red-moment-indicator')).toBeInTheDocument()
        expect(screen.getByText(/All items not covered/i)).toBeInTheDocument()
      })
    })

    it('displays 100% coverage gap for No Insurance', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i)
      fireEvent.click(noInsuranceOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('coverage-gap')).toHaveTextContent('100.0%')
      })
    })

    it('shows protected value as $0 for No Insurance', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 }
      ]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i)
      fireEvent.click(noInsuranceOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('protected-value')).toHaveTextContent('$0')
      })
    })

    it('shows unprotected value equal to total for No Insurance', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]

      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i)
      fireEvent.click(noInsuranceOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('unprotected-value')).toHaveTextContent('$16,200')
      })
    })
  })

  describe('Coverage Restoration', () => {
    it('restores original colors when switching back from No Insurance', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      // Start with renters (laptop covered, car not covered)
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      
      // Switch to No Insurance
      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i)
      fireEvent.click(noInsuranceOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('red-moment-indicator')).toBeInTheDocument()
      })
      
      // Switch back to renters
      fireEvent.click(rentersOption)
      
      await waitFor(() => {
        // Red moment indicator should be gone
        expect(screen.queryByTestId('red-moment-indicator')).not.toBeInTheDocument()
        // Coverage gap should reflect renters policy (not 100%)
        const gapText = screen.getByTestId('coverage-gap').textContent
        expect(gapText).not.toBe('100.0%')
      })
    })

    it('correctly updates dashboard totals when switching policies', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      // Check initial values under renters
      await waitFor(() => {
        expect(screen.getByTestId('protected-value')).toHaveTextContent('$1,200')
        expect(screen.getByTestId('unprotected-value')).toHaveTextContent('$15,000')
      })
      
      // Switch to homeowners (both covered)
      const homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i)
      fireEvent.click(homeownersOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('protected-value')).toHaveTextContent('$16,200')
        expect(screen.getByTestId('unprotected-value')).toHaveTextContent('$0')
      })
    })
  })

  describe('Rapid Switching', () => {
    it('settles on correct final state after rapid policy switches', async () => {
      renderWithProvider(<PolicySelector />)
      
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i)
      const homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i)
      const noneOption = screen.getByLabelText(/Select No Insurance/i)
      
      // Rapidly switch policies
      fireEvent.click(autoOption)
      fireEvent.click(homeownersOption)
      fireEvent.click(noneOption)
      fireEvent.click(rentersOption)
      fireEvent.click(autoOption)
      
      // Should settle on auto (last clicked)
      await waitFor(() => {
        expect(autoOption).toHaveAttribute('aria-pressed', 'true')
        expect(rentersOption).toHaveAttribute('aria-pressed', 'false')
        expect(homeownersOption).toHaveAttribute('aria-pressed', 'false')
        expect(noneOption).toHaveAttribute('aria-pressed', 'false')
      })
      
      // localStorage should have final value
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith('insurescope_policyType', 'auto')
    })

    it('handles 5 rapid switches within 3 seconds', async () => {
      const mockItems = [{ id: '1', category: 'laptop', estimatedValue: 1200 }]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i)
      
      // Perform 5 rapid switches
      fireEvent.click(autoOption)
      fireEvent.click(rentersOption)
      fireEvent.click(autoOption)
      fireEvent.click(rentersOption)
      fireEvent.click(autoOption)
      
      // Should settle on auto
      await waitFor(() => {
        expect(autoOption).toHaveAttribute('aria-pressed', 'true')
        // Coverage values should reflect auto policy
        expect(screen.getByTestId('coverage-gap')).toBeInTheDocument()
      })
    })
  })

  describe('Distinct Coverage Maps', () => {
    it('produces distinct coverage results for all 4 policy types', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const policies = [
        { label: /Select Renter's Insurance/i, name: 'renters', expectedGap: '92.6%' },
        { label: /Select Homeowner's Insurance/i, name: 'homeowners', expectedGap: '0.0%' },
        { label: /Select Auto Insurance/i, name: 'auto', expectedGap: '7.4%' },
        { label: /Select No Insurance/i, name: 'none', expectedGap: '100.0%' }
      ]
      
      for (const policy of policies) {
        const option = screen.getByLabelText(policy.label)
        fireEvent.click(option)
        
        await waitFor(() => {
          expect(screen.getByTestId('coverage-gap')).toHaveTextContent(policy.expectedGap)
        })
      }
    })

    it('shows different protected values for each policy type', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      // Test renters: laptop covered ($1200), car not covered
      let rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      fireEvent.click(rentersOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('protected-value')).toHaveTextContent('$1,200')
      })
      
      // Test auto: laptop not covered, car covered ($15000)
      let autoOption = screen.getByLabelText(/Select Auto Insurance/i)
      fireEvent.click(autoOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('protected-value')).toHaveTextContent('$15,000')
      })
      
      // Test homeowners: both covered ($16200)
      let homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i)
      fireEvent.click(homeownersOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('protected-value')).toHaveTextContent('$16,200')
      })
    })
  })

  describe('Dashboard Arithmetic Invariant', () => {
    it('maintains total = protected + unprotected during policy switches', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 },
        { id: '3', category: 'cell phone', estimatedValue: 800 }
      ]
      const expectedTotal = 17000
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const policies = [
        /Select Renter's Insurance/i,
        /Select Homeowner's Insurance/i,
        /Select Auto Insurance/i,
        /Select No Insurance/i
      ]
      
      for (const policyLabel of policies) {
        const option = screen.getByLabelText(policyLabel)
        fireEvent.click(option)
        
        await waitFor(() => {
          const totalText = screen.getByTestId('total-value').textContent
          const protectedText = screen.getByTestId('protected-value').textContent
          const unprotectedText = screen.getByTestId('unprotected-value').textContent
          
          // Parse currency values
          const total = parseInt(totalText.replace(/[^0-9]/g, ''))
          const protected_ = parseInt(protectedText.replace(/[^0-9]/g, ''))
          const unprotected = parseInt(unprotectedText.replace(/[^0-9]/g, ''))
          
          expect(total).toBe(expectedTotal)
          expect(protected_ + unprotected).toBe(expectedTotal)
        })
      }
    })

    it('shows total value correctly for No Insurance (total = unprotected)', async () => {
      const mockItems = [
        { id: '1', category: 'laptop', estimatedValue: 1200 },
        { id: '2', category: 'car', estimatedValue: 15000 }
      ]

      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const noneOption = screen.getByLabelText(/Select No Insurance/i)
      fireEvent.click(noneOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('total-value')).toHaveTextContent('$16,200')
        expect(screen.getByTestId('protected-value')).toHaveTextContent('$0')
        expect(screen.getByTestId('unprotected-value')).toHaveTextContent('$16,200')
      })
    })
  })

  describe('Accessibility', () => {
    it('supports keyboard navigation between policy options', () => {
      renderWithProvider(<PolicySelector />)
      
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      
      // Should be focusable
      rentersOption.focus()
      expect(document.activeElement).toBe(rentersOption)
    })

    it('allows selection via Enter key', async () => {
      renderWithProvider(<PolicySelector />)
      
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i)
      
      autoOption.focus()
      fireEvent.keyDown(autoOption, { key: 'Enter' })
      
      await waitFor(() => {
        expect(autoOption).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('allows selection via Space key', async () => {
      renderWithProvider(<PolicySelector />)
      
      const homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i)
      
      homeownersOption.focus()
      fireEvent.keyDown(homeownersOption, { key: ' ' })
      
      await waitFor(() => {
        expect(homeownersOption).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('has visible focus indicators', () => {
      renderWithProvider(<PolicySelector />)
      
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i)
      rentersOption.focus()
      
      // Check for focus ring class
      expect(rentersOption).toHaveClass('focus:ring-2')
    })
  })

  describe('Header Bar Integration', () => {
    it('renders in compact mode when used in header', () => {
      renderWithProvider(<PolicySelector variant="compact" />)
      
      expect(screen.getByTestId('policy-selector')).toHaveClass('compact')
    })

    it('renders in full mode by default', () => {
      renderWithProvider(<PolicySelector />)
      
      expect(screen.getByTestId('policy-selector')).not.toHaveClass('compact')
    })

    it('shows current policy label in compact mode', () => {
      renderWithProvider(<PolicySelector variant="compact" />)
      
      expect(screen.getByText(/Current Policy:/i)).toBeInTheDocument()
    })
  })

  describe('Real-time Updates', () => {
    it('updates coverage display within 1 second of policy change', async () => {
      const mockItems = [{ id: '1', category: 'laptop', estimatedValue: 1200 }]
      
      renderWithProvider(<PolicySelector detectedItems={mockItems} />)
      
      const startTime = Date.now()
      
      const noneOption = screen.getByLabelText(/Select No Insurance/i)
      fireEvent.click(noneOption)
      
      await waitFor(() => {
        expect(screen.getByTestId('red-moment-indicator')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })
})
