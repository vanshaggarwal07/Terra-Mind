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
    getTimeline(id)
      .then((t) => alive && setTimeline(t))
      .catch(() => {});
    getScore(id)
      .then((s) => alive && setScore(s))
      .catch(() => {});
    getProximity(id)
      .then((p) => alive && setProximity(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, isPoc]);

  if (error) {
    return (
      <main className="mx-auto max-w-content px-ds-5 py-ds-7 md:px-ds-7">
        <Card>
          <p className="text-sm text-text-low">
            Could not load locality: {error}
          </p>
          <Link
            href="/localities"
            className="mt-ds-3 inline-block text-sm text-brass-light hover:text-brass focus-brass"
          >
            Back to localities
          </Link>
        </Card>
      </main>
    );
  }

  const region =
    (locality?.metadata as Record<string, string>)?.region ?? "NCR Corridor";

  return (
    <main className="mx-auto max-w-content px-ds-5 py-ds-6 md:px-ds-7 md:py-ds-7">
      <header className="mb-ds-6">
        <Link
          href="/localities"
          className="mb-ds-3 inline-block font-mono text-[11px] text-text-low transition-colors hover:text-text-mid focus-brass"
        >
          Localities
        </Link>
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1] text-text-hi">
          {locality?.name ?? "Loading…"}
        </h1>
        {region && (
          <p className="mt-ds-2 font-mono text-sm text-text-low">{region}</p>
        )}
      </header>

      {isPoc && (
        <div className="mb-ds-5">
          <Disclaimer>{SECTOR_22D_TIMELINE.disclaimer}</Disclaimer>
        </div>
      )}

      {/* Sticky map rail + scrolling instruments */}
      <div className="grid grid-cols-1 gap-ds-5 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <aside className="h-fit space-y-ds-4 lg:sticky lg:top-[calc(var(--nav-h)+1rem)]">
          {!isPoc ? (
            <Card title="Location" noPad>
              <MapPanel height={360} focusLocalityId={id} />
            </Card>
          ) : (
            <Card title="Sector 22D proof of concept">
              <p className="text-sm leading-relaxed text-text-mid">
                Hand-entered PoC data. The backend pipeline populates this
                automatically for other localities.
              </p>
            </Card>
          )}

          {score && <ScoreCard envelope={score} />}
          {proximity && <ProximityCard data={proximity} />}
        </aside>

        <div className="flex flex-col gap-ds-4">
          <Card title="Infrastructure timeline">
            {timeline ? (
              <FutureTimeline events={timeline.events} years={timeline.years} />
            ) : (
              <p className="font-mono text-xs text-text-low">Loading timeline…</p>
            )}
          </Card>

          {!isPoc && <ForecastCard localityId={id} />}
          {!isPoc && <SimulationPanel localityId={id} />}
          {!isPoc && <ConstructionSignals localityId={id} />}

          <Card title="Ask about this locality">
            <CopilotChat localityId={isPoc ? undefined : id} />
          </Card>
        </div>
      </div>
    </main>
  );
}
