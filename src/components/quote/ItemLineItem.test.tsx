import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItemBreakdown } from "@/types";
import ItemLineItem from "./ItemLineItem";

describe("quote ItemLineItem", () => {
  it("renders coverage summary for an item", () => {
    const item: ItemBreakdown = {
      id: "1",
      category: "laptop",
      estimatedValue: 1200,
      status: "not_covered",
      color: "red",
      source: "detected",
      confidence: 0.94,
    };

    render(<ItemLineItem item={item} />);

    expect(screen.getByText("laptop")).toBeInTheDocument();
    expect(screen.getByText("NOT COVERED")).toBeInTheDocument();
    expect(screen.getByText("$1,200")).toBeInTheDocument();
    expect(screen.getByText("−$1,200 EXPOSED")).toBeInTheDocument();
  });
});
