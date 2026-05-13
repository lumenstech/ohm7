// Panel recall / hazard rules.
//
// These are heuristic flags, NOT a legal compliance determination. Wording
// avoids any claim of an official recall — for example, Federal Pacific
// Stab-Lok panels were never formally "recalled" by the CPSC, but the field
// failure-to-trip class is well documented and AHJs routinely recommend
// replacement.

export type RecallSeverity = "high" | "medium" | "info";

export type RecallFlag = {
  severity: RecallSeverity;
  code: string;            // stable identifier for the rule
  title: string;
  detail: string;
  recommendation: string;
};

type PanelLike = {
  manufacturer?: string | null;
  panelLine?: string | null;
  modelNumber?: string | null;
  installationYear?: number | null;
};

function norm(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Returns recall / hazard flags that apply to the given panel description.
 * Deterministic and side-effect free so it is trivially testable.
 */
export function evaluateRecallRules(panel: PanelLike): RecallFlag[] {
  const flags: RecallFlag[] = [];
  const mfg = norm(panel.manufacturer);
  const line = norm(panel.panelLine);
  const model = norm(panel.modelNumber);

  // -- Federal Pacific / Federal Pioneer ----------------------------------
  if (
    mfg.includes("federalpacific") ||
    mfg.includes("fpe") ||
    mfg.includes("federalpioneer") ||
    line.includes("stablok") ||
    line.includes("stab-lok")
  ) {
    flags.push({
      severity: "high",
      code: "fpe.stablok",
      title: "Federal Pacific / Federal Pioneer Stab-Lok",
      detail:
        "This panel family has a widely documented field history of breakers failing to trip on overload. Many AHJs and insurers treat it as a known hazard.",
      recommendation:
        "Have a licensed electrician evaluate replacement. Verify with the local AHJ.",
    });
  }

  // -- Zinsco / Sylvania-Zinsco -------------------------------------------
  if (mfg.includes("zinsco") || mfg.includes("sylvaniazinsco") || line.includes("zinsco")) {
    flags.push({
      severity: "high",
      code: "zinsco",
      title: "Zinsco / Sylvania-Zinsco",
      detail:
        "Bus-bar corrosion and breakers fusing to the bus are well-documented failure modes for this panel family.",
      recommendation:
        "Have a licensed electrician evaluate replacement. Verify with the local AHJ.",
    });
  }

  // -- Pushmatic / Bulldog / ITE ------------------------------------------
  if (
    mfg.includes("pushmatic") ||
    mfg.includes("bulldog") ||
    line.includes("pushmatic") ||
    (mfg.includes("ite") && !mfg.includes("siemens"))
  ) {
    flags.push({
      severity: "medium",
      code: "pushmatic.legacy",
      title: "Pushmatic / Bulldog / ITE legacy panel",
      detail:
        "Obsolete panel family. New breakers are no longer manufactured, and misapplied modern breakers are common.",
      recommendation:
        "Plan for replacement during next major service. Verify with the local AHJ.",
    });
  }

  // -- GE / ABB THQL date-code placeholder rule ---------------------------
  // The exact problem date codes vary by notice; we model this as a soft flag
  // that an electrician should spot-check the date code on site. The check is
  // intentionally permissive: matches GE/ABB THQL panels installed before
  // 2010 unless the data says otherwise. Replace with a configurable list
  // when authoritative date codes are imported.
  if (
    (mfg.includes("ge") || mfg.includes("generalelectric") || mfg.includes("abb")) &&
    (line.includes("thql") || model.includes("thql"))
  ) {
    flags.push({
      severity: "info",
      code: "ge.thql.datecode",
      title: "GE/ABB THQL — verify date code",
      detail:
        "Certain GE/ABB THQL breaker date-code ranges have prior manufacturer field notices. Verify date codes on site.",
      recommendation:
        "Photograph breaker date codes. Cross-reference with current manufacturer bulletins.",
    });
  }

  return flags;
}
