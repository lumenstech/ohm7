// Pricing configuration — single source of truth for the marketing site and
// any future billing. The v0.2 spec uses a single Landlord plan with volume
// tiers (no Starter/Pro overlap).

export type Tier = {
  id: string;
  label: string;
  minUnits: number;
  maxUnits: number | null;
  pricePerUnitPerMonth: number; // dollars
};

export const LANDLORD_TIERS: ReadonlyArray<Tier> = [
  { id: "tier1",  label: "1–10 units",     minUnits: 1,   maxUnits: 10,   pricePerUnitPerMonth: 9 },
  { id: "tier2",  label: "11–25 units",    minUnits: 11,  maxUnits: 25,   pricePerUnitPerMonth: 7 },
  { id: "tier3",  label: "26–100 units",   minUnits: 26,  maxUnits: 100,  pricePerUnitPerMonth: 6 },
  { id: "tier4",  label: "101–500 units",  minUnits: 101, maxUnits: 500,  pricePerUnitPerMonth: 4 },
];

export const ENTERPRISE_LABEL = "501+ units — Enterprise (custom)";

export type StickerPack = { qty: number; priceDollars: number };
export const STICKER_PACKS: ReadonlyArray<StickerPack> = [
  { qty: 25,  priceDollars: 49 },
  { qty: 100, priceDollars: 149 },
  { qty: 500, priceDollars: 599 },
];

export type LandlordEstimate = {
  units: number;
  breakdown: { tier: Tier; unitsInTier: number; subtotal: number }[];
  monthly: number;
  isEnterprise: boolean;
};

/**
 * Computes the monthly Landlord-plan cost for a given unit count using
 * cumulative volume tiers (each tier prices only the units that fall into it).
 */
export function estimateLandlordMonthly(units: number): LandlordEstimate {
  if (units <= 0) {
    return { units: 0, breakdown: [], monthly: 0, isEnterprise: false };
  }
  if (units > 500) {
    return { units, breakdown: [], monthly: 0, isEnterprise: true };
  }

  const breakdown: LandlordEstimate["breakdown"] = [];
  let remaining = units;
  let total = 0;
  for (const tier of LANDLORD_TIERS) {
    if (remaining <= 0) break;
    const cap = tier.maxUnits ?? Infinity;
    const span = cap - tier.minUnits + 1;
    const inThisTier = Math.min(span, remaining);
    if (inThisTier > 0) {
      const subtotal = inThisTier * tier.pricePerUnitPerMonth;
      total += subtotal;
      breakdown.push({ tier, unitsInTier: inThisTier, subtotal });
      remaining -= inThisTier;
    }
  }
  return { units, breakdown, monthly: total, isEnterprise: false };
}
