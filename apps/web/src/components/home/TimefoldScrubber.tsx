"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ContourBackground } from "./ContourBackground";
import { InfraNode } from "./InfraNode";
import type { InfraEvent, PredictionEnvelope } from "@/lib/api";

const MIN_YEAR = 2026;
const MAX_YEAR = 2035;

/**
 * Infrastructure nodes sourced from real /facts data.
 * Positioned on a 1200×500 viewport — each has an x/y and its expected_year.
 * In production these positions are laid out by corridor geography; the prototype
 * uses fixed positions that map roughly to the geographic spread.
 */
const NODE_POSITIONS: Record<string, { cx: number; cy: number }> = {
  metro:             { cx: 230, cy: 150 },
  airport:           { cx: 880, cy: 170 },
  expressway:        { cx: 580, cy: 130 },
  expressway_rrts:   { cx: 740, cy: 260 },
  road:              { cx: 420, cy: 220 },
  railway:           { cx: 1000, cy: 300 },
  industrial_zone:   { cx: 1080, cy: 200 },
  commercial_zone:   { cx: 640, cy: 360 },
  residential_zone:  { cx: 360, cy: 330 },
  park:              { cx: 950, cy: 90 },
};

/** Fallback lookup if the backend doesn't have per-year aggregate prices yet.
 *  Labeled as "illustrative" and visible in the disclaimer. */
const ILLUSTRATIVE_UPLIFT: Record<number, number> = {
  2026: 0, 2027: 2, 2028: 5, 2029: 9, 2030: 19,
  2031: 22, 2032: 25, 2033: 27, 2034: 29, 2035: 31,
};
const ILLUSTRATIVE_CONF: Record<number, number> = {
  2026: 95, 2027: 92, 2028: 88, 2029: 83, 2030: 78,
  2031: 74, 2032: 69, 2033: 63, 2034: 58, 2035: 52,
};

export function TimefoldScrubber({
  infraEvents = [],
  prediction,
}: {
  infraEvents?: InfraEvent[];
  prediction?: PredictionEnvelope | null;
}) {
  const [year, setYear] = useState(MIN_YEAR);
  const scrubberRef = useRef<HTMLInputElement>(null);
  const density = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);

  // Derive uplift & confidence from real prediction if available,
  // else fall back to illustrative lookup (labeled clearly in the UI).
  const hasRealData = !!prediction;
  const baseUplift = hasRealData
    ? Math.round(
        ((prediction!.prediction - (prediction!.prediction_low ?? prediction!.prediction)) /
          (prediction!.prediction_low ?? prediction!.prediction)) *
          100,
      )
    : 0;
  // Scale linearly by year position as a rough proxy for corridor-wide progression
  const uplift = hasRealData
    ? Math.round(baseUplift * density)
    : ILLUSTRATIVE_UPLIFT[year] ?? 0;
  const confidence = hasRealData
    ? Math.round((prediction!.confidence ?? 0.78) * 100)
    : ILLUSTRATIVE_CONF[year] ?? 78;

  // Build nodes from real infra events that have a year
  const nodes = infraEvents
    .filter((e) => e.expected_year != null)
    .map((e) => {
      const pos = NODE_POSITIONS[e.type] ?? {
        cx: 100 + Math.abs(e.id.charCodeAt(0) * 37) % 1000,
        cy: 80 + Math.abs(e.id.charCodeAt(1) * 41) % 340,
      };
      return {
        ...pos,
        year: e.expected_year as number,
        label: e.type.replace("_", " "),
        r: 4,
      };
    })
    .slice(0, 12); // cap for visual clarity

  // Keyboard: arrow keys move year by 1
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        setYear((y) => Math.max(MIN_YEAR, y - 1));
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        setYear((y) => Math.min(MAX_YEAR, y + 1));
        e.preventDefault();
      }
    },
    [],
  );

  // Keep CSS fill variable in sync
  useEffect(() => {
    if (scrubberRef.current) {
      const pct = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
      scrubberRef.current.style.setProperty("--fill", `${pct}%`);
    }
  }, [year]);

  return (
    <div className="relative min-h-[78vh] flex flex-col justify-end overflow-hidden bg-ink">
      {/* Contour background — driven by density */}
      <ContourBackground density={density} />

      {/* Infra nodes overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {nodes.map((n, i) => (
          <InfraNode key={i} {...n} currentYear={year} />
        ))}
      </svg>

      {/* Hero content */}
      <div className="relative z-10 px-6 md:px-12 pb-16 max-w-3xl">
        {/* Eyebrow */}
        <p className="font-mono text-[11px] tracking-[0.12em] text-cyan uppercase mb-5">
          Noida · Greater Noida · Yamuna Expressway · Jewar
        </p>

        {/* Headline */}
        <h1 className="font-display font-medium text-text-hi mb-5 leading-[1.06] tracking-[-0.01em] text-[clamp(34px,5.4vw,56px)]">
          See the property.<br />
          See its{" "}
          <em className="font-voice italic not-italic" style={{ fontStyle: "italic", color: "var(--color-brass-light)" }}>
            next ten years.
          </em>
        </h1>

        {/* Sub-headline */}
        <p className="font-voice italic text-[18px] text-text-mid max-w-lg mb-10 leading-[1.55]">
          Every locality&apos;s approved infrastructure, forecasted price band and
          confidence — sourced, cited, and never a bare number.
        </p>

        {/* Timefold scrubber */}
        <div className="max-w-[560px]">
          <div className="flex items-center gap-4 mb-3">
            <span className="font-mono text-[13px] text-brass-light w-11 shrink-0">
              {year}
            </span>
            <input
              ref={scrubberRef}
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={year}
              step={1}
              className="flex-1 focus-brass"
              aria-label="Drag to project this corridor forward in time"
              aria-valuemin={MIN_YEAR}
              aria-valuemax={MAX_YEAR}
              aria-valuenow={year}
              aria-valuetext={`Year ${year}`}
              onChange={(e) => setYear(Number(e.target.value))}
              onKeyDown={handleKey}
            />
            <span className="font-mono text-[13px] text-text-low w-11 shrink-0 text-right">
              2035
            </span>
          </div>

          <p className="text-[12px] text-text-low mb-6">
            Drag to fold time — infrastructure nodes ignite as they&apos;re approved
          </p>

          {/* Stats */}
          <div className="flex gap-9 flex-wrap">
            <div>
              <div className="text-[11px] text-text-low uppercase tracking-[0.08em] mb-1">
                Projected value uplift
              </div>
              <div className="font-mono text-[22px] font-medium text-brass-light tabular">
                +{uplift}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-text-low uppercase tracking-[0.08em] mb-1">
                Confidence
              </div>
              <div className="font-mono text-base text-cyan tabular">
                {confidence}%
              </div>
            </div>
            {!hasRealData && (
              <div className="flex items-end">
                <span className="text-[10px] text-text-low font-mono italic">
                  illustrative · connect backend for live data
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        className="absolute bottom-5 left-6 md:left-12 flex items-center gap-2 font-mono text-[11px] text-text-low"
        aria-hidden="true"
      >
        <div className="w-px h-5 bg-text-low/40" />
        <span>scroll</span>
      </div>
    </div>
  );
}
