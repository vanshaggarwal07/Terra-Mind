import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CallButton, WhatsAppButton } from "@/components/contact/ContactButtons";
import { PropertyActionBar } from "@/components/contact/PropertyActionBar";
import { PriceAlertForm } from "@/components/forms/PriceAlertForm";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { LinkButton } from "@/components/shared/LinkButton";
import { PriceTrendChart } from "@/components/shared/PriceTrendChart";
import { ProximityBadges } from "@/components/shared/ProximityBadges";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { PropertyUnfold } from "@/components/unfold/PropertyUnfold";
import { listingEnquiryMessage } from "@/lib/contact";
import { listingImages } from "@/lib/listing-images";
import { calculatorHref, formatRate, getListingById } from "@/lib/listings";
import { getListings } from "@/lib/sheets";

export const dynamic = "force-dynamic";

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const { listings } = await getListings();
  const property = getListingById(id, listings);
  if (!property) return { title: "Parcel not found" };

  const title = `${property.name} · ${formatRate(property.pricePerSqYd)}`;
  const description = `${property.location}: ${property.areaSqYd.toLocaleString("en-IN")} sq.yd at ${formatRate(property.pricePerSqYd)}, ${property.distanceToAirportKm.toFixed(1)} km from Jewar Airport. Growth +${property.growthPct.toFixed(1)}% with sourced infrastructure timeline on Terra-Mind.`;
  const image = listingImages(property)[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/property/${property.id}`,
      images: [{ url: image.src, width: 1200, height: 630, alt: image.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.src],
    },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const { listings } = await getListings();
  const property = getListingById(id, listings);
  if (!property) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.name,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/property/${property.id}`,
    description: property.valuationNote,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.locality,
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: property.lat,
      longitude: property.lng,
    },
    offers: {
      "@type": "Offer",
      price: property.pricePerSqYd * property.areaSqYd,
      priceCurrency: "INR",
    },
  };

  return (
    <div className="pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
          Property dossier
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-foreground md:text-5xl">
              {property.name}
            </h1>
            <p className="mt-2 text-dim">{property.location}</p>
          </div>
          <div className="text-right">
            <p className="font-data text-xl text-foreground">
              {formatRate(property.pricePerSqYd)}
            </p>
            <p className="font-data text-sm text-growth">
              +{property.growthPct.toFixed(1)}% · conf {property.confidencePct}%
            </p>
          </div>
        </div>
        <ProximityBadges listing={property} className="mt-4" />
        <div className="mt-6 flex flex-wrap gap-3">
          <WhatsAppButton
            message={listingEnquiryMessage(property)}
            where="property_header"
            propertyId={property.id}
            className="bg-signal text-background hover:bg-signal/90"
          >
            WhatsApp about this parcel
          </WhatsAppButton>
          <CallButton
            where="property_header"
            propertyId={property.id}
            className="border-steel-line text-foreground hover:bg-secondary"
          >
            Call now
          </CallButton>
          <LinkButton
            href={`/enquire?property=${property.id}`}
            variant="outline"
            className="border-steel-line text-foreground hover:bg-secondary"
          >
            Enquire on this parcel
          </LinkButton>
          <LinkButton href="/explore" variant="outline" className="border-steel">
            Back to explore
          </LinkButton>
        </div>

        <PropertyGallery listing={property} className="mt-8" />
        <VerificationBadge listing={property} className="mt-6 max-w-xl" />
      </div>

      <PropertyUnfold property={property} scrollLength="340%" />

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-2 md:px-6">
        <article className="steel-frame p-5">
          <h2 className="font-display text-xl text-foreground">Infrastructure sequence</h2>
          <ul className="mt-4 space-y-3">
            {property.infraTimeline.map((item, index) => (
              <li key={`${item.year}-${item.event}`} className="border-t border-steel-line pt-3">
                <p className="font-data text-xs text-growth">
                  {String(index + 1).padStart(2, "0")} · {item.year}
                </p>
                <p className="mt-1 text-sm text-foreground">{item.event}</p>
                <p className="mt-1 font-data text-[11px] text-dim">Source · {item.source}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="steel-frame p-5">
          <h2 className="font-display text-xl text-foreground">Price movement</h2>
          <PriceTrendChart transactions={property.transactions} className="mt-4" />
          <ul className="mt-5 border-t border-steel-line pt-1">
            {property.transactions.map((tx) => (
              <li
                key={`${tx.date}-${tx.rate}`}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="font-data text-sm text-foreground">{tx.date}</p>
                  <p className="text-xs text-dim">{tx.type}</p>
                </div>
                <p className="font-data text-sm text-signal">{formatRate(tx.rate)}</p>
              </li>
            ))}
          </ul>
          <LinkButton
            href={calculatorHref(property)}
            variant="outline"
            className="mt-4 w-full border-steel-line text-foreground hover:bg-secondary"
          >
            See what this parcel pays in the wealth calculator
          </LinkButton>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        <div className="steel-frame grid gap-6 rounded-3xl p-6 md:grid-cols-[1fr_1fr] md:items-center md:p-10">
          <div>
            <h2 className="font-display text-2xl leading-tight text-foreground">
              Watching this parcel?
            </h2>
            <p className="mt-2 max-w-md text-sm text-dim">
              Get one message when {property.parcelId} or nearby parcels
              re-price.
            </p>
          </div>
          <PriceAlertForm where="property_page" propertyId={property.id} />
        </div>
      </section>

      <PropertyActionBar property={property} />
    </div>
  );
}
