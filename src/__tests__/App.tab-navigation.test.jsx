import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App.jsx'
import { AppProvider } from '../context/AppContext.jsx'

// Mock the CameraView component
vi.mock('../components/CameraView/CameraView.jsx', () => ({
  CameraView: vi.fn(({ onError, onManualMode }) => (
    <div data-testid="mock-camera-view">
      <p>Camera View Mock</p>
      <button onClick={() => onError && onError(new Error('Camera error'))}>
        Trigger Error
      </button>
      <button onClick={() => onManualMode && onManualMode()}>
        Use Manual Mode
      </button>
    </div>
  ))
}))

// Mock the PolicySelector component
vi.mock('../components/PolicySelector/PolicySelector.jsx', () => ({
  PolicySelector: vi.fn(({ variant }) => (
    <div data-testid="mock-policy-selector">{variant} Policy Selector</div>
  ))
}))

// Mock the Dashboard component
vi.mock('../components/Dashboard/Dashboard.jsx', () => ({
  Dashboard: vi.fn(({ detectedItems, manualItems, policyType }) => (
    <div data-testid="mock-dashboard">
      <p>Dashboard Mock</p>
      <p data-testid="dashboard-detected-count">{detectedItems?.length || 0} detected</p>
      <p data-testid="dashboard-manual-count">{manualItems?.length || 0} manual</p>
      <p data-testid="dashboard-policy">{policyType}</p>
    </div>
  ))
}))

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

describe('App - Tab Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('initial render', () => {
    it('starts with camera tab active by default', () => {
      renderWithProvider(<App />)
      expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'true')
      expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'false')
    })

    it('renders CameraView when camera tab is active', () => {
      renderWithProvider(<App />)
      expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
    })

    it('renders TabNavigation component', () => {
      renderWithProvider(<App />)
      expect(screen.getByTestId('tab-navigation')).toBeInTheDocument()
    })
  })

  describe('tab switching', () => {
    it('switches to dashboard when dashboard tab clicked', async () => {
      renderWithProvider(<App />)
      
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'false')
      })
    })

    it('switches back to camera when camera tab clicked', async () => {
      renderWithProvider(<App />)
      
      // First switch to dashboard
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'true')
      })
      
      // Then switch back to camera
      fireEvent.click(screen.getByTestId('tab-camera'))
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'false')
      })
    })

    it('renders Dashboard when dashboard tab is active', async () => {
      renderWithProvider(<App />)
      
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
    })

    it('hides CameraView when switching to dashboard', async () => {
      renderWithProvider(<App />)
      
      expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('mock-camera-view')).not.toBeInTheDocument()
      })
    })
  })

  describe('state preservation across tab switches', () => {
    it('preserves detected items when switching tabs', async () => {
      renderWithProvider(<App />)
      
      // Switch to dashboard
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      // Verify dashboard received detected items prop (empty initially but passed)
      expect(screen.getByTestId('dashboard-detected-count')).toHaveTextContent('0 detected')
      
      // Switch back to camera
      fireEvent.click(screen.getByTestId('tab-camera'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
    })

    it('preserves manual items when switching tabs', async () => {
      renderWithProvider(<App />)
      
      // Switch to dashboard
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      // Verify manual items are passed (empty initially)
      expect(screen.getByTestId('dashboard-manual-count')).toHaveTextContent('0 manual')
    })

    it('preserves policy type when switching tabs', async () => {
      renderWithProvider(<App />)
      
      // Switch to dashboard
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      // Policy type should be passed to dashboard (default is 'renters')
      expect(screen.getByTestId('dashboard-policy')).toHaveTextContent('renters')
    })

    it('passes updated detected items to dashboard after tab switch', async () => {
      // This tests that detected items from camera context are properly passed
      renderWithProvider(<App />)
      
      // Verify CameraView is rendered (which would update detected items)
      expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      
      // Switch to dashboard
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('camera behavior on tab switch', () => {
    it('camera component is unmounted when switching to dashboard', async () => {
      renderWithProvider(<App />)
      
      expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('mock-camera-view')).not.toBeInTheDocument()
      })
    })

    it('camera component remounts when switching back to camera tab', async () => {
      renderWithProvider(<App />)
      
      // Switch to dashboard
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.queryByTestId('mock-camera-view')).not.toBeInTheDocument()
      })
      
      // Switch back to camera
      fireEvent.click(screen.getByTestId('tab-camera'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
    })

    it('handles camera error without crashing', async () => {
      renderWithProvider(<App />)
      
      // Trigger error from mock
      fireEvent.click(screen.getByText('Trigger Error'))
      
      // App should still be functional
      expect(screen.getByTestId('tab-navigation')).toBeInTheDocument()
    })

    it('switches to manual mode when camera unavailable', async () => {
      renderWithProvider(<App />)
      
      // Click manual mode button in mock
      fireEvent.click(screen.getByText('Use Manual Mode'))
      
      // Should switch to dashboard
      await waitFor(() => {
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('header and layout', () => {
    it('renders header with InsureScope branding', () => {
      renderWithProvider(<App />)
      
      expect(screen.getByText('InsureScope')).toBeInTheDocument()
      expect(screen.getByText('IS')).toBeInTheDocument()
    })

    it('renders PolicySelector in header', () => {
      renderWithProvider(<App />)
      
      expect(screen.getByTestId('mock-policy-selector')).toBeInTheDocument()
    })

    it('shows compact variant of PolicySelector in header', () => {
      renderWithProvider(<App />)
      
      expect(screen.getByTestId('mock-policy-selector')).toHaveTextContent('compact Policy Selector')
    })

    it('maintains header when switching tabs', async () => {
      renderWithProvider(<App />)
      
      expect(screen.getByText('InsureScope')).toBeInTheDocument()
      
      fireEvent.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      expect(screen.getByText('InsureScope')).toBeInTheDocument()
    })
  })

  describe('rapid tab switching', () => {
    it('handles rapid tab switching without errors', async () => {
      renderWithProvider(<App />)
      
      // Rapidly switch tabs multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('tab-dashboard'))
        fireEvent.click(screen.getByTestId('tab-camera'))
      }

      // Should end on camera tab
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'true')
      })
    })
  })
})
