"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { BrowseFilters } from "@/components/browse/BrowseFilters";
import { PriceAlertForm } from "@/components/forms/PriceAlertForm";
import { PropertyUnfold } from "@/components/unfold/PropertyUnfold";
import { logActivity } from "@/lib/activity";
import {
  DEFAULT_FILTERS,
  filterListings,
  uniqueRegions,
} from "@/lib/listings";
import type { ListingFilters, PropertyListing } from "@/lib/types";

interface BrowseStreamProps {
  listings: PropertyListing[];
  source: "sheets" | "fallback";
}

export function BrowseStream({ listings, source }: BrowseStreamProps) {
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const deferredFilters = useDeferredValue(filters);

  const regions = useMemo(() => uniqueRegions(listings), [listings]);
  const visible = useMemo(
    () => filterListings(listings, deferredFilters),
    [listings, deferredFilters],
  );

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
    <div>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
              Browse / unfold stream
            </p>
            <h1 className="mt-2 font-display text-3xl text-foreground md:text-4xl">
              Corridor parcels
            </h1>
            <p className="mt-2 max-w-xl text-sm text-dim">
              Each parcel pins center-stage. Scroll to peel the cover and swing open
              the four instrument panels — valuation, infra, ledger, enquire.
            </p>
          </div>
          <p className="font-data text-xs text-dim">
            Source ·{" "}
            <span className={source === "sheets" ? "text-growth" : "text-signal"}>
              {source === "sheets" ? "Google Sheets" : "Survey fallback"}
            </span>
            {" · "}
            <span className="text-foreground">{visible.length}</span> matches
          </p>
        </div>

        <BrowseFilters
          filters={filters}
          regions={regions}
          onChange={setFilters}
        />
      </div>

      {visible.length === 0 ? (
        <div className="mx-auto max-w-6xl px-4 py-24 text-center md:px-6">
          <p className="font-display text-xl text-foreground">No parcels in range</p>
          <p className="mt-2 text-sm text-dim">
            Widen airport distance or raise the price ceiling.
          </p>
        </div>
      ) : (
        visible.map((property, index) => (
          <PropertyUnfold
            key={property.id}
            property={property}
            index={index}
            scrollLength="280%"
          />
        ))
      )}

      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
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
