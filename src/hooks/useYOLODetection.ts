import * as ort from "onnxruntime-web/wasm";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Detection, YOLODetection } from "../types";
import { COCO_CLASS_NAMES, processYOLOOutput } from "../utils/yoloProcessor";
import { getMockDetections } from "./mockDetections";
import { MOCK_STORAGE_KEY } from "./useMockDetection";

// Model configuration
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Resolve public asset URL with base path handling
 * @param assetPath - Path to the asset
 * @returns Resolved absolute URL
 */
function resolvePublicAssetUrl(assetPath: string): string {
  const normalizedPath = assetPath.replace(/^\//, "");
  const basePath = import.meta.env.BASE_URL || "/";

  if (typeof window === "undefined") {
    return `${basePath}${normalizedPath}`;
  }

  return new URL(normalizedPath, new URL(basePath, window.location.origin)).href;
}

const MODEL_PATH = resolvePublicAssetUrl("models/yolo26n/yolo26n.onnx");
const WASM_PATH = resolvePublicAssetUrl("ort-wasm-simd-threaded.wasm");

/**
 * Check if mock mode is enabled via URL query parameter or localStorage
 * @returns True if mock mode is enabled
 */
function checkMockMode(): boolean {
  if (typeof window === "undefined") return false;

  // Check URL query parameter first
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("mock") === "true") return true;

  // Check localStorage
  try {
    if (localStorage.getItem(MOCK_STORAGE_KEY) === "true") return true;
  } catch {
    // localStorage not available (e.g., private browsing)
  }

  return false;
}

/**
 * Preprocess video frame for YOLO inference
 * - Resizes to MODEL_INPUT_SIZE (640x640)
 * - Normalizes pixel values to [0, 1]
 * - Creates Float32Array in NCHW format for ONNX
 *
 * @param video - Video element to process
 * @returns Preprocessed tensor [1, 3, 640, 640] or null if invalid
 */
