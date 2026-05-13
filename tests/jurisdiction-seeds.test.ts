import { describe, expect, it } from "vitest";
import { JURISDICTION_SEEDS } from "@/prisma/seed-jurisdictions";

describe("JURISDICTION_SEEDS", () => {
  it("covers at least the 10 jurisdictions the v0.3 spec requires", () => {
    const required = ["NY", "NJ", "CT", "CA", "FL", "TX", "IL", "MA", "PA"];
    for (const code of required) {
      expect(JURISDICTION_SEEDS.some((j) => j.state === code && j.level === "state")).toBe(true);
    }
    // NYC explicitly appears as a municipal AHJ overriding NY State.
    expect(JURISDICTION_SEEDS.some((j) => j.id === "seed-jur-nyc")).toBe(true);
  });

  it("every seed has a stable id (used by upsert)", () => {
    const ids = new Set<string>();
    for (const j of JURISDICTION_SEEDS) {
      expect(j.id.length).toBeGreaterThan(3);
      expect(ids.has(j.id)).toBe(false);
      ids.add(j.id);
    }
  });

  it("municipal jurisdictions have a parentId", () => {
    for (const j of JURISDICTION_SEEDS) {
      if (j.level === "municipal") {
        expect(j.parentId).toBeTruthy();
      }
    }
  });

  it("each state seed has a necEdition", () => {
    for (const j of JURISDICTION_SEEDS) {
      if (j.level === "state") expect(j.necEdition).toBeTruthy();
    }
  });
});
