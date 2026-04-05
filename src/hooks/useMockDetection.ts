import { useCallback, useEffect, useMemo, useState } from "react";
import type { Detection } from "../types";
import { getMockDetections } from "./mockDetections";

/**
 * Storage key for mock detection mode
 */
export const MOCK_STORAGE_KEY = "insurescope_mock_detection";

/**
 * Check if mock mode is enabled via URL query parameter or localStorage
 * @returns True if mock mode is enabled
 */
function isMockModeEnabled(): boolean {
  // Check URL query parameter first
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mock") === "true") {
      return true;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(MOCK_STORAGE_KEY);
      if (stored === "true") {
        return true;
      }
    } catch (error) {
      // localStorage not available (e.g., private browsing)
      console.warn("localStorage not available:", error);
    }
  }

  return false;
}

/**
 * Return type for useMockDetection hook
 */
export interface UseMockDetectionReturn {
  /** Whether mock mode is enabled */
  isMockMode: boolean;
  /** Always true in mock mode (simulates model loaded) */
  isLoaded: boolean;
  /** Always null in mock mode */
  error: null;
  /** Predefined detection results */
  mockDetections: Detection[];
  /** Mock detect function that returns mock detections */
  detect: (
    video: HTMLVideoElement | null,
    timestamp: number,
  ) => Promise<{ detections: Detection[] }>;
  /** Enable/disable mock mode in localStorage */
  setMockMode: (enabled: boolean) => void;
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
 */
export function useMockDetection(): UseMockDetectionReturn {
  const [isMockMode, setIsMockModeState] = useState<boolean>(() => isMockModeEnabled());

  // Re-check mock mode when URL changes (for single-page app navigation)
  useEffect(() => {
    const checkMockMode = (): void => {
      setIsMockModeState(isMockModeEnabled());
    };

    // Check initially
    checkMockMode();

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === MOCK_STORAGE_KEY) {
        checkMockMode();
      }
    };

    // Listen for popstate (back/forward navigation)
    const handlePopState = (): void => {
      checkMockMode();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("popstate", handlePopState);

    return (): void => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  /**
   * Enable or disable mock mode in localStorage
   * @param enabled - Whether to enable mock mode
   */
  const setMockMode = useCallback((enabled: boolean): void => {
    if (typeof window === "undefined" || !window.localStorage) {
      console.warn("localStorage not available, cannot set mock mode");
      return;
    }

    try {
      if (enabled) {
        localStorage.setItem(MOCK_STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(MOCK_STORAGE_KEY);
      }
      setIsMockModeState(enabled);
    } catch (error) {
      console.warn("Failed to set mock mode:", error);
    }
  }, []);

  /**
   * Mock detect function that returns predefined detections
   * Mimics the signature of the real useObjectDetection.detect function
   *
   * @param video - Ignored in mock mode
   * @param timestamp - Ignored in mock mode
   * @returns Mock detection results
   */
  const detect = useCallback(
    async (
      _video: HTMLVideoElement | null,
      _timestamp: number,
    ): Promise<{ detections: Detection[] }> => {
      if (!isMockMode) {
        return { detections: [] };
      }

      // Return mock detections
      return {
        detections: getMockDetections(),
      };
    },
    [isMockMode],
  );

  // Memoize the return value
  const returnValue = useMemo<UseMockDetectionReturn>(
    () => ({
      isMockMode,
      isLoaded: true, // Always loaded in mock mode
      error: null, // Never errors in mock mode
      mockDetections: isMockMode ? getMockDetections() : [],
      detect,
      setMockMode,
    }),
    [isMockMode, detect, setMockMode],
  );

  return returnValue;
}

export default useMockDetection;
