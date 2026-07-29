"use client";

import { useState } from "react";
import {
  simulate,
  type EnvelopeDiff,
  type SimulationResult,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/trust/Disclaimer";
import { cn } from "@/lib/cn";

/**
 * What-if simulation panel (blueprint §7, P4.2).
 * Simulated results are ALWAYS visually distinct from live predictions —
 * dashed band indicator, "hypothetical" badge, no live data styling.
 */
function fmt(n: number | null | undefined, unit?: string | null): string {
  if (n === null || n === undefined) return "-";
  const r = Math.abs(n) >= 100 ? Math.round(n).toLocaleString("en-IN") : n.toFixed(2);
  return unit ? `${r} ${unit}` : r;
}

function DiffRow({ label, diff }: { label: string; diff: EnvelopeDiff }) {
  const { baseline, scenario, prediction_delta } = diff;
  const unit = scenario.unit;
  const up = prediction_delta > 0;
  const flat = Math.abs(prediction_delta) < 0.001;

  const bandStr = (e: typeof baseline) =>
    e.prediction_low != null
      ? `${fmt(e.prediction_low, unit)} – ${fmt(e.prediction_high, unit)}`
      : fmt(e.prediction, unit);

  return (
    <div className="py-3 border-b border-white/[0.06] last:border-0">
      <div className="flex justify-between items-center mb-1">
        <span className="font-display font-medium text-sm text-text-hi capitalize">
          {label.replace(/_/g, " ")}
        </span>
        {/* Delta — colored by direction; dashed to signal "hypothetical" */}
        <span
          className={cn(
            "font-mono text-sm font-medium",
            flat ? "text-text-low" : up ? "text-moss" : "text-clay",
          )}
        >
          {flat
            ? "no change"
            : `${up ? "▲" : "▼"} ${fmt(Math.abs(prediction_delta), unit)}`}
        </span>
      </div>
      <div className="text-[11px] text-text-low font-mono">
        baseline {bandStr(baseline)}{" "}
        <span className="text-text-low/50 mx-1">→ scenario</span>{" "}
        {/* Dashed underline on scenario value = visually distinct from live */}
        <span className="border-b border-dashed border-brass/50 pb-px">
          {bandStr(scenario)}
        </span>
      </div>
      {diff.factor_deltas.filter((f) => Math.abs(f.delta) > 0.001).length > 0 && (
        <div className="text-[11px] text-text-low mt-1">
          drivers:{" "}
          {diff.factor_deltas
            .filter((f) => Math.abs(f.delta) > 0.001)
            .slice(0, 3)
            .map((f) => `${f.factor} (${f.delta > 0 ? "+" : ""}${f.delta.toFixed(2)})`)
            .join(", ")}
        </div>
      )}
    </div>
  );
}

export function SimulationPanel({ localityId }: { localityId: string }) {
  const [distanceKm, setDistanceKm] = useState(1.0);
  const [status, setStatus] = useState("approved");
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
          {
            type: "metro",
            status,
            expected_year: year,
            distance_km: distanceKm,
          },
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
      <div className="mb-ds-4 flex items-center gap-ds-2">
        <span className="rounded-control border border-brass/30 px-1.5 py-0.5 font-mono text-[10px] text-brass">
          hypothetical · not a prediction
        </span>
        <span className="text-[11px] text-text-low">nothing is saved</span>
      </div>

      <p className="mb-ds-5 text-sm text-text-mid">
        Explore how forecasts would shift if a new metro landed nearby.
      </p>

      {/* Sliders */}
      <div className="space-y-4 mb-5">
        <label className="block">
          <span className="text-xs text-text-low uppercase tracking-widest mb-1.5 block">
            Metro distance: <span className="text-brass-light font-mono">{distanceKm.toFixed(1)} km</span>
          </span>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.1}
            value={distanceKm}
            onChange={(e) => setDistanceKm(Number(e.target.value))}
            className="w-full focus-brass"
            aria-label={`Metro distance: ${distanceKm.toFixed(1)} km`}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-text-low uppercase tracking-widest mb-1.5 block">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={cn(
                "w-full bg-ink-3 border border-white/10 rounded-card",
                "px-3 py-2 text-sm text-text-hi",
                "focus:outline-none focus:border-brass/50",
              )}
              aria-label="Metro approval status"
            >
              <option value="proposed">proposed</option>
              <option value="approved">approved</option>
              <option value="under_construction">under construction</option>
              <option value="operational">operational</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-text-low uppercase tracking-widest mb-1.5 block">
              Expected year
            </span>
            <input
              type="number"
              min={2026}
              max={2045}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={cn(
                "w-full bg-ink-3 border border-white/10 rounded-card",
                "px-3 py-2 text-sm text-text-hi font-mono",
                "focus:outline-none focus:border-brass/50",
              )}
              aria-label="Expected year for metro"
            />
          </label>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className={cn(
          "px-5 py-2.5 bg-brass text-ink font-display font-semibold text-sm rounded-card",
          "transition-opacity hover:opacity-90 focus-brass",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        {loading ? "Recomputing…" : "Run scenario"}
      </button>

      {error && (
        <p className="text-sm text-clay mt-3">{error}</p>
      )}

      {result && (
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-display text-xs uppercase tracking-widest text-text-low">
              Scenario results
            </span>
            {/* Dashed indicator = hypothetical, distinct from live */}
            <div className="flex-1 border-t border-dashed border-brass/30" />
            <span className="font-mono text-[10px] text-brass/60">simulated</span>
          </div>
          <DiffRow label="Future Intelligence Score" diff={result.score} />
          {Object.entries(result.predictions).map(([domain, diff]) => (
            <DiffRow key={domain} label={domain} diff={diff} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <Disclaimer variant="prediction">
          {result?.disclaimer ??
            "Hypothetical what-if only - not a prediction that this will happen. Simulated results are clearly distinct from live forecasts and are not saved."}
        </Disclaimer>
      </div>
    </Card>
  );
}
