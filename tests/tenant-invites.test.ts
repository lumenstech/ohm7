import { describe, expect, it } from "vitest";
import {
  classifyInvite,
  DEFAULT_INVITE_TTL_MS,
  generateInviteToken,
} from "@/lib/dht/tenant-invites";

describe("generateInviteToken", () => {
  it("is URL-safe", () => {
    for (let i = 0; i < 50; i++) {
      const t = generateInviteToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(t.length).toBeGreaterThanOrEqual(32);
    }
  });

  it("does not collide across many calls", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(generateInviteToken());
    expect(set.size).toBe(1000);
  });
});

describe("classifyInvite", () => {
  const futureExpiry = new Date(Date.now() + DEFAULT_INVITE_TTL_MS);
  const pastExpiry = new Date(Date.now() - 1000);

  it("returns pending for fresh invites", () => {
    expect(
      classifyInvite({ status: "pending", expiresAt: futureExpiry, acceptedAt: null }),
    ).toBe("pending");
  });

  it("returns expired when past expiresAt even if status is pending", () => {
    expect(
      classifyInvite({ status: "pending", expiresAt: pastExpiry, acceptedAt: null }),
    ).toBe("expired");
  });

  it("returns revoked for revoked invites regardless of other fields", () => {
    expect(
      classifyInvite({ status: "revoked", expiresAt: futureExpiry, acceptedAt: null }),
    ).toBe("revoked");
  });

  it("returns used for accepted invites", () => {
    expect(
      classifyInvite({
        status: "accepted",
        expiresAt: futureExpiry,
        acceptedAt: new Date(),
      }),
    ).toBe("used");
  });

  it("returns used when acceptedAt is set even if status field lags", () => {
    expect(
      classifyInvite({
        status: "pending",
        expiresAt: futureExpiry,
        acceptedAt: new Date(),
      }),
    ).toBe("used");
  });
});
