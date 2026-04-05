import type {
  CoverageStatus,
  GeminiCoverageRequest,
  GeminiCoverageResponse,
  GeminiRoomScanResponse,
  SupportedLanguage,
} from "../types";
import { getLanguageLabel, normalizeLanguage } from "./language";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    language: { type: "string", enum: ["en", "es", "hi"] },
    confidence: { type: "number" },
  },
  required: ["explanation", "language", "confidence"],
} as const;

const ROOM_SCAN_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    objects: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          category: { type: "string" },
          estimatedValue: { type: "number" },
          coverageStatus: { type: "string", enum: ["covered", "conditional", "not_covered"] },
          agentNote: { type: "string" },
        },
        required: ["label", "category", "estimatedValue", "coverageStatus", "agentNote"],
      },
      maxItems: 6,
    },
    priorities: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
    nextSteps: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
    language: { type: "string", enum: ["en", "es", "hi"] },
  },
  required: ["summary", "objects", "items", "priorities", "nextSteps", "language"],
} as const;

function getGeminiApiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return text.trim();
  }

  return text.slice(start, end + 1).trim();
}

function sanitizeJsonText(text: string) {
  return extractJsonObject(
    text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .replace(/,\s*([}\]])/g, "$1"),
  );
}

function getGeminiText(payload: unknown) {
  const data = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (text) return text;

  const blockedReason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
  if (blockedReason) {
    throw new Error(`Gemini returned no content (${blockedReason})`);
  }

  throw new Error("Gemini returned no content");
}

function normalizeCoverageStatus(status: CoverageStatus): string {
  if (status === "not_covered") return "not covered";
  if (status === "conditional") return "conditionally covered";
  return "covered";
}

function getPolicyLabel(policyType: GeminiCoverageRequest["policyType"]) {
  const labels: Record<GeminiCoverageRequest["policyType"], string> = {
    renters: "renters insurance",
    homeowners: "homeowners insurance",
    auto: "auto insurance",
    none: "no insurance",
  };

  return labels[policyType];
}

export function buildCoverageExplainPrompt(input: GeminiCoverageRequest) {
  const language = normalizeLanguage(input.language);
  const languageLabel = getLanguageLabel(language);
  const coverageStatus = normalizeCoverageStatus(input.coverageStatus);
  const policyLabel = getPolicyLabel(input.policyType);

  return [
    `Explain in ${languageLabel} in one short sentence why "${input.item}" is ${coverageStatus} under ${policyLabel}.`,
    input.coverageNote ? `Coverage note: ${input.coverageNote}.` : "Coverage note: none.",
    "Use plain language and return compact JSON with explanation, language, and confidence.",
  ].join(" ");
}

export function buildCoverageFallback(input: GeminiCoverageRequest): GeminiCoverageResponse {
  const language = normalizeLanguage(input.language);
  const coverageStatus = normalizeCoverageStatus(input.coverageStatus);
  const policyLabel = getPolicyLabel(input.policyType);

  return {
    language,
    confidence: 0.35,
    explanation: `This ${input.item} is ${coverageStatus} under ${policyLabel}, subject to your policy terms.`,
  };
}

export function buildRoomScanFallback(
  languageInput?: SupportedLanguage | string | null,
): GeminiRoomScanResponse {
  const language = normalizeLanguage(languageInput);

  return {
    summary:
      "AI room scan is unavailable right now. Live detections are still active, so review uncovered items in the dashboard and detail modal.",
    objects: [],
    items: [],
    priorities: ["Review red and yellow items first.", "Check your active policy before quoting."],
    nextSteps: [
      "Open an item to review coverage details.",
      "Use the dashboard to review exposed value.",
    ],
    language,
  };
}

function normalizeResponseLanguage(
  parsedLanguage: unknown,
  requestedLanguage: SupportedLanguage,
): SupportedLanguage {
  if (typeof parsedLanguage !== "string") return requestedLanguage;
  const normalized = normalizeLanguage(parsedLanguage);
  return normalized;
}

function parseGeminiResponse(rawText: string, requestedLanguage: SupportedLanguage) {
  const cleaned = sanitizeJsonText(rawText);
  const parsed = JSON.parse(cleaned) as Partial<GeminiCoverageResponse>;
  const explanation =
    typeof parsed.explanation === "string" && parsed.explanation.trim()
      ? parsed.explanation.trim().replace(/\s+/g, " ")
      : "";
  const language = normalizeResponseLanguage(parsed.language, requestedLanguage);
  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? parsed.confidence
      : 0.5;

  if (!explanation) {
    throw new Error("Gemini response missing explanation");
  }

  return {
    explanation,
    language,
    confidence,
  } satisfies GeminiCoverageResponse;
}

