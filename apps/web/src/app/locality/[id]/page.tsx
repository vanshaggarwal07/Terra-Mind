"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getLocality,
  getProximity,
  getScore,
  getTimeline,
  type Locality,
  type PredictionEnvelope,
  type ProximityResponse,
  type TimelineResponse,
} from "@/lib/api";
import { SECTOR_22D_TIMELINE } from "@/data/sector-22d";
import { Card } from "@/components/ui/Card";
import { FutureTimeline } from "@/components/timeline/FutureTimeline";
import { ScoreCard } from "@/components/score/ScoreCard";
import { ForecastCard } from "@/components/prediction/ForecastCard";
import { SimulationPanel } from "@/components/simulation/SimulationPanel";
import { ConstructionSignals } from "@/components/signals/ConstructionSignals";
import { ProximityCard } from "@/components/proximity/ProximityCard";
import { CopilotChat } from "@/components/copilot/CopilotChat";
import { MapPanel } from "@/components/map/MapPanel";
import { Disclaimer } from "@/components/trust/Disclaimer";

const POC_ID = "sector-22d-poc";

export default function LocalityPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const isPoc = id === POC_ID;

  const [locality, setLocality] = useState<Locality | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [score, setScore] = useState<PredictionEnvelope | null>(null);
  const [proximity, setProximity] = useState<ProximityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPoc) {
      setLocality({
        id: POC_ID,
        name: "Sector 22D",
        centroid_lat: 28.5405,
        centroid_lng: 77.329,
        metadata: { region: "Yamuna Expressway" },
      });
      setTimeline(SECTOR_22D_TIMELINE);
      return;
    }
    let alive = true;
    getLocality(id)
      .then((l) => alive && setLocality(l))
      .catch((e) => alive && setError(String(e)));
    getTimeline(id).then((t) => alive && setTimeline(t)).catch(() => {});
    getScore(id).then((s) => alive && setScore(s)).catch(() => {});
    getProximity(id).then((p) => alive && setProximity(p)).catch(() => {});
    return () => { alive = false; };
  }, [id, isPoc]);

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12">
        <Card>
          <p className="text-sm text-text-low">Could not load locality: {error}</p>
          <Link href="/localities" className="text-cyan text-sm mt-2 inline-block">
            ← Back to localities
          </Link>
        </Card>
      </main>
    );
  }

  const region =
    (locality?.metadata as Record<string, string>)?.region ?? "NCR Corridor";

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
      {/* Page header */}
      <div className="mb-8">
        <Link
          href="/localities"
          className="font-mono text-[11px] text-text-low hover:text-text-mid mb-3 inline-block focus-brass"
        >
          ← Localities
        </Link>
        <h1 className="font-display font-medium text-[clamp(28px,4vw,44px)] text-text-hi leading-tight">
          {locality?.name ?? "Loading…"}
        </h1>
        {region && (
          <p className="font-mono text-sm text-text-low mt-1">{region}</p>
        )}
      </div>

      {isPoc && (
        <div className="mb-6">
          <Disclaimer>{SECTOR_22D_TIMELINE.disclaimer}</Disclaimer>
        </div>
      )}

      {/* Two-column layout: sticky map (left) + scrolling signals (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left: sticky map */}
        <div className="lg:sticky lg:top-4 h-fit">
          {!isPoc ? (
            <Card title="Location" noPad>
              <MapPanel height={360} focusLocalityId={id} />
            </Card>
          ) : (
            <Card title="Sector 22D — Proof of Concept">
              <p className="text-sm text-text-low font-voice italic">
                Hand-entered PoC data per blueprint §11.5. Backend data pipeline
                populates this automatically for all other localities.
              </p>
            </Card>
          )}

          {/* Score — below map on desktop */}
          {score && (
            <div className="mt-4">
              <ScoreCard envelope={score} />
            </div>
          )}

          {/* Proximity chips */}
          {proximity && (
            <div className="mt-4">
              <ProximityCard data={proximity} />
            </div>
          )}
        </div>

        {/* Right: numbered signal sections */}
        <div className="flex flex-col gap-6">
          {/* 01 — Infrastructure timeline */}
          <Card title="01 — Infrastructure timeline">
            {timeline ? (
              <FutureTimeline events={timeline.events} years={timeline.years} />
            ) : (
              <p className="font-mono text-xs text-text-low">
                Loading timeline…
              </p>
            )}
          </Card>

          {/* 02 — Forecasts (ML) */}
          {!isPoc && (
            <ForecastCard localityId={id} />
          )}

          {/* 03 — What-if simulation */}
          {!isPoc && (
            <SimulationPanel localityId={id} />
          )}

          {/* 04 — Satellite signals */}
          {!isPoc && (
            <ConstructionSignals localityId={id} />
          )}

          {/* 05 — Ask the copilot */}
          <Card title="05 — Ask about this locality">
            <CopilotChat localityId={isPoc ? undefined : id} />
          </Card>
        </div>
      </div>
    </main>
  );
}
