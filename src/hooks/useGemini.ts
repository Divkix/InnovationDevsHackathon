/// <reference types="vite/client" />
import type { GeminiClient } from "../types";
import { requestCoverageExplanation, requestRoomScan } from "../utils/gemini";

/**
 * useGemini hook - browser-side Gemini coverage helper.
 *
 * Returns a configured client only when VITE_GEMINI_API_KEY is present.
 * Callers can request compact multilingual explanations for an item and policy.
 */
export function useGemini(): GeminiClient | null {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    isConfigured: true,
    askAboutCoverage: (input) => requestCoverageExplanation(apiKey, input),
    analyzeRoom: (input) => requestRoomScan(apiKey, input),
  };
}

export default useGemini;
