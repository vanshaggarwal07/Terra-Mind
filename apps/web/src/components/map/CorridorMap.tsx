"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import Map from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  listInfraEvents,
  listLocalities,
  type InfraEvent,
  type Locality,
} from "@/lib/api";
import { alphaForStatus, colorForType } from "./colors";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Centered on the Noida–Greater Noida–Yamuna Expressway–Jewar corridor.
const INITIAL_VIEW = {
  longitude: 77.55,
  latitude: 28.42,
  zoom: 9.6,
  pitch: 0,
  bearing: 0,
};

type Props = { height?: number; focusLocalityId?: string };

export function CorridorMap({ height = 520, focusLocalityId }: Props) {
  const router = useRouter();
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [events, setEvents] = useState<InfraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listLocalities(), listInfraEvents({ limit: 500 })])
      .then(([locs, evs]) => {
        if (!alive) return;
        setLocalities(locs);
        setEvents(evs.items);
      })
      .catch((e) => alive && setError(String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const layers = useMemo(() => {
    const locPts = localities.filter(
      (l) => l.centroid_lat != null && l.centroid_lng != null,
    );
    const evPts = events.filter((e) => e.lat != null && e.lng != null);
    return [
      new ScatterplotLayer<Locality>({
        id: "localities",
        data: locPts,
        getPosition: (d) => [d.centroid_lng!, d.centroid_lat!],
        getFillColor: (d) =>
          d.id === focusLocalityId ? [56, 189, 248, 90] : [148, 163, 184, 45],
        getRadius: 900,
        radiusUnits: "meters",
        pickable: true,
        onClick: ({ object }) =>
          object && router.push(`/locality/${(object as Locality).id}`),
      }),
      new TextLayer<Locality>({
        id: "locality-labels",
        data: locPts,
        getPosition: (d) => [d.centroid_lng!, d.centroid_lat!],
        getText: (d) => d.name,
        getSize: 11,
        getColor: [226, 232, 240, 220],
        getPixelOffset: [0, -16],
      }),
      new ScatterplotLayer<InfraEvent>({
        id: "infra-events",
        data: evPts,
        getPosition: (d) => [d.lng!, d.lat!],
        getFillColor: (d) => {
          const [r, g, b] = colorForType(d.type);
          return [r, g, b, alphaForStatus(d.status)];
        },
        getRadius: 350,
        radiusUnits: "meters",
        radiusMinPixels: 4,
        pickable: true,
      }),
    ];
  }, [localities, events, focusLocalityId, router]);

  if (error) {
    return (
      <div className="bg-ink-2 border border-white/10 rounded-card p-4 text-sm text-text-low">
        Could not load map data: {error}
      </div>
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <NoTokenFallback loading={loading} localities={localities} events={events} />
    );
  }

  return (
    <div style={{ position: "relative", height, borderRadius: 3, overflow: "hidden" }}>
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) return null;
          if ("name" in (object as object)) {
            return { text: (object as Locality).name };
          }
          const e = object as InfraEvent;
          return {
            text: `${e.status} ${e.type}${e.expected_year ? ` · ${e.expected_year}` : ""}`,
          };
        }}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          reuseMaps
        />
      </DeckGL>
    </div>
  );
}

function NoTokenFallback({
  loading,
  localities,
  events,
}: {
  loading: boolean;
  localities: Locality[];
  events: InfraEvent[];
}) {
  return (
    <div className="bg-ink-2 border border-white/10 rounded-card p-4">
      <div className="font-display font-medium text-sm text-text-hi mb-2">
        Map preview
      </div>
      <p className="text-sm text-text-low">
        Set <code className="font-mono text-xs text-cyan">NEXT_PUBLIC_MAPBOX_TOKEN</code> to render the
        interactive Deck.gl + Mapbox corridor map.
      </p>
      {loading ? (
        <p className="font-mono text-xs text-text-low mt-2">Loading…</p>
      ) : (
        <p className="font-mono text-xs text-text-low mt-2">
          {localities.length} localities · {events.length} verified infra events
        </p>
      )}
    </div>
  );
}
