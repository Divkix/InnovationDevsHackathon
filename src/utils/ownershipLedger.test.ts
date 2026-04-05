import { describe, expect, it } from "vitest";
import {
  appendOwnershipLedgerEvent,
  createOwnershipLedgerEvent,
  hashOwnershipLedgerPayload,
  verifyOwnershipLedgerChain,
} from "./ownershipLedger";

describe("ownershipLedger", () => {
  it("hashes payloads canonically", () => {
    const first = hashOwnershipLedgerPayload({ b: 1, a: 2 });
    const second = hashOwnershipLedgerPayload({ a: 2, b: 1 });

    expect(first).toBe(second);
  });

  it("creates deterministic ledger events when id and timestamp are supplied", () => {
    const event = createOwnershipLedgerEvent({
      id: "evt-1",
      itemId: "item-1",
      eventType: "serial_verified",
      timestamp: "2026-01-01T00:00:00.000Z",
      payload: { serialNumber: "SN123" },
      previousHash: "prev-hash",
    });

    expect(event).toMatchObject({
      id: "evt-1",
      itemId: "item-1",
      eventType: "serial_verified",
      timestamp: "2026-01-01T00:00:00.000Z",
      previousHash: "prev-hash",
      payload: { serialNumber: "SN123" },
    });
    expect(event.hash).toHaveLength(8);
  });

  it("appends events with hash chaining", () => {
    const ledger = appendOwnershipLedgerEvent<Record<string, string>>([], {
      id: "evt-1",
      itemId: "item-1",
      eventType: "item_detected",
      timestamp: "2026-01-01T00:00:00.000Z",
      payload: { category: "laptop", serialNumber: "" },
    });

    const next = appendOwnershipLedgerEvent(ledger, {
      id: "evt-2",
      itemId: "item-1",
      eventType: "serial_verified",
      timestamp: "2026-01-01T00:01:00.000Z",
      payload: { category: "", serialNumber: "SN123" },
    });

    expect(next).toHaveLength(2);
    expect(next[1].previousHash).toBe(next[0].hash);
  });

  it("verifies a valid ledger chain", () => {
    const ledger = appendOwnershipLedgerEvent(
      appendOwnershipLedgerEvent([], {
        id: "evt-1",
        itemId: "item-1",
        eventType: "ownership_capture_started",
        timestamp: "2026-01-01T00:00:00.000Z",
        payload: {},
      }),
      {
        id: "evt-2",
        itemId: "item-1",
        eventType: "ownership_record_finalized",
        timestamp: "2026-01-01T00:02:00.000Z",
        payload: { verified: true },
      },
    );

    expect(verifyOwnershipLedgerChain(ledger)).toEqual({
      valid: true,
      brokenAt: null,
      reason: null,
    });
  });

  it("detects broken hash chains", () => {
    const ledger = appendOwnershipLedgerEvent([], {
      id: "evt-1",
      itemId: "item-1",
      eventType: "item_detected",
      timestamp: "2026-01-01T00:00:00.000Z",
      payload: {},
    });

    ledger.push({
      ...ledger[0],
      id: "evt-2",
      previousHash: "tampered",
      timestamp: "2026-01-01T00:01:00.000Z",
      hash: ledger[0].hash,
    });

    expect(verifyOwnershipLedgerChain(ledger)).toEqual(
      expect.objectContaining({
        valid: false,
        brokenAt: 1,
      }),
    );
  });
});
