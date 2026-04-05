import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, Lock, Shield, Unlock, WifiOff } from "lucide-react";
import type { ReactElement } from "react";

export interface PrivacyModeBannerProps {
  enabled: boolean;
  onToggle: () => void;
  localOnlyMessage?: string;
}

const bullets: Array<{
  Icon: typeof Lock;
  title: string;
  description: string;
}> = [
  {
    Icon: WifiOff,
    title: "No Network Calls",
    description: "Camera AI runs offline via ONNX",
  },
  {
    Icon: Lock,
    title: "Local Storage Only",
    description: "Items never leave your device",
  },
  {
    Icon: Shield,
    title: "No Cloud Sync",
    description: "Gemini AI calls are disabled",
  },
  {
    Icon: EyeOff,
    title: "Zero Telemetry",
    description: "No analytics or crash reporting",
  },
];

export function PrivacyModeBanner({
  enabled,
  onToggle,
  localOnlyMessage,
}: PrivacyModeBannerProps): ReactElement {
  return (
    <div className="border-2 border-swiss-accent bg-swiss w-full">
      {/* HEADER BAR — always visible */}
      <div className="px-6 py-4 bg-swiss-accent text-swiss-bg flex items-center justify-between">
        {/* Left: icon + labels */}
        <div className="flex items-center gap-3">
          <div
            className="border-2 border-swiss-bg p-2 flex items-center justify-center"
            aria-hidden="true"
          >
            {enabled ? <Lock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-black uppercase tracking-widest text-base">
              Zero Documentation Mode
            </h3>
            <p className="text-xs text-swiss-bg/80 uppercase tracking-wider mt-0.5">
              {enabled ? "Active \u2014 local processing only" : "Your data stays on this device"}
            </p>
          </div>
        </div>

        {/* Right: toggle button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={enabled ? "Disable privacy mode" : "Enable privacy mode"}
          className={
            "swiss-touch-target px-4 py-2 border-2 font-bold uppercase tracking-widest text-sm transition-colors duration-200 flex items-center gap-2" +
            (enabled
              ? " bg-swiss-bg text-swiss-accent border-swiss-bg"
              : " bg-transparent text-swiss-bg border-swiss-bg hover:bg-swiss-bg/10")
          }
        >
          {enabled ? (
            <Lock className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Unlock className="w-4 h-4" aria-hidden="true" />
          )}
          {enabled ? "Enabled" : "Enable"}
        </motion.button>
      </div>

      {/* ANIMATED EXPANSION — only when enabled */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-6 py-5 space-y-4">
              {/* Description */}
              <p className="text-sm text-swiss-fg/70">
                {localOnlyMessage ??
                  "All analysis runs in your browser. Nothing is uploaded or synced to any server."}
              </p>

              {/* Feature bullets grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bullets.map(({ Icon, title, description }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 p-3 bg-swiss-muted border border-swiss-accent/30"
                  >
                    <Icon
                      className="w-4 h-4 text-swiss-accent mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-swiss-fg">
                        {title}
                      </p>
                      <p className="text-xs text-swiss-fg/60 mt-0.5">{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active status pill */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div
                  className="flex items-center gap-2 p-3 bg-swiss-accent/10 border border-swiss-accent"
                  role="status"
                  aria-live="polite"
                >
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 bg-swiss-accent shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-swiss-accent font-black uppercase tracking-wider">
                    Privacy mode active &mdash; all AI processing runs locally
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PrivacyModeBanner;
