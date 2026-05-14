import { prisma } from "../db";
import type { User } from "@prisma/client";

export type Capability =
  | "property.read"
  | "property.write"
  | "panel.read"
  | "panel.write"
  | "circuit.write"
  | "service_event.write"
  | "grant.manage"
  | "claim.override"
  | "tenant.request.write";

const ROLE_BASE: Record<string, ReadonlySet<Capability>> = {
  owner: new Set<Capability>([
    "property.read",
    "property.write",
    "panel.read",
    "panel.write",
    "circuit.write",
    "service_event.write",
    "grant.manage",
  ]),
  admin: new Set<Capability>([
    "property.read",
    "property.write",
    "panel.read",
    "panel.write",
    "circuit.write",
    "service_event.write",
    "grant.manage",
    "claim.override",
  ]),
  trade: new Set<Capability>(["property.read", "panel.read"]),
  tenant: new Set<Capability>(["tenant.request.write"]),
};

/**
 * Returns true when the role's static capability set permits the action.
 * Granular per-property scoping is layered on top (see {@link canAccessProperty}).
 */
export function roleCan(user: Pick<User, "role">, capability: Capability): boolean {
  return ROLE_BASE[user.role]?.has(capability) ?? false;
}

/**
 * Decides whether a user can read a specific property.
 *
 * - owner of the property → yes
 * - admin → yes
 * - trade with an approved (non-expired, non-revoked) AccessGrant → yes
 * - tenant attached to a unit at the property → yes (read of own unit)
 * - everyone else → no
 */
export async function canAccessProperty(
  user: Pick<User, "id" | "role"> | null,
  propertyId: string,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "admin") return true;
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerUserId: true },
  });
  if (!property) return false;
  if (property.ownerUserId === user.id) return true;

  if (user.role === "trade") {
    const grant = await prisma.accessGrant.findFirst({
      where: {
        propertyId,
        tradeUserId: user.id,
        status: "approved",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    return !!grant;
  }

  if (user.role === "tenant") {
    // A tenant has read access ONLY when an owner-created TenantInvite has
    // been accepted and the resulting UnitTenantAccess is not revoked. We
    // no longer infer tenancy from arbitrary TenantServiceRequest rows —
    // that was a self-service trust hole.
    const access = await prisma.unitTenantAccess.findFirst({
      where: { propertyId, tenantUserId: user.id, revokedAt: null },
      select: { id: true },
    });
    return !!access;
  }

  return false;
}

/**
 * True for owner of the property or admin. Used for property-level admin
 * actions like adding panels and managing grants.
 */
export async function canManageProperty(
  user: Pick<User, "id" | "role"> | null,
  propertyId: string,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "owner") return false;
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerUserId: true },
  });
  return property?.ownerUserId === user.id;
}

/**
 * True when the user can record service events / circuit data on this
 * property. Owners and admins always can; trades can if they have an active
 * approved grant. Tenants can never.
 */
export async function canRecordOnProperty(
  user: Pick<User, "id" | "role"> | null,
  propertyId: string,
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "tenant") return false;
  if (await canManageProperty(user, propertyId)) return true;
  if (user.role === "trade") {
    const grant = await prisma.accessGrant.findFirst({
      where: {
        propertyId,
        tradeUserId: user.id,
        status: "approved",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    return !!grant;
  }
  return false;
}
