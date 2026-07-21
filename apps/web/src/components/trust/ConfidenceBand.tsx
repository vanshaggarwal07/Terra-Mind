/**
 * Confidence band — NEVER renders a bare point number.
 * Design system §5, §13: predictions ship as bands, not points.
 * Screen readers get the full text via aria-label.
 */
export function confidenceLabel(confidence: number): "Low" | "Medium" | "High" {
  if (confidence < 0.34) return "Low";
  if (confidence < 0.67) return "Medium";
  return "High";
}

const BAND_COLOR: Record<string, string> = {
  Low:    "from-clay/60 to-clay",
  Medium: "from-brass/60 to-brass",
  High:   "from-moss/60 to-moss",
};

export function ConfidenceBand({
  confidence,
  value,
  low,
  mid,
  high,
  min = 0,
  max = 100,
  unit = "",
}: {
  confidence: number;
  value?: number;
  /** Explicit band bounds — preferred over auto-computed from value */
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const c = Math.max(0, Math.min(1, confidence));
  const label = confidenceLabel(c);
  const pct = Math.round(c * 100);

  // Determine display range
  let range: string | null = null;
  if (low !== undefined && low !== null && high !== undefined && high !== null) {
    range = `${fmt(low, unit)} – ${fmt(high, unit)}`;
  } else if (value !== undefined) {
    const halfWidth = (max - min) * 0.25 * (1 - c);
    const lo = Math.max(min, value - halfWidth);
    const hi = Math.min(max, value + halfWidth);
    range = `${lo.toFixed(0)}–${hi.toFixed(0)}${unit}`;
  }

  const ariaLabel = range
    ? `Estimated range ${range}, ${label} confidence ${pct}%`
    : `${label} confidence ${pct}%`;

  return (
    <div
      className="flex flex-col gap-2"
      role="group"
      aria-label={ariaLabel}
    >
      {range && (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-brass-light tabular">
            {range}
          </span>
          {mid !== undefined && mid !== null && (
            <span className="font-mono text-sm text-text-low tabular">
              mid {fmt(mid, unit)}
            </span>
          )}
          <span className="text-xs text-text-low">estimated range</span>
        </div>
      )}
      <div
        className="h-1.5 rounded-full bg-ink-3 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${BAND_COLOR[label]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-text-low font-mono">
        {label} confidence · {pct}%
      </div>
    </div>
  );
}

function fmt(n: number, unit: string): string {
  const rounded = Math.abs(n) >= 1_000
    ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : n.toFixed(2);
  return unit ? `${rounded} ${unit}` : rounded;
}
