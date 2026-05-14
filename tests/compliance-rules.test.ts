import { describe, expect, it } from "vitest";
import { evaluateCircuit, evaluatePanel } from "@/lib/dht/compliance-rules";

describe("evaluateCircuit", () => {
  it("flags missing protection type as info", () => {
    const flags = evaluateCircuit({ label: "Outlet", protectionType: null }, { necEdition: "2020" });
    expect(flags.some((f) => f.code === "protection.unknown")).toBe(true);
  });

  it("flags bathroom circuit without GFCI", () => {
    const flags = evaluateCircuit(
      { label: "Master bath outlets", protectionType: "standard" },
      { necEdition: "2020" },
    );
    expect(flags.some((f) => f.code === "gfci.area.missing")).toBe(true);
  });

  it("does not flag a bathroom on a GFCI breaker", () => {
    const flags = evaluateCircuit(
      { label: "Master bath outlets", protectionType: "gfci" },
      { necEdition: "2020" },
    );
    expect(flags.some((f) => f.code === "gfci.area.missing")).toBe(false);
  });

  it("dual_function counts as both AFCI and GFCI", () => {
    const bath = evaluateCircuit(
      { label: "Master bath outlets", protectionType: "dual_function" },
      { necEdition: "2020" },
    );
    expect(bath.some((f) => f.code === "gfci.area.missing")).toBe(false);

    const bedroom = evaluateCircuit(
      { label: "Bedroom outlets", protectionType: "dual_function" },
      { necEdition: "2020" },
    );
    expect(bedroom.some((f) => f.code === "afci.area.missing")).toBe(false);
  });

  it("flags bedroom circuit without AFCI", () => {
    const flags = evaluateCircuit(
      { label: "Bedroom 2", protectionType: "gfci" },
      { necEdition: "2020" },
    );
    expect(flags.some((f) => f.code === "afci.area.missing")).toBe(true);
  });

  it("warns on outdoor HVAC without GFCI under 2020 NEC", () => {
    const flags = evaluateCircuit(
      { label: "AC condenser disconnect", protectionType: "standard" },
      { necEdition: "2020" },
    );
    expect(flags.some((f) => f.code === "gfci.outdoor.hvac")).toBe(true);
  });

  it("emits nuisance-trip note when HVAC is on GFCI", () => {
    const flags = evaluateCircuit(
      { label: "Outdoor condenser", protectionType: "gfci" },
      { necEdition: "2020" },
    );
    expect(flags.some((f) => f.code === "gfci.outdoor.hvac.nuisance")).toBe(true);
  });

  it("treats pre-2020 jurisdictions differently for outdoor HVAC", () => {
    const flags = evaluateCircuit(
      { label: "Outdoor condenser", protectionType: "standard" },
      { necEdition: "2017" },
    );
    expect(flags.some((f) => f.code === "gfci.outdoor.hvac.pre2020")).toBe(true);
  });
});

describe("evaluatePanel", () => {
  it("notes when jurisdiction is missing", () => {
    const flags = evaluatePanel([{ label: "Bath", protectionType: "gfci" }]);
    expect(flags.some((f) => f.code === "jurisdiction.unknown")).toBe(true);
  });
});
