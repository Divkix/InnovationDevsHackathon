import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  FileText,
  Flag,
  Link2,
  Receipt,
  ScanLine,
  ShieldAlert,
  Tag,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface OwnershipCaptureValue {
  serialNumber: string;
  modelNumber: string;
  receiptUrl: string;
  notes: string;
  declaredValueOverride: string;
}

export type OwnershipStatusTone = "verified" | "pending" | "warning" | "flagged";

export interface OwnershipStatusCard {
  tone: OwnershipStatusTone;
  title: string;
  detail: string;
  meta?: string;
  bulletPoints?: string[];
}

export interface OwnershipCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: OwnershipCaptureValue) => void | Promise<void>;
  initialValue?: Partial<OwnershipCaptureValue>;
  title?: string;
  subtitle?: string;
  assetLabel?: string;
  helperText?: string;
  verificationStatus?: OwnershipStatusCard;
  fraudStatus?: OwnershipStatusCard;
  isSubmitting?: boolean;
  submitLabel?: string;
  extraPanels?: ReactNode;
}

interface FormErrors {
  serialNumber?: string;
  modelNumber?: string;
  receiptUrl?: string;
  declaredValueOverride?: string;
}

const STATUS_TONES: Record<
  OwnershipStatusTone,
  {
    icon: typeof BadgeCheck;
    accent: string;
    border: string;
    background: string;
    text: string;
    chip: string;
  }
> = {
  verified: {
    icon: BadgeCheck,
    accent: "text-emerald-600",
    border: "border-emerald-200",
    background: "bg-emerald-50",
    text: "text-emerald-900",
    chip: "bg-emerald-600",
  },
  pending: {
    icon: Receipt,
    accent: "text-amber-600",
    border: "border-amber-200",
    background: "bg-amber-50",
    text: "text-amber-900",
    chip: "bg-amber-500",
  },
  warning: {
    icon: ShieldAlert,
    accent: "text-orange-600",
    border: "border-orange-200",
    background: "bg-orange-50",
    text: "text-orange-900",
    chip: "bg-orange-500",
  },
  flagged: {
    icon: Flag,
    accent: "text-[#E31837]",
    border: "border-red-200",
    background: "bg-red-50",
    text: "text-red-900",
    chip: "bg-[#E31837]",
  },
};

function normalizeValue(initialValue?: Partial<OwnershipCaptureValue>): OwnershipCaptureValue {
  return {
    serialNumber: initialValue?.serialNumber ?? "",
    modelNumber: initialValue?.modelNumber ?? "",
    receiptUrl: initialValue?.receiptUrl ?? "",
    notes: initialValue?.notes ?? "",
    declaredValueOverride: initialValue?.declaredValueOverride ?? "",
  };
}

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateValue(value: OwnershipCaptureValue): FormErrors {
  const errors: FormErrors = {};

  if (!value.serialNumber.trim()) {
    errors.serialNumber = "Serial is required";
  }

  if (!value.modelNumber.trim()) {
    errors.modelNumber = "Model is required";
  }

  if (!isValidUrl(value.receiptUrl)) {
    errors.receiptUrl = "Receipt URL must be a valid link";
  }

  if (value.declaredValueOverride.trim()) {
    const numericValue = Number(value.declaredValueOverride.replace(/[$,]/g, ""));
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      errors.declaredValueOverride = "Declared value must be a positive number";
    }
  }

  return errors;
}

