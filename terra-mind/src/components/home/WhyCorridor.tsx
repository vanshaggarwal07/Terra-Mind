import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FlightPath, FlightPathLegend } from "@/components/hero/FlightPath";
import type { PropertyListing } from "@/lib/types";

interface WhyCorridorProps {
  listings: PropertyListing[];
}

/**
 * The airport + Film City adjacency story, built around the scroll-drawn
 * corridor route. All numbers are derived from the live listings array.
 */
export function WhyCorridor({ listings }: WhyCorridorProps) {
  const nearestAirportKm = Math.min(
    ...listings.map((l) => l.distanceToAirportKm),
  );
  const filmCityDistances = listings
    .map((l) => l.distanceToFilmCityKm)
    .filter((v): v is number => v !== undefined);
  const nearestFilmCityKm =
    filmCityDistances.length > 0 ? Math.min(...filmCityDistances) : null;
  const within20 = listings.filter((l) => l.distanceToAirportKm <= 20).length;

  const stats = [
    {
      label: "Nearest tracked parcel to the runway",
      value: `${nearestAirportKm.toFixed(1)} km`,
    },
    ...(nearestFilmCityKm !== null
      ? [
          {
            label: "Nearest parcel to the Film City site",
            value: `${nearestFilmCityKm.toFixed(1)} km`,
          },
        ]
      : []),
    {
      label: "Parcels within 20 km of the airport",
      value: `${within20} of ${listings.length}`,
    },
  ];

  return (
    <section className="border-y border-steel-line bg-panel">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:py-28">
        <div>
          <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
            Why this corridor
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-dim">
            Two anchor projects sit at the south end of the Yamuna Expressway:
            Noida International Airport at Jewar and the planned Film City in
            YEIDA Sector 21. Every parcel tracked here is priced against its
            distance to both.
          </p>

          <dl className="mt-8 max-w-lg divide-y divide-steel-line border-y border-steel-line">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-baseline justify-between gap-4 py-3.5"
              >
                <dt className="text-sm text-dim">{stat.label}</dt>
                <dd className="font-data text-base text-foreground">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <Link
            href="/explore"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-signal transition-colors hover:text-foreground"
          >
            See parcels near the airport
            <ArrowRight className="size-4" strokeWidth={2.25} />
          </Link>
        </div>

        <div className="steel-frame relative overflow-hidden rounded-3xl p-6 md:p-8">
          <div
            className="pointer-events-none absolute inset-0 survey-hatch opacity-30"
            aria-hidden
          />
          <FlightPath className="relative h-[360px] w-full md:h-[440px]" />
          <div className="relative mt-4 flex items-center justify-between">
            <p className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
              Noida to Jewar route
            </p>
            <FlightPathLegend />
          </div>
        </div>
      </div>
    </section>
  );
}
