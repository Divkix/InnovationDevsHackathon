import { motion } from "framer-motion";
import { Bug, Camera, ChevronRight, Hand, RefreshCw, Shield, Sparkles, X } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useGemini } from "../../hooks/useGemini";
import { useObjectDetection } from "../../hooks/useObjectDetection";
import type { UseYOLODetectionReturn } from "../../hooks/useYOLODetection";
import type {
  AppContextValue,
  CameraViewProps,
  DetectedItem,
  Detection,
  GeminiRoomScanResponse,
  OwnershipRecord,
  ValuationRecord,
} from "../../types";
import { lookupCoverage } from "../../utils/coverageLookup";
import { getCopy } from "../../utils/language";
import { speakText } from "../../utils/speech";
import { ConfidenceThresholdSlider } from "../ConfidenceThresholdSlider/ConfidenceThresholdSlider";
import { CoverageOverlay } from "../CoverageOverlay/CoverageOverlay";

const STABLE_DETECTION_MS = 650;
const STALE_CANDIDATE_MS = 1200;
const PROMOTED_ITEM_TTL_MS = 2200;
const GEMINI_PROMOTED_ITEM_TTL_MS = 5200;
const PROMOTION_GRID_SIZE = 96;
const MIN_PROMOTION_AREA = 9_000;
const DETECTION_INTERVAL_MS = 180;
const GEMINI_PROMOTION_INTERVAL_MS = 2200;
const AUTO_ROOM_SCAN_INTERVAL_MS = 4500;
const GEMINI_CAPTURE_MAX_EDGE = 896;
const CAMERA_READY_TIMEOUT_MS = 900;

function createDetectedOwnershipRecord(category: string, agentSummary?: string): OwnershipRecord {
  return {
    status: "unverified",
    agentSummary,
    verifiedAt: agentSummary ? new Date().toISOString() : undefined,
    evidence: {
      capturedAt: new Date().toISOString(),
      sourceNotes: `Auto-created from ${category} detection`,
    },
    fraudFlags: [],
    ledger: [],
  };
}

function createDetectedValuationRecord(
  estimatedValue: number,
  source: ValuationRecord["source"] = "ai",
): ValuationRecord {
  return {
    estimatedValue,
    finalValue: estimatedValue,
    source,
  };
}

interface PromotionCandidate {
  id: string;
  detection: Detection;
  firstSeenAt: number;
  lastSeenAt: number;
  seenFrames: number;
  bestScore: number;
}

interface PromotedItemState {
  item: DetectedItem;
  lastSeenAt: number;
}

function captureVideoFrame(video: HTMLVideoElement): string | null {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return null;
  }

  const scale = Math.min(1, GEMINI_CAPTURE_MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.72).split(",")[1] || null;
}

async function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera video did not become ready in time"));
    }, CAMERA_READY_TIMEOUT_MS);

    const handleReady = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", handleReady);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
    };

    video.addEventListener("loadedmetadata", handleReady, { once: true });
    video.addEventListener("loadeddata", handleReady, { once: true });
    video.addEventListener("canplay", handleReady, { once: true });
  });
}

async function settleVideoStartup(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await Promise.race([
    waitForVideoReady(video),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 450);
    }),
  ]);
}

