import { useState, useEffect, useCallback, useMemo } from 'react'
import { getMockDetections } from './mockDetections.js'

/**
 * Storage key for mock detection mode
 */
export const MOCK_STORAGE_KEY = 'insurescope_mock_detection'

/**
 * Check if mock mode is enabled via URL query parameter or localStorage
 * @returns {boolean} True if mock mode is enabled
 */
function isMockModeEnabled() {
  // Check URL query parameter first
  if (typeof window !== 'undefined') {
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
      // localStorage not available (e.g., private browsing)
      console.warn('localStorage not available:', error)
    }
  }

  return false
}

/**
 * Custom hook that manages mock detection mode.
 * Detects if mock mode is enabled via ?mock=true query parameter
 * or localStorage 'insurescope_mock_detection' set to 'true'.
 * 
 * When enabled, returns predefined mock detections instead of
 * requiring real camera and MediaPipe model.
 * 
 * Mock detections include:
 * - laptop (covered, green, $1200)
 * - car (not covered, red, $15000)
 * - bicycle (conditional, yellow, $500)
 * 
 * @returns {Object} Object containing mock mode state and mock detections
 * @returns {boolean} isMockMode - Whether mock mode is enabled
 * @returns {boolean} isLoaded - Always true in mock mode (simulates model loaded)
 * @returns {Error|null} error - Always null in mock mode
 * @returns {Array} mockDetections - Predefined detection results
 * @returns {Function} detect - Mock detect function that returns mock detections
 * @returns {Function} setMockMode - Enable/disable mock mode in localStorage
 */
export function useMockDetection() {
  const [isMockMode, setIsMockModeState] = useState(() => isMockModeEnabled())

  // Re-check mock mode when URL changes (for single-page app navigation)
  useEffect(() => {
    const checkMockMode = () => {
      setIsMockModeState(isMockModeEnabled())
    }

    // Check initially
    checkMockMode()

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === MOCK_STORAGE_KEY) {
        checkMockMode()
      }
    }

    // Listen for popstate (back/forward navigation)
    const handlePopState = () => {
      checkMockMode()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  /**
   * Enable or disable mock mode in localStorage
   * @param {boolean} enabled - Whether to enable mock mode
   */
  const setMockMode = useCallback((enabled) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage not available, cannot set mock mode')
      return
    }

    try {
      if (enabled) {
        localStorage.setItem(MOCK_STORAGE_KEY, 'true')
      } else {
        localStorage.removeItem(MOCK_STORAGE_KEY)
      }
      setIsMockModeState(enabled)
    } catch (error) {
      console.warn('Failed to set mock mode:', error)
    }
  }, [])

  /**
   * Mock detect function that returns predefined detections
   * Mimics the signature of the real useObjectDetection.detect function
   * 
   * @param {HTMLVideoElement|null} video - Ignored in mock mode
   * @param {number} timestamp - Ignored in mock mode
   * @returns {Promise<Object>} Mock detection results
   */
  const detect = useCallback(async (video, timestamp) => {
    if (!isMockMode) {
      return { detections: [] }
    }

    // Return mock detections
    return {
      detections: getMockDetections()
    }
  }, [isMockMode])

  // Memoize the return value
  const returnValue = useMemo(() => ({
    isMockMode,
    isLoaded: true, // Always loaded in mock mode
    error: null, // Never errors in mock mode
    mockDetections: isMockMode ? getMockDetections() : [],
    detect,
    setMockMode
  }), [isMockMode, detect, setMockMode])

  return returnValue
}

export default useMockDetection
