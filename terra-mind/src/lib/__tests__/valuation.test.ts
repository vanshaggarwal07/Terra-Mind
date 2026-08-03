import { describe, expect, it } from "vitest";

import { computeParcelValue } from "@/lib/valuation";

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
