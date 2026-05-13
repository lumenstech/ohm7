import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const propertyFilter = isAdmin
    ? {}
    : user.role === "owner"
      ? { ownerUserId: user.id }
      : user.role === "trade"
        ? { grants: { some: { tradeUserId: user.id, status: "approved" as const } } }
        : { tenantRequests: { some: { tenantUserId: user.id } } };

  const [properties, panels, pendingClaims, pendingGrants, recentEvents] = await Promise.all([
    prisma.property.count({ where: propertyFilter }),
    prisma.panel.count({ where: { property: propertyFilter } }),
    isAdmin
      ? prisma.propertyClaim.count({ where: { verificationStatus: { in: ["sent", "stalled"] } } })
      : 0,
    prisma.accessGrant.count({
      where: {
        status: "pending",
        ...(isAdmin ? {} : { property: propertyFilter }),
      },
    }),
    prisma.serviceEvent.findMany({
      where: { property: propertyFilter },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { property: true, panel: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="Properties" value={properties} href="/dashboard/properties" />
        <Stat label="Panels" value={panels} />
        <Stat label="Pending access requests" value={pendingGrants} href="/dashboard/access-requests" />
        <Stat
          label={isAdmin ? "Pending/stalled claims" : "Pending claims (admin)"}
          value={isAdmin ? pendingClaims : "—"}
          href={isAdmin ? "/admin/manual-claims" : undefined}
        />
      </div>

      <section className="card-pad">
        <h2 className="text-lg font-semibold">Recent service events</h2>
        {recentEvents.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No events yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {recentEvents.map((e) => (
              <li key={e.id} className="py-3 flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                <div>
                  <Link href={`/dashboard/service-events/${e.id}`} className="font-medium">
                    {e.summary}
                  </Link>
                  <div className="text-xs text-ink-500">
                    {e.property.addressLine1} · {e.eventType} · {e.trade}
                  </div>
                </div>
                <div className="sm:ml-auto text-xs text-ink-500">
                  {new Date(e.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const body = (
    <div className="card-pad">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
