import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/dht/auth/current-user";
import { createTenantRequestSchema } from "@/lib/dht/zod-schemas";
import { writeAudit } from "@/lib/dht/audit";
import { tenantHasAccess } from "@/lib/dht/tenant-invites";

async function action(formData: FormData) {
  "use server";
  const user = await requireRole(["tenant"]);
  const parsed = createTenantRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/dashboard/tenant/service-requests/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid")}`);
  }
  const d = parsed.data;

  // Hard rule: a tenant can only submit a request for a property+unit they
  // have an active (non-revoked) UnitTenantAccess row for. This is the
  // boundary that the v0.2 "tenant cannot self-assign" rule enforces.
  if (!(await tenantHasAccess(user.id, d.propertyId, d.unitId || null))) {
    redirect(`/dashboard/tenant/service-requests/new?error=${encodeURIComponent("You don't have access to that property. Use the invite link you received from the owner.")}`);
  }

  const r = await prisma.tenantServiceRequest.create({
    data: {
      propertyId: d.propertyId,
      unitId: d.unitId || null,
      tenantUserId: user.id,
      category: d.category,
      summary: d.summary,
      details: d.details || null,
    },
  });
  await writeAudit({
    actorUserId: user.id, actorRole: user.role,
    action: "tenant_request.created", entityType: "TenantServiceRequest", entityId: r.id,
    metadata: { propertyId: d.propertyId, category: d.category },
  });
  redirect("/dashboard/tenant/service-requests");
}

export const dynamic = "force-dynamic";

export default async function NewTenantRequestPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireRole(["tenant"]);

  // Only show properties+units the tenant has actually been invited to.
  const accesses = await prisma.unitTenantAccess.findMany({
    where: { tenantUserId: user.id, revokedAt: null },
    include: { property: true, unit: true },
  });

  if (accesses.length === 0) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Submit a service request</h1>
        <div className="card-pad text-sm">
          You don't have access to any property yet. Ask your landlord to send you an invite link,
          then open it while signed in.
        </div>
        <p className="text-xs text-ink-500">
          The invite link looks like <code className="font-mono">{(process.env.APP_URL ?? "http://localhost:3000")}/tenant/invite/…</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Submit a service request</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="propertyId">Property / unit</label>
          <select id="propertyId" name="propertyId" className="select" required>
            <option value="">— select —</option>
            {accesses.map((a) => (
              <option
                key={a.id}
                value={a.propertyId}
                data-unit-id={a.unitId ?? ""}
              >
                {(a.property.nickname ?? a.property.addressLine1) +
                  (a.unit ? ` — unit ${a.unit.unitNumber ?? a.unit.id.slice(0, 6)}` : "")}
              </option>
            ))}
          </select>
          <p className="help">
            You can only file requests for properties an owner has invited you to.
          </p>
        </div>
        {/* unitId is implied by the selected access row. Keep a hidden field
            for any access that's unit-scoped (the owner sees both). */}
        <UnitIdShadow accesses={accesses.map((a) => ({ propertyId: a.propertyId, unitId: a.unitId ?? "" }))} />
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" name="category" className="select" defaultValue="electrical">
            <option value="electrical">Electrical</option>
            <option value="plumbing">Plumbing</option>
            <option value="hvac">HVAC</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="summary">Short summary</label>
          <input id="summary" name="summary" required className="input" maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="details">Details</label>
          <textarea id="details" name="details" rows={4} className="textarea" />
        </div>
        <button className="btn-primary" type="submit">Submit</button>
      </form>
      <p className="mt-6 text-xs text-ink-500">
        Need access for another property? Ask the owner for an invite or visit{" "}
        <Link className="text-bolt-700" href="/for-tenants">our tenant guide</Link>.
      </p>
    </div>
  );
}

function UnitIdShadow({ accesses }: { accesses: { propertyId: string; unitId: string }[] }) {
  // Server-rendered: emit a single hidden unitId that defaults to empty.
  // (Future enhancement: a small client component that mirrors propertyId
  // selection. For the MVP, the access check on submit treats undefined unit
  // as "whole property" which already matches the invite scope.)
  return <input type="hidden" name="unitId" value="" data-shadow={JSON.stringify(accesses)} />;
}
