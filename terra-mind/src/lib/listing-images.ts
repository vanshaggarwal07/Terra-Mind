import type { PropertyListing } from "@/lib/types";

/** imageHint → bundled corridor photography in /public/marketing. */
const HINT_TO_IMAGE: Record<string, string> = {
  "expressway-edge": "/marketing/hero-expressway.jpg",
  "airport-approach": "/marketing/hero-airport.jpg",
  "urban-grid": "/marketing/region-urban.jpg",
  "survey-field": "/marketing/hero-plots.jpg",
  industrial: "/marketing/region-industrial.jpg",
  junction: "/marketing/region-expressway.jpg",
};

const DEFAULT_IMAGE = "/marketing/hero-township.jpg";

export interface ListingImage {
  src: string;
  alt: string;
  /** True when this is corridor stock imagery, not a photo of the parcel. */
  representative: boolean;
}

/**
 * Per-listing gallery images. Uses the listing's own `images` when supplied
 * (via sheet or data), otherwise falls back to corridor photography mapped
 * from `imageHint` — clearly labelled as representative, never passed off
 * as parcel photos.
 */
export function listingImages(listing: PropertyListing): ListingImage[] {
  if (listing.images && listing.images.length > 0) {
    return listing.images.map((image) => ({ ...image, representative: false }));
  }

  const primary = HINT_TO_IMAGE[listing.imageHint] ?? DEFAULT_IMAGE;
  return [
    {
      src: primary,
      alt: `Representative corridor view near ${listing.locality}`,
      representative: true,
    },
  ];
}
