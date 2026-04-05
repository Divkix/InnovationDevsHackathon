import { useYOLODetection, type UseYOLODetectionReturn } from './useYOLODetection'

/**
 * useObjectDetection hook
 * 
 * NOTE: This hook now uses YOLO26 (TensorFlow.js) as the underlying detector.
 * It maintains the same API for backward compatibility with existing components.
 * 
 * Previous implementation used MediaPipe EfficientDet-Lite0.
 * YOLO26 provides better accuracy (40.9 mAP vs ~34 mAP) and faster CPU inference.
 * 
 * @returns Detection methods and state from YOLO26
 */
export function useObjectDetection(): UseYOLODetectionReturn {
  // Delegate to YOLO26-based implementation
  return useYOLODetection()
}

export default useObjectDetection
