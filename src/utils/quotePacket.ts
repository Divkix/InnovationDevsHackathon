import type {
  DetectedItem,
  ManualItem,
  OwnershipEvidence,
  PolicyType,
  QuotePacket,
  QuotePacketAttachment,
  QuotePacketItem,
  QuotePacketRequest,
  SupportedLanguage,
} from "../types";
import { lookupCoverage } from "./coverageLookup";
import { getLanguageLabel } from "./language";
import {
  calculateValues,
  formatCurrency,
  formatPercentage,
  getUpgradeRecommendations,
} from "./valueCalculator";

const POLICY_LABELS: Record<PolicyType, string> = {
  renters: "Renters insurance",
  homeowners: "Homeowners insurance",
  auto: "Auto insurance",
  none: "No insurance",
};

const COVERAGE_LABELS: Record<QuotePacketItem["coverageStatus"], string> = {
  covered: "Covered",
  conditional: "Conditional",
  not_covered: "Not covered",
};

const ATTACHMENT_DEFINITIONS: Array<{
  key: keyof OwnershipEvidence;
  label: string;
  kind: QuotePacketAttachment["kind"];
}> = [
  { key: "itemPhotoUrl", label: "Item photo", kind: "photo" },
  { key: "serialPhotoUrl", label: "Serial photo", kind: "photo" },
  { key: "receiptUrl", label: "Receipt", kind: "document" },
];

function capitalizeWords(value: string): string {
  return value
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPolicyLabel(policyType: PolicyType): string {
  return POLICY_LABELS[policyType] ?? "Insurance";
}

function formatGeneratedAtLabel(isoValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoValue));
}

function buildAttachments(evidence: OwnershipEvidence | undefined): QuotePacketAttachment[] {
  if (!evidence) {
    return [];
  }

  return ATTACHMENT_DEFINITIONS.flatMap((entry) => {
    const url = evidence[entry.key];
    if (typeof url !== "string" || !url.trim()) {
      return [];
    }

    return [{ label: entry.label, url: url.trim(), kind: entry.kind }];
  });
}

function buildPacketItem(
  item: DetectedItem | ManualItem,
  source: "detected" | "manual",
  policyType: PolicyType,
): QuotePacketItem {
  const coverage = lookupCoverage(item.category, policyType);
  const ownershipStatus = item.ownership?.status ?? "unverified";
  const attachments = buildAttachments(item.ownership?.evidence);
  const displayName =
    source === "manual"
      ? "name" in item && item.name.trim()
        ? item.name.trim()
        : capitalizeWords(item.category)
      : capitalizeWords(item.category);

  const estimatedValue =
    typeof item.valuation?.finalValue === "number"
      ? item.valuation.finalValue
      : "estimatedValue" in item && typeof item.estimatedValue === "number"
        ? item.estimatedValue
        : coverage.estimatedValue;

  const notes = [item.ownership?.agentSummary, item.ownership?.evidence?.sourceNotes, coverage.note]
    .filter((entry): entry is string => Boolean(entry?.trim()))
    .map((entry) => entry.trim())
    .join(" ");

  return {
    id: item.id,
    displayName,
    category: item.category,
    source,
    estimatedValue: Math.max(0, estimatedValue),
    coverageStatus: coverage.status,
    coverageLabel: COVERAGE_LABELS[coverage.status],
    ownershipStatus,
    proofLabel:
      ownershipStatus === "verified"
        ? "Verified"
        : attachments.length > 0
          ? "Documented"
          : "Unverified",
    confidence: "confidence" in item ? item.confidence : undefined,
    notes: notes || undefined,
    attachments,
  };
}

function countAttachments(items: QuotePacketItem[], kind: QuotePacketAttachment["kind"]): number {
  return items.reduce(
    (total, item) =>
      total + item.attachments.filter((attachment) => attachment.kind === kind).length,
    0,
  );
}

function buildBrief(packet: QuotePacket): string {
  const topItems = packet.items.slice(0, 5);
  const lines = [
    "InsureScope quote packet ready for agent handoff.",
    `Policy: ${packet.policyLabel}`,
    `Language: ${packet.languageLabel}`,
    `Items: ${packet.itemCount} total (${packet.detectedCount} detected, ${packet.manualCount} manual)`,
    `Totals: ${formatCurrency(packet.totalValue)} total, ${formatCurrency(packet.protectedValue)} protected, ${formatCurrency(packet.unprotectedValue)} exposed (${formatPercentage(packet.coverageGapPercentage)} gap)`,
    `Evidence: ${packet.photoCount} photos, ${packet.documentCount} documents, ${packet.evidenceCount} items with proof`,
  ];

  if (topItems.length > 0) {
    lines.push("", "Top items:");
    topItems.forEach((item, index) => {
      const attachmentSummary =
        item.attachments.length > 0
          ? `${item.attachments.length} attachment${item.attachments.length === 1 ? "" : "s"}`
          : "no attachments";
      lines.push(
        `${index + 1}. ${item.displayName} - ${formatCurrency(item.estimatedValue)} - ${item.coverageLabel} - ${item.proofLabel} (${attachmentSummary})`,
      );
    });
  }

  if (packet.reviewCount > 0) {
    lines.push(
      "",
      `${packet.reviewCount} item${packet.reviewCount === 1 ? "" : "s"} need review before send-off.`,
    );
  }

  return lines.join("\n");
}

