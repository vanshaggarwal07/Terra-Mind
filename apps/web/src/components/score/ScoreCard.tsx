"use client";

import { useState } from "react";
import type { PredictionEnvelope } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ConfidenceBand } from "@/components/trust/ConfidenceBand";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * Future Intelligence Score — design system §3.2, §5.
 * Gauge renders the score as a circular arc in brass, with contributing factors.
 */
export function ScoreCard({ envelope }: { envelope: PredictionEnvelope }) {
  const [open, setOpen] = useState(false);
  const factors = envelope.contributing_factors;
  const maxWeight = Math.max(1e-6, ...factors.map((f) => f.weight));
  const score = Math.round(envelope.prediction);

  // SVG arc: 0-100 maps to 0–270 degrees of arc
  const arcDeg = (score / 100) * 270;
  const R = 42;
  const cx = 50;
  const cy = 54;
  const startAngle = -225; // degrees, from bottom-left
  function polarToXY(deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }
  const start = polarToXY(startAngle);
  const end = polarToXY(startAngle + arcDeg);
  const largeArc = arcDeg > 180 ? 1 : 0;
  const trackEnd = polarToXY(startAngle + 270);

  return (
    <Card
      title="Future Intelligence Score"
      actions={
        <button
          className="text-xs text-text-low hover:text-cyan transition-colors focus-brass px-2 py-1"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Hide why ▲" : "Why? ▼"}
        </button>
      }
    >
      <div className="flex items-center gap-6">
        {/* Arc gauge */}
        <svg
          viewBox="0 0 100 80"
          className="w-24 h-20 shrink-0"
          aria-label={`Future Intelligence Score: ${score} out of 100`}
          role="img"
        >
          {/* Track */}
          <path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${trackEnd.x} ${trackEnd.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Value arc */}
          {arcDeg > 0 && (
            <path
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`}
              fill="none"
              stroke="var(--color-brass)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          )}
          {/* Score label */}
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fill="var(--color-brass-light)"
            fontSize="18"
            fontFamily="var(--font-mono)"
            fontWeight="500"
          >
            {score}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill="var(--color-text-low)"
            fontSize="7"
            fontFamily="var(--font-display)"
          >
            / 100
          </text>
        </svg>

        {/* Confidence band */}
        <div className="flex-1">
          <ConfidenceBand confidence={envelope.confidence} />
          <div className="font-mono text-[10px] text-text-low mt-2">
            model: {envelope.model_version}
          </div>
        </div>
      </div>

      {/* Contributing factors (expandable) */}
      {open && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <h4 className="font-display text-xs uppercase tracking-widest text-text-low mb-3">
            Contributing factors
          </h4>
          {factors.length === 0 ? (
            <p className="text-text-low text-sm">
              No contributing signals within range.
            </p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Contributing factors">
              {factors.map((f, i) => (
                <li
                  key={i}
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: "1fr 80px" }}
                >
                  <span className="text-sm text-text-mid capitalize">
                    {f.factor.replace(/_/g, " ")}
                  </span>
                  <div
                    className="h-1.5 rounded-full bg-ink-3 overflow-hidden"
                    role="presentation"
                    aria-label={`Weight: ${f.weight}`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brass/60 to-brass"
                      style={{
                        width: `${(f.weight / maxWeight) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4">
        <Disclaimer variant="prediction">
          The Future Intelligence Score is a rule-weighted sum of confirmed
          infrastructure signals — no ML. It is an estimate, not investment advice.
        </Disclaimer>
      </div>
    </Card>
  );
}
