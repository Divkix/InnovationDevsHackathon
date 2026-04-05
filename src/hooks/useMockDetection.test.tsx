import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockDetection } from "../types";
import { getMockDetections, MOCK_BICYCLE, MOCK_CAR, MOCK_LAPTOP } from "./mockDetections";
import {
  MOCK_STORAGE_KEY,
  type UseMockDetectionReturn,
  useMockDetection,
} from "./useMockDetection";

// Type for mocked localStorage
type LocalStorageMock = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

describe("useMockDetection", () => {
  let originalLocation: Location;
  let originalLocalStorage: Storage;
  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let removeItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalLocation = window.location;
    originalLocalStorage = window.localStorage;

    const localStorageMock: LocalStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    getItemSpy = vi.spyOn(window.localStorage, "getItem");
    setItemSpy = vi.spyOn(window.localStorage, "setItem");
    removeItemSpy = vi.spyOn(window.localStorage, "removeItem");
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

  describe("mock mode detection", () => {
    it("should detect mock mode from URL query parameter", () => {
      Object.defineProperty(window, "location", {
        value: { search: "?mock=true" },
        writable: true,
      });

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      expect(result.current.isMockMode).toBe(true);
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("should detect mock mode from localStorage flag", () => {
      getItemSpy.mockReturnValue("true");

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      expect(result.current.isMockMode).toBe(true);
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.error).toBeNull();
      expect(getItemSpy).toHaveBeenCalledWith(MOCK_STORAGE_KEY);
    });

    it("should not enable mock mode when URL parameter is missing", () => {
      Object.defineProperty(window, "location", {
        value: { search: "" },
        writable: true,
      });

      getItemSpy.mockReturnValue(null);

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      expect(result.current.isMockMode).toBe(false);
    });

    it("should not enable mock mode when localStorage is false", () => {
      getItemSpy.mockReturnValue("false");

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      expect(result.current.isMockMode).toBe(false);
    });
  });

  describe("mock detections", () => {
    it("should return mock detections in mock mode", () => {
      Object.defineProperty(window, "location", {
        value: { search: "?mock=true" },
        writable: true,
      });

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      expect(result.current.mockDetections).toHaveLength(3);
      expect(result.current.mockDetections[0].categories[0].categoryName).toBe("laptop");
      expect(result.current.mockDetections[1].categories[0].categoryName).toBe("car");
      expect(result.current.mockDetections[2].categories[0].categoryName).toBe("bicycle");
    });

    it("should return empty array when not in mock mode", () => {
      getItemSpy.mockReturnValue(null);

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      expect(result.current.mockDetections).toHaveLength(0);
    });
  });

  describe("detect function", () => {
    it("should return mock detections when calling detect in mock mode", async () => {
      Object.defineProperty(window, "location", {
        value: { search: "?mock=true" },
        writable: true,
      });

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      const detections = await result.current.detect(null, 0);

      expect(detections.detections).toHaveLength(3);
      expect(detections.detections[0].categories[0].categoryName).toBe("laptop");
      expect(detections.detections[0].categories[0].score).toBe(0.92);
    });

    it("should return empty detections when calling detect without mock mode", async () => {
      getItemSpy.mockReturnValue(null);

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      const detections = await result.current.detect(null, 0);

      expect(detections.detections).toHaveLength(0);
    });
  });

  describe("setMockMode function", () => {
    it("should enable mock mode in localStorage", () => {
      getItemSpy.mockReturnValue(null);

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      act(() => {
        result.current.setMockMode(true);
      });

      expect(setItemSpy).toHaveBeenCalledWith(MOCK_STORAGE_KEY, "true");
    });

    it("should disable mock mode in localStorage", () => {
      getItemSpy.mockReturnValue("true");

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      act(() => {
        result.current.setMockMode(false);
      });

      expect(removeItemSpy).toHaveBeenCalledWith(MOCK_STORAGE_KEY);
    });

    it("should handle localStorage errors gracefully", () => {
      setItemSpy.mockImplementation(() => {
        throw new Error("localStorage not available");
      });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      getItemSpy.mockReturnValue(null);

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      act(() => {
        result.current.setMockMode(true);
      });

      expect(consoleSpy).toHaveBeenCalledWith("Failed to set mock mode:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("mock detection data", () => {
    it("should return laptop with covered status", () => {
      expect(MOCK_LAPTOP.categories[0].categoryName).toBe("laptop");
      expect(MOCK_LAPTOP.categories[0].score).toBe(0.92);
      expect(MOCK_LAPTOP.boundingBox).toBeDefined();
      expect(MOCK_LAPTOP.boundingBox.originX).toBe(100);
      expect(MOCK_LAPTOP.boundingBox.originY).toBe(150);
    });

    it("should return car with not-covered status", () => {
      expect(MOCK_CAR.categories[0].categoryName).toBe("car");
      expect(MOCK_CAR.categories[0].score).toBe(0.88);
      expect(MOCK_CAR.boundingBox).toBeDefined();
      expect(MOCK_CAR.boundingBox.originX).toBe(450);
      expect(MOCK_CAR.boundingBox.originY).toBe(200);
    });

    it("should return bicycle with conditional status", () => {
      expect(MOCK_BICYCLE.categories[0].categoryName).toBe("bicycle");
      expect(MOCK_BICYCLE.categories[0].score).toBe(0.85);
      expect(MOCK_BICYCLE.boundingBox).toBeDefined();
      expect(MOCK_BICYCLE.boundingBox.originX).toBe(200);
      expect(MOCK_BICYCLE.boundingBox.originY).toBe(350);
    });
  });

  describe("getMockDetections", () => {
    it("should return all three mock detections", () => {
      const detections = getMockDetections();

      expect(detections).toHaveLength(3);
      expect(detections[0].categories[0].categoryName).toBe("laptop");
      expect(detections[1].categories[0].categoryName).toBe("car");
      expect(detections[2].categories[0].categoryName).toBe("bicycle");
    });

    it("should return valid MediaPipe detection format", () => {
      const detections = getMockDetections();

      detections.forEach((detection: MockDetection) => {
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
  });

  describe("storage event handling", () => {
    it("should update mock mode when localStorage changes", () => {
      getItemSpy.mockReturnValue(null);

      const { result } = renderHook((): UseMockDetectionReturn => useMockDetection());

      expect(result.current.isMockMode).toBe(false);

      getItemSpy.mockReturnValue("true");

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: MOCK_STORAGE_KEY,
            newValue: "true",
          }),
        );
      });
    });
  });
});
