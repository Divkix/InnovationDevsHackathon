import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGemini } from "./useGemini";

describe("useGemini", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null when the Gemini key is missing", () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "");

    const { result } = renderHook(() => useGemini());

    expect(result.current).toBeNull();
  });

  it("returns a Gemini client that can request multilingual coverage explanations", async () => {
    vi.stubEnv("VITE_GEMINI_API_KEY", "test-key");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    explanation: "This laptop is conditionally covered under homeowners insurance.",
                    language: "en",
                    confidence: 0.88,
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGemini());

    expect(result.current).not.toBeNull();
    const client = result.current;
    expect(client).not.toBeNull();
    const response = await client?.askAboutCoverage({
      item: "Laptop",
      policyType: "homeowners",
      coverageStatus: "conditional",
      coverageNote: "Portable electronics covered subject to limits.",
      language: "en",
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(response).toEqual({
      explanation: "This laptop is conditionally covered under homeowners insurance.",
      language: "en",
      confidence: 0.88,
    });

    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(payload.contents[0].parts[0].text).toContain("Laptop");
    expect(payload.contents[0].parts[0].text).toContain("homeowners insurance");
  });
});
