"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

import { PriceTrendChart } from "@/components/shared/PriceTrendChart";
import { ProximityBadges } from "@/components/shared/ProximityBadges";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { calculatorHref, formatRate } from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";

interface ParcelCardProps {
  property: PropertyListing;
  index: number;
  onHover: (id: string | null) => void;
}

/**
 * Full-width listing row for /explore. The whole card links to the parcel
 * dossier; hover/focus reports upward so the corridor map can react.
 */
export function ParcelCard({ property, index, onHover }: ParcelCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      layout
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: reduce ? 1 : 0.97,
        transition: { duration: 0.18, delay: 0 },
      }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.055, 0.35),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={reduce ? undefined : { y: -3 }}
      onMouseEnter={() => onHover(property.id)}
      onMouseLeave={() => onHover(null)}
      onFocusCapture={() => onHover(property.id)}
      onBlurCapture={() => onHover(null)}
      className="steel-frame group relative rounded-2xl p-5 transition-shadow duration-300 focus-within:ring-2 focus-within:ring-signal/70 hover:soft-shadow md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <p className="font-data text-[11px] uppercase tracking-[0.2em] text-signal">
            {property.parcelId}
            <span className="ml-2.5 normal-case tracking-normal text-dim">
              Phase {property.expresswayPhase}
            </span>
          </p>
          <h3 className="mt-1.5 font-display text-xl text-foreground md:text-2xl">
            <Link
              href={`/property/${property.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {property.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-dim">
            {property.location} · {property.areaSqYd.toLocaleString("en-IN")} sq.yd
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-data text-lg text-foreground md:text-xl">
            {formatRate(property.pricePerSqYd)}
          </p>
          <div className="mt-1 flex items-center justify-end gap-2.5">
            <PriceTrendChart
              transactions={property.transactions}
              variant="sparkline"
              className="h-7 w-20"
            />
            <p className="font-data text-sm text-growth">
              +{property.growthPct.toFixed(1)}%
            </p>
          </div>
          <p className="mt-1 font-data text-[10px] text-dim">
            modelled uplift, conf {property.confidencePct}%. Estimate, not advice.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-steel-line pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProximityBadges listing={property} variant="compact" />
          <VerificationBadge listing={property} variant="pill" />
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={calculatorHref(property)}
            className="relative z-10 rounded-full px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70"
          >
            Calculate returns
          </Link>
          <span
            className="pointer-events-none inline-flex items-center gap-1 font-data text-xs uppercase tracking-[0.14em] text-foreground"
            aria-hidden
          >
            Dossier
            <ArrowUpRight
              className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              weight="bold"
            />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
