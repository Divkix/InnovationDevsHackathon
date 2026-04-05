import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OwnershipCaptureModal } from "./OwnershipCaptureModal";

describe("OwnershipCaptureModal", () => {
  it("renders verification and fraud sections with initial values", () => {
    render(
      <OwnershipCaptureModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialValue={{
          serialNumber: "SN-12345",
          modelNumber: "MODEL-9",
          declaredValueOverride: "1850",
        }}
        verificationStatus={{
          tone: "verified",
          title: "Receipt confirmed",
          detail: "Matched against warranty export.",
          meta: "92% confidence",
        }}
        fraudStatus={{
          tone: "warning",
          title: "Value override needs review",
          detail: "Declared value exceeds median market range.",
        }}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SN-12345")).toBeInTheDocument();
    expect(screen.getByText("Receipt confirmed")).toBeInTheDocument();
    expect(screen.getByText("Value override needs review")).toBeInTheDocument();
    expect(screen.getByText("$1,850")).toBeInTheDocument();
  });

  it("validates and submits the capture payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<OwnershipCaptureModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /save ownership proof/i }));
    expect(screen.getByText(/serial is required/i)).toBeInTheDocument();
    expect(screen.getByText(/model is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("SN-24A8-00981"), {
      target: { value: "SN-24A8-00981" },
    });
    fireEvent.change(screen.getByPlaceholderText("QN65-SF450"), {
      target: { value: "QN65-SF450" },
    });
    fireEvent.change(screen.getByPlaceholderText("$1,850"), {
      target: { value: "2200" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "Gifted in 2022, original box retained, battery replaced in 2025.",
      ),
      {
        target: { value: "Stored in office cabinet." },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: /save ownership proof/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        serialNumber: "SN-24A8-00981",
        modelNumber: "QN65-SF450",
        receiptUrl: "",
        notes: "Stored in office cabinet.",
        declaredValueOverride: "2200",
      }),
    );
  });
});
