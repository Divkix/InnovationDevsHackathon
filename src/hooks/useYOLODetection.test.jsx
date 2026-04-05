import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useYOLODetection } from "./useYOLODetection.js";

// Mock yoloProcessor
vi.mock("../utils/yoloProcessor.js", () => ({
	processYOLOOutput: vi.fn((output) => {
		// Simple mock implementation - return processed detections
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
	],
}));

// Mock TensorFlow.js - factory must be self-contained (hoisted before imports)
vi.mock("@tensorflow/tfjs", () => {
	// Create ALL mocks INSIDE the factory - they persist and can be accessed via import
	const mockTensorDispose = vi.fn();
	const mockModelDispose = vi.fn();
	const mockPredict = vi.fn();
	const mockSetBackend = vi.fn();
	const mockLoadGraphModel = vi.fn();
	const mockReady = vi.fn();
	const mockFromPixels = vi.fn();
	const mockResizeBilinear = vi.fn();
	const mockGetBackend = vi.fn();

	const mockTensor = {
		expandDims: vi.fn().mockReturnThis(),
		div: vi.fn().mockReturnThis(),
		squeeze: vi.fn().mockReturnThis(),
		data: vi.fn().mockResolvedValue([[0.5, 0.5, 0.2, 0.3, 0.9, 0]]),
		dispose: mockTensorDispose,
	};

	const mockResizedTensor = {
		expandDims: vi.fn().mockReturnValue(mockTensor),
		div: vi.fn().mockReturnValue(mockTensor),
		dispose: vi.fn(),
	};

	mockResizeBilinear.mockReturnValue(mockResizedTensor);
	mockPredict.mockReturnValue(mockTensor);

	const mockModel = {
		predict: mockPredict,
		dispose: mockModelDispose,
	};

	const tfMock = {
		ready: mockReady.mockResolvedValue(undefined),
		setBackend: mockSetBackend.mockResolvedValue(true),
		getBackend: mockGetBackend.mockReturnValue("webgl"),
		browser: {
			fromPixels: mockFromPixels.mockReturnValue(mockTensor),
		},
		image: {
			resizeBilinear: mockResizeBilinear,
		},
		loadGraphModel: mockLoadGraphModel.mockResolvedValue(mockModel),
		tensor: vi.fn().mockReturnValue(mockTensor),
		disposeVariables: vi.fn(),
	};

	// Attach mocks to the exported object so tests can access them
	tfMock.__mockTensorDispose = mockTensorDispose;
	tfMock.__mockModelDispose = mockModelDispose;
	tfMock.__mockPredict = mockPredict;
	tfMock.__mockSetBackend = mockSetBackend;
	tfMock.__mockLoadGraphModel = mockLoadGraphModel;
	tfMock.__mockReady = mockReady;
	tfMock.__mockFromPixels = mockFromPixels;
	tfMock.__mockResizeBilinear = mockResizeBilinear;
	tfMock.__mockGetBackend = mockGetBackend;

	return tfMock;
});

vi.mock("@tensorflow/tfjs-backend-webgl", () => ({}));

// Declare mock references - will be populated in beforeEach via import
let mockTensorDispose,
	mockModelDispose,
	mockPredict,
	mockSetBackend,
	mockLoadGraphModel,
	mockReady,
	mockFromPixels,
	mockResizeBilinear,
	mockGetBackend;

beforeEach(async () => {
	// Access mocks through the module export - the __mock* properties are stable
	const tf = await import("@tensorflow/tfjs");
	mockTensorDispose = tf.__mockTensorDispose;
	mockModelDispose = tf.__mockModelDispose;
	mockPredict = tf.__mockPredict;
	mockSetBackend = tf.__mockSetBackend;
	mockLoadGraphModel = tf.__mockLoadGraphModel;
	mockReady = tf.__mockReady;
	mockFromPixels = tf.__mockFromPixels;
	mockResizeBilinear = tf.__mockResizeBilinear;
	mockGetBackend = tf.__mockGetBackend;

	// Clear only call history, not the mock implementations themselves
	mockTensorDispose?.mockClear();
	mockModelDispose?.mockClear();
	mockPredict?.mockClear();
	mockSetBackend?.mockClear();
	mockLoadGraphModel?.mockClear();
	mockReady?.mockClear();
	mockFromPixels?.mockClear();
	mockResizeBilinear?.mockClear();
	mockGetBackend?.mockClear();

	// Reset to default success behavior
	mockSetBackend?.mockResolvedValue(true);
	mockGetBackend?.mockReturnValue("cpu");
	mockLoadGraphModel?.mockResolvedValue({
		predict: mockPredict,
		dispose: mockModelDispose,
	});
});

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
		it("initializes WebGL backend on mount", async () => {
			renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(mockSetBackend).toHaveBeenCalledWith("webgl");
			});
		});

		it("loads model from correct path", async () => {
			renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(mockLoadGraphModel).toHaveBeenCalledWith(
					"/models/yolo26n/model.json",
				);
			});
		});

		it("sets isLoaded to true after model loads", async () => {
			const { result } = renderHook(() => useYOLODetection());

			expect(result.current.isLoaded).toBe(false);

			await waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});
		});

		it("does not set error when model loads successfully", async () => {
			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			expect(result.current.error).toBeNull();
		});
	});

	describe("detect function", () => {
		it("returns detection results in MediaPipe format", async () => {
			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			// Create a mock video element using Object.defineProperty for readonly props
			const mockVideo = document.createElement("video");
			Object.defineProperty(mockVideo, "videoWidth", {
				value: 640,
				writable: true,
			});
			Object.defineProperty(mockVideo, "videoHeight", {
				value: 480,
				writable: true,
			});

			let detectResult;
			await act(async () => {
				detectResult = await result.current.detect(mockVideo, 1000);
			});

			// Verify result format matches MediaPipe detection result format
			expect(detectResult).toHaveProperty("detections");
			expect(detectResult.detections).toBeInstanceOf(Array);
		});

		it("returns empty detections when video element is null", async () => {
			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			let detectResult;
			await act(async () => {
				detectResult = await result.current.detect(null, 1000);
			});

			// Should still return proper format, just empty
			expect(detectResult).toHaveProperty("detections");
			expect(detectResult.detections).toEqual([]);
		});

		it("does not call predict if model is not loaded", async () => {
			// Simulate loading failure so isLoaded stays false
			mockLoadGraphModel.mockRejectedValueOnce(new Error("Model load failed"));

			const { result } = renderHook(() => useYOLODetection());

			// Wait for the hook to settle
			await waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});

			const mockVideo = document.createElement("video");

			await act(async () => {
				await result.current.detect(mockVideo, 1000);
			});

			// predict should not be called when model is not loaded
			expect(mockPredict).not.toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("sets error state when backend initialization fails", async () => {
			mockSetBackend.mockRejectedValueOnce(
				new Error("Backend initialization failed"),
			);

			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});

			expect(result.current.error.message).toContain(
				"Backend initialization failed",
			);
			expect(result.current.isLoaded).toBe(false);
		});

		it("sets error state when model loading fails", async () => {
			mockLoadGraphModel.mockRejectedValueOnce(
				new Error("Failed to fetch model"),
			);

			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});

			expect(result.current.error.message).toContain("model");
			expect(result.current.isLoaded).toBe(false);
		});

		it("includes error details in error object", async () => {
			mockLoadGraphModel.mockRejectedValueOnce(new Error("Network error"));

			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});

			expect(result.current.error.message).toBeDefined();
			expect(typeof result.current.error.message).toBe("string");
		});
	});

	describe("cleanup on unmount", () => {
		it("disposes model on unmount when model loaded", async () => {
			const mockDispose = vi.fn();
			mockLoadGraphModel.mockResolvedValueOnce({
				predict: mockPredict,
				dispose: mockDispose,
			});

			const { result, unmount } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			unmount();

			expect(mockDispose).toHaveBeenCalledTimes(1);
		});

		it("does not throw when unmounting before model loads", async () => {
			// Delay the model load indefinitely
			mockLoadGraphModel.mockImplementation(() => new Promise(() => {}));

			const { unmount } = renderHook(() => useYOLODetection());

			// Unmount before model finishes loading
			expect(() => unmount()).not.toThrow();
		});

		it("does not throw when unmounting after load error", async () => {
			mockLoadGraphModel.mockRejectedValueOnce(new Error("Model load failed"));

			const { result, unmount } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});

			// Unmount after error - should not throw
			expect(() => unmount()).not.toThrow();
		});
	});

	describe("tensor cleanup", () => {
		it("disposes tensors after inference", async () => {
			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			const mockVideo = document.createElement("video");
			Object.defineProperty(mockVideo, "videoWidth", { value: 640 });
			Object.defineProperty(mockVideo, "videoHeight", { value: 480 });

			await act(async () => {
				await result.current.detect(mockVideo, 1000);
			});

			// Verify tensor disposal was called
			expect(mockTensorDispose).toHaveBeenCalled();
		});
	});

	describe("mock detection mode", () => {
		let originalHref;
		let localStorageMock;

		beforeEach(() => {
			// Store original href for restoration
			originalHref = window.location.href;

			// Mock localStorage
			localStorageMock = {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
			};
			Object.defineProperty(globalThis, "localStorage", {
				value: localStorageMock,
				writable: true,
				configurable: true,
			});
		});

		afterEach(() => {
			// Restore original href safely
			try {
				Object.defineProperty(globalThis, "location", {
					value: {
						...globalThis.location,
						href: originalHref,
					},
					writable: true,
					configurable: true,
				});
			} catch (e) {
				// Ignore errors in jsdom environment
			}
		});

		it("detects mock mode from URL query parameter", () => {
			// Mock location with query param
			Object.defineProperty(globalThis, "location", {
				value: {
					href: "http://localhost:5173?mock=true",
					search: "?mock=true",
					pathname: "/",
					host: "localhost:5173",
				},
				writable: true,
				configurable: true,
			});

			const { result } = renderHook(() => useYOLODetection());

			expect(result.current.isMockMode).toBe(true);
		});

		it("detects mock mode from localStorage flag", () => {
			localStorageMock.getItem.mockReturnValue("true");

			const { result } = renderHook(() => useYOLODetection());

			expect(result.current.isMockMode).toBe(true);
		});

		it("isLoaded is immediately true in mock mode", () => {
			Object.defineProperty(globalThis, "location", {
				value: {
					href: "http://localhost:5173?mock=true",
					search: "?mock=true",
					pathname: "/",
					host: "localhost:5173",
				},
				writable: true,
				configurable: true,
			});

			const { result } = renderHook(() => useYOLODetection());

			// In mock mode, isLoaded should be true immediately without waiting for TF.js
			expect(result.current.isLoaded).toBe(true);
		});

		it("error is null in mock mode", () => {
			Object.defineProperty(globalThis, "location", {
				value: {
					href: "http://localhost:5173?mock=true",
					search: "?mock=true",
					pathname: "/",
					host: "localhost:5173",
				},
				writable: true,
				configurable: true,
			});

			const { result } = renderHook(() => useYOLODetection());

			expect(result.current.error).toBeNull();
		});

		it("skips TensorFlow.js initialization in mock mode", async () => {
			Object.defineProperty(globalThis, "location", {
				value: {
					href: "http://localhost:5173?mock=true",
					search: "?mock=true",
					pathname: "/",
					host: "localhost:5173",
				},
				writable: true,
				configurable: true,
			});

			renderHook(() => useYOLODetection());

			// Wait a tick to ensure any async effects would have run
			await act(async () => {
				await new Promise((r) => setTimeout(r, 10));
			});

			// TensorFlow.js should not be initialized in mock mode
			expect(mockSetBackend).not.toHaveBeenCalled();
			expect(mockLoadGraphModel).not.toHaveBeenCalled();
		});

		it("returns mock detections when calling detect in mock mode", async () => {
			Object.defineProperty(globalThis, "location", {
				value: {
					href: "http://localhost:5173?mock=true",
					search: "?mock=true",
					pathname: "/",
					host: "localhost:5173",
				},
				writable: true,
				configurable: true,
			});

			const { result } = renderHook(() => useYOLODetection());

			// Wait for mock mode to be detected
			await waitFor(() => {
				expect(result.current.isMockMode).toBe(true);
			});

			const detections = await result.current.detect(null, 0);

			expect(detections.detections).toHaveLength(3);
			expect(detections.detections[0].categories[0].categoryName).toBe(
				"laptop",
			);
			expect(detections.detections[0].categories[0].score).toBe(0.92);
			expect(detections.detections[1].categories[0].categoryName).toBe("car");
			expect(detections.detections[2].categories[0].categoryName).toBe(
				"bicycle",
			);
		});

		it("mock detections have correct bounding box format", async () => {
			Object.defineProperty(globalThis, "location", {
				value: {
					href: "http://localhost:5173?mock=true",
					search: "?mock=true",
					pathname: "/",
					host: "localhost:5173",
				},
				writable: true,
				configurable: true,
			});

			const { result } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.isMockMode).toBe(true);
			});

			const detections = await result.current.detect(null, 0);

			// Verify MediaPipe-compatible format
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
			// Reset URL without mock param
			Object.defineProperty(globalThis, "location", {
				value: {
					href: "http://localhost:5173/",
					search: "",
					pathname: "/",
					host: "localhost:5173",
				},
				writable: true,
				configurable: true,
			});

			localStorageMock.getItem.mockReturnValue(null);

			const { result } = renderHook(() => useYOLODetection());

			expect(result.current.isMockMode).toBe(false);
		});
	});

	describe("hook API shape", () => {
		it("returns correct hook interface", async () => {
			const { result } = renderHook(() => useYOLODetection());

			// Verify the hook returns the expected shape matching useObjectDetection
			expect(result.current).toHaveProperty("detect");
			expect(result.current).toHaveProperty("isLoaded");
			expect(result.current).toHaveProperty("error");
			expect(result.current).toHaveProperty("isMockMode");

			expect(typeof result.current.detect).toBe("function");
			expect(typeof result.current.isLoaded).toBe("boolean");
			expect(typeof result.current.isMockMode).toBe("boolean");
			expect(
				result.current.error === null ||
					typeof result.current.error === "object",
			).toBe(true);
		});

		it("maintains stable detect function reference", async () => {
			const { result, rerender } = renderHook(() => useYOLODetection());

			await waitFor(() => {
				expect(result.current.isLoaded).toBe(true);
			});

			const detectFn = result.current.detect;

			// Rerender should not change the detect function reference
			rerender();

			expect(result.current.detect).toBe(detectFn);
		});
	});
});
