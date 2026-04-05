import type { AppState, PolicyType, StorageKeys } from "../types";

/**
 * Valid policy types for the application
 */
export const VALID_POLICY_TYPES: PolicyType[] = ["renters", "homeowners", "auto", "none"];

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
  privacyMode: {
    enabled: false,
    localOnlyMessage: "All processing happens on your device. No data leaves your browser.",
  },
  activeSimulatorType: null,
  hazardWarnings: [],
  simulationResult: null,
  recommendations: [],
  language: "en",
  voiceEnabled: true,
  ttsEnabled: true,
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
  language: "insurescope_language",
  voiceEnabled: "insurescope_voiceEnabled",
  ttsEnabled: "insurescope_ttsEnabled",
};
