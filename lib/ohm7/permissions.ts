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
    // MVP: tenant is attached implicitly through TenantServiceRequest. A
    // future change can model tenancy as its own row; for now the cheapest
    // signal is "tenant has at least one request at the property".
    const req = await prisma.tenantServiceRequest.findFirst({
      where: { propertyId, tenantUserId: user.id },
      select: { id: true },
    });
    return !!req;
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
