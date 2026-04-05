import { motion } from "framer-motion";
import { Bug, Camera, ChevronRight, Hand, RefreshCw, Shield } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useObjectDetection } from "../../hooks/useObjectDetection";
import type { UseYOLODetectionReturn } from "../../hooks/useYOLODetection";
import type { AppContextValue, CameraViewProps, Detection } from "../../types";
import { ConfidenceThresholdSlider } from "../ConfidenceThresholdSlider/ConfidenceThresholdSlider";
import { CoverageOverlay } from "../CoverageOverlay/CoverageOverlay";

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
    confidenceThreshold,
    setConfidenceThreshold,
  }: AppContextValue = useAppContext();
  const {
    detect,
    isLoaded,
    error: modelError,
    isMockMode,
  }: UseYOLODetectionReturn = useObjectDetection();

  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // State for camera, errors, and detections
  const [cameraError, setCameraError] = useState<Error | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState<boolean>(false);
  const [detections, setDetections] = useState<Detection[]>([]);

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

  /**
   * Request camera access with appropriate facing mode
   * In mock mode, skips camera request and creates a simulated ready state
   */
  const requestCamera = useCallback(async (): Promise<void> => {
    // Skip camera request in mock mode
    if (isMockMode) {
      setIsRequestingCamera(false);
      setCameraError(null);
      return;
    }

    setIsRequestingCamera(true);
    setCameraError(null);

    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser not supported");
      }

      // Determine facing mode based on device type
      const facingMode = isMobile() ? "environment" : "user";

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // Store stream reference for cleanup
      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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
      if (onError) onError(error);
    } finally {
      setIsRequestingCamera(false);
    }
  }, [isMobile, onError, isMockMode]);

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
      // In mock mode, run detection directly without video element check
      if (isMockMode && isLoaded) {
        const results = await detect(null, timestamp);

        // Update detections for CoverageOverlay
        setDetections(results.detections || []);

        // Update detected items in context
        if (results.detections && results.detections.length > 0) {
          const itemsMap = new Map();
          results.detections.forEach((detection, index) => {
            const category = detection.categories?.[0]?.categoryName || "unknown";
            const confidence = detection.categories?.[0]?.score || 0;
            itemsMap.set(`detection-${index}`, {
              id: `detection-${index}`,
              category: category,
              confidence: confidence,
              boundingBox: detection.boundingBox,
              categories: detection.categories || [
                { categoryName: category, score: confidence, displayName: category },
              ],
            });
          });
          updateDetectedItems(itemsMap);
        }

        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(detectionLoop);
        return;
      }

      // Normal mode: require video element
      if (!videoRef.current) return;

      // Run detection if video is playing and model is loaded
      if (videoRef.current.readyState >= 2 && isLoaded) {
        const results = await detect(videoRef.current, timestamp);

        // Update detections for CoverageOverlay
        setDetections(results.detections || []);

        // Update detected items in context
        if (results.detections && results.detections.length > 0) {
          const itemsMap = new Map();
          results.detections.forEach((detection, index) => {
            const category = detection.categories?.[0]?.categoryName || "unknown";
            const confidence = detection.categories?.[0]?.score || 0;
            itemsMap.set(`detection-${index}`, {
              id: `detection-${index}`,
              category: category,
              confidence: confidence,
              boundingBox: detection.boundingBox,
              categories: detection.categories || [
                { categoryName: category, score: confidence, displayName: category },
              ],
            });
          });
          updateDetectedItems(itemsMap);
        }
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(detectionLoop);
    },
    [detect, isLoaded, updateDetectedItems, isMockMode],
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        data-testid="camera-error"
        className="flex flex-col items-center justify-center h-full min-h-[350px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 sm:p-6 text-center"
      >
        {/* State Farm Shield Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#E31837] rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>

        <h3 className="text-white text-lg sm:text-xl font-bold mb-2">
          {isCameraPermissionError
            ? "Camera Access Needed"
            : isBrowserUnsupported
              ? "Browser Not Supported"
              : isModelError
                ? "AI Model Failed to Load"
                : "Camera Error"}
        </h3>

        <p className="text-gray-400 text-sm sm:text-base text-center mb-6 max-w-sm leading-relaxed">
          {isCameraPermissionError
            ? "Camera access is required to detect items in your room. You can retry the permission request or use manual mode to add items yourself."
            : isBrowserUnsupported
              ? "Your browser does not support camera access. Please use a modern browser like Chrome, Safari, or Firefox."
              : isModelError
                ? modelError?.message?.includes("timeout")
                  ? "The AI model took too long to load. This is typically due to network issues or CDN unavailability. Please check your internet connection and try again."
                  : "The AI detection model failed to load. This may be due to a network issue. Please try reloading the page."
                : currentError.message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md">
          {/* Retry Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="retry-button"
            onClick={handleRetry}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#E31837] hover:bg-[#B8122C] text-white font-semibold rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4" />
            {isCameraPermissionError
              ? "Retry Permission"
              : isModelError
                ? "Reload Page"
                : "Try Again"}
          </motion.button>

          {/* Manual Mode Button */}
          {(isCameraPermissionError || isBrowserUnsupported) && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="manual-mode-button"
              onClick={handleManualMode}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <Hand className="w-4 h-4" />
              Use Manual Mode
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Helpful tip for manual mode */}
        {(isCameraPermissionError || isBrowserUnsupported) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-xs sm:text-sm text-gray-500 max-w-xs"
          >
            Manual mode lets you add items by hand. You can still switch policies, view coverage
            details, and see recommendations.
          </motion.p>
        )}
      </motion.div>
    );
  }

  // Camera view state
  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Policy type badge */}
      <div
        data-testid="policy-badge"
        className={`absolute top-4 left-4 z-20 px-3 py-1.5 ${policyInfo.color} rounded-full shadow-lg`}
      >
        <span className={`text-xs font-semibold ${policyInfo.textColor}`}>{policyInfo.name}</span>
      </div>

      {/* Mock mode indicator */}
      {isMockMode && (
        <div
          data-testid="mock-mode-indicator"
          className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-yellow-600 rounded-full shadow-lg flex items-center gap-2"
        >
          <Bug className="w-3 h-3 text-yellow-100" />
          <span className="text-xs font-semibold text-yellow-100">Mock Mode</span>
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

      {/* Mock mode background placeholder */}
      {isMockMode && (
        <div
          data-testid="mock-background"
          className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center"
        >
          <div className="text-center">
            <Bug className="w-16 h-16 text-yellow-500 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400 text-sm">Mock Detection Mode</p>
            <p className="text-gray-500 text-xs mt-1">Simulated camera feed</p>
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
          <p className="text-white font-medium">Requesting camera access...</p>
        </div>
      )}
    </div>
  );
}
