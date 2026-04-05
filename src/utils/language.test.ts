import { describe, expect, it } from "vitest";
import { getLanguageLabel, normalizeLanguage, SUPPORTED_LANGUAGES } from "./language";

describe("language helpers", () => {
  it("defaults unsupported values to English", () => {
    expect(normalizeLanguage(undefined)).toBe("en");
    expect(normalizeLanguage(null)).toBe("en");
    expect(normalizeLanguage("fr")).toBe("en");
  });

  it("normalizes supported languages", () => {
    expect(normalizeLanguage("es")).toBe("es");
    expect(normalizeLanguage("hi")).toBe("hi");
  });

  it("returns readable labels for supported languages", () => {
    expect(getLanguageLabel("en")).toBe("English");
    expect(getLanguageLabel("es")).toBe("Spanish");
    expect(getLanguageLabel("hi")).toBe("Hindi");
    expect(SUPPORTED_LANGUAGES).toHaveLength(3);
  });
});
