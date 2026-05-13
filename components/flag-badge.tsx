import { cn } from "@/lib/cn";

type Severity = "high" | "medium" | "info" | "violation" | "warning";

export function FlagBadge({ severity, children }: { severity: Severity; children: React.ReactNode }) {
  const cls =
    severity === "high" || severity === "violation"
      ? "badge-danger"
      : severity === "warning" || severity === "medium"
        ? "badge-warn"
        : "badge-info";
  return <span className={cn(cls)}>{children}</span>;
}
