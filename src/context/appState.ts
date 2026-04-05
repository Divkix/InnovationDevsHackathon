import type { PolicyType, AppState, StorageKeys } from '../types';

/**
 * Valid policy types for the application
 */
export const VALID_POLICY_TYPES: PolicyType[] = ['renters', 'homeowners', 'auto', 'none'];

/**
 * Default/initial state values
 */
export const DEFAULT_STATE: AppState = {
  policyType: 'renters',
  onboardingComplete: false,
  activeTab: 'camera',
  detectedItems: new Map(),
  manualItems: [],
  selectedItemId: null,
  confidenceThreshold: 0.5
};

/**
 * localStorage keys for persistence
 */
export const STORAGE_KEYS: StorageKeys = {
  policyType: 'insurescope_policyType',
  onboardingComplete: 'insurescope_onboardingComplete',
  manualItems: 'insurescope_manualItems',
  confidenceThreshold: 'insurescope_confidenceThreshold',
  cameraPermissionDenied: 'insurescope_cameraPermissionDenied',
  manualModeEnabled: 'insurescope_manualModeEnabled'
};
