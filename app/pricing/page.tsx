import Link from "next/link";
import { LANDLORD_TIERS, STICKER_PACKS } from "@/lib/dht/pricing";
import { PricingEstimator } from "./estimator";

export const metadata = { title: "Pricing — ServiceFixes DHT" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-3 text-ink-600">
        One Landlord plan. Volume tiers — not a stack of overlapping Starter/Pro plans. Compliance
        dashboard, bulk scheduling, and API access are included at every tier.
      </p>

      <section className="mt-10 card-pad">
        <h2 className="text-xl font-semibold">Landlord plan — by unit count</h2>
        <p className="mt-1 text-sm text-ink-500">Each tier prices only the units that fall inside it (cumulative).</p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {LANDLORD_TIERS.map((t) => (
            <div key={t.id} className="rounded-lg border border-ink-200 p-4">
              <div className="font-medium">{t.label}</div>
              <div className="mt-1 text-2xl font-semibold">
                ${t.pricePerUnitPerMonth}
                <span className="text-sm font-normal text-ink-500"> /unit/mo</span>
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-dashed border-ink-300 p-4">
            <div className="font-medium">501+ units</div>
            <div className="mt-1 text-lg font-semibold text-ink-700">Enterprise (custom)</div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-medium">Estimate your monthly cost</h3>
          <PricingEstimator />
        </div>
      </section>

      <section className="mt-8 card-pad">
        <h2 className="text-xl font-semibold">Trade plans</h2>
        <ul className="mt-3 text-sm text-ink-700 list-disc pl-5 space-y-1">
          <li>Bundled with InvoiceChats Pro / Teams — included.</li>
          <li>Standalone trade — $49 / mo + $0.25 per activated sticker.</li>
        </ul>
      </section>

      <section className="mt-8 card-pad">
        <h2 className="text-xl font-semibold">Sticker packs</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {STICKER_PACKS.map((p) => (
            <div key={p.qty} className="rounded-lg border border-ink-200 p-4">
              <div className="text-sm text-ink-500">{p.qty} stickers</div>
              <div className="text-xl font-semibold">${p.priceDollars}</div>
            </div>
          ))}
        </div>
        <p className="help mt-3">Billing is not wired in the MVP — these are the published prices.</p>
      </section>

      <div className="mt-10">
        <Link href="/auth/login?screen_hint=signup" className="btn-primary">Get started</Link>
      </div>
    </div>
  );
}
