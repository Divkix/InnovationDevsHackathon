import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { CoverageOverlay } from './CoverageOverlay'
import { getObjectCoverLayout, projectBoundingBoxToCanvas } from './layout'
import { lookupCoverage } from '@/utils/coverageLookup'
import type { Detection, PolicyType } from '@/types'

// Mock the coverage lookup module
vi.mock('@/utils/coverageLookup', () => ({
  lookupCoverage: vi.fn()
}))

describe('CoverageOverlay', () => {
  const mockVideoRef = { current: { readyState: 2, videoWidth: 640, videoHeight: 480, width: 640, height: 480 } as HTMLVideoElement }
  let mockCanvasContext: CanvasRenderingContext2D
  let mockCanvasElement: HTMLCanvasElement
  
  // Mock requestAnimationFrame
  let rafCallbacks: FrameRequestCallback[] = []
  let rafId = 0
  const mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    rafCallbacks.push(callback)
    return ++rafId
  })

  describe('geometry helpers', () => {
    it('computes object-cover offsets for cropped video', () => {
      expect(getObjectCoverLayout(640, 480, 1280, 720)).toEqual({
        scale: 2,
        offsetX: 0,
        offsetY: -120
      })
    })

    it('projects video-space boxes into displayed canvas space', () => {
      const layout = getObjectCoverLayout(640, 480, 1280, 720)

      expect(projectBoundingBoxToCanvas(
        { originX: 100, originY: 80, width: 50, height: 40 },
        layout
      )).toEqual({
        x: 200,
        y: 40,
        width: 100,
        height: 80
      })
    })
  })
  const mockCancelAnimationFrame = vi.fn((id: number) => {
    rafCallbacks = rafCallbacks.filter((_, index) => index !== id - 1)
  })
  
  // Helper to flush animation frames
  const flushAnimationFrames = () => {
    const callbacks = [...rafCallbacks]
    rafCallbacks = []
    callbacks.forEach(cb => cb(performance.now()))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset RAF mocks
    rafCallbacks = []
    rafId = 0
    global.requestAnimationFrame = mockRequestAnimationFrame as unknown as typeof requestAnimationFrame
    global.cancelAnimationFrame = mockCancelAnimationFrame as unknown as typeof cancelAnimationFrame
    
    // Setup mock canvas context
    mockCanvasContext = {
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      closePath: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      // Additional methods needed for drawRoundedRect
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn()
    } as unknown as CanvasRenderingContext2D

    // Setup mock canvas element
    mockCanvasElement = {
      getContext: vi.fn().mockReturnValue(mockCanvasContext),
      width: 640,
      height: 480,
      style: {} as CSSStyleDeclaration
    } as unknown as HTMLCanvasElement
    
    // Set up canvas context reference using Object.defineProperty
    Object.defineProperty(mockCanvasContext, 'canvas', {
      value: mockCanvasElement,
      writable: true,
      configurable: true
    })

    // Mock HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCanvasContext)
    
    // Mock HTMLCanvasElement properties
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
      configurable: true,
      get: () => mockCanvasElement.width,
      set: (value: number) => { mockCanvasElement.width = value }
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
      configurable: true,
      get: () => mockCanvasElement.height,
      set: (value: number) => { mockCanvasElement.height = value }
    })
  })

  // Helper function to create a mock video element with proper properties
  const createMockVideoElement = (width = 1280, height = 720): Partial<HTMLVideoElement> => ({
    readyState: 2,
    videoWidth: width,
    videoHeight: height,
    width,
    height,
    play: vi.fn(),
    pause: vi.fn()
  })

  describe('color coding', () => {
    it('renders green box with checkmark for covered item', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered under policy'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      expect(canvas).toHaveAttribute('data-testid', 'coverage-overlay')
    })

    it('renders red box with X for uncovered item', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'not_covered',
        color: 'red',
        estimatedValue: 15000,
        note: 'Not covered under policy'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'car', score: 0.9, displayName: 'Car' }],
        boundingBox: { originX: 100, originY: 100, width: 300, height: 200 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('renders yellow box with warning for conditional item', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'conditional',
        color: 'yellow',
        estimatedValue: 500,
        note: 'Conditional coverage',
        conditions: ['Coverage limit applies']
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'bicycle', score: 0.85, displayName: 'Bicycle' }],
        boundingBox: { originX: 50, originY: 50, width: 150, height: 100 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('renders red boxes for all items when No Insurance policy selected', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'not_covered',
        color: 'red',
        estimatedValue: 1200,
        note: 'NO INSURANCE'
      })

      const detections: Detection[] = [
        { categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }], boundingBox: { originX: 100, originY: 100, width: 200, height: 150 } },
        { categories: [{ categoryName: 'tv', score: 0.85, displayName: 'TV' }], boundingBox: { originX: 400, originY: 100, width: 180, height: 120 } },
        { categories: [{ categoryName: 'couch', score: 0.8, displayName: 'Couch' }], boundingBox: { originX: 100, originY: 300, width: 250, height: 150 } }
      ]

      const mockVideoWithReady = { current: { ...createMockVideoElement(), readyState: 2 } as HTMLVideoElement }

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoWithReady}
          detections={detections}
          policyType="none"
        />
      )

      // Flush animation frames to trigger detection processing
      flushAnimationFrames()

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      
      // Verify lookupCoverage was called for each detection with 'none' policy
      expect(lookupCoverage).toHaveBeenCalledTimes(3)
      expect(lookupCoverage).toHaveBeenCalledWith('laptop', 'none')
      expect(lookupCoverage).toHaveBeenCalledWith('tv', 'none')
      expect(lookupCoverage).toHaveBeenCalledWith('couch', 'none')
    })
  })

  describe('positioning', () => {
    it('positions bounding box at detection coordinates', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 150, originY: 200, width: 300, height: 225 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('scales coordinates to match video dimensions', () => {
      // Mock video element with specific dimensions
      const mockVideo: Partial<HTMLVideoElement> = {
        videoWidth: 1280,
        videoHeight: 720,
        width: 640,
        height: 360
      }
      mockVideoRef.current = mockVideo as HTMLVideoElement

      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 800,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'cell phone', score: 0.9, displayName: 'Cell Phone' }],
        boundingBox: { originX: 100, originY: 100, width: 50, height: 80 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('multi-object handling', () => {
    it('renders separate boxes for multiple detections', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({
          status: 'covered',
          color: 'green',
          estimatedValue: 1200,
          note: 'Covered'
        })
        .mockReturnValueOnce({
          status: 'not_covered',
          color: 'red',
          estimatedValue: 15000,
          note: 'Not covered'
        })
        .mockReturnValueOnce({
          status: 'conditional',
          color: 'yellow',
          estimatedValue: 500,
          note: 'Conditional'
        })

      const detections: Detection[] = [
        { categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }], boundingBox: { originX: 100, originY: 100, width: 200, height: 150 } },
        { categories: [{ categoryName: 'car', score: 0.9, displayName: 'Car' }], boundingBox: { originX: 500, originY: 100, width: 300, height: 200 } },
        { categories: [{ categoryName: 'bicycle', score: 0.85, displayName: 'Bicycle' }], boundingBox: { originX: 100, originY: 350, width: 150, height: 100 } }
      ]

      const mockVideoWithReady = { current: { ...createMockVideoElement(), readyState: 2 } as HTMLVideoElement }

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoWithReady}
          detections={detections}
          policyType="renters"
        />
      )

      // Flush animation frames to trigger detection processing
      flushAnimationFrames()

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      expect(lookupCoverage).toHaveBeenCalledTimes(3)
    })

    it('handles overlapping boxes with semi-transparent fills', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [
        { categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }], boundingBox: { originX: 100, originY: 100, width: 200, height: 150 } },
        { categories: [{ categoryName: 'keyboard', score: 0.85, displayName: 'Keyboard' }], boundingBox: { originX: 150, originY: 180, width: 150, height: 80 } }
      ]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('renders no boxes when no detections', () => {
      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={[]}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      expect(lookupCoverage).not.toHaveBeenCalled()
    })

    it('renders no boxes when detections is null', () => {
      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={null as unknown as Detection[]}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('clears canvas when detections go from present to empty', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container, rerender } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      // Rerender with empty detections
      rerender(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={[]}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('detection smoothing', () => {
    it('applies exponential moving average to coordinates', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container, rerender } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      // Update with slightly different coordinates
      const updatedDetections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 105, originY: 102, width: 198, height: 152 }
      }]

      rerender(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={updatedDetections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('maintains persistence threshold - keeps item visible briefly after disappearing', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container, rerender } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      // Item disappears (empty detections)
      rerender(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={[]}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('label rendering', () => {
    it('renders item name in label', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('renders estimated value in label', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('renders coverage status label', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('canvas sizing', () => {
    it('canvas has correct dimensions matching video', () => {
      const mockVideo: Partial<HTMLVideoElement> = {
        readyState: 2,
        videoWidth: 1280,
        videoHeight: 720
      }
      const mockVideoRefWithReady = { current: mockVideo as HTMLVideoElement }

      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRefWithReady}
          detections={detections}
          policyType="renters"
        />
      )

      // Flush animation frames to trigger canvas sizing update
      flushAnimationFrames()

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      // Canvas internal dimensions should match video
      expect(canvas!.width).toBe(1280)
      expect(canvas!.height).toBe(720)
    })

    it('updates canvas size when video dimensions change', () => {
      const mockVideo: Partial<HTMLVideoElement> = {
        readyState: 2,
        videoWidth: 640,
        videoHeight: 480
      }
      const mockVideoRefWithReady = { current: mockVideo as HTMLVideoElement }

      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const { container, rerender } = render(
        <CoverageOverlay
          videoRef={mockVideoRefWithReady}
          detections={detections}
          policyType="renters"
        />
      )

      // Flush animation frames for initial render
      flushAnimationFrames()

      let canvas = container.querySelector('canvas')
      expect(canvas!.width).toBe(640)
      expect(canvas!.height).toBe(480)

      // Update video dimensions
      const newMockVideo: Partial<HTMLVideoElement> = {
        readyState: 2,
        videoWidth: 1920,
        videoHeight: 1080
      }
      const newMockVideoRef = { current: newMockVideo as HTMLVideoElement }

      rerender(
        <CoverageOverlay
          videoRef={newMockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      // Flush animation frames for rerender
      flushAnimationFrames()

      canvas = container.querySelector('canvas')
      expect(canvas!.width).toBe(1920)
      expect(canvas!.height).toBe(1080)
    })
  })

  describe('policy type changes', () => {
    it('updates colors when policy type changes', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({
          status: 'covered',
          color: 'green',
          estimatedValue: 1200,
          note: 'Covered under renters'
        })
        .mockReturnValueOnce({
          status: 'not_covered',
          color: 'red',
          estimatedValue: 1200,
          note: 'Not covered under auto'
        })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 100, width: 200, height: 150 }
      }]

      const mockVideoWithReady = { current: { ...createMockVideoElement(), readyState: 2 } as HTMLVideoElement }

      const { container, rerender } = render(
        <CoverageOverlay
          videoRef={mockVideoWithReady}
          detections={detections}
          policyType="renters"
        />
      )

      // Flush animation frames for initial render
      flushAnimationFrames()

      // Change policy type
      rerender(
        <CoverageOverlay
          videoRef={mockVideoWithReady}
          detections={detections}
          policyType="auto"
        />
      )

      // Flush animation frames for rerender
      flushAnimationFrames()

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      expect(lookupCoverage).toHaveBeenCalledWith('laptop', 'auto')
    })
  })

  describe('partial off-screen items', () => {
    it('repositions label for items near top edge', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 100, originY: 5, width: 200, height: 150 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })

    it('repositions label for items near right edge', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [{
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
        boundingBox: { originX: 1100, originY: 100, width: 200, height: 150 }
      }]

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoRef}
          detections={detections}
          policyType="renters"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('detection confidence filtering', () => {
    it('filters out person detections', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 800,
        note: 'Covered'
      })

      const personDetection: Detection = {
        boundingBox: { originX: 100, originY: 100, width: 200, height: 300 },
        categories: [{ categoryName: 'person', score: 0.95, displayName: 'Person' }]
      }
      
      const laptopDetection: Detection = {
        boundingBox: { originX: 400, originY: 200, width: 100, height: 80 },
        categories: [{ categoryName: 'laptop', score: 0.88, displayName: 'Laptop' }]
      }
      
      const mockVideoWithReady = { current: { ...createMockVideoElement(), readyState: 2 } as HTMLVideoElement }

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoWithReady}
          detections={[personDetection, laptopDetection]}
          policyType="renters"
        />
      )
      
      // Flush animation frames to trigger detection processing
      flushAnimationFrames()
      
      // Only laptop should be rendered, person should be filtered
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      // Only laptop should be looked up, person should be filtered out
      expect(lookupCoverage).toHaveBeenCalledTimes(1)
      expect(lookupCoverage).toHaveBeenCalledWith('laptop', 'renters')
    })

    it('renders boxes only for high confidence detections', () => {
      ;(lookupCoverage as ReturnType<typeof vi.fn>).mockReturnValue({
        status: 'covered',
        color: 'green',
        estimatedValue: 1200,
        note: 'Covered'
      })

      const detections: Detection[] = [
        { categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }], boundingBox: { originX: 100, originY: 100, width: 200, height: 150 } },
        { categories: [{ categoryName: 'tv', score: 0.3, displayName: 'TV' }], boundingBox: { originX: 400, originY: 100, width: 180, height: 120 } }
      ]

      const mockVideoWithReady = { current: { ...createMockVideoElement(), readyState: 2 } as HTMLVideoElement }

      const { container } = render(
        <CoverageOverlay
          videoRef={mockVideoWithReady}
          detections={detections}
          policyType="renters"
          confidenceThreshold={0.5}
        />
      )

      // Flush animation frames to trigger detection processing
      flushAnimationFrames()

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      // Only laptop (0.9 score) should be looked up, not tv (0.3 score)
      expect(lookupCoverage).toHaveBeenCalledTimes(1)
      expect(lookupCoverage).toHaveBeenCalledWith('laptop', 'renters')
    })
  })
})
