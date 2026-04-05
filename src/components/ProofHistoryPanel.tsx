import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  LocateFixed,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { SwissButton, SwissCard, SwissSectionLabel } from "@/components/Swiss";
import type { DetectedItem, ManualItem, PolicyType } from "@/types";
import {
  calculateTrustScore,
  captureGPS,
  clearSavedScans,
  createSavedScanRecord,
  deleteSavedScan,
  downloadJson,
  exportAllProofBundles,
  exportProofBundle,
  generateEvidenceHash,
  loadSavedScans,
  type SavedScanRecord,
  upsertSavedScan,
} from "@/utils/proofHistory";

export interface ProofHistoryPanelProps {
  policyType: PolicyType;
  detectedItems: DetectedItem[];
  manualItems: ManualItem[];
  totalValue: number;
  protectedValue: number;
  unprotectedValue: number;
  coverageGapPercentage: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatRelativeDate(timestamp: number): string {
  const deltaHours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  if (deltaHours < 1) return "Just now";
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays === 1) return "Yesterday";
  if (deltaDays < 7) return `${deltaDays}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

function TrustBadge({
  score,
  level,
}: {
  score: number;
  level: ReturnType<typeof calculateTrustScore>["level"];
}): ReactElement {
  const tone =
    level === "VERIFIED"
      ? "bg-emerald-600 text-white"
      : level === "HIGH"
        ? "bg-sky-600 text-white"
        : level === "MEDIUM"
          ? "bg-amber-500 text-white"
          : "bg-zinc-800 text-white";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${tone}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {level} · {score}
    </div>
  );
}

function SavedScanCard({
  scan,
  onExport,
  onDelete,
}: {
  scan: SavedScanRecord;
  onExport: (scan: SavedScanRecord) => void;
  onDelete: (scanId: string) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const individualTrust = calculateTrustScore([scan]);

  return (
    <SwissCard className="p-0 overflow-hidden" pattern="grid">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full px-6 py-5 text-left"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/55">
              <span>{formatRelativeDate(scan.createdAt)}</span>
              <span>·</span>
              <span>{scan.itemCount} items</span>
              <span>·</span>
              <span className="capitalize">{scan.policyType}</span>
              {typeof scan.gpsLat === "number" && (
                <>
                  <span>·</span>
                  <span className="text-emerald-700">GPS locked</span>
                </>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/50">
                  Total
                </div>
                <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-swiss-fg">
                  {formatCurrency(scan.totalValue)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/50">
                  Protected
                </div>
                <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-emerald-700">
                  {formatCurrency(scan.protectedValue)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/50">
                  Exposure
                </div>
                <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-swiss-accent">
                  {formatCurrency(scan.unprotectedValue)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <TrustBadge score={individualTrust.score} level={individualTrust.level} />
            {scan.evidenceHash && (
              <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-swiss-fg/55">
                SHA-256 {truncateHash(scan.evidenceHash)}
              </div>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden border-t-2 border-swiss"
          >
            <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/50">
                  Saved Inventory
                </div>
                <div className="space-y-2">
                  {scan.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border border-swiss/10 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold uppercase tracking-[0.08em] text-swiss-fg">
                          {item.label}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-swiss-fg/45">
                          {item.coverageStatus.replace("_", " ")} ·{" "}
                          {item.ownershipStatus.replace(/_/g, " ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-swiss-fg">
                          {formatCurrency(item.estimatedValue)}
                        </div>
                        {item.serialNumber && (
                          <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-swiss-fg/45">
                            {item.serialNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-swiss p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/50">
                    Proof Posture
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-swiss-fg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                      <span>{scan.ownershipSummary.verifiedItems} verified items</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-4 w-4 text-amber-600" />
                      <span>{scan.ownershipSummary.pendingItems} pending serial captures</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Archive className="mt-0.5 h-4 w-4 text-swiss-accent" />
                      <span>{scan.ownershipSummary.reviewFlags} active review flags</span>
                    </div>
                    {typeof scan.gpsLat === "number" && (
                      <div className="flex items-start gap-3">
                        <LocateFixed className="mt-0.5 h-4 w-4 text-sky-700" />
                        <span>
                          {scan.gpsLat.toFixed(4)}, {scan.gpsLng?.toFixed(4)}
                          {typeof scan.gpsAccuracy === "number"
                            ? ` ±${Math.round(scan.gpsAccuracy)}m`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <SwissButton
                    variant="secondary"
                    className="flex-1"
                    onClick={() => onExport(scan)}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Export bundle
                  </SwissButton>
                  <SwissButton
                    variant="accent"
                    className="flex-1"
                    onClick={() => onDelete(scan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </SwissButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SwissCard>
  );
}

export function ProofHistoryPanel({
  policyType,
  detectedItems,
  manualItems,
  totalValue,
  protectedValue,
  unprotectedValue,
  coverageGapPercentage,
}: ProofHistoryPanelProps): ReactElement {
  const [savedScans, setSavedScans] = useState<SavedScanRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedScans(loadSavedScans());
  }, []);

  const trust = useMemo(() => calculateTrustScore(savedScans), [savedScans]);
  const hasCurrentItems = detectedItems.length + manualItems.length > 0;

  const handleSaveCurrentScan = useCallback(async () => {
    if (!hasCurrentItems || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const createdAt = Date.now();
      const gps = await captureGPS();
      const itemLabels = [
        ...detectedItems.map((item) => item.category),
        ...manualItems.map((item) => item.name),
      ];
      const evidenceHash = await generateEvidenceHash({
        itemLabels,
        timestamp: createdAt,
        lat: gps?.lat,
        lng: gps?.lng,
        policyType,
      });

      const scan = createSavedScanRecord({
        policyType,
        totalValue,
        protectedValue,
        unprotectedValue,
        coverageGapPercentage,
        detectedItems,
        manualItems,
        gps,
        evidenceHash,
        createdAt,
      });

      const next = upsertSavedScan(scan);
      setSavedScans(next);
      setSaveMessage(
        gps
          ? "Saved scan with GPS proof and evidence hash."
          : "Saved scan locally without GPS lock.",
      );
    } catch {
      setSaveMessage("Unable to save this scan right now.");
    } finally {
      setIsSaving(false);
    }
  }, [
    coverageGapPercentage,
    detectedItems,
    hasCurrentItems,
    isSaving,
    manualItems,
    policyType,
    protectedValue,
    totalValue,
    unprotectedValue,
  ]);

  const handleExportScan = useCallback((scan: SavedScanRecord) => {
    downloadJson(exportProofBundle(scan), `insurescope-proof-${scan.id.slice(0, 8)}.json`);
  }, []);

  const handleExportAll = useCallback(() => {
    if (savedScans.length === 0) return;
    downloadJson(
      exportAllProofBundles(savedScans),
      `insurescope-proof-portfolio-${Date.now()}.json`,
    );
  }, [savedScans]);

  const handleDeleteScan = useCallback((scanId: string) => {
    setSavedScans(deleteSavedScan(scanId));
  }, []);

  const handleClearAll = useCallback(() => {
    setSavedScans(clearSavedScans());
  }, []);

  return (
    <section className="space-y-4" data-testid="proof-history-panel">
      <SwissSectionLabel number="04" label="Proof / History" className="mb-0" />

      <SwissCard pattern="grid" className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/55">
              Ownership chain
            </div>
            <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-swiss-fg">
              Saved scan history and exportable proof bundles
            </h3>
            <p className="mt-3 text-sm leading-6 text-swiss-fg/65">
              Capture the current room state into a durable evidence snapshot, then export
              signed-looking JSON bundles for review, claims, or demo handoff.
            </p>
          </div>

          <div className="space-y-3 lg:min-w-[220px]">
            <TrustBadge score={trust.score} level={trust.level} />
            <div className="text-sm leading-6 text-swiss-fg/60">
              {savedScans.length} saved scan{savedScans.length === 1 ? "" : "s"} ·{" "}
              {trust.factors.length} trust signal{trust.factors.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-2 border-swiss p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-swiss-fg/50">
              Current scan staging
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-swiss-fg/45">
                  Items
                </div>
                <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-swiss-fg">
                  {detectedItems.length + manualItems.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-swiss-fg/45">
                  Total value
                </div>
                <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-swiss-fg">
                  {formatCurrency(totalValue)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-swiss-fg/45">
                  Exposure
                </div>
                <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-swiss-accent">
                  {formatCurrency(unprotectedValue)}
                </div>
              </div>
            </div>
            {saveMessage && <div className="mt-4 text-sm text-swiss-fg/60">{saveMessage}</div>}
          </div>

          <div className="flex flex-col gap-2">
            <SwissButton
              variant="primary"
              onClick={() => void handleSaveCurrentScan()}
              disabled={!hasCurrentItems || isSaving}
            >
              <Archive className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save current scan"}
            </SwissButton>
            <SwissButton
              variant="secondary"
              onClick={handleExportAll}
              disabled={savedScans.length === 0}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Export all bundles
            </SwissButton>
            <SwissButton
              variant="accent"
              onClick={handleClearAll}
              disabled={savedScans.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Clear history
            </SwissButton>
          </div>
        </div>

        {savedScans.length === 0 ? (
          <div className="border-2 border-dashed border-swiss/25 p-10 text-center text-sm text-swiss-fg/55">
            Save the current room once you have meaningful detections or manual items. GPS proof is
            captured best-effort and never required.
          </div>
        ) : (
          <div className="space-y-3">
            {savedScans.map((scan) => (
              <SavedScanCard
                key={scan.id}
                scan={scan}
                onExport={handleExportScan}
                onDelete={handleDeleteScan}
              />
            ))}
          </div>
        )}
      </SwissCard>
    </section>
  );
}

export default ProofHistoryPanel;
