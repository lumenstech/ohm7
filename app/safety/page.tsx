import { SafetyNotice } from "@/components/safety-notice";

export const metadata = { title: "Safety — ServiceFixes DHT" };

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Safety &amp; disclaimers</h1>
      <SafetyNotice />
      <div className="prose prose-ink">
        <h2>What ServiceFixes DHT is</h2>
        <p>
          A record-keeping system for properties and the electrical assets installed on them. We
          help you remember what panel is in the basement, what breaker feeds the kitchen, and what
          the last electrician did.
        </p>
        <h2>What ServiceFixes DHT is not</h2>
        <p>
          ServiceFixes DHT is not a code-compliance engine, not a replacement for an inspection, and not legal
          advice. The recall and compliance flags shown in the app are heuristics intended to start
          a conversation with a licensed professional and the local Authority Having Jurisdiction
          (AHJ).
        </p>
        <h2>Hazard flags</h2>
        <p>
          We flag panels (Federal Pacific / Federal Pioneer Stab-Lok, Zinsco, Pushmatic / Bulldog /
          ITE, and certain GE/ABB THQL date codes) that have a widely-documented field-failure
          history. The presence of one of these flags does not automatically mean the panel is
          dangerous, and the absence of a flag does not mean the panel is safe. Always defer to a
          licensed electrician.
        </p>
        <h2>NEC references</h2>
        <p>
          We reference NEC section numbers (e.g. 210.8(A), 210.12(A), 210.8(F)) but do not embed
          the verbatim code text. The applicable edition depends on the jurisdiction the property
          sits in.
        </p>
      </div>
    </div>
  );
}
