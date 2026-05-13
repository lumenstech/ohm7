import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight">ohm7</span>
        </Link>
        <nav className="hidden gap-6 text-sm text-ink-600 md:flex">
          <Link href="/for-landlords" className="hover:text-ink-900">Landlords</Link>
          <Link href="/for-trades" className="hover:text-ink-900">Trades</Link>
          <Link href="/for-tenants" className="hover:text-ink-900">Tenants</Link>
          <Link href="/safety" className="hover:text-ink-900">Safety</Link>
          <Link href="/pricing" className="hover:text-ink-900">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
              <form action="/api/auth/logout" method="post">
                <button className="btn-secondary" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">Sign in</Link>
              <Link href="/signup" className="btn-primary">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        fill="currentColor"
        className="text-bolt-600"
      />
    </svg>
  );
}
