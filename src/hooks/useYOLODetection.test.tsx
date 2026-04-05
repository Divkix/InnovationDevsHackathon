import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useYOLODetection } from "./useYOLODetection";
import type { Detection, YOLODetection } from "../types";

// ============================================================================
// MOCK SETUP (hoisted by vitest)
// ============================================================================

vi.mock("../utils/yoloProcessor.js", () => ({
	processYOLOOutput: vi.fn((output: YOLODetection[]) => {
		if (!output || !Array.isArray(output) || output.length === 0) {
			return [];
		}
		return output
			.filter((det) => det[4] >= 0.5)
			.map((det) => ({
				boundingBox: {
					originX: Math.max(0, det[0] - det[2] / 2),
					originY: Math.max(0, det[1] - det[3] / 2),
					width: det[2],
					height: det[3],
				},
				categories: [
					{
						categoryName: "person",
						score: det[4],
						displayName: "person",
					},
				],
			}));
	}),
	COCO_CLASS_NAMES: [
		"person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
		"boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
		"bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
		"giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
		"skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
		"skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
		"fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
		"broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
		"potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
		"remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
		"refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
		"toothbrush",
	],
}));

vi.mock("onnxruntime-web/wasm", async () => {
	const mockSessionRelease = vi.fn();
	const mockTensorDispose = vi.fn();

	const mockTensorData = new Float32Array(300 * 6);
	for (let i = 0; i < 300; i++) {
		const offset = i * 6;
		mockTensorData[offset] = 100;
		mockTensorData[offset + 1] = 150;
		mockTensorData[offset + 2] = 200;
		mockTensorData[offset + 3] = 250;
		mockTensorData[offset + 4] = 0.9;
		mockTensorData[offset + 5] = 0;
	}

	const mockOutputTensor = {
		data: mockTensorData,
		dims: [1, 300, 6],
	};

	const mockSessionRun = vi.fn().mockResolvedValue({
		output0: mockOutputTensor,
	});

	const mockInferenceSession = {
		inputNames: ["images"],
		outputNames: ["output0"],
		run: mockSessionRun,
		release: mockSessionRelease,
	};

	const mockSessionCreate = vi.fn().mockResolvedValue(mockInferenceSession);

	// Create a proper Tensor class mock
	class MockTensor {
		type: string;
		data: Float32Array;
		dims: number[];
		dispose: () => void;
		
		constructor(type: string, data: Float32Array, dims: number[]) {
			this.type = type;
			this.data = data;
			this.dims = dims;
			this.dispose = mockTensorDispose;
		}
	}

	return {
		InferenceSession: { create: mockSessionCreate },
		Tensor: MockTensor,
		env: {
			wasm: {
				numThreads: 1,
				simd: true,
				wasmPaths: { wasm: "/ort-wasm-simd-threaded.wasm" },
			},
		},
		__mockInferenceSession: mockInferenceSession,
		__mockTensorDispose: mockTensorDispose,
		__mockSessionRelease: mockSessionRelease,
		__mockSessionRun: mockSessionRun,
		__mockSessionCreate: mockSessionCreate,
	};
});

// ============================================================================
// TYPES
// ============================================================================

interface MockTensor {
	type: string;
	data: Float32Array;
	dims: number[];
	dispose: () => void;
}

interface MockInferenceSession {
	inputNames: string[];
	outputNames: string[];
	run: (_feeds: Record<string, MockTensor>) => Promise<Record<string, { data: Float32Array; dims: number[] }>>;
	release: () => void;
}

