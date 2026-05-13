import { describe, expect, it } from "vitest";
import { estimateLandlordMonthly, LANDLORD_TIERS } from "@/lib/ohm7/pricing";

describe("estimateLandlordMonthly", () => {
  it("handles zero units", () => {
    const e = estimateLandlordMonthly(0);
    expect(e.monthly).toBe(0);
    expect(e.breakdown.length).toBe(0);
  });

  it("uses cumulative tiers", () => {
    // 25 units: 10 @ $9 + 15 @ $7 = 90 + 105 = 195
    const e = estimateLandlordMonthly(25);
    expect(e.monthly).toBe(195);
    expect(e.breakdown.length).toBe(2);
  });

  it("flags enterprise above 500", () => {
    const e = estimateLandlordMonthly(750);
    expect(e.isEnterprise).toBe(true);
  });

  it("has no overlapping tiers", () => {
    for (let i = 0; i < LANDLORD_TIERS.length - 1; i++) {
      const a = LANDLORD_TIERS[i];
      const b = LANDLORD_TIERS[i + 1];
      expect(a.maxUnits).toBeLessThan(b.minUnits);
    }
  });
});
