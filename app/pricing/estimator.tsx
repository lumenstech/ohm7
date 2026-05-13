"use client";

import { useMemo, useState } from "react";
import { estimateLandlordMonthly } from "@/lib/ohm7/pricing";

export function PricingEstimator() {
  const [units, setUnits] = useState(25);
  const est = useMemo(() => estimateLandlordMonthly(units), [units]);

  return (
    <div className="mt-3 rounded-lg border border-ink-200 p-4">
      <label className="label" htmlFor="units">Units under management</label>
      <input
        id="units"
        type="number"
        min={0}
        max={1000}
        value={units}
        onChange={(e) => setUnits(parseInt(e.target.value || "0", 10))}
        className="input max-w-xs"
      />
      <div className="mt-4">
        {est.isEnterprise ? (
          <div className="text-ink-700">Talk to us about enterprise pricing.</div>
        ) : (
          <>
            <div className="text-3xl font-semibold">${est.monthly.toLocaleString()}/mo</div>
            <table className="mt-3 w-full max-w-md text-sm">
              <tbody>
                {est.breakdown.map((b) => (
                  <tr key={b.tier.id} className="border-t border-ink-100">
                    <td className="py-1.5 text-ink-600">{b.unitsInTier} × {b.tier.label}</td>
                    <td className="py-1.5 text-right">${b.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
