import { fireEvent, type RenderResult, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { AppProvider } from "@/context/AppContext";
import type { CoverageResult, DetectedItem, ManualItem, PolicyType } from "../../types";
import { PolicySelector } from "./PolicySelector";

// Mock localStorage for jsdom
interface LocalStorageMock {
  getItem: MockInstance<(key: string) => string | null>;
  setItem: MockInstance<(key: string, value: string) => void>;
  removeItem: MockInstance<(key: string) => void>;
  clear: MockInstance<() => void>;
}

const localStorageMock: LocalStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock detected items
const mockDetectedItems: DetectedItem[] = [
  {
    id: "1",
    category: "laptop",
    confidence: 0.95,
    boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
    categories: [{ categoryName: "laptop", score: 0.95, displayName: "Laptop" }],
    coverage: {
      status: "covered",
      color: "green",
      estimatedValue: 1200,
      note: "Covered under renters",
      conditions: [],
      upgrade: null,
    },
  },
  {
    id: "2",
    category: "car",
    confidence: 0.92,
    boundingBox: { originX: 0, originY: 0, width: 200, height: 150 },
    categories: [{ categoryName: "car", score: 0.92, displayName: "Car" }],
    coverage: {
      status: "not_covered",
      color: "red",
      estimatedValue: 15000,
      note: "Not covered under renters",
      conditions: [],
      upgrade: "Consider appropriate coverage",
    },
  },
];

// Mock detected items with 3 items (for dashboard arithmetic tests)
const mockDetectedItemsThree: DetectedItem[] = [
  {
    id: "1",
    category: "laptop",
    confidence: 0.95,
    boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
    categories: [{ categoryName: "laptop", score: 0.95, displayName: "Laptop" }],
    coverage: {
      status: "covered",
      color: "green",
      estimatedValue: 1200,
      note: "Covered under renters",
      conditions: [],
      upgrade: null,
    },
  },
  {
    id: "2",
    category: "car",
    confidence: 0.92,
    boundingBox: { originX: 0, originY: 0, width: 200, height: 150 },
    categories: [{ categoryName: "car", score: 0.92, displayName: "Car" }],
    coverage: {
      status: "not_covered",
      color: "red",
      estimatedValue: 15000,
      note: "Not covered under renters",
      conditions: [],
      upgrade: "Consider appropriate coverage",
    },
  },
  {
    id: "3",
    category: "cell phone",
    confidence: 0.88,
    boundingBox: { originX: 0, originY: 0, width: 50, height: 100 },
    categories: [{ categoryName: "cell phone", score: 0.88, displayName: "Cell Phone" }],
    coverage: {
      status: "not_covered",
      color: "red",
      estimatedValue: 800,
      note: "Not covered under renters",
      conditions: [],
      upgrade: "Consider appropriate coverage",
    },
  },
];

// Empty manual items
const mockManualItems: ManualItem[] = [];

// Mock coverage lookup function type
type LookupCoverageFn = (category: string, policyType: PolicyType) => CoverageResult;

// Mock the coverageLookup module
vi.mock("@/utils/coverageLookup", () => ({
  lookupCoverage: vi.fn((category: string, policyType: PolicyType): CoverageResult => {
    // Get estimated value based on category
    const categoryValues: Record<string, number> = {
      laptop: 1200,
      car: 15000,
      "cell phone": 800,
    };
    const estimatedValue = categoryValues[category] || 1000;

    // Return different coverage based on policy type
    if (policyType === "none") {
      return {
        status: "not_covered",
        color: "red",
        estimatedValue,
        note: "Not covered - no insurance",
        conditions: [],
        upgrade: "Get insurance",
      };
    }
    if (policyType === "renters") {
      // Laptop covered, car and cell phone not covered under renters
      if (category === "laptop") {
        return {
          status: "covered",
          color: "green",
          estimatedValue,
          note: "Covered under renters",
          conditions: [],
          upgrade: null,
        };
      }
      return {
        status: "not_covered",
        color: "red",
        estimatedValue,
        note: "Not covered under renters",
        conditions: [],
        upgrade: "Consider appropriate coverage",
      };
    }
    if (policyType === "auto") {
      // Car covered, laptop and cell phone not covered under auto
      if (category === "car") {
        return {
          status: "covered",
          color: "green",
          estimatedValue,
          note: "Covered under auto",
          conditions: [],
          upgrade: null,
        };
      }
      return {
        status: "not_covered",
        color: "red",
        estimatedValue,
        note: "Not covered - auto only covers vehicles",
        conditions: [],
        upgrade: "Consider renters insurance",
      };
    }
    if (policyType === "homeowners") {
      // All covered under homeowners
      return {
        status: "covered",
        color: "green",
        estimatedValue,
        note: "Covered under homeowners",
        conditions: [],
        upgrade: null,
      };
    }
    // Default fallback
    return {
      status: "not_covered",
      color: "red",
      estimatedValue,
      note: "Unknown category",
      conditions: [],
      upgrade: "Consult agent",
    };
  }) as LookupCoverageFn,
  VALID_POLICY_TYPES: ["renters", "homeowners", "auto", "none"] as PolicyType[],
}));

describe("PolicySelector", () => {
  const renderWithProvider = (component: ReactElement): RenderResult => {
    return render(<AppProvider>{component}</AppProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("Rendering", () => {
    it("renders all 4 policy options", () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      expect(screen.getAllByText(/Renter's Insurance/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Homeowner's Insurance/i)).toBeInTheDocument();
      expect(screen.getByText(/Auto Insurance/i)).toBeInTheDocument();
      expect(screen.getByText(/No Insurance/i)).toBeInTheDocument();
    });

    it("renders policy icons for each option", () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      // Each policy option should have an icon (using data-testid)
      const policyButtons = screen.getAllByTestId("policy-option");
      expect(policyButtons).toHaveLength(4);
    });

    it("has accessible labels for screen readers", () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      expect(screen.getByLabelText(/Select Renter's Insurance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Select Homeowner's Insurance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Select Auto Insurance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Select No Insurance/i)).toBeInTheDocument();
    });
  });

  describe("Policy Selection", () => {
    it("highlights the current policy type", () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      // Default policy is 'renters' - should be highlighted
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);
      expect(rentersOption).toHaveAttribute("aria-pressed", "true");
    });

    it("updates selection when a policy is clicked", async () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const autoOption = screen.getByLabelText(/Select Auto Insurance/i);

      fireEvent.click(autoOption);

      await waitFor(() => {
        expect(autoOption).toHaveAttribute("aria-pressed", "true");
      });

      // Previous selection should no longer be pressed
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);
      expect(rentersOption).toHaveAttribute("aria-pressed", "false");
    });

    it("allows switching between all policy types", async () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const policies: Array<{ label: RegExp; name: PolicyType }> = [
        { label: /Select Homeowner's Insurance/i, name: "homeowners" },
        { label: /Select Auto Insurance/i, name: "auto" },
        { label: /Select No Insurance/i, name: "none" },
        { label: /Select Renter's Insurance/i, name: "renters" },
      ];

      for (const policy of policies) {
        const option = screen.getByLabelText(policy.label);
        fireEvent.click(option);

        await waitFor(() => {
          expect(option).toHaveAttribute("aria-pressed", "true");
        });
      }
    });

    it("persists selected policy to localStorage", async () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const autoOption = screen.getByLabelText(/Select Auto Insurance/i);
      fireEvent.click(autoOption);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith("insurescope_policyType", "auto");
      });
    });
  });

  describe("Red Moment - No Insurance Mode", () => {
    it("shows all items as not covered when No Insurance is selected", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      // Select No Insurance
      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i);
      fireEvent.click(noInsuranceOption);

      await waitFor(() => {
        // Check that the "all red" indicator is shown
        expect(screen.getByTestId("red-moment-indicator")).toBeInTheDocument();
        expect(screen.getByText(/All items not covered/i)).toBeInTheDocument();
      });
    });

    it("displays 100% coverage gap for No Insurance", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i);
      fireEvent.click(noInsuranceOption);

      await waitFor(() => {
        expect(screen.getByTestId("coverage-gap")).toHaveTextContent("100.0%");
      });
    });

    it("shows protected value as $0 for No Insurance", async () => {
      const singleItem: DetectedItem[] = [
        {
          id: "1",
          category: "laptop",
          confidence: 0.95,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: "laptop", score: 0.95, displayName: "Laptop" }],
          coverage: {
            status: "covered",
            color: "green",
            estimatedValue: 1200,
            note: "Covered under renters",
            conditions: [],
            upgrade: null,
          },
        },
      ];

      renderWithProvider(
        <PolicySelector detectedItems={singleItem} manualItems={mockManualItems} />,
      );

      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i);
      fireEvent.click(noInsuranceOption);

      await waitFor(() => {
        expect(screen.getByTestId("protected-value")).toHaveTextContent("$0");
      });
    });

    it("shows unprotected value equal to total for No Insurance", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i);
      fireEvent.click(noInsuranceOption);

      await waitFor(() => {
        expect(screen.getByTestId("unprotected-value")).toHaveTextContent("$16,200");
      });
    });
  });

  describe("Coverage Restoration", () => {
    it("restores original colors when switching back from No Insurance", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      // Start with renters (laptop covered, car not covered)
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);

      // Switch to No Insurance
      const noInsuranceOption = screen.getByLabelText(/Select No Insurance/i);
      fireEvent.click(noInsuranceOption);

      await waitFor(() => {
        expect(screen.getByTestId("red-moment-indicator")).toBeInTheDocument();
      });

      // Switch back to renters
      fireEvent.click(rentersOption);

      await waitFor(() => {
        // Red moment indicator should be gone
        expect(screen.queryByTestId("red-moment-indicator")).not.toBeInTheDocument();
        // Coverage gap should reflect renters policy (not 100%)
        const gapText = screen.getByTestId("coverage-gap").textContent;
        expect(gapText).not.toBe("100.0%");
      });
    });

    it("correctly updates dashboard totals when switching policies", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      // Check initial values under renters
      await waitFor(() => {
        expect(screen.getByTestId("protected-value")).toHaveTextContent("$1,200");
        expect(screen.getByTestId("unprotected-value")).toHaveTextContent("$15,000");
      });

      // Switch to homeowners (both covered)
      const homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i);
      fireEvent.click(homeownersOption);

      await waitFor(() => {
        expect(screen.getByTestId("protected-value")).toHaveTextContent("$16,200");
        expect(screen.getByTestId("unprotected-value")).toHaveTextContent("$0");
      });
    });
  });

  describe("Rapid Switching", () => {
    it("settles on correct final state after rapid policy switches", async () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i);
      const homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i);
      const noneOption = screen.getByLabelText(/Select No Insurance/i);

      // Rapidly switch policies
      fireEvent.click(autoOption);
      fireEvent.click(homeownersOption);
      fireEvent.click(noneOption);
      fireEvent.click(rentersOption);
      fireEvent.click(autoOption);

      // Should settle on auto (last clicked)
      await waitFor(() => {
        expect(autoOption).toHaveAttribute("aria-pressed", "true");
        expect(rentersOption).toHaveAttribute("aria-pressed", "false");
        expect(homeownersOption).toHaveAttribute("aria-pressed", "false");
        expect(noneOption).toHaveAttribute("aria-pressed", "false");
      });

      // localStorage should have final value
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith("insurescope_policyType", "auto");
    });

    it("handles 5 rapid switches within 3 seconds", async () => {
      const singleItem: DetectedItem[] = [
        {
          id: "1",
          category: "laptop",
          confidence: 0.95,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: "laptop", score: 0.95, displayName: "Laptop" }],
          coverage: {
            status: "covered",
            color: "green",
            estimatedValue: 1200,
            note: "Covered under renters",
            conditions: [],
            upgrade: null,
          },
        },
      ];

      renderWithProvider(
        <PolicySelector detectedItems={singleItem} manualItems={mockManualItems} />,
      );

      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i);

      // Perform 5 rapid switches
      fireEvent.click(autoOption);
      fireEvent.click(rentersOption);
      fireEvent.click(autoOption);
      fireEvent.click(rentersOption);
      fireEvent.click(autoOption);

      // Should settle on auto
      await waitFor(() => {
        expect(autoOption).toHaveAttribute("aria-pressed", "true");
        // Coverage values should reflect auto policy
        expect(screen.getByTestId("coverage-gap")).toBeInTheDocument();
      });
    });
  });

  describe("Distinct Coverage Maps", () => {
    it("produces distinct coverage results for all 4 policy types", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      const policies: Array<{ label: RegExp; name: PolicyType; expectedGap: string }> = [
        { label: /Select Renter's Insurance/i, name: "renters", expectedGap: "92.6%" },
        { label: /Select Homeowner's Insurance/i, name: "homeowners", expectedGap: "0.0%" },
        { label: /Select Auto Insurance/i, name: "auto", expectedGap: "7.4%" },
        { label: /Select No Insurance/i, name: "none", expectedGap: "100.0%" },
      ];

      for (const policy of policies) {
        const option = screen.getByLabelText(policy.label);
        fireEvent.click(option);

        await waitFor(() => {
          expect(screen.getByTestId("coverage-gap")).toHaveTextContent(policy.expectedGap);
        });
      }
    });

    it("shows different protected values for each policy type", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      // Test renters: laptop covered ($1200), car not covered
      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);
      fireEvent.click(rentersOption);

      await waitFor(() => {
        expect(screen.getByTestId("protected-value")).toHaveTextContent("$1,200");
      });

      // Test auto: laptop not covered, car covered ($15000)
      const autoOption = screen.getByLabelText(/Select Auto Insurance/i);
      fireEvent.click(autoOption);

      await waitFor(() => {
        expect(screen.getByTestId("protected-value")).toHaveTextContent("$15,000");
      });

      // Test homeowners: both covered ($16200)
      const homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i);
      fireEvent.click(homeownersOption);

      await waitFor(() => {
        expect(screen.getByTestId("protected-value")).toHaveTextContent("$16,200");
      });
    });
  });

  describe("Dashboard Arithmetic Invariant", () => {
    it("maintains total = protected + unprotected during policy switches", async () => {
      const expectedTotal = 17000;

      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItemsThree} manualItems={mockManualItems} />,
      );

      const policies: RegExp[] = [
        /Select Renter's Insurance/i,
        /Select Homeowner's Insurance/i,
        /Select Auto Insurance/i,
        /Select No Insurance/i,
      ];

      for (const policyLabel of policies) {
        const option = screen.getByLabelText(policyLabel);
        fireEvent.click(option);

        await waitFor(() => {
          const totalText = screen.getByTestId("total-value").textContent;
          const protectedText = screen.getByTestId("protected-value").textContent;
          const unprotectedText = screen.getByTestId("unprotected-value").textContent;

          // Parse currency values
          const total = parseInt(totalText?.replace(/[^0-9]/g, ""), 10);
          const protected_ = parseInt(protectedText?.replace(/[^0-9]/g, ""), 10);
          const unprotected = parseInt(unprotectedText?.replace(/[^0-9]/g, ""), 10);

          expect(total).toBe(expectedTotal);
          expect(protected_ + unprotected).toBe(expectedTotal);
        });
      }
    });

    it("shows total value correctly for No Insurance (total = unprotected)", async () => {
      renderWithProvider(
        <PolicySelector detectedItems={mockDetectedItems} manualItems={mockManualItems} />,
      );

      const noneOption = screen.getByLabelText(/Select No Insurance/i);
      fireEvent.click(noneOption);

      await waitFor(() => {
        expect(screen.getByTestId("total-value")).toHaveTextContent("$16,200");
        expect(screen.getByTestId("protected-value")).toHaveTextContent("$0");
        expect(screen.getByTestId("unprotected-value")).toHaveTextContent("$16,200");
      });
    });
  });

  describe("Accessibility", () => {
    it("supports keyboard navigation between policy options", () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);

      // Should be focusable
      rentersOption.focus();
      expect(document.activeElement).toBe(rentersOption);
    });

    it("allows selection via Enter key", async () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const autoOption = screen.getByLabelText(/Select Auto Insurance/i);

      autoOption.focus();
      fireEvent.keyDown(autoOption, { key: "Enter" });

      await waitFor(() => {
        expect(autoOption).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("allows selection via Space key", async () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const homeownersOption = screen.getByLabelText(/Select Homeowner's Insurance/i);

      homeownersOption.focus();
      fireEvent.keyDown(homeownersOption, { key: " " });

      await waitFor(() => {
        expect(homeownersOption).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("has visible focus indicators", () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      const rentersOption = screen.getByLabelText(/Select Renter's Insurance/i);
      rentersOption.focus();

      // Check for focus ring class
      expect(rentersOption).toHaveClass("focus:ring-2");
    });
  });

  describe("Header Bar Integration", () => {
    it("renders in compact mode when used in header", () => {
      renderWithProvider(<PolicySelector variant="compact" detectedItems={[]} manualItems={[]} />);

      expect(screen.getByTestId("policy-selector")).toHaveClass("compact");
    });

    it("renders in full mode by default", () => {
      renderWithProvider(<PolicySelector detectedItems={[]} manualItems={[]} />);

      expect(screen.getByTestId("policy-selector")).not.toHaveClass("compact");
    });

    it("shows current policy label in compact mode", () => {
      renderWithProvider(<PolicySelector variant="compact" detectedItems={[]} manualItems={[]} />);

      expect(screen.getByText(/Current Policy:/i)).toBeInTheDocument();
    });
  });

  describe("Real-time Updates", () => {
    it("updates coverage display within 1 second of policy change", async () => {
      const singleItem: DetectedItem[] = [
        {
          id: "1",
          category: "laptop",
          confidence: 0.95,
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
          categories: [{ categoryName: "laptop", score: 0.95, displayName: "Laptop" }],
          coverage: {
            status: "covered",
            color: "green",
            estimatedValue: 1200,
            note: "Covered under renters",
            conditions: [],
            upgrade: null,
          },
        },
      ];

      renderWithProvider(
        <PolicySelector detectedItems={singleItem} manualItems={mockManualItems} />,
      );

      const startTime = Date.now();

      const noneOption = screen.getByLabelText(/Select No Insurance/i);
      fireEvent.click(noneOption);

      await waitFor(
        () => {
          expect(screen.getByTestId("red-moment-indicator")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
