export type OwnershipLedgerEventType =
  | "item_detected"
  | "ownership_capture_started"
  | "serial_verified"
  | "value_overridden"
  | "receipt_attached"
  | "ownership_record_finalized"
  | "fraud_flagged";

export interface OwnershipLedgerEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  itemId: string;
  eventType: OwnershipLedgerEventType;
  timestamp: string;
  previousHash: string | null;
  payload: TPayload;
  hash: string;
}

export interface CreateOwnershipLedgerEventInput<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  itemId: string;
  eventType: OwnershipLedgerEventType;
  timestamp?: string;
  payload?: TPayload;
  previousHash?: string | null;
  id?: string;
}

export interface OwnershipLedgerVerification {
  valid: boolean;
  brokenAt: number | null;
  reason: string | null;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export function hashOwnershipLedgerPayload(value: unknown): string {
  const source = stableSerialize(value);
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashOwnershipLedgerEvent<TPayload extends Record<string, unknown>>(
  event: Omit<OwnershipLedgerEvent<TPayload>, "hash">,
): string {
  return hashOwnershipLedgerPayload({
    id: event.id,
    itemId: event.itemId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    previousHash: event.previousHash,
    payload: event.payload,
  });
}

export function createOwnershipLedgerEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
>(input: CreateOwnershipLedgerEventInput<TPayload>): OwnershipLedgerEvent<TPayload> {
  const previousHash = input.previousHash ?? null;
  const event: Omit<OwnershipLedgerEvent<TPayload>, "hash"> = {
    id: input.id ?? randomId(),
    itemId: input.itemId,
    eventType: input.eventType,
    timestamp: input.timestamp ?? new Date().toISOString(),
    previousHash,
    payload: (input.payload ?? {}) as TPayload,
  };

  return {
    ...event,
    hash: hashOwnershipLedgerEvent(event),
  };
}

export function appendOwnershipLedgerEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
>(
  ledger: OwnershipLedgerEvent<TPayload>[],
  input: CreateOwnershipLedgerEventInput<TPayload>,
): OwnershipLedgerEvent<TPayload>[] {
  const previousHash = ledger.length > 0 ? ledger[ledger.length - 1].hash : null;
  return [...ledger, createOwnershipLedgerEvent({ ...input, previousHash })];
}

export function verifyOwnershipLedgerChain<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
>(ledger: OwnershipLedgerEvent<TPayload>[]): OwnershipLedgerVerification {
  if (!Array.isArray(ledger) || ledger.length === 0) {
    return { valid: true, brokenAt: null, reason: null };
  }

  for (let index = 0; index < ledger.length; index += 1) {
    const current = ledger[index];
    if (!current?.id || !current.itemId || !current.eventType || !current.timestamp) {
      return { valid: false, brokenAt: index, reason: "Missing required ledger fields" };
    }

    const expectedPreviousHash = index === 0 ? null : (ledger[index - 1]?.hash ?? null);
    if (current.previousHash !== expectedPreviousHash) {
      return { valid: false, brokenAt: index, reason: "Previous hash mismatch" };
    }

    const expectedHash = hashOwnershipLedgerEvent({
      id: current.id,
      itemId: current.itemId,
      eventType: current.eventType,
      timestamp: current.timestamp,
      previousHash: current.previousHash,
      payload: current.payload,
    });

    if (current.hash !== expectedHash) {
      return { valid: false, brokenAt: index, reason: "Hash mismatch" };
    }
  }

  return { valid: true, brokenAt: null, reason: null };
}
