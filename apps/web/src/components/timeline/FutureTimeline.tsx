"use client";

import { useState } from "react";
import type { InfraEvent } from "@/lib/api";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Citation } from "@/components/trust/Citation";
import { ConfidenceBand } from "@/components/trust/ConfidenceBand";
import { colorForType } from "@/components/map/colors";
import { cn } from "@/lib/cn";

/**
 * Numbered infra timeline — design system §3.2.
 * Numbering is chronological (by expected_year), not decorative.
 */
export function FutureTimeline({
  events,
  years,
}: {
  events: InfraEvent[];
  years: number[];
}) {
  const dated = events
    .filter((e) => e.expected_year != null)
    .sort((a, b) => (a.expected_year ?? 0) - (b.expected_year ?? 0));
  const undated = events.filter((e) => e.expected_year == null);

  if (events.length === 0) {
    return (
      <p className="text-sm text-text-low">
        No verified infrastructure events yet for this locality.
      </p>
    );
  }

  const axis = buildAxis(years, dated);
  const min = axis[0];
  const span = Math.max(1, axis[axis.length - 1] - min);

  return (
    <div>
      {/* Year axis */}
      <div
        className="flex gap-2 mb-3 pl-[220px]"
        aria-hidden="true"
      >
        {axis.map((y) => (
          <div key={y} className="flex-1 font-mono text-[11px] text-text-low">
            {y}
          </div>
        ))}
      </div>

      {/* Dated events — numbered chronologically */}
      <div className="flex flex-col gap-2">
        {dated.map((e, idx) => (
          <TimelineRow
            key={e.id}
            event={e}
            min={min}
            span={span}
            number={idx + 1}
          />
        ))}
      </div>

      {/* Undated events */}
      {undated.length > 0 && (
        <div className="mt-5">
          <div className="font-display text-[10px] uppercase tracking-widest text-text-low mb-2">
            Year not yet confirmed
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
  number,
  undated = false,
}: {
  event: InfraEvent;
  min: number;
  span: number;
  number?: number;
  undated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [r, g, b] = colorForType(event.type);
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const endYear = event.expected_year ?? min + span;
  const widthPct = undated ? 100 : ((endYear - min) / span) * 100;

  return (
    <div
      className={cn(
        "border border-white/[0.08] rounded-card p-3 cursor-pointer",
        "bg-ink-2 transition-colors hover:border-brass/25",
      )}
      onClick={() => setOpen((o) => !o)}
      role="button"
      aria-expanded={open}
      aria-label={`${event.type.replace(/_/g, " ")}, ${event.status}, ${event.expected_year ?? "year TBD"}`}
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((o) => !o)}
    >
      <div
        className="grid items-center gap-3"
        style={{ gridTemplateColumns: "212px 1fr" }}
      >
        <div className="flex items-start gap-2">
          {/* Earned number — chronological order */}
          {number !== undefined && (
            <span className="font-mono text-[11px] text-brass/50 w-5 shrink-0 pt-0.5">
              {String(number).padStart(2, "0")}
            </span>
          )}
          <div>
            <div className="font-display font-medium text-sm text-text-hi capitalize mb-1">
              {event.type.replace(/_/g, " ")}
            </div>
            <Badge tone={statusTone(event.status)}>
              {event.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {/* Gantt bar */}
        <div
          className="relative h-6 bg-ink-3 rounded overflow-hidden"
          role="presentation"
        >
          <div
            className="absolute inset-y-0 left-0 rounded flex items-center justify-end pr-2"
            style={{
              width: `${Math.max(6, Math.min(100, widthPct))}%`,
              background: `linear-gradient(90deg, ${rgb}44, ${rgb}aa)`,
            }}
          >
            <span className="font-mono text-[11px] font-bold text-ink">
              {event.expected_year ?? "TBD"}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-3">
          {event.budget_inr_cr != null && (
            <div className="font-mono text-[12px] text-text-mid">
              Sanctioned budget: ₹{event.budget_inr_cr.toLocaleString("en-IN")} Cr
            </div>
          )}
          <div className="max-w-xs">
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
