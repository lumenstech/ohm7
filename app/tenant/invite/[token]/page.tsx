import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCurrentUser, getCurrentUser } from "@/lib/dht/auth/current-user";
import { classifyInvite } from "@/lib/dht/tenant-invites";
import { writeAudit } from "@/lib/dht/audit";

async function accept(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const user = await requireCurrentUser();
  if (user.role !== "tenant") {
    // We don't auto-promote roles. The user must sign up with role=tenant.
    redirect(`/tenant/invite/${token}?error=${encodeURIComponent("Your account is not a tenant account. Sign out and create a tenant account first.")}`);
  }
  const inv = await prisma.tenantInvite.findUnique({ where: { token } });
  if (!inv) redirect("/tenant/invite/invalid");
  const state = classifyInvite(inv);
  if (state !== "pending") {
    redirect(`/tenant/invite/${token}?status=${state}`);
  }
  // Mark invite accepted + provision the unit access. We don't rely on the
  // (propertyId, tenantUserId, unitId) unique key here because Postgres treats
  // NULLs as distinct, so a tenant could otherwise accept two "whole property"
  // invites and end up with duplicate rows. findFirst + update-or-create is
  // safer.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.unitTenantAccess.findFirst({
      where: { propertyId: inv.propertyId, tenantUserId: user.id, unitId: inv.unitId ?? null },
    });
    if (existing) {
      await tx.unitTenantAccess.update({
        where: { id: existing.id },
        data: { revokedAt: null, inviteId: inv.id },
      });
    } else {
      await tx.unitTenantAccess.create({
        data: {
          propertyId: inv.propertyId,
          tenantUserId: user.id,
          unitId: inv.unitId ?? null,
          inviteId: inv.id,
        },
      });
    }
    await tx.tenantInvite.update({
      where: { id: inv.id },
      data: { status: "accepted", acceptedAt: new Date(), acceptedByUserId: user.id },
    });
  });
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "tenant_invite.accepted",
    entityType: "TenantInvite",
    entityId: inv.id,
    metadata: { propertyId: inv.propertyId, unitId: inv.unitId ?? null },
  });
  redirect("/dashboard/tenant/service-requests");
}

export const dynamic = "force-dynamic";

export default async function TenantInvitePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { status?: string; error?: string };
}) {
  const inv = await prisma.tenantInvite.findUnique({
    where: { token: params.token },
    include: { property: true, unit: true },
  });
  if (!inv) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold">Invalid invite</h1>
        <p className="text-sm text-ink-600">This invite link isn't recognised.</p>
      </div>
    );
  }
  const state = searchParams.status ?? classifyInvite(inv);
  const user = await getCurrentUser();
  if (state !== "pending") {
    return (
      <div className="mx-auto max-w-md px-4 py-12 space-y-4">
        <h1 className="text-2xl font-semibold">Invite {state}</h1>
        <p className="text-sm text-ink-600">
          {state === "expired" && "This invite has expired. Ask the property owner to send a new one."}
          {state === "revoked" && "This invite was revoked by the property owner."}
          {state === "used" && "This invite has already been accepted."}
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-4">
      <h1 className="text-2xl font-semibold">Accept tenant access</h1>
      <p className="text-sm text-ink-600">
        You've been invited as a tenant at{" "}
        <strong>{inv.property.nickname ?? inv.property.addressLine1}</strong>
        {inv.unit ? ` (unit ${inv.unit.unitNumber ?? inv.unit.id.slice(0, 6)})` : null}.
      </p>
      {searchParams.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      {!user ? (
        <div className="space-y-2">
          <p className="text-sm">
            <Link className="text-bolt-700" href={`/login?next=${encodeURIComponent(`/tenant/invite/${params.token}`)}`}>Sign in</Link>
            {" "}or{" "}
            <Link className="text-bolt-700" href={`/signup?role=tenant&next=${encodeURIComponent(`/tenant/invite/${params.token}`)}`}>
              create a tenant account
            </Link>
            {" "}to accept this invite.
          </p>
        </div>
      ) : user.role !== "tenant" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You're signed in as a {user.role}. Sign out and create a tenant account first.
        </div>
      ) : (
        <form action={accept}>
          <input type="hidden" name="token" value={params.token} />
          <button className="btn-primary w-full" type="submit">Accept invite</button>
        </form>
      )}
    </div>
  );
}
