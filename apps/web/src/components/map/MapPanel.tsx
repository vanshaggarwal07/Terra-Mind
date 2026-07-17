"use client";

import dynamic from "next/dynamic";

// Deck.gl + Mapbox are browser-only; disable SSR.
const CorridorMap = dynamic(
  () => import("./CorridorMap").then((m) => m.CorridorMap),
  {
    ssr: false,
    loading: () => <div className="card muted">Loading map…</div>,
  },
);

export function MapPanel(props: { height?: number; focusLocalityId?: string }) {
  return <CorridorMap {...props} />;
}
