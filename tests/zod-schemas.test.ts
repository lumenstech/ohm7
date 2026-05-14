import { describe, expect, it } from "vitest";
import {
  createCircuitSchema,
  createGrantSchema,
  createServiceEventSchema,
  protectionTypeSchema,
} from "@/lib/dht/zod-schemas";

describe("protectionTypeSchema", () => {
  it("accepts all six required values", () => {
    for (const v of ["standard", "afci", "gfci", "dfci", "cafci", "dual_function"] as const) {
      expect(protectionTypeSchema.parse(v)).toBe(v);
    }
  });

  it("rejects unknown values", () => {
    expect(protectionTypeSchema.safeParse("none").success).toBe(false);
  });
});

describe("createCircuitSchema", () => {
  it("requires panelId and circuitNumber", () => {
    const r = createCircuitSchema.safeParse({});
    expect(r.success).toBe(false);
  });
  it("defaults protection to standard", () => {
    const r = createCircuitSchema.parse({ panelId: "x", circuitNumber: 1 });
    expect(r.protectionType).toBe("standard");
  });
});

describe("createServiceEventSchema", () => {
  it("permits omitted nec_section_referenced", () => {
    const r = createServiceEventSchema.safeParse({
      propertyId: "p1",
      eventType: "install",
      summary: "Installed new GFCI breaker",
    });
    expect(r.success).toBe(true);
  });

  it("preserves nec_section_referenced when supplied", () => {
    const r = createServiceEventSchema.parse({
      propertyId: "p1",
      eventType: "install",
      summary: "Installed new GFCI breaker",
      necSectionReferenced: "210.8(A), 408.4(A)",
    });
    expect(r.necSectionReferenced).toContain("210.8(A)");
  });
});

describe("createGrantSchema", () => {
  it("defaults scope to property", () => {
    const r = createGrantSchema.parse({
      shortCode: "ABC1234567",
      requesterName: "Acme Electric",
      reason: "Annual inspection",
    });
    expect(r.scope).toBe("property");
  });
});
