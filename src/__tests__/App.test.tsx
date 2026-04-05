import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the object detection hook module (which imports YOLO)
vi.mock("../hooks/useObjectDetection", () => ({
  useObjectDetection: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    detections: [],
    isLoading: false,
    isModelLoaded: false,
    error: null,
    isMockMode: true,
    confidenceThreshold: 0.5,
    setConfidenceThreshold: vi.fn(),
    processFrame: vi.fn(),
    toggleMockMode: vi.fn(),
  }),
}));

// Import AFTER setting up mocks
import { render, screen } from "@testing-library/react";
import App from "../App";
import { AppProvider } from "../context/AppContext";

// Access the global localStorage mock from setupTests.ts
// The mock has an internal _store Map that we can manipulate
const globalLocalStorage = localStorage as unknown as {
  _store: Map<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  clear: () => void;
};

function renderWithProvider(ui: ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>);
}

describe("App", () => {
  beforeEach(() => {
    // Clear the localStorage store before each test
    globalLocalStorage._store.clear();
    vi.clearAllMocks();
  });

  it("renders the onboarding flow for new users", () => {
    renderWithProvider(<App />);
    // When onboarding is not complete, should show onboarding flow
    expect(screen.getByTestId("onboarding-flow")).toBeInTheDocument();
    expect(screen.getByText("Select Your Insurance")).toBeInTheDocument();
  });

  describe("after onboarding complete", () => {
    beforeEach(() => {
      // Set localStorage values to simulate completed onboarding
      // Must set these BEFORE rendering so the context reads them on mount
      globalLocalStorage._store.set("insurescope_policyType", "renters");
      globalLocalStorage._store.set("insurescope_onboardingComplete", "true");
      globalLocalStorage._store.set("insurescope_manualItems", "[]");
      globalLocalStorage._store.set("insurescope_confidenceThreshold", "0.5");
    });

    it("renders the InsureScope heading", () => {
      renderWithProvider(<App />);
      expect(screen.getByText("InsureScope")).toBeInTheDocument();
    });

    it("renders the Camera and Dashboard tabs", () => {
      renderWithProvider(<App />);
      expect(screen.getByTestId("tab-camera")).toBeInTheDocument();
      expect(screen.getByTestId("tab-dashboard")).toBeInTheDocument();
    });

    it("renders the Policy Selector in header", () => {
      renderWithProvider(<App />);
      expect(screen.getByTestId("policy-selector")).toBeInTheDocument();
    });
  });
});
