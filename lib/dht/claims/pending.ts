import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const PENDING_CLAIM_TTL_MS = 24 * 60 * 60 * 1000;

export function generatePendingClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createPendingClaim(input: {
  shortCode: string;
  email: string;
  proofData: Record<string, unknown>;
}): Promise<{ token: string; id: string; expiresAt: Date }> {
  const token = generatePendingClaimToken();
  const expiresAt = new Date(Date.now() + PENDING_CLAIM_TTL_MS);
  const row = await prisma.pendingClaim.create({
    data: {
      token,
      shortCode: input.shortCode,
      email: input.email,
      proofData: input.proofData as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
  });
  return { token, id: row.id, expiresAt };
}

/**
 * Consumes a pending claim into a real Property + sticker activation. Idempotent
 * on a re-run only in the "row already consumed" sense — returns null.
 */
export async function consumePendingClaim(
  token: string,
  userId: string,
): Promise<{ propertyId: string } | null> {
  const claim = await prisma.pendingClaim.findUnique({ where: { token } });
  if (!claim || claim.consumedAt) return null;
  if (claim.expiresAt < new Date()) return null;

  const sticker = await prisma.panelShortCode.findUnique({
    where: { shortCode: claim.shortCode },
  });
  if (!sticker) return null;
  if (sticker.status === "active") {
    // Sticker already bound — refuse silently. The owner can request access.
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const proof = claim.proofData as {
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      unitNumber?: string | null;
    };
    const property = await tx.property.create({
      data: {
        addressLine1: proof.address ?? "",
        city: proof.city ?? null,
        state: proof.state ?? null,
        zip: proof.zip ?? null,
        ownerUserId: userId,
      },
    });
    await tx.panelShortCode.update({
      where: { id: sticker.id },
      data: {
        propertyId: property.id,
        status: "active",
        activatedAt: new Date(),
        activatedByUserId: userId,
      },
    });
    await tx.pendingClaim.update({
      where: { id: claim.id },
      data: { consumedAt: new Date() },
    });
    return { propertyId: property.id };
  });
}

export async function findPendingClaimByToken(token: string) {
  return prisma.pendingClaim.findUnique({ where: { token } });
}
