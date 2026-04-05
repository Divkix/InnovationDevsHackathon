import { describe, expect, it } from "vitest";
import type { BoundingBox, XYXYBox, YOLODetection, YOLOProcessOptions } from "../types";
import {
  clampBoundingBox,
  processYOLOOutput,
  scaleBoundingBox,
  xyxyToBoundingBox,
} from "./yoloProcessor";

describe("xyxyToBoundingBox", () => {
  it("converts corner coordinates to origin/size coordinates", () => {
    const input: XYXYBox = { x1: 100, y1: 100, x2: 150, y2: 180 };
    const result = xyxyToBoundingBox(input);

    expect(result).toEqual({
      originX: 100,
      originY: 100,
      width: 50,
      height: 80,
    });
  });
});

describe("scaleBoundingBox", () => {
  it("scales a box independently on each axis", () => {
    const box: BoundingBox = { originX: 100, originY: 50, width: 80, height: 40 };
    expect(scaleBoundingBox(box, 2, 0.5)).toEqual({
      originX: 200,
      originY: 25,
      width: 160,
      height: 20,
    });
  });
});

describe("clampBoundingBox", () => {
  it("clamps a box to image bounds", () => {
    const box: BoundingBox = { originX: -10, originY: 20, width: 80, height: 120 };
    expect(clampBoundingBox(box, 50, 100)).toEqual({
      originX: 0,
      originY: 20,
      width: 50,
      height: 80,
    });
  });
});

describe("processYOLOOutput", () => {
  it("returns empty array for null/undefined input", () => {
    expect(processYOLOOutput(null as unknown as YOLODetection[], [], 0.5)).toEqual([]);
    expect(processYOLOOutput(undefined as unknown as YOLODetection[], [], 0.5)).toEqual([]);
    expect(processYOLOOutput([], [], 0.5)).toEqual([]);
  });

  it("processes YOLO26 output into MediaPipe format", () => {
    // Mock YOLO26 raw output: [x1, y1, x2, y2, conf, class]
    const mockYOLOOutput: YOLODetection[] = [
      [100, 100, 150, 180, 0.92, 0],
      [200, 150, 320, 260, 0.88, 1],
    ];

    const classNames = ["laptop", "car", "bicycle"];
    const result = processYOLOOutput(mockYOLOOutput, classNames, 0.5);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      boundingBox: {
        originX: 100,
        originY: 100,
        width: 50,
        height: 80,
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
    const mockYOLOOutput: YOLODetection[] = [
      [100, 100, 150, 180, 0.3, 0],
      [200, 150, 320, 260, 0.8, 1],
    ];

    const classNames = ["laptop", "car"];
    const result = processYOLOOutput(mockYOLOOutput, classNames, 0.5);

    expect(result).toHaveLength(1);
    expect(result[0].categories[0].categoryName).toBe("car");
  });

  it("rescales model-space coordinates into source image coordinates", () => {
    const mockYOLOOutput: YOLODetection[] = [[100, 100, 150, 180, 0.92, 0]];
    const classNames = ["cell phone"];
    const options: YOLOProcessOptions = {
      scaleX: 2,
      scaleY: 0.5,
      imageWidth: 640,
      imageHeight: 240,
    };

    const result = processYOLOOutput(mockYOLOOutput, classNames, 0.5, options);

    expect(result[0].boundingBox).toEqual({
      originX: 200,
      originY: 50,
      width: 100,
      height: 40,
    });
  });
});
