// Public-safe view of a scanned QR. Anything that leaves this function is
// considered safe to render to an anonymous visitor (no auth, no grant).

export type PublicScanView = {
  shortCode: string;
  status: "unassigned" | "active" | "replaced" | "retired";
  cityState?: string;          // "Brooklyn, NY" — never full street
  panelNickname?: string;      // e.g. "Main panel"
  recallFlag: boolean;
  recallSummary?: string;      // short, generic — never personal info
  jurisdictionName?: string;
  hasRecord: boolean;
};

type Input = {
  shortCode: string;
  status: PublicScanView["status"];
  panel: {
    id: string;
    nickname: string | null;
    recallFlag: boolean;
    recallReason: string | null;
    property: {
      city: string | null;
      state: string | null;
      jurisdiction?: { name: string } | null;
    };
  } | null;
};

export function buildPublicScanView(input: Input): PublicScanView {
  if (!input.panel) {
    return {
      shortCode: input.shortCode,
      status: input.status,
      recallFlag: false,
      hasRecord: false,
    };
  }
  const p = input.panel;
  const cityState =
    p.property.city && p.property.state
      ? `${p.property.city}, ${p.property.state}`
      : p.property.city || p.property.state || undefined;

  return {
    shortCode: input.shortCode,
    status: input.status,
    cityState,
    panelNickname: p.nickname ?? undefined,
    recallFlag: p.recallFlag,
    recallSummary: p.recallFlag ? p.recallReason ?? "Review recommended." : undefined,
    jurisdictionName: p.property.jurisdiction?.name,
    hasRecord: true,
  };
}
