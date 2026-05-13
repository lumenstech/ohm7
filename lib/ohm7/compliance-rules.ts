// Circuit / panel compliance overlay.
//
// IMPORTANT: This is a heuristic overlay, NOT a legal compliance engine.
// We do not embed verbatim NEC text. References are by section number only.
// Every output asks the user to verify with the AHJ / licensed professional.

export type ComplianceSeverity = "violation" | "warning" | "info";

export type ComplianceFlag = {
  severity: ComplianceSeverity;
  code: string;            // stable rule id
  title: string;
  detail: string;
  reference?: string;      // e.g. "NEC 210.8(F) (2020+)"
  recommendation: string;
};

export type ProtectionType =
  | "standard"
  | "afci"
  | "gfci"
  | "dfci"
  | "cafci"
  | "dual_function";

export type CircuitLike = {
  label?: string | null;
  areaServed?: string | null;
  loadType?: string | null;
  protectionType?: ProtectionType | null;
};

export type JurisdictionLike = {
  necEdition?: string | null; // "2017" | "2020" | "2023"
};

const HAS_GFCI: ReadonlySet<ProtectionType> = new Set([
  "gfci",
  "dfci",
  "dual_function",
]);

const HAS_AFCI: ReadonlySet<ProtectionType> = new Set([
  "afci",
  "cafci",
  "dfci",
  "dual_function",
]);

function tokens(c: CircuitLike): string {
  return [c.label, c.areaServed, c.loadType].filter(Boolean).join(" ").toLowerCase();
}

function isAtLeast2020(j?: JurisdictionLike | null): boolean {
  const ed = j?.necEdition;
  if (!ed) return false;
  const n = parseInt(ed, 10);
  return Number.isFinite(n) && n >= 2020;
}

/**
 * Evaluates the simplified compliance overlay for a single circuit.
 * Outputs are flagged for human verification — never treat as authoritative.
 */
export function evaluateCircuit(
  circuit: CircuitLike,
  jurisdiction?: JurisdictionLike | null,
): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  const t = tokens(circuit);
  const protection = circuit.protectionType ?? null;

  // -- Missing protection data --------------------------------------------
  if (!protection) {
    flags.push({
      severity: "info",
      code: "protection.unknown",
      title: "Protection type unknown",
      detail: "AFCI / GFCI / dual-function status has not been recorded for this circuit.",
      recommendation: "Photograph the breaker and record protection type so the overlay can verify it.",
    });
  }

  // -- GFCI areas (NEC 210.8(A)) ------------------------------------------
  const gfciAreaHit =
    /(bath|garage|outdoor|exterior|crawl\s*space|basement|kitchen|laundry|dishwasher|wet\s*bar|boathouse|pool|spa)/.test(
      t,
    );
  if (gfciAreaHit && protection && !HAS_GFCI.has(protection)) {
    flags.push({
      severity: "warning",
      code: "gfci.area.missing",
      title: "GFCI expected for this area",
      detail: "Branch circuit appears to serve a location where GFCI protection is generally required.",
      reference: "NEC 210.8(A)",
      recommendation: "Verify with the AHJ that GFCI protection is provided at the receptacle or breaker.",
    });
  }

  // -- AFCI areas (NEC 210.12(A)) -----------------------------------------
  const afciAreaHit =
    /(bedroom|family\s*room|living\s*room|hall|hallway|closet|dining|den|sunroom|laundry)/.test(t);
  if (afciAreaHit && protection && !HAS_AFCI.has(protection)) {
    flags.push({
      severity: "warning",
      code: "afci.area.missing",
      title: "AFCI expected for this area",
      detail: "Branch circuit appears to serve a dwelling-unit area where AFCI is generally required.",
      reference: "NEC 210.12(A)",
      recommendation: "Verify with the AHJ that AFCI protection is provided.",
    });
  }

  // -- Outdoor HVAC / disconnect (NEC 210.8(F) 2020+) ---------------------
  const isOutdoorHvac =
    /(condenser|hvac|ac\s*disconnect|outdoor\s*unit|heat\s*pump)/.test(t);
  if (isOutdoorHvac) {
    if (isAtLeast2020(jurisdiction)) {
      if (protection && !HAS_GFCI.has(protection)) {
        flags.push({
          severity: "warning",
          code: "gfci.outdoor.hvac",
          title: "Outdoor HVAC outlet — GFCI review",
          detail:
            "Outdoor outlets including HVAC condenser disconnects generally require GFCI under recent NEC editions. Older condenser units commonly nuisance-trip GFCI on startup — many AHJs grant relief or the install pre-dates adoption.",
          reference: "NEC 210.8(F) (2020+)",
          recommendation:
            "Confirm the GFCI requirement with the AHJ and the condenser manufacturer. Document any relief granted.",
        });
      } else if (HAS_GFCI.has(protection ?? "standard")) {
        flags.push({
          severity: "info",
          code: "gfci.outdoor.hvac.nuisance",
          title: "Outdoor HVAC on GFCI — nuisance-trip watch",
          detail:
            "Older HVAC condensers are known to nuisance-trip GFCI breakers on startup. Note any service calls or trip history.",
          reference: "NEC 210.8(F) (2020+)",
          recommendation: "Log nuisance trips; consider manufacturer firmware or replacement contactor as applicable.",
        });
      }
    } else {
      flags.push({
        severity: "info",
        code: "gfci.outdoor.hvac.pre2020",
        title: "Outdoor HVAC outlet — jurisdiction pre-2020 NEC",
        detail:
          "NEC 210.8(F) outdoor GFCI was added in the 2020 cycle. Verify which edition this jurisdiction enforces.",
        reference: "NEC 210.8(F)",
        recommendation: "Confirm with the AHJ which edition is enforced and apply the appropriate rule.",
      });
    }
  }

  return flags;
}

/**
 * Evaluates the overlay for an entire panel. Combines per-circuit flags and
 * appends panel-level notes.
 */
export function evaluatePanel(
  circuits: CircuitLike[],
  jurisdiction?: JurisdictionLike | null,
): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  for (const c of circuits) flags.push(...evaluateCircuit(c, jurisdiction));
  if (!jurisdiction?.necEdition) {
    flags.push({
      severity: "info",
      code: "jurisdiction.unknown",
      title: "Jurisdiction / NEC edition not set",
      detail: "Without a jurisdiction record we can't pick the right NEC edition for this property.",
      recommendation: "Set the property's jurisdiction so the overlay applies the correct edition.",
    });
  }
  return flags;
}
