# ohm7 — compliance overlay

This document describes how ohm7's heuristic overlay works and what it
**deliberately does not do.**

## Not a legal compliance engine

The overlay is informational. It:

- references NEC section numbers (e.g. 210.8(A), 210.12(A), 210.8(F)) but
  does not embed verbatim NEC text;
- always emits a `recommendation` such as "verify with the AHJ";
- treats every flag as a starting point for a conversation with a licensed
  professional, not as an authoritative finding.

The corresponding UI surfaces in `app/dashboard/panels/[panelId]/page.tsx`
and `app/safety/page.tsx` carry the same disclaimer in plain English.

## Rule classes

### Panel recall flags (`lib/ohm7/recall-rules.ts`)

| Rule code              | Severity | Pattern                                       |
|------------------------|----------|-----------------------------------------------|
| `fpe.stablok`          | high     | Federal Pacific / FPE / Federal Pioneer / Stab-Lok |
| `zinsco`               | high     | Zinsco / Sylvania-Zinsco                      |
| `pushmatic.legacy`     | medium   | Pushmatic / Bulldog / ITE (non-Siemens)       |
| `ge.thql.datecode`     | info     | GE/ABB THQL — instructs site verification of date codes |

The matcher normalises manufacturer / line strings (lowercase + strip
non-alphanumerics) so values like "Federal Pacific Electric", "FPE", and
"federal-pioneer" all resolve to the same rule. Date-code rules for GE/ABB
THQL are scaffolded as a soft flag; replace with a configurable list once
authoritative date codes are imported.

### Circuit compliance overlay (`lib/ohm7/compliance-rules.ts`)

| Rule code                       | Severity | Trigger |
|---------------------------------|----------|---------|
| `protection.unknown`            | info     | `protectionType` is null |
| `gfci.area.missing`             | warning  | Bath / garage / kitchen / outdoor / etc. without GFCI-class protection |
| `afci.area.missing`             | warning  | Bedroom / family room / hall / etc. without AFCI-class protection |
| `gfci.outdoor.hvac`             | warning  | Outdoor HVAC circuit on a 2020+ NEC jurisdiction without GFCI |
| `gfci.outdoor.hvac.nuisance`    | info     | Outdoor HVAC circuit *with* GFCI (nuisance-trip watch) |
| `gfci.outdoor.hvac.pre2020`     | info     | Outdoor HVAC circuit on a pre-2020 jurisdiction (verify edition) |
| `jurisdiction.unknown`          | info     | Panel-level — no jurisdiction is set on the property |

`dual_function` protection counts as both AFCI and GFCI; `dfci` counts as
both; `cafci` counts as AFCI; `gfci` counts as GFCI only.

The 210.8(F) rule explicitly carries the nuisance-trip pre-warning the v0.2
spec calls out: many older AC condensers nuisance-trip GFCI on startup, and
many AHJs grant relief or the install pre-dates adoption.

## How to extend

The rule files are pure, deterministic functions that take a circuit or panel
description and a (jurisdiction, NEC edition) hint and return an array of
`Flag` objects. They are exercised by `tests/recall-rules.test.ts` and
`tests/compliance-rules.test.ts`. Add new rules by appending to those files
with a stable `code` and at least one positive + one negative test case.
