const IMEI_LENGTH = 15;

export interface NormalizedOwnershipIdentifier {
  raw: string;
  value: string;
  kind: "imei" | "serial" | "model" | "unknown";
  valid: boolean;
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function removeNonAlphaNumeric(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "");
}

function hasLetterAndDigit(value: string): boolean {
  return /[A-Z]/i.test(value) && /\d/.test(value);
}

export function normalizeSerialNumber(value: unknown): string {
  const text = normalizeWhitespace(toSafeString(value)).toUpperCase();
  if (!text) return "";

  return text
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9\-/]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/\/{2,}/g, "/");
}

export function normalizeModelNumber(value: unknown): string {
  const text = normalizeWhitespace(toSafeString(value)).toUpperCase();
  if (!text) return "";

  return text
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9\-/_.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-")
    .replace(/\/{2,}/g, "/");
}

export function normalizeImei(value: unknown): string {
  const digits = toSafeString(value).replace(/\D/g, "");
  return digits.slice(0, IMEI_LENGTH);
}

export function isValidImei(value: unknown): boolean {
  const digits = normalizeImei(value);
  if (digits.length !== IMEI_LENGTH) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    const digit = Number(digits[digits.length - 1 - index]);
    const doubled = index % 2 === 1 ? digit * 2 : digit;
    sum += doubled > 9 ? doubled - 9 : doubled;
  }

  return sum % 10 === 0;
}

export function looksLikeSerialNumber(value: unknown): boolean {
  const normalized = normalizeSerialNumber(value);
  if (!normalized) return false;

  const alphaNumericCount = removeNonAlphaNumeric(normalized).length;
  return alphaNumericCount >= 6 && alphaNumericCount <= 64;
}

export function looksLikeModelNumber(value: unknown): boolean {
  const normalized = normalizeModelNumber(value);
  if (!normalized) return false;

  const length = removeNonAlphaNumeric(normalized).length;
  const separatorCount = (normalized.match(/[-/_.]/g) || []).length;

  return length >= 4 && length <= 16 && hasLetterAndDigit(normalized) && separatorCount <= 2;
}

export function classifyOwnershipIdentifier(value: unknown): NormalizedOwnershipIdentifier {
  const raw = toSafeString(value);
  const imei = normalizeImei(raw);
  if (isValidImei(imei)) {
    return { raw, value: imei, kind: "imei", valid: true };
  }

  const normalizedSerial = normalizeSerialNumber(raw);
  if (normalizedSerial.startsWith("SN") || normalizedSerial.includes("SERIAL")) {
    return { raw, value: normalizedSerial, kind: "serial", valid: true };
  }

  const model = normalizeModelNumber(raw);
  if (looksLikeModelNumber(model)) {
    return { raw, value: model, kind: "model", valid: true };
  }

  if (looksLikeSerialNumber(normalizedSerial)) {
    return { raw, value: normalizedSerial, kind: "serial", valid: true };
  }

  return {
    raw,
    value: normalizeWhitespace(raw),
    kind: "unknown",
    valid: false,
  };
}

export function isHighValueItemCategory(category: unknown): boolean {
  const normalized = normalizeSerialNumber(category);
  return [
    "LAPTOP",
    "PHONE",
    "CELL-PHONE",
    "CELL PHONE",
    "TV",
    "TELEVISION",
    "BICYCLE",
    "CAMERA",
  ].some((needle) => normalized.includes(needle.replace(/[^A-Z0-9]/g, "")));
}
