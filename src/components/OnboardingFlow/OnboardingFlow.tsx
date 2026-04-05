import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Camera,
  Car,
  Check,
  ChevronLeft,
  Home,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { type KeyboardEvent, type ReactElement, useCallback, useState } from "react";
import { SwissButton, SwissSectionLabel } from "@/components/Swiss";
import { useAppContext } from "@/context/AppContext";
import type { OnboardingFlowProps, PolicyType } from "@/types";

interface PolicyOption {
  id: PolicyType;
  label: string;
  icon: LucideIcon;
  description: string;
}

const POLICY_OPTIONS: PolicyOption[] = [
  {
    id: "renters",
    label: "Renter's Insurance",
    icon: Home,
    description: "Coverage for personal property in rented homes",
  },
  {
    id: "homeowners",
    label: "Homeowner's Insurance",
    icon: Shield,
    description: "Full property and belongings coverage",
  },
  {
    id: "auto",
    label: "Auto Insurance",
    icon: Car,
    description: "Vehicle coverage and roadside protection",
  },
  {
    id: "none",
    label: "No Insurance",
    icon: ShieldAlert,
    description: "See what is unprotected (demo mode)",
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps): ReactElement {
  const { policyType, setPolicyType, completeOnboarding } = useAppContext();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyType | null>(policyType || null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const handlePolicySelect = useCallback(
    (policyId: PolicyType): void => {
      setSelectedPolicy(policyId);
      setPolicyType(policyId);
    },
    [setPolicyType],
  );

  const handleNext = useCallback((): void => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentStep === 1) {
        setCurrentStep(2);
      } else {
        completeOnboarding();
        if (onComplete) onComplete();
      }
      setIsTransitioning(false);
    }, 300);
  }, [currentStep, isTransitioning, completeOnboarding, onComplete]);

  const handleBack = useCallback((): void => {
    if (isTransitioning || currentStep === 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(1);
      setIsTransitioning(false);
    }, 300);
  }, [currentStep, isTransitioning]);

  const handleSkip = useCallback((): void => {
    setSelectedPolicy("renters");
    setPolicyType("renters");
    completeOnboarding();
    if (onComplete) onComplete();
  }, [setPolicyType, completeOnboarding, onComplete]);

  const handlePolicyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, policyId: PolicyType): void => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handlePolicySelect(policyId);
      }
    },
    [handlePolicySelect],
  );

  return (
    <div className="min-h-screen bg-swiss swiss-noise flex flex-col" data-testid="onboarding-flow">
      {/* Hero */}
      <div className="border-b-4 border-swiss-fg py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-swiss-fg flex items-center justify-center">
              <Shield className="w-10 h-10 text-swiss-bg" />
            </div>
            <div>
              <h1 className="text-6xl md:text-8xl font-black text-swiss-fg uppercase tracking-tighter leading-none">
                InsureScope
              </h1>
              <p className="text-sm uppercase tracking-widest text-swiss-fg/70 mt-2">
                Object Detection for Insurance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SwissSectionLabel number="01" label="Policy" className="justify-center" />

                <h2 className="text-3xl font-black text-swiss-fg uppercase tracking-tight text-center mb-2">
                  Select Your Insurance
                </h2>
                <p className="text-swiss-fg/70 text-center mb-8">
                  Choose your current policy type. You can change this later.
                </p>

                {/* Policy Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-2 border-swiss-fg mb-8">
                  {POLICY_OPTIONS.map((policy, index) => {
                    const Icon = policy.icon;
                    const isSelected = selectedPolicy === policy.id;
                    const isFirstRow = index < 2;

                    return (
                      <motion.button
                        key={policy.id}
                        whileHover={{ backgroundColor: isSelected ? "#FF3000" : "#000000" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePolicySelect(policy.id)}
                        onKeyDown={(e) => handlePolicyKeyDown(e, policy.id)}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={policy.label}
                        tabIndex={0}
                        className={`
                          relative p-8 flex flex-col items-center text-left
                          border-swiss-fg
                          ${isFirstRow ? "border-b-2" : ""}
                          ${index % 2 === 0 ? "border-r-2" : ""}
                          ${isSelected ? "bg-swiss-accent text-swiss-bg" : "bg-swiss text-swiss-fg"}
                          transition-colors duration-200
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-swiss-accent focus-visible:ring-offset-2
                        `}
                      >
                        <div
                          className={`
                          w-12 h-12 border-2 mb-4 flex items-center justify-center
                          ${isSelected ? "border-swiss-bg" : "border-swiss-fg"}
                        `}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-black uppercase tracking-wide text-lg mb-1">
                          {policy.label}
                        </h3>
                        <p
                          className={`text-sm ${isSelected ? "text-swiss-bg/80" : "text-swiss-fg/60"}`}
                        >
                          {policy.description}
                        </p>
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-6 h-6 bg-swiss-bg flex items-center justify-center">
                            <Check className="w-4 h-4 text-swiss-accent" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <SwissButton
                  onClick={handleNext}
                  disabled={!selectedPolicy || isTransitioning}
                  variant="primary"
                  size="large"
                  className="w-full"
                >
                  {isTransitioning ? "Continuing..." : "Continue"}
                  <ArrowRight className="w-5 h-5" />
                </SwissButton>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SwissSectionLabel number="02" label="Camera" className="justify-center" />

                <h2 className="text-3xl font-black text-swiss-fg uppercase tracking-tight text-center mb-2">
                  Point Your Camera
                </h2>
                <p className="text-swiss-fg/70 text-center mb-8">
                  Scan your room to detect items and see your insurance coverage.
                </p>

                {/* Bauhaus-style camera illustration */}
                <div className="border-2 border-swiss-fg mb-8">
                  <div className="grid grid-cols-2">
                    <div className="bg-swiss-muted swiss-diagonal p-12 flex items-center justify-center border-r-2 border-swiss-fg">
                      <div className="w-24 h-24 border-4 border-swiss-fg bg-swiss flex items-center justify-center relative">
                        <Camera className="w-12 h-12 text-swiss-fg" />
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-swiss-accent" />
                      </div>
                    </div>
                    <div className="p-8 swiss-dots">
                      <ul className="space-y-4">
                        {[
                          { id: "point", text: "Point camera at objects" },
                          { id: "detect", text: "AI detects items automatically" },
                          { id: "status", text: "See coverage status instantly" },
                        ].map((item, i) => (
                          <li key={item.id} className="flex items-start gap-3">
                            <span className="text-swiss-accent font-black text-lg">0{i + 1}.</span>
                            <span className="text-swiss-fg font-medium">{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-widest text-swiss-fg/50 text-center mb-8">
                  All processing happens on your device. No images sent to servers.
                </p>

                <div className="flex gap-4">
                  <SwissButton
                    onClick={handleBack}
                    disabled={isTransitioning}
                    variant="secondary"
                    className="flex-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </SwissButton>
                  <SwissButton
                    onClick={handleNext}
                    disabled={isTransitioning}
                    variant="primary"
                    size="large"
                    className="flex-2"
                  >
                    <Camera className="w-5 h-5" />
                    {isTransitioning ? "Starting..." : "Start Camera"}
                  </SwissButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip Option */}
          <p className="text-center mt-8 text-sm text-swiss-fg/50">
            Already have an account?{" "}
            <button
              onClick={handleSkip}
              className="text-swiss-accent hover:underline font-bold uppercase"
            >
              Skip to main view
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
