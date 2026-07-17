"use client";

import { useState } from "react";
import type { InfraEvent } from "@/lib/api";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Citation } from "@/components/trust/Citation";
import { ConfidenceBand } from "@/components/trust/ConfidenceBand";
import { colorForType } from "@/components/map/colors";

/**
 * Custom horizontal Gantt (blueprint §1 feature 1, §8, §11 PoC).
 * x-axis = years; each verified infra event is a bar positioned by expected_year
 * and colored by type. Same component works with live API data or hand-entered
 * static PoC data (see sector-22d fixture).
 */
export function FutureTimeline({
  events,
  years,
}: {
  events: InfraEvent[];
  years: number[];
}) {
  const dated = events.filter((e) => e.expected_year != null);
  const undated = events.filter((e) => e.expected_year == null);

  const axis = buildAxis(years, dated);
  if (events.length === 0) {
    return <p className="muted">No verified infrastructure events yet for this locality.</p>;
  }

  const min = axis[0];
  const span = Math.max(1, axis[axis.length - 1] - min);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, paddingLeft: 220 }}>
        {axis.map((y) => (
          <div key={y} className="muted" style={{ flex: 1, fontSize: "0.75rem" }}>
            {y}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {dated.map((e) => (
          <TimelineRow key={e.id} event={e} min={min} span={span} />
        ))}
      </div>
      {undated.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 4 }}>
            Undated (year not yet confirmed)
          </div>
          {undated.map((e) => (
            <TimelineRow key={e.id} event={e} min={min} span={span} undated />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  event,
  min,
  span,
  undated = false,
}: {
  event: InfraEvent;
  min: number;
  span: number;
  undated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [r, g, b] = colorForType(event.type);
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const endYear = event.expected_year ?? min + span;
  const widthPct = undated ? 100 : ((endYear - min) / span) * 100;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 8px",
        background: "var(--bg-elev)",
        cursor: "pointer",
      }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ display: "grid", gridTemplateColumns: "212px 1fr", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
            {event.type.replace("_", " ")}
          </span>
          <span>
            <Badge tone={statusTone(event.status)}>{event.status.replace("_", " ")}</Badge>
          </span>
        </div>
        <div style={{ position: "relative", height: 22, background: "var(--bg-elev-2)", borderRadius: 6 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.max(6, Math.min(100, widthPct))}%`,
              background: `linear-gradient(90deg, ${rgb}55, ${rgb})`,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 8,
              fontSize: "0.75rem",
              color: "#04121f",
              fontWeight: 700,
            }}
          >
            {event.expected_year ?? "TBD"}
          </div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {event.budget_inr_cr != null && (
            <div className="muted">Sanctioned budget: ₹{event.budget_inr_cr} cr</div>
          )}
          <div style={{ maxWidth: 320 }}>
            <ConfidenceBand confidence={event.confidence} />
          </div>
          <Citation citation={event.citation} />
        </div>
      )}
    </div>
  );
}

function buildAxis(years: number[], dated: InfraEvent[]): number[] {
  const ys = years.length
    ? [...years]
    : dated.map((e) => e.expected_year!).filter(Boolean);
  const now = new Date().getFullYear();
  const min = ys.length ? Math.min(...ys, now) : now;
  const max = ys.length ? Math.max(...ys, now + 4) : now + 6;
  const axis: number[] = [];
  for (let y = min; y <= max; y++) axis.push(y);
  return axis;
}
