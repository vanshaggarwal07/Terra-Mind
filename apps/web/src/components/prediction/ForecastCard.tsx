"use client";

import { useEffect, useState } from "react";
import {
  getAllPredictions,
  type PredictionDomain,
  type PredictionEnvelope,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ConfidenceBand } from "@/components/trust/ConfidenceBand";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * Prediction / ML forecast card (blueprint §5, Phase 3).
 *
 * ALWAYS renders ConfidenceBand + Disclaimer — never a bare number.
 * Missing / insufficient-data forecasts shown honestly as empty states.
 */
const LABELS: Record<PredictionDomain, string> = {
  price: "Price / sqft",
  traffic: "Traffic congestion",
  flood: "Flood risk",
  water: "Groundwater depth",
  aqi: "Air quality (AQI)",
};

const ORDER: PredictionDomain[] = ["price", "flood", "aqi", "water", "traffic"];

function DomainRow({
  domain,
  env,
}: {
  domain: PredictionDomain;
  env: PredictionEnvelope;
}) {
  const label = LABELS[domain];
  const hasBand =
    env.prediction_low != null && env.prediction_high != null;

  return (
    <div className="border-b border-line py-ds-4 last:border-0">
      <div className="mb-ds-3 flex items-center justify-between">
        <div className="flex items-center gap-ds-2">
          <span className="font-display text-sm font-medium text-text-hi">
            {label}
          </span>
        </div>
        <div className="font-mono text-[11px] text-text-low">
          v{env.model_version}
        </div>
      </div>

      {hasBand ? (
        <ConfidenceBand
          confidence={env.confidence}
          low={env.prediction_low}
          mid={env.prediction}
          high={env.prediction_high}
          unit={env.unit ?? ""}
        />
      ) : (
        <p className="text-[12px] text-text-low italic">
          No estimate - insufficient data for this locality.
        </p>
      )}

      {env.horizon && (
        <div className="mt-2 font-mono text-[11px] text-text-low">
          horizon: {env.horizon}
        </div>
      )}

      {env.contributing_factors.length > 0 && (
        <div className="mt-2 text-[11px] text-text-low">
          drivers:{" "}
          {env.contributing_factors
            .slice(0, 3)
            .map((f) => f.factor)
            .join(", ")}
        </div>
      )}
    </div>
  );
}

export function ForecastCard({ localityId }: { localityId?: string }) {
  const [preds, setPreds] = useState<Record<string, PredictionEnvelope> | null>(
    null,
  );
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
      {!loaded && (
        <p className="font-mono text-xs text-text-low">Loading forecasts…</p>
      )}
      {loaded && available.length === 0 && (
        <p className="text-sm text-text-low">
          Forecast models are not available yet. Run{" "}
          <code className="font-mono text-xs text-brass-light">
            python -m ml.training.train
          </code>
          .
        </p>
      )}
      {available.length > 0 && (
        <div>
          {available.map((d) => (
            <DomainRow key={d} domain={d} env={preds![d]} />
          ))}
        </div>
      )}
      {/* Disclaimer always rendered when any forecast is shown */}
      {(loaded && available.length > 0) || true ? (
        <div className="mt-4">
          <Disclaimer variant="prediction">
            Forecasts are model estimates shown as ranges with confidence - not
            investment advice. Numbers come from statistical models trained on
            public data, not AI generation.
          </Disclaimer>
        </div>
      ) : null}
    </Card>
  );
}
