import type {
  CoverageResult,
  PolicyType,
  SpeechOptions,
  SpeechPlaybackResult,
  SupportedLanguage,
} from "../types";

export const SPEECH_FALLBACK_MESSAGE = "Voice playback is not supported in this browser.";

const LANGUAGE_TO_VOICE: Record<SupportedLanguage, string> = {
  en: "en-US",
  es: "es-ES",
  hi: "hi-IN",
};

const POLICY_LABELS: Record<PolicyType, string> = {
  renters: "renter's insurance",
  homeowners: "homeowner's insurance",
  auto: "auto insurance",
  none: "no insurance",
};

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function getSpeechLanguage(language?: SupportedLanguage | null): string {
  if (!language) return LANGUAGE_TO_VOICE.en;
  return LANGUAGE_TO_VOICE[language] ?? LANGUAGE_TO_VOICE.en;
}

export function buildItemVoiceCopy(
  item: {
    category: string;
    coverage?: CoverageResult;
    confidence?: number;
  },
  explanation?: string | null,
): string {
  const normalizedExplanation = explanation?.trim().replace(/\s+/g, " ");
  if (normalizedExplanation) {
    return normalizedExplanation;
  }

  const categoryName = item.category.trim() || "This item";
  const parts = [`${categoryName}.`];

  if (item.coverage?.status === "covered") {
    parts.push("This item is covered.");
  } else if (item.coverage?.status === "conditional") {
    parts.push("This item is conditionally covered.");
  } else {
    parts.push("This item is not covered.");
  }

  if (item.coverage?.note) {
    parts.push(item.coverage.note);
  }

  if (item.coverage?.upgrade) {
    parts.push(`Upgrade option: ${item.coverage.upgrade}`);
  }

  if (typeof item.coverage?.estimatedValue === "number") {
    parts.push(`Estimated value: $${item.coverage.estimatedValue.toLocaleString()}.`);
  }

  return parts.join(" ");
}

export function buildCoverageVoiceCopy(input: {
  category: string;
  coverage: CoverageResult;
  policyType: PolicyType;
  explanation?: string | null;
}): string {
  const explanation = input.explanation?.trim().replace(/\s+/g, " ");
  if (explanation) {
    return explanation;
  }

  const categoryName = input.category.trim() || "This item";
  const policyLabel = POLICY_LABELS[input.policyType] ?? input.policyType;
  const coverageStatus =
    input.coverage.status === "covered"
      ? "covered"
      : input.coverage.status === "conditional"
        ? "conditionally covered"
        : "not covered";

  const parts = [`${categoryName}.`, `This item is ${coverageStatus} under ${policyLabel}.`];

  if (input.coverage.note) {
    parts.push(input.coverage.note.trim());
  }

  if (input.coverage.conditions?.length) {
    parts.push(`Conditions: ${input.coverage.conditions.slice(0, 2).join("; ")}.`);
  }

  if (input.coverage.upgrade) {
    parts.push(`Upgrade option: ${input.coverage.upgrade}.`);
  }

  return parts.join(" ");
}

export function speakText(text: string, options: SpeechOptions = {}): SpeechPlaybackResult {
  const spokenText = text.trim().replace(/\s+/g, " ");
  if (!spokenText) {
    return { supported: false, spokenText: "" };
  }

  if (!isSpeechSynthesisSupported()) {
    return { supported: false, spokenText };
  }

  try {
    const utterance = new window.SpeechSynthesisUtterance(spokenText);
    utterance.lang = getSpeechLanguage(options.language);
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return { supported: true, spokenText };
  } catch {
    return { supported: false, spokenText };
  }
}
