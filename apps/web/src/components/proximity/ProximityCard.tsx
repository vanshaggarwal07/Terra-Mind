import type { ProximityResponse } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Citation } from "@/components/trust/Citation";
import { Disclaimer } from "@/components/trust/Disclaimer";

const SLOT_LABELS: Record<string, string> = {
  metro: "Nearest metro",
  airport: "Noida International Airport (Jewar)",
  expressway_rrts: "Nearest expressway / RRTS",
};

/**
 * Metro / Airport / Expressway proximity card (blueprint §1 feature 3).
 * Facts only: distance + status + expected year + citation. No price impact.
 */
export function ProximityCard({ data }: { data: ProximityResponse }) {
  return (
    <Card title="Proximity impact">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(SLOT_LABELS).map(([slot, label]) => {
          const e = data.nearest[slot];
          return (
            <div key={slot} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{label}</div>
              {e ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge tone={statusTone(e.status)}>{e.status.replace("_", " ")}</Badge>
                    {e.distance_km != null && (
                      <span>{e.distance_km.toFixed(1)} km away</span>
                    )}
                    {e.expected_year && <span className="muted">· expected {e.expected_year}</span>}
                  </div>
                  <Citation citation={e.citation} />
                </div>
              ) : (
                <div className="muted">No verified record found.</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <Disclaimer>{data.disclaimer}</Disclaimer>
      </div>
    </Card>
  );
}
