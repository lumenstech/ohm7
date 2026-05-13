import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TenantRequestsListPage() {
  const user = await requireRole(["tenant"]);
  const requests = await prisma.tenantServiceRequest.findMany({
    where: { tenantUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: true },
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My service requests</h1>
        <Link href="/dashboard/tenant/service-requests/new" className="btn-primary">+ New request</Link>
      </div>
      {requests.length === 0 ? (
        <p className="text-sm text-ink-500">No requests yet.</p>
      ) : (
        <ul className="card divide-y divide-ink-100">
          {requests.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.summary}</div>
                  <div className="text-xs text-ink-500">
                    {r.property.addressLine1} · {r.category} · {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className="badge-muted">{r.status}</span>
              </div>
              {r.details && <p className="mt-2 text-sm whitespace-pre-wrap">{r.details}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-500">
        Tenants can submit requests for their unit but cannot grant trade access — only the property
        owner can do that.
      </p>
    </div>
  );
}
