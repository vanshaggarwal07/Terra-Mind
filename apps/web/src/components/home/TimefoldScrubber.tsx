"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ContourBackground } from "./ContourBackground";
import { InfraNode } from "./InfraNode";
import type { InfraEvent, PredictionEnvelope } from "@/lib/api";

const MIN_YEAR = 2026;
const MAX_YEAR = 2035;

/**
 * Hero — asymmetric instrument: copy + Timefold scrubber over full-bleed contours.
 * Signature load via GSAP. Scrubber is the product interaction.
 * Hero text stack: eyebrow · headline · subtext · CTA group (max 4).
 */

const NODE_POSITIONS: Record<string, { cx: number; cy: number }> = {
  metro: { cx: 230, cy: 150 },
  airport: { cx: 880, cy: 170 },
  expressway: { cx: 580, cy: 130 },
  expressway_rrts: { cx: 740, cy: 260 },
  road: { cx: 420, cy: 220 },
  railway: { cx: 1000, cy: 300 },
  industrial_zone: { cx: 1080, cy: 200 },
  commercial_zone: { cx: 640, cy: 360 },
  residential_zone: { cx: 360, cy: 330 },
  park: { cx: 950, cy: 90 },
};

/** Shown when API returns no dated infra events — labeled illustrative in UI. */
const FALLBACK_NODES = [
  { cx: 230, cy: 150, year: 2027, label: "metro", r: 4 },
  { cx: 580, cy: 130, year: 2028, label: "expressway", r: 4 },
  { cx: 880, cy: 170, year: 2030, label: "airport", r: 4 },
  { cx: 740, cy: 260, year: 2031, label: "rrts", r: 4 },
  { cx: 420, cy: 220, year: 2029, label: "road", r: 4 },
  { cx: 640, cy: 360, year: 2032, label: "commercial", r: 4 },
];

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
  const rootRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const density = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);

  const hasRealData = !!prediction;
  const baseUplift = hasRealData
    ? Math.round(
        ((prediction!.prediction -
          (prediction!.prediction_low ?? prediction!.prediction)) /
          (prediction!.prediction_low ?? prediction!.prediction)) *
          100,
      )
    : 0;
  const uplift = hasRealData
    ? Math.round(baseUplift * density)
    : (ILLUSTRATIVE_UPLIFT[year] ?? 0);
  const confidence = hasRealData
    ? Math.round((prediction!.confidence ?? 0.78) * 100)
    : (ILLUSTRATIVE_CONF[year] ?? 78);

  const fromApi = infraEvents
    .filter((e) => e.expected_year != null)
    .map((e) => {
      const pos = NODE_POSITIONS[e.type] ?? {
        cx: 100 + (Math.abs(e.id.charCodeAt(0) * 37) % 1000),
        cy: 80 + (Math.abs(e.id.charCodeAt(1) * 41) % 340),
      };
      return {
        ...pos,
        year: e.expected_year as number,
        label: e.type.replace(/_/g, " "),
        r: 4,
      };
    })
    .slice(0, 12);

  const nodes = fromApi.length > 0 ? fromApi : FALLBACK_NODES;
  const usingFallbackNodes = fromApi.length === 0;

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      setYear((y) => Math.max(MIN_YEAR, y - 1));
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      setYear((y) => Math.min(MAX_YEAR, y + 1));
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    if (scrubberRef.current) {
      const pct = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
      scrubberRef.current.style.setProperty("--fill", `${pct}%`);
    }
  }, [year]);

  // Signature load: contours → copy → instrument
  useEffect(() => {
    if (!rootRef.current) return;

    if (reduceMotion) {
      gsap.set(rootRef.current.querySelectorAll("[data-hero]"), {
        opacity: 1,
        y: 0,
      });
      gsap.set(rootRef.current.querySelectorAll(".contour-path"), {
        strokeDashoffset: 0,
      });
      return;
    }

    const ctx = gsap.context(() => {
      const paths = gsap.utils.toArray<SVGPathElement>(".contour-path");
      paths.forEach((path) => {
        const len = path.getTotalLength?.() ?? 2000;
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      });

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.to(paths, {
        strokeDashoffset: 0,
        duration: 1.4,
        stagger: 0.08,
        ease: "power2.out",
      }, 0);

      tl.fromTo(
        "[data-hero='eyebrow']",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5 },
        0.35,
      );
      tl.fromTo(
        "[data-hero='line']",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.08 },
        0.45,
      );
      tl.fromTo(
        "[data-hero='sub']",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55 },
        0.7,
      );
      tl.fromTo(
        "[data-hero='instrument']",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7 },
        0.85,
      );
      tl.fromTo(
        "[data-hero='cta']",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5 },
        1.05,
      );
    }, rootRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <section
      ref={rootRef}
      className="relative min-h-[calc(100dvh-var(--nav-h))] overflow-hidden bg-ink"
      aria-label="Corridor timefold"
    >
      <ContourBackground density={density} animateOnMount={false} />

      <svg
        className="absolute inset-0 z-[1] h-full w-full pointer-events-none"
        viewBox="0 0 1200 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {nodes.map((n, i) => (
          <InfraNode key={`${n.label}-${i}`} {...n} currentYear={year} />
        ))}
      </svg>

      {/* Soft left scrim so type stays readable over the map field */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-ink via-ink/80 to-transparent md:via-ink/55 md:to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-raised mx-auto grid min-h-[calc(100dvh-var(--nav-h))] max-w-content grid-cols-1 items-end px-ds-5 pb-ds-6 pt-ds-4 md:px-ds-7 md:pb-ds-7 lg:grid-cols-12 lg:items-center lg:pt-ds-4">
        <div className="lg:col-span-6 xl:col-span-5">
          {/* 1. Eyebrow */}
          <p
            data-hero="eyebrow"
            className="mb-ds-4 font-mono text-[11px] uppercase tracking-[0.14em] text-brass opacity-0"
          >
            Noida to Jewar corridor
          </p>

          {/* 2. Headline — 2 lines, italic descender clearance */}
          <h1 className="mb-ds-4 font-display text-[clamp(2.125rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.01em] text-text-hi">
            <span data-hero="line" className="block opacity-0">
              See the property.
            </span>
            <span data-hero="line" className="block pb-1 opacity-0">
              See its{" "}
              <em className="italic text-brass-light">
                next ten years.
              </em>
            </span>
          </h1>

          {/* 3. Subtext — ≤20 words */}
          <p
            data-hero="sub"
            className="mb-ds-6 max-w-[36ch] font-display text-base leading-relaxed text-text-mid opacity-0 md:text-[17px]"
          >
            Approved infrastructure, forecast bands, and confidence - sourced and cited.
          </p>

          {/* Instrument: Timefold (signature interaction) */}
          <div
            data-hero="instrument"
            className="mb-ds-6 max-w-md rounded-surface border border-line-strong bg-ink-2/70 p-ds-4 opacity-0 backdrop-blur-sm supports-[backdrop-filter]:bg-ink-2/50"
          >
            <div className="mb-ds-3 flex items-center justify-between gap-ds-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
                Timefold
              </span>
              {(usingFallbackNodes || !hasRealData) && (
                <span className="font-mono text-[10px] text-text-faint">
                  illustrative
                </span>
              )}
            </div>

            <div className="mb-ds-4 flex items-center gap-ds-3">
              <span className="w-11 shrink-0 font-mono text-[13px] text-brass-light tabular">
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
                aria-label="Project this corridor forward in time"
                aria-valuemin={MIN_YEAR}
                aria-valuemax={MAX_YEAR}
                aria-valuenow={year}
                aria-valuetext={`Year ${year}`}
                onChange={(e) => setYear(Number(e.target.value))}
                onKeyDown={handleKey}
              />
              <span className="w-11 shrink-0 text-right font-mono text-[13px] text-text-low tabular">
                {MAX_YEAR}
              </span>
            </div>

            <div className="flex flex-wrap gap-ds-6">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-text-low">
                  Value uplift
                </div>
                <div className="font-mono text-[22px] font-medium text-brass-light tabular">
                  +{uplift}%
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-text-low">
                  Confidence
                </div>
                <div className="font-mono text-base text-text-hi tabular">
                  {confidence}%
                </div>
              </div>
            </div>
          </div>

          {/* 4. CTA — browse lives in corridor rail (no duplicate intent) */}
          <div data-hero="cta" className="flex flex-wrap items-center gap-ds-3 opacity-0">
            <Link href="/copilot" className="btn-primary focus-brass">
              Ask the copilot
            </Link>
          </div>
        </div>

        {/* Right column spacer — map field breathes on desktop */}
        <div className="pointer-events-none hidden lg:col-span-6 xl:col-span-7 lg:block" aria-hidden="true" />
      </div>
    </section>
  );
}
