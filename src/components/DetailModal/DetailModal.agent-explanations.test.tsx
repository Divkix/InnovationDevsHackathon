import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider } from "@/context/AppContext";
import { DetailModal } from "./DetailModal";

const storageState: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storageState[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageState[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storageState[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storageState).forEach((key) => {
      delete storageState[key];
    });
  }),
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

vi.mock("@/utils/coverageLookup", () => ({
  lookupCoverage: vi.fn(() => ({
    status: "covered",
    color: "green",
    estimatedValue: 1200,
    note: "Personal electronics are covered under renter's personal property coverage",
    conditions: [],
    upgrade: "Consider replacement cost coverage for full value reimbursement",
  })),
}));

const askAboutCoverage = vi.fn();

vi.mock("@/hooks/useGemini", () => ({
  useGemini: () => ({
    apiKey: "test-key",
    isConfigured: true,
    askAboutCoverage,
    analyzeRoom: vi.fn(),
  }),
}));

function renderWithProvider(component: ReactNode) {
  return render(<AppProvider>{component}</AppProvider>);
}

function createDetectedItem(id: string, category: string) {
  return {
    id,
    category,
    confidence: 0.92,
    boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
    categories: [{ categoryName: category, score: 0.92, displayName: category }],
    source: "camera" as const,
  };
}

describe("DetailModal agent explanations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(storageState).forEach((key) => {
      delete storageState[key];
    });
    storageState.insurescope_language = "es";
    storageState.insurescope_voiceEnabled = "true";
    storageState.insurescope_ttsEnabled = "true";
  });

  it("requests and renders a Gemini-backed explanation for the current item", async () => {
    askAboutCoverage.mockResolvedValue({
      explanation: "Su laptop normalmente está cubierta bajo renters, sujeto al deducible.",
      language: "es",
      confidence: 0.93,
    });

    renderWithProvider(
      <DetailModal
        isOpen={true}
        onClose={vi.fn()}
        item={createDetectedItem("item-1", "laptop")}
        policyType="renters"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ask gemini about laptop/i }));

    await waitFor(() => expect(askAboutCoverage).toHaveBeenCalledOnce());
    expect(askAboutCoverage).toHaveBeenCalledWith({
      item: "Laptop",
      policyType: "renters",
      coverageStatus: "covered",
      coverageNote: "Personal electronics are covered under renter's personal property coverage",
      language: "es",
    });

    expect(await screen.findByTestId("gemini-explanation")).toHaveTextContent(
      "Su laptop normalmente está cubierta bajo renters, sujeto al deducible.",
    );
    expect(screen.getByRole("button", { name: /listen to explanation/i })).toBeInTheDocument();
  });

  it("clears the prior Gemini explanation when the modal is reused for a different item", async () => {
    askAboutCoverage.mockResolvedValue({
      explanation: "Su laptop normalmente está cubierta bajo renters, sujeto al deducible.",
      language: "es",
      confidence: 0.93,
    });

    const { rerender } = renderWithProvider(
      <DetailModal
        isOpen={true}
        onClose={vi.fn()}
        item={createDetectedItem("item-1", "laptop")}
        policyType="renters"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ask gemini about laptop/i }));
    expect(await screen.findByTestId("gemini-explanation")).toBeInTheDocument();

    rerender(
      <AppProvider>
        <DetailModal
          isOpen={true}
          onClose={vi.fn()}
          item={createDetectedItem("item-2", "camera")}
          policyType="renters"
        />
      </AppProvider>,
    );

    expect(screen.queryByTestId("gemini-explanation")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /listen to summary/i })).toBeInTheDocument();
  });
});
