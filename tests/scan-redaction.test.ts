import { describe, expect, it } from "vitest";
import { buildPublicScanView } from "@/lib/dht/scan-view";

// Construct a maximally-leaky input including data that should NEVER appear
// in the public view. The shape of the function's Input type already excludes
// most of these (TypeScript wouldn't accept them on a strict input), but we
// pass them through `as never` so a future refactor that widens the type
// without thinking would fail the test immediately.
const leakyPanel = {
  id: "p1",
  nickname: "Main panel",
  recallFlag: false,
  recallReason: null,
  // Fields that must NEVER leak:
  manufacturer: "Square D",
  modelNumber: "QO140M200PC",
  serialNumber: "SERIAL_SECRET_42",
  installationYear: 2015,
  conditionNotes: "private notes that should not leak",
  locationDescription: "basement, north wall — owner thinks ghosts live here",
  property: {
    id: "prop1",
    addressLine1: "123 Main St",
    addressLine2: "Apt 4",
    city: "Brooklyn",
    state: "NY",
    zip: "11201",
    parcelId: "PARCEL_PRIVATE_999",
    nickname: "Demo Brownstone",
    owner: {
      id: "owner_id_leaky",
      fullName: "Jane Owner",
      email: "jane@example.com",
      phone: "+15555550100",
    },
    units: [
      { id: "u1", unitNumber: "4A", bedrooms: 2, bathrooms: 1 },
    ],
    serviceEvents: [
      { id: "e1", summary: "Replaced GFCI", notes: "very private service notes" },
    ],
    grants: [
      { id: "g1", requesterName: "Mickey Trade", requesterPhone: "+19999990000" },
    ],
    tenantRequests: [
      { id: "tr1", summary: "Toilet broken", tenantUser: { email: "tenant@example.com" } },
    ],
    jurisdiction: { name: "City of New York" },
  },
};

describe("buildPublicScanView — redaction", () => {
  it("never includes owner email / phone / full name", () => {
    const v = buildPublicScanView({ shortCode: "X", status: "active", panel: leakyPanel as never });
    const blob = JSON.stringify(v);
    expect(blob).not.toContain("jane@example.com");
    expect(blob).not.toContain("+15555550100");
    expect(blob).not.toContain("Jane Owner");
  });

  it("never includes the full street address (line 1)", () => {
    const v = buildPublicScanView({ shortCode: "X", status: "active", panel: leakyPanel as never });
    expect(JSON.stringify(v)).not.toContain("123 Main St");
    expect(JSON.stringify(v)).not.toContain("Apt 4");
    expect(JSON.stringify(v)).not.toContain("11201"); // ZIP
    expect(JSON.stringify(v)).not.toContain("PARCEL_PRIVATE_999");
  });

  it("never includes panel manufacturer / model / serial / install year / notes", () => {
    const v = buildPublicScanView({ shortCode: "X", status: "active", panel: leakyPanel as never });
    const blob = JSON.stringify(v);
    expect(blob).not.toContain("SERIAL_SECRET_42");
    expect(blob).not.toContain("QO140M200PC");
    expect(blob).not.toContain("Square D");
    expect(blob).not.toContain("ghosts");
    expect(blob).not.toContain("private notes");
    expect(blob).not.toContain("2015");
  });

  it("never includes tenant info / service notes / access-grant data", () => {
    const v = buildPublicScanView({ shortCode: "X", status: "active", panel: leakyPanel as never });
    const blob = JSON.stringify(v);
    expect(blob).not.toContain("Toilet broken");
    expect(blob).not.toContain("tenant@example.com");
    expect(blob).not.toContain("very private service notes");
    expect(blob).not.toContain("Mickey Trade");
    expect(blob).not.toContain("+19999990000");
  });

  it("never includes unit occupancy details", () => {
    const v = buildPublicScanView({ shortCode: "X", status: "active", panel: leakyPanel as never });
    const blob = JSON.stringify(v);
    expect(blob).not.toContain("4A");
    expect(blob).not.toContain("bedrooms");
    expect(blob).not.toContain("bathrooms");
  });

  it("exposes only the public-safe fields + recall flag", () => {
    const v = buildPublicScanView({
      shortCode: "ABCDEFGHJ0",
      status: "active",
      panel: { ...leakyPanel, recallFlag: true, recallReason: "FPE Stab-Lok" } as never,
    });
    expect(v.status).toBe("active");
    expect(v.cityState).toBe("Brooklyn, NY");
    expect(v.panelNickname).toBe("Main panel");
    expect(v.jurisdictionName).toBe("City of New York");
    expect(v.recallFlag).toBe(true);
    expect(v.recallSummary).toBe("FPE Stab-Lok");
    // No other top-level keys.
    expect(new Set(Object.keys(v))).toEqual(
      new Set([
        "shortCode",
        "status",
        "cityState",
        "panelNickname",
        "recallFlag",
        "recallSummary",
        "jurisdictionName",
        "hasRecord",
      ]),
    );
  });

  it("returns unassigned when sticker is not bound", () => {
    const v = buildPublicScanView({ shortCode: "Z", status: "unassigned", panel: null });
    expect(v.status).toBe("unassigned");
    expect(v.hasRecord).toBe(false);
    expect(v.panelNickname).toBeUndefined();
    expect(v.cityState).toBeUndefined();
    expect(v.jurisdictionName).toBeUndefined();
  });
});
