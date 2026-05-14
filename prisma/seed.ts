/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { generateShortCode } from "../lib/short-code";
import { seedJurisdictions } from "./seed-jurisdictions";

const prisma = new PrismaClient();

// Seed Auth0 sub claim format: "auth0|<random>" — matches what Auth0 returns
// for its database connection. We pick deterministic strings here so re-runs
// are idempotent. These are dev fixtures — DO NOT run against production.
const DEV_OWNER_SUB = "auth0|dev-owner-seed";
const DEV_ADMIN_SUB = "auth0|dev-admin-seed";

async function main() {
  await seedJurisdictions(prisma);
  const ny = await prisma.jurisdiction.findUnique({ where: { id: "seed-jur-ny" } });
  if (!ny) throw new Error("Jurisdiction seed did not produce NY");

  const owner = await prisma.user.upsert({
    where: { auth0Sub: DEV_OWNER_SUB },
    update: {},
    create: {
      auth0Sub: DEV_OWNER_SUB,
      email: "owner@example.com",
      fullName: "Demo Owner",
      role: "owner",
      phone: "+15555550100",
    },
  });

  await prisma.user.upsert({
    where: { auth0Sub: DEV_ADMIN_SUB },
    update: {},
    create: {
      auth0Sub: DEV_ADMIN_SUB,
      email: "admin@example.com",
      fullName: "Demo Admin",
      role: "admin",
    },
  });

  await prisma.panelShortCode.upsert({
    where: { shortCode: "DEMO000001" },
    update: {},
    create: {
      shortCode: "DEMO000001",
      status: "unassigned",
      locationLabel: "Pre-printed demo sticker",
    },
  });

  const property = await prisma.property.upsert({
    where: { id: "seed-property-1" },
    update: {},
    create: {
      id: "seed-property-1",
      addressLine1: "123 Main St",
      city: "Brooklyn",
      state: "NY",
      zip: "11201",
      jurisdictionId: ny.id,
      ownerUserId: owner.id,
      nickname: "Demo Brownstone",
    },
  });

  const panel = await prisma.panel.upsert({
    where: { id: "seed-panel-1" },
    update: {},
    create: {
      id: "seed-panel-1",
      propertyId: property.id,
      nickname: "Main panel",
      locationDescription: "Basement, north wall",
      manufacturer: "Square D",
      panelLine: "QO",
      modelNumber: "QO140M200PC",
      busRatingAmps: 200,
      mainBreakerAmps: 200,
      voltage: "120/240",
      phase: "split_phase",
      numSpaces: 40,
      installationYear: 2015,
      stickerPlacement: "deadfront",
    },
  });

  await prisma.panelShortCode.upsert({
    where: { shortCode: "DEMOACTIVE" },
    update: {},
    create: {
      shortCode: "DEMOACTIVE",
      status: "active",
      panelId: panel.id,
      propertyId: property.id,
      locationLabel: "Inside main panel deadfront",
      activatedAt: new Date(),
    },
  });

  const fpeProperty = await prisma.property.upsert({
    where: { id: "seed-property-fpe" },
    update: {},
    create: {
      id: "seed-property-fpe",
      addressLine1: "9 Old Birch Rd",
      city: "Mineola",
      state: "NY",
      zip: "11501",
      jurisdictionId: ny.id,
      ownerUserId: owner.id,
      nickname: "Hazard demo",
    },
  });

  await prisma.panel.upsert({
    where: { id: "seed-panel-fpe" },
    update: {},
    create: {
      id: "seed-panel-fpe",
      propertyId: fpeProperty.id,
      nickname: "Original panel",
      manufacturer: "Federal Pacific",
      panelLine: "Stab-Lok",
      busRatingAmps: 100,
      voltage: "120/240",
      phase: "split_phase",
      installationYear: 1972,
      recallFlag: true,
      recallReason: "Federal Pacific Stab-Lok — documented failure-to-trip class.",
    },
  });

  for (let i = 0; i < 5; i++) {
    const code = generateShortCode();
    await prisma.panelShortCode.create({
      data: { shortCode: code, status: "unassigned" },
    });
  }

  console.log("Seed complete. Demo logins (Auth0 dev fixtures):");
  console.log(`  - owner@example.com (auth0Sub=${DEV_OWNER_SUB})`);
  console.log(`  - admin@example.com (auth0Sub=${DEV_ADMIN_SUB})`);
  console.log("Demo codes: /p/DEMO000001 (unassigned), /p/DEMOACTIVE (active)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
