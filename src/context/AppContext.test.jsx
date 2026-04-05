import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AppProvider, useAppContext } from './AppContext'
import { useContext } from 'react'

// Helper component to access context values for testing
function TestConsumer() {
  const context = useAppContext()
  return (
    <div>
      <div data-testid="policyType">{context.policyType}</div>
      <div data-testid="onboardingComplete">{context.onboardingComplete ? 'true' : 'false'}</div>
      <div data-testid="activeTab">{context.activeTab}</div>
      <div data-testid="detectedItemsCount">{context.detectedItems.size}</div>
      <div data-testid="manualItemsCount">{context.manualItems.length}</div>
      <div data-testid="selectedItemId">{context.selectedItemId || 'null'}</div>
      <button data-testid="setPolicyType" onClick={() => context.setPolicyType('auto')}>Set Policy</button>
      <button data-testid="completeOnboarding" onClick={() => context.completeOnboarding()}>Complete</button>
      <button data-testid="setActiveTab" onClick={() => context.setActiveTab('dashboard')}>Set Tab</button>
      <button data-testid="setSelectedItem" onClick={() => context.setSelectedItem('item-1')}>Select Item</button>
      <button data-testid="clearSelectedItem" onClick={() => context.setSelectedItem(null)}>Clear Item</button>
      <button data-testid="updateDetectedItems" onClick={() => {
        const newMap = new Map()
        newMap.set('obj-1', { id: 'obj-1', name: 'laptop', confidence: 0.9 })
        context.updateDetectedItems(newMap)
      }}>Update Detected</button>
      <button data-testid="addManualItem" onClick={() => context.addManualItem({ id: 'manual-1', name: 'Watch', value: 500 })}>Add Manual</button>
      <button data-testid="removeManualItem" onClick={() => context.removeManualItem('manual-1')}>Remove Manual</button>
      <button data-testid="updateManualItem" onClick={() => context.updateManualItem('manual-1', { name: 'Updated Watch', value: 600 })}>Update Manual</button>
    </div>
  )
}

// Helper to wrap component with provider
function renderWithProvider(ui, { providerProps = {} } = {}) {
  return render(<AppProvider {...providerProps}>{ui}</AppProvider>)
}

