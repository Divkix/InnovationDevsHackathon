import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { AppProvider } from '../context/AppContext.jsx'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

function renderWithProvider(ui) {
  return render(<AppProvider>{ui}</AppProvider>)
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('renders the onboarding flow for new users', () => {
    renderWithProvider(<App />)
    // When onboarding is not complete, should show onboarding flow
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument()
    expect(screen.getByText('Select Your Insurance')).toBeInTheDocument()
  })

  describe('after onboarding complete', () => {
    beforeEach(() => {
      // Set localStorage to simulate completed onboarding
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'insurescope_policyType') return 'renters'
        if (key === 'insurescope_onboardingComplete') return 'true'
        if (key === 'insurescope_manualItems') return '[]'
        if (key === 'insurescope_confidenceThreshold') return '0.5'
        return null
      })
    })

    it('renders the InsureScope heading', () => {
      renderWithProvider(<App />)
      expect(screen.getByText('InsureScope')).toBeInTheDocument()
    })

    it('renders the Camera and Dashboard tabs', () => {
      renderWithProvider(<App />)
      expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument()
    })

    it('renders the Policy Selector in header', () => {
      renderWithProvider(<App />)
      expect(screen.getByTestId('policy-selector')).toBeInTheDocument()
    })
  })
})
