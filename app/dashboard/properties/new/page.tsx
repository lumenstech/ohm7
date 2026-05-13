import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { createPropertySchema } from "@/lib/ohm7/zod-schemas";
import { writeAudit } from "@/lib/ohm7/audit";

async function action(formData: FormData) {
  "use server";
  const user = await requireRole(["owner", "admin"]);
  const parsed = createPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/dashboard/properties/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid")}`);
  }
  const d = parsed.data;
  const property = await prisma.property.create({
    data: {
      addressLine1: d.addressLine1,
      addressLine2: d.addressLine2 || null,
      city: d.city || null,
      state: d.state || null,
      zip: d.zip || null,
      jurisdictionId: d.jurisdictionId || null,
      propertyType: d.propertyType,
      unitCount: d.unitCount,
      nickname: d.nickname || null,
      ownerUserId: user.role === "admin" ? null : user.id,
    },
  });
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "property.created",
    entityType: "Property",
    entityId: property.id,
    metadata: { addressLine1: d.addressLine1 },
  });
  redirect(`/dashboard/properties/${property.id}`);
}

export default async function NewPropertyPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireRole(["owner", "admin"]);
  const jurisdictions = await prisma.jurisdiction.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Add a property</h1>
      {searchParams.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={action} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="nickname">Nickname (optional)</label>
          <input id="nickname" name="nickname" className="input" placeholder="Brownstone, etc." />
        </div>
        <div>
          <label className="label" htmlFor="addressLine1">Address line 1</label>
          <input id="addressLine1" name="addressLine1" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="addressLine2">Address line 2</label>
          <input id="addressLine2" name="addressLine2" className="input" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="state">State</label>
            <input id="state" name="state" className="input" maxLength={2} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="zip">ZIP</label>
            <input id="zip" name="zip" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="unitCount">Unit count</label>
            <input id="unitCount" name="unitCount" type="number" min={1} defaultValue={1} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="propertyType">Property type</label>
          <select id="propertyType" name="propertyType" className="select" defaultValue="single_family">
            <option value="single_family">Single family</option>
            <option value="multi_family">Multi-family</option>
            <option value="commercial">Commercial</option>
            <option value="mixed_use">Mixed use</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="jurisdictionId">Jurisdiction</label>
          <select id="jurisdictionId" name="jurisdictionId" className="select">
            <option value="">(unknown — set later)</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name} ({j.necEdition ?? "NEC?"})
              </option>
            ))}
          </select>
          <p className="help">Jurisdiction drives which NEC edition the compliance overlay enforces.</p>
        </div>
        <button className="btn-primary" type="submit">Create property</button>
      </form>
    </div>
  );
}