interface ORTMocks {
	__mockInferenceSession: MockInferenceSession;
	__mockTensorDispose: ReturnType<typeof vi.fn>;
	__mockSessionRelease: ReturnType<typeof vi.fn>;
	__mockSessionRun: ReturnType<typeof vi.fn>;
	__mockSessionCreate: ReturnType<typeof vi.fn>;
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

let originalLocation: Location;
let originalLocalStorage: Storage;
let mockInferenceSession: MockInferenceSession;
let mockTensorDispose: ReturnType<typeof vi.fn>;
let mockSessionRelease: ReturnType<typeof vi.fn>;
let mockSessionRun: ReturnType<typeof vi.fn>;
let mockSessionCreate: ReturnType<typeof vi.fn>;

beforeEach(async () => {
	originalLocation = window.location;
	originalLocalStorage = window.localStorage;

	const ort = await import("onnxruntime-web/wasm") as unknown as ORTMocks;
	mockInferenceSession = ort.__mockInferenceSession;
	mockTensorDispose = ort.__mockTensorDispose;
	mockSessionRelease = ort.__mockSessionRelease;
	mockSessionRun = ort.__mockSessionRun;
	mockSessionCreate = ort.__mockSessionCreate;

	mockSessionCreate?.mockClear();
	mockSessionRun?.mockClear();
	mockSessionRelease?.mockClear();
	mockTensorDispose?.mockClear();

	mockSessionCreate?.mockResolvedValue(mockInferenceSession);
	mockSessionRun?.mockResolvedValue({
		output0: { data: new Float32Array(300 * 6).fill(0), dims: [1, 300, 6] },
	});
});

afterEach(() => {
	Object.defineProperty(window, "location", {
		value: originalLocation,
		writable: true,
	});
	Object.defineProperty(window, "localStorage", {
		value: originalLocalStorage,
		writable: true,
	});
	vi.restoreAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("useYOLODetection", () => {
	describe("initial state", () => {
		it("returns isLoaded as false initially", () => {
			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isLoaded).toBe(false);
		});

		it("returns error as null initially", () => {
			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.error).toBeNull();
		});

		it("returns detect function", () => {
			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.detect).toBeInstanceOf(Function);
		});

		it("returns isMockMode as false initially", () => {
			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isMockMode).toBe(false);
		});
	});

	describe("model loading", () => {
		it("loads model from correct path", async () => {
			renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(mockSessionCreate).toHaveBeenCalled();
			});
		});

