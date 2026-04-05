/**
 * Shared domain types for InsureScope
 *
 * These types define the contracts used across the application.
 * They are consumed by hooks, components, and utilities.
 */

import type { ReactNode, RefObject } from "react";

// Re-export React types for convenience
export type { ReactNode, RefObject };

// ============================================================================
// Policy & Coverage Types
// ============================================================================

/** Valid insurance policy types */
export type PolicyType = "renters" | "homeowners" | "auto" | "none";

/** Coverage status for an item */
export type CoverageStatus = "covered" | "conditional" | "not_covered";

/** Color coding for coverage status */
export type CoverageColor = "green" | "yellow" | "red";

/** Coverage result returned by lookup functions */
export interface CoverageResult {
  status: CoverageStatus;
  color: CoverageColor;
  estimatedValue: number;
  note: string;
  conditions: string[];
  upgrade: string | null;
}

/** Valid policy type values for runtime checks */
export const VALID_POLICY_TYPES: PolicyType[] = ["renters", "homeowners", "auto", "none"];

// ============================================================================
// Detection & ML Types
// ============================================================================

/** Bounding box coordinates in origin/width/height format */
export interface BoundingBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** Bounding box in XYXY format (corner-based) */
export interface XYXYBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Category information from ML detection */
export interface DetectionCategory {
  categoryName: string;
  /** Confidence score 0-1 */
  score: number;
  displayName: string;
}

/** Raw detection from ML models (MediaPipe/YOLO format) */
export interface Detection {
  boundingBox: BoundingBox;
  categories: DetectionCategory[];
}

/** Item detected by camera with processed coverage info */
export interface DetectedItem extends Detection {
  id: string;
  category: string;
  /** Detection confidence 0-1 */
  confidence: number;
  coverage?: CoverageResult;
}

/** Item added manually by user */
export interface ManualItem {
  id: string;
  name: string;
  category: string;
  estimatedValue: number;
}

/** YOLO model output format: [x1, y1, x2, y2, confidence, class_id] */
export type YOLODetection = [
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  confidence: number,
  classId: number,
];

/** Options for YOLO output processing */
export interface YOLOProcessOptions {
  scaleX?: number;
  scaleY?: number;
  imageWidth?: number;
  imageHeight?: number;
}

// ============================================================================
// App State Types
// ============================================================================

/** Tab identifiers for navigation */
export type AppTab = "camera" | "upload" | "manual" | "dashboard";

/** Storage key constants */
export interface StorageKeys {
  policyType: string;
  onboardingComplete: string;
  manualItems: string;
  confidenceThreshold: string;
  cameraPermissionDenied: string;
  manualModeEnabled: string;
  privacyMode: string;
  activeSimulatorType: string;
}

/** Default/initial state values */
export interface AppState {
  policyType: PolicyType;
  onboardingComplete: boolean;
  activeTab: AppTab;
  detectedItems: Map<string, DetectedItem>;
  manualItems: ManualItem[];
  selectedItemId: string | null;
  confidenceThreshold: number;
  // New feature state
  privacyMode: PrivacyModeState;
  activeSimulatorType: DisasterType | null;
  hazardWarnings: HazardWarning[];
  simulationResult: DisasterSimulationResult | null;
  recommendations: CoverageRecommendation[];
}

/** Input type for updating detected items */
export type DetectedItemsInput = Map<string, DetectedItem> | Record<string, DetectedItem>;

/** Gemini API coverage response */
export interface GeminiCoverageResponse {
  status: CoverageStatus;
  reasoning: string;
  confidence: number;
}

/** Context value shape for AppContext */
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
  // New state
  privacyMode: PrivacyModeState;
  activeSimulatorType: DisasterType | null;
  hazardWarnings: HazardWarning[];
  simulationResult: DisasterSimulationResult | null;
  recommendations: CoverageRecommendation[];
  // Actions
  setPolicyType: (policy: PolicyType) => void;
  completeOnboarding: () => void;
  setActiveTab: (tab: AppTab) => void;
  updateDetectedItems: (input: DetectedItemsInput) => void;
  addManualItem: (item: ManualItem) => void;
  removeManualItem: (itemId: string) => void;
  updateManualItem: (itemId: string, updates: Partial<ManualItem>) => void;
  setSelectedItem: (itemId: string | null) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setCameraPermissionDenied: (denied: boolean) => void;
  enableManualMode: () => void;
  disableManualMode: () => void;
  resetCameraPermission: () => void;
  // New actions
  setPrivacyMode: (enabled: boolean) => void;
  setActiveSimulatorType: (type: DisasterType | null) => void;
  setHazardWarnings: (warnings: HazardWarning[]) => void;
  setSimulationResult: (result: DisasterSimulationResult | null) => void;
  setRecommendations: (recommendations: CoverageRecommendation[]) => void;
}

