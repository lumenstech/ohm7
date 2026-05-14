import { describe, expect, it } from "vitest";
import { evaluateRecallRules } from "@/lib/dht/recall-rules";

describe("evaluateRecallRules", () => {
  it("flags Federal Pacific Stab-Lok as high severity", () => {
    const flags = evaluateRecallRules({ manufacturer: "Federal Pacific", panelLine: "Stab-Lok" });
    expect(flags.some((f) => f.code === "fpe.stablok" && f.severity === "high")).toBe(true);
  });

  it("flags FPE Federal Pioneer the same way", () => {
    const flags = evaluateRecallRules({ manufacturer: "Federal Pioneer" });
    expect(flags.some((f) => f.code === "fpe.stablok")).toBe(true);
  });

  it("flags Zinsco panels", () => {
    expect(evaluateRecallRules({ manufacturer: "Zinsco" }).some((f) => f.code === "zinsco")).toBe(true);
    expect(
      evaluateRecallRules({ manufacturer: "Sylvania-Zinsco" }).some((f) => f.code === "zinsco"),
    ).toBe(true);
  });

  it("flags Pushmatic / Bulldog / ITE panels (medium)", () => {
    expect(
      evaluateRecallRules({ manufacturer: "Pushmatic" }).some((f) => f.code === "pushmatic.legacy"),
    ).toBe(true);
    expect(
      evaluateRecallRules({ manufacturer: "Bulldog" }).some((f) => f.code === "pushmatic.legacy"),
    ).toBe(true);
    expect(
      evaluateRecallRules({ manufacturer: "ITE" }).some((f) => f.code === "pushmatic.legacy"),
    ).toBe(true);
  });

  it("flags GE/ABB THQL as info", () => {
    const flags = evaluateRecallRules({ manufacturer: "GE", panelLine: "THQL" });
    expect(flags.some((f) => f.code === "ge.thql.datecode" && f.severity === "info")).toBe(true);
  });

  it("does not flag Square D QO panels", () => {
    const flags = evaluateRecallRules({ manufacturer: "Square D", panelLine: "QO" });
    expect(flags.length).toBe(0);
  });
});
