import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Copy,
  Download,
  FileText,
  Mail,
  Paperclip,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { type ReactElement, useMemo, useState } from "react";
import type { DetectedItem, ManualItem, PolicyType, SupportedLanguage } from "@/types";
import {
  buildQuotePacket,
  buildQuotePacketFilename,
  buildQuotePacketJson,
} from "@/utils/quotePacket";
import { formatCurrency } from "@/utils/valueCalculator";

export interface QuotePacketCardProps {
  detectedItems: DetectedItem[];
  manualItems: ManualItem[];
  policyType: PolicyType;
  language?: SupportedLanguage;
}

interface CopyState {
  status: "idle" | "copied" | "failed";
  label: string;
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function QuotePacketCard({
  detectedItems,
  manualItems,
  policyType,
  language = "en",
}: QuotePacketCardProps): ReactElement {
  const packet = useMemo(
    () =>
      buildQuotePacket({
        detectedItems,
        manualItems,
        policyType,
        language,
      }),
    [detectedItems, manualItems, policyType, language],
  );

  const [senderName, setSenderName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [handoffNote, setHandoffNote] = useState(
    "Please review the packet and confirm next steps for quote preparation.",
  );
  const [copyState, setCopyState] = useState<CopyState>({ status: "idle", label: "" });

  const emailBody = useMemo(() => {
    const lines = [
      senderName.trim() ? `From: ${senderName.trim()}` : "",
      `Subject: ${packet.handoffSubject}`,
      "",
      packet.brief,
      "",
      handoffNote.trim() ? `Agent note: ${handoffNote.trim()}` : "",
    ].filter(Boolean);

    return lines.join("\n").trim();
  }, [handoffNote, packet.brief, packet.handoffSubject, senderName]);

  const mailtoHref = useMemo(() => {
    if (!isValidEmail(recipientEmail)) {
      return null;
    }

    const subject = encodeURIComponent(packet.handoffSubject);
    const body = encodeURIComponent(emailBody);
    return `mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`;
  }, [emailBody, packet.handoffSubject, recipientEmail]);

  const handleCopy = async (content: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyState({ status: "copied", label });
    } catch {
      setCopyState({ status: "failed", label });
    }
  };

  const packetFilename = buildQuotePacketFilename(packet, "md");

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="overflow-hidden rounded-[28px] border-2 border-[var(--swiss-border)] bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#fff4ef_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
      data-testid="quote-packet-card"
      aria-label="Quote packet and handoff surface"
    >
      <div className="border-b-2 border-[var(--swiss-border)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E31837]/15 bg-[#E31837]/5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-[#E31837]" />
              <span className="swiss-label text-[10px] text-[#B8122C]">Quote Handoff</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-[-0.05em] text-gray-950 sm:text-[2.2rem]">
                Inventory packet ready for an agent review
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
                Combine detected objects, manual additions, and proof links into a single packet
                that can be copied, downloaded, or sent straight into an email draft.
              </p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[28rem]">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Items
              </div>
              <div className="mt-2 text-2xl font-black tracking-[-0.05em] text-gray-950">
                {packet.itemCount}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Photos
              </div>
              <div className="mt-2 text-2xl font-black tracking-[-0.05em] text-gray-950">
                {packet.photoCount}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Receipts
              </div>
              <div className="mt-2 text-2xl font-black tracking-[-0.05em] text-gray-950">
                {packet.documentCount}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Exposure
              </div>
              <div className="mt-2 text-xl font-black tracking-[-0.05em] text-[#E31837]">
                {formatCurrency(packet.unprotectedValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-[var(--swiss-border)] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white px-5 py-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="swiss-label text-gray-500">Document Preview</div>
              <h4 className="mt-1 text-lg font-black tracking-[-0.04em] text-gray-950">
                Packet contents
              </h4>
            </div>
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              {packet.languageLabel}
            </div>
          </div>

          {packet.items.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-sm text-gray-600">
              Add detected or manual items and the packet will populate here with values, proof
              links, and handoff notes.
            </div>
          ) : (
            <div className="space-y-3">
              {packet.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="truncate text-base font-black tracking-[-0.03em] text-gray-950">
                          {item.displayName}
                        </h5>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                          {item.source}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                          {item.coverageLabel}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            item.proofLabel === "Verified"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.proofLabel === "Documented"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.proofLabel}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="swiss-label text-gray-400">Estimated value</div>
                      <div className="mt-1 text-xl font-black tracking-[-0.05em] text-gray-950">
                        {formatCurrency(item.estimatedValue)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.attachments.length > 0 ? (
                      item.attachments.map((attachment) => (
                        <a
                          key={`${item.id}-${attachment.label}-${attachment.url}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-700 transition-colors hover:bg-gray-100"
                        >
                          <Paperclip className="h-3 w-3" />
                          {attachment.label}
                        </a>
                      ))
                    ) : (
                      <div className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        No proof links yet
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="mt-3 text-sm leading-6 text-gray-600">{item.notes}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[linear-gradient(180deg,#fff8f6_0%,#ffffff_100%)] px-5 py-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="swiss-label text-gray-500">Handoff Surface</div>
              <h4 className="mt-1 text-lg font-black tracking-[-0.04em] text-gray-950">
                Ready to email
              </h4>
            </div>
            <div className="rounded-full border border-[#E31837]/15 bg-[#E31837]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8122C]">
              {packet.reviewCount} review{packet.reviewCount === 1 ? "" : "s"}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                <UserRound className="h-3.5 w-3.5" />
                Your name
              </span>
              <input
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                placeholder="Avery Morgan"
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition-colors placeholder:text-gray-400 focus:border-[#E31837]"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                <Mail className="h-3.5 w-3.5" />
                Agent email
              </span>
              <input
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="agent@insurance.com"
                inputMode="email"
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition-colors placeholder:text-gray-400 focus:border-[#E31837]"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                <FileText className="h-3.5 w-3.5" />
                Handoff note
              </span>
              <textarea
                value={handoffNote}
                onChange={(event) => setHandoffNote(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition-colors placeholder:text-gray-400 focus:border-[#E31837]"
              />
            </label>
          </div>

          <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="swiss-label text-gray-500">Email Preview</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                {packet.handoffSubject}
              </div>
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-6 text-gray-700">
              {emailBody}
            </pre>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleCopy(packet.brief, "brief")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--swiss-border)] bg-[var(--swiss-fg)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--swiss-bg)] transition-colors hover:bg-[var(--swiss-accent)]"
            >
              <Copy className="h-4 w-4" />
              Copy brief
            </button>

            <button
              type="button"
              onClick={() => handleCopy(packet.markdown, "markdown")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--swiss-border)] bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--swiss-fg)] transition-colors hover:bg-[var(--swiss-muted)]"
            >
              <FileText className="h-4 w-4" />
              Copy doc
            </button>

            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  buildQuotePacketFilename(packet, "json"),
                  buildQuotePacketJson(packet),
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--swiss-border)] bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--swiss-fg)] transition-colors hover:bg-[var(--swiss-muted)]"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </button>

            <a
              href={mailtoHref ?? undefined}
              aria-disabled={!mailtoHref}
              onClick={(event) => {
                if (!mailtoHref) {
                  event.preventDefault();
                }
              }}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--swiss-border)] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                mailtoHref
                  ? "bg-[#E31837] text-white hover:bg-[#B8122C]"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              }`}
            >
              <Mail className="h-4 w-4" />
              Open email
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>{packet.summary}</span>
          </div>

          {copyState.status !== "idle" && (
            <div
              className={`mt-3 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] ${
                copyState.status === "copied"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {copyState.status === "copied"
                ? `${copyState.label} copied to clipboard`
                : `Clipboard unavailable for ${copyState.label}`}
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-dashed border-gray-300 bg-white/80 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              <ArrowUpRight className="h-3.5 w-3.5 text-[#E31837]" />
              Packet file
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Markdown export: <span className="font-semibold text-gray-900">{packetFilename}</span>
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Copy the brief for email, or download the JSON packet for long-form record keeping.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default QuotePacketCard;
