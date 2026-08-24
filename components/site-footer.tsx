import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <span>© {new Date().getFullYear()} Lumens Technology LLC · ohm7</span>
            <Link href="/network" className="font-medium text-ink-600 hover:text-ink-900">
              Explore the project network →
            </Link>
          </div>
          <span className="max-w-2xl sm:text-right">
            Heuristic safety overlay — not legal advice. Always verify with your AHJ and a licensed
            professional.
          </span>
        </div>
      </div>
    </footer>
  );
}
