import { useState, useRef, useEffect, useCallback } from 'react'
import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision'
import { MOCK_STORAGE_KEY } from './useMockDetection.js'
import { getMockDetections } from './mockDetections.js'

function createTimeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Model loading timeout after ${ms}ms. Check network connection and CDN accessibility.`))
    }, ms)
  })
}

function checkMockMode() {
  if (typeof window === 'undefined') return false

  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('mock') === 'true') return true

  try {
    if (localStorage.getItem(MOCK_STORAGE_KEY) === 'true') return true
  } catch {
    // localStorage not available
  }

  return false
}

export function useObjectDetection() {
  const detectorRef = useRef(null)

  const initialMockMode = checkMockMode()
  const [isLoaded, setIsLoaded] = useState(initialMockMode)
  const [error, setError] = useState(null)
  const [isMockMode] = useState(initialMockMode)

  useEffect(() => {
    if (isMockMode) return

    let detectorInstance = null
    let isCancelled = false

    async function createDetectorWithDelegate(vision, delegate) {
      const detectorPromise = ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/efficientdet_lite0.tflite',
          delegate
        },
        runningMode: 'VIDEO',
        scoreThreshold: 0.5
      })
      return Promise.race([detectorPromise, createTimeoutPromise(15000)])
    }

    async function initializeDetector() {
      try {
        const visionPromise = FilesetResolver.forVisionTasks('/wasm')
        const vision = await Promise.race([visionPromise, createTimeoutPromise(15000)])

        if (isCancelled) return

        // Try GPU first, fall back to CPU on failure
        try {
          detectorInstance = await createDetectorWithDelegate(vision, 'GPU')
        } catch {
          if (isCancelled) return
          detectorInstance = await createDetectorWithDelegate(vision, 'CPU')
        }

        if (isCancelled) {
          detectorInstance.close()
          return
        }

        detectorRef.current = detectorInstance
        setIsLoaded(true)
        setError(null)
      } catch (err) {
        if (isCancelled) return

        let errorMessage = 'Failed to initialize object detection'
        if (err.message?.includes('timeout')) {
          errorMessage = err.message
        } else if (err.message?.includes('WASM') || err.message?.includes('wasm')) {
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

    initializeDetector()

    return () => {
      isCancelled = true
      if (detectorInstance) {
        detectorInstance.close()
      }
    }
  }, [isMockMode])

  const detect = useCallback(async (video, timestamp) => {
    if (isMockMode) {
      return { detections: getMockDetections() }
    }

    const detector = detectorRef.current
    if (!detector || !isLoaded) return { detections: [] }
    if (!video) return { detections: [] }

    try {
      return await detector.detectForVideo(video, timestamp)
    } catch (err) {
      console.error('Detection error:', err)
      return { detections: [] }
    }
  }, [isMockMode, isLoaded])

  return { detect, isLoaded, error, isMockMode }
}
