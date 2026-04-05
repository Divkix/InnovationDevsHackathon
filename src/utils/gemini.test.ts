import { describe, expect, it, vi } from "vitest";
import type { GeminiCoverageRequest } from "@/types";
import { buildCoverageExplainPrompt, requestCoverageExplanation, requestRoomScan } from "./gemini";

function makeRequest(overrides: Partial<GeminiCoverageRequest> = {}): GeminiCoverageRequest {
  return {
    item: "Television",
    policyType: "renters",
    coverageStatus: "conditional",
    coverageNote: "Mounted TV with special exclusions.",
    language: "es",
    ...overrides,
  };
}

describe("gemini utils", () => {
  it("builds a compact multilingual coverage prompt", () => {
    const prompt = buildCoverageExplainPrompt(makeRequest());

    expect(prompt).toContain("Spanish");
    expect(prompt).toContain("Television");
    expect(prompt).toContain("conditionally covered");
    expect(prompt).toContain("JSON");
  });

  it("returns null when no Gemini key is provided", async () => {
    const response = await requestCoverageExplanation("", makeRequest(), vi.fn());

    expect(response).toBeNull();
  });

  it("parses a Gemini JSON response into a compact explanation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    explanation:
                      "Su televisor normalmente está cubierto bajo renters, sujeto al deducible.",
                    language: "es",
                    confidence: 0.91,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const response = await requestCoverageExplanation("test-key", makeRequest(), fetchMock);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response).toEqual({
      explanation: "Su televisor normalmente está cubierto bajo renters, sujeto al deducible.",
      language: "es",
      confidence: 0.91,
    });
  });

  it("falls back safely when Gemini returns malformed output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "This item is probably covered." }],
            },
          },
        ],
      }),
    });

    const response = await requestCoverageExplanation("test-key", makeRequest(), fetchMock);

    expect(response).toEqual({
      explanation:
        "This Television is conditionally covered under renters insurance, subject to your policy terms.",
      language: "es",
      confidence: 0.35,
    });
  });

  it("parses structured room scan items from Gemini", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary:
                      "I can see a Red Bull can and a laptop. The laptop matters more for coverage.",
                    objects: ["Red Bull can", "laptop"],
                    items: [
                      {
                        label: "Red Bull can",
                        category: "bottle",
                        estimatedValue: 15,
                        coverageStatus: "conditional",
                        agentNote: "Consumables are usually low priority for coverage.",
                      },
                      {
                        label: "Laptop",
                        category: "laptop",
                        estimatedValue: 1200,
                        coverageStatus: "covered",
                        agentNote: "This is a higher-value item worth documenting.",
                      },
                    ],
                    priorities: ["Document the laptop first."],
                    nextSteps: ["Take a dedicated photo of the laptop."],
                    language: "en",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const response = await requestRoomScan(
      "test-key",
      {
        imageBase64: "abc",
        policyType: "renters",
        language: "en",
      },
      fetchMock,
    );

    expect(response?.items).toHaveLength(2);
    expect(response?.items[0]).toEqual({
      label: "Red Bull can",
      category: "bottle",
      estimatedValue: 15,
      coverageStatus: "conditional",
      agentNote: "Consumables are usually low priority for coverage.",
    });
  });
});
