"use client";

import type { ItemBreakdown } from "@/types";

const STATUS = {
  covered: { label: "COVERED", bg: "#000000", color: "#FFFFFF" },
  conditional: { label: "CONDITIONAL", bg: "#F2F2F2", color: "#000000" },
  not_covered: { label: "NOT COVERED", bg: "#FF3000", color: "#FFFFFF" },
} as const;

interface ItemLineItemProps {
  item: ItemBreakdown;
}

export default function ItemLineItem({ item }: ItemLineItemProps) {
  const s = STATUS[item.status];
  const label = item.source === "manual" ? "MANUAL" : "DETECTED";

  return (
    <div className="flex items-start justify-between gap-3 border-b border-black/10 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="sw-body font-medium text-sm text-black capitalize truncate">
            {item.category}
          </span>
          <span
            className="sw-label px-1.5 py-0.5"
            style={{ background: s.bg, color: s.color, fontSize: 7, flexShrink: 0 }}
          >
            {s.label}
          </span>
        </div>
        <p className="sw-label text-[8px] tracking-[0.08em] text-black/45">
          {label} ITEM
          {item.confidence != null ? ` · ${Math.round(item.confidence * 100)}% CONFIDENCE` : ""}
        </p>
      </div>

      <div className="text-right flex-shrink-0 pl-4">
        <div className="sw-body font-bold text-sm text-black">
          ${item.estimatedValue.toLocaleString()}
        </div>
        <div
          className="sw-label"
          style={{ color: item.status === "not_covered" ? "#FF3000" : "#1a8a00", fontSize: 8 }}
        >
          {item.status === "not_covered"
            ? `−$${item.estimatedValue.toLocaleString()} EXPOSED`
            : item.status === "conditional"
              ? "CONDITIONAL REVIEW"
              : "COVERED"}
        </div>
      </div>
    </div>
  );
}
