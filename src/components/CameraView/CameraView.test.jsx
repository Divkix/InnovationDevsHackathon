import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CameraView } from './CameraView'
import { useAppContext } from '../../context/AppContext.jsx'
import { useObjectDetection } from '../../hooks/useObjectDetection.js'

// Mock the hooks
vi.mock('../../context/AppContext.jsx', () => ({
  useAppContext: vi.fn()
}))

vi.mock('../../hooks/useObjectDetection.js', () => ({
  useObjectDetection: vi.fn()
}))

describe('CameraView', () => {
  // Mock getUserMedia
  const mockGetUserMedia = vi.fn()
  const mockVideoStream = {
    getTracks: vi.fn(() => [
      { stop: vi.fn(), kind: 'video' }
    ])
  }
  
  // Mock requestAnimationFrame
  let rafCallbacks = []
  let rafId = 0
  const mockRequestAnimationFrame = vi.fn((callback) => {
    rafCallbacks.push(callback)
    return ++rafId
  })
  const mockCancelAnimationFrame = vi.fn((id) => {
    rafCallbacks = rafCallbacks.filter((_, index) => index !== id - 1)
  })
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset RAF mocks
    rafCallbacks = []
    rafId = 0
    global.requestAnimationFrame = mockRequestAnimationFrame
    global.cancelAnimationFrame = mockCancelAnimationFrame
    
    // Reset navigator.mediaDevices mock
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia
      }
    })
    
    // Default mock implementations
    useAppContext.mockReturnValue({
      policyType: 'renters',
      updateDetectedItems: vi.fn()
    })
    
    useObjectDetection.mockReturnValue({
      detect: vi.fn().mockResolvedValue({ detections: [] }),
      isLoaded: true,
      error: null
    })
    
    // Mock successful camera access
    mockGetUserMedia.mockResolvedValue(mockVideoStream)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loading states', () => {
    it('shows loading spinner during model initialization', () => {
      useObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: null
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('camera-loading')).toBeInTheDocument()
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
    
    it('hides loading spinner when model is loaded', async () => {
      useObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null
      })
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('camera-loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('camera permission handling', () => {
    it('shows error state when camera permission is denied', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('camera-error')).toBeInTheDocument()
      })
      
      expect(screen.getByText(/camera access denied/i)).toBeInTheDocument()
    })
    
    it('shows retry button when camera permission is denied', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })
    })
    
    it('shows use manual mode option when camera permission is denied', async () => {
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('manual-mode-button')).toBeInTheDocument()
      })
    })
    
    it('retries camera access when retry button is clicked', async () => {
      const user = userEvent.setup()
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia
        .mockRejectedValueOnce(permissionError)
        .mockResolvedValueOnce(mockVideoStream)
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('retry-button'))
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('browser compatibility', () => {
    it('shows error state when browser does not support getUserMedia', () => {
      // Remove mediaDevices to simulate unsupported browser
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: undefined
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('camera-error')).toBeInTheDocument()
      expect(screen.getByText(/browser not supported/i)).toBeInTheDocument()
    })
    
    it('shows use manual mode option for unsupported browsers', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: undefined
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('manual-mode-button')).toBeInTheDocument()
    })
  })

  describe('model loading errors', () => {
    it('shows error with retry when model fails to load', () => {
      useObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: new Error('Model loading failed')
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('camera-error')).toBeInTheDocument()
      expect(screen.getByText(/model failed to load/i)).toBeInTheDocument()
    })
    
    it('shows retry button when model fails to load', () => {
      useObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: new Error('Model loading failed')
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })
  })

  describe('camera feed display', () => {
    it('displays video feed after permission granted', async () => {
      render(<CameraView />)
      
      await waitFor(() => {
        const video = screen.getByTestId('camera-video')
        expect(video).toBeInTheDocument()
      })
    })
    
    it('requests camera with environment facing mode on mobile', async () => {
      // Mock mobile user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      })
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.objectContaining({
              facingMode: 'environment'
            })
          })
        )
      })
    })
    
    it('requests camera with user facing mode on desktop', async () => {
      // Mock desktop user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      })
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.objectContaining({
              facingMode: 'user'
            })
          })
        )
      })
    })
  })

  describe('policy type indicator', () => {
    it('displays current policy type indicator badge', () => {
      useAppContext.mockReturnValue({
        policyType: 'homeowners',
        updateDetectedItems: vi.fn()
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('policy-badge')).toBeInTheDocument()
      expect(screen.getByText(/Homeowner's Insurance/i)).toBeInTheDocument()
    })
    
    it('shows different badge for renters policy', () => {
      useAppContext.mockReturnValue({
        policyType: 'renters',
        updateDetectedItems: vi.fn()
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('policy-badge')).toBeInTheDocument()
      expect(screen.getByText(/Renter's Insurance/i)).toBeInTheDocument()
    })
    
    it('shows different badge for auto policy', () => {
      useAppContext.mockReturnValue({
        policyType: 'auto',
        updateDetectedItems: vi.fn()
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('policy-badge')).toBeInTheDocument()
      expect(screen.getByText(/auto/i)).toBeInTheDocument()
    })
    
    it('shows different badge for no insurance', () => {
      useAppContext.mockReturnValue({
        policyType: 'none',
        updateDetectedItems: vi.fn()
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('policy-badge')).toBeInTheDocument()
      expect(screen.getByText(/no insurance/i)).toBeInTheDocument()
    })
  })

  describe('canvas overlay', () => {
    it('creates canvas overlay element', async () => {
      render(<CameraView />)
      
      await waitFor(() => {
        const canvas = screen.getByTestId('coverage-overlay')
        expect(canvas).toBeInTheDocument()
      })
    })
    
    it('positions canvas absolutely over video', async () => {
      render(<CameraView />)
      
      await waitFor(() => {
        const canvas = screen.getByTestId('coverage-overlay')
        expect(canvas).toHaveClass('absolute')
      })
    })
  })

  describe('cleanup on unmount', () => {
    it('stops camera tracks when component unmounts', async () => {
      const mockTrack = { stop: vi.fn(), kind: 'video' }
      const mockStream = {
        getTracks: vi.fn(() => [mockTrack])
      }
      mockGetUserMedia.mockResolvedValue(mockStream)
      
      const { unmount } = render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('camera-video')).toBeInTheDocument()
      })
      
      unmount()
      
      expect(mockTrack.stop).toHaveBeenCalled()
    })
    
    it('cancels requestAnimationFrame on unmount', async () => {
      const { unmount } = render(<CameraView />)
      
      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled()
      })
      
      unmount()
      
      expect(mockCancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('detection loop', () => {
    it('runs detection via requestAnimationFrame', async () => {
      const mockDetect = vi.fn().mockResolvedValue({ detections: [] })
      useObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null
      })
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled()
      })
    })
    
    it('calls detect function with video element', async () => {
      const mockDetect = vi.fn().mockResolvedValue({ detections: [] })
      useObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null
      })
      
      render(<CameraView />)
      
      // Get the video element and simulate it being ready
      await waitFor(() => {
        const video = screen.getByTestId('camera-video')
        // Simulate video having data (readyState >= 2)
        Object.defineProperty(video, 'readyState', { value: 2, writable: true })
      })
      
      // Trigger the RAF callback to start detection
      await act(async () => {
        if (rafCallbacks.length > 0) {
          await rafCallbacks[rafCallbacks.length - 1](performance.now())
        }
      })
      
      await waitFor(() => {
        expect(mockDetect).toHaveBeenCalled()
      })
    })
    
    it('updates detected items in context when detections are found', async () => {
      const mockUpdateDetectedItems = vi.fn()
      useAppContext.mockReturnValue({
        policyType: 'renters',
        updateDetectedItems: mockUpdateDetectedItems
      })
      
      const mockDetections = {
        detections: [
          {
            boundingBox: { x: 10, y: 20, width: 100, height: 100 },
            categories: [{ categoryName: 'laptop', score: 0.9 }]
          }
        ]
      }
      
      const mockDetect = vi.fn().mockResolvedValue(mockDetections)
      useObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null
      })
      
      render(<CameraView />)
      
      // Get the video element and simulate it being ready
      await waitFor(() => {
        const video = screen.getByTestId('camera-video')
        Object.defineProperty(video, 'readyState', { value: 2, writable: true })
      })
      
      // Trigger the RAF callback
      await act(async () => {
        if (rafCallbacks.length > 0) {
          await rafCallbacks[rafCallbacks.length - 1](performance.now())
        }
      })
      
      await waitFor(() => {
        expect(mockUpdateDetectedItems).toHaveBeenCalled()
      })
    })
  })

  describe('error callback', () => {
    it('calls onError prop when camera error occurs', async () => {
      const onError = vi.fn()
      const permissionError = new Error('Permission denied')
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView onError={onError} />)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })
    
    it('calls onError prop when model loading fails', () => {
      const onError = vi.fn()
      useObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: new Error('Model loading failed')
      })
      
      render(<CameraView onError={onError} />)
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('mock detection mode', () => {
    let originalLocation

    beforeEach(() => {
      originalLocation = window.location
    })

    afterEach(() => {
      window.location = originalLocation
      vi.restoreAllMocks()
    })

    it('shows mock mode indicator when in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      useObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true
      })

      render(<CameraView />)

      expect(screen.getByTestId('mock-mode-indicator')).toBeInTheDocument()
      expect(screen.getByText(/Mock Mode/i)).toBeInTheDocument()
    })

    it('does not request camera when in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      useObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true
      })

      render(<CameraView />)

      // Camera should not be requested in mock mode
      expect(mockGetUserMedia).not.toHaveBeenCalled()
    })

    it('hides video element in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      useObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true
      })

      render(<CameraView />)

      // Video element should not be rendered
      expect(screen.queryByTestId('camera-video')).not.toBeInTheDocument()
    })

    it('shows mock background placeholder in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      useObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true
      })

      render(<CameraView />)

      expect(screen.getByTestId('mock-background')).toBeInTheDocument()
      expect(screen.getByText(/Mock Detection Mode/i)).toBeInTheDocument()
    })

    it('runs detection loop in mock mode', async () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      const mockDetect = vi.fn().mockResolvedValue({
        detections: [
          {
            boundingBox: { originX: 100, originY: 150, width: 280, height: 180 },
            categories: [{ categoryName: 'laptop', score: 0.92 }]
          }
        ]
      })

      useObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null,
        isMockMode: true
      })

      render(<CameraView />)

      // Wait for the RAF callback to be registered
      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled()
      })

      // Trigger the RAF callback
      await act(async () => {
        if (rafCallbacks.length > 0) {
          await rafCallbacks[rafCallbacks.length - 1](performance.now())
        }
      })

      // Detect should be called even without video in mock mode
      await waitFor(() => {
        expect(mockDetect).toHaveBeenCalled()
      })
    })

    it('renders CoverageOverlay in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      useObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true
      })

      render(<CameraView />)

      // Coverage overlay should still be rendered
      expect(screen.getByTestId('coverage-overlay')).toBeInTheDocument()
    })

    it('hides camera requesting indicator in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      useObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true
      })

      render(<CameraView />)

      // Camera requesting text should not be shown
      expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument()
    })
  })
})
