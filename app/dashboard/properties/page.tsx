import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const user = await requireUser();
  const where =
    user.role === "admin"
      ? {}
      : user.role === "owner"
        ? { ownerUserId: user.id }
        : user.role === "trade"
          ? { grants: { some: { tradeUserId: user.id, status: "approved" as const } } }
          : { id: "__no__" };

  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { panels: true, units: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        {user.role !== "trade" && (
          <Link href="/dashboard/properties/new" className="btn-primary">+ Add property</Link>
        )}
      </div>
      {properties.length === 0 ? (
        <p className="text-sm text-ink-500">No properties yet.</p>
      ) : (
        <div className="grid gap-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/properties/${p.id}`}
              className="card-pad flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{p.nickname ?? p.addressLine1}</div>
                <div className="text-xs text-ink-500">
                  {[p.addressLine1, p.city, p.state, p.zip].filter(Boolean).join(", ")}
                </div>
              </div>
              <div className="text-sm text-ink-600">
                {p._count.panels} panels · {p._count.units} units
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
