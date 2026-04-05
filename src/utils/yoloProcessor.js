/**
 * YOLO26 Output Processor
 *
 * Converts YOLO26 raw output into MediaPipe-compatible format.
 * YOLO26 uses NMS-free end-to-end output that differs from traditional YOLO.
 */

/**
 * Convert XYWH (center-based) to XYXY (corner-based) format
 * @param {Object} box - Box in {x, y, width, height} format (center coords)
 * @returns {Object} Box in {originX, originY, width, height} format (corner coords)
 */
export function xywh2xyxy(box) {
	const halfWidth = box.width / 2;
	const halfHeight = box.height / 2;

	return {
		originX: Math.max(0, box.x - halfWidth),
		originY: Math.max(0, box.y - halfHeight),
		width: box.width,
		height: box.height,
	};
}

/**
 * Process raw YOLO26 output into MediaPipe-compatible detection format
 *
 * YOLO26 end-to-end output format: [batch, num_detections, 6]
 * where each detection is [x_center, y_center, width, height, confidence, class_id]
 *
 * MediaPipe format: { boundingBox: {...}, categories: [{categoryName, score, displayName}] }
 *
 * @param {Array} yoloOutput - Raw YOLO26 predictions
 * @param {Array} classNames - Array of class names indexed by class_id
 * @param {number} confidenceThreshold - Minimum confidence score (0-1)
 * @returns {Array} Detections in MediaPipe format
 */
export function processYOLOOutput(
	yoloOutput,
	classNames,
	confidenceThreshold = 0.5,
) {
	if (!yoloOutput || !Array.isArray(yoloOutput) || yoloOutput.length === 0) {
		return [];
	}

	const detections = [];

	for (const detection of yoloOutput) {
		// Skip invalid detections
		if (!Array.isArray(detection) || detection.length < 6) continue;

		const [x, y, width, height, confidence, classId] = detection;

		// Filter by confidence threshold
		if (confidence < confidenceThreshold) continue;

		// Get class name
		const categoryName = classNames[Math.floor(classId)] || "unknown";

		// Convert to MediaPipe format
		const boundingBox = xywh2xyxy({ x, y, width, height });

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
export const COCO_CLASS_NAMES = [
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
