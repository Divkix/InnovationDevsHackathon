/**
 * Mock detection data for automated testing.
 *
 * This module provides predefined detection results that simulate
 * MediaPipe object detection output without requiring a real camera
 * or AI model. Used when mock mode is enabled via:
 * - URL parameter: ?mock=true
 * - localStorage: insurescope_mock_detection = 'true'
 *
 * @module mockDetections
 */

import type { BoundingBox, Detection, DetectionCategory, MockDetection } from "../types";

/**
 * Mock detection for a laptop
 * Status: covered (green)
 * Estimated value: $1,200
 */
export const MOCK_LAPTOP: MockDetection = {
  boundingBox: {
    originX: 100,
    originY: 150,
    width: 280,
    height: 180,
  } satisfies BoundingBox,
  categories: [
    {
      categoryName: "laptop",
      score: 0.92,
      displayName: "Laptop",
    } satisfies DetectionCategory,
  ],
};

/**
 * Mock detection for a car
 * Status: not covered (red)
 * Estimated value: $15,000
 */
export const MOCK_CAR: MockDetection = {
  boundingBox: {
    originX: 450,
    originY: 200,
    width: 350,
    height: 250,
  } satisfies BoundingBox,
  categories: [
    {
      categoryName: "car",
      score: 0.88,
      displayName: "Car",
    } satisfies DetectionCategory,
  ],
};

/**
 * Mock detection for a bicycle
 * Status: conditional (yellow)
 * Estimated value: $500
 */
export const MOCK_BICYCLE: MockDetection = {
  boundingBox: {
    originX: 200,
    originY: 350,
    width: 220,
    height: 160,
  } satisfies BoundingBox,
  categories: [
    {
      categoryName: "bicycle",
      score: 0.85,
      displayName: "Bicycle",
    } satisfies DetectionCategory,
  ],
};

/**
 * All mock detections in a single array.
 * Used by the CoverageOverlay to render bounding boxes.
 *
 * @returns Array of mock detection objects in MediaPipe format
 */
export function getMockDetections(): Detection[] {
  return [MOCK_LAPTOP, MOCK_CAR, MOCK_BICYCLE];
}

/**
 * Get a single mock detection by category name
 * @param category - Category name ('laptop', 'car', 'bicycle')
 * @returns Mock detection object or null if not found
 */
export function getMockDetectionByCategory(category: string): Detection | null {
  const detectionMap: Record<string, Detection> = {
    laptop: MOCK_LAPTOP,
    car: MOCK_CAR,
    bicycle: MOCK_BICYCLE,
  };

  return detectionMap[category.toLowerCase()] || null;
}

/**
 * Get mock detections filtered by minimum confidence score
 * @param minScore - Minimum confidence threshold (0-1)
 * @returns Filtered mock detections
 */
export function getMockDetectionsByConfidence(minScore = 0.5): Detection[] {
  return getMockDetections().filter((detection) => detection.categories[0]?.score >= minScore);
}

export default getMockDetections;
