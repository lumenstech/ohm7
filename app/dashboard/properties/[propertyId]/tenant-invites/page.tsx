import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageProperty } from "@/lib/ohm7/permissions";
import { writeAudit } from "@/lib/ohm7/audit";
import { classifyInvite } from "@/lib/ohm7/tenant-invites";

async function revokeInvite(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("inviteId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!(await canManageProperty(user, propertyId))) {
    redirect(`/dashboard/properties/${propertyId}/tenant-invites?error=${encodeURIComponent("Not allowed")}`);
  }
  const inv = await prisma.tenantInvite.findUnique({ where: { id } });
  if (!inv || inv.propertyId !== propertyId) notFound();
  if (inv.status === "accepted") {
    redirect(`/dashboard/properties/${propertyId}/tenant-invites?error=${encodeURIComponent("Already accepted — revoke unit access instead")}`);
  }
  await prisma.tenantInvite.update({
    where: { id },
    data: { status: "revoked", revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "tenant_invite.revoked",
    entityType: "TenantInvite",
    entityId: id,
    metadata: { propertyId },
  });
  redirect(`/dashboard/properties/${propertyId}/tenant-invites`);
}

async function revokeAccess(formData: FormData) {
  "use server";
  const user = await requireUser();
  const id = String(formData.get("accessId") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!(await canManageProperty(user, propertyId))) {
    redirect(`/dashboard/properties/${propertyId}/tenant-invites?error=${encodeURIComponent("Not allowed")}`);
  }
  await prisma.unitTenantAccess.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "tenant_access.revoked",
    entityType: "UnitTenantAccess",
    entityId: id,
    metadata: { propertyId },
  });
  redirect(`/dashboard/properties/${propertyId}/tenant-invites`);
}

export const dynamic = "force-dynamic";

export default async function TenantInvitesListPage({
  params,
  searchParams,
}: {
  params: { propertyId: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  if (!(await canManageProperty(user, params.propertyId))) notFound();
  const property = await prisma.property.findUnique({
    where: { id: params.propertyId },
    include: {
      invites: { orderBy: { createdAt: "desc" }, include: { unit: true, acceptedBy: true } },
      tenantAccess: { where: { revokedAt: null }, include: { tenantUser: true, unit: true } },
    },
  });
  if (!property) notFound();

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/properties/${params.propertyId}`} className="text-sm text-bolt-700">
        ← {property.nickname ?? property.addressLine1}
      </Link>
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tenant invites</h1>
          <p className="text-sm text-ink-500">
            Tenants must be invited by the owner. They can't pick a property on their own.
          </p>
        </div>
        <Link href={`/dashboard/properties/${params.propertyId}/tenant-invites/new`} className="btn-primary">
          + New invite
        </Link>
      </header>
      {searchParams.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <section className="card-pad">
        <h2 className="text-lg font-semibold">Active tenants</h2>
        {property.tenantAccess.length === 0 ? (
          <p className="text-sm text-ink-500 mt-2">No active tenants yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {property.tenantAccess.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.tenantUser.fullName ?? a.tenantUser.email}</div>
                  <div className="text-xs text-ink-500">
                    {a.unit ? `Unit ${a.unit.unitNumber ?? a.unit.id.slice(0, 6)}` : "Whole property"}
                  </div>
                </div>
                <form action={revokeAccess}>
                  <input type="hidden" name="accessId" value={a.id} />
                  <input type="hidden" name="propertyId" value={params.propertyId} />
                  <button type="submit" className="btn-secondary text-xs">Revoke</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-pad">
        <h2 className="text-lg font-semibold">Invites</h2>
        {property.invites.length === 0 ? (
          <p className="text-sm text-ink-500 mt-2">No invites yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {property.invites.map((inv) => {
              const state = classifyInvite(inv);
              return (
                <li key={inv.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{inv.inviteName ?? inv.inviteEmail ?? "Tenant"}</div>
                    <div className="text-xs text-ink-500 truncate">
                      {inv.unit ? `Unit ${inv.unit.unitNumber ?? inv.unit.id.slice(0, 6)}` : "Whole property"}{" "}
                      · expires {inv.expiresAt.toLocaleDateString()}
                    </div>
                    {state === "pending" && (
                      <div className="mt-1 text-xs">
                        Link:{" "}
                        <code className="font-mono break-all">
                          {(process.env.APP_URL ?? "http://localhost:3000") + "/tenant/invite/" + inv.token}
                        </code>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        state === "pending" ? "badge-info" :
                        state === "used" ? "badge-ok" :
                        state === "revoked" ? "badge-danger" :
                        "badge-muted"
                      }
                    >
                      {state}
                    </span>
                    {state === "pending" && (
                      <form action={revokeInvite}>
                        <input type="hidden" name="inviteId" value={inv.id} />
                        <input type="hidden" name="propertyId" value={params.propertyId} />
                        <button className="btn-secondary text-xs" type="submit">Revoke</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
