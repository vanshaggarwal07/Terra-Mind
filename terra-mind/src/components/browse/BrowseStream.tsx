"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { BrowseFilters } from "@/components/browse/BrowseFilters";
import { ParcelCard } from "@/components/browse/ParcelCard";
import { PriceAlertForm } from "@/components/forms/PriceAlertForm";
import { logActivity } from "@/lib/activity";
import {
  DEFAULT_FILTERS,
  filterListings,
  formatRate,
  uniqueRegions,
} from "@/lib/listings";
import type { ListingFilters, PropertyListing } from "@/lib/types";

// three.js only ever downloads on desktop viewports where the panel renders.
const CorridorMap = dynamic(
  () => import("@/components/browse/CorridorMap").then((m) => m.CorridorMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="animate-pulse font-data text-xs uppercase tracking-[0.2em] text-dim">
          Preparing corridor view
        </p>
      </div>
    ),
  },
);

interface BrowseStreamProps {
  listings: PropertyListing[];
  source: "sheets" | "fallback";
}

export function BrowseStream({ listings, source }: BrowseStreamProps) {
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const deferredFilters = useDeferredValue(filters);

  const regions = useMemo(() => uniqueRegions(listings), [listings]);
  const visible = useMemo(
    () => filterListings(listings, deferredFilters),
    [listings, deferredFilters],
  );
  const visibleIds = useMemo(() => visible.map((item) => item.id), [visible]);
  const hovered = useMemo(
    () => (hoveredId ? visible.find((item) => item.id === hoveredId) ?? null : null),
    [visible, hoveredId],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    void logActivity({
      action: "filter_change",
      meta: {
        location: filters.location,
        priceMax: filters.priceMax,
        airportMaxKm: filters.airportMaxKm,
        filmCityMaxKm: filters.filmCityMaxKm,
        phase: filters.phase,
        resultCount: visible.length,
      },
    });
  }, [filters, visible.length]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-8">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">
            Corridor parcels
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-dim">
            Land along the Yamuna Expressway, priced per square yard with
            distances to Jewar Airport and the Film City site.
          </p>
        </div>
        <p className="font-data text-xs text-dim">
          <span className="text-foreground">{visible.length}</span> of{" "}
          {listings.length} parcels · source{" "}
          <span className={source === "sheets" ? "text-growth" : "text-signal"}>
            {source === "sheets" ? "Google Sheets" : "survey fallback"}
          </span>
        </p>
      </div>

      <div className="mt-6">
        <BrowseFilters filters={filters} regions={regions} onChange={setFilters} />
      </div>

      <div className="mt-6 grid items-start gap-6 pb-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          {visible.length === 0 ? (
            <div className="steel-frame rounded-2xl px-6 py-20 text-center">
              <p className="font-display text-xl text-foreground">
                No parcels in range
              </p>
              <p className="mt-2 text-sm text-dim">
                Widen the airport distance or raise the price ceiling.
              </p>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-5 rounded-full border border-steel-line bg-panel px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {visible.map((property, index) => (
                  <ParcelCard
                    key={property.id}
                    property={property}
                    index={index}
                    onHover={setHoveredId}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <aside className="sticky top-20 hidden lg:block" aria-label="Corridor map">
          <div className="steel-frame relative overflow-hidden rounded-3xl">
            <div className="h-[calc(100dvh-10.5rem)] min-h-[480px]">
              {isDesktop ? (
                <CorridorMap
                  listings={listings}
                  visibleIds={visibleIds}
                  hoveredId={hoveredId}
                />
              ) : null}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
              <p className="font-data text-[10px] uppercase tracking-[0.2em] text-dim">
                Corridor positions
              </p>
              <p className="font-data text-[10px] text-dim">
                schematic, not to survey scale
              </p>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
              <div className="rounded-xl border border-steel-line bg-panel/90 px-4 py-3 backdrop-blur-sm">
                {hovered ? (
                  <>
                    <p className="font-data text-[11px] uppercase tracking-[0.18em] text-signal">
                      {hovered.parcelId}
                    </p>
                    <div className="mt-1.5 flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm text-foreground">{hovered.name}</p>
                      <p className="shrink-0 font-data text-sm text-foreground">
                        {formatRate(hovered.pricePerSqYd)}
                      </p>
                    </div>
                    <p className="mt-1 font-data text-[11px] text-dim">
                      {hovered.distanceToAirportKm.toFixed(1)} km to Jewar Airport
                      {hovered.distanceToFilmCityKm !== undefined
                        ? ` · ${hovered.distanceToFilmCityKm.toFixed(1)} km to Film City`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="font-data text-[11px] text-dim">
                    Hover a parcel to locate it. Block height tracks the ₹/sq.yd
                    spot rate.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="pb-14">
        <div className="steel-frame grid gap-6 rounded-3xl p-6 md:grid-cols-[1fr_1fr] md:items-center md:p-10">
          <div>
            <h2 className="font-display text-2xl leading-tight text-foreground">
              Not ready to pick a parcel?
            </h2>
            <p className="mt-2 max-w-md text-sm text-dim">
              Leave a number and get one message when tracked rates move.
            </p>
          </div>
          <PriceAlertForm where="explore_stream_end" />
        </div>
      </div>
    </div>
  );
}
