import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * 32-byte URL-safe token. ≈190 bits of entropy, non-sequential, no homoglyph
 * concerns — used in invite acceptance URLs.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export const DEFAULT_INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Pure function: classifies an invite row without mutating it. Centralised so
 * the dashboard and the accept route agree on the rules:
 *
 *   - revoked  → token can never be accepted again
 *   - used     → already accepted by some tenant
 *   - expired  → past expiresAt
 *   - pending  → ready to accept
 */
export type InviteState = "pending" | "expired" | "revoked" | "used";

export function classifyInvite(invite: {
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: Date;
  acceptedAt: Date | null;
}): InviteState {
  if (invite.status === "revoked") return "revoked";
  if (invite.status === "accepted" || invite.acceptedAt) return "used";
  if (invite.status === "expired" || invite.expiresAt.getTime() < Date.now()) return "expired";
  return "pending";
}

/**
 * Returns true if the tenant user has at least one non-revoked UnitTenantAccess
 * row for the given property. This is the *only* way a tenant can submit a
 * service request for that property.
 */
export async function tenantHasAccess(
  tenantUserId: string,
  propertyId: string,
  unitId?: string | null,
): Promise<boolean> {
  const where: Prisma.UnitTenantAccessWhereInput = {
    tenantUserId,
    propertyId,
    revokedAt: null,
  };
  if (unitId) where.unitId = unitId;
  const row = await prisma.unitTenantAccess.findFirst({ where, select: { id: true } });
  return !!row;
}

/**
 * Lists property IDs the tenant has accepted access for. Used to populate
 * dropdowns and dashboard listings.
 */
export async function listTenantPropertyIds(tenantUserId: string): Promise<string[]> {
  const rows = await prisma.unitTenantAccess.findMany({
    where: { tenantUserId, revokedAt: null },
    select: { propertyId: true },
  });
  return Array.from(new Set(rows.map((r) => r.propertyId)));
}
