"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { listLocalities, getScore, getPrediction } from "@/lib/api";
import type { Locality, PredictionEnvelope } from "@/lib/api";
import { ProjectCard } from "./ProjectCard";
import { cn } from "@/lib/cn";

/**
 * Corridor rail — horizontal scroll-snap of locality instruments.
 * Layout family distinct from hero (asymmetric split): snap corridor.
 * Reveal: Motion whileInView (not GSAP — no pin/scrub here).
 * No section eyebrow (hero already used one).
 */

const SHOW_LIMIT = 8;

export function CorridorRail() {
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [scores, setScores] = useState<Record<string, PredictionEnvelope>>({});
  const [prices, setPrices] = useState<Record<string, PredictionEnvelope>>({});
  const [loaded, setLoaded] = useState(false);
  const reduce = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listLocalities(12)
      .then(async (locs) => {
        setLocalities(locs);
        const scoreResults = await Promise.allSettled(
          locs.map((l) => getScore(l.id)),
        );
        const priceResults = await Promise.allSettled(
          locs.map((l) => getPrediction("price", { localityId: l.id })),
        );
        const s: Record<string, PredictionEnvelope> = {};
        const p: Record<string, PredictionEnvelope> = {};
        locs.forEach((l, i) => {
          if (scoreResults[i].status === "fulfilled") {
            s[l.id] = (
              scoreResults[i] as PromiseFulfilledResult<PredictionEnvelope>
            ).value;
          }
          if (priceResults[i].status === "fulfilled") {
            p[l.id] = (
              priceResults[i] as PromiseFulfilledResult<PredictionEnvelope>
            ).value;
          }
        });
        setScores(s);
        setPrices(p);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <section className="bg-ink-2 px-ds-5 py-ds-8 md:px-ds-7" aria-busy="true">
        <div className="mx-auto max-w-content">
          <div className="mb-ds-6 h-7 w-48 animate-pulse rounded-control bg-ink-3" />
          <div className="flex gap-ds-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-44 w-[280px] shrink-0 animate-pulse rounded-surface border border-line bg-ink-3"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (localities.length === 0) {
    return (
      <section className="bg-ink-2 px-ds-5 py-ds-8 md:px-ds-7">
        <div className="mx-auto max-w-content">
          <h2 className="mb-ds-3 font-display text-xl font-medium text-text-hi md:text-2xl">
            Upcoming in the corridor
          </h2>
          <p className="max-w-[50ch] text-sm text-text-low">
            No localities found. Seed the database or connect to the backend.
          </p>
        </div>
      </section>
    );
  }

  const visible = localities.slice(0, SHOW_LIMIT);
  const hasMore = localities.length > SHOW_LIMIT;

  return (
    <section className="bg-ink-2 py-ds-8 md:py-ds-9">
      <div className="mx-auto max-w-content px-ds-5 md:px-ds-7">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-ds-6 max-w-xl"
        >
          <h2 className="font-display text-xl font-medium text-text-hi md:text-2xl">
            Upcoming in the corridor
          </h2>
          <p className="mt-ds-2 text-sm text-text-mid md:text-base">
            Tracked sectors with score and forecast band.
          </p>
        </motion.div>
      </div>

      {/* Horizontal snap corridor — edge-to-edge scroll, padded track */}
      <div
        ref={scrollerRef}
        className={cn(
          "flex gap-ds-3 overflow-x-auto px-ds-5 pb-ds-2 md:px-ds-7",
          "snap-x snap-mandatory scrollbar-thin",
          "scroll-px-ds-5 md:scroll-px-ds-7",
        )}
      >
        {visible.map((loc, i) => {
          const featured = i === 0;
          return (
            <motion.div
              key={loc.id}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.55,
                delay: reduce ? 0 : Math.min(i, 5) * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                "snap-start shrink-0",
                featured
                  ? "w-[min(100%,22rem)] sm:w-[28rem]"
                  : "w-[min(100%,18rem)] sm:w-[20rem]",
              )}
            >
              <ProjectCard
                locality={loc}
                score={scores[loc.id]}
                priceEnvelope={prices[loc.id]}
                proximityTags={getProximityTags(loc)}
                featured={featured}
                className="min-h-[11.5rem]"
              />
            </motion.div>
          );
        })}

        {/* End cap — full list (single browse intent for this section) */}
        {(hasMore || localities.length > 0) && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="snap-start flex w-[12rem] shrink-0 items-stretch sm:w-[14rem]"
          >
            <Link
              href="/localities"
              className={cn(
                "flex w-full flex-col justify-center rounded-surface border border-dashed border-line-strong",
                "bg-ink/40 px-ds-4 py-ds-5 transition-[border-color,background-color] duration-mid ease-out-expo",
                "hover:border-brass/40 hover:bg-brass-dim focus-brass",
              )}
            >
              <span className="font-display text-sm font-medium text-text-hi">
                View full list
              </span>
              <span className="mt-ds-2 font-mono text-[11px] text-text-low">
                {localities.length} localities
              </span>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function getProximityTags(loc: Locality): string[] {
  const meta = (loc.metadata ?? {}) as Record<string, unknown>;
  const tags: string[] = [];
  if (meta.metro_approved) tags.push("Metro approved");
  if (meta.airport_proximity) tags.push("Airport nearby");
  if (meta.expressway) tags.push("Expressway");
  if (meta.tags && Array.isArray(meta.tags)) {
    tags.push(...(meta.tags as string[]).slice(0, 3));
  }
  return tags.slice(0, 3);
}
