import { describe, expect, it } from "vitest";
import { buildPublicScanView } from "@/lib/ohm7/scan-view";

const fullPanel = {
  id: "p1",
  nickname: "Main panel",
  locationDescription: "Basement, north wall",
  manufacturer: "Square D",
  modelNumber: "QO140M200PC",
  serialNumber: "ABC123",
  installationYear: 2015,
  recallFlag: false,
  recallReason: null,
  property: {
    id: "prop1",
    addressLine1: "123 Main St",
    addressLine2: "Apt 4",
    city: "Brooklyn",
    state: "NY",
    zip: "11201",
    nickname: "Demo Brownstone",
    owner: { fullName: "Jane Owner", email: "jane@example.com", phone: "+15555550100" },
    units: [{ id: "u1", unitNumber: "4A" }],
    panels: [],
    serviceEvents: [{ id: "e1", summary: "Replaced GFCI", notes: "private notes" }],
  },
};

describe("buildPublicScanView", () => {
  it("never returns owner contact or full address line 1 for anonymous viewers", () => {
    const v = buildPublicScanView({
      shortCode: "ABCDEFGHJ0",
      status: "active",
      panel: fullPanel as never,
    });

    const blob = JSON.stringify(v);
    expect(blob).not.toContain("jane@example.com");
    expect(blob).not.toContain("+15555550100");
    expect(blob).not.toContain("123 Main St");
    expect(blob).not.toContain("private notes");
    expect(blob).not.toContain("ABC123"); // serial
  });

  it("exposes only city/state/jurisdiction-safe info plus recall flag", () => {
    const v = buildPublicScanView({
      shortCode: "ABCDEFGHJ0",
      status: "active",
      panel: { ...fullPanel, recallFlag: true, recallReason: "FPE Stab-Lok" } as never,
    });
    expect(v.status).toBe("active");
    expect(v.cityState).toBe("Brooklyn, NY");
    expect(v.panelNickname).toBe("Main panel");
    expect(v.recallFlag).toBe(true);
  });

  it("returns unassigned when sticker is not bound", () => {
    const v = buildPublicScanView({ shortCode: "Z", status: "unassigned", panel: null });
    expect(v.status).toBe("unassigned");
    expect(v.panelNickname).toBeUndefined();
  });
});
