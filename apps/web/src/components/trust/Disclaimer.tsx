import { cn } from "@/lib/cn";

/**
 * Estimate / facts banner — required on predictive and builder views.
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
    ? "Records sourced verbatim from UP-RERA public data. Facts only - not a rating, ranking, or recommendation."
    : "This is an estimate from public-data models - not investment, legal, or financial advice. Verify every figure against its cited source before acting.";

  return (
    <div
      role="note"
      aria-live="polite"
      className={cn(
        "flex items-start gap-ds-2 rounded-surface p-ds-3 text-xs leading-relaxed",
        isBuilder
          ? "border border-line-contour bg-contour/10 text-text-mid"
          : "border border-brass/20 bg-brass-dim text-text-mid",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-wider",
          isBuilder ? "text-contour" : "text-brass",
        )}
      >
        {isBuilder ? "Note" : "Estimate"}
      </span>
      <span>{children ?? defaultText}</span>
    </div>
  );
}
