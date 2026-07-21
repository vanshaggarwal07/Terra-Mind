"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Locality, PredictionEnvelope } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Corridor card — locality name, region, score badge, price-today, proximity chips.
 * Tilt effect: CSS 3D transform ±6deg on hover (disabled under prefers-reduced-motion).
 * Design system §3.1, §4.
 */
export function ProjectCard({
  locality,
  score,
  priceEnvelope,
  proximityTags = [],
  className,
}: {
  locality: Locality;
  score?: PredictionEnvelope;
  priceEnvelope?: PredictionEnvelope;
  proximityTags?: string[];
  className?: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);

  const scoreVal = score ? Math.round(score.prediction) : null;
  const priceLow = priceEnvelope?.prediction_low;
  const priceHigh = priceEnvelope?.prediction_high;
  const pricePoint = priceEnvelope?.prediction;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (
      !innerRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const r = innerRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * 10; // max ±5deg
    const ry = (px - 0.5) * 10;
    innerRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
  }

  function handleMouseLeave() {
    if (!innerRef.current) return;
    innerRef.current.style.transform = "";
  }

  // Format price range
  const priceDisplay = (() => {
    if (priceLow && priceHigh) {
      const lo = fmtInr(priceLow);
      const hi = fmtInr(priceHigh);
      return `${lo} → ${hi}`;
    }
    if (pricePoint) return fmtInr(pricePoint);
    return null;
  })();

  const region = (locality.metadata as Record<string, string>)?.region ?? "NCR Corridor";

  return (
    <div
      className={cn("perspective-[800px]", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={innerRef}
        className="[transform-style:preserve-3d] transition-[transform,border-color] duration-150"
      >
        <Link
          href={`/locality/${locality.id}`}
          className={cn(
            "block bg-ink border border-cyan/[0.18] rounded-card p-5 h-full",
            "hover:border-brass/50 transition-[border-color] duration-200",
            "focus-brass",
          )}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-display font-medium text-[15px] text-text-hi">
                {locality.name}
              </div>
              <div className="text-[12px] text-text-low mt-0.5">{region}</div>
            </div>
            {scoreVal !== null && (
              <div
                className={cn(
                  "font-mono text-[13px] text-brass",
                  "border border-brass/50 rounded-full",
                  "w-10 h-10 flex items-center justify-center shrink-0",
                )}
                aria-label={`Future Intelligence Score ${scoreVal}`}
              >
                {scoreVal}
              </div>
            )}
          </div>

          {/* Price forecast */}
          {priceDisplay && (
            <div className="font-mono text-[13px] text-text-hi mb-4 tabular">
              {priceDisplay}
              {priceEnvelope?.horizon && (
                <span className="text-text-low ml-1">· {priceEnvelope.horizon}</span>
              )}
            </div>
          )}

          {/* Proximity tags */}
          {proximityTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {proximityTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] text-text-mid border border-white/[0.14] rounded-sm px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}

/** Format INR value to crore / lakh shorthand */
function fmtInr(val: number): string {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000)   return `₹${(val / 1_00_000).toFixed(0)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}
