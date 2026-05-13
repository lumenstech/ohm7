/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateShortCode } from "../lib/short-code";

const prisma = new PrismaClient();

async function main() {
  const ny = await prisma.jurisdiction.upsert({
    where: { id: "seed-ny-state" },
    update: {},
    create: {
      id: "seed-ny-state",
      name: "New York State",
      level: "state",
      necEdition: "2020",
      necAdoptedDate: new Date("2023-01-01"),
    },
  });

  await prisma.jurisdiction.upsert({
    where: { id: "seed-nyc" },
    update: {},
    create: {
      id: "seed-nyc",
      name: "City of New York",
      level: "municipal",
      parentId: ny.id,
      necEdition: "2020",
      amendments: { note: "NYC Electrical Code references 2020 NEC with amendments." },
    },
  });

  await prisma.jurisdiction.upsert({
    where: { id: "seed-nassau" },
    update: {},
    create: {
      id: "seed-nassau",
      name: "Nassau County",
      level: "county",
      parentId: ny.id,
      necEdition: "2020",
    },
  });

  const ownerEmail = "owner@example.com";
  const ownerPass = await bcrypt.hash("password123", 10);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash: ownerPass,
      fullName: "Demo Owner",
      role: "owner",
      phone: "+15555550100",
    },
  });

  const adminPass = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: adminPass,
      fullName: "Demo Admin",
      role: "admin",
    },
  });

  // A pre-printed unassigned sticker the seed user can scan.
  const unassigned = await prisma.panelShortCode.upsert({
    where: { shortCode: "DEMO000001" },
    update: {},
    create: {
      shortCode: "DEMO000001",
      status: "unassigned",
      locationLabel: "Pre-printed demo sticker",
    },
  });

  // An already-active demo property + panel + active sticker.
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

  // Seed an FPE-branded panel to demo the recall flag.
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

  // A handful of pre-printed unassigned stickers to play with.
  for (let i = 0; i < 5; i++) {
    const code = generateShortCode();
    await prisma.panelShortCode.create({
      data: { shortCode: code, status: "unassigned" },
    });
  }

  console.log("Seed complete. Demo logins: owner@example.com / admin@example.com (pw: password123)");
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