function parseGeminiRoomScanResponse(rawText: string, requestedLanguage: SupportedLanguage) {
  const cleaned = sanitizeJsonText(rawText);
  const parsed = JSON.parse(cleaned) as Partial<GeminiRoomScanResponse>;
  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().replace(/\s+/g, " ")
      : "";

  if (!summary) {
    throw new Error("Gemini room scan response missing summary");
  }

  return {
    summary,
    objects: Array.isArray(parsed.objects)
      ? parsed.objects.filter((value): value is string => typeof value === "string").slice(0, 6)
      : [],
    items: Array.isArray(parsed.items)
      ? parsed.items
          .filter(
            (
              value,
            ): value is {
              label: string;
              category: string;
              estimatedValue: number;
              coverageStatus: CoverageStatus;
              agentNote: string;
            } =>
              typeof value === "object" &&
              value !== null &&
              typeof value.label === "string" &&
              typeof value.category === "string" &&
              typeof value.estimatedValue === "number" &&
              typeof value.coverageStatus === "string" &&
              typeof value.agentNote === "string",
          )
          .slice(0, 6)
      : [],
    priorities: Array.isArray(parsed.priorities)
      ? parsed.priorities.filter((value): value is string => typeof value === "string").slice(0, 3)
      : [],
    nextSteps: Array.isArray(parsed.nextSteps)
      ? parsed.nextSteps.filter((value): value is string => typeof value === "string").slice(0, 3)
      : [],
    language: normalizeResponseLanguage(parsed.language, requestedLanguage),
  } satisfies GeminiRoomScanResponse;
}

export async function requestCoverageExplanation(
  apiKey: string,
  input: GeminiCoverageRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiCoverageResponse | null> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return null;

  const normalizedLanguage = normalizeLanguage(input.language);

  try {
    const response = await fetchImpl(getGeminiApiUrl(GEMINI_MODEL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": trimmedKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are a multilingual insurance coverage assistant. Return only compact JSON.",
            },
          ],
        },
        contents: [
          {
            parts: [{ text: buildCoverageExplainPrompt(input) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: 192,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!response.ok) {
      return buildCoverageFallback({ ...input, language: normalizedLanguage });
    }

    const payload = (await response.json()) as unknown;
    const rawText = getGeminiText(payload);
    return parseGeminiResponse(rawText, normalizedLanguage);
  } catch {
    return buildCoverageFallback({ ...input, language: normalizedLanguage });
  }
}

export async function requestRoomScan(
  apiKey: string,
  input: {
    imageBase64: string;
    mimeType?: string;
    policyType: GeminiCoverageRequest["policyType"];
    detectedCategories?: string[];
    language?: SupportedLanguage;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiRoomScanResponse | null> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return null;

  const normalizedLanguage = normalizeLanguage(input.language);

  try {
    const response = await fetchImpl(getGeminiApiUrl(GEMINI_MODEL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": trimmedKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are an insurance room scan assistant. Return only compact JSON.",
            },
          ],
        },
        contents: [
          {
            parts: [
              {
                text: [
                  `Analyze this room for a user with ${getPolicyLabel(input.policyType)}.`,
                  `Respond in ${getLanguageLabel(normalizedLanguage)}.`,
                  input.detectedCategories?.length
                    ? `Known detections: ${input.detectedCategories.join(", ")}.`
                    : "Known detections: none.",
                  'Also include up to 6 visible object labels in "objects".',
                  'For each visible insurable item, include an "items" entry with label, normalized category, estimatedValue, coverageStatus, and a short agentNote.',
                  'Return compact JSON with "summary", "objects", "items", "priorities", "nextSteps", and "language".',
                ].join(" "),
              },
              {
                inline_data: {
                  mime_type: input.mimeType || "image/jpeg",
                  data: input.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: ROOM_SCAN_SCHEMA,
          maxOutputTokens: 384,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!response.ok) {
      return buildRoomScanFallback(normalizedLanguage);
    }

    const payload = (await response.json()) as unknown;
    const rawText = getGeminiText(payload);
    return parseGeminiRoomScanResponse(rawText, normalizedLanguage);
  } catch {
    return buildRoomScanFallback(normalizedLanguage);
  }
}