		it("sets isLoaded to true after model loads", async () => {
			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isLoaded).toBe(false);
			await vi.waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});
		});

		it("does not set error when model loads successfully", async () => {
			const { result } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});
			expect(result.current.error).toBeNull();
		});
	});

	describe("detect function", () => {
		it("returns detection results in MediaPipe format", async () => {
			const { result } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			const mockVideo = document.createElement("video");
			Object.defineProperty(mockVideo, "videoWidth", { value: 640, writable: true });
			Object.defineProperty(mockVideo, "videoHeight", { value: 480, writable: true });

			let detectResult: { detections: Detection[] } | undefined;
			await act(async () => {
				detectResult = await result.current.detect(mockVideo, 1000);
			});

			expect(detectResult).toHaveProperty("detections");
			expect(detectResult?.detections).toBeInstanceOf(Array);
		});

		it("returns empty detections when video element is null", async () => {
			const { result } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			let detectResult: { detections: Detection[] } | undefined;
			await act(async () => {
				detectResult = await result.current.detect(null, 1000);
			});

			expect(detectResult).toHaveProperty("detections");
			expect(detectResult?.detections).toEqual([]);
		});

		it("does not call session.run if model is not loaded", async () => {
			mockSessionCreate.mockRejectedValueOnce(new Error("Model load failed"));
			const { result } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});

			const mockVideo = document.createElement("video");
			await act(async () => {
				await result.current.detect(mockVideo, 1000);
			});

			expect(mockSessionRun).not.toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("sets error state when model loading fails", async () => {
			mockSessionCreate.mockRejectedValueOnce(new Error("Failed to fetch model"));
			const { result } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});
			expect(result.current.error?.message).toContain("model");
			expect(result.current.isLoaded).toBe(false);
		});

		it("includes error details in error object", async () => {
			mockSessionCreate.mockRejectedValueOnce(new Error("Network error"));
			const { result } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});
			expect(result.current.error?.message).toBeDefined();
			expect(typeof result.current.error?.message).toBe("string");
		});
	});

	describe("cleanup on unmount", () => {
		it("releases session on unmount when model loaded", async () => {
			const mockRelease = vi.fn();
			mockSessionCreate.mockResolvedValueOnce({
				...mockInferenceSession,
				release: mockRelease,
			});

			const { result, unmount } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			unmount();
			expect(mockRelease).toHaveBeenCalledTimes(1);
		});

		it("does not throw when unmounting before model loads", async () => {
			mockSessionCreate.mockImplementation(() => new Promise(() => {}));
			const { unmount } = renderHook(() => useYOLODetection());
			expect(() => unmount()).not.toThrow();
		});

		it("does not throw when unmounting after load error", async () => {
			mockSessionCreate.mockRejectedValueOnce(new Error("Model load failed"));
			const { result, unmount } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});
			expect(() => unmount()).not.toThrow();
		});
	});

	describe("tensor cleanup", () => {
		it("disposes tensors after inference", async () => {
			// Mock canvas context for jsdom
			const mockGetContext = vi.fn().mockReturnValue({
				drawImage: vi.fn(),
				getImageData: vi.fn().mockReturnValue({
					data: new Uint8ClampedArray(640 * 640 * 4),
				}),
			});
			const originalCreateElement = document.createElement;
			vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
				if (tagName === "canvas") {
					return {
						getContext: mockGetContext,
						width: 640,
						height: 640,
					} as unknown as HTMLCanvasElement;
				}
				return originalCreateElement.call(document, tagName);
			});

			const { result } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			const mockVideo = document.createElement("video");
			Object.defineProperty(mockVideo, "videoWidth", { value: 640 });
			Object.defineProperty(mockVideo, "videoHeight", { value: 480 });

			await act(async () => {
				await result.current.detect(mockVideo, 1000);
			});

			expect(mockTensorDispose).toHaveBeenCalled();
			vi.restoreAllMocks();
		});
	});

	describe("mock detection mode", () => {
		let getItemSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			const localStorageMock = {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			};
			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
				writable: true,
			});
			getItemSpy = vi.spyOn(window.localStorage, "getItem");
		});

		it("detects mock mode from URL query parameter", () => {
			Object.defineProperty(window, "location", {
				value: { search: "?mock=true" },
				writable: true,
			});

			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isMockMode).toBe(true);
		});

		it("detects mock mode from localStorage flag", () => {
			vi.stubGlobal("location", { search: "" });
			vi.stubGlobal("localStorage", {
				getItem: vi.fn((key: string) => key === "insurescope_mock_detection" ? "true" : null),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			});
			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isMockMode).toBe(true);
			vi.unstubAllGlobals();
		});

		it("isLoaded is immediately true in mock mode", () => {
			Object.defineProperty(window, "location", {
				value: { search: "?mock=true" },
				writable: true,
			});

			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isLoaded).toBe(true);
		});

		it("error is null in mock mode", () => {
			Object.defineProperty(window, "location", {
				value: { search: "?mock=true" },
				writable: true,
			});

			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.error).toBeNull();
		});

		it("skips ONNX initialization in mock mode", async () => {
			Object.defineProperty(window, "location", {
				value: { search: "?mock=true" },
				writable: true,
			});

			renderHook(() => useYOLODetection());
			await act(async () => {
				await new Promise((r) => setTimeout(r, 10));
			});

			expect(mockSessionCreate).not.toHaveBeenCalled();
		});

		it("returns mock detections when calling detect in mock mode", async () => {
			Object.defineProperty(window, "location", {
				value: { search: "?mock=true" },
				writable: true,
			});

			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isMockMode).toBe(true);

			const detections = await result.current.detect(null, 0);
			expect(detections.detections).toHaveLength(3);
			expect(detections.detections[0].categories[0].categoryName).toBe("laptop");
			expect(detections.detections[0].categories[0].score).toBe(0.92);
			expect(detections.detections[1].categories[0].categoryName).toBe("car");
			expect(detections.detections[2].categories[0].categoryName).toBe("bicycle");
		});

		it("mock detections have correct bounding box format", async () => {
			Object.defineProperty(window, "location", {
				value: { search: "?mock=true" },
				writable: true,
			});

			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isMockMode).toBe(true);

			const detections = await result.current.detect(null, 0);
			detections.detections.forEach((detection) => {
				expect(detection).toHaveProperty("boundingBox");
				expect(detection.boundingBox).toHaveProperty("originX");
				expect(detection.boundingBox).toHaveProperty("originY");
				expect(detection.boundingBox).toHaveProperty("width");
				expect(detection.boundingBox).toHaveProperty("height");
				expect(detection).toHaveProperty("categories");
				expect(detection.categories[0]).toHaveProperty("categoryName");
				expect(detection.categories[0]).toHaveProperty("score");
			});
		});

		it("isMockMode is false when URL param and localStorage are not set", () => {
			Object.defineProperty(window, "location", {
				value: { search: "" },
				writable: true,
			});
			getItemSpy.mockReturnValue(null);

			const { result } = renderHook(() => useYOLODetection());
			expect(result.current.isMockMode).toBe(false);
		});
	});

	describe("hook API shape", () => {
		it("returns correct hook interface", async () => {
			const { result } = renderHook(() => useYOLODetection());
			expect(result.current).toHaveProperty("detect");
			expect(result.current).toHaveProperty("isLoaded");
			expect(result.current).toHaveProperty("error");
			expect(result.current).toHaveProperty("isMockMode");
			expect(typeof result.current.detect).toBe("function");
			expect(typeof result.current.isLoaded).toBe("boolean");
			expect(typeof result.current.isMockMode).toBe("boolean");
			expect(result.current.error === null || typeof result.current.error === "object").toBe(true);
		});

		it("maintains stable detect function reference", async () => {
			const { result, rerender } = renderHook(() => useYOLODetection());
			await vi.waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			const detectFn = result.current.detect;
			rerender();
			expect(result.current.detect).toBe(detectFn);
		});
	});
});
