import { AirplaneTakeoff, FilmSlate } from "@phosphor-icons/react/dist/ssr";

import {
  driveTimeToAirport,
  driveTimeToFilmCity,
} from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProximityBadgesProps {
  listing: PropertyListing;
  /** compact: icon + km only. full: km + drive time. */
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Airport + Film City proximity badges. Drive times prefixed with "~" are
 * estimates from corridor average speed; unprefixed times are measured.
 */
export function ProximityBadges({
  listing,
  variant = "full",
  className,
}: ProximityBadgesProps) {
  const airport = driveTimeToAirport(listing);
  const filmCity = driveTimeToFilmCity(listing);

  const badgeClass =
    "inline-flex items-center gap-1.5 rounded-full border border-steel-line bg-panel px-2.5 py-1 font-data text-[11px] text-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className={badgeClass}>
        <AirplaneTakeoff className="size-3.5 text-signal" aria-hidden />
        <span className="sr-only">Distance to Jewar Airport:</span>
        {listing.distanceToAirportKm.toFixed(1)} km
        {variant === "full" && (
          <span className="text-dim">
            · {airport.estimated ? "~" : ""}
            {airport.minutes} min
          </span>
        )}
        <span className="text-dim">Jewar Airport</span>
      </span>

      {listing.distanceToFilmCityKm !== undefined && (
        <span className={badgeClass}>
          <FilmSlate className="size-3.5 text-signal" aria-hidden />
          <span className="sr-only">Distance to Film City site:</span>
          {listing.distanceToFilmCityKm.toFixed(1)} km
          {variant === "full" && filmCity && (
            <span className="text-dim">
              · {filmCity.estimated ? "~" : ""}
              {filmCity.minutes} min
            </span>
          )}
          <span className="text-dim">Film City</span>
        </span>
      )}
    </div>
  );
}
