"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
      // Hand-entered PoC: renders with no backend automation (blueprint §11.5).
      setLocality({
        id: POC_ID,
        name: "Sector 22D (proof of concept)",
        centroid_lat: 28.5405,
        centroid_lng: 77.329,
        metadata: {},
      });
      setTimeline(SECTOR_22D_TIMELINE);
      return;
    }
    let alive = true;
    getLocality(id).then((l) => alive && setLocality(l)).catch((e) => alive && setError(String(e)));
    getTimeline(id).then((t) => alive && setTimeline(t)).catch(() => {});
    getScore(id).then((s) => alive && setScore(s)).catch(() => {});
    getProximity(id).then((p) => alive && setProximity(p)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, isPoc]);

  if (error) {
    return (
      <main>
        <Card>Could not load locality: {error}</Card>
      </main>
    );
  }

  return (
    <main>
      <h1>{locality?.name ?? "Locality"}</h1>
      {isPoc && (
        <div style={{ marginBottom: 12 }}>
          <Disclaimer>{SECTOR_22D_TIMELINE.disclaimer}</Disclaimer>
        </div>
      )}

      <div className="grid-2">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isPoc && (
            <Card title="Location">
              <MapPanel height={320} focusLocalityId={id} />
            </Card>
          )}
          <Card title="Future timeline">
            {timeline ? (
              <FutureTimeline events={timeline.events} years={timeline.years} />
            ) : (
              <p className="muted">Loading timeline…</p>
            )}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {score && <ScoreCard envelope={score} />}
          {proximity && <ProximityCard data={proximity} />}
          <Card title="Ask about this locality">
            <CopilotChat localityId={isPoc ? undefined : id} />
          </Card>
        </div>
      </div>
    </main>
  );
}