function hasRenderableVideoFrame(video: HTMLVideoElement | null): boolean {
  return Boolean(video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
}

function normalizeGeminiObjectLabel(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function mapGeminiObjectToCategory(value: string): string | null {
  const normalized = normalizeGeminiObjectLabel(value);

  if (!normalized) return null;
  if (
    normalized.includes("red bull") ||
    normalized.includes("energy drink") ||
    normalized.includes("soda can") ||
    normalized === "can" ||
    normalized.includes("drink can")
  ) {
    return "bottle";
  }

  const aliases: Array<[string, string]> = [
    ["tv", "tv"],
    ["television", "tv"],
    ["monitor", "tv"],
    ["phone", "cell phone"],
    ["cellphone", "cell phone"],
    ["mobile", "cell phone"],
    ["laptop", "laptop"],
    ["computer", "laptop"],
    ["chair", "chair"],
    ["couch", "couch"],
    ["sofa", "couch"],
    ["book", "book"],
    ["keyboard", "keyboard"],
    ["remote", "remote"],
    ["mouse", "mouse"],
    ["cup", "cup"],
    ["mug", "cup"],
    ["glass", "cup"],
    ["bottle", "bottle"],
  ];

  for (const [needle, category] of aliases) {
    if (normalized.includes(needle)) {
      return category;
    }
  }

  return null;
}

function shouldRetryCameraWithoutFacingMode(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return [
    "OverconstrainedError",
    "ConstraintNotSatisfiedError",
    "NotReadableError",
    "AbortError",
  ].includes(error.name);
}

function getDetectionScore(detection: Detection): number {
  return detection.categories?.[0]?.score || 0;
}

function getDetectionCategory(detection: Detection): string {
  return detection.categories?.[0]?.categoryName || "unknown";
}

function getBoundingBoxArea(detection: Detection): number {
  const width = Math.max(0, detection.boundingBox?.width || 0);
  const height = Math.max(0, detection.boundingBox?.height || 0);
  return width * height;
}

function getPromotionAreaThreshold(category: string): number {
  if (["bottle", "cup", "cell phone", "remote", "mouse"].includes(category)) {
    return 2_800;
  }

  if (["book", "keyboard", "sports ball"].includes(category)) {
    return 4_200;
  }

  return MIN_PROMOTION_AREA;
}

function getPromotionConfidenceThreshold(category: string, baseThreshold: number): number {
  if (["bottle", "cup", "cell phone", "remote", "mouse"].includes(category)) {
    return Math.max(0.28, Math.min(baseThreshold, 0.42));
  }

  if (["book", "keyboard", "sports ball"].includes(category)) {
    return Math.max(0.32, Math.min(baseThreshold, 0.48));
  }

  return Math.max(baseThreshold, 0.55);
}

function getPromotionId(detection: Detection): string {
  const category = getDetectionCategory(detection);
  const gridX = Math.round((detection.boundingBox?.originX || 0) / PROMOTION_GRID_SIZE);
  const gridY = Math.round((detection.boundingBox?.originY || 0) / PROMOTION_GRID_SIZE);
  return `${category}-${gridX}-${gridY}`;
}

function toDetectedItem(
  id: string,
  detection: Detection,
  policyType: AppContextValue["policyType"],
): DetectedItem {
  const category = getDetectionCategory(detection);
  const confidence = getDetectionScore(detection);
  const coverage = lookupCoverage(category, policyType);

  return {
    id,
    category,
    confidence,
    coverage,
    ownership: createDetectedOwnershipRecord(category),
    valuation: createDetectedValuationRecord(coverage.estimatedValue, "ai"),
    boundingBox: detection.boundingBox,
    categories: detection.categories || [
      { categoryName: category, score: confidence, displayName: category },
    ],
  };
}

function createGeminiDetectedItem(
  id: string,
  category: string,
  policyType: AppContextValue["policyType"],
  estimatedValue?: number,
): DetectedItem {
  const coverage = lookupCoverage(category, policyType);

  return {
    id,
    category,
    confidence: 0.41,
    coverage: typeof estimatedValue === "number" ? { ...coverage, estimatedValue } : coverage,
    ownership: createDetectedOwnershipRecord(category),
    valuation: createDetectedValuationRecord(
      typeof estimatedValue === "number" ? estimatedValue : coverage.estimatedValue,
      "ai",
    ),
    boundingBox: {
      originX: 0,
      originY: 0,
      width: 0,
      height: 0,
    },
    categories: [
      {
        categoryName: category,
        score: 0.41,
        displayName: category,
      },
    ],
  };
}

function captureFrameBase64(video: HTMLVideoElement | null): { data: string; mimeType: string } {
  const canvas = document.createElement("canvas");
  const width = video?.videoWidth || 960;
  const height = video?.videoHeight || 540;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create capture context");
  }

  if (video && video.readyState >= 2) {
    context.drawImage(video, 0, 0, width, height);
  } else {
    context.fillStyle = "#111827";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#f9fafb";
    context.font = "bold 24px sans-serif";
    context.fillText("InsureScope mock scan", 32, 56);
  }

  return {
    mimeType: "image/jpeg",
    data: canvas.toDataURL("image/jpeg", 0.76).split(",")[1] || "",
  };
}

/**
 * CameraView component - Main camera component for InsureScope
 *
 * Features:
 * - Requests camera via getUserMedia with facingMode 'environment' (mobile) or 'user' (desktop)
 * - Displays video feed with CoverageOverlay for detection visualization
 * - Integrates useObjectDetection hook for object detection
 * - Shows loading spinner during model initialization
 * - Shows error states for camera permission denial, unsupported browser, or model loading failure
 * - Stops camera tracks on unmount
 * - Runs detection loop via requestAnimationFrame
 * - Displays current policy type indicator badge
 * - Passes detections to CoverageOverlay for color-coded bounding box rendering
 * - Supports mock detection mode for automated testing (?mock=true or localStorage)
 *
 * @param props - Component props
 * @returns React element
 */
export function CameraView({ onError, onManualMode, onItemClick }: CameraViewProps): ReactElement {
  const {
    policyType,
    updateDetectedItems,
    addManualItem,
    confidenceThreshold,
    setConfidenceThreshold,
    language,
    voiceEnabled,
    ttsEnabled,
    manualItems,
    setActiveTab,
  }: AppContextValue = useAppContext();
  const gemini = useGemini();
  const copy = getCopy(language);
  const {
    detect,
    isLoaded,
    error: modelError,
    isMockMode,
  }: UseYOLODetectionReturn = useObjectDetection(confidenceThreshold);

  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const promotionCandidatesRef = useRef<Map<string, PromotionCandidate>>(new Map());
  const promotedItemsRef = useRef<Map<string, PromotedItemState>>(new Map());
  const lastPublishedSignatureRef = useRef<string>("");
  const geminiInFlightRef = useRef(false);
  const lastGeminiAtRef = useRef(0);
  const lastDetectionAtRef = useRef(0);

  // State for camera, errors, and detections
  const [cameraError, setCameraError] = useState<Error | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isAiScanLoading, setIsAiScanLoading] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<GeminiRoomScanResponse | null>(null);
  const [aiScanError, setAiScanError] = useState<string | null>(null);
  const [isAiPanelVisible, setIsAiPanelVisible] = useState(false);
  const [addedManualItemKeys, setAddedManualItemKeys] = useState<Set<string>>(new Set());

  /**
   * Detect if device is mobile
   */
  const isMobile = useCallback((): boolean => {
    const userAgent =
      navigator.userAgent ||
      navigator.vendor ||
      (window as unknown as { opera?: string }).opera ||
      "";
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase(),
    );
  }, []);

  const isSafari = useCallback((): boolean => {
    const userAgent = navigator.userAgent || "";
    return /safari/i.test(userAgent) && !/chrome|chromium|android/i.test(userAgent);
  }, []);

  /**
   * Request camera access with appropriate facing mode
   * In mock mode, skips camera request and creates a simulated ready state
   */
  const requestCamera = useCallback(async (): Promise<void> => {
    // Skip camera request in mock mode
    if (isMockMode) {
      setIsRequestingCamera(false);
      setCameraError(null);
      setIsCameraReady(true);
      return;
    }

    setIsRequestingCamera(true);
    setCameraError(null);
    setIsCameraReady(false);

    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser not supported");
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      const preferredConstraints: MediaStreamConstraints = {
        video: {
          facingMode: isMobile() ? "environment" : "user",
          width: { ideal: 960 },
          height: { ideal: 540 },
        },
        audio: false,
      };

      const fallbackConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const safariConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      let stream: MediaStream;
      if (isSafari()) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(safariConstraints);
        } catch (error) {
          if (!shouldRetryCameraWithoutFacingMode(error)) {
            throw error;
          }
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
        } catch (error) {
          if (!shouldRetryCameraWithoutFacingMode(error)) {
            throw error;
          }
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }
      }

      // Store stream reference for cleanup
      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        if (typeof videoRef.current.play === "function") {
          await videoRef.current.play().catch(() => undefined);
        }
        // Safari can keep the stream visually usable while still delaying
        // readiness events. Unblock the feed now and let detection wait for
        // a real frame in the background.
        setIsCameraReady(true);
        void settleVideoStartup(videoRef.current).catch(() => undefined);
      }
    } catch (err) {
      let errorMessage = "Camera access failed";

      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMessage = "Camera access denied";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No camera found";
        } else if (err.message === "Browser not supported") {
          errorMessage = "Browser not supported";
        } else {
          errorMessage = err.message || "Camera error";
        }
      }

      const error = new Error(errorMessage);
      setCameraError(error);
      setIsCameraReady(false);
      if (onError) onError(error);
    } finally {
      setIsRequestingCamera(false);
    }
  }, [isMobile, isMockMode, isSafari, onError]);

  /**
   * Stop all camera tracks
   */
  const stopCamera = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  /**
   * Handle retry button click
   */
  const handleRetry = useCallback((): void => {
    if (modelError) {
      // Reload the page to reinitialize the model
      window.location.reload();
    } else {
      requestCamera();
    }
  }, [modelError, requestCamera]);

  /**
   * Handle manual mode button click
   */
  const handleManualMode = useCallback((): void => {
    if (onManualMode) {
      onManualMode();
    }
  }, [onManualMode]);

  /**
   * Detection loop using requestAnimationFrame
   * In mock mode, runs detection without requiring video readyState
   */
  const detectionLoop = useCallback(
    async (timestamp: number): Promise<void> => {
      const reconcilePromotedItems = (detected: Detection[]): void => {
        const nextCandidateIds = new Set<string>();
        const stableCandidates: PromotionCandidate[] = [];

        for (const detection of detected) {
          const score = getDetectionScore(detection);
          const area = getBoundingBoxArea(detection);
          const category = getDetectionCategory(detection);
          const promotionAreaThreshold = getPromotionAreaThreshold(category);
          const promotionConfidenceThreshold = getPromotionConfidenceThreshold(
            category,
            confidenceThreshold,
          );

          if (score < confidenceThreshold || area < promotionAreaThreshold) {
            continue;
          }

          const id = getPromotionId(detection);
          nextCandidateIds.add(id);

          const existing = promotionCandidatesRef.current.get(id);
          const candidate: PromotionCandidate = existing
            ? {
                ...existing,
                detection,
                lastSeenAt: timestamp,
                seenFrames: existing.seenFrames + 1,
                bestScore: Math.max(existing.bestScore, score),
              }
            : {
                id,
                detection,
                firstSeenAt: timestamp,
                lastSeenAt: timestamp,
                seenFrames: 1,
                bestScore: score,
              };

          promotionCandidatesRef.current.set(id, candidate);

          const isStable =
            candidate.seenFrames >= 3 &&
            timestamp - candidate.firstSeenAt >= STABLE_DETECTION_MS &&
            candidate.bestScore >= promotionConfidenceThreshold;

          if (!isStable) {
            continue;
          }

          stableCandidates.push(candidate);

          const promotedItem = toDetectedItem(id, detection, policyType);
          promotedItemsRef.current.set(id, {
            item: promotedItem,
            lastSeenAt: timestamp,
          });
        }

        for (const [id, candidate] of promotionCandidatesRef.current.entries()) {
          const expired = timestamp - candidate.lastSeenAt > STALE_CANDIDATE_MS;
          if (expired || !nextCandidateIds.has(id)) {
            promotionCandidatesRef.current.delete(id);
          }
        }

        for (const [id, promoted] of promotedItemsRef.current.entries()) {
          if (timestamp - promoted.lastSeenAt > PROMOTED_ITEM_TTL_MS) {
            promotedItemsRef.current.delete(id);
          }
        }

        const nextDetectedItems = new Map<string, DetectedItem>();
        for (const [id, promoted] of promotedItemsRef.current.entries()) {
          nextDetectedItems.set(id, promoted.item);
        }

        const nextSignature = Array.from(nextDetectedItems.keys()).sort().join("|");
        if (nextSignature !== lastPublishedSignatureRef.current) {
          lastPublishedSignatureRef.current = nextSignature;
          updateDetectedItems(nextDetectedItems);
        }

        if (
          gemini &&
          stableCandidates.length > 0 &&
          !geminiInFlightRef.current &&
          timestamp - lastGeminiAtRef.current >= GEMINI_PROMOTION_INTERVAL_MS &&
          videoRef.current
        ) {
          const imageBase64 = captureVideoFrame(videoRef.current);
          if (imageBase64) {
            geminiInFlightRef.current = true;
            lastGeminiAtRef.current = timestamp;

            void gemini
              .analyzeRoom({
                imageBase64,
                mimeType: "image/jpeg",
                language,
                policyType,
              })
              .then((result) => {
                if (!result) {
                  return;
                }

                const activeCategories = new Set(
                  Array.from(promotedItemsRef.current.values()).map((entry) => entry.item.category),
                );

                for (const item of result.items) {
                  const category = mapGeminiObjectToCategory(item.category) ?? item.category;
                  if (!category || activeCategories.has(category)) {
                    continue;
                  }

                  const id = `gemini-${category}`;
                  promotedItemsRef.current.set(id, {
                    item: createGeminiDetectedItem(id, category, policyType, item.estimatedValue),
                    lastSeenAt: performance.now() + GEMINI_PROMOTED_ITEM_TTL_MS,
                  });
                  activeCategories.add(category);
                }

                for (const object of result.objects) {
                  const category = mapGeminiObjectToCategory(object);
                  if (!category || activeCategories.has(category)) {
                    continue;
                  }

                  const id = `gemini-${category}`;
                  promotedItemsRef.current.set(id, {
                    item: createGeminiDetectedItem(id, category, policyType),
                    lastSeenAt: performance.now() + GEMINI_PROMOTED_ITEM_TTL_MS,
                  });
                  activeCategories.add(category);
                }
              })
              .catch((error) => {
                console.warn("Gemini room enrichment failed:", error);
              })
              .finally(() => {
                geminiInFlightRef.current = false;
              });
          }
        }
      };

      // In mock mode, run detection directly without video element check
      if (isMockMode && isLoaded) {
        if (timestamp - lastDetectionAtRef.current < DETECTION_INTERVAL_MS) {
          animationFrameRef.current = requestAnimationFrame(detectionLoop);
          return;
        }

        lastDetectionAtRef.current = timestamp;
        const results = await detect(null, timestamp);

        // Update detections for CoverageOverlay
        setDetections(results.detections || []);
        reconcilePromotedItems(results.detections || []);

        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(detectionLoop);
        return;
      }

      // Normal mode: require video element
      if (!videoRef.current) return;

      // Run detection if video is playing and model is loaded
      if (isCameraReady && hasRenderableVideoFrame(videoRef.current) && isLoaded) {
        if (timestamp - lastDetectionAtRef.current < DETECTION_INTERVAL_MS) {
          animationFrameRef.current = requestAnimationFrame(detectionLoop);
          return;
        }

        lastDetectionAtRef.current = timestamp;
        const results = await detect(videoRef.current, timestamp);

        // Update detections for CoverageOverlay
        setDetections(results.detections || []);
        reconcilePromotedItems(results.detections || []);
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(detectionLoop);
    },
    [
      confidenceThreshold,
      detect,
      gemini,
      isLoaded,
      language,
      policyType,
      updateDetectedItems,
      isMockMode,
      isCameraReady,
    ],
  );

  /**
   * Get policy display name and color - State Farm Branding
   */
  const getPolicyInfo = useCallback(() => {
    const policyMap = {
      renters: { name: "Renter's Insurance", color: "bg-[#E31837]", textColor: "text-white" },
      homeowners: { name: "Homeowner's Insurance", color: "bg-[#E31837]", textColor: "text-white" },
      auto: { name: "Auto Insurance", color: "bg-[#E31837]", textColor: "text-white" },
      none: { name: "No Insurance", color: "bg-gray-700", textColor: "text-white" },
    };
    return policyMap[policyType] || policyMap.renters;
  }, [policyType]);

  // Request camera on mount (if not in mock mode)
  useEffect(() => {
    requestCamera();

    // Cleanup on unmount
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [requestCamera, stopCamera]);

  // Start detection loop when video is ready and model is loaded
  useEffect(() => {
    if (isLoaded && !cameraError && !modelError) {
      animationFrameRef.current = requestAnimationFrame(detectionLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoaded, cameraError, modelError, detectionLoop]);

  // Report model errors
  useEffect(() => {
    if (modelError && onError) {
      onError(modelError);
    }
  }, [modelError, onError]);

  // Determine current error state
  const currentError = modelError || cameraError;
  const isLoadingModel = !isLoaded && !modelError;
  const isCameraPermissionError = cameraError?.message?.includes("denied");
  const isBrowserUnsupported = cameraError?.message?.includes("Browser not supported");
  const isModelError = !!modelError;

  const policyInfo = getPolicyInfo();

  const applyAiScanItems = useCallback(
    (result: GeminiRoomScanResponse | null, prefix: string): void => {
      if (!result?.items?.length) {
        return;
      }

      const nextItems = new Map(promotedItemsRef.current);

      for (const item of result.items) {
        const category = mapGeminiObjectToCategory(item.category) ?? item.category;
        if (!category) {
          continue;
        }

        const id = `${prefix}-${category}`;
        nextItems.set(id, {
          item: createGeminiDetectedItem(id, category, policyType, item.estimatedValue),
          lastSeenAt: performance.now() + GEMINI_PROMOTED_ITEM_TTL_MS,
        });
      }

      promotedItemsRef.current = nextItems;
      updateDetectedItems(
        new Map(Array.from(nextItems.entries()).map(([id, promoted]) => [id, promoted.item])),
      );
    },
    [policyType, updateDetectedItems],
  );

  const buildManualItemKey = useCallback((label: string, category: string): string => {
    return `${label.trim().toLowerCase()}::${category.trim().toLowerCase()}`;
  }, []);

  const addAiItemToManualList = useCallback(
    (item: GeminiRoomScanResponse["items"][number]): void => {
      const category = mapGeminiObjectToCategory(item.category) ?? item.category;
      if (!category) {
        return;
      }

      const key = buildManualItemKey(item.label, category);
      const alreadyExists = manualItems.some(
        (manualItem) =>
          buildManualItemKey(manualItem.name || manualItem.category, manualItem.category) === key,
      );

      if (alreadyExists) {
        setAddedManualItemKeys((prev) => new Set(prev).add(key));
        return;
      }

      addManualItem({
        id: `manual-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: item.label,
        category,
        estimatedValue: item.estimatedValue,
        ownership: createDetectedOwnershipRecord(category, item.agentNote),
        valuation: createDetectedValuationRecord(item.estimatedValue, "ai"),
      });
      setAddedManualItemKeys((prev) => new Set(prev).add(key));
    },
    [addManualItem, buildManualItemKey, manualItems],
  );

  const addAllAiItemsToManualList = useCallback((): void => {
    if (!aiScanResult?.items?.length) {
      return;
    }

    for (const item of aiScanResult.items) {
      addAiItemToManualList(item);
    }
  }, [addAiItemToManualList, aiScanResult]);

  const performAiRoomScan = useCallback(
    async ({
      revealPanel,
      speakSummary,
      prefix,
    }: {
      revealPanel: boolean;
      speakSummary: boolean;
      prefix: string;
    }): Promise<void> => {
      if (!gemini || isAiScanLoading) {
        return;
      }

      if (revealPanel) {
        setIsAiPanelVisible(true);
      }

      setIsAiScanLoading(true);
      setAiScanError(null);

      try {
        const frame = captureFrameBase64(videoRef.current);
        const detectedCategories = detections
          .map((detection) => detection.categories?.[0]?.categoryName || "")
          .filter(Boolean);

        const result = await gemini.analyzeRoom({
          imageBase64: frame.data,
          mimeType: frame.mimeType,
          policyType,
          detectedCategories,
          language,
        });

        setAiScanResult(result);
        applyAiScanItems(result, prefix);

        if (speakSummary && voiceEnabled && ttsEnabled && result?.summary) {
          speakText(result.summary, { language, rate: 0.98 });
        }
      } catch (error) {
        setAiScanError(error instanceof Error ? error.message : "AI room scan failed.");
      } finally {
        setIsAiScanLoading(false);
      }
    },
    [
      applyAiScanItems,
      detections,
      gemini,
      isAiScanLoading,
      language,
      policyType,
      ttsEnabled,
      voiceEnabled,
    ],
  );

  const handleAiRoomScan = useCallback(async (): Promise<void> => {
    if (!gemini) {
      return;
    }

    await performAiRoomScan({
      revealPanel: true,
      speakSummary: true,
      prefix: "gemini-manual",
    });
  }, [gemini, performAiRoomScan]);

  useEffect(() => {
    if (!gemini || !isLoaded || cameraError || modelError || isMockMode) {
      return;
    }

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || isAiScanLoading) {
        return;
      }

      void performAiRoomScan({
        revealPanel: false,
        speakSummary: false,
        prefix: "gemini-auto",
      });
    }, AUTO_ROOM_SCAN_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [cameraError, gemini, isAiScanLoading, isLoaded, isMockMode, modelError, performAiRoomScan]);

  // Loading state with State Farm branding and timeout warning
  if (isLoadingModel) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        data-testid="camera-loading"
        className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-gray-700 border-t-[#E31837]" />
        </motion.div>
        <p className="text-white text-base sm:text-lg font-semibold">Loading AI Model...</p>
        <p className="text-gray-400 text-xs sm:text-sm mt-2 text-center px-4">
          Please wait while we initialize the object detector
        </p>
        <p className="text-gray-500 text-xs mt-4 text-center px-4">
          (This may take up to 15 seconds)
        </p>
      </motion.div>
    );
  }

  // Error state - Camera Denial Fallback with State Farm branding
  if (currentError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="camera-error"
        className="flex flex-col justify-center h-full min-h-[350px] bg-[var(--swiss-fg)] text-[var(--swiss-bg)] p-6 sm:p-10 text-left swiss-grid-pattern"
      >
        <div className="mb-6 flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--swiss-accent)] border-2 border-white flex items-center justify-center">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div>
            <div className="swiss-label text-[var(--swiss-accent)] mb-2">01. Access</div>
            <h3 className="swiss-display text-3xl sm:text-5xl">
              {isCameraPermissionError
                ? copy.common.cameraAccessNeeded
                : isBrowserUnsupported
                  ? copy.common.browserNotSupported
                  : isModelError
                    ? copy.common.aiModelFailedToLoad
                    : copy.common.cameraError}
            </h3>
          </div>
        </div>

        <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-white/75 mb-8">
          {isCameraPermissionError
            ? copy.common.cameraDeniedBody
            : isBrowserUnsupported
              ? copy.common.browserUnsupportedBody
              : isModelError
                ? modelError?.message?.includes("timeout")
                  ? copy.common.aiModelFailedBody
                  : copy.common.aiModelFailedBody
                : currentError.message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="retry-button"
            onClick={handleRetry}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-4 swiss-button text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            {isCameraPermissionError
              ? copy.common.retryPermission
              : isModelError
                ? copy.common.reloadPage
                : copy.common.tryAgain}
          </motion.button>

          {(isCameraPermissionError || isBrowserUnsupported) && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="manual-mode-button"
              onClick={handleManualMode}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 swiss-button-secondary text-xs"
            >
              <Hand className="w-4 h-4" />
              {copy.common.useManualMode}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {(isCameraPermissionError || isBrowserUnsupported) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-xs sm:text-sm text-white/55 max-w-lg swiss-label"
          >
            {copy.common.manualModeTip}
          </motion.p>
        )}
      </motion.div>
    );
  }

  // Camera view state
  return (
    <div className="relative w-full h-full bg-[var(--swiss-fg)] overflow-hidden">
      {/* Policy type badge */}
      <div
        data-testid="policy-badge"
        className="absolute top-4 left-4 z-20 px-4 py-2 bg-[var(--swiss-bg)] border-2 border-[var(--swiss-border)]"
      >
        <span className="swiss-label text-[var(--swiss-fg)]">{policyInfo.name}</span>
      </div>

      {gemini && (
        <div className="absolute left-4 top-18 z-20 max-w-md space-y-3">
          <button
            type="button"
            onClick={() => void handleAiRoomScan()}
            disabled={isAiScanLoading}
            className="inline-flex items-center gap-2 px-4 py-3 swiss-button text-xs disabled:cursor-wait disabled:opacity-70"
          >
            <Sparkles className="h-4 w-4 text-[#E31837]" />
            {isAiScanLoading ? copy.common.aiScanning : copy.common.aiRoomScan}
          </button>

          {isAiPanelVisible && (aiScanResult || aiScanError) && (
            <div className="swiss-panel max-w-md bg-[var(--swiss-bg)] max-h-[min(72vh,44rem)] overflow-hidden">
              <div className="max-h-[min(72vh,44rem)] overflow-y-auto p-4 pr-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="swiss-label text-[var(--swiss-accent)]">
                    {copy.common.geminiRoomRead}
                  </div>
                  <button
                    type="button"
                    aria-label="Close AI room scan"
                    onClick={() => setIsAiPanelVisible(false)}
                    className="inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--swiss-border)] bg-[var(--swiss-bg)] text-[var(--swiss-fg)] transition-colors hover:bg-[var(--swiss-muted)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {aiScanError ? (
                  <p className="text-sm text-[var(--swiss-accent)]">{aiScanError}</p>
                ) : aiScanResult ? (
                  <div className="space-y-3 text-sm text-gray-800 text-left">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={addAllAiItemsToManualList}
                        className="inline-flex items-center justify-center border-2 border-[var(--swiss-border)] bg-[var(--swiss-fg)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[var(--swiss-accent)]"
                      >
                        {copy.common.addAllToList}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("dashboard")}
                        className="inline-flex items-center justify-center border-2 border-[var(--swiss-border)] bg-[var(--swiss-bg)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--swiss-fg)] transition-colors hover:bg-[var(--swiss-muted)]"
                      >
                        {copy.common.openDashboard}
                      </button>
                    </div>
                    <p className="text-base leading-relaxed">{aiScanResult.summary}</p>
                    {aiScanResult.objects.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {aiScanResult.objects.map((object) => (
                          <span
                            key={object}
                            className="border-2 border-[var(--swiss-border)] bg-[var(--swiss-muted)] px-2 py-1 swiss-label text-[var(--swiss-fg)]"
                          >
                            {object}
                          </span>
                        ))}
                      </div>
                    )}
                    {aiScanResult.items.length > 0 && (
                      <div className="space-y-2">
                        <div className="swiss-label text-gray-500">Detected Inventory</div>
                        <div className="space-y-2">
                          {aiScanResult.items.map((item) => (
                            <div
                              key={`${item.category}-${item.label}`}
                              className="border-2 border-[var(--swiss-border)] bg-[var(--swiss-muted)] p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="swiss-label text-[var(--swiss-accent)]">
                                    {item.label}
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed">{item.agentNote}</p>
                                </div>
                                <div className="text-right">
                                  <div className="swiss-label text-gray-500">{item.category}</div>
                                  <div className="text-base font-semibold">
                                    ${item.estimatedValue.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => addAiItemToManualList(item)}
                                  disabled={addedManualItemKeys.has(
                                    buildManualItemKey(
                                      item.label,
                                      mapGeminiObjectToCategory(item.category) ?? item.category,
                                    ),
                                  )}
                                  className="inline-flex items-center justify-center border-2 border-[var(--swiss-border)] bg-[var(--swiss-bg)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--swiss-fg)] transition-colors hover:bg-[var(--swiss-accent)] hover:text-white disabled:cursor-default disabled:bg-[var(--swiss-fg)] disabled:text-white"
                                >
                                  {addedManualItemKeys.has(
                                    buildManualItemKey(
                                      item.label,
                                      mapGeminiObjectToCategory(item.category) ?? item.category,
                                    ),
                                  )
                                    ? copy.common.added
                                    : copy.common.addToList}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiScanResult.priorities.length > 0 && (
                      <div>
                        <div className="swiss-label text-gray-500">{copy.common.priorities}</div>
                        <ul className="mt-2 space-y-1 text-gray-700">
                          {aiScanResult.priorities.map((priority) => (
                            <li key={priority}>• {priority}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiScanResult.nextSteps.length > 0 && (
                      <div>
                        <div className="swiss-label text-gray-500">{copy.common.nextSteps}</div>
                        <ul className="mt-2 space-y-1 text-gray-700">
                          {aiScanResult.nextSteps.map((step) => (
                            <li key={step}>• {step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mock mode indicator */}
      {isMockMode && (
        <div
          data-testid="mock-mode-indicator"
          className="absolute top-4 right-4 z-20 px-3 py-2 bg-[var(--swiss-muted)] border-2 border-[var(--swiss-border)] flex items-center gap-2"
        >
          <Bug className="w-3 h-3 text-[var(--swiss-accent)]" />
          <span className="swiss-label text-[var(--swiss-fg)]">{copy.common.mockMode}</span>
        </div>
      )}

      {/* Video element (hidden in mock mode, shown in normal mode) */}
      {!isMockMode && (
        <video
          ref={videoRef}
          data-testid="camera-video"
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      )}

      {!isMockMode &&
        !isRequestingCamera &&
        !cameraError &&
        !hasRenderableVideoFrame(videoRef.current) &&
        !isCameraReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[var(--swiss-accent)]" />
            <p className="swiss-label text-white">Starting camera feed...</p>
          </div>
        )}

      {/* Mock mode background placeholder */}
      {isMockMode && (
        <div
          data-testid="mock-background"
          className="w-full h-full bg-[var(--swiss-fg)] swiss-diagonal flex items-center justify-center"
        >
          <div className="text-center">
            <Bug className="w-16 h-16 text-[var(--swiss-accent)] mx-auto mb-4 opacity-70" />
            <p className="text-white text-sm swiss-label">{copy.common.mockDetectionMode}</p>
            <p className="text-white/50 text-xs mt-1">{copy.common.simulatedFeed}</p>
          </div>
        </div>
      )}

      {/* Coverage overlay for rendering bounding boxes */}
      <CoverageOverlay
        videoRef={videoRef}
        detections={detections}
        policyType={policyType}
        confidenceThreshold={confidenceThreshold}
        onItemClick={onItemClick}
      />

      {/* Confidence threshold slider - positioned to not obstruct view */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs z-20">
        <ConfidenceThresholdSlider
          value={confidenceThreshold}
          onChange={setConfidenceThreshold}
          defaultCollapsed={false}
        />
      </div>

      {/* Camera requesting indicator (only in normal mode) */}
      {!isMockMode && isRequestingCamera && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
          <Camera className="w-10 h-10 text-blue-500 mb-3" />
          <p className="text-white font-medium">{copy.common.requestingCamera}</p>
        </div>
      )}
    </div>
  );
}
