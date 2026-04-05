import type {
  DetectedItem,
  ItemBreakdown,
  ManualItem,
  PolicyType,
  SupportedLanguage,
} from "../types";
import { getLanguageLabel } from "./language";
import { buildQuotePacket } from "./quotePacket";

export interface QuoteHandoffInput {
  policyType: PolicyType;
  language: SupportedLanguage;
  zipCode?: string;
  deductible?: number;
  totalValue: number;
  protectedValue: number;
  unprotectedValue: number;
  coverageGapPercentage: number;
  items: ItemBreakdown[];
  detectedItems?: DetectedItem[];
  manualItems?: ManualItem[];
  contactName?: string;
  contactEmail?: string;
  generatedAt?: Date;
}

export interface QuoteHandoffPackage {
  title: string;
  fileName: string;
  documentText: string;
  topActions: string[];
}

function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safeValue);
}

function formatPolicy(policyType: PolicyType): string {
  if (policyType === "none") return "No Insurance";
  return `${policyType.charAt(0).toUpperCase()}${policyType.slice(1)} Insurance`;
}

function formatStatus(status: ItemBreakdown["status"]): string {
  if (status === "covered") return "Covered";
  if (status === "conditional") return "Conditional";
  return "Not Covered";
}

function getTopActions(items: ItemBreakdown[]): string[] {
  return items
    .filter((item) => item.status !== "covered")
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 3)
    .map((item) => `Review ${item.category} (${formatCurrency(item.estimatedValue)} at risk)`);
}

export function buildQuoteHandoffDocument(input: QuoteHandoffInput): QuoteHandoffPackage {
  const generatedAt = input.generatedAt ?? new Date();
  const title = "InsureScope Quote Handoff";
  const languageLabel = getLanguageLabel(input.language);
  const policyLabel = formatPolicy(input.policyType);
  const hasRawItems =
    (input.detectedItems?.length ?? 0) > 0 || (input.manualItems?.length ?? 0) > 0;

  const packet = hasRawItems
    ? buildQuotePacket({
        detectedItems: input.detectedItems ?? [],
        manualItems: input.manualItems ?? [],
        policyType: input.policyType,
        language: input.language,
      })
    : null;

  const topActions = packet?.recommendedActions ?? getTopActions(input.items);
  const itemLines = input.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.category} - ${formatStatus(item.status)} - ${formatCurrency(item.estimatedValue)}`,
    )
    .join("\n");

  const documentText = packet
    ? [
        title,
        `Generated: ${generatedAt.toLocaleString()}`,
        `Policy: ${policyLabel}`,
        `Language: ${languageLabel}`,
        `ZIP: ${input.zipCode?.trim() || "Not captured"}`,
        `Deductible: ${typeof input.deductible === "number" ? formatCurrency(input.deductible) : "Not captured"}`,
        "",
        "Coverage Summary",
        `Total Value: ${formatCurrency(input.totalValue)}`,
        `Protected: ${formatCurrency(input.protectedValue)}`,
        `Exposure: ${formatCurrency(input.unprotectedValue)}`,
        `Coverage Gap: ${input.coverageGapPercentage.toFixed(1)}%`,
        "",
        packet.markdown,
        "",
        "Contact",
        `Name: ${input.contactName?.trim() || "Not provided"}`,
        `Email: ${input.contactEmail?.trim() || "Not provided"}`,
      ].join("\n")
    : [
        title,
        `Generated: ${generatedAt.toLocaleString()}`,
        `Policy: ${policyLabel}`,
        `Language: ${languageLabel}`,
        `ZIP: ${input.zipCode?.trim() || "Not captured"}`,
        `Deductible: ${typeof input.deductible === "number" ? formatCurrency(input.deductible) : "Not captured"}`,
        "",
        "Coverage Summary",
        `Total Value: ${formatCurrency(input.totalValue)}`,
        `Protected: ${formatCurrency(input.protectedValue)}`,
        `Exposure: ${formatCurrency(input.unprotectedValue)}`,
        `Coverage Gap: ${input.coverageGapPercentage.toFixed(1)}%`,
        "",
        "Item Inventory",
        itemLines || "No items captured yet.",
        "",
        "Recommended Actions",
        ...(topActions.length > 0
          ? topActions.map((action, index) => `${index + 1}. ${action}`)
          : ["1. Confirm policy details with the customer."]),
        "",
        "Contact",
        `Name: ${input.contactName?.trim() || "Not provided"}`,
        `Email: ${input.contactEmail?.trim() || "Not provided"}`,
      ].join("\n");

  return {
    title,
    fileName: `insurescope-quote-handoff-${generatedAt.toISOString().slice(0, 10)}.txt`,
    documentText,
    topActions,
  };
}
