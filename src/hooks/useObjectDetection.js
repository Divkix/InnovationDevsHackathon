import { useState, useRef, useEffect, useCallback } from 'react'
import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision'
import { useMockDetection, MOCK_STORAGE_KEY } from './useMockDetection.js'
import { getMockDetections } from './mockDetections.js'

/**
 * Custom hook that manages MediaPipe ObjectDetector lifecycle.
 * Loads model from CDN on mount, provides detect(video, timestamp) function,
 * tracks isLoaded and error states, and handles cleanup on unmount.
 * 
 * Supports mock detection mode for automated testing:
 * - Set ?mock=true query parameter, OR
 * - Set localStorage 'insurescope_mock_detection' to 'true'
 * 
 * In mock mode, bypasses MediaPipe and returns predefined mock detections.
 * 
 * @returns {Object} Object containing detect function, isLoaded state, and error state
 * @returns {Function} detect - Function to run object detection on a video element
 * @returns {boolean} isLoaded - Whether the model has finished loading
 * @returns {Error|null} error - Error object if model loading failed, null otherwise
 * @returns {boolean} isMockMode - Whether mock detection mode is active
 */
export function useObjectDetection() {
  // Use refs for detector and cancellation
  const detectorRef = useRef(null)
  const cancelledRef = useRef(false)

  // Check for mock mode synchronously during initial render
  const checkMockMode = () => {
    if (typeof window === 'undefined') return false

    // Check URL query parameter
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('mock') === 'true') {
      return true
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(MOCK_STORAGE_KEY)
      if (stored === 'true') {
        return true
      }
    } catch (error) {
      // localStorage not available
    }

    return false
  }

  const initialMockMode = checkMockMode()
  const [isLoaded, setIsLoaded] = useState(initialMockMode)
  const [error, setError] = useState(null)
  const [isMockMode] = useState(initialMockMode)

  // Only initialize MediaPipe if NOT in mock mode
  useEffect(() => {
    // Skip MediaPipe initialization in mock mode
    if (isMockMode) return

    let detectorInstance = null

    async function initializeDetector() {
      try {
        // Load MediaPipe WASM files from CDN
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
        )

        // Check if component is still mounted
        if (cancelledRef.current) return

        // Create ObjectDetector with specified model configuration
        detectorInstance = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0_uint8.tflite',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          scoreThreshold: 0.5
        })

        // Check again if component is still mounted after async operation
        if (cancelledRef.current) {
          // Clean up the detector since component unmounted during load
          detectorInstance.close()
          return
        }

        // Store detector in ref and update state
        detectorRef.current = detectorInstance
        setIsLoaded(true)
        setError(null)
      } catch (err) {
        // Don't update state if component unmounted during error
        if (cancelledRef.current) return

        // Set appropriate error message based on error type
        let errorMessage = 'Failed to initialize object detection'
        if (err.message?.includes('WASM') || err.message?.includes('wasm')) {
          errorMessage = `WASM loading failed: ${err.message}`
        } else if (err.message?.includes('model') || err.message?.includes('fetch') || err.message?.includes('network')) {
          errorMessage = `Model initialization failed: ${err.message}`
        } else {
          errorMessage = err.message || 'Unknown error during initialization'
        }

        setError(new Error(errorMessage))
        setIsLoaded(false)
      }
    }

    // Start model loading
    initializeDetector()

    // Cleanup function
    return () => {
      cancelledRef.current = true
      
      // Close the detector instance if it exists
      if (detectorInstance) {
        detectorInstance.close()
      }
    }
  }, [isMockMode])

  /**
   * Run object detection on a video element.
   * In mock mode, returns predefined mock detections instead of running MediaPipe.
   * 
   * @param {HTMLVideoElement|null} video - The video element to detect objects in (ignored in mock mode)
   * @param {number} timestamp - The timestamp for the video frame (ignored in mock mode)
   * @returns {Promise<Object>} Detection results in MediaPipe format { detections: [...] }
   */
  const detect = useCallback(async (video, timestamp) => {
    // Return mock detections if in mock mode
    if (isMockMode) {
      return {
        detections: getMockDetections()
      }
    }

    const detector = detectorRef.current

    // Return empty detections if detector is not loaded
    if (!detector || !isLoaded) {
      return { detections: [] }
    }

    // Handle null video element
    if (!video) {
      return { detections: [] }
    }

    try {
      // Run detection using MediaPipe
      const results = await detector.detectForVideo(video, timestamp)
      return results
    } catch (err) {
      // Return empty detections on error
      console.error('Detection error:', err)
      return { detections: [] }
    }
  }, [isMockMode, isLoaded])

  return {
    detect,
    isLoaded,
    error,
    isMockMode
  }
}
