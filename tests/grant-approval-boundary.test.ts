import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient, type User } from "@prisma/client";
import { canAccessProperty, canManageProperty } from "@/lib/ohm7/permissions";

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

let prisma: PrismaClient;

d("access grant approval boundary", () => {
  beforeAll(() => { prisma = new PrismaClient(); });
  afterAll(async () => { await prisma.$disconnect(); });
  beforeEach(async () => {
    await prisma.accessGrant.deleteMany({ where: { requesterName: { startsWith: "TEST::" } } });
    await prisma.property.deleteMany({ where: { addressLine1: { startsWith: "TEST-GRANT::" } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: "test-grant-" } } });
  });

  async function makeUsers() {
    const owner = await prisma.user.create({
      data: { email: `test-grant-${Date.now()}-o@example.com`, passwordHash: "x", role: "owner" },
    });
    const otherOwner = await prisma.user.create({
      data: { email: `test-grant-${Date.now()}-o2@example.com`, passwordHash: "x", role: "owner" },
    });
    const trade = await prisma.user.create({
      data: { email: `test-grant-${Date.now()}-t@example.com`, passwordHash: "x", role: "trade" },
    });
    const tenant = await prisma.user.create({
      data: { email: `test-grant-${Date.now()}-te@example.com`, passwordHash: "x", role: "tenant" },
    });
    const admin = await prisma.user.create({
      data: { email: `test-grant-${Date.now()}-a@example.com`, passwordHash: "x", role: "admin" },
    });
    const property = await prisma.property.create({
      data: { addressLine1: `TEST-GRANT::${Date.now()}`, ownerUserId: owner.id },
    });
    const grant = await prisma.accessGrant.create({
      data: {
        propertyId: property.id,
        tradeUserId: trade.id,
        requesterName: "TEST::Acme",
        reason: "demo",
        status: "pending",
        createdVia: "scan",
      },
    });
    return { owner, otherOwner, trade, tenant, admin, property, grant };
  }

  it("trade cannot manage (approve) their own access request", async () => {
    const { trade, property } = await makeUsers();
    expect(await canManageProperty(trade, property.id)).toBe(false);
  });

  it("tenant cannot manage a grant", async () => {
    const { tenant, property } = await makeUsers();
    expect(await canManageProperty(tenant, property.id)).toBe(false);
  });

  it("unrelated owner cannot manage another owner's grant", async () => {
    const { otherOwner, property } = await makeUsers();
    expect(await canManageProperty(otherOwner, property.id)).toBe(false);
  });

  it("owner of the property and admin can manage", async () => {
    const { owner, admin, property } = await makeUsers();
    expect(await canManageProperty(owner, property.id)).toBe(true);
    expect(await canManageProperty(admin, property.id)).toBe(true);
  });

  it("pending grant does not grant access (no read until approved)", async () => {
    const { trade, property } = await makeUsers();
    expect(await canAccessProperty(trade, property.id)).toBe(false);
  });

  it("denied grant blocks reads", async () => {
    const { trade, property, grant } = await makeUsers();
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { status: "denied", deniedAt: new Date() },
    });
    expect(await canAccessProperty(trade, property.id)).toBe(false);
  });

  it("approved grant allows reads", async () => {
    const { trade, property, grant } = await makeUsers();
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { status: "approved", approvedAt: new Date() },
    });
    expect(await canAccessProperty(trade, property.id)).toBe(true);
  });

  it("revoked grant blocks reads even after being approved", async () => {
    const { trade, property, grant } = await makeUsers();
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { status: "revoked", approvedAt: new Date(), revokedAt: new Date() },
    });
    expect(await canAccessProperty(trade, property.id)).toBe(false);
  });

  it("expired grant blocks reads", async () => {
    const { trade, property, grant } = await makeUsers();
    await prisma.accessGrant.update({
      where: { id: grant.id },
      data: { status: "approved", approvedAt: new Date(), expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await canAccessProperty(trade, property.id)).toBe(false);
  });
});
