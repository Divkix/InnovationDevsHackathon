import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import type { ReactElement } from 'react'

// ============================================
// CRITICAL: Mock localStorage BEFORE any imports
// ============================================
// The AppContext reads localStorage during module initialization
// So we must set up the mock before any imports that use localStorage
const localStorageMock = {
  getItem: vi.fn((key: string): string | null => {
    // Simulate completed onboarding state
    if (key === 'insurescope_policyType') return 'renters'
    if (key === 'insurescope_onboardingComplete') return 'true'
    if (key === 'insurescope_manualItems') return '[]'
    if (key === 'insurescope_confidenceThreshold') return '0.5'
    if (key === 'insurescope_cameraPermissionDenied') return 'false'
    if (key === 'insurescope_manualModeEnabled') return 'false'
    return null
  }),
  setItem: vi.fn(() => {}),
  removeItem: vi.fn(() => {}),
  clear: vi.fn(() => {}),
  key: vi.fn(() => null),
  length: 0
}

// Override localStorage in the global scope before any imports
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
})

// ============================================
// Mock Types
// ============================================
import type { DetectedItem, ManualItem, PolicyType } from '../types'

// Mock component prop types
interface CameraViewMockProps {
  onError?: (error: Error) => void
  onManualMode?: () => void
  onItemClick?: (item: { id: string; category: string }) => void
}

interface PolicySelectorMockProps {
  variant?: 'default' | 'compact'
  detectedItems?: DetectedItem[]
  manualItems?: ManualItem[]
}

interface DashboardMockProps {
  detectedItems?: DetectedItem[]
  manualItems?: ManualItem[]
  policyType?: PolicyType
  onItemClick?: (item: { id: string }) => void
}

// ============================================
// Mock Components
// ============================================

// Mock the CameraView component
vi.mock('../components/CameraView/CameraView.jsx', () => ({
  CameraView: vi.fn(({ onError, onManualMode }: CameraViewMockProps): ReactElement => (
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
  PolicySelector: vi.fn(({ variant }: PolicySelectorMockProps): ReactElement => (
    <div data-testid="mock-policy-selector">{variant} Policy Selector</div>
  ))
}))

// Mock the Dashboard component
vi.mock('../components/Dashboard/Dashboard.jsx', () => ({
  Dashboard: vi.fn(({ detectedItems, manualItems, policyType }: DashboardMockProps): ReactElement => (
    <div data-testid="mock-dashboard">
      <p>Dashboard Mock</p>
      <p data-testid="dashboard-detected-count">{detectedItems?.length || 0} detected</p>
      <p data-testid="dashboard-manual-count">{manualItems?.length || 0} manual</p>
      <p data-testid="dashboard-policy">{policyType}</p>
    </div>
  ))
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }): ReactElement => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover: _whileHover, whileTap: _whileTap, ...props }: { children: React.ReactNode; whileHover?: unknown; whileTap?: unknown; [key: string]: unknown }): ReactElement => (
      <button {...props}>{children}</button>
    ),
    nav: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }): ReactElement => (
      <nav {...props}>{children}</nav>
    ),
    header: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }): ReactElement => (
      <header {...props}>{children}</header>
    ),
    main: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }): ReactElement => (
      <main {...props}>{children}</main>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }): ReactElement => <>{children}</>,
}))

// Mock lucide-react icons - factory-safe version with inline component definitions
vi.mock('lucide-react', () => ({
  Camera: () => <svg data-testid="icon-camera" />,
  LayoutDashboard: () => <svg data-testid="icon-dashboard" />,
  Shield: () => <svg data-testid="icon-shield" />,
  Plus: () => <svg data-testid="icon-plus" />,
  Package: () => <svg data-testid="icon-package" />,
  MessageCircle: () => <svg data-testid="icon-message" />,
  Home: () => <svg data-testid="icon-home" />,
  ShieldAlert: () => <svg data-testid="icon-shield-alert" />,
  Car: () => <svg data-testid="icon-car" />,
  ChevronLeft: () => <svg data-testid="icon-chevron-left" />,
  Check: () => <svg data-testid="icon-check" />,
  ArrowRight: () => <svg data-testid="icon-arrow-right" />,
  X: () => <svg data-testid="icon-x" />,
  Edit2: () => <svg data-testid="icon-edit" />,
  Trash2: () => <svg data-testid="icon-trash" />,
  Gem: () => <svg data-testid="icon-gem" />,
  Music: () => <svg data-testid="icon-music" />,
  Palette: () => <svg data-testid="icon-palette" />,
  Gamepad2: () => <svg data-testid="icon-gamepad" />,
  Wrench: () => <svg data-testid="icon-wrench" />,
  Dumbbell: () => <svg data-testid="icon-dumbbell" />,
  Target: () => <svg data-testid="icon-target" />,
  UtensilsCrossed: () => <svg data-testid="icon-utensils" />,
  Briefcase: () => <svg data-testid="icon-briefcase" />,
  CheckCircle: () => <svg data-testid="icon-check-circle" />,
  XCircle: () => <svg data-testid="icon-x-circle" />,
  AlertTriangle: () => <svg data-testid="icon-alert" />,
  DollarSign: () => <svg data-testid="icon-dollar" />,
  TrendingUp: () => <svg data-testid="icon-trending" />,
  FileText: () => <svg data-testid="icon-file" />,
  AlertCircle: () => <svg data-testid="icon-alert-circle" />,
  Minus: () => <svg data-testid="icon-minus" />,
  RefreshCw: () => <svg data-testid="icon-refresh" />,
  Hand: () => <svg data-testid="icon-hand" />,
  Bug: () => <svg data-testid="icon-bug" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
  LucideIcon: () => <svg data-testid="icon-generic" />,
}))

