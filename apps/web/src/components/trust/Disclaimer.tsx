import { cn } from "@/lib/cn";

/**
 * "Estimate — not investment advice" banner.
 * Design system §5, §13: required on EVERY predictive or builder content view.
 * Two variants:
 *  - "prediction" (default) — amber tone, estimate framing
 *  - "builder"             — cyan tone, facts-only framing
 */
export function Disclaimer({
  variant = "prediction",
  children,
  className,
}: {
  variant?: "prediction" | "builder";
  children?: React.ReactNode;
  className?: string;
}) {
  const isBuilder = variant === "builder";

  const defaultText = isBuilder
    ? "Records sourced verbatim from UP-RERA public data. Facts only — not a rating, ranking, or recommendation."
    : "This is an estimate from public-data models — not investment, legal, or financial advice. Verify every figure against its cited source before acting.";

  return (
    <div
      role="note"
      aria-live="polite"
      className={cn(
        "flex gap-2 items-start p-3 rounded-card text-xs leading-relaxed",
        isBuilder
          ? "bg-cyan/[0.08] border border-cyan/20 text-text-mid"
          : "bg-brass/[0.08] border border-brass/20 text-text-mid",
        className,
      )}
    >
      <span aria-hidden="true" className="shrink-0 mt-0.5">
        {isBuilder ? "ℹ" : "⚠"}
      </span>
      <span>{children ?? defaultText}</span>
    </div>
  );
}
