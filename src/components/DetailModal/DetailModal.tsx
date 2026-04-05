import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  FileText,
  type LucideIcon,
  Shield,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  OwnershipCaptureModal,
  type OwnershipCaptureValue,
  type OwnershipStatusCard,
} from "@/components/OwnershipCaptureModal";
import { useAppContext } from "@/context/AppContext";
import coverageRules from "@/data/coverageRules.json";
import { useGemini } from "@/hooks/useGemini";
import { lookupCoverage } from "@/utils/coverageLookup";
import { detectFraudSignals, summarizeFraudFindings } from "@/utils/fraudRules";
import {
  buildDefaultOwnershipRecord,
  buildValuationRecord,
  getFinalItemValue,
} from "@/utils/ownershipHelpers";
import { appendOwnershipLedgerEvent } from "@/utils/ownershipLedger";
import {
  classifyOwnershipIdentifier,
  normalizeImei,
  normalizeModelNumber,
  normalizeSerialNumber,
} from "@/utils/serialValidation";
import { buildCoverageVoiceCopy, SPEECH_FALLBACK_MESSAGE, speakText } from "@/utils/speech";
import type {
  CoverageResult,
  DetectedItem,
  FraudFlag,
  ManualItem,
  OwnershipLedgerEntry,
  OwnershipRecord,
  PolicyType,
} from "../../types";

// Local type for item with source property
type DetailModalItem = (DetectedItem | ManualItem) & { source?: "camera" | "dashboard" };

/** Props for DetailModal component */
export interface DetailModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** The item to display details for */
  item: DetailModalItem | null;
  /** Current policy type */
  policyType?: PolicyType;
  /** Optional Gemini explanation text to speak instead of a generated summary */
  coverageExplanation?: string | null;
}

/** Status configuration type */
interface StatusConfig {
  icon: LucideIcon;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
}

/**
 * Format value as currency
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

/**
 * Capitalize first letter of each word
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get policy display name
 * @param policyType - The policy type
 * @returns Human-readable policy name
 */
function getPolicyDisplayName(policyType: string): string {
  const policyNames: Record<string, string> = {
    renters: "Renter's Insurance",
    homeowners: "Homeowner's Insurance",
    auto: "Auto Insurance",
    none: "No Insurance",
  };
  return policyNames[policyType] || policyType;
}

/**
 * Get common claim scenarios for a category and policy
 * @param category - The item category
 * @param policyType - The policy type
 * @returns Array of scenario strings
 */
function getCommonScenarios(
  category: string | undefined,
  policyType: string | undefined,
): string[] {
  const normalizedCategory = category?.toLowerCase();
  const normalizedPolicy = policyType?.toLowerCase();

  // Try to get scenarios from coverage rules
  const policyRules = coverageRules[normalizedPolicy as keyof typeof coverageRules];
  if (policyRules) {
    const categoryRule = policyRules[normalizedCategory as keyof typeof policyRules];
    if (categoryRule && typeof categoryRule === "object" && "commonScenarios" in categoryRule) {
      const ruleWithScenarios = categoryRule as { commonScenarios?: string[] };
      if (ruleWithScenarios.commonScenarios) {
        return ruleWithScenarios.commonScenarios;
      }
    }
  }

  // Default scenarios based on coverage status
  const coverage = lookupCoverage(category || "", policyType || "");

  if (coverage.status === "covered") {
    return [
      "Theft or burglary",
      "Fire damage",
      "Water damage (non-flood)",
      "Vandalism",
      "Accidental damage (check your policy)",
    ];
  } else if (coverage.status === "conditional") {
    return [
      "Theft from secured location",
      "Damage during covered peril (conditions apply)",
      "Contact your agent for specific scenarios",
    ];
  } else {
    return [
      "Item is not covered under current policy",
      "Consider alternative coverage options",
      "Speak with an insurance agent for guidance",
    ];
  }
}

