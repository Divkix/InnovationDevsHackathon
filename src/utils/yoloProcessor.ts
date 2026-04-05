/**
 * YOLO26 Output Processor
 *
 * Converts YOLO26 raw output into MediaPipe-compatible format.
 * This exported ONNX model returns end-to-end detections as:
 * [x1, y1, x2, y2, confidence, class_id]
 */

import type { BoundingBox, Detection, XYXYBox, YOLODetection, YOLOProcessOptions } from "../types";

/**
 * Convert XYXY (corner-based) coordinates to a bounding box object.
 * @param box - Box in {x1, y1, x2, y2} format
 * @returns Box in {originX, originY, width, height} format (corner coords)
 */
export function xyxyToBoundingBox(box: XYXYBox): BoundingBox {
  const originX = Math.max(0, box.x1);
  const originY = Math.max(0, box.y1);
  const width = Math.max(0, box.x2 - box.x1);
  const height = Math.max(0, box.y2 - box.y1);

  return {
    originX,
    originY,
    width,
    height,
  };
}

/**
 * Scale a bounding box from model space into video space.
 * @param box - Bounding box in {originX, originY, width, height}
 * @param scaleX
 * @param scaleY
 * @returns
 */
export function scaleBoundingBox(box: BoundingBox, scaleX = 1, scaleY = 1): BoundingBox {
  return {
    originX: box.originX * scaleX,
    originY: box.originY * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  };
}

/**
 * Clamp a bounding box to image bounds.
 * @param box - Bounding box in {originX, originY, width, height}
 * @param maxWidth
 * @param maxHeight
 * @returns
 */
export function clampBoundingBox(
  box: BoundingBox,
  maxWidth = Infinity,
  maxHeight = Infinity,
): BoundingBox {
  const left = Math.min(Math.max(0, box.originX), maxWidth);
  const top = Math.min(Math.max(0, box.originY), maxHeight);
  const right = Math.min(Math.max(left, box.originX + box.width), maxWidth);
  const bottom = Math.min(Math.max(top, box.originY + box.height), maxHeight);

  return {
    originX: left,
    originY: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * Process raw YOLO26 output into MediaPipe-compatible detection format
 *
 * YOLO26 end-to-end output format: [batch, num_detections, 6]
 * where each detection is [x1, y1, x2, y2, confidence, class_id]
 *
 * MediaPipe format: { boundingBox: {...}, categories: [{categoryName, score, displayName}] }
 *
 * @param yoloOutput - Raw YOLO26 predictions
 * @param classNames - Array of class names indexed by class_id
 * @param confidenceThreshold - Minimum confidence score (0-1)
 * @param options
 * @returns Detections in MediaPipe format
 */
export function processYOLOOutput(
  yoloOutput: YOLODetection[],
  classNames: string[],
  confidenceThreshold = 0.5,
  options: YOLOProcessOptions = {},
): Detection[] {
  if (!yoloOutput || !Array.isArray(yoloOutput) || yoloOutput.length === 0) {
    return [];
  }

  const { scaleX = 1, scaleY = 1, imageWidth = Infinity, imageHeight = Infinity } = options;

  const detections: Detection[] = [];

  for (const detection of yoloOutput) {
    // Skip invalid detections
    if (!Array.isArray(detection) || detection.length < 6) continue;

    const [x1, y1, x2, y2, confidence, classId] = detection;

    // Filter by confidence threshold
    if (confidence < confidenceThreshold) continue;

    // Get class name
    const categoryName = classNames[Math.floor(classId)] || "unknown";

    // Convert from model output coordinates into source image coordinates.
    const boundingBox = clampBoundingBox(
      scaleBoundingBox(xyxyToBoundingBox({ x1, y1, x2, y2 }), scaleX, scaleY),
      imageWidth,
      imageHeight,
    );

    if (boundingBox.width <= 0 || boundingBox.height <= 0) continue;

    detections.push({
      boundingBox,
      categories: [
        {
          categoryName,
          score: confidence,
          displayName: categoryName,
        },
      ],
    });
  }

  return detections;
}

/**
 * COCO class names for YOLO26 (80 classes)
 * These match the standard COCO dataset used by YOLO models
 */
export const COCO_CLASS_NAMES: string[] = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
];

export default processYOLOOutput;
