"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { listLocalities, getScore, getPrediction } from "@/lib/api";
import type { Locality, PredictionEnvelope } from "@/lib/api";
import { ProjectCard } from "./ProjectCard";

/**
 * "Upcoming in the corridor" card rail.
 * Data: real localities from /localities + score from /score + price from /predictions/price.
 * Scroll-reveal: IntersectionObserver, staggered opacity/translateY — disabled under
 * prefers-reduced-motion.
 */
export function CorridorRail() {
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [scores, setScores] = useState<Record<string, PredictionEnvelope>>({});
  const [prices, setPrices] = useState<Record<string, PredictionEnvelope>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listLocalities(12)
      .then(async (locs) => {
        setLocalities(locs);
        // Fetch score + price for each locality in parallel (best-effort)
        const scoreResults = await Promise.allSettled(
          locs.map((l) => getScore(l.id)),
        );
        const priceResults = await Promise.allSettled(
          locs.map((l) => getPrediction("price", { localityId: l.id })),
        );
        const s: Record<string, PredictionEnvelope> = {};
        const p: Record<string, PredictionEnvelope> = {};
        locs.forEach((l, i) => {
          if (scoreResults[i].status === "fulfilled") s[l.id] = (scoreResults[i] as PromiseFulfilledResult<PredictionEnvelope>).value;
          if (priceResults[i].status === "fulfilled") p[l.id] = (priceResults[i] as PromiseFulfilledResult<PredictionEnvelope>).value;
        });
        setScores(s);
        setPrices(p);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <section className="px-6 md:px-12 py-16 bg-ink-2">
        <p className="font-mono text-xs text-text-low">Loading corridor data…</p>
      </section>
    );
  }

  if (localities.length === 0) {
    return (
      <section className="px-6 md:px-12 py-16 bg-ink-2">
        <p className="text-text-low text-sm">
          No localities found. Seed the database or connect to the backend.
        </p>
      </section>
    );
  }

  return (
    <section className="px-6 md:px-12 py-16 bg-ink-2">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-8">
        <h2 className="font-display font-medium text-[22px] text-text-hi">
          Upcoming in the corridor
        </h2>
        <Link
          href="/localities"
          className="text-[13px] text-cyan hover:text-cyan/80 transition-colors focus-brass"
        >
          See all localities →
        </Link>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {localities.map((loc, i) => (
          <RevealCard key={loc.id} index={i}>
            <ProjectCard
              locality={loc}
              score={scores[loc.id]}
              priceEnvelope={prices[loc.id]}
              proximityTags={getProximityTags(loc)}
            />
          </RevealCard>
        ))}
      </div>
    </section>
  );
}

/** Wraps a card in a scroll-reveal observer */
function RevealCard({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: reducedMotion ? "0ms" : `${index * 60}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: reducedMotion ? "none" : "opacity 0.55s ease, transform 0.55s ease",
      }}
    >
      {children}
    </div>
  );
}

/** Extract readable proximity tags from locality metadata */
function getProximityTags(loc: Locality): string[] {
  const meta = (loc.metadata ?? {}) as Record<string, unknown>;
  const tags: string[] = [];
  if (meta.metro_approved) tags.push("Metro approved");
  if (meta.airport_proximity) tags.push("Airport nearby");
  if (meta.expressway) tags.push("Expressway");
  if (meta.tags && Array.isArray(meta.tags)) tags.push(...(meta.tags as string[]).slice(0, 3));
  return tags.slice(0, 3);
}
