import type { ProximityResponse } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Citation } from "@/components/trust/Citation";
import { Disclaimer } from "@/components/trust/Disclaimer";

const SLOT_LABELS: Record<string, { label: string; icon: string }> = {
  metro:            { label: "Nearest metro",                    icon: "🚇" },
  airport:          { label: "Noida International Airport (Jewar)", icon: "✈️" },
  expressway_rrts:  { label: "Nearest expressway / RRTS",        icon: "🛣️" },
};

/** Numbered proximity signal section — earned numbering per design system §3.2 */
export function ProximityCard({ data }: { data: ProximityResponse }) {
  const entries = Object.entries(SLOT_LABELS);

  return (
    <Card title="Infrastructure proximity">
      <div className="flex flex-col gap-0">
        {entries.map(([slot, { label, icon }], idx) => {
          const e = data.nearest[slot];
          return (
            <div
              key={slot}
              className="py-4 border-b border-white/[0.06] last:border-0"
            >
              <div className="flex items-start gap-3">
                {/* Number — earned from signal order */}
                <span className="font-mono text-xs text-brass/50 w-5 shrink-0 pt-0.5">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span aria-hidden="true">{icon}</span>
                    <span className="font-display font-medium text-sm text-text-hi">
                      {label}
                    </span>
                  </div>
                  {e ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={statusTone(e.status)}>
                          {e.status.replace(/_/g, " ")}
                        </Badge>
                        {e.distance_km != null && (
                          <span className="font-mono text-xs text-text-mid">
                            {e.distance_km.toFixed(1)} km
                          </span>
                        )}
                        {e.expected_year && (
                          <span className="font-mono text-xs text-text-low">
                            · expected {e.expected_year}
                          </span>
                        )}
                      </div>
                      <Citation citation={e.citation} />
                    </div>
                  ) : (
                    <div className="text-sm text-text-low mt-1">
                      No verified record found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <Disclaimer variant="builder">{data.disclaimer}</Disclaimer>
      </div>
    </Card>
  );
}
