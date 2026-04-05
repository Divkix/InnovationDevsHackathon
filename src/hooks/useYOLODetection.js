import { useState, useRef, useEffect, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import { processYOLOOutput, COCO_CLASS_NAMES } from '../utils/yoloProcessor.js'
import { MOCK_STORAGE_KEY } from './useMockDetection.js'
import { getMockDetections } from './mockDetections.js'

// Model configuration
const MODEL_PATH = '/models/yolo26n/model.json'
const MODEL_INPUT_SIZE = 640
const CONFIDENCE_THRESHOLD = 0.5

/**
 * Check if mock mode is enabled via URL query parameter or localStorage
 * @returns {boolean} True if mock mode is enabled
 */
function checkMockMode() {
  if (typeof window === 'undefined') return false

  // Check URL query parameter first
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('mock') === 'true') return true

  // Check localStorage
  try {
    if (localStorage.getItem(MOCK_STORAGE_KEY) === 'true') return true
  } catch {
    // localStorage not available (e.g., private browsing)
  }

  return false
}

/**
 * Custom hook for YOLO26 object detection using TensorFlow.js
 * 
 * Mirrors the API of useObjectDetection for easy swapping:
 * - detect: Function to run detection on video frame
 * - isLoaded: Boolean indicating if model is ready
 * - error: Error object if initialization failed
 * - isMockMode: Boolean indicating mock detection mode
 * 
 * Supports mock mode via ?mock=true URL param or localStorage flag.
 * 
 * @returns {Object} Object containing detection state and functions
 * @returns {Function} detect - Run detection on video element
 * @returns {boolean} isLoaded - Whether model is loaded and ready
 * @returns {Error|null} error - Error if initialization failed
 * @returns {boolean} isMockMode - Whether mock mode is active
 */
export function useYOLODetection() {
  const modelRef = useRef(null)
  const tensorsRef = useRef([])

  const initialMockMode = checkMockMode()
  const [isLoaded, setIsLoaded] = useState(initialMockMode)
  const [error, setError] = useState(null)
  const [isMockMode] = useState(initialMockMode)

  // Track component mount state for async safety
  const isMountedRef = useRef(true)

  useEffect(() => {
    // Skip TensorFlow initialization in mock mode
    if (isMockMode) return

    let isCancelled = false

    async function initializeModel() {
      try {
        // Set WebGL backend
        await tf.setBackend('webgl')
        await tf.ready()

        if (isCancelled || !isMountedRef.current) return

        // Load YOLO26 model
        const model = await tf.loadGraphModel(MODEL_PATH)

        if (isCancelled || !isMountedRef.current) {
          model.dispose()
          return
        }

        modelRef.current = model
        setIsLoaded(true)
        setError(null)
      } catch (err) {
        if (isCancelled || !isMountedRef.current) return

        let errorMessage = 'Failed to initialize YOLO detection'
        if (err.message?.includes('backend') || err.message?.includes('webgl')) {
          errorMessage = `Backend initialization failed: ${err.message}`
        } else if (err.message?.includes('model') || err.message?.includes('fetch')) {
          errorMessage = `Model loading failed: ${err.message}`
        } else {
          errorMessage = err.message || 'Unknown error during initialization'
        }

        setError(new Error(errorMessage))
        setIsLoaded(false)
      }
    }

    initializeModel()

    return () => {
      isCancelled = true
      isMountedRef.current = false
      
      // Dispose model
      if (modelRef.current) {
        modelRef.current.dispose()
        modelRef.current = null
      }
      
      // Dispose any leftover tensors
      tensorsRef.current.forEach(tensor => {
        if (tensor && tensor.dispose) {
          tensor.dispose()
        }
      })
      tensorsRef.current = []
    }
  }, [isMockMode])

  /**
   * Preprocess video frame for YOLO inference
   * - Resizes to MODEL_INPUT_SIZE (640x640)
   * - Normalizes pixel values to [0, 1]
   * - Adds batch dimension
   * 
   * @param {HTMLVideoElement} video - Video element to process
   * @returns {tf.Tensor} Preprocessed tensor [1, 640, 640, 3]
   */
  const preprocessFrame = useCallback((video) => {
    if (!video) return null

    try {
      // Create tensor from video frame
      const frameTensor = tf.browser.fromPixels(video)
      tensorsRef.current.push(frameTensor)

      // Resize to model input size (640x640)
      const resized = tf.image.resizeBilinear(frameTensor, [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])
      tensorsRef.current.push(resized)

      // Normalize to [0, 1] and add batch dimension
      const normalized = resized.expandDims(0).div(255.0)
      tensorsRef.current.push(normalized)

      // Dispose intermediate tensors
      frameTensor.dispose()
      resized.dispose()

      // Remove disposed tensors from tracking
      tensorsRef.current = tensorsRef.current.filter(t => t !== frameTensor && t !== resized)

      return normalized
    } catch (err) {
      console.error('Preprocessing error:', err)
      return null
    }
  }, [])

  /**
   * Run object detection on video frame
   * 
   * @param {HTMLVideoElement|null} video - Video element to detect objects in
   * @param {number} timestamp - Video timestamp (ignored in YOLO, for API compatibility)
   * @returns {Promise<Object>} Detection results in MediaPipe format
   */
  const detect = useCallback(async (video, timestamp) => {
    // Return mock detections in mock mode
    if (isMockMode) {
      return { detections: getMockDetections() }
    }

    const model = modelRef.current
    if (!model || !isLoaded) return { detections: [] }
    if (!video) return { detections: [] }

    let inputTensor = null
    let outputTensor = null

    try {
      // Preprocess video frame
      inputTensor = preprocessFrame(video)
      if (!inputTensor) {
        return { detections: [] }
      }

      // Run inference
      outputTensor = model.predict(inputTensor)

      // Process output - YOLO26 end-to-end output
      const outputData = await outputTensor.array()

      // Convert to MediaPipe format
      const detections = processYOLOOutput(outputData[0], COCO_CLASS_NAMES, CONFIDENCE_THRESHOLD)

      return { detections }
    } catch (err) {
      console.error('Detection error:', err)
      return { detections: [] }
    } finally {
      // Clean up tensors
      if (inputTensor) {
        inputTensor.dispose()
      }
      if (outputTensor) {
        outputTensor.dispose()
      }
      
      // Remove from tracking
      tensorsRef.current = tensorsRef.current.filter(
        t => t !== inputTensor && t !== outputTensor
      )
    }
  }, [isMockMode, isLoaded, preprocessFrame])

  return { detect, isLoaded, error, isMockMode }
}

export default useYOLODetection