function toFraudFlag(finding: ReturnType<typeof detectFraudSignals>[number]): FraudFlag {
  return {
    code: finding.code,
    label: finding.title,
    severity: finding.severity === "medium" ? "review" : finding.severity,
    message: finding.message,
  };
}

function buildVerificationStatus(item: DetailModalItem): OwnershipStatusCard {
  const ownership = item.ownership;
  if (ownership?.status === "verified") {
    return {
      tone: "verified",
      title: "Ownership verified",
      detail: "Serial evidence and supporting proof are attached to this item record.",
      meta: ownership.verifiedAt
        ? `Verified ${new Date(ownership.verifiedAt).toLocaleDateString()}`
        : "Verified",
    };
  }

  if (ownership?.status === "serial_captured") {
    return {
      tone: "pending",
      title: "Serial captured, receipt pending",
      detail:
        "The device identifier is recorded. Attach a receipt or supporting note to harden the proof trail.",
      meta: "Proof strengthening recommended",
    };
  }

  return {
    tone: "warning",
    title: "Proof not yet attached",
    detail: "Capture the serial and model now so this item can move into the verified ledger.",
    meta: "Needs serial capture",
  };
}

function buildFraudStatus(flags: FraudFlag[]): OwnershipStatusCard {
  const summary = summarizeFraudFindings(
    flags.map((flag) => ({
      id: `${flag.code}-${flag.severity}`,
      code: flag.code,
      severity: flag.severity === "review" ? "medium" : flag.severity,
      title: flag.label,
      message: flag.message,
      itemIds: [],
    })),
  );

  if (summary.high > 0) {
    return {
      tone: "flagged",
      title: "High-risk conflict detected",
      detail:
        "This item shares an identifier or value pattern that should be reviewed before quote generation.",
      meta: `${summary.high} high-risk flag${summary.high === 1 ? "" : "s"}`,
      bulletPoints: flags.map((flag) => flag.message),
    };
  }

  if (summary.medium > 0 || summary.low > 0) {
    return {
      tone: "warning",
      title: "Review recommended",
      detail:
        "The ownership trail is usable, but at least one anomaly should be checked by an agent.",
      meta: `${summary.total} review flag${summary.total === 1 ? "" : "s"}`,
      bulletPoints: flags.map((flag) => flag.message),
    };
  }

  return {
    tone: "verified",
    title: "No fraud blockers detected",
    detail: "No duplicate serials or override anomalies were found for this item.",
    meta: "Clear",
  };
}

/**
 * DetailModal component - Modal showing detailed coverage information
 *
 * Features:
 * - Shows item name, estimated value, coverage status
 * - Displays why item is/isn't covered
 * - Shows what policy covers it
 * - Lists common claim scenarios
 * - Provides upgrade options
 * - Closes via X button, backdrop click, or Escape key
 * - Focus trap for accessibility
 * - Camera feed dimming when opened from camera view
 * - Content updates on policy change
 */