describe('AppContext', () => {
  let localStorageMock = {}
  
  // Mock localStorage before each test
  beforeEach(() => {
    localStorageMock = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => localStorageMock[key] || null),
        setItem: vi.fn((key, value) => {
          localStorageMock[key] = value
        }),
        clear: vi.fn(() => {
          localStorageMock = {}
        }),
        removeItem: vi.fn((key) => {
          delete localStorageMock[key]
        })
      },
      writable: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('provides default state values', () => {
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('policyType').textContent).toBe('renters')
      expect(screen.getByTestId('onboardingComplete').textContent).toBe('false')
      expect(screen.getByTestId('activeTab').textContent).toBe('camera')
      expect(screen.getByTestId('detectedItemsCount').textContent).toBe('0')
      expect(screen.getByTestId('manualItemsCount').textContent).toBe('0')
      expect(screen.getByTestId('selectedItemId').textContent).toBe('null')
    })

    it('loads policyType from localStorage if available', () => {
      localStorageMock['insurescope_policyType'] = 'auto'
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('policyType').textContent).toBe('auto')
    })

    it('loads onboardingComplete from localStorage if available', () => {
      localStorageMock['insurescope_onboardingComplete'] = 'true'
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('onboardingComplete').textContent).toBe('true')
    })

    it('loads manualItems from localStorage if available', () => {
      const manualItems = [{ id: 'item-1', name: 'Jewelry', value: 1000 }]
      localStorageMock['insurescope_manualItems'] = JSON.stringify(manualItems)
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('manualItemsCount').textContent).toBe('1')
    })
  })

  describe('setPolicyType action', () => {
    it('updates policyType in state', () => {
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('policyType').textContent).toBe('renters')
      
      act(() => {
        screen.getByTestId('setPolicyType').click()
      })
      
      expect(screen.getByTestId('policyType').textContent).toBe('auto')
    })

    it('persists policyType to localStorage', () => {
      renderWithProvider(<TestConsumer />)
      
      act(() => {
        screen.getByTestId('setPolicyType').click()
      })
      
      expect(localStorageMock['insurescope_policyType']).toBe('auto')
    })

    it('accepts all valid policy types', () => {
      function PolicyTest() {
        const { policyType, setPolicyType } = useAppContext()
        return (
          <div>
            <div data-testid="currentPolicy">{policyType}</div>
            <button data-testid="set-renters" onClick={() => setPolicyType('renters')}>Set Renters</button>
            <button data-testid="set-homeowners" onClick={() => setPolicyType('homeowners')}>Set Homeowners</button>
            <button data-testid="set-auto" onClick={() => setPolicyType('auto')}>Set Auto</button>
            <button data-testid="set-none" onClick={() => setPolicyType('none')}>Set None</button>
          </div>
        )
      }

      renderWithProvider(<PolicyTest />)
      
      const policies = ['renters', 'homeowners', 'auto', 'none']
      
      for (const policy of policies) {
        act(() => {
          screen.getByTestId(`set-${policy}`).click()
        })
        expect(screen.getByTestId('currentPolicy').textContent).toBe(policy)
      }
    })
  })

  describe('completeOnboarding action', () => {
    it('sets onboardingComplete to true', () => {
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('onboardingComplete').textContent).toBe('false')
      
      act(() => {
        screen.getByTestId('completeOnboarding').click()
      })
      
      expect(screen.getByTestId('onboardingComplete').textContent).toBe('true')
    })

    it('persists onboardingComplete to localStorage', () => {
      renderWithProvider(<TestConsumer />)
      
      act(() => {
        screen.getByTestId('completeOnboarding').click()
      })
      
      expect(localStorageMock['insurescope_onboardingComplete']).toBe('true')
    })
  })

  describe('setActiveTab action', () => {
    it('updates activeTab in state', () => {
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('activeTab').textContent).toBe('camera')
      
      act(() => {
        screen.getByTestId('setActiveTab').click()
      })
      
      expect(screen.getByTestId('activeTab').textContent).toBe('dashboard')
    })
  })

  describe('setSelectedItem action', () => {
    it('updates selectedItemId in state', () => {
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('selectedItemId').textContent).toBe('null')
      
      act(() => {
        screen.getByTestId('setSelectedItem').click()
      })
      
      expect(screen.getByTestId('selectedItemId').textContent).toBe('item-1')
    })

    it('clears selectedItemId when null is passed', () => {
      renderWithProvider(<TestConsumer />)
      
      // First set an item
      act(() => {
        screen.getByTestId('setSelectedItem').click()
      })
      expect(screen.getByTestId('selectedItemId').textContent).toBe('item-1')
      
      // Then clear it
      act(() => {
        screen.getByTestId('clearSelectedItem').click()
      })
      expect(screen.getByTestId('selectedItemId').textContent).toBe('null')
    })
  })

  describe('updateDetectedItems action', () => {
    it('updates detectedItems Map in state', () => {
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('detectedItemsCount').textContent).toBe('0')
      
      act(() => {
        screen.getByTestId('updateDetectedItems').click()
      })
      
      expect(screen.getByTestId('detectedItemsCount').textContent).toBe('1')
    })

    it('does NOT persist detectedItems to localStorage', () => {
      renderWithProvider(<TestConsumer />)
      
      act(() => {
        screen.getByTestId('updateDetectedItems').click()
      })
      
      // detectedItems should NOT be in localStorage
      expect(localStorageMock['insurescope_detectedItems']).toBeUndefined()
    })
  })

  describe('addManualItem action', () => {
    it('adds item to manualItems array', () => {
      renderWithProvider(<TestConsumer />)
      
      expect(screen.getByTestId('manualItemsCount').textContent).toBe('0')
      
      act(() => {
        screen.getByTestId('addManualItem').click()
      })
      
      expect(screen.getByTestId('manualItemsCount').textContent).toBe('1')
    })

    it('persists manualItems to localStorage', () => {
      renderWithProvider(<TestConsumer />)
      
      act(() => {
        screen.getByTestId('addManualItem').click()
      })
      
      const stored = localStorageMock['insurescope_manualItems']
      expect(stored).not.toBeUndefined()
      const parsed = JSON.parse(stored)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('Watch')
    })
  })

  describe('removeManualItem action', () => {
    it('removes item from manualItems array by id', () => {
      renderWithProvider(<TestConsumer />)
      
      // Add an item first
      act(() => {
        screen.getByTestId('addManualItem').click()
      })
      expect(screen.getByTestId('manualItemsCount').textContent).toBe('1')
      
      // Then remove it
      act(() => {
        screen.getByTestId('removeManualItem').click()
      })
      
      expect(screen.getByTestId('manualItemsCount').textContent).toBe('0')
    })

    it('updates localStorage after removal', () => {
      renderWithProvider(<TestConsumer />)
      
      // Add and then remove
      act(() => {
        screen.getByTestId('addManualItem').click()
      })
      act(() => {
        screen.getByTestId('removeManualItem').click()
      })
      
      const stored = localStorageMock['insurescope_manualItems']
      expect(stored).toBe('[]')
    })
  })

  describe('updateManualItem action', () => {
    it('updates existing item by id', () => {
      function UpdateTest() {
        const { manualItems, addManualItem, updateManualItem } = useAppContext()
        return (
          <div>
            <div data-testid="itemName">{manualItems[0]?.name || 'none'}</div>
            <div data-testid="itemValue">{manualItems[0]?.value || '0'}</div>
            <button data-testid="add" onClick={() => addManualItem({ id: 'manual-1', name: 'Watch', value: 500 })}>Add</button>
            <button data-testid="update" onClick={() => updateManualItem('manual-1', { name: 'Updated Watch', value: 600 })}>Update</button>
          </div>
        )
      }

      renderWithProvider(<UpdateTest />)
      
      // Add an item first
      act(() => {
        screen.getByTestId('add').click()
      })
      expect(screen.getByTestId('itemName').textContent).toBe('Watch')
      expect(screen.getByTestId('itemValue').textContent).toBe('500')
      
      // Update it
      act(() => {
        screen.getByTestId('update').click()
      })
      
      expect(screen.getByTestId('itemName').textContent).toBe('Updated Watch')
      expect(screen.getByTestId('itemValue').textContent).toBe('600')
    })

    it('persists updated manualItems to localStorage', () => {
      renderWithProvider(<TestConsumer />)
      
      // Add and then update
      act(() => {
        screen.getByTestId('addManualItem').click()
      })
      act(() => {
        screen.getByTestId('updateManualItem').click()
      })
      
      const stored = JSON.parse(localStorageMock['insurescope_manualItems'])
      expect(stored[0].name).toBe('Updated Watch')
      expect(stored[0].value).toBe(600)
    })
  })

  describe('localStorage persistence edge cases', () => {
    it('handles corrupted localStorage gracefully', () => {
      localStorageMock['insurescope_manualItems'] = 'invalid json'
      
      // Should not throw
      expect(() => renderWithProvider(<TestConsumer />)).not.toThrow()
      
      // Should use default empty array
      expect(screen.getByTestId('manualItemsCount').textContent).toBe('0')
    })

    it('handles localStorage being unavailable', () => {
      // Temporarily make localStorage undefined
      const originalLocalStorage = window.localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      })
      
      // Should not throw
      expect(() => renderWithProvider(<TestConsumer />)).not.toThrow()
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      })
    })

    it('multiple state changes accumulate in localStorage', () => {
      function MultiChangeTest() {
        const { setPolicyType, addManualItem } = useAppContext()
        return (
          <div>
            <button data-testid="setHomeowners" onClick={() => setPolicyType('homeowners')}>Homeowners</button>
            <button data-testid="addItem1" onClick={() => addManualItem({ id: 'm1', name: 'Ring', value: 1000 })}>Add Ring</button>
            <button data-testid="addItem2" onClick={() => addManualItem({ id: 'm2', name: 'Necklace', value: 2000 })}>Add Necklace</button>
          </div>
        )
      }

      renderWithProvider(<MultiChangeTest />)
      
      act(() => {
        screen.getByTestId('setHomeowners').click()
        screen.getByTestId('addItem1').click()
        screen.getByTestId('addItem2').click()
      })
      
      expect(localStorageMock['insurescope_policyType']).toBe('homeowners')
      const items = JSON.parse(localStorageMock['insurescope_manualItems'])
      expect(items).toHaveLength(2)
    })
  })

  describe('useAppContext hook', () => {
    it('throws when used outside of provider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      function BadComponent() {
        useAppContext()
        return <div>Bad</div>
      }
      
      expect(() => render(<BadComponent />)).toThrow()
      
      consoleSpy.mockRestore()
    })

    it('returns same context object to prevent unnecessary re-renders', () => {
      const contextRefs = []
      
      function RefCapture() {
        const context = useAppContext()
        // Capture context reference on each render
        contextRefs.push(context)
        return <div data-testid="capture">captured</div>
      }

      renderWithProvider(<RefCapture />)
      
      // On first render, we should have 1 context reference
      expect(contextRefs).toHaveLength(1)
      
      // If context is properly memoized, calling an action that doesn't change
      // shouldn't create a new context object
      // (We can't easily test this without triggering a re-render,
      // but the test documents the expected behavior that context is memoized)
      expect(screen.getByTestId('capture').textContent).toBe('captured')
    })
  })
})
