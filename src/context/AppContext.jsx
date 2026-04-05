import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { VALID_POLICY_TYPES, DEFAULT_STATE, STORAGE_KEYS } from './appState.js'

/**
 * Create the context
 */
const AppContext = createContext(null)

/**
 * Helper to safely load from localStorage with fallback
 */
function loadFromStorage(key, defaultValue, parser = (v) => v) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue
  }
  
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) {
      return defaultValue
    }
    return parser(stored)
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error)
    return defaultValue
  }
}

/**
 * Helper to safely save to localStorage
 */
function saveToStorage(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error)
  }
}

/**
 * Validate and normalize confidence threshold value
 * @param {number} value - The value to validate
 * @returns {number} Normalized value between 0.1 and 0.9
 */
function normalizeThreshold(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return 0.5
  return Math.max(0.1, Math.min(0.9, num))
}

/**
 * AppProvider component - provides app-wide state and actions
 */
export function AppProvider({ children }) {
  // Load persisted values from localStorage on initial mount
  const [policyType, setPolicyTypeState] = useState(() =>
    loadFromStorage(STORAGE_KEYS.policyType, DEFAULT_STATE.policyType)
  )
  
  const [onboardingComplete, setOnboardingCompleteState] = useState(() =>
    loadFromStorage(
      STORAGE_KEYS.onboardingComplete,
      DEFAULT_STATE.onboardingComplete,
      (v) => v === 'true'
    )
  )
  
  const [manualItems, setManualItemsState] = useState(() =>
    loadFromStorage(
      STORAGE_KEYS.manualItems,
      DEFAULT_STATE.manualItems,
      (v) => JSON.parse(v)
    )
  )

  const [confidenceThreshold, setConfidenceThresholdState] = useState(() => {
    const stored = loadFromStorage(
      STORAGE_KEYS.confidenceThreshold,
      DEFAULT_STATE.confidenceThreshold.toString()
    )
    return normalizeThreshold(stored)
  })
  
  // Camera permission and manual mode state
  const [cameraPermissionDenied, setCameraPermissionDeniedState] = useState(() =>
    loadFromStorage(
      STORAGE_KEYS.cameraPermissionDenied,
      false,
      (v) => v === 'true'
    )
  )
  
  const [manualModeEnabled, setManualModeEnabledState] = useState(() =>
    loadFromStorage(
      STORAGE_KEYS.manualModeEnabled,
      false,
      (v) => v === 'true'
    )
  )
  
  // Non-persisted state
  const [activeTab, setActiveTabState] = useState(DEFAULT_STATE.activeTab)
  const [detectedItems, setDetectedItemsState] = useState(() => new Map())
  const [selectedItemId, setSelectedItemIdState] = useState(DEFAULT_STATE.selectedItemId)

  /**
   * Action: setPolicyType
   * Updates policy type and persists to localStorage
   */
  const setPolicyType = useCallback((newPolicyType) => {
    // Validate policy type
    const normalizedPolicy = newPolicyType?.toLowerCase()
    if (!VALID_POLICY_TYPES.includes(normalizedPolicy)) {
      console.warn(`Invalid policy type: ${newPolicyType}. Using default.`)
      return
    }
    
    setPolicyTypeState(normalizedPolicy)
    saveToStorage(STORAGE_KEYS.policyType, normalizedPolicy)
  }, [])

  /**
   * Action: setConfidenceThreshold
   * Updates confidence threshold and persists to localStorage
   */
  const setConfidenceThreshold = useCallback((newThreshold) => {
    const normalized = normalizeThreshold(newThreshold)
    setConfidenceThresholdState(normalized)
    saveToStorage(STORAGE_KEYS.confidenceThreshold, normalized.toString())
  }, [])

  /**
   * Action: completeOnboarding
   * Marks onboarding as complete and persists to localStorage
   */
  const completeOnboarding = useCallback(() => {
    setOnboardingCompleteState(true)
    saveToStorage(STORAGE_KEYS.onboardingComplete, 'true')
  }, [])

  /**
   * Action: setActiveTab
   * Updates the active tab (camera or dashboard)
   */
  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab)
  }, [])

  /**
   * Action: updateDetectedItems
   * Updates the Map of detected items from camera detection
   * Note: This is NOT persisted to localStorage as detections are transient
   */
  const updateDetectedItems = useCallback((newDetectedItems) => {
    // Accept either a Map or an object to convert
    if (newDetectedItems instanceof Map) {
      setDetectedItemsState(new Map(newDetectedItems))
    } else if (typeof newDetectedItems === 'object' && newDetectedItems !== null) {
      setDetectedItemsState(new Map(Object.entries(newDetectedItems)))
    } else {
      setDetectedItemsState(new Map())
    }
  }, [])

  /**
   * Action: addManualItem
   * Adds a new manual item and persists to localStorage
   */
  const addManualItem = useCallback((item) => {
    if (!item || !item.id) {
      console.warn('Cannot add manual item without id')
      return
    }
    
    setManualItemsState((prevItems) => {
      const newItems = [...prevItems, item]
      saveToStorage(STORAGE_KEYS.manualItems, JSON.stringify(newItems))
      return newItems
    })
  }, [])

  /**
   * Action: removeManualItem
   * Removes a manual item by id and persists to localStorage
   */
  const removeManualItem = useCallback((itemId) => {
    setManualItemsState((prevItems) => {
      const newItems = prevItems.filter(item => item.id !== itemId)
      saveToStorage(STORAGE_KEYS.manualItems, JSON.stringify(newItems))
      return newItems
    })
  }, [])

  /**
   * Action: updateManualItem
   * Updates an existing manual item by id and persists to localStorage
   */
  const updateManualItem = useCallback((itemId, updates) => {
    setManualItemsState((prevItems) => {
      const newItems = prevItems.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
      saveToStorage(STORAGE_KEYS.manualItems, JSON.stringify(newItems))
      return newItems
    })
  }, [])

  /**
   * Action: setSelectedItem
   * Sets the currently selected item id (for detail modal)
   * Pass null to clear selection
   */
  const setSelectedItem = useCallback((itemId) => {
    setSelectedItemIdState(itemId)
  }, [])

  /**
   * Action: setCameraPermissionDenied
   * Records when camera permission is denied to prevent auto-prompt
   */
  const setCameraPermissionDenied = useCallback((denied) => {
    setCameraPermissionDeniedState(denied)
    saveToStorage(STORAGE_KEYS.cameraPermissionDenied, denied.toString())
  }, [])

  /**
   * Action: enableManualMode
   * Enables manual mode when camera is unavailable
   */
  const enableManualMode = useCallback(() => {
    setManualModeEnabledState(true)
    setActiveTabState('dashboard')
    saveToStorage(STORAGE_KEYS.manualModeEnabled, 'true')
  }, [])

  /**
   * Action: disableManualMode
   * Disables manual mode and attempts to use camera
   */
  const disableManualMode = useCallback(() => {
    setManualModeEnabledState(false)
    setActiveTabState('camera')
    saveToStorage(STORAGE_KEYS.manualModeEnabled, 'false')
  }, [])

  /**
   * Action: resetCameraPermission
   * Clears the denied flag to allow re-prompting
   */
  const resetCameraPermission = useCallback(() => {
    setCameraPermissionDeniedState(false)
    saveToStorage(STORAGE_KEYS.cameraPermissionDenied, 'false')
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // State
    policyType,
    onboardingComplete,
    activeTab,
    detectedItems,
    manualItems,
    selectedItemId,
    confidenceThreshold,
    cameraPermissionDenied,
    manualModeEnabled,
    // Actions
    setPolicyType,
    completeOnboarding,
    setActiveTab,
    updateDetectedItems,
    addManualItem,
    removeManualItem,
    updateManualItem,
    setSelectedItem,
    setConfidenceThreshold,
    setCameraPermissionDenied,
    enableManualMode,
    disableManualMode,
    resetCameraPermission
  }), [
    policyType,
    onboardingComplete,
    activeTab,
    detectedItems,
    manualItems,
    selectedItemId,
    confidenceThreshold,
    cameraPermissionDenied,
    manualModeEnabled,
    setPolicyType,
    completeOnboarding,
    setActiveTab,
    updateDetectedItems,
    addManualItem,
    removeManualItem,
    updateManualItem,
    setSelectedItem,
    setConfidenceThreshold,
    setCameraPermissionDenied,
    enableManualMode,
    disableManualMode,
    resetCameraPermission
  ])

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

/**
 * useAppContext hook
 * Custom hook to access the app context
 * Throws if used outside of AppProvider
 */
export function useAppContext() {
  const context = useContext(AppContext)
  
  if (context === null) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  
  return context
}
