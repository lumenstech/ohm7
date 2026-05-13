export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-500">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Lumens Technology LLC · ohm7</span>
          <span>
            Heuristic safety overlay — not legal advice. Always verify with your AHJ and a licensed
            professional.
          </span>
        </div>
      </div>
    </footer>
  );
}
