// Integration-style test: spins against the local Postgres referenced by
// DATABASE_URL. Skipped when DATABASE_URL is unset.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { tenantHasAccess } from "@/lib/ohm7/tenant-invites";
import { canAccessProperty } from "@/lib/ohm7/permissions";

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

let prisma: PrismaClient;

d("tenant access boundary", () => {
  beforeAll(() => {
    prisma = new PrismaClient();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    // Clean test data between cases. Keep this scoped narrow.
    await prisma.tenantServiceRequest.deleteMany({ where: { summary: { startsWith: "TEST::" } } });
    await prisma.unitTenantAccess.deleteMany({ where: { tenantUser: { email: { startsWith: "test-tenant-" } } } });
    await prisma.tenantInvite.deleteMany({ where: { inviteName: { startsWith: "TEST::" } } });
    await prisma.property.deleteMany({ where: { addressLine1: { startsWith: "TEST::" } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: "test-tenant-" } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: "test-owner-" } } });
  });

  it("tenant cannot read a property without an accepted invite", async () => {
    const owner = await prisma.user.create({
      data: { email: `test-owner-${Date.now()}@example.com`, passwordHash: "x", role: "owner" },
    });
    const tenant = await prisma.user.create({
      data: { email: `test-tenant-${Date.now()}@example.com`, passwordHash: "x", role: "tenant" },
    });
    const property = await prisma.property.create({
      data: { addressLine1: "TEST::no-invite", ownerUserId: owner.id },
    });
    expect(await tenantHasAccess(tenant.id, property.id)).toBe(false);
    expect(await canAccessProperty({ id: tenant.id, role: "tenant" }, property.id)).toBe(false);
  });

  it("tenant with accepted UnitTenantAccess can read the property", async () => {
    const owner = await prisma.user.create({
      data: { email: `test-owner-${Date.now()}-a@example.com`, passwordHash: "x", role: "owner" },
    });
    const tenant = await prisma.user.create({
      data: { email: `test-tenant-${Date.now()}-a@example.com`, passwordHash: "x", role: "tenant" },
    });
    const property = await prisma.property.create({
      data: { addressLine1: "TEST::with-invite", ownerUserId: owner.id },
    });
    await prisma.unitTenantAccess.create({
      data: { propertyId: property.id, tenantUserId: tenant.id },
    });
    expect(await tenantHasAccess(tenant.id, property.id)).toBe(true);
    expect(await canAccessProperty({ id: tenant.id, role: "tenant" }, property.id)).toBe(true);
  });

  it("revoked tenant access blocks reads", async () => {
    const owner = await prisma.user.create({
      data: { email: `test-owner-${Date.now()}-r@example.com`, passwordHash: "x", role: "owner" },
    });
    const tenant = await prisma.user.create({
      data: { email: `test-tenant-${Date.now()}-r@example.com`, passwordHash: "x", role: "tenant" },
    });
    const property = await prisma.property.create({
      data: { addressLine1: "TEST::revoked", ownerUserId: owner.id },
    });
    await prisma.unitTenantAccess.create({
      data: { propertyId: property.id, tenantUserId: tenant.id, revokedAt: new Date() },
    });
    expect(await tenantHasAccess(tenant.id, property.id)).toBe(false);
    expect(await canAccessProperty({ id: tenant.id, role: "tenant" }, property.id)).toBe(false);
  });

  it("trade with revoked grant cannot read the property", async () => {
    const owner = await prisma.user.create({
      data: { email: `test-owner-${Date.now()}-t@example.com`, passwordHash: "x", role: "owner" },
    });
    const trade = await prisma.user.create({
      data: { email: `test-tenant-${Date.now()}-trade@example.com`, passwordHash: "x", role: "trade" },
    });
    const property = await prisma.property.create({
      data: { addressLine1: "TEST::trade", ownerUserId: owner.id },
    });
    await prisma.accessGrant.create({
      data: {
        propertyId: property.id,
        tradeUserId: trade.id,
        requesterName: "Acme",
        reason: "demo",
        status: "revoked",
        createdVia: "scan",
      },
    });
    expect(await canAccessProperty({ id: trade.id, role: "trade" }, property.id)).toBe(false);
  });

  it("trade with approved grant CAN read; only owner is the property owner", async () => {
    const owner = await prisma.user.create({
      data: { email: `test-owner-${Date.now()}-ok@example.com`, passwordHash: "x", role: "owner" },
    });
    const trade = await prisma.user.create({
      data: { email: `test-tenant-${Date.now()}-ok@example.com`, passwordHash: "x", role: "trade" },
    });
    const property = await prisma.property.create({
      data: { addressLine1: "TEST::trade-ok", ownerUserId: owner.id },
    });
    await prisma.accessGrant.create({
      data: {
        propertyId: property.id,
        tradeUserId: trade.id,
        requesterName: "Acme",
        reason: "demo",
        status: "approved",
        approvedAt: new Date(),
        createdVia: "scan",
      },
    });
    expect(await canAccessProperty({ id: trade.id, role: "trade" }, property.id)).toBe(true);
    expect(await canAccessProperty({ id: owner.id, role: "owner" }, property.id)).toBe(true);
  });
});