function preprocessFrame(video: HTMLVideoElement): ort.Tensor | null {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  // Create canvas for resizing
  const canvas = document.createElement("canvas");
  canvas.width = MODEL_INPUT_SIZE;
  canvas.height = MODEL_INPUT_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Draw video frame to canvas (resizes automatically)
  ctx.drawImage(video, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const pixels = imageData.data; // RGBA format

  // Create Float32Array for ONNX (NCHW format: [batch, channels, height, width])
  const inputData = new Float32Array(1 * 3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);

  // Convert RGBA to RGB and normalize to [0, 1]
  for (let y = 0; y < MODEL_INPUT_SIZE; y++) {
    for (let x = 0; x < MODEL_INPUT_SIZE; x++) {
      const srcIdx = (y * MODEL_INPUT_SIZE + x) * 4; // RGBA
      const dstIdx = y * MODEL_INPUT_SIZE + x;

      // NCHW layout: channel first
      inputData[dstIdx] = pixels[srcIdx] / 255.0; // R
      inputData[MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + dstIdx] = pixels[srcIdx + 1] / 255.0; // G
      inputData[2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + dstIdx] = pixels[srcIdx + 2] / 255.0; // B
    }
  }

  // Create ONNX tensor [1, 3, 640, 640]
  return new ort.Tensor("float32", inputData, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
}

/**
 * Return type for useYOLODetection hook
 */
export interface UseYOLODetectionReturn {
  /** Run detection on video element */
  detect: (
    video: HTMLVideoElement | null,
    timestamp: number,
  ) => Promise<{ detections: Detection[] }>;
  /** Whether model is loaded and ready */
  isLoaded: boolean;
  /** Error object if initialization failed */
  error: Error | null;
  /** Whether mock mode is active */
  isMockMode: boolean;
}

/**
 * Custom hook for YOLO26 object detection using ONNX Runtime Web
 *
 * Mirrors the API of useObjectDetection for easy swapping:
 * - detect: Function to run detection on video frame
 * - isLoaded: Boolean indicating if model is ready
 * - error: Error object if initialization failed
 * - isMockMode: Boolean indicating mock detection mode
 *
 * Supports mock mode via ?mock=true URL param or localStorage flag.
 */
export function useYOLODetection(): UseYOLODetectionReturn {
  const sessionRef = useRef<ort.InferenceSession | null>(null);
  // Lock to prevent detection during unmount
  const isDetectingRef = useRef<boolean>(false);

  const initialMockMode = checkMockMode();
  const [isLoaded, setIsLoaded] = useState<boolean>(initialMockMode);
  const [error, setError] = useState<Error | null>(null);
  const [isMockMode] = useState<boolean>(initialMockMode);

  // Track component mount state for async safety
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    // Skip ONNX initialization in mock mode
    if (isMockMode) return;

    isMountedRef.current = true;
    let isCancelled = false;

    async function initializeModel(): Promise<void> {
      try {
        console.log("[useYOLODetection] Starting ONNX initialization...");

        // Configure ONNX Runtime Web
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.simd = true;

        // Point ORT at the public runtime binary so Vite does not resolve it into
        // node_modules/.vite/deps, which returns HTML instead of WebAssembly.
        ort.env.wasm.wasmPaths = {
          wasm: WASM_PATH,
        };

        console.log("[useYOLODetection] WASM paths configured");

        // Create timeout promise to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Model loading timeout after 30s")), 30000);
        });

        // Create inference session with race against timeout
        const sessionPromise = ort.InferenceSession.create(MODEL_PATH, {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        });

        console.log("[useYOLODetection] Loading model from:", MODEL_PATH);
        const session = await Promise.race([sessionPromise, timeoutPromise]);
        console.log("[useYOLODetection] Model loaded successfully");

        if (isCancelled || !isMountedRef.current) {
          session.release();
          return;
        }

        sessionRef.current = session;
        setIsLoaded(true);
        setError(null);
        console.log("[useYOLODetection] Initialization complete");
      } catch (err) {
        if (isCancelled || !isMountedRef.current) return;

        console.error("[useYOLODetection] Initialization error:", err);
        let errorMessage = "Failed to initialize YOLO detection";
        if (err instanceof Error) {
          if (err.message?.includes("fetch") || err.message?.includes("network")) {
            errorMessage = `Model loading failed: ${err.message}`;
          } else if (err.message?.includes("wasm")) {
            errorMessage = `WebAssembly error: ${err.message}. Check that your browser supports WASM.`;
          } else if (err.message?.includes("timeout")) {
            errorMessage = err.message;
          } else {
            errorMessage = err.message || "Unknown error during initialization";
          }
        }

        setError(new Error(errorMessage));
        setIsLoaded(false);
      }
    }

    initializeModel();

    return (): void => {
      isCancelled = true;
      isMountedRef.current = false;

      // Release session
      const disposeSession = (): void => {
        if (sessionRef.current) {
          sessionRef.current.release();
          sessionRef.current = null;
        }
      };

      // If detecting, wait a bit before disposing
      if (isDetectingRef.current) {
        setTimeout(disposeSession, 100);
      } else {
        disposeSession();
      }
    };
  }, [isMockMode]);

  /**
   * Run object detection on video frame
   *
   * @param video - Video element to detect objects in
   * @param _timestamp - Video timestamp (ignored in YOLO, for API compatibility)
   * @returns Detection results in MediaPipe format
   */
  const detect = useCallback(
    async (
      video: HTMLVideoElement | null,
      _timestamp: number,
    ): Promise<{ detections: Detection[] }> => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return { detections: [] };
      }

      // Check if already detecting (prevent race conditions)
      if (isDetectingRef.current) {
        return { detections: [] };
      }

      // Set detection lock
      isDetectingRef.current = true;

      try {
        // Return mock detections in mock mode
        if (isMockMode) {
          return { detections: getMockDetections() };
        }

        const session = sessionRef.current;
        if (!session || !isLoaded) return { detections: [] };
        if (!video) return { detections: [] };

        let inputTensor: ort.Tensor | null = null;

        try {
          // Preprocess video frame
          inputTensor = preprocessFrame(video);
          if (!inputTensor) {
            return { detections: [] };
          }

          // Create feeds object (input name from model is usually "images" or "input")
          const feeds: Record<string, ort.Tensor> = {};
          // Try common input names
          if (session.inputNames.includes("images")) {
            feeds.images = inputTensor;
          } else if (session.inputNames.includes("input")) {
            feeds.input = inputTensor;
          } else if (session.inputNames.length > 0) {
            feeds[session.inputNames[0]] = inputTensor;
          } else {
            throw new Error("Could not determine model input name");
          }

          // Run inference
          const results = await session.run(feeds);

          // Get output (usually "output0" or first output)
          const outputTensor =
            (results.output0 as ort.Tensor) ?? (results[Object.keys(results)[0]] as ort.Tensor);

          if (!outputTensor) {
            throw new Error("No output tensor found");
          }

          // Convert to MediaPipe format.
          // This exported model returns [x1, y1, x2, y2, score, class_id]
          // in 640x640 model space, so rescale back into the source video.
          const outputData = outputTensor.data as Float32Array;
          const dims = outputTensor.dims;
          const scaleX = video.videoWidth / MODEL_INPUT_SIZE;
          const scaleY = video.videoHeight / MODEL_INPUT_SIZE;

          // Reshape output data into array of detections
          const numDetections = dims[1]; // 300 for YOLO26
          const detections: YOLODetection[] = [];

          for (let i = 0; i < numDetections; i++) {
            const offset = i * 6;
            const detection: YOLODetection = [
              outputData[offset], // x1
              outputData[offset + 1], // y1
              outputData[offset + 2], // x2
              outputData[offset + 3], // y2
              outputData[offset + 4], // confidence
              outputData[offset + 5], // class_id
            ];
            detections.push(detection);
          }

          // Process into MediaPipe format
          const processedDetections = processYOLOOutput(
            detections,
            COCO_CLASS_NAMES,
            CONFIDENCE_THRESHOLD,
            {
              scaleX,
              scaleY,
              imageWidth: video.videoWidth,
              imageHeight: video.videoHeight,
            },
          );

          return { detections: processedDetections };
        } catch (err) {
          console.error("Detection error:", err);
          // Set error state so caller knows detection failed
          const errorMessage = err instanceof Error ? err.message : "Unknown detection error";
          setError(new Error(`Detection failed: ${errorMessage}`));
          return { detections: [] };
        } finally {
          // Clean up input tensor
          if (inputTensor) {
            inputTensor.dispose();
          }
        }
      } finally {
        // Always release detection lock
        isDetectingRef.current = false;
      }
    },
    [isMockMode, isLoaded],
  );

  return { detect, isLoaded, error, isMockMode };
}

export default useYOLODetection;
