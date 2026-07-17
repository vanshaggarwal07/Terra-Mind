"use client";

import { useState } from "react";
import type { PredictionEnvelope } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ConfidenceBand } from "@/components/trust/ConfidenceBand";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * Future Intelligence Score card (blueprint §1 feature 2, §8).
 * The "why" is rendered DIRECTLY from the envelope's `contributing_factors` — no
 * hand-written copy — so it can never drift from the number.
 */
export function ScoreCard({ envelope }: { envelope: PredictionEnvelope }) {
  const [open, setOpen] = useState(false);
  const factors = envelope.contributing_factors;
  const maxWeight = Math.max(1e-6, ...factors.map((f) => f.weight));

  return (
    <Card
      title="Future Intelligence Score"
      actions={
        <button className="tab" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide why ▲" : "Why? ▼"}
        </button>
      }
    >
      <ConfidenceBand
        confidence={envelope.confidence}
        value={envelope.prediction}
        min={0}
        max={100}
      />
      <div className="muted" style={{ fontSize: "0.75rem", marginTop: 6 }}>
        model: {envelope.model_version}
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ margin: "0 0 8px" }}>Contributing factors</h4>
          {factors.length === 0 ? (
            <p className="muted">No contributing signals within range.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {factors.map((f, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px", alignItems: "center", gap: 8 }}>
                  <span style={{ textTransform: "capitalize" }}>{f.factor}</span>
                  <span
                    className="confidence__bar"
                    style={{ position: "relative", height: 10 }}
                    title={`weight ${f.weight}`}
                  >
                    <span
                      className="confidence__fill"
                      style={{ display: "block", height: "100%", width: `${(f.weight / maxWeight) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Disclaimer>
          The Future Intelligence Score is a rule-weighted sum of confirmed
          infrastructure signals (no ML). It is an estimate, not investment advice.
        </Disclaimer>
      </div>
    </Card>
  );
}
