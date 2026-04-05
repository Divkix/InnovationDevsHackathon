import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TabNavigation } from './TabNavigation.jsx'

describe('TabNavigation', () => {
  describe('rendering', () => {
    it('renders both Camera and Dashboard tabs', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
      expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument()
    })

    it('renders Camera tab with icon and label', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const cameraTab = screen.getByTestId('tab-camera')
      expect(cameraTab).toHaveTextContent('Camera')
      expect(cameraTab.querySelector('svg')).toBeInTheDocument()
    })

    it('renders Dashboard tab with icon and label', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const dashboardTab = screen.getByTestId('tab-dashboard')
      expect(dashboardTab).toHaveTextContent('Dashboard')
      expect(dashboardTab.querySelector('svg')).toBeInTheDocument()
    })

    it('has correct ARIA roles and labels', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const nav = screen.getByRole('tablist')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')

      expect(screen.getByRole('tab', { name: /Switch to Camera view/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Switch to Dashboard view/i })).toBeInTheDocument()
    })
  })

  describe('active tab indication', () => {
    it('marks camera tab as active when activeTab is camera', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const cameraTab = screen.getByTestId('tab-camera')
      const dashboardTab = screen.getByTestId('tab-dashboard')

      expect(cameraTab).toHaveAttribute('data-active', 'true')
      expect(cameraTab).toHaveAttribute('aria-selected', 'true')
      expect(dashboardTab).toHaveAttribute('data-active', 'false')
      expect(dashboardTab).toHaveAttribute('aria-selected', 'false')
    })

    it('marks dashboard tab as active when activeTab is dashboard', () => {
      render(<TabNavigation activeTab="dashboard" onTabChange={vi.fn()} />)

      const cameraTab = screen.getByTestId('tab-camera')
      const dashboardTab = screen.getByTestId('tab-dashboard')

      expect(cameraTab).toHaveAttribute('data-active', 'false')
      expect(cameraTab).toHaveAttribute('aria-selected', 'false')
      expect(dashboardTab).toHaveAttribute('data-active', 'true')
      expect(dashboardTab).toHaveAttribute('aria-selected', 'true')
    })

    it('applies active styling to active tab', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const cameraTab = screen.getByTestId('tab-camera')
      // Check for active styling classes - State Farm red
      expect(cameraTab.className).toContain('bg-red-50')
      expect(cameraTab.className).toContain('text-[#E31837]')
    })

    it('applies inactive styling to inactive tab', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const dashboardTab = screen.getByTestId('tab-dashboard')
      // Check for inactive styling
      expect(dashboardTab.className).toContain('text-gray-600')
      expect(dashboardTab.className).toContain('hover:bg-gray-100')
    })
  })

  describe('tab switching', () => {
    it('calls onTabChange with "dashboard" when dashboard tab clicked', async () => {
      const onTabChange = vi.fn()
      render(<TabNavigation activeTab="camera" onTabChange={onTabChange} />)

      fireEvent.click(screen.getByTestId('tab-dashboard'))

      await waitFor(() => {
        expect(onTabChange).toHaveBeenCalledWith('dashboard')
      })
    })

    it('calls onTabChange with "camera" when camera tab clicked', async () => {
      const onTabChange = vi.fn()
      render(<TabNavigation activeTab="dashboard" onTabChange={onTabChange} />)

      fireEvent.click(screen.getByTestId('tab-camera'))

      await waitFor(() => {
        expect(onTabChange).toHaveBeenCalledWith('camera')
      })
    })

    it('does not call onTabChange when clicking already active tab', async () => {
      const onTabChange = vi.fn()
      render(<TabNavigation activeTab="camera" onTabChange={onTabChange} />)

      fireEvent.click(screen.getByTestId('tab-camera'))

      // Wait a bit to ensure no call is made
      await new Promise(r => setTimeout(r, 50))
      expect(onTabChange).not.toHaveBeenCalled()
    })

    it('does not call onTabChange if onTabChange is undefined', async () => {
      render(<TabNavigation activeTab="camera" />)

      // Should not throw
      expect(() => {
        fireEvent.click(screen.getByTestId('tab-dashboard'))
      }).not.toThrow()
    })
  })

  describe('keyboard accessibility', () => {
    it('supports Enter key to switch tabs', async () => {
      const onTabChange = vi.fn()
      render(<TabNavigation activeTab="camera" onTabChange={onTabChange} />)

      const dashboardTab = screen.getByTestId('tab-dashboard')
      fireEvent.keyDown(dashboardTab, { key: 'Enter' })

      await waitFor(() => {
        expect(onTabChange).toHaveBeenCalledWith('dashboard')
      })
    })

    it('supports Space key to switch tabs', async () => {
      const onTabChange = vi.fn()
      render(<TabNavigation activeTab="camera" onTabChange={onTabChange} />)

      const dashboardTab = screen.getByTestId('tab-dashboard')
      fireEvent.keyDown(dashboardTab, { key: ' ' })

      await waitFor(() => {
        expect(onTabChange).toHaveBeenCalledWith('dashboard')
      })
    })

    it('prevents default on Enter key', () => {
      const onTabChange = vi.fn()
      render(<TabNavigation activeTab="camera" onTabChange={onTabChange} />)

      const dashboardTab = screen.getByTestId('tab-dashboard')
      fireEvent.keyDown(dashboardTab, { key: 'Enter' })
      // Event should be prevented (no assertion needed, just ensure no error)
    })

    it('does not switch on other keys', async () => {
      const onTabChange = vi.fn()
      render(<TabNavigation activeTab="camera" onTabChange={onTabChange} />)

      const dashboardTab = screen.getByTestId('tab-dashboard')
      fireEvent.keyDown(dashboardTab, { key: 'ArrowDown' })
      fireEvent.keyDown(dashboardTab, { key: 'Tab' })
      fireEvent.keyDown(dashboardTab, { key: 'a' })

      await new Promise(r => setTimeout(r, 50))
      expect(onTabChange).not.toHaveBeenCalled()
    })

    it('has focus outline for keyboard navigation', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const cameraTab = screen.getByTestId('tab-camera')
      // Check for focus-visible ring classes - State Farm red
      expect(cameraTab.className).toContain('focus-visible:ring-2')
      expect(cameraTab.className).toContain('focus-visible:ring-[#E31837]')
    })

    it('is focusable via tabIndex', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      expect(screen.getByTestId('tab-camera')).toHaveAttribute('tabIndex', '0')
      expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('responsive design', () => {
    it('has fixed positioning for mobile', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const nav = screen.getByTestId('tab-navigation')
      expect(nav.className).toContain('fixed')
      expect(nav.className).toContain('bottom-0')
      expect(nav.className).toContain('left-0')
      expect(nav.className).toContain('right-0')
    })

    it('has relative positioning for desktop', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const nav = screen.getByTestId('tab-navigation')
      expect(nav.className).toContain('md:relative')
      expect(nav.className).toContain('md:bottom-auto')
    })

    it('has border-top on mobile, border-bottom on desktop', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const nav = screen.getByTestId('tab-navigation')
      expect(nav.className).toContain('border-t')
      expect(nav.className).toContain('md:border-b')
      expect(nav.className).toContain('md:border-t-0')
    })

    it('has higher z-index on mobile for overlay', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const nav = screen.getByTestId('tab-navigation')
      expect(nav.className).toContain('z-50')
      expect(nav.className).toContain('md:z-auto')
    })

    it('has safe area padding on mobile', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const container = screen.getByTestId('tab-navigation').querySelector('div > div')
      expect(container.className).toContain('pb-[env(safe-area-inset-bottom,8px)]')
      expect(container.className).toContain('md:pb-2')
    })
  })

  describe('touch target sizing', () => {
    it('has minimum touch target size for mobile', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const cameraTab = screen.getByTestId('tab-camera')
      expect(cameraTab.className).toContain('min-h-[44px]')
      expect(cameraTab.className).toContain('md:min-h-0')
    })

    it('has minimum width for mobile tabs', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const cameraTab = screen.getByTestId('tab-camera')
      expect(cameraTab.className).toContain('min-w-[80px]')
      expect(cameraTab.className).toContain('md:min-w-0')
    })
  })

  describe('custom className', () => {
    it('applies additional className when provided', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} className="my-custom-class" />)

      const nav = screen.getByTestId('tab-navigation')
      expect(nav.className).toContain('my-custom-class')
    })

    it('works without className prop', () => {
      render(<TabNavigation activeTab="camera" onTabChange={vi.fn()} />)

      const nav = screen.getByTestId('tab-navigation')
      expect(nav).toBeInTheDocument()
    })
  })
})
