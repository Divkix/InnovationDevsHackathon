import type { AppState, StorageKeys } from "../types";

/**
 * Default/initial state values
 */
export const DEFAULT_STATE: AppState = {
  policyType: "renters",
  onboardingComplete: false,
  activeTab: "camera",
  detectedItems: new Map(),
  manualItems: [],
  selectedItemId: null,
  confidenceThreshold: 0.5,

  // New feature defaults
  privacyMode: {
    enabled: false,
    localOnlyMessage: "All processing happens on your device. No data leaves your browser.",
  },
  activeSimulatorType: null,
  hazardWarnings: [],
  simulationResult: null,
  recommendations: [],
};

/**
 * localStorage keys for persistence
 */
export const STORAGE_KEYS: StorageKeys = {
  policyType: "insurescope_policyType",
  onboardingComplete: "insurescope_onboardingComplete",
  manualItems: "insurescope_manualItems",
  confidenceThreshold: "insurescope_confidenceThreshold",
  cameraPermissionDenied: "insurescope_cameraPermissionDenied",
  manualModeEnabled: "insurescope_manualModeEnabled",
  privacyMode: "insurescope_privacyMode",
  activeSimulatorType: "insurescope_activeSimulatorType",
};
