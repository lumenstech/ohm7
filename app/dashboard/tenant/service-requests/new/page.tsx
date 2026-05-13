import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { createTenantRequestSchema } from "@/lib/ohm7/zod-schemas";
import { writeAudit } from "@/lib/ohm7/audit";

async function action(formData: FormData) {
  "use server";
  const user = await requireRole(["tenant"]);
  const parsed = createTenantRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/dashboard/tenant/service-requests/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid")}`);
  }
  const d = parsed.data;
  // For the MVP, a tenant may target any known property by ID. A future
  // change can constrain this to a property the tenant is invited into.
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

export default async function NewTenantRequestPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireRole(["tenant"]);
  // Tenants haven't been formally invited in the MVP; offer a free-text
  // propertyId field so a landlord can hand it over. The dashboard listing
  // already filters to the tenant's own requests.
  const properties = await prisma.property.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Submit a service request</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="propertyId">Property</label>
          <select id="propertyId" name="propertyId" className="select" required>
            <option value="">— select —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.nickname ?? p.addressLine1}</option>
            ))}
          </select>
        </div>
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
    </div>
  );
}