function buildValueChip(value: string): string {
  if (!value.trim()) {
    return "No override";
  }

  const numericValue = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function StatusPanel({
  label,
  status,
}: {
  label: string;
  status: OwnershipStatusCard;
}): ReactElement {
  const tone = STATUS_TONES[status.tone];
  const Icon = tone.icon;

  return (
    <div className={`rounded-[1.35rem] border ${tone.border} ${tone.background} p-4`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            {label}
          </div>
          <div className={`mt-2 text-sm font-semibold ${tone.text}`}>{status.title}</div>
        </div>
        <div className={`rounded-full p-2 ${tone.background}`}>
          <Icon className={`h-4 w-4 ${tone.accent}`} />
        </div>
      </div>

      <p className={`text-sm leading-6 ${tone.text}`}>{status.detail}</p>

      {status.meta && (
        <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 shadow-sm">
          {status.meta}
        </div>
      )}

      {status.bulletPoints && status.bulletPoints.length > 0 && (
        <div className="mt-4 space-y-2">
          {status.bulletPoints.map((point) => (
            <div key={point} className="flex items-start gap-2 text-xs leading-5 text-gray-600">
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${tone.chip}`} />
              <span>{point}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldShell({
  label,
  hint,
  icon,
  error,
  children,
}: {
  label: string;
  hint?: string;
  icon: ReactNode;
  error?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="block">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          {label}
        </span>
      </div>
      {children}
      <div className="mt-2 min-h-5 text-xs leading-5">
        {error ? (
          <span className="text-[#E31837]">{error}</span>
        ) : hint ? (
          <span className="text-gray-400">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

export function OwnershipCaptureModal({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
  title = "Ownership Proof Capture",
  subtitle = "Record device identity, purchase trail, and declared value before you attach this asset to a quote or claim.",
  assetLabel = "Target Asset",
  helperText = "Swiss-style audit lane: capture the facts first, then attach richer proof later.",
  verificationStatus = {
    tone: "pending",
    title: "Receipt or serial check pending",
    detail:
      "No proof document has been attached yet. Capture the serial and model now so the verification layer has a clean anchor.",
    meta: "Awaiting source proof",
    bulletPoints: [
      "Collect manufacturer serial exactly as printed.",
      "Match the model identifier to the device sticker or receipt.",
    ],
  },
  fraudStatus = {
    tone: "warning",
    title: "No fraud blockers detected",
    detail:
      "Submission looks structurally normal, but ownership confidence stays soft until a receipt, timestamp, or warranty document is attached.",
    meta: "Soft review",
    bulletPoints: [
      "Declared value overrides should stay near known market ranges.",
      "Use notes to explain repaired, gifted, or inherited items.",
    ],
  },
  isSubmitting = false,
  submitLabel = "Save Ownership Proof",
  extraPanels,
}: OwnershipCaptureModalProps): ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const [value, setValue] = useState<OwnershipCaptureValue>(() => normalizeValue(initialValue));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    setValue(normalizeValue(initialValue));
    setErrors({});
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [initialValue, isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleModalKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])',
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

  const updateField = useCallback(
    (field: keyof OwnershipCaptureValue) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const nextValue = { ...value, [field]: event.target.value };
        setValue(nextValue);
        if (errors[field as keyof FormErrors]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
      },
    [errors, value],
  );

  const statusSnapshot = useMemo(
    () => [
      { label: "Verification", status: verificationStatus },
      { label: "Fraud Signal", status: fraudStatus },
    ],
    [fraudStatus, verificationStatus],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const validationErrors = validateValue(value);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      await onSubmit(value);
    },
    [onSubmit, value],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
        onClick={handleBackdropClick}
        onKeyDown={handleModalKeyDown}
        aria-modal="true"
        role="dialog"
        aria-labelledby="ownership-capture-title"
      >
        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="relative z-10 w-full max-w-6xl overflow-hidden rounded-[2rem] border border-black/5 bg-[#F6F4EF] shadow-[0_32px_100px_rgba(0,0,0,0.26)]"
        >
          <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[1.2fr_0.88fr]">
            <div className="relative overflow-hidden border-b border-black/5 lg:border-b-0 lg:border-r">
              <div className="absolute inset-0 opacity-70">
                <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(227,24,55,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,255,255,0.5))]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(17,24,39,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.05)_1px,transparent_1px)] bg-[size:26px_26px]" />
              </div>

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pb-5 sm:pt-8">
                  <div className="max-w-2xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                      <span className="h-2 w-2 rounded-full bg-[#E31837]" />
                      Ownership Ledger
                    </div>
                    <h2
                      id="ownership-capture-title"
                      className="max-w-xl text-3xl font-black tracking-[-0.04em] text-gray-900 sm:text-4xl"
                    >
                      {title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-[15px]">
                      {subtitle}
                    </p>
                  </div>

                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close ownership capture modal"
                    className="rounded-full border border-black/10 bg-white/90 p-2.5 text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-6 pb-5 sm:px-8">
                  <div className="rounded-[1.4rem] border border-black/5 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full bg-[#111827] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                        {assetLabel}
                      </div>
                      <div className="rounded-full bg-[#E31837] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                        {buildValueChip(value.declaredValueOverride)}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                        {helperText}
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 px-6 pb-6 sm:px-8 sm:pb-8">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldShell
                      label="Serial Number"
                      icon={<ScanLine className="h-4 w-4" />}
                      error={errors.serialNumber}
                      hint="Exact string from device sticker or manufacturer plate."
                    >
                      <input
                        value={value.serialNumber}
                        onChange={updateField("serialNumber")}
                        placeholder="SN-24A8-00981"
                        className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/15"
                      />
                    </FieldShell>

                    <FieldShell
                      label="Model Number"
                      icon={<Tag className="h-4 w-4" />}
                      error={errors.modelNumber}
                      hint="Use the commercial model code, not just the product nickname."
                    >
                      <input
                        value={value.modelNumber}
                        onChange={updateField("modelNumber")}
                        placeholder="QN65-SF450"
                        className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/15"
                      />
                    </FieldShell>

                    <FieldShell
                      label="Receipt URL"
                      icon={<Link2 className="h-4 w-4" />}
                      error={errors.receiptUrl}
                      hint="Optional. Use a cloud receipt, invoice page, warranty record, or proof vault link."
                    >
                      <input
                        value={value.receiptUrl}
                        onChange={updateField("receiptUrl")}
                        placeholder="https://receipts.example.com/item/123"
                        className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/15"
                      />
                    </FieldShell>

                    <FieldShell
                      label="Declared Value Override"
                      icon={<Receipt className="h-4 w-4" />}
                      error={errors.declaredValueOverride}
                      hint="Optional. Override market value only when you have supporting proof."
                    >
                      <input
                        value={value.declaredValueOverride}
                        onChange={updateField("declaredValueOverride")}
                        placeholder="$1,850"
                        className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/15"
                      />
                    </FieldShell>
                  </div>

                  <div className="mt-5">
                    <FieldShell
                      label="Notes"
                      icon={<FileText className="h-4 w-4" />}
                      hint="Optional. Capture gift history, repairs, inherited ownership, storage location, or condition notes."
                    >
                      <textarea
                        value={value.notes}
                        onChange={updateField("notes")}
                        placeholder="Gifted in 2022, original box retained, battery replaced in 2025."
                        rows={5}
                        className="w-full resize-none rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/15"
                      />
                    </FieldShell>
                  </div>

                  {extraPanels && <div className="mt-6">{extraPanels}</div>}

                  <div className="mt-8 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                      <AlertTriangle className="h-4 w-4 text-[#E31837]" />
                      Save structured proof first. Attach richer docs after.
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-[#E31837] disabled:cursor-wait disabled:opacity-70"
                      >
                        {isSubmitting ? "Saving..." : submitLabel}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <aside className="bg-[#0F172A] px-6 py-6 text-white sm:px-8 sm:py-8">
              <div className="mb-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Verification Rail
                </div>
                <div className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">
                  Ownership Confidence
                </div>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Keep the device identity, source proof, and declared value aligned so review can
                  stay fast and explainable.
                </p>
              </div>

              <div className="space-y-4">
                {statusSnapshot.map(({ label, status }) => (
                  <StatusPanel key={label} label={label} status={status} />
                ))}
              </div>
            </aside>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default OwnershipCaptureModal;
