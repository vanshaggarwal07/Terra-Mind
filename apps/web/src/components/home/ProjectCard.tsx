"use client";

import Link from "next/link";
import type { Locality, PredictionEnvelope } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Locality instrument card — name, region, score, price band, proximity chips.
 * Hover: border + lift (no 3D tilt). Shape: surface radius only.
 */

export function ProjectCard({
  locality,
  score,
  priceEnvelope,
  proximityTags = [],
  className,
  featured = false,
}: {
  locality: Locality;
  score?: PredictionEnvelope;
  priceEnvelope?: PredictionEnvelope;
  proximityTags?: string[];
  className?: string;
  featured?: boolean;
}) {
  const scoreVal = score ? Math.round(score.prediction) : null;
  const priceLow = priceEnvelope?.prediction_low;
  const priceHigh = priceEnvelope?.prediction_high;
  const pricePoint = priceEnvelope?.prediction;

  const priceDisplay = (() => {
    if (priceLow && priceHigh) {
      return `${fmtInr(priceLow)} → ${fmtInr(priceHigh)}`;
    }
    if (pricePoint) return fmtInr(pricePoint);
    return null;
  })();

  const region =
    (locality.metadata as Record<string, string>)?.region ?? "NCR Corridor";

  return (
    <Link
      href={`/locality/${locality.id}`}
      className={cn(
        "group relative flex h-full flex-col rounded-surface border border-line-contour bg-ink",
        "p-ds-4 transition-[transform,border-color,background-color,box-shadow] duration-mid ease-out-expo",
        "hover:-translate-y-0.5 hover:border-brass/45 hover:bg-ink-3 hover:shadow-card-hover",
        "active:translate-y-0 active:scale-[0.99] focus-brass",
        featured && "md:p-ds-5",
        className,
      )}
    >
      <div className="mb-ds-4 flex items-start justify-between gap-ds-3">
        <div className="min-w-0">
          <div
            className={cn(
              "font-display font-medium text-text-hi",
              featured ? "text-lg md:text-xl" : "text-[15px]",
            )}
          >
            {locality.name}
          </div>
          <div className="mt-1 text-[12px] text-text-low">{region}</div>
        </div>

        {scoreVal !== null && (
          <div
            className={cn(
              "shrink-0 rounded-surface border border-brass/45 bg-brass-dim",
              "font-mono text-brass-light tabular",
              "flex items-center justify-center",
              featured ? "h-12 w-12 text-base" : "h-10 w-10 text-[13px]",
            )}
            aria-label={`Future Intelligence Score ${scoreVal}`}
          >
            {scoreVal}
          </div>
        )}
      </div>

      {priceDisplay && (
        <div
          className={cn(
            "mb-ds-4 font-mono text-text-hi tabular",
            featured ? "text-base" : "text-[13px]",
          )}
        >
          {priceDisplay}
          {priceEnvelope?.horizon && (
            <span className="ml-ds-2 text-text-low">
              {priceEnvelope.horizon}
            </span>
          )}
        </div>
      )}

      {proximityTags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-ds-2">
          {proximityTags.map((tag) => (
            <span
              key={tag}
              className="rounded-control border border-line-strong px-ds-2 py-0.5 text-[11px] text-text-mid"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <span
        className={cn(
          "mt-ds-4 font-mono text-[11px] text-brass/0 transition-colors duration-fast",
          "group-hover:text-brass-light",
        )}
      >
        Open locality
      </span>
    </Link>
  );
}

function fmtInr(val: number): string {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(0)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}
