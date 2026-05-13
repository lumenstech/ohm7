import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-b from-bolt-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-3xl">
            <span className="badge-info badge mb-4">Property digital twin · MVP</span>
            <h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Electrical panel records, access approvals, and service history{" "}
              <span className="text-bolt-700">tied to the property</span> — not the contractor.
            </h1>
            <p className="mt-5 text-lg text-ink-600">
              Scan a sticker on the panel deadfront. The next trade picks up where the last one
              left off. Owners approve every grant by WhatsApp. Records travel with the building.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary">Register a property</Link>
              <Link href="/p/DEMOACTIVE" className="btn-secondary">Scan a panel (demo)</Link>
              <Link href="/login" className="btn-secondary">Trade sign-in</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            title="Property-bound records"
            body="One permanent record per address. Trades come and go; the panel directory and service history stay."
          />
          <Feature
            title="Owner-approved access"
            body="No trade can claim or join a property without an explicit WhatsApp/SMS approval from the verified owner."
          />
          <Feature
            title="Panel directory + circuits"
            body="A clean breaker schedule, exportable label sheets, AFCI/GFCI coverage notes, recall flags for FPE, Zinsco, Pushmatic and more."
          />
          <Feature
            title="Service history"
            body="Every job referenced to the panel, circuit, and NEC section it touched. Searchable per property or per landlord portfolio."
          />
          <Feature
            title="Compliance overlay"
            body="Heuristic flags for missing AFCI/GFCI, outdoor 210.8(F) review, and known panel hazards — always with an 'verify with AHJ' disclaimer."
          />
          <Feature
            title="Built on what works"
            body="Re-uses our existing auth, Postgres, WhatsApp approval, and message-provider stack. No new vendors."
          />
        </div>
      </section>

      <section className="bg-white border-y border-ink-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How a scan works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <Step n={1} title="Scan">
              A trade scans the QR sticker on the panel deadfront and lands on the public scan
              page. We show address city/state and any recall flag — nothing private.
            </Step>
            <Step n={2} title="Request">
              The trade taps "Request access" and provides their name, company, and reason.
              The request is sent to the owner — no auto-claim, ever.
            </Step>
            <Step n={3} title="Approve">
              The owner taps Approve in WhatsApp or SMS. The trade now sees the full panel
              directory, circuits, and service history, and can post a new service event in
              under 30 seconds.
            </Step>
          </ol>
        </div>
      </section>
    </>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-pad">
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm text-ink-600">{body}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="card-pad">
      <div className="text-bolt-700 font-semibold">Step {n}</div>
      <div className="mt-1 text-lg font-semibold text-ink-900">{title}</div>
      <p className="mt-2 text-sm text-ink-600">{children}</p>
    </li>
  );
}
