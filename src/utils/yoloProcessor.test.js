import { describe, expect, it } from "vitest";
import { processYOLOOutput, xywh2xyxy } from "./yoloProcessor.js";

describe("xywh2xyxy", () => {
	it("converts center-based to corner-based coordinates", () => {
		const input = { x: 100, y: 100, width: 50, height: 50 }; // center format
		const result = xywh2xyxy(input);

		expect(result).toEqual({
			originX: 75, // 100 - 25
			originY: 75, // 100 - 25
			width: 50,
			height: 50,
		});
	});
});

describe("processYOLOOutput", () => {
	it("returns empty array for null/undefined input", () => {
		expect(processYOLOOutput(null)).toEqual([]);
		expect(processYOLOOutput(undefined)).toEqual([]);
		expect(processYOLOOutput([])).toEqual([]);
	});

	it("processes YOLO26 output into MediaPipe format", () => {
		// Mock YOLO26 raw output: [batch, num_boxes, 6] where 6 = [x, y, w, h, conf, class]
		const mockYOLOOutput = [
			[100, 100, 50, 50, 0.92, 0], // laptop class (0)
			[200, 150, 100, 80, 0.88, 1], // car class (1)
		];

		const classNames = ["laptop", "car", "bicycle"];
		const result = processYOLOOutput(mockYOLOOutput, classNames, 0.5);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			boundingBox: {
				originX: 75,
				originY: 75,
				width: 50,
				height: 50,
			},
			categories: [
				{
					categoryName: "laptop",
					score: 0.92,
					displayName: "laptop",
				},
			],
		});
	});

	it("filters by confidence threshold", () => {
		const mockYOLOOutput = [
			[100, 100, 50, 50, 0.3, 0], // Below threshold
			[200, 150, 100, 80, 0.8, 1], // Above threshold
		];

		const classNames = ["laptop", "car"];
		const result = processYOLOOutput(mockYOLOOutput, classNames, 0.5);

		expect(result).toHaveLength(1);
		expect(result[0].categories[0].categoryName).toBe("car");
	});
});
