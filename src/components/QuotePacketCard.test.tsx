import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectedItem, ManualItem } from "@/types";
import { QuotePacketCard } from "./QuotePacketCard";

vi.mock("framer-motion", () => ({
  motion: {
    section: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <section {...props}>{children}</section>
    ),
  },
}));

const detectedItems: DetectedItem[] = [
  {
    id: "det-1",
    category: "laptop",
    confidence: 0.94,
    boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
    categories: [{ categoryName: "laptop", score: 0.94, displayName: "Laptop" }],
    valuation: { estimatedValue: 1400, finalValue: 1400, source: "ai" },
    ownership: {
      status: "verified",
      evidence: {
        itemPhotoUrl: "https://example.com/item-photo.jpg",
        serialPhotoUrl: "https://example.com/serial-photo.jpg",
      },
    },
  },
];

const manualItems: ManualItem[] = [
  {
    id: "man-1",
    name: "Studio Camera",
    category: "camera",
    estimatedValue: 900,
    valuation: {
      estimatedValue: 900,
      finalValue: 975,
      source: "user",
      overrideValue: 975,
      overrideReason: "Replacement estimate",
    },
    ownership: {
      status: "serial_captured",
      evidence: {
        receiptUrl: "https://example.com/receipt.pdf",
      },
    },
  },
];

describe("QuotePacketCard", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("renders packet items and supports copying the brief", async () => {
    render(
      <QuotePacketCard
        detectedItems={detectedItems}
        manualItems={manualItems}
        policyType="renters"
        language="en"
      />,
    );

    expect(screen.getByTestId("quote-packet-card")).toBeInTheDocument();
    expect(screen.getByText("Inventory packet ready for an agent review")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Studio Camera")).toBeInTheDocument();
    expect(screen.getByText("Item photo")).toBeInTheDocument();
    expect(screen.getByText("Receipt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy brief/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
  });
});
