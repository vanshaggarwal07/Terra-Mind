"use client";

import { useState } from "react";
import {
  simulate,
  type EnvelopeDiff,
  type SimulationResult,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * What-if simulation panel (blueprint §7, P4.2).
 *
 * Builds a hypothetical scenario (add a metro, choose how near/soon it lands),
 * calls /simulate, and renders baseline vs scenario with factor-level deltas. The
 * hypothetical nature + disclaimer are always explicit; nothing is persisted.
 */
function fmt(n: number | null | undefined, unit?: string | null): string {
  if (n === null || n === undefined) return "—";
  const r = Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(2);
  return unit ? `${r} ${unit}` : r;
}

function DiffRow({ label, diff }: { label: string; diff: EnvelopeDiff }) {
  const { baseline, scenario, prediction_delta } = diff;
  const unit = scenario.unit;
  const up = prediction_delta > 0;
  const flat = prediction_delta === 0;
  const band = (e: typeof baseline) =>
    e.prediction_low !== null && e.prediction_low !== undefined
      ? `${fmt(e.prediction_low, unit)} – ${fmt(e.prediction_high, unit)}`
      : fmt(e.prediction, unit);

  return (
    <li style={{ padding: "8px 0", borderBottom: "1px solid var(--border,#eee)" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{label}</strong>
        <span style={{ color: flat ? "var(--muted,#888)" : up ? "#0a7d33" : "#b00020" }}>
          {flat ? "no change" : `${up ? "▲" : "▼"} ${fmt(Math.abs(prediction_delta), unit)}`}
        </span>
      </div>
      <div className="muted" style={{ fontSize: "0.78rem" }}>
        baseline {band(baseline)} → scenario {band(scenario)}
      </div>
      {diff.factor_deltas.filter((f) => Math.abs(f.delta) > 0.001).slice(0, 3).length > 0 && (
        <div className="muted" style={{ fontSize: "0.72rem", marginTop: 2 }}>
          drivers:{" "}
          {diff.factor_deltas
            .filter((f) => Math.abs(f.delta) > 0.001)
            .slice(0, 3)
            .map((f) => `${f.factor} (${f.delta > 0 ? "+" : ""}${f.delta})`)
            .join(", ")}
        </div>
      )}
    </li>
  );
}

export function SimulationPanel({ localityId }: { localityId: string }) {
  const [distanceKm, setDistanceKm] = useState(1.0);
  const [status, setStatus] = useState("operational");
  const [year, setYear] = useState(2028);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await simulate(localityId, {
        add_events: [
          { type: "metro", status, expected_year: year, distance_km: distanceKm },
        ],
        domains: ["price", "aqi", "flood"],
      });
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="What-if simulation">
      <p className="muted" style={{ fontSize: "0.8rem", marginTop: 0 }}>
        Explore how forecasts would shift IF a new metro landed nearby.
      </p>

      <label style={{ display: "block", fontSize: "0.8rem", marginBottom: 8 }}>
        Metro distance: <strong>{distanceKm.toFixed(1)} km</strong>
        <input
          type="range"
          min={0.3}
          max={5}
          step={0.1}
          value={distanceKm}
          onChange={(e) => setDistanceKm(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </label>

      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: "0.8rem" }}>
          Status{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="proposed">proposed</option>
            <option value="approved">approved</option>
            <option value="under_construction">under construction</option>
            <option value="operational">operational</option>
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          Expected year{" "}
          <input
            type="number"
            min={2026}
            max={2045}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </label>
      </div>

      <button className="tab" onClick={run} disabled={loading}>
        {loading ? "Recomputing…" : "Run scenario"}
      </button>

      {error && (
        <p className="muted" style={{ color: "#b00020", fontSize: "0.8rem" }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <DiffRow label="Future Intelligence Score" diff={result.score} />
            {Object.entries(result.predictions).map(([domain, diff]) => (
              <DiffRow key={domain} label={domain} diff={diff} />
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Disclaimer>
          {result?.disclaimer ??
            "Hypothetical what-if only — not a prediction that this will happen. Nothing is saved."}
        </Disclaimer>
      </div>
    </Card>
  );
}