function buildMarkdown(packet: QuotePacket): string {
  const lines = [
    "# InsureScope Quote Packet",
    "",
    `- Packet ID: ${packet.packetId}`,
    `- Generated: ${packet.generatedAtLabel}`,
    `- Policy: ${packet.policyLabel}`,
    `- Language: ${packet.languageLabel}`,
    "",
    "## Summary",
    `- Total value: ${formatCurrency(packet.totalValue)}`,
    `- Protected value: ${formatCurrency(packet.protectedValue)}`,
    `- Exposure: ${formatCurrency(packet.unprotectedValue)} (${formatPercentage(packet.coverageGapPercentage)})`,
    `- Verified value: ${formatCurrency(packet.verifiedValue)}`,
    `- Evidence-backed items: ${packet.evidenceCount}`,
    `- Photos: ${packet.photoCount}`,
    `- Documents: ${packet.documentCount}`,
    "",
    "## Handoff Brief",
    packet.brief,
    "",
  ];

  if (packet.recommendedActions.length > 0) {
    lines.push("## Recommended Actions");
    packet.recommendedActions.forEach((action) => {
      lines.push(`- ${action}`);
    });
    lines.push("");
  }

  lines.push("## Items");
  for (const item of packet.items) {
    lines.push(`### ${item.displayName}`);
    lines.push(`- Category: ${item.category}`);
    lines.push(`- Source: ${item.source}`);
    lines.push(`- Estimated value: ${formatCurrency(item.estimatedValue)}`);
    lines.push(`- Coverage: ${item.coverageLabel}`);
    lines.push(`- Ownership: ${item.proofLabel}`);

    if (item.confidence !== undefined) {
      lines.push(`- Confidence: ${(item.confidence * 100).toFixed(0)}%`);
    }

    if (item.notes) {
      lines.push(`- Notes: ${item.notes}`);
    }

    if (item.attachments.length > 0) {
      lines.push("- Attachments:");
      item.attachments.forEach((attachment) => {
        lines.push(`  - ${attachment.label}: ${attachment.url}`);
      });
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

export function buildQuotePacket(input: QuotePacketRequest): QuotePacket {
  const detectedItems = Array.isArray(input.detectedItems) ? input.detectedItems : [];
  const manualItems = Array.isArray(input.manualItems) ? input.manualItems : [];
  const policyType = input.policyType;
  const language: SupportedLanguage = input.language ?? "en";
  const calculation = calculateValues(detectedItems, manualItems, policyType);
  const generatedAt = new Date().toISOString();
  const seenIds = new Set<string>();
  const packetItems: QuotePacketItem[] = [];

  for (const item of detectedItems) {
    if (!item?.id || seenIds.has(item.id)) {
      continue;
    }
    seenIds.add(item.id);
    packetItems.push(buildPacketItem(item, "detected", policyType));
  }

  for (const item of manualItems) {
    if (!item?.id || seenIds.has(item.id)) {
      continue;
    }
    seenIds.add(item.id);
    packetItems.push(buildPacketItem(item, "manual", policyType));
  }

  const verifiedValue = packetItems.reduce((total, item) => {
    if (item.ownershipStatus !== "verified") {
      return total;
    }

    return total + item.estimatedValue;
  }, 0);

  const photoCount = countAttachments(packetItems, "photo");
  const documentCount = countAttachments(packetItems, "document");
  const evidenceCount = packetItems.filter((item) => item.attachments.length > 0).length;
  const reviewCount = packetItems.filter(
    (item) => item.ownershipStatus !== "verified" || item.attachments.length === 0,
  ).length;
  const recommendedActions = getUpgradeRecommendations(calculation.items, policyType).slice(0, 3);

  const packet: QuotePacket = {
    packetId: `packet-${generatedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    generatedAt,
    generatedAtLabel: formatGeneratedAtLabel(generatedAt),
    policyType,
    policyLabel: formatPolicyLabel(policyType),
    language,
    languageLabel: getLanguageLabel(language),
    detectedCount: detectedItems.length,
    manualCount: manualItems.length,
    itemCount: packetItems.length,
    totalValue: calculation.totalValue,
    protectedValue: calculation.protectedValue,
    unprotectedValue: calculation.unprotectedValue,
    coverageGapPercentage: calculation.coverageGapPercentage,
    verifiedValue,
    photoCount,
    documentCount,
    evidenceCount,
    reviewCount,
    summary:
      packetItems.length > 0
        ? `${packetItems.length} items prepared for quote handoff with ${formatCurrency(calculation.totalValue)} total value and ${formatCurrency(calculation.unprotectedValue)} exposure.`
        : "No items have been added to the packet yet.",
    brief: "",
    markdown: "",
    handoffSubject: `InsureScope packet: ${packetItems.length} items / ${formatCurrency(calculation.totalValue)}`,
    recommendedActions,
    items: packetItems,
  };

  packet.brief = buildBrief(packet);
  packet.markdown = buildMarkdown(packet);
  return packet;
}

export function buildQuotePacketJson(packet: QuotePacket): string {
  return JSON.stringify(packet, null, 2);
}

export function buildQuotePacketFilename(packet: QuotePacket, extension: "json" | "md"): string {
  return `insurescope-packet-${packet.packetId}.${extension}`;
}
