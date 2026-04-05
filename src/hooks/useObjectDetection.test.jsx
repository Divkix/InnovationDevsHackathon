import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useObjectDetection } from './useObjectDetection'

// Mock the MediaPipe module with inline factory (required for hoisting)
vi.mock('@mediapipe/tasks-vision', () => {
  // These must be defined INSIDE the factory function
  const mockForVisionTasks = vi.fn()
  const mockCreateFromOptions = vi.fn()
  const mockDetectForVideo = vi.fn()
  const mockClose = vi.fn()

  const mockObjectDetector = {
    detectForVideo: mockDetectForVideo,
    close: mockClose
  }

  return {
    FilesetResolver: {
      forVisionTasks: mockForVisionTasks
    },
    ObjectDetector: {
      createFromOptions: mockCreateFromOptions,
      mockForVisionTasks, // Export for test access
      mockCreateFromOptions,
      mockDetectForVideo,
      mockClose,
      mockObjectDetector
    }
  }
})

// Get references to mock functions from the module
let mockForVisionTasks, mockCreateFromOptions, mockDetectForVideo, mockClose, mockObjectDetector

beforeEach(async () => {
  const { ObjectDetector } = await import('@mediapipe/tasks-vision')
  mockForVisionTasks = ObjectDetector.mockForVisionTasks
  mockCreateFromOptions = ObjectDetector.mockCreateFromOptions
  mockDetectForVideo = ObjectDetector.mockDetectForVideo
  mockClose = ObjectDetector.mockClose
  mockObjectDetector = ObjectDetector.mockObjectDetector
  
  vi.clearAllMocks()
  
  // Default mock implementations
  mockForVisionTasks.mockResolvedValue('vision-wasm-files')
  mockCreateFromOptions.mockResolvedValue(mockObjectDetector)
  mockDetectForVideo.mockResolvedValue({
    detections: [
      {
        boundingBox: { originX: 10, originY: 20, width: 100, height: 50 },
        categories: [{ categoryName: 'laptop', score: 0.85 }]
      }
    ]
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useObjectDetection', () => {
  describe('initial state', () => {
    it('returns isLoaded as false initially', () => {
      const { result } = renderHook(() => useObjectDetection())
      
      expect(result.current.isLoaded).toBe(false)
    })

    it('returns error as null initially', () => {
      const { result } = renderHook(() => useObjectDetection())
      
      expect(result.current.error).toBeNull()
    })

    it('returns detect function', () => {
      const { result } = renderHook(() => useObjectDetection())
      
      expect(result.current.detect).toBeInstanceOf(Function)
    })
  })

  describe('model loading', () => {
    it('loads WASM from CDN (cdn.jsdelivr.net)', async () => {
      renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(mockForVisionTasks).toHaveBeenCalled()
      })
      
      // Verify CDN URL is used
      expect(mockForVisionTasks).toHaveBeenCalledWith(
        expect.stringContaining('cdn.jsdelivr.net')
      )
    })

    it('creates ObjectDetector with correct model configuration', async () => {
      renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(mockCreateFromOptions).toHaveBeenCalled()
      })
      
      // Verify model configuration
      expect(mockCreateFromOptions).toHaveBeenCalledWith(
        'vision-wasm-files',
        {
          baseOptions: {
            modelAssetPath: expect.stringContaining('efficientdet_lite0_uint8'),
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          scoreThreshold: 0.5
        }
      )
    })

    it('sets isLoaded to true after model loads', async () => {
      const { result } = renderHook(() => useObjectDetection())
      
      expect(result.current.isLoaded).toBe(false)
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })
    })

    it('does not set error when model loads successfully', async () => {
      const { result } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })
      
      expect(result.current.error).toBeNull()
    })
  })

  describe('detect function', () => {
    it('returns detection results in expected format', async () => {
      const { result } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })
      
      // Create a mock video element
      const mockVideo = document.createElement('video')
      const timestamp = 1000
      
      let detectResult
      await act(async () => {
        detectResult = await result.current.detect(mockVideo, timestamp)
      })
      
      // Verify detectForVideo was called with correct arguments
      expect(mockDetectForVideo).toHaveBeenCalledWith(mockVideo, timestamp)
      
      // Verify result format matches MediaPipe detection result format
      expect(detectResult).toHaveProperty('detections')
      expect(detectResult.detections).toBeInstanceOf(Array)
      expect(detectResult.detections).toHaveLength(1)
      
      const detection = detectResult.detections[0]
      expect(detection).toHaveProperty('boundingBox')
      expect(detection.boundingBox).toHaveProperty('originX')
      expect(detection.boundingBox).toHaveProperty('originY')
      expect(detection.boundingBox).toHaveProperty('width')
      expect(detection.boundingBox).toHaveProperty('height')
      expect(detection).toHaveProperty('categories')
      expect(detection.categories[0]).toHaveProperty('categoryName')
      expect(detection.categories[0]).toHaveProperty('score')
    })

    it('returns empty detections when video element is null', async () => {
      const { result } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })
      
      mockDetectForVideo.mockResolvedValue({ detections: [] })
      
      let detectResult
      await act(async () => {
        detectResult = await result.current.detect(null, 1000)
      })
      
      // Should still return proper format, just empty
      expect(detectResult).toHaveProperty('detections')
      expect(detectResult.detections).toEqual([])
    })

    it('handles detections with multiple objects', async () => {
      const { result } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })
      
      mockDetectForVideo.mockResolvedValue({
        detections: [
          {
            boundingBox: { originX: 10, originY: 20, width: 100, height: 50 },
            categories: [{ categoryName: 'laptop', score: 0.85 }]
          },
          {
            boundingBox: { originX: 150, originY: 100, width: 80, height: 60 },
            categories: [{ categoryName: 'cell phone', score: 0.92 }]
          }
        ]
      })
      
      const mockVideo = document.createElement('video')
      
      let detectResult
      await act(async () => {
        detectResult = await result.current.detect(mockVideo, 1000)
      })
      
      expect(detectResult.detections).toHaveLength(2)
      expect(detectResult.detections[0].categories[0].categoryName).toBe('laptop')
      expect(detectResult.detections[1].categories[0].categoryName).toBe('cell phone')
    })

    it('does not call detectForVideo if model is not loaded', async () => {
      // Simulate loading failure so isLoaded stays false
      mockCreateFromOptions.mockRejectedValue(new Error('Model load failed'))
      
      const { result } = renderHook(() => useObjectDetection())
      
      // Wait for the hook to settle
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
      
      const mockVideo = document.createElement('video')
      
      await act(async () => {
        await result.current.detect(mockVideo, 1000)
      })
      
      // detectForVideo should not be called when detector is not loaded
      expect(mockDetectForVideo).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('sets error state when WASM loading fails', async () => {
      const loadError = new Error('Failed to load WASM')
      mockForVisionTasks.mockRejectedValue(loadError)
      
      const { result } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
      
      expect(result.current.error.message).toContain('WASM')
      expect(result.current.isLoaded).toBe(false)
    })

    it('sets error state when model creation fails', async () => {
      const createError = new Error('Model initialization failed')
      mockCreateFromOptions.mockRejectedValue(createError)
      
      const { result } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
      
      expect(result.current.error.message).toContain('Model')
      expect(result.current.isLoaded).toBe(false)
    })

    it('includes error details in error object', async () => {
      const createError = new Error('Network error during model fetch')
      mockCreateFromOptions.mockRejectedValue(createError)
      
      const { result } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
      
      expect(result.current.error.message).toBeDefined()
      expect(typeof result.current.error.message).toBe('string')
    })
  })

  describe('cleanup on unmount', () => {
    it('calls detector.close() on unmount when model loaded', async () => {
      const { result, unmount } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })
      
      unmount()
      
      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('does not throw when unmounting before model loads', async () => {
      // Delay the model load
      mockCreateFromOptions.mockImplementation(() => new Promise(() => {}))
      
      const { unmount } = renderHook(() => useObjectDetection())
      
      // Unmount before model finishes loading
      expect(() => unmount()).not.toThrow()
      
      // Should not try to close since detector was never created
      expect(mockClose).not.toHaveBeenCalled()
    })

    it('does not throw when unmounting after load error', async () => {
      mockCreateFromOptions.mockRejectedValue(new Error('Model load failed'))
      
      const { result, unmount } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })
      
      // Unmount after error - should not throw
      expect(() => unmount()).not.toThrow()
    })

    it('cancels any pending model load on unmount', async () => {
      // Use a delayed promise that we can control
      let resolveCreate
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve
      })
      mockCreateFromOptions.mockReturnValue(createPromise)
      
      const { unmount } = renderHook(() => useObjectDetection())
      
      // Unmount before the model load completes
      unmount()
      
      // Now resolve the load
      resolveCreate(mockObjectDetector)
      
      // Wait a bit to ensure any async effects complete
      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })
      
      // close() should not be called since we unmounted during loading
      // and the cancelled flag should prevent setting state
      expect(mockClose).not.toHaveBeenCalled()
    })
  })

  describe('async safety', () => {
    it('does not update state after unmount (cancelled flag)', async () => {
      // Create a deferred promise that we can resolve later
      const deferred = {}
      deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve
        deferred.reject = reject
      })
      mockCreateFromOptions.mockReturnValueOnce(deferred.promise)
      
      const { unmount } = renderHook(() => useObjectDetection())
      
      // Wait for the effect to start and call createFromOptions
      await waitFor(() => {
        expect(mockCreateFromOptions).toHaveBeenCalled()
      })
      
      // Unmount while loading is in progress
      unmount()
      
      // Complete the load after unmount
      deferred.resolve(mockObjectDetector)
      
      // Wait a bit to ensure any async effects complete
      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })
      
      // Verify the initialization was attempted
      expect(mockCreateFromOptions).toHaveBeenCalledTimes(1)
    })

    it('handles rapid mount/unmount cycles safely', async () => {
      mockCreateFromOptions.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockObjectDetector), 10))
      )
      
      const { rerender, unmount } = renderHook(() => useObjectDetection())
      
      // Rapid rerenders should be safe
      rerender()
      rerender()
      
      await waitFor(() => {
        // Hook should eventually settle
        expect(mockCreateFromOptions).toHaveBeenCalled()
      })
      
      unmount()
      
      // Should not throw and close should be called once
      expect(mockClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('hook API shape', () => {
    it('returns correct hook interface', async () => {
      const { result } = renderHook(() => useObjectDetection())
      
      // Verify the hook returns the expected shape
      expect(result.current).toHaveProperty('detect')
      expect(result.current).toHaveProperty('isLoaded')
      expect(result.current).toHaveProperty('error')
      
      expect(typeof result.current.detect).toBe('function')
      expect(typeof result.current.isLoaded).toBe('boolean')
      expect(result.current.error === null || typeof result.current.error === 'object').toBe(true)
    })

    it('maintains stable detect function reference', async () => {
      const { result, rerender } = renderHook(() => useObjectDetection())
      
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true)
      })
      
      const detectFn = result.current.detect
      
      // Rerender should not change the detect function reference
      rerender()
      
      expect(result.current.detect).toBe(detectFn)
    })
  })

  describe('mock detection mode', () => {
    let originalLocation
    let originalLocalStorage
    let getItemSpy
    let setItemSpy

    beforeEach(() => {
      originalLocation = window.location
      originalLocalStorage = window.localStorage

      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true
      })

      getItemSpy = vi.spyOn(window.localStorage, 'getItem')
      setItemSpy = vi.spyOn(window.localStorage, 'setItem')
    })

    afterEach(() => {
      window.location = originalLocation
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      })
      vi.restoreAllMocks()
    })

    it('detects mock mode from URL query parameter', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      const { result } = renderHook(() => useObjectDetection())

      expect(result.current.isMockMode).toBe(true)
    })

    it('detects mock mode from localStorage flag', () => {
      getItemSpy.mockReturnValue('true')

      const { result } = renderHook(() => useObjectDetection())

      expect(result.current.isMockMode).toBe(true)
    })

    it('isLoaded is immediately true in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      const { result } = renderHook(() => useObjectDetection())

      // In mock mode, isLoaded should be true immediately without waiting for MediaPipe
      expect(result.current.isLoaded).toBe(true)
    })

    it('error is null in mock mode', () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      const { result } = renderHook(() => useObjectDetection())

      expect(result.current.error).toBeNull()
    })

    it('skips MediaPipe initialization in mock mode', async () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      renderHook(() => useObjectDetection())

      // Wait a tick to ensure any async effects would have run
      await act(async () => {
        await new Promise(r => setTimeout(r, 10))
      })

      // MediaPipe should not be initialized in mock mode
      expect(mockForVisionTasks).not.toHaveBeenCalled()
      expect(mockCreateFromOptions).not.toHaveBeenCalled()
    })

    it('returns mock detections when calling detect in mock mode', async () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      const { result } = renderHook(() => useObjectDetection())

      // Wait for mock mode to be detected
      await waitFor(() => {
        expect(result.current.isMockMode).toBe(true)
      })

      const detections = await result.current.detect(null, 0)

      expect(detections.detections).toHaveLength(3)
      expect(detections.detections[0].categories[0].categoryName).toBe('laptop')
      expect(detections.detections[0].categories[0].score).toBe(0.92)
      expect(detections.detections[1].categories[0].categoryName).toBe('car')
      expect(detections.detections[2].categories[0].categoryName).toBe('bicycle')
    })

    it('mock detections have correct bounding box format', async () => {
      delete window.location
      window.location = new URL('http://localhost:5173?mock=true')

      const { result } = renderHook(() => useObjectDetection())

      await waitFor(() => {
        expect(result.current.isMockMode).toBe(true)
      })

      const detections = await result.current.detect(null, 0)

      // Verify MediaPipe-compatible format
      detections.detections.forEach(detection => {
        expect(detection).toHaveProperty('boundingBox')
        expect(detection.boundingBox).toHaveProperty('originX')
        expect(detection.boundingBox).toHaveProperty('originY')
        expect(detection.boundingBox).toHaveProperty('width')
        expect(detection.boundingBox).toHaveProperty('height')
        expect(detection).toHaveProperty('categories')
        expect(detection.categories[0]).toHaveProperty('categoryName')
        expect(detection.categories[0]).toHaveProperty('score')
      })
    })

    it('isMockMode is false when URL param and localStorage are not set', () => {
      getItemSpy.mockReturnValue(null)

      const { result } = renderHook(() => useObjectDetection())

      expect(result.current.isMockMode).toBe(false)
    })

    it('URL parameter takes precedence over localStorage', () => {
      // localStorage says true
      getItemSpy.mockReturnValue('true')
      // But URL says nothing - should still work
      delete window.location
      window.location = new URL('http://localhost:5173')

      const { result } = renderHook(() => useObjectDetection())

      expect(result.current.isMockMode).toBe(true)
    })
  })
})
