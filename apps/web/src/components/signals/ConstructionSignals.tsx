"use client";

import { useEffect, useState } from "react";
import { getConstructionSignals, type InfraEvent } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/trust/Disclaimer";

/**
 * Satellite-derived construction signal markers.
 * Design system §5: ALWAYS labeled "pattern-detected, unverified" — never
 * styled to look as authoritative as /facts entries.
 */
export function ConstructionSignals({ localityId }: { localityId?: string }) {
  const [signals, setSignals] = useState<InfraEvent[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getConstructionSignals(20)
      .then((res) => {
        if (!alive) return;
        const filtered = localityId
          ? res.items.filter((s) => s.locality_id === localityId)
          : res.items;
        setSignals(filtered);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) { setSignals([]); setLoaded(true); }
      });
    return () => { alive = false; };
  }, [localityId]);

  return (
    <Card title="Satellite signals">
      {/* Mandatory unverified label — always visible */}
      <div className="flex items-center gap-2 mb-4">
        <Badge tone="warn">pattern-detected · unverified</Badge>
        <span className="text-[11px] text-text-low font-mono">
          CV pipeline · not official data
        </span>
      </div>

      {!loaded && (
        <p className="font-mono text-xs text-text-low">Loading signals…</p>
      )}
      {loaded && (!signals || signals.length === 0) && (
        <p className="text-sm text-text-low">
          No satellite construction signals detected for this area.
        </p>
      )}
      {signals && signals.length > 0 && (
        <div className="flex flex-col gap-3">
          {signals.map((s) => (
            <div
              key={s.id}
              className="border border-white/[0.08] rounded-card p-3 flex items-start gap-3"
            >
              {/* Visual distinction from /facts: dashed-style indicator */}
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{
                  background: "repeating-linear-gradient(180deg, var(--color-clay) 0, var(--color-clay) 4px, transparent 4px, transparent 8px)",
                }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-medium text-sm text-text-hi capitalize">
                    {s.type.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[10px] text-clay border border-clay/30 rounded-sm px-1">
                    unverified
                  </span>
                </div>
                {s.expected_year && (
                  <div className="font-mono text-[12px] text-text-low">
                    detected activity · {s.expected_year}
                  </div>
                )}
                {s.distance_km != null && (
                  <div className="text-[11px] text-text-low">
                    {s.distance_km.toFixed(1)} km from centroid
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Disclaimer variant="prediction">
          These signals are pattern-detected from satellite imagery - not verified
          against official sources. They may indicate activity or may be false
          positives. Do not act on these alone.
        </Disclaimer>
      </div>
    </Card>
  );
}
