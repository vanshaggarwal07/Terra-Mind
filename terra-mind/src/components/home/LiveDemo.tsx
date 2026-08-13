"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, TrendingUp, ShieldCheck } from "lucide-react";

import { LinkButton } from "@/components/shared/LinkButton";
import { DUMMY_LISTINGS, formatRate, uniqueRegions } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function LiveDemo() {
  const regions = useMemo(() => uniqueRegions(DUMMY_LISTINGS), []);
  const [activeRegion, setActiveRegion] = useState<string>("All");
  const [selectedId, setSelectedId] = useState(DUMMY_LISTINGS[0].id);

  const visible = useMemo(
    () =>
      activeRegion === "All"
        ? DUMMY_LISTINGS
        : DUMMY_LISTINGS.filter((item) => item.region === activeRegion),
    [activeRegion],
  );

  const selected =
    visible.find((item) => item.id === selectedId) ?? visible[0] ?? DUMMY_LISTINGS[0];

  return (
    <section className="border-y border-steel-line bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-medium text-signal">Live preview</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-foreground md:text-4xl">
            Try it before you commit.
          </h2>
          <p className="mt-3 text-base text-dim">
            Filter, compare, and shortlist corridor parcels in real time. No account
            needed.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mt-10 overflow-hidden rounded-3xl border border-steel-line bg-panel soft-shadow"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-steel-line p-4">
            {["All", ...regions].map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setActiveRegion(region)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  activeRegion === region
                    ? "bg-foreground text-background"
                    : "bg-secondary text-dim hover:text-foreground active:text-foreground",
                )}
              >
                {region}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <ul className="max-h-[420px] divide-y divide-steel-line overflow-y-auto">
              {visible.map((listing) => (
                <li key={listing.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(listing.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors",
                      selected.id === listing.id ? "bg-secondary" : "hover:bg-secondary/60",
                    )}
                  >
                    <div>
                      <p className="font-medium text-foreground">{listing.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-dim">
                        <MapPin className="size-3.5" strokeWidth={2} />
                        {listing.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-data text-sm text-foreground">
                        {formatRate(listing.pricePerSqYd)}
                      </p>
                      <p className="mt-0.5 text-[13px] text-growth">
                        +{listing.growthPct.toFixed(1)}%
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-steel-line p-6 md:border-l md:border-t-0">
              {selected ? (
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-data text-xs text-dim">{selected.parcelId}</p>
                      <h3 className="mt-1 font-display text-xl text-foreground">
                        {selected.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-growth-tint px-2.5 py-1 text-xs font-medium text-growth">
                      {selected.confidencePct}% confidence
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-secondary/60 p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-dim">
                        Spot rate
                      </p>
                      <p className="mt-1 font-data text-lg text-foreground">
                        {formatRate(selected.pricePerSqYd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-dim">
                        Uplift band
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-data text-lg text-growth">
                        <TrendingUp className="size-4" strokeWidth={2.25} />
                        {selected.growthPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-dim">
                    {selected.valuationNote}
                  </p>

                  <div className="mt-4 space-y-2">
                    {selected.infraTimeline.slice(0, 2).map((item) => (
                      <div
                        key={`${item.year}-${item.event}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="mt-0.5 font-data text-xs text-signal">
                          {item.year}
                        </span>
                        <span className="text-dim">{item.event}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-[13px] text-dim">
                    <ShieldCheck className="size-4 text-growth" strokeWidth={2} />
                    Verified parcel, corridor phase {selected.expresswayPhase}
                  </div>

                  <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row">
                    <LinkButton
                      href={`/property/${selected.id}`}
                      className="h-11 flex-1 bg-foreground text-background hover:bg-foreground/85"
                    >
                      Open full dossier
                    </LinkButton>
                    <LinkButton
                      href={`/enquire?property=${selected.id}`}
                      variant="outline"
                      className="h-11 border-steel-line text-foreground hover:bg-secondary"
                    >
                      Book call
                    </LinkButton>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-steel-line px-5 py-3 text-[13px] text-dim">
            <span>{visible.length} parcels available</span>
            <LinkButton href="/explore" variant="ghost" size="sm" className="text-foreground">
              Open full corridor browse
            </LinkButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
