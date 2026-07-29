"use client";

/**
 * Individual infra node that "ignites" (becomes visible) when the scrubber
 * year meets or exceeds the node's event year.
 */
export function InfraNode({
  cx,
  cy,
  year,
  label,
  currentYear,
  r = 4,
}: {
  cx: number;
  cy: number;
  year: number;
  label: string;
  currentYear: number;
  r?: number;
}) {
  const active = currentYear >= year;

  return (
    <g>
      {/* Outer pulse ring */}
      {active && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 6}
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth="0.5"
          opacity={0.3}
        />
      )}
      {/* Core node */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--color-brass)"
        style={{
          opacity: active ? 0.95 : 0,
          transition: "opacity var(--duration-mid) var(--ease-out-soft)",
        }}
      />
      {/* Label */}
      {active && (
        <text
          x={cx + r + 5}
          y={cy + 4}
          fill="var(--color-brass-light)"
          fontSize="9"
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      )}
    </g>
  );
}
