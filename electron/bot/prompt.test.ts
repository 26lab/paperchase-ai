import { describe, expect, it } from "vitest";
import { dataDelayMinutes } from "./prompt";

const now = Date.parse("2026-10-29T14:51:07Z");

describe("dataDelayMinutes", () => {
  it("reads ATAS candle times as UTC and reports the feed delay", () => {
    // Forming candle started 14:36 → 15 min old, minus its own minute = 14 min behind.
    expect(dataDelayMinutes("2026-10-29T14:36:00.0000000", now)).toBe(14);
  });

  it("reports 0 for a live feed", () => {
    expect(dataDelayMinutes("2026-10-29T14:51:00.0000000", now)).toBe(0);
  });

  it("respects an explicit zone suffix", () => {
    expect(dataDelayMinutes("2026-10-29T15:36:00+01:00", now)).toBe(14);
  });

  it("returns null without a usable time", () => {
    expect(dataDelayMinutes(undefined, now)).toBeNull();
    expect(dataDelayMinutes("kaputt", now)).toBeNull();
  });
});
