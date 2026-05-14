import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dht/auth/current-user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const isAdmin = user.role === "admin";
  const isTenant = user.role === "tenant";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link className="btn-secondary" href="/dashboard">Overview</Link>
        {!isTenant && <Link className="btn-secondary" href="/dashboard/properties">Properties</Link>}
        {!isTenant && <Link className="btn-secondary" href="/dashboard/access-requests">Access requests</Link>}
        {!isTenant && <Link className="btn-secondary" href="/dashboard/service-events/new">+ Service event</Link>}
        {isTenant && <Link className="btn-secondary" href="/dashboard/tenant/service-requests">My requests</Link>}
        {isTenant && (
          <Link className="btn-secondary" href="/dashboard/tenant/service-requests/new">+ Submit request</Link>
        )}
        {isAdmin && <Link className="btn-secondary" href="/admin/manual-claims">Admin: manual claims</Link>}
        <div className="ml-auto self-center text-xs text-ink-500">
          Signed in as <strong>{user.email}</strong> ({user.role})
        </div>
      </nav>
      {children}
    </div>
  );
}
