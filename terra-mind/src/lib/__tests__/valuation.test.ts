import { describe, expect, it } from "vitest";

import {
  computeParcelValue,
  lookbackFromLedger,
  projectInvestment,
} from "@/lib/valuation";

describe("computeParcelValue", () => {
  it("increases projected value with longer horizon", () => {
    const short = computeParcelValue({
      distanceKm: 15,
      phase: "II",
      years: 3,
      baseRate: 25000,
    });
    const long = computeParcelValue({
      distanceKm: 15,
      phase: "II",
      years: 10,
      baseRate: 25000,
    });
    expect(long.projectedValue).toBeGreaterThan(short.projectedValue);
    expect(long.upliftPct).toBeGreaterThan(short.upliftPct);
  });

  it("applies airport proximity premium", () => {
    const near = computeParcelValue({
      distanceKm: 5,
      phase: "III",
      years: 7,
      baseRate: 25000,
    });
    const far = computeParcelValue({
      distanceKm: 35,
      phase: "III",
      years: 7,
      baseRate: 25000,
    });
    expect(near.currentValue).toBeGreaterThan(far.currentValue);
    expect(near.blockHeight).toBeGreaterThan(0.8);
    expect(near.blockHeight).toBeLessThanOrEqual(6.5);
  });
});

describe("projectInvestment", () => {
  it("compounds the invested amount and returns a yearly path", () => {
    const result = projectInvestment({
      amount: 2_500_000,
      months: 60,
      distanceKm: 15,
      phase: "II",
    });
    expect(result.points[0]).toEqual({ monthOffset: 0, value: 2_500_000 });
    expect(result.points).toHaveLength(6); // years 0..5
    expect(result.finalValue).toBeGreaterThan(2_500_000);
    expect(result.profit).toBe(result.finalValue - 2_500_000);
    expect(result.upliftPct).toBeGreaterThan(0);
  });

  it("adds a fractional final point for non-whole-year horizons", () => {
    const result = projectInvestment({
      amount: 1_000_000,
      months: 30,
      distanceKm: 10,
      phase: "III",
    });
    const last = result.points[result.points.length - 1];
    expect(last.monthOffset).toBe(30);
    expect(result.points.map((p) => p.monthOffset)).toEqual([0, 12, 24, 30]);
  });
});

describe("lookbackFromLedger", () => {
  const transactions = [
    { date: "2025-11", rate: 26200 },
    { date: "2026-02", rate: 27450 },
    { date: "2026-06", rate: 28500 },
  ];

  it("computes value today from the entry-date rate", () => {
    // 7-month horizon from 2026-06 targets 2025-11 exactly.
    const result = lookbackFromLedger({
      amount: 2_500_000,
      months: 7,
      transactions,
    });
    expect(result).not.toBeNull();
    expect(result!.entryDate).toBe("2025-11");
    expect(result!.clampedToLedgerStart).toBe(false);
    expect(result!.finalValue).toBe(
      Math.round((2_500_000 * 28500) / 26200),
    );
    expect(result!.upliftPct).toBeCloseTo(((28500 - 26200) / 26200) * 100, 5);
  });

  it("clamps to the first ledger record when the horizon predates it", () => {
    const result = lookbackFromLedger({
      amount: 1_000_000,
      months: 120,
      transactions,
    });
    expect(result!.entryDate).toBe("2025-11");
    expect(result!.clampedToLedgerStart).toBe(true);
  });

  it("returns null when the ledger is too short", () => {
    expect(
      lookbackFromLedger({
        amount: 1_000_000,
        months: 12,
        transactions: [{ date: "2026-06", rate: 28500 }],
      }),
    ).toBeNull();
  });
});
