import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnershipSummaryCard } from "./OwnershipSummaryCard";

describe("OwnershipSummaryCard", () => {
  it("renders all ownership and fraud summary values", () => {
    render(
      <OwnershipSummaryCard
        verifiedItemsCount={12}
        pendingSerialCaptures={3}
        reviewFlags={2}
        totalVerifiedValue={18450}
      />,
    );

    expect(screen.getByTestId("ownership-summary-card")).toBeInTheDocument();
    expect(screen.getByText("Ownership Ledger")).toBeInTheDocument();
    expect(screen.getAllByText("12").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$18,450").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("12 items verified")).toBeInTheDocument();
    expect(screen.getByText("3 captures still needed")).toBeInTheDocument();
    expect(screen.getByText("2 flags awaiting review")).toBeInTheDocument();
  });

  it("clamps invalid values and supports custom copy", () => {
    render(
      <OwnershipSummaryCard
        verifiedItemsCount={-4}
        pendingSerialCaptures={Number.NaN}
        reviewFlags={1.7}
        totalVerifiedValue={-999}
        title="Proof Stack"
        subtitle="Use this panel to see what needs receipts, serials, and a manual fraud check."
      />,
    );

    expect(screen.getByText("Proof Stack")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use this panel to see what needs receipts, serials, and a manual fraud check.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("$0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2 flags awaiting review")).toBeInTheDocument();
  });
});
