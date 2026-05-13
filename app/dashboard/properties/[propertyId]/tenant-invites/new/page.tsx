import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageProperty } from "@/lib/ohm7/permissions";
import { writeAudit } from "@/lib/ohm7/audit";
import {
  DEFAULT_INVITE_TTL_MS,
  generateInviteToken,
} from "@/lib/ohm7/tenant-invites";
import { createTenantInviteSchema } from "@/lib/ohm7/zod-schemas";

async function action(formData: FormData) {
  "use server";
  const user = await requireUser();
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!(await canManageProperty(user, propertyId))) {
    redirect(`/dashboard/properties/${propertyId}/tenant-invites?error=${encodeURIComponent("Not allowed")}`);
  }
  const parsed = createTenantInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/dashboard/properties/${propertyId}/tenant-invites/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid")}`,
    );
  }
  const d = parsed.data;
  if (d.unitId) {
    // Ensure the unit belongs to this property.
    const unit = await prisma.unit.findUnique({ where: { id: d.unitId } });
    if (!unit || unit.propertyId !== propertyId) {
      redirect(`/dashboard/properties/${propertyId}/tenant-invites/new?error=${encodeURIComponent("Unit does not belong to this property")}`);
    }
  }
  const inv = await prisma.tenantInvite.create({
    data: {
      propertyId,
      unitId: d.unitId || null,
      createdByUserId: user.id,
      token: generateInviteToken(),
      inviteEmail: d.inviteEmail || null,
      inviteName: d.inviteName || null,
      expiresAt: new Date(Date.now() + DEFAULT_INVITE_TTL_MS),
    },
  });
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "tenant_invite.created",
    entityType: "TenantInvite",
    entityId: inv.id,
    metadata: { propertyId, unitId: d.unitId ?? null },
  });
  redirect(`/dashboard/properties/${propertyId}/tenant-invites`);
}

export default async function NewTenantInvitePage({
  params,
  searchParams,
}: {
  params: { propertyId: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  if (!(await canManageProperty(user, params.propertyId))) notFound();
  const units = await prisma.unit.findMany({
    where: { propertyId: params.propertyId },
    orderBy: { unitNumber: "asc" },
  });
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">New tenant invite</h1>
      <p className="mt-1 text-sm text-ink-500">
        Generates a single-use, expiring link. Send it to the tenant out-of-band; only that link
        will grant them access to this property.
      </p>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="propertyId" value={params.propertyId} />
        <div>
          <label className="label" htmlFor="inviteName">Tenant name (optional)</label>
          <input id="inviteName" name="inviteName" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="inviteEmail">Tenant email (optional)</label>
          <input id="inviteEmail" name="inviteEmail" type="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="unitId">Unit</label>
          <select id="unitId" name="unitId" className="select" defaultValue="">
            <option value="">Whole property</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unitNumber ?? u.id.slice(0, 6)}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" type="submit">Create invite</button>
      </form>
    </div>
  );
}