// ============================================
// Imports AFTER mocks are set up
// ============================================
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { AppProvider } from '../context/AppContext'

// Helper to render with provider
function renderWithProvider(ui: ReactElement): ReturnType<typeof render> {
  return render(<AppProvider>{ui}</AppProvider>)
}

describe('App - Tab Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mock to return completed onboarding
    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      if (key === 'insurescope_policyType') return 'renters'
      if (key === 'insurescope_onboardingComplete') return 'true'
      if (key === 'insurescope_manualItems') return '[]'
      if (key === 'insurescope_confidenceThreshold') return '0.5'
      if (key === 'insurescope_cameraPermissionDenied') return 'false'
      if (key === 'insurescope_manualModeEnabled') return 'false'
      return null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial render', () => {
    it('starts with camera tab active by default', async () => {
      renderWithProvider(<App />)
      
      // Wait for the component to render with the mocked localStorage values
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'false')
      })
    })

    it('renders CameraView when camera tab is active', async () => {
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
    })

    it('renders TabNavigation component', async () => {
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-navigation')).toBeInTheDocument()
      })
    })
  })

  describe('tab switching', () => {
    it('switches to dashboard when dashboard tab clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      })
      
      // Use userEvent for more realistic interaction
      await user.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'false')
      })
    })

    it('switches back to camera when camera tab clicked', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      })
      
      // First switch to dashboard
      await user.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'true')
      })
      
      // Then switch back to camera
      await user.click(screen.getByTestId('tab-camera'))
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'false')
      })
    })

    it('renders Dashboard when dashboard tab is active', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
    })

    it('hides CameraView when switching to dashboard', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('mock-camera-view')).not.toBeInTheDocument()
      })
    })
  })

  describe('state preservation across tab switches', () => {
    it('preserves detected items when switching tabs', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      })
      
      // Switch to dashboard
      await user.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      // Verify dashboard received detected items prop (empty initially but passed)
      expect(screen.getByTestId('dashboard-detected-count')).toHaveTextContent('0 detected')
      
      // Switch back to camera
      await user.click(screen.getByTestId('tab-camera'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
    })

    it('preserves manual items when switching tabs', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      })
      
      // Switch to dashboard
      await user.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      // Verify manual items are passed (empty initially)
      expect(screen.getByTestId('dashboard-manual-count')).toHaveTextContent('0 manual')
    })

    it('preserves policy type when switching tabs', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      })
      
      // Switch to dashboard
      await user.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      // Policy type should be passed to dashboard (default is 'renters')
      expect(screen.getByTestId('dashboard-policy')).toHaveTextContent('renters')
    })

    it('passes updated detected items to dashboard after tab switch', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      // Wait for CameraView to be rendered
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
      
      // Switch to dashboard
      await user.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('camera behavior on tab switch', () => {
    it('camera component is unmounted when switching to dashboard', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('tab-dashboard'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('mock-camera-view')).not.toBeInTheDocument()
      })
    })

    it('camera component remounts when switching back to camera tab', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
      
      // Switch to dashboard
      await user.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.queryByTestId('mock-camera-view')).not.toBeInTheDocument()
      })
      
      // Switch back to camera
      await user.click(screen.getByTestId('tab-camera'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
    })

    it('handles camera error without crashing', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
      
      // Trigger error from mock
      await user.click(screen.getByText('Trigger Error'))
      
      // App should still be functional
      await waitFor(() => {
        expect(screen.getByTestId('tab-navigation')).toBeInTheDocument()
      })
    })

    it('switches to manual mode when camera unavailable', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-camera-view')).toBeInTheDocument()
      })
      
      // Click manual mode button in mock
      await user.click(screen.getByText('Use Manual Mode'))
      
      // Should switch to dashboard (manual mode enables dashboard tab)
      await waitFor(() => {
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('header and layout', () => {
    it('renders header with InsureScope branding', async () => {
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('InsureScope')).toBeInTheDocument()
      })
    })

    it('renders PolicySelector in header', async () => {
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-policy-selector')).toBeInTheDocument()
      })
    })

    it('shows compact variant of PolicySelector in header', async () => {
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mock-policy-selector')).toHaveTextContent('compact Policy Selector')
      })
    })

    it('maintains header when switching tabs', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByText('InsureScope')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('tab-dashboard'))
      await waitFor(() => {
        expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
      })
      
      expect(screen.getByText('InsureScope')).toBeInTheDocument()
    })
  })

  describe('rapid tab switching', () => {
    it('handles rapid tab switching without errors', async () => {
      const user = userEvent.setup()
      renderWithProvider(<App />)
      
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      })
      
      // Rapidly switch tabs multiple times
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByTestId('tab-dashboard'))
        await user.click(screen.getByTestId('tab-camera'))
      }

      // Should end on camera tab
      await waitFor(() => {
        expect(screen.getByTestId('tab-camera')).toHaveAttribute('data-active', 'true')
        expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'false')
      })
    })
  })
})
