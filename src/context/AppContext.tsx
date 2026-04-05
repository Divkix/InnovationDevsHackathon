import { createContext, useContext, useState, useCallback, useMemo, type ReactNode, type ReactElement } from 'react';
import type { PolicyType, AppTab, ManualItem, DetectedItem } from '../types';
import { VALID_POLICY_TYPES, DEFAULT_STATE, STORAGE_KEYS } from './appState';

/**
 * Shape of the AppContext value
 */
export interface AppContextValue {
  // State
  policyType: PolicyType;
  onboardingComplete: boolean;
  activeTab: AppTab;
  detectedItems: Map<string, DetectedItem>;
  manualItems: ManualItem[];
  selectedItemId: string | null;
  confidenceThreshold: number;
  cameraPermissionDenied: boolean;
  manualModeEnabled: boolean;
  // Actions
  setPolicyType: (policy: string) => void;
  completeOnboarding: () => void;
  setActiveTab: (tab: AppTab) => void;
  updateDetectedItems: (items: Map<string, DetectedItem> | Record<string, DetectedItem> | unknown) => void;
  addManualItem: (item: ManualItem) => void;
  removeManualItem: (itemId: string) => void;
  updateManualItem: (itemId: string, updates: Partial<ManualItem>) => void;
  setSelectedItem: (itemId: string | null) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setCameraPermissionDenied: (denied: boolean) => void;
  enableManualMode: () => void;
  disableManualMode: () => void;
  resetCameraPermission: () => void;
}

/**
 * Create the context with undefined initial value
 */
const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Helper to safely load from localStorage with fallback
 */
function loadFromStorage<T>(
  key: string,
  defaultValue: T,
  parser: (value: string) => T = (v) => v as unknown as T
): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }

  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    return parser(stored);
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Helper to safely save to localStorage
 */
function saveToStorage(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
}

/**
 * Validate and normalize confidence threshold value
 * @param value - The value to validate
 * @returns Normalized value between 0.1 and 0.9
 */
function normalizeThreshold(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return 0.5;
  return Math.max(0.1, Math.min(0.9, num));
}

/**
 * Props for the AppProvider component
 */
interface AppProviderProps {
  children: ReactNode;
}

/**
 * AppProvider component - provides app-wide state and actions
 */
