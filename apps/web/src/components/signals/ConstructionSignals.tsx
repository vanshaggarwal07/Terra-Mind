"use client";

import { useEffect, useState } from "react";
import { getConstructionSignals, type ConstructionSignalList } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * Satellite pattern-signal card (blueprint §3.5, P4.5).
 *
 * Surfaces construction detected from satellite imagery DISTINCTLY from official
 * facts, always labelled as a lower-trust pattern signal (never a verified record).
 */
export function ConstructionSignals({ localityId }: { localityId?: string }) {
  const [data, setData] = useState<ConstructionSignalList | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getConstructionSignals()
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const items = (data?.items ?? []).filter(
    (s) => !localityId || s.locality_id === localityId,
  );

  return (
    <Card title="Satellite signals (pattern)">
      <span className="badge" style={{ fontSize: "0.7rem" }}>
        pattern signal · not an official record
      </span>
      {!loaded && <p className="muted">Loading…</p>}
      {loaded && items.length === 0 && (
        <p className="muted" style={{ fontSize: "0.82rem" }}>
          No satellite-detected construction signals for this area yet.
        </p>
      )}
      {items.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {items.map((s) => (
            <li
              key={s.id}
              style={{ padding: "6px 0", borderBottom: "1px solid var(--border,#eee)", fontSize: "0.82rem" }}
            >
              New built-up area detected
              {s.lat && s.lng ? ` near ${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}` : ""} ·{" "}
              <span className="muted">confidence {(s.confidence * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 12 }}>
        <Disclaimer>
          {data?.disclaimer ??
            "Satellite-derived pattern signals are unverified early indicators, subject to human review — not official records."}
        </Disclaimer>
      </div>
    </Card>
  );
}
