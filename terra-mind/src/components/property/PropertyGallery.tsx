import Image from "next/image";

import { listingImages } from "@/lib/listing-images";
import type { PropertyListing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PropertyGalleryProps {
  listing: PropertyListing;
  className?: string;
}

/**
 * Per-listing image gallery. Uses listing.images when supplied; otherwise a
 * representative corridor photograph mapped from imageHint, labelled as such.
 */
export function PropertyGallery({ listing, className }: PropertyGalleryProps) {
  const images = listingImages(listing);
  const [primary, ...rest] = images;
  const isRepresentative = images.some((image) => image.representative);

  return (
    <figure className={className}>
      <div
        className={cn(
          "grid gap-2",
          rest.length > 0 && "md:grid-cols-[2fr_1fr]",
        )}
      >
        <div className="steel-frame relative aspect-[16/9] overflow-hidden rounded-3xl">
          <Image
            src={primary.src}
            alt={primary.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover"
          />
        </div>
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {rest.slice(0, 2).map((image) => (
              <div
                key={image.src}
                className="steel-frame relative aspect-[16/9] overflow-hidden rounded-3xl md:aspect-auto"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {isRepresentative && (
        <figcaption className="mt-2 font-data text-[11px] text-dim">
          Representative corridor imagery. Parcel photographs shared on
          enquiry.
        </figcaption>
      )}
    </figure>
  );
}
