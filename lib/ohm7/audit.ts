import { prisma } from "../db";
import type { Prisma, UserRole } from "@prisma/client";

export type AuditInput = {
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.JsonObject;
};

export async function writeAudit(input: AuditInput) {
  return prisma.auditEvent.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
