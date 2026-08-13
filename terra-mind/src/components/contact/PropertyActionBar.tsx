"use client";

import { WhatsAppButton } from "@/components/contact/ContactButtons";
import { LinkButton } from "@/components/shared/LinkButton";
import { listingEnquiryMessage } from "@/lib/contact";
import { formatRate } from "@/lib/listings";
import type { PropertyListing } from "@/lib/types";

interface PropertyActionBarProps {
  property: Pick<
    PropertyListing,
    "id" | "name" | "parcelId" | "pricePerSqYd" | "distanceToAirportKm"
  >;
}

/** Mobile-only sticky bottom bar on property pages: price + one-tap contact. */
export function PropertyActionBar({ property }: PropertyActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-steel-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-data text-[10px] uppercase tracking-[0.16em] text-dim">
            Spot rate
          </p>
          <p className="truncate font-data text-sm text-foreground">
            {formatRate(property.pricePerSqYd)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WhatsAppButton
            message={listingEnquiryMessage(property)}
            where="property_action_bar"
            propertyId={property.id}
            className="h-11 bg-signal px-4 text-background hover:bg-signal/90"
          >
            WhatsApp
          </WhatsAppButton>
          <LinkButton
            href={`/enquire?property=${property.id}`}
            variant="outline"
            className="h-11 border-steel-line px-4 text-foreground hover:bg-secondary"
          >
            Enquire
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
