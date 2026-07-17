/**
 * Confidence-first rendering (blueprint §5, §13).
 *
 * NEVER renders a bare point number. When given a `value`, it renders a RANGE
 * whose width grows as confidence falls, plus a qualitative label. When given no
 * value, it renders just the confidence bar + qualifier.
 */
export function confidenceLabel(confidence: number): "Low" | "Medium" | "High" {
  if (confidence < 0.34) return "Low";
  if (confidence < 0.67) return "Medium";
  return "High";
}

export function ConfidenceBand({
  confidence,
  value,
  min = 0,
  max = 100,
  unit = "",
}: {
  confidence: number;
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const c = Math.max(0, Math.min(1, confidence));
  const label = confidenceLabel(c);

  let range: string | null = null;
  if (value !== undefined) {
    // Lower confidence -> wider band (up to ±25% of the full scale).
    const halfWidth = (max - min) * 0.25 * (1 - c);
    const lo = Math.max(min, value - halfWidth);
    const hi = Math.min(max, value + halfWidth);
    range = `${lo.toFixed(0)}–${hi.toFixed(0)}${unit}`;
  }

  return (
    <div className="confidence">
      {range ? (
        <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
          {range}
          <span
            className="muted"
            style={{ fontSize: "0.8rem", fontWeight: 400, marginLeft: 8 }}
          >
            estimated range
          </span>
        </div>
      ) : null}
      <div className="confidence__bar">
        <div className="confidence__fill" style={{ width: `${c * 100}%` }} />
      </div>
      <div className="confidence__meta">
        {label} confidence ({Math.round(c * 100)}%)
      </div>
    </div>
  );
}
