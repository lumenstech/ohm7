import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccessRequestsPage() {
  const user = await requireUser();
  const where =
    user.role === "admin"
      ? {}
      : user.role === "owner"
        ? { property: { ownerUserId: user.id } }
        : { tradeUserId: user.id };

  const grants = await prisma.accessGrant.findMany({
    where,
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });

  const groups: Record<string, typeof grants> = {
    pending: [],
    approved: [],
    denied: [],
    revoked: [],
    expired: [],
  };
  for (const g of grants) groups[g.status].push(g);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Access requests</h1>
      {(["pending", "approved", "denied", "revoked", "expired"] as const).map((status) => (
        <section key={status} className="card-pad">
          <h2 className="text-lg font-semibold capitalize">{status} ({groups[status].length})</h2>
          {groups[status].length === 0 ? (
            <p className="text-sm text-ink-500 mt-2">None.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {groups[status].map((g) => (
                <li key={g.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link href={`/dashboard/access-requests/${g.id}`} className="font-medium">
                      {g.requesterName}
                    </Link>
                    <div className="text-xs text-ink-500">
                      {g.property.addressLine1} · via {g.createdVia} · {new Date(g.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="badge-muted text-xs">{g.scope}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
