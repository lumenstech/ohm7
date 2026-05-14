import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dht/auth/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/dashboard");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex gap-3 text-sm">
        <Link className="btn-secondary" href="/dashboard">Dashboard</Link>
        <Link className="btn-secondary" href="/admin/manual-claims">Manual claims</Link>
        <div className="ml-auto self-center text-xs text-ink-500">Admin · {user.email}</div>
      </nav>
      {children}
    </div>
  );
}
