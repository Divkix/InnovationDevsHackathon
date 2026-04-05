import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle, FileText, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import ItemLineItem from "@/components/quote/ItemLineItem";
import { useAppContext } from "@/context/AppContext";
import { buildQuoteHandoffDocument } from "@/utils/quoteDocument";
import { calculateValues } from "@/utils/valueCalculator";

interface QuoteHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0));
}

export function QuoteHandoffModal({ isOpen, onClose }: QuoteHandoffModalProps) {
  const { policyType, language, manualItems, detectedItems } = useAppContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSubmitted(false);
    setCopyStatus("");
    setError("");
    setName("");
    setEmail("");
  }, [isOpen]);

  const detectedItemsArray = useMemo(() => Array.from(detectedItems.values()), [detectedItems]);
  const calculationResult = useMemo(
    () => calculateValues(detectedItemsArray, manualItems, policyType),
    [detectedItemsArray, manualItems, policyType],
  );

  const handoffPackage = useMemo(
    () =>
      buildQuoteHandoffDocument({
        policyType,
        language,
        totalValue: calculationResult.totalValue,
        protectedValue: calculationResult.protectedValue,
        unprotectedValue: calculationResult.unprotectedValue,
        coverageGapPercentage: calculationResult.coverageGapPercentage,
        items: calculationResult.items,
        detectedItems: detectedItemsArray,
        manualItems,
        contactName: name,
        contactEmail: email,
      }),
    [calculationResult, detectedItemsArray, email, language, manualItems, name, policyType],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(handoffPackage.documentText);
      setCopyStatus("Copied to clipboard");
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([handoffPackage.documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = handoffPackage.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("NAME AND EMAIL REQUIRED");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("INVALID EMAIL ADDRESS");
      return;
    }
    setSubmitted(true);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-3xl overflow-hidden rounded-[28px] border-2 border-black bg-white shadow-[0_30px_90px_rgba(0,0,0,0.25)]"
          initial={{ y: 40, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 20, scale: 0.98, opacity: 0 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b-2 border-black px-5 py-4">
            <div>
              <div className="sw-label text-[#FF3000] flex items-center gap-2">
                <FileText className="h-4 w-4" />
                QUOTE HANDOFF
              </div>
              <h2 className="sw-display text-2xl sm:text-3xl text-black">READY TO SEND</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center border-2 border-black text-black"
              aria-label="Close quote handoff"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.9fr]">
            <div className="border-b-2 border-black lg:border-b-0 lg:border-r-2">
              <div className="border-b-2 border-black px-5 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="sw-label text-black/35">TOTAL VALUE</div>
                    <div className="sw-display text-2xl text-black">
                      {formatCurrency(calculationResult.totalValue)}
                    </div>
                  </div>
                  <div>
                    <div className="sw-label text-black/35">PROTECTED</div>
                    <div className="sw-display text-2xl text-[#1a8a00]">
                      {formatCurrency(calculationResult.protectedValue)}
                    </div>
                  </div>
                  <div>
                    <div className="sw-label text-black/35">EXPOSURE</div>
                    <div className="sw-display text-2xl text-[#FF3000]">
                      {formatCurrency(calculationResult.unprotectedValue)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-[320px] overflow-y-auto px-5 py-2">
                <div className="sw-label mb-3 text-black/35">ITEM LINEUP</div>
                {calculationResult.items.length > 0 ? (
                  <div>
                    {calculationResult.items.map((item) => (
                      <ItemLineItem key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <p className="pb-4 text-sm text-black/45">
                    Scan or add items to build the handoff.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-black text-white">
              {submitted ? (
                <div className="flex h-full flex-col justify-between px-5 py-6">
                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-1">
                      <CheckCircle className="h-4 w-4 text-white" />
                      <span className="sw-label text-white">REQUEST SENT</span>
                    </div>
                    <h3 className="sw-display text-3xl text-white">TRANSMISSION COMPLETE</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                      The handoff packet is ready for an agent review. Copy or download the document
                      if you want to include it with a follow-up.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="w-full border-2 border-white bg-white px-4 py-3 text-sm font-semibold text-black"
                    >
                      COPY DOCUMENT
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full border-2 border-white/30 bg-transparent px-4 py-3 text-sm font-semibold text-white"
                    >
                      DOWNLOAD TXT
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full border-2 border-white/30 bg-transparent px-4 py-3 text-sm font-semibold text-white"
                    >
                      CLOSE
                    </button>
                  </div>
                </div>
              ) : (
                <form className="flex h-full flex-col px-5 py-6" onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <div className="sw-label text-white/50">CONTACT DETAILS</div>
                    <h3 className="sw-display text-3xl text-white">PREPARE HANDOFF</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                      Generate a simple quote packet and send it to the agent with the current
                      inventory summary.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="sw-label mb-1 block text-white/50">FULL NAME</span>
                      <input
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          setError("");
                        }}
                        className="w-full border-2 border-white/15 bg-white/5 px-3 py-3 text-white outline-none"
                        placeholder="Alex Morgan"
                      />
                    </label>
                    <label className="block">
                      <span className="sw-label mb-1 block text-white/50">EMAIL ADDRESS</span>
                      <input
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setError("");
                        }}
                        className="w-full border-2 border-white/15 bg-white/5 px-3 py-3 text-white outline-none"
                        placeholder="alex@example.com"
                      />
                    </label>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="sw-label mb-2 text-white/40">DOCUMENT PREVIEW</div>
                    <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-white/75">
                      {handoffPackage.documentText}
                    </pre>
                  </div>

                  {copyStatus && <p className="mt-3 text-xs text-white/55">{copyStatus}</p>}
                  {error && <p className="mt-3 text-xs text-[#FF6B6B]">{error}</p>}

                  <div className="mt-6 space-y-3">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 border-2 border-white bg-white px-4 py-3 text-sm font-semibold text-black"
                    >
                      SEND HANDOFF <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="w-full border-2 border-white/30 bg-transparent px-4 py-3 text-sm font-semibold text-white"
                    >
                      COPY DOCUMENT
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full border-2 border-white/30 bg-transparent px-4 py-3 text-sm font-semibold text-white"
                    >
                      DOWNLOAD TXT
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QuoteHandoffModal;
