import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  consumePendingClaim,
  createPendingClaim,
  PENDING_CLAIM_TTL_MS,
} from "@/lib/dht/claims/pending";

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

let prisma: PrismaClient;

d("Auth0 claim flow", () => {
  beforeAll(() => {
    prisma = new PrismaClient();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.pendingClaim.deleteMany({ where: { email: { startsWith: "test-claim-" } } });
    await prisma.panelShortCode.deleteMany({ where: { shortCode: { startsWith: "TESTSC" } } });
    await prisma.property.deleteMany({ where: { addressLine1: { startsWith: "TEST-CLAIM::" } } });
    await prisma.user.deleteMany({ where: { auth0Sub: { startsWith: "auth0|test-claim-" } } });
  });

  it("createPendingClaim generates a 32+ byte token with 24h TTL", async () => {
    const before = Date.now();
    const { token, expiresAt } = await createPendingClaim({
      shortCode: "TESTSCNOOP",
      email: "test-claim-1@example.com",
      proofData: { address: "1 Test St" },
    });
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    const ttl = expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(PENDING_CLAIM_TTL_MS - 5_000);
    expect(ttl).toBeLessThanOrEqual(PENDING_CLAIM_TTL_MS + 5_000);
  });

  it("consumePendingClaim returns null on unknown token", async () => {
    const r = await consumePendingClaim("nope", "user-id");
    expect(r).toBeNull();
  });

  it("consumePendingClaim returns null on expired token", async () => {
    const { token } = await createPendingClaim({
      shortCode: "TESTSC1",
      email: "test-claim-exp@example.com",
      proofData: { address: "TEST-CLAIM::expired" },
    });
    // Manually expire.
    await prisma.pendingClaim.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const user = await prisma.user.create({
      data: {
        auth0Sub: "auth0|test-claim-1",
        email: "test-claim-exp@example.com",
        role: "owner",
      },
    });
    const r = await consumePendingClaim(token, user.id);
    expect(r).toBeNull();
  });

  it("consumePendingClaim creates Property + activates sticker on success", async () => {
    // Provision an unassigned sticker.
    const sticker = await prisma.panelShortCode.create({
      data: { shortCode: "TESTSCOK1", status: "unassigned" },
    });
    const { token } = await createPendingClaim({
      shortCode: sticker.shortCode,
      email: "test-claim-ok@example.com",
      proofData: {
        address: "TEST-CLAIM::ok",
        city: "Brooklyn",
        state: "NY",
      },
    });
    const user = await prisma.user.create({
      data: {
        auth0Sub: "auth0|test-claim-ok",
        email: "test-claim-ok@example.com",
        role: "owner",
      },
    });
    const r = await consumePendingClaim(token, user.id);
    expect(r).not.toBeNull();
    const prop = await prisma.property.findUnique({ where: { id: r!.propertyId } });
    expect(prop?.ownerUserId).toBe(user.id);
    expect(prop?.city).toBe("Brooklyn");
    const updated = await prisma.panelShortCode.findUnique({ where: { id: sticker.id } });
    expect(updated?.status).toBe("active");
    expect(updated?.propertyId).toBe(r!.propertyId);
  });

  it("re-consuming the same token returns null (idempotent)", async () => {
    const sticker = await prisma.panelShortCode.create({
      data: { shortCode: "TESTSCREP", status: "unassigned" },
    });
    const { token } = await createPendingClaim({
      shortCode: sticker.shortCode,
      email: "test-claim-2@example.com",
      proofData: { address: "TEST-CLAIM::dup" },
    });
    const user = await prisma.user.create({
      data: {
        auth0Sub: "auth0|test-claim-2",
        email: "test-claim-2@example.com",
        role: "owner",
      },
    });
    const r1 = await consumePendingClaim(token, user.id);
    const r2 = await consumePendingClaim(token, user.id);
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });

  it("consumePendingClaim refuses if the sticker is now bound elsewhere", async () => {
    const sticker = await prisma.panelShortCode.create({
      data: { shortCode: "TESTSCDUP", status: "unassigned" },
    });
    const { token } = await createPendingClaim({
      shortCode: sticker.shortCode,
      email: "test-claim-race@example.com",
      proofData: { address: "TEST-CLAIM::race" },
    });
    // Race: somebody else activates the sticker first.
    await prisma.panelShortCode.update({
      where: { id: sticker.id },
      data: { status: "active" },
    });
    const user = await prisma.user.create({
      data: {
        auth0Sub: "auth0|test-claim-race",
        email: "test-claim-race@example.com",
        role: "owner",
      },
    });
    const r = await consumePendingClaim(token, user.id);
    expect(r).toBeNull();
  });
});
