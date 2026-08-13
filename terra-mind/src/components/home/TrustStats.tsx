"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { Counter } from "@/components/home/Counter";
import { DUMMY_LISTINGS } from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";

const TRUST_ITEMS = [
  "No sign-up required",
  "Corridor-wide coverage",
  "Title checks on file",
  "Free to explore",
];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Corridor aggregates derived from the live listings array — no marketing numbers. */
export function TrustStats({
  listings = DUMMY_LISTINGS,
}: {
  listings?: PropertyListing[];
}) {
  const stats = useMemo(() => {
    const avgGrowth =
      listings.reduce((sum, l) => sum + l.growthPct, 0) / listings.length;
    const avgConfidence =
      listings.reduce((sum, l) => sum + l.confidencePct, 0) / listings.length;
    const medianRate = median(listings.map((l) => l.pricePerSqYd));
    const nearAirport = listings.filter(
      (l) => l.distanceToAirportKm <= 20,
    ).length;

    return [
      {
        value: avgGrowth,
        decimals: 1,
        prefix: "+",
        suffix: "%",
        label: "Avg growth across tracked parcels",
      },
      {
        value: medianRate,
        prefix: "₹",
        suffix: "",
        label: "Median spot rate per sq.yd",
      },
      {
        value: nearAirport,
        suffix: ` of ${listings.length}`,
        label: "Parcels within 20 km of the airport",
      },
      {
        value: avgConfidence,
        suffix: "%",
        label: "Avg valuation confidence",
      },
    ];
  }, [listings]);

  return (
    <section className="border-y border-steel-line bg-panel">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-dim">
              <CheckCircle2 className="size-4 text-growth" strokeWidth={2} />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-steel-line">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="text-center"
            >
              <p className="font-display text-3xl text-foreground md:text-4xl">
                <Counter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </p>
              <p className="mt-1.5 text-[13px] text-dim">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
