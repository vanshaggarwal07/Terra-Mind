"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { DUMMY_LISTINGS, formatRate } from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Corridor arc in three chapters. "Then" and "Now" are derived from each
 * parcel's transaction ledger; "Next" lists confirmed milestones from the
 * sourced infraTimeline entries. Nothing here is a marketing number.
 */
export function ThenNowNext({
  listings = DUMMY_LISTINGS,
}: {
  listings?: PropertyListing[];
}) {
  const { thenRate, thenLabel, nowRate, growthPct, upcoming } = useMemo(() => {
    const firstTx = listings
      .map((l) => l.transactions[0])
      .filter(Boolean);
    const lastTx = listings
      .map((l) => l.transactions[l.transactions.length - 1])
      .filter(Boolean);

    const thenRate = median(firstTx.map((t) => t.rate));
    const nowRate = median(lastTx.map((t) => t.rate));
    const earliestDate = firstTx.map((t) => t.date).sort()[0];

    const currentYear = new Date().getFullYear();
    const seen = new Map<
      string,
      { year: number; event: string; source: string }
    >();
    for (const listing of listings) {
      for (const item of listing.infraTimeline) {
        if (item.year <= currentYear) continue;
        const key = `${item.year}-${item.event}`;
        if (!seen.has(key)) seen.set(key, item);
      }
    }
    const upcoming = [...seen.values()]
      .sort((a, b) => a.year - b.year)
      .slice(0, 3);

    return {
      thenRate,
      thenLabel: earliestDate,
      nowRate,
      growthPct: ((nowRate - thenRate) / thenRate) * 100,
      upcoming,
    };
  }, [listings]);

  const columns = [
    {
      key: "then",
      title: "Then",
      body: (
        <>
          <p className="font-data text-2xl text-foreground md:text-3xl">
            {formatRate(thenRate)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Median first-recorded rate across tracked parcels, earliest ledger
            entry {thenLabel}. Farm-edge land priced before the airport opened.
          </p>
        </>
      ),
    },
    {
      key: "now",
      title: "Now",
      body: (
        <>
          <p className="font-data text-2xl text-growth md:text-3xl">
            {formatRate(nowRate)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Median latest registered rate, up{" "}
            <span className="text-growth">+{growthPct.toFixed(1)}%</span> over
            the same ledgers. Runway operations and sector roads are live.
          </p>
        </>
      ),
    },
    {
      key: "next",
      title: "Next",
      body: (
        <ul className="space-y-3">
          {upcoming.map((item) => (
            <li key={`${item.year}-${item.event}`}>
              <p className="font-data text-sm text-signal">{item.year}</p>
              <p className="mt-0.5 text-sm leading-snug text-foreground">
                {item.event}
              </p>
              <p className="mt-0.5 font-data text-[11px] uppercase tracking-[0.1em] text-dim">
                {item.source}
              </p>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
      <div className="max-w-xl">
        <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
          Then, now, next.
        </h2>
        <p className="mt-3 text-base text-dim">
          The corridor&apos;s arc, read straight from parcel ledgers and sourced
          infrastructure filings.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-steel-line">
        {columns.map((col, i) => (
          <motion.div
            key={col.key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="border-t border-steel-line pt-5 md:border-t-0 md:px-8 md:pt-0 md:first:pl-0 md:last:pr-0"
          >
            <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
              {col.title}
            </p>
            <div className="mt-4">{col.body}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
