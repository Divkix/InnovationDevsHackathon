/**
 * Valid policy types for the application
 */
export const VALID_POLICY_TYPES = ['renters', 'homeowners', 'auto', 'none']

/**
 * Default/initial state values
 */
export const DEFAULT_STATE = {
  policyType: 'renters',
  onboardingComplete: false,
  activeTab: 'camera',
  detectedItems: new Map(),
  manualItems: [],
  selectedItemId: null,
  confidenceThreshold: 0.5
}

/**
 * localStorage keys for persistence
 */
export const STORAGE_KEYS = {
  policyType: 'insurescope_policyType',
  onboardingComplete: 'insurescope_onboardingComplete',
  manualItems: 'insurescope_manualItems',
  confidenceThreshold: 'insurescope_confidenceThreshold'
}
