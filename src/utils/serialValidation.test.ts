import { describe, expect, it } from "vitest";
import {
  classifyOwnershipIdentifier,
  isValidImei,
  looksLikeSerialNumber,
  normalizeImei,
  normalizeModelNumber,
  normalizeSerialNumber,
} from "./serialValidation";

describe("serialValidation", () => {
  describe("normalizeSerialNumber", () => {
    it("removes whitespace and uppercases serial values", () => {
      expect(normalizeSerialNumber("  ab-12 / cd  ")).toBe("AB-12/CD");
    });

    it("returns an empty string for non-strings", () => {
      expect(normalizeSerialNumber(null)).toBe("");
      expect(normalizeSerialNumber(undefined)).toBe("");
    });
  });

  describe("normalizeModelNumber", () => {
    it("preserves common model separators while normalizing case", () => {
      expect(normalizeModelNumber("  sm-g991u  ")).toBe("SM-G991U");
      expect(normalizeModelNumber("a2483/1")).toBe("A2483/1");
    });
  });

  describe("normalizeImei", () => {
    it("keeps digits only and truncates extra characters", () => {
      expect(normalizeImei("35 209900 176148 1")).toBe("352099001761481");
    });
  });

  describe("isValidImei", () => {
    it("accepts valid IMEI values", () => {
      expect(isValidImei("490154203237518")).toBe(true);
    });

    it("rejects invalid IMEI values", () => {
      expect(isValidImei("490154203237519")).toBe(false);
      expect(isValidImei("12345")).toBe(false);
    });
  });

  describe("looksLikeSerialNumber", () => {
    it("accepts reasonably shaped serial strings", () => {
      expect(looksLikeSerialNumber("SN-ABC-12345")).toBe(true);
    });

    it("rejects tiny or empty values", () => {
      expect(looksLikeSerialNumber("A1")).toBe(false);
      expect(looksLikeSerialNumber("")).toBe(false);
    });
  });

  describe("classifyOwnershipIdentifier", () => {
    it("classifies IMEI values first", () => {
      expect(classifyOwnershipIdentifier("490154203237518")).toEqual({
        raw: "490154203237518",
        value: "490154203237518",
        kind: "imei",
        valid: true,
      });
    });

    it("classifies serial numbers when not an IMEI", () => {
      expect(classifyOwnershipIdentifier("  sn-abc-12345 ")).toEqual({
        raw: "  sn-abc-12345 ",
        value: "SN-ABC-12345",
        kind: "serial",
        valid: true,
      });
    });

    it("falls back to model numbers for shorter structured values", () => {
      expect(classifyOwnershipIdentifier("sm-g991u")).toEqual({
        raw: "sm-g991u",
        value: "SM-G991U",
        kind: "model",
        valid: true,
      });
    });
  });
});
