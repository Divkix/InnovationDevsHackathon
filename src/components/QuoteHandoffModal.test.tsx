import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemBreakdown } from "@/types";

const useAppContext = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => useAppContext(),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("lucide-react", () => ({
  ArrowRight: () => <svg />,
  CheckCircle: () => <svg />,
  FileText: () => <svg />,
  X: () => <svg />,
}));

import { QuoteHandoffModal } from "./QuoteHandoffModal";

const detectedItems = new Map<string, ItemBreakdown>([
  [
    "1",
    {
      id: "1",
      category: "laptop",
      estimatedValue: 1200,
      status: "covered",
      color: "green",
      source: "detected",
    },
  ],
  [
    "2",
    {
      id: "2",
      category: "car",
      estimatedValue: 15000,
      status: "not_covered",
      color: "red",
      source: "detected",
    },
  ],
]);

describe("QuoteHandoffModal", () => {
  beforeEach(() => {
    useAppContext.mockReturnValue({
      policyType: "renters",
      language: "en",
      detectedItems,
      manualItems: [],
    });
  });

  it("renders a handoff preview and completes the send flow", () => {
    render(<QuoteHandoffModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("QUOTE HANDOFF")).toBeInTheDocument();
    expect(screen.getByText("laptop")).toBeInTheDocument();
    expect(screen.getByText("car")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Alex Morgan"), {
      target: { value: "Alex Morgan" },
    });
    fireEvent.change(screen.getByPlaceholderText("alex@example.com"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send handoff/i }));

    expect(screen.getByText(/transmission complete/i)).toBeInTheDocument();
  });
});