// ============================================================================
// Value Calculation Types
// ============================================================================

/** Item breakdown with coverage status for dashboard */
export interface ItemBreakdown {
  id: string;
  category: string;
  estimatedValue: number;
  status: CoverageStatus;
  color: CoverageColor;
  source: "detected" | "manual";
  confidence?: number;
}

/** Result of value calculations for dashboard */
export interface ValueCalculationResult {
  totalValue: number;
  protectedValue: number;
  unprotectedValue: number;
  coverageGapPercentage: number;
  items: ItemBreakdown[];
}

// ============================================================================
// Gemini API Types
// ============================================================================

/** Gemini client configuration */
export interface GeminiClient {
  apiKey: string;
  isConfigured: true;
  askAboutCoverage: (
    item: string,
    policyType: PolicyType,
  ) => Promise<GeminiCoverageResponse | null>;
}

// ============================================================================
// Component Props Types
// ============================================================================

/** Props for policy selector component */
export interface PolicySelectorProps {
  variant?: "default" | "compact";
  detectedItems: DetectedItem[];
  manualItems: ManualItem[];
}

/** Item click data for camera view */
export interface CameraItemClickData {
  id: string;
  category: string;
  estimatedValue: number;
  status: CoverageStatus;
  source: "camera";
}

/** Props for camera view component */
export interface CameraViewProps {
  onError?: (error: Error) => void;
  onManualMode?: () => void;
  onItemClick?: (item: CameraItemClickData) => void;
}

/** Props for dashboard component */
export interface DashboardProps {
  detectedItems: DetectedItem[];
  manualItems: ManualItem[];
  policyType: PolicyType;
  onItemClick: (item: ItemBreakdown) => void;
}

/** Modal item type - combines item types with source info */
export type ModalItem = (DetectedItem | ManualItem) & {
  source: "camera" | "dashboard";
};

/** Props for detail modal */
export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ModalItem | null;
  policyType: PolicyType;
}

/** Props for add item form */
export interface AddItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: ManualItem | null;
  onSave?: (item: ManualItem) => void;
}

/** Props for tab navigation */
export interface TabNavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  className?: string;
}

/** Props for coverage overlay */
export interface CoverageOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  detections: Detection[];
  policyType: PolicyType;
  confidenceThreshold?: number;
  onItemClick?: (item: CameraItemClickData) => void;
}

/** Props for confidence threshold slider */
export interface ConfidenceThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  defaultCollapsed?: boolean;
  className?: string;
}

/** Props for onboarding flow */
export interface OnboardingFlowProps {
  onComplete: () => void;
}

// ============================================================================
// Mock Detection Types
// ============================================================================

/** Mock detection data for testing */
export interface MockDetection {
  boundingBox: BoundingBox;
  categories: DetectionCategory[];
}

// ============================================================================
// Utility Types
// ============================================================================

/** Animation props for framer-motion */
export interface AnimationProps {
  initial?: boolean | object;
  animate?: object;
  exit?: object;
  transition?: object;
}

/** Test environment globals */
export interface TestGlobals {
  __TESTING__?: boolean;
}

// ============================================================================
// Hazard & Disaster Types
// ============================================================================

export type DisasterType = "fire" | "theft" | "flood" | "earthquake";

export interface HazardWarning {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  message: string;
  relatedCategories: string[];
  positive?: boolean;
}

export interface DisasterImpactItem {
  itemId: string;
  category: string;
  estimatedValue: number;
  lossAmount: number;
  coveredAmount: number;
  outOfPocketAmount: number;
}

export interface DisasterSimulationResult {
  type: DisasterType;
  totalLoss: number;
  currentPolicyOutOfPocket: number;
  recommendedPolicyOutOfPocket: number;
  uncoveredItems: number;
  impactedItems: DisasterImpactItem[];
  insight: string;
}

// ============================================================================
// Recommendation & Privacy Types
// ============================================================================

export interface CoverageRecommendation {
  id: string;
  title: string;
  description: string;
  estimatedMonthlyCost?: number;
  exposureReductionPercent?: number;
  priority: "high" | "medium" | "low";
}

export interface PrivacyModeState {
  enabled: boolean;
  localOnlyMessage: string;
}
