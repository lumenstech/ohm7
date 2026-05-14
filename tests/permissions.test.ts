import { describe, expect, it } from "vitest";
import { roleCan } from "@/lib/dht/permissions";

describe("roleCan", () => {
  it("owner can manage grants and write panels", () => {
    expect(roleCan({ role: "owner" }, "grant.manage")).toBe(true);
    expect(roleCan({ role: "owner" }, "panel.write")).toBe(true);
  });

  it("tenant cannot grant access", () => {
    expect(roleCan({ role: "tenant" }, "grant.manage")).toBe(false);
  });

  it("tenant can write tenant service requests", () => {
    expect(roleCan({ role: "tenant" }, "tenant.request.write")).toBe(true);
  });

  it("trade cannot claim property or manage grants directly", () => {
    expect(roleCan({ role: "trade" }, "grant.manage")).toBe(false);
    expect(roleCan({ role: "trade" }, "claim.override")).toBe(false);
    expect(roleCan({ role: "trade" }, "property.write")).toBe(false);
  });

  it("only admin can override claims", () => {
    expect(roleCan({ role: "admin" }, "claim.override")).toBe(true);
    expect(roleCan({ role: "owner" }, "claim.override")).toBe(false);
  });
});
