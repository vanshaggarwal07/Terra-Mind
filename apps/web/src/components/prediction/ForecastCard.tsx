"use client";

import { useEffect, useState } from "react";
import {
  getAllPredictions,
  type PredictionDomain,
  type PredictionEnvelope,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { confidenceLabel } from "@/components/trust/ConfidenceBand";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * Prediction / ML forecast card (blueprint §5, Phase 3).
 *
 * Renders the model-served BAND verbatim (never a bare number), its confidence,
 * horizon framing, model version, and the derived contributing factors. Missing /
 * insufficient-data forecasts are shown honestly rather than as a fake number.
 */
const LABELS: Record<PredictionDomain, string> = {
  price: "Price / sqft",
  traffic: "Traffic",
  flood: "Flood risk",
  water: "Groundwater depth",
  aqi: "Air quality (AQI)",
};

const ORDER: PredictionDomain[] = ["price", "flood", "aqi", "water", "traffic"];

function fmt(n: number, unit?: string | null): string {
  const rounded = Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : n.toFixed(2);
  return unit ? `${rounded} ${unit}` : rounded;
}

function Row({ domain, env }: { domain: PredictionDomain; env: PredictionEnvelope }) {
  const hasBand =
    env.prediction_low !== null &&
    env.prediction_low !== undefined &&
    env.prediction_high !== null &&
    env.prediction_high !== undefined;
  const c = Math.max(0, Math.min(1, env.confidence));

  return (
    <li style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 0", borderBottom: "1px solid var(--border, #eee)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong>{LABELS[domain]}</strong>
        {hasBand ? (
          <span style={{ fontWeight: 700 }}>
            {fmt(env.prediction_low as number, env.unit)} – {fmt(env.prediction_high as number, env.unit)}
          </span>
        ) : (
          <span className="muted">no estimate (insufficient data)</span>
        )}
      </div>
      <div className="confidence__bar" style={{ height: 8 }}>
        <div className="confidence__fill" style={{ width: `${c * 100}%` }} />
      </div>
      <div className="muted" style={{ fontSize: "0.72rem", display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span>
          {confidenceLabel(c)} confidence ({Math.round(c * 100)}%)
        </span>
        {env.horizon && <span>horizon {env.horizon}</span>}
        <span>model {env.model_version}</span>
      </div>
      {hasBand && env.contributing_factors.length > 0 && (
        <div className="muted" style={{ fontSize: "0.72rem" }}>
          drivers: {env.contributing_factors.slice(0, 3).map((f) => f.factor).join(", ")}
        </div>
      )}
    </li>
  );
}

export function ForecastCard({ localityId }: { localityId?: string }) {
  const [preds, setPreds] = useState<Record<string, PredictionEnvelope> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getAllPredictions(localityId)
      .then((p) => alive && setPreds(p))
      .catch(() => alive && setPreds({}))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [localityId]);

  const available = preds ? ORDER.filter((d) => preds[d]) : [];

  return (
    <Card title="Forecasts (ML)">
      {!loaded && <p className="muted">Loading forecasts…</p>}
      {loaded && available.length === 0 && (
        <p className="muted">
          Forecast models are not available yet. Train them with
          <code> python -m ml.training.train</code>.
        </p>
      )}
      {available.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {available.map((d) => (
            <Row key={d} domain={d} env={preds![d]} />
          ))}
        </ul>
      )}
      <div style={{ marginTop: 12 }}>
        <Disclaimer>
          Forecasts are model estimates shown as ranges with confidence — not
          investment advice. Numbers come from statistical models, never the chat AI.
        </Disclaimer>
      </div>
    </Card>
  );
}
