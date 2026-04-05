import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CameraView } from './CameraView'
import { useAppContext } from '../../context/AppContext'
import { useObjectDetection } from '../../hooks/useObjectDetection'
import type { CameraViewProps, Detection, DetectedItem, AppContextValue } from '../../types'
import type { UseYOLODetectionReturn } from '../../hooks/useYOLODetection'

// Mock the hooks
vi.mock('../../context/AppContext.jsx', () => ({
  useAppContext: vi.fn()
}))

vi.mock('../../hooks/useObjectDetection.js', () => ({
  useObjectDetection: vi.fn()
}))

describe('CameraView', () => {
  // Base context value for reuse across tests
  const baseContextValue: AppContextValue = {
    policyType: 'renters',
    updateDetectedItems: vi.fn(),
    onboardingComplete: false,
    activeTab: 'camera',
    detectedItems: new Map(),
    manualItems: [],
    selectedItemId: null,
    confidenceThreshold: 0.5,
    cameraPermissionDenied: false,
    manualModeEnabled: false,
    setPolicyType: vi.fn(),
    completeOnboarding: vi.fn(),
    setActiveTab: vi.fn(),
    addManualItem: vi.fn(),
    removeManualItem: vi.fn(),
    updateManualItem: vi.fn(),
    setSelectedItem: vi.fn(),
    setConfidenceThreshold: vi.fn(),
    setCameraPermissionDenied: vi.fn(),
    enableManualMode: vi.fn(),
    disableManualMode: vi.fn(),
    resetCameraPermission: vi.fn(),
  }

  // Mock getUserMedia
  const mockGetUserMedia = vi.fn() as Mock<(constraints?: MediaStreamConstraints) => Promise<MediaStream>>
  const mockVideoStream = {
    getTracks: vi.fn(() => [
      { stop: vi.fn(), kind: 'video' } as unknown as MediaStreamTrack
    ]),
    getAudioTracks: vi.fn(() => []),
    getVideoTracks: vi.fn(() => []),
    getTrackById: vi.fn(() => null),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(() => mockVideoStream),
    active: true,
    id: 'mock-stream-id',
    onaddtrack: null,
    onremovetrack: null,
    dispatchEvent: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaStream
  
  // Mock requestAnimationFrame
  let rafCallbacks: FrameRequestCallback[] = []
  let rafId = 0
  const mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
    rafCallbacks.push(callback)
    return ++rafId
  }) as Mock<(callback: FrameRequestCallback) => number>
  const mockCancelAnimationFrame = vi.fn((id: number): void => {
    rafCallbacks = rafCallbacks.filter((_, index) => index !== id - 1)
  }) as Mock<(id: number) => void>
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset RAF mocks
    rafCallbacks = []
    rafId = 0
    global.requestAnimationFrame = mockRequestAnimationFrame as unknown as typeof requestAnimationFrame
    global.cancelAnimationFrame = mockCancelAnimationFrame as unknown as typeof cancelAnimationFrame
    
    // Reset navigator.mediaDevices mock
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia
      } as unknown as MediaDevices
    })
    
    // Default mock implementations
    const mockUseAppContext = useAppContext as Mock<() => AppContextValue>
    mockUseAppContext.mockReturnValue({
      policyType: 'renters',
      updateDetectedItems: vi.fn(),
      onboardingComplete: false,
      activeTab: 'camera',
      detectedItems: new Map(),
      manualItems: [],
      selectedItemId: null,
      confidenceThreshold: 0.5,
      cameraPermissionDenied: false,
      manualModeEnabled: false,
      setPolicyType: vi.fn(),
      completeOnboarding: vi.fn(),
      setActiveTab: vi.fn(),
      addManualItem: vi.fn(),
      removeManualItem: vi.fn(),
      updateManualItem: vi.fn(),
      setSelectedItem: vi.fn(),
      setConfidenceThreshold: vi.fn(),
      setCameraPermissionDenied: vi.fn(),
      enableManualMode: vi.fn(),
      disableManualMode: vi.fn(),
      resetCameraPermission: vi.fn(),
    })
    
    const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
    mockUseObjectDetection.mockReturnValue({
      detect: vi.fn().mockResolvedValue({ detections: [] }),
      isLoaded: true,
      error: null,
      isMockMode: false,
    })
    
    // Mock successful camera access
    mockGetUserMedia.mockResolvedValue(mockVideoStream)
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loading states', () => {
    it('shows loading spinner during model initialization', () => {
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: null,
        isMockMode: false,
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('camera-loading')).toBeInTheDocument()
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
    
    it('hides loading spinner when model is loaded', async () => {
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: false,
      })
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('camera-loading')).not.toBeInTheDocument()
      })
    })
  })

  describe('camera permission handling', () => {
    it('shows error state when camera permission is denied', async () => {
      const permissionError = new Error('Permission denied') as Error & { name: string }
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('camera-error')).toBeInTheDocument()
      })
      
      expect(screen.getByText(/Camera Access Needed/i)).toBeInTheDocument()
    })
    
    it('shows retry button when camera permission is denied', async () => {
      const permissionError = new Error('Permission denied') as Error & { name: string }
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })
    })
    
    it('shows use manual mode option when camera permission is denied', async () => {
      const permissionError = new Error('Permission denied') as Error & { name: string }
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(screen.getByTestId('manual-mode-button')).toBeInTheDocument()
      })
    })
    
    it('retries camera access when retry button is clicked', async () => {
      const user = userEvent.setup()
      const permissionError = new Error('Permission denied') as Error & { name: string }
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
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: new Error('Model loading failed'),
        isMockMode: false,
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('camera-error')).toBeInTheDocument()
      expect(screen.getByText(/AI Model Failed to Load/i)).toBeInTheDocument()
    })
    
    it('shows retry button when model fails to load', () => {
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: new Error('Model loading failed'),
        isMockMode: false,
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
      const mockUseAppContext = useAppContext as Mock<() => AppContextValue>
      mockUseAppContext.mockReturnValue({
        policyType: 'homeowners',
        updateDetectedItems: vi.fn(),
        onboardingComplete: false,
        activeTab: 'camera',
        detectedItems: new Map(),
        manualItems: [],
        selectedItemId: null,
        confidenceThreshold: 0.5,
        cameraPermissionDenied: false,
        manualModeEnabled: false,
        setPolicyType: vi.fn(),
        completeOnboarding: vi.fn(),
        setActiveTab: vi.fn(),
        addManualItem: vi.fn(),
        removeManualItem: vi.fn(),
        updateManualItem: vi.fn(),
        setSelectedItem: vi.fn(),
        setConfidenceThreshold: vi.fn(),
        setCameraPermissionDenied: vi.fn(),
        enableManualMode: vi.fn(),
        disableManualMode: vi.fn(),
        resetCameraPermission: vi.fn(),
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('policy-badge')).toBeInTheDocument()
      expect(screen.getByText(/Homeowner's Insurance/i)).toBeInTheDocument()
    })
    
    it('shows different badge for renters policy', () => {
      const mockUseAppContext = useAppContext as Mock<() => AppContextValue>
      mockUseAppContext.mockReturnValue({
        policyType: 'renters',
        updateDetectedItems: vi.fn(),
        onboardingComplete: false,
        activeTab: 'camera',
        detectedItems: new Map(),
        manualItems: [],
        selectedItemId: null,
        confidenceThreshold: 0.5,
        cameraPermissionDenied: false,
        manualModeEnabled: false,
        setPolicyType: vi.fn(),
        completeOnboarding: vi.fn(),
        setActiveTab: vi.fn(),
        addManualItem: vi.fn(),
        removeManualItem: vi.fn(),
        updateManualItem: vi.fn(),
        setSelectedItem: vi.fn(),
        setConfidenceThreshold: vi.fn(),
        setCameraPermissionDenied: vi.fn(),
        enableManualMode: vi.fn(),
        disableManualMode: vi.fn(),
        resetCameraPermission: vi.fn(),
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('policy-badge')).toBeInTheDocument()
      expect(screen.getByText(/Renter's Insurance/i)).toBeInTheDocument()
    })
    
    it('shows different badge for auto policy', () => {
      const mockUseAppContext = useAppContext as Mock<() => AppContextValue>
      mockUseAppContext.mockReturnValue({
        policyType: 'auto',
        updateDetectedItems: vi.fn(),
        onboardingComplete: false,
        activeTab: 'camera',
        detectedItems: new Map(),
        manualItems: [],
        selectedItemId: null,
        confidenceThreshold: 0.5,
        cameraPermissionDenied: false,
        manualModeEnabled: false,
        setPolicyType: vi.fn(),
        completeOnboarding: vi.fn(),
        setActiveTab: vi.fn(),
        addManualItem: vi.fn(),
        removeManualItem: vi.fn(),
        updateManualItem: vi.fn(),
        setSelectedItem: vi.fn(),
        setConfidenceThreshold: vi.fn(),
        setCameraPermissionDenied: vi.fn(),
        enableManualMode: vi.fn(),
        disableManualMode: vi.fn(),
        resetCameraPermission: vi.fn(),
      })
      
      render(<CameraView />)
      
      expect(screen.getByTestId('policy-badge')).toBeInTheDocument()
      expect(screen.getByText(/auto/i)).toBeInTheDocument()
    })
    
    it('shows different badge for no insurance', () => {
      const mockUseAppContext = useAppContext as Mock<() => AppContextValue>
      mockUseAppContext.mockReturnValue({
        policyType: 'none',
        updateDetectedItems: vi.fn(),
        onboardingComplete: false,
        activeTab: 'camera',
        detectedItems: new Map(),
        manualItems: [],
        selectedItemId: null,
        confidenceThreshold: 0.5,
        cameraPermissionDenied: false,
        manualModeEnabled: false,
        setPolicyType: vi.fn(),
        completeOnboarding: vi.fn(),
        setActiveTab: vi.fn(),
        addManualItem: vi.fn(),
        removeManualItem: vi.fn(),
        updateManualItem: vi.fn(),
        setSelectedItem: vi.fn(),
        setConfidenceThreshold: vi.fn(),
        setCameraPermissionDenied: vi.fn(),
        enableManualMode: vi.fn(),
        disableManualMode: vi.fn(),
        resetCameraPermission: vi.fn(),
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
      const mockTrack: MediaStreamTrack = { 
        stop: vi.fn(), 
        kind: 'video',
        id: 'mock-track-id',
        label: 'mock-video',
        enabled: true,
        muted: false,
        readyState: 'live',
        contentHint: '',
        onended: null,
        onmute: null,
        onunmute: null,
        getCapabilities: vi.fn(() => ({} as MediaTrackCapabilities)),
        getConstraints: vi.fn(() => ({} as MediaTrackConstraints)),
        getSettings: vi.fn(() => ({} as MediaTrackSettings)),
        applyConstraints: vi.fn().mockResolvedValue(undefined),
        clone: vi.fn(() => mockTrack),
        dispatchEvent: vi.fn(() => true),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaStreamTrack
      
      const mockStream: MediaStream = {
        getTracks: vi.fn(() => [mockTrack]),
        getAudioTracks: vi.fn(() => []),
        getVideoTracks: vi.fn(() => [mockTrack]),
        getTrackById: vi.fn(() => mockTrack),
        addTrack: vi.fn(),
        removeTrack: vi.fn(),
        clone: vi.fn(() => mockStream),
        active: true,
        id: 'mock-stream-id',
        onaddtrack: null,
        onremovetrack: null,
        dispatchEvent: vi.fn(() => true),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaStream
      
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
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null,
        isMockMode: false,
      })
      
      render(<CameraView />)
      
      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled()
      })
    })

    it('passes a real detected-items map into context when detections are found', async () => {
      const mockUpdateDetectedItems = vi.fn()
      
      const mockUseAppContext = useAppContext as Mock<() => AppContextValue>
      mockUseAppContext.mockReturnValue({
        ...baseContextValue,
        updateDetectedItems: mockUpdateDetectedItems,
      })

      const mockDetections: { detections: Detection[] } = {
        detections: [
          {
            boundingBox: { originX: 10, originY: 20, width: 100, height: 100 },
            categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
          },
        ],
      }

      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue(mockDetections),
        isLoaded: true,
        error: null,
        isMockMode: false,
      })

      render(<CameraView />)

      await waitFor(() => {
        const video = screen.getByTestId('camera-video')
        Object.defineProperty(video, 'readyState', { value: 2, writable: true })
      })

      await act(async () => {
        await rafCallbacks[rafCallbacks.length - 1](performance.now())
      })

      await waitFor(() => {
        expect(mockUpdateDetectedItems).toHaveBeenCalledWith(expect.any(Map))
      })

      expect(mockUpdateDetectedItems).toHaveBeenCalledTimes(1)

      const payload = mockUpdateDetectedItems.mock.calls[0]?.[0] as Map<string, DetectedItem>
      expect(payload).toBeInstanceOf(Map)
      expect(payload.get('detection-0')).toMatchObject({
        id: 'detection-0',
        category: 'laptop',
        confidence: 0.9,
      })
      
      // Verify full type compliance - regression test
      const item = payload.get('detection-0')
      expect(item).toHaveProperty('confidence')
      expect(item).toHaveProperty('categories')
      expect(item).not.toHaveProperty('name')
      expect(item).not.toHaveProperty('score')
    })
    
    it('calls detect function with video element', async () => {
      const mockDetect = vi.fn().mockResolvedValue({ detections: [] })
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null,
        isMockMode: false,
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
      const mockUseAppContext = useAppContext as Mock<() => AppContextValue>
      mockUseAppContext.mockReturnValue({
        policyType: 'renters',
        updateDetectedItems: mockUpdateDetectedItems,
        onboardingComplete: false,
        activeTab: 'camera',
        detectedItems: new Map(),
        manualItems: [],
        selectedItemId: null,
        confidenceThreshold: 0.5,
        cameraPermissionDenied: false,
        manualModeEnabled: false,
        setPolicyType: vi.fn(),
        completeOnboarding: vi.fn(),
        setActiveTab: vi.fn(),
        addManualItem: vi.fn(),
        removeManualItem: vi.fn(),
        updateManualItem: vi.fn(),
        setSelectedItem: vi.fn(),
        setConfidenceThreshold: vi.fn(),
        setCameraPermissionDenied: vi.fn(),
        enableManualMode: vi.fn(),
        disableManualMode: vi.fn(),
        resetCameraPermission: vi.fn(),
      })
      
      const mockDetections: { detections: Detection[] } = {
        detections: [
          {
            boundingBox: { originX: 10, originY: 20, width: 100, height: 100 },
            categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }]
          }
        ]
      }
      
      const mockDetect = vi.fn().mockResolvedValue(mockDetections)
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null,
        isMockMode: false,
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
      const permissionError = new Error('Permission denied') as Error & { name: string }
      permissionError.name = 'NotAllowedError'
      mockGetUserMedia.mockRejectedValue(permissionError)
      
      render(<CameraView onError={onError} />)
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })
    
    it('calls onError prop when model loading fails', () => {
      const onError = vi.fn()
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn(),
        isLoaded: false,
        error: new Error('Model loading failed'),
        isMockMode: false,
      })
      
      render(<CameraView onError={onError} />)
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('mock detection mode', () => {
    let originalHref: string

    beforeEach(() => {
      originalHref = window.location.href
    })

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: originalHref },
      })
      vi.restoreAllMocks()
    })

    it('shows mock mode indicator when in mock mode', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: 'http://localhost:5173?mock=true' },
      })

      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true,
      })

      render(<CameraView />)

      expect(screen.getByTestId('mock-mode-indicator')).toBeInTheDocument()
      expect(screen.getByText(/Mock Mode/i)).toBeInTheDocument()
    })

    it('does not request camera when in mock mode', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: 'http://localhost:5173?mock=true' },
      })

      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true,
      })

      render(<CameraView />)

      // Camera should not be requested in mock mode
      expect(mockGetUserMedia).not.toHaveBeenCalled()
    })

    it('hides video element in mock mode', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: 'http://localhost:5173?mock=true' },
      })

      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true,
      })

      render(<CameraView />)

      // Video element should not be rendered
      expect(screen.queryByTestId('camera-video')).not.toBeInTheDocument()
    })

    it('shows mock background placeholder in mock mode', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: 'http://localhost:5173?mock=true' },
      })

      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true,
      })

      render(<CameraView />)

      expect(screen.getByTestId('mock-background')).toBeInTheDocument()
      expect(screen.getByText(/Mock Detection Mode/i)).toBeInTheDocument()
    })

    it('runs detection loop in mock mode', async () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: 'http://localhost:5173?mock=true' },
      })

      const mockDetections: { detections: Detection[] } = {
        detections: [
          {
            boundingBox: { originX: 100, originY: 150, width: 280, height: 180 },
            categories: [{ categoryName: 'laptop', score: 0.92, displayName: 'Laptop' }]
          }
        ]
      }

      const mockDetect = vi.fn().mockResolvedValue(mockDetections)
      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: mockDetect,
        isLoaded: true,
        error: null,
        isMockMode: true,
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
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: 'http://localhost:5173?mock=true' },
      })

      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true,
      })

      render(<CameraView />)

      // Coverage overlay should still be rendered
      expect(screen.getByTestId('coverage-overlay')).toBeInTheDocument()
    })

    it('hides camera requesting indicator in mock mode', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, href: 'http://localhost:5173?mock=true' },
      })

      const mockUseObjectDetection = useObjectDetection as Mock<() => UseYOLODetectionReturn>
      mockUseObjectDetection.mockReturnValue({
        detect: vi.fn().mockResolvedValue({ detections: [] }),
        isLoaded: true,
        error: null,
        isMockMode: true,
      })

      render(<CameraView />)

      // Camera requesting text should not be shown
      expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument()
    })
  })
})
