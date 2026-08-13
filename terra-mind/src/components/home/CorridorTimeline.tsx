"use client";

import { motion } from "framer-motion";
import { Airplane } from "@phosphor-icons/react";

import { DUMMY_LISTINGS } from "@/lib/listings";

function buildTimeline() {
  const seen = new Map<string, { year: number; event: string; source: string }>();
  for (const listing of DUMMY_LISTINGS) {
    for (const item of listing.infraTimeline) {
      const key = `${item.year}-${item.event}`;
      if (!seen.has(key)) seen.set(key, item);
    }
  }
  return [...seen.values()].sort((a, b) => a.year - b.year).slice(0, 6);
}

const MILESTONES = buildTimeline();

export function CorridorTimeline() {
  return (
    <section className="border-y border-steel-line bg-panel">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
              The corridor on a timeline, not a guess.
            </h2>
            <p className="mt-3 text-base text-dim">
              Real infrastructure milestones pulled from tracked parcels, in the
              order they land. Sequence drives every valuation on this site.
            </p>
          </div>
          <Airplane className="hidden size-8 shrink-0 text-signal md:block" weight="fill" />
        </div>

        <div className="mt-14 overflow-x-auto pb-2">
          <div className="relative flex min-w-[640px] gap-0 md:min-w-0">
            <div
              className="absolute left-0 right-0 top-[7px] h-px bg-steel-line"
              aria-hidden
            />
            <motion.div
              className="absolute left-0 top-[6px] h-[3px] bg-signal"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              aria-hidden
            />
            {MILESTONES.map((item, i) => (
              <motion.div
                key={`${item.year}-${item.event}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative flex-1 px-3 first:pl-0 last:pr-0"
              >
                <span className="relative z-10 block size-3.5 border-2 border-signal bg-background" />
                <p className="mt-4 font-data text-sm text-signal">{item.year}</p>
                <p className="mt-1.5 max-w-[13rem] text-sm leading-snug text-foreground">
                  {item.event}
                </p>
                <p className="mt-1.5 font-data text-[11px] uppercase tracking-[0.1em] text-dim">
                  {item.source}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