export function DetailModal({
  isOpen,
  onClose,
  item,
  policyType = "renters",
  coverageExplanation = null,
}: DetailModalProps): React.ReactNode {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
  const [geminiExplanation, setGeminiExplanation] = useState<string | null>(coverageExplanation);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState(false);
  const [isOwnershipSubmitting, setIsOwnershipSubmitting] = useState(false);
  const {
    language,
    voiceEnabled,
    ttsEnabled,
    manualItems,
    addManualItem,
    updateManualItem,
    setActiveTab,
  } = useAppContext();
  const gemini = useGemini();

  // Get coverage information
  const coverage: CoverageResult | null = useMemo(() => {
    if (!item) return null;
    return lookupCoverage(item.category, policyType);
  }, [item, policyType]);

  const speechCopy = useMemo(() => {
    if (!item || !coverage) return "";
    return buildCoverageVoiceCopy({
      category: item.category,
      coverage,
      policyType,
      explanation: geminiExplanation ?? coverageExplanation,
    });
  }, [coverage, coverageExplanation, geminiExplanation, item, policyType]);

  const canPlayVoice = voiceEnabled && ttsEnabled;
  const listenButtonLabel =
    geminiExplanation || coverageExplanation ? "LISTEN TO EXPLANATION" : "LISTEN TO SUMMARY";
  const existingManualItem = useMemo(
    () =>
      manualItems.find(
        (manualItem) =>
          manualItem.id === item?.id ||
          (manualItem.category === item?.category &&
            manualItem.name.toLowerCase() ===
              ((item as ManualItem | null)?.name ?? item?.category ?? "").toLowerCase()),
      ) ?? null,
    [item, manualItems],
  );
  const currentOwnership = existingManualItem?.ownership ?? item?.ownership ?? null;
  const currentFraudFlags = currentOwnership?.fraudFlags ?? [];
  const verificationStatus = useMemo(
    () =>
      item ? buildVerificationStatus({ ...item, ownership: currentOwnership ?? undefined }) : null,
    [currentOwnership, item],
  );
  const fraudStatus = useMemo(() => buildFraudStatus(currentFraudFlags), [currentFraudFlags]);
  const ownershipInitialValue = useMemo<Partial<OwnershipCaptureValue>>(
    () => ({
      serialNumber: currentOwnership?.serialNumber ?? "",
      modelNumber: currentOwnership?.modelNumber ?? "",
      receiptUrl: currentOwnership?.evidence?.receiptUrl ?? "",
      notes: currentOwnership?.evidence?.sourceNotes ?? "",
      declaredValueOverride:
        typeof (existingManualItem ?? item)?.valuation?.overrideValue === "number"
          ? String((existingManualItem ?? item)?.valuation?.overrideValue ?? "")
          : "",
    }),
    [currentOwnership, existingManualItem, item],
  );

  const handleListenClick = useCallback(() => {
    if (!speechCopy.trim()) {
      return;
    }

    const playback = speakText(speechCopy, { language, rate: 0.98 });
    if (!playback.supported) {
      setSpeechMessage(SPEECH_FALLBACK_MESSAGE);
      return;
    }

    setSpeechMessage(null);
  }, [language, speechCopy]);

  useEffect(() => {
    setGeminiExplanation(coverageExplanation);
    setSpeechMessage(null);
    setIsLoadingExplanation(false);
  }, [coverageExplanation]);

  const handleAskGemini = useCallback(async () => {
    if (!gemini || !item || !coverage || isLoadingExplanation) {
      return;
    }

    setIsLoadingExplanation(true);
    try {
      const response = await gemini.askAboutCoverage({
        item: capitalizeWords(item.category),
        policyType,
        coverageStatus: coverage.status,
        coverageNote: coverage.note,
        language,
      });

      setGeminiExplanation(response?.explanation ?? null);
    } finally {
      setIsLoadingExplanation(false);
    }
  }, [coverage, gemini, isLoadingExplanation, item, language, policyType]);

  const handleOwnershipSubmit = useCallback(
    async (value: OwnershipCaptureValue) => {
      if (!item || !coverage) {
        return;
      }

      setIsOwnershipSubmitting(true);

      try {
        const serialIdentifier = classifyOwnershipIdentifier(value.serialNumber);
        const normalizedSerial =
          serialIdentifier.kind === "serial"
            ? serialIdentifier.value
            : normalizeSerialNumber(value.serialNumber);
        const normalizedImei =
          serialIdentifier.kind === "imei"
            ? serialIdentifier.value
            : normalizeImei(value.serialNumber);
        const normalizedModel = normalizeModelNumber(value.modelNumber);
        const overrideValue = value.declaredValueOverride.trim()
          ? Number(value.declaredValueOverride.replace(/[$,]/g, ""))
          : undefined;
        const now = new Date().toISOString();
        const baseItem: ManualItem =
          existingManualItem ??
          ({
            id: `verified-${item.id}`,
            name: (item as ManualItem).name ?? capitalizeWords(item.category),
            category: item.category,
            estimatedValue: coverage.estimatedValue,
            ownership: buildDefaultOwnershipRecord(item.category),
            valuation: buildValuationRecord(coverage.estimatedValue, "ai"),
          } as ManualItem);

        let ledger = (baseItem.ownership?.ledger ?? []) as OwnershipLedgerEntry[];
        ledger = appendOwnershipLedgerEvent(ledger as unknown as never[], {
          itemId: baseItem.id,
          eventType: "ownership_capture_started",
          payload: { category: item.category },
        }) as unknown as OwnershipLedgerEntry[];
        ledger = appendOwnershipLedgerEvent(ledger as unknown as never[], {
          itemId: baseItem.id,
          eventType: "serial_verified",
          payload: {
            serialNumber: normalizedSerial || undefined,
            imei: normalizedImei || undefined,
            modelNumber: normalizedModel || undefined,
          },
        }) as unknown as OwnershipLedgerEntry[];

        if (value.receiptUrl.trim()) {
          ledger = appendOwnershipLedgerEvent(ledger as unknown as never[], {
            itemId: baseItem.id,
            eventType: "receipt_attached",
            payload: { receiptUrl: value.receiptUrl.trim() },
          }) as unknown as OwnershipLedgerEntry[];
        }

        if (typeof overrideValue === "number" && Number.isFinite(overrideValue)) {
          ledger = appendOwnershipLedgerEvent(ledger as unknown as never[], {
            itemId: baseItem.id,
            eventType: "value_overridden",
            payload: { overrideValue },
          }) as unknown as OwnershipLedgerEntry[];
        }

        const nextValuation = buildValuationRecord(
          baseItem.valuation?.estimatedValue ?? baseItem.estimatedValue,
          baseItem.valuation?.source ?? "user",
          typeof overrideValue === "number" && Number.isFinite(overrideValue)
            ? overrideValue
            : undefined,
          value.notes.trim() || undefined,
        );

        const nextOwnership: OwnershipRecord = {
          ...(baseItem.ownership ?? buildDefaultOwnershipRecord(item.category)),
          status: value.receiptUrl.trim()
            ? "verified"
            : normalizedSerial || normalizedImei
              ? "serial_captured"
              : "needs_serial",
          serialNumber: normalizedSerial || undefined,
          imei: normalizedImei || undefined,
          modelNumber: normalizedModel || undefined,
          verifiedAt: value.receiptUrl.trim() ? now : baseItem.ownership?.verifiedAt,
          agentSummary:
            geminiExplanation ??
            `Ownership proof captured for ${capitalizeWords(item.category)} with ${value.receiptUrl.trim() ? "receipt support" : "serial evidence"}.`,
          evidence: {
            ...(baseItem.ownership?.evidence ?? {}),
            receiptUrl: value.receiptUrl.trim() || undefined,
            sourceNotes: value.notes.trim() || undefined,
            capturedAt: now,
          },
          ledger,
        };

        const candidateItem: ManualItem = {
          ...baseItem,
          estimatedValue: nextValuation.finalValue,
          ownership: nextOwnership,
          valuation: nextValuation,
        };

        const fraudFindings = detectFraudSignals(
          manualItems
            .filter((manualItem) => manualItem.id !== candidateItem.id)
            .concat(candidateItem),
        );
        const nextFraudFlags = fraudFindings
          .filter((finding) => finding.itemIds.includes(candidateItem.id))
          .map(toFraudFlag);

        candidateItem.ownership = {
          ...nextOwnership,
          fraudFlags: nextFraudFlags,
          status: nextFraudFlags.some((flag) => flag.severity === "high")
            ? "needs_review"
            : nextOwnership.status,
        };

        if (existingManualItem) {
          updateManualItem(existingManualItem.id, candidateItem);
        } else {
          addManualItem(candidateItem);
        }

        setIsOwnershipModalOpen(false);
        setActiveTab("dashboard");
      } finally {
        setIsOwnershipSubmitting(false);
      }
    },
    [
      addManualItem,
      coverage,
      existingManualItem,
      geminiExplanation,
      item,
      manualItems,
      setActiveTab,
      updateManualItem,
    ],
  );

  // Get common scenarios
  const scenarios: string[] = useMemo(() => {
    if (!item) return [];
    return getCommonScenarios(item.category, policyType);
  }, [item, policyType]);

  // Status configuration with State Farm branding
  const statusConfig: StatusConfig | null = useMemo(() => {
    if (!coverage) return null;

    const configs: Record<string, StatusConfig> = {
      covered: {
        icon: CheckCircle,
        label: "Covered",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
        borderColor: "border-green-200",
        iconColor: "text-green-500",
      },
      conditional: {
        icon: AlertTriangle,
        label: "Conditional",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
        iconColor: "text-yellow-500",
      },
      not_covered: {
        icon: XCircle,
        label: "Not Covered",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
        borderColor: "border-red-200",
        iconColor: "text-[#E31837]",
      },
    };

    return configs[coverage.status] || configs.not_covered;
  }, [coverage]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Focus trap implementation
  const handleModalKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, []);

  // Save previously focused element and add event listeners
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Add Escape key listener to document
      document.addEventListener("keydown", handleKeyDown);

      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);

      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";

      // Restore focus when modal closes
      if (!isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  // Don't render if not open or no item
  if (!isOpen || !item || !coverage || !statusConfig) {
    return null;
  }

  const StatusIcon = statusConfig.icon;
  const isFromCamera = item.source === "camera";
  const policyDisplayName = getPolicyDisplayName(policyType);

  return (
    <AnimatePresence>
      {isOpen && item && coverage && statusConfig && (
        <>
          <motion.div
            data-testid="detail-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleModalKeyDown}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              data-testid="modal-backdrop"
              className={`absolute inset-0 ${isFromCamera ? "bg-black/60" : "bg-black/50"} backdrop-blur-sm`}
              onClick={handleBackdropClick}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content - Slide Up Animation */}
            <motion.div
              data-testid="modal-content"
              className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div
                className={`px-4 sm:px-6 py-4 border-b ${statusConfig.borderColor} ${statusConfig.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${statusConfig.iconColor}`} />
                    <h2
                      id="modal-title"
                      data-testid="modal-title"
                      className="text-lg sm:text-xl font-bold text-gray-900"
                    >
                      Item Details
                    </h2>
                  </div>
                  <button
                    ref={closeButtonRef}
                    data-testid="modal-close-button"
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                    aria-label="Close modal"
                    tabIndex={0}
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Item Name and Value */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Item</p>
                    <h3
                      data-testid="item-name"
                      className="text-xl sm:text-2xl font-bold text-gray-900 capitalize"
                    >
                      {capitalizeWords(item.category)}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Estimated Value</p>
                    <p
                      data-testid="item-value"
                      className="text-xl sm:text-2xl font-bold text-gray-900"
                    >
                      {formatCurrency(coverage.estimatedValue)}
                    </p>
                  </div>
                </div>

                {/* Coverage Status Badge */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${statusConfig.iconColor}`} />
                    <span
                      data-testid="coverage-status"
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Why Covered / Not Covered */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                        Coverage Details
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {gemini && (
                        <button
                          type="button"
                          onClick={handleAskGemini}
                          disabled={isLoadingExplanation}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-blue-700 transition-colors disabled:cursor-wait disabled:opacity-60"
                          aria-label={`Ask Gemini about ${capitalizeWords(item.category)}`}
                        >
                          {isLoadingExplanation ? "ASKING GEMINI..." : "ASK GEMINI"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleListenClick}
                        disabled={!canPlayVoice}
                        className="rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          borderColor: "rgba(0,0,0,0.12)",
                          background: "rgba(0,0,0,0.03)",
                          color: "#111827",
                        }}
                        aria-label={`${listenButtonLabel} for ${capitalizeWords(item.category)}`}
                      >
                        ▶ {listenButtonLabel}
                      </button>
                    </div>
                  </div>
                  <p
                    data-testid="coverage-note"
                    className="text-gray-700 leading-relaxed pl-6 sm:pl-7 text-sm sm:text-base"
                  >
                    {coverage.note}
                  </p>
                  {geminiExplanation && (
                    <div
                      className="ml-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:ml-7"
                      data-testid="gemini-explanation"
                    >
                      {geminiExplanation}
                    </div>
                  )}
                  {speechMessage && (
                    <p className="pl-6 sm:pl-7 text-xs text-gray-500" data-testid="speech-message">
                      {speechMessage}
                    </p>
                  )}
                </div>

                {/* Policy Information */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Current Policy
                    </h4>
                  </div>
                  <p
                    data-testid="policy-info"
                    className="text-gray-700 pl-6 sm:pl-7 text-sm sm:text-base"
                  >
                    {policyDisplayName}
                  </p>
                </div>

                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Ownership Proof
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        {currentOwnership?.status === "verified"
                          ? "This item already has verified ownership evidence attached."
                          : "Attach serial and value evidence so this item can move into the verified ledger."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOwnershipModalOpen(true)}
                      className="rounded-lg border-2 border-[#111827] bg-[#111827] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#E31837] hover:border-[#E31837]"
                    >
                      {existingManualItem ? "Update Proof" : "Verify Ownership"}
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Ledger Status
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {currentOwnership?.status ?? "unverified"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Final Value
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          getFinalItemValue((existingManualItem ?? item) as ManualItem),
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Review Flags
                      </div>
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {currentFraudFlags.length}
                      </div>
                    </div>
                  </div>
                  {currentFraudFlags.length > 0 && (
                    <div className="space-y-1">
                      {currentFraudFlags.map((flag) => (
                        <div
                          key={flag.code}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
                        >
                          <span className="font-semibold">{flag.label}:</span> {flag.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conditions (for conditional coverage) */}
                {coverage.status === "conditional" &&
                  coverage.conditions &&
                  coverage.conditions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                          Conditions That Apply
                        </h4>
                      </div>
                      <ul data-testid="conditions-list" className="space-y-1 pl-6 sm:pl-7">
                        {coverage.conditions.map((condition) => (
                          <li
                            key={condition}
                            className="text-gray-700 flex items-start gap-2 text-sm sm:text-base"
                          >
                            <span className="text-yellow-500 mt-1">•</span>
                            {condition}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Common Claim Scenarios */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Common Claim Scenarios
                    </h4>
                  </div>
                  <ul data-testid="common-scenarios" className="space-y-2 pl-6 sm:pl-7">
                    {scenarios.map((scenario) => (
                      <li
                        key={scenario}
                        className="text-gray-700 flex items-start gap-2 text-sm sm:text-base"
                      >
                        <span className="text-gray-400 mt-1">•</span>
                        {scenario}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Upgrade Options */}
                <div
                  className={`p-3 sm:p-4 rounded-lg ${statusConfig.bgColor} border ${statusConfig.borderColor}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${statusConfig.iconColor}`} />
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {coverage.status === "covered"
                        ? "Coverage Enhancements"
                        : "How to Get Coverage"}
                    </h4>
                  </div>
                  <p
                    data-testid="upgrade-options"
                    className="text-gray-700 pl-6 sm:pl-7 text-sm sm:text-base"
                  >
                    {coverage.upgrade}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-[#E31837] hover:bg-[#B8122C] text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>

          <OwnershipCaptureModal
            isOpen={isOwnershipModalOpen}
            onClose={() => setIsOwnershipModalOpen(false)}
            onSubmit={handleOwnershipSubmit}
            initialValue={ownershipInitialValue}
            isSubmitting={isOwnershipSubmitting}
            assetLabel={(item as ManualItem).name ?? capitalizeWords(item.category)}
            verificationStatus={verificationStatus ?? undefined}
            fraudStatus={fraudStatus}
          />
        </>
      )}
    </AnimatePresence>
  );
}

export default DetailModal;
