import { motion } from "framer-motion";
import { AlertTriangle, BadgeCheck, CircleDot, ScanSearch, ShieldCheck } from "lucide-react";
import type { ReactElement } from "react";

export interface OwnershipSummaryCardProps {
  verifiedItemsCount: number;
  pendingSerialCaptures: number;
  reviewFlags: number;
  totalVerifiedValue: number;
  title?: string;
  subtitle?: string;
}

interface StatTileProps {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "critical";
  icon: ReactElement;
  hint: string;
}

const TONE_STYLES: Record<StatTileProps["tone"], string> = {
  neutral: "border-gray-200 bg-white text-gray-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-900",
};

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safeValue);
}

function pluralize(label: string, count: number): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function StatTile({ label, value, tone, icon, hint }: StatTileProps): ReactElement {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${TONE_STYLES[tone]}`}
      data-testid={`ownership-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
          {label}
        </span>
        <div className="shrink-0 opacity-80">{icon}</div>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{value}</div>
        <p className="text-xs leading-relaxed text-gray-600">{hint}</p>
      </div>
    </div>
  );
}

export function OwnershipSummaryCard({
  verifiedItemsCount,
  pendingSerialCaptures,
  reviewFlags,
  totalVerifiedValue,
  title = "Ownership Ledger",
  subtitle = "Verified evidence reduces claim friction and flags items that still need proof.",
}: OwnershipSummaryCardProps): ReactElement {
  const verifiedCount = clampCount(verifiedItemsCount);
  const pendingCount = clampCount(pendingSerialCaptures);
  const flaggedCount = clampCount(reviewFlags);
  const verifiedValue = formatCurrency(totalVerifiedValue);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
      data-testid="ownership-summary-card"
      aria-label="Ownership verification summary"
    >
      <div className="border-b border-gray-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef2ff_100%)] px-5 py-5 sm:px-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E31837]/15 bg-[#E31837]/5 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#E31837]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#B8122C]">
                Fraud Posture
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-[-0.04em] text-gray-950 sm:text-[2rem]">
                {title}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{subtitle}</p>
            </div>
          </div>
          <div className="hidden rounded-2xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm sm:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
              Verified Value
            </div>
            <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-gray-950">
              {verifiedValue}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Chain Of Proof
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {pluralize("item", verifiedCount)} verified
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Serial Capture Queue
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {pluralize("capture", pendingCount)} still needed
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Review Queue
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">
              {pluralize("flag", flaggedCount)} awaiting review
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-gray-200 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Verified Items"
          value={String(verifiedCount)}
          tone="success"
          icon={<BadgeCheck className="h-5 w-5 text-emerald-600" />}
          hint="Items with sufficient ownership evidence already attached."
        />
        <StatTile
          label="Pending Serials"
          value={String(pendingCount)}
          tone={pendingCount > 0 ? "warning" : "neutral"}
          icon={<ScanSearch className="h-5 w-5 text-amber-600" />}
          hint="High-risk electronics and appliances still missing serial capture."
        />
        <StatTile
          label="Review Flags"
          value={String(flaggedCount)}
          tone={flaggedCount > 0 ? "critical" : "neutral"}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          hint="Conflicts, duplicates, or suspicious entries requiring manual review."
        />
        <StatTile
          label="Verified Value"
          value={verifiedValue}
          tone="neutral"
          icon={<CircleDot className="h-5 w-5 text-gray-700" />}
          hint="Dollar value supported by receipts, serials, or captured proof."
        />
      </div>
    </motion.section>
  );
}

export default OwnershipSummaryCard;