export function AppProvider({ children }: AppProviderProps): ReactElement {
  // Load persisted values from localStorage on initial mount
  const [policyType, setPolicyTypeState] = useState<PolicyType>(() =>
    loadFromStorage<PolicyType>(STORAGE_KEYS.policyType, DEFAULT_STATE.policyType)
  );

  const [onboardingComplete, setOnboardingCompleteState] = useState<boolean>(() =>
    loadFromStorage<boolean>(
      STORAGE_KEYS.onboardingComplete,
      DEFAULT_STATE.onboardingComplete,
      (v) => v === 'true'
    )
  );

  const [manualItems, setManualItemsState] = useState<ManualItem[]>(() =>
    loadFromStorage<ManualItem[]>(
      STORAGE_KEYS.manualItems,
      DEFAULT_STATE.manualItems,
      (v) => JSON.parse(v) as ManualItem[]
    )
  );

  const [confidenceThreshold, setConfidenceThresholdState] = useState<number>(() => {
    const stored = loadFromStorage<string>(
      STORAGE_KEYS.confidenceThreshold,
      DEFAULT_STATE.confidenceThreshold.toString()
    );
    return normalizeThreshold(stored);
  });

  // Camera permission and manual mode state
  const [cameraPermissionDenied, setCameraPermissionDeniedState] = useState<boolean>(() =>
    loadFromStorage<boolean>(
      STORAGE_KEYS.cameraPermissionDenied,
      false,
      (v) => v === 'true'
    )
  );

  const [manualModeEnabled, setManualModeEnabledState] = useState<boolean>(() =>
    loadFromStorage<boolean>(
      STORAGE_KEYS.manualModeEnabled,
      false,
      (v) => v === 'true'
    )
  );

  // Non-persisted state
  const [activeTab, setActiveTabState] = useState<AppTab>(DEFAULT_STATE.activeTab);
  const [detectedItems, setDetectedItemsState] = useState<Map<string, DetectedItem>>(() => new Map());
  const [selectedItemId, setSelectedItemIdState] = useState<string | null>(DEFAULT_STATE.selectedItemId);

  /**
   * Action: setPolicyType
   * Updates policy type and persists to localStorage
   */
  const setPolicyType = useCallback((newPolicyType: string): void => {
    // Validate policy type
    const normalizedPolicy = newPolicyType?.toLowerCase() as PolicyType;
    if (!VALID_POLICY_TYPES.includes(normalizedPolicy)) {
      console.warn(`Invalid policy type: ${newPolicyType}. Using default.`);
      return;
    }

    setPolicyTypeState(normalizedPolicy);
    saveToStorage(STORAGE_KEYS.policyType, normalizedPolicy);
  }, []);

  /**
   * Action: setConfidenceThreshold
   * Updates confidence threshold and persists to localStorage
   */
  const setConfidenceThreshold = useCallback((newThreshold: number): void => {
    const normalized = normalizeThreshold(newThreshold);
    setConfidenceThresholdState(normalized);
    saveToStorage(STORAGE_KEYS.confidenceThreshold, normalized.toString());
  }, []);

  /**
   * Action: completeOnboarding
   * Marks onboarding as complete and persists to localStorage
   */
  const completeOnboarding = useCallback((): void => {
    setOnboardingCompleteState(true);
    saveToStorage(STORAGE_KEYS.onboardingComplete, 'true');
  }, []);

  /**
   * Action: setActiveTab
   * Updates the active tab (camera or dashboard)
   */
  const setActiveTab = useCallback((tab: AppTab): void => {
    setActiveTabState(tab);
  }, []);

  /**
   * Action: updateDetectedItems
   * Updates the Map of detected items from camera detection
   * Note: This is NOT persisted to localStorage as detections are transient
   */
  const updateDetectedItems = useCallback((newDetectedItems: Map<string, DetectedItem> | Record<string, DetectedItem> | unknown): void => {
    // Accept either a Map or an object to convert
    if (newDetectedItems instanceof Map) {
      setDetectedItemsState(new Map(newDetectedItems as Map<string, DetectedItem>));
    } else if (typeof newDetectedItems === 'object' && newDetectedItems !== null) {
      setDetectedItemsState(new Map(Object.entries(newDetectedItems as Record<string, DetectedItem>)));
    } else {
      setDetectedItemsState(new Map());
    }
  }, []);

  /**
   * Action: addManualItem
   * Adds a new manual item and persists to localStorage
   */
  const addManualItem = useCallback((item: ManualItem): void => {
    if (!item || !item.id) {
      console.warn('Cannot add manual item without id');
      return;
    }

    setManualItemsState((prevItems: ManualItem[]) => {
      const newItems = [...prevItems, item];
      saveToStorage(STORAGE_KEYS.manualItems, JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  /**
   * Action: removeManualItem
   * Removes a manual item by id and persists to localStorage
   */
  const removeManualItem = useCallback((itemId: string): void => {
    setManualItemsState((prevItems: ManualItem[]) => {
      const newItems = prevItems.filter(item => item.id !== itemId);
      saveToStorage(STORAGE_KEYS.manualItems, JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  /**
   * Action: updateManualItem
   * Updates an existing manual item by id and persists to localStorage
   */
  const updateManualItem = useCallback((itemId: string, updates: Partial<ManualItem>): void => {
    setManualItemsState((prevItems: ManualItem[]) => {
      const newItems = prevItems.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      saveToStorage(STORAGE_KEYS.manualItems, JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  /**
   * Action: setSelectedItem
   * Sets the currently selected item id (for detail modal)
   * Pass null to clear selection
   */
  const setSelectedItem = useCallback((itemId: string | null): void => {
    setSelectedItemIdState(itemId);
  }, []);

  /**
   * Action: setCameraPermissionDenied
   * Records when camera permission is denied to prevent auto-prompt
   */
  const setCameraPermissionDenied = useCallback((denied: boolean): void => {
    setCameraPermissionDeniedState(denied);
    saveToStorage(STORAGE_KEYS.cameraPermissionDenied, denied.toString());
  }, []);

  /**
   * Action: enableManualMode
   * Enables manual mode when camera is unavailable
   */
  const enableManualMode = useCallback((): void => {
    setManualModeEnabledState(true);
    setActiveTabState('dashboard');
    saveToStorage(STORAGE_KEYS.manualModeEnabled, 'true');
  }, []);

  /**
   * Action: disableManualMode
   * Disables manual mode and attempts to use camera
   */
  const disableManualMode = useCallback((): void => {
    setManualModeEnabledState(false);
    setActiveTabState('camera');
    saveToStorage(STORAGE_KEYS.manualModeEnabled, 'false');
  }, []);

  /**
   * Action: resetCameraPermission
   * Clears the denied flag to allow re-prompting
   */
  const resetCameraPermission = useCallback((): void => {
    setCameraPermissionDeniedState(false);
    saveToStorage(STORAGE_KEYS.cameraPermissionDenied, 'false');
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<AppContextValue>(() => ({
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
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * useAppContext hook
 * Custom hook to access the app context
 * Throws if used outside of AppProvider
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }

  return context;
}
