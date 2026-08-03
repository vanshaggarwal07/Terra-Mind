import { notFound } from "next/navigation";

import { LinkButton } from "@/components/shared/LinkButton";
import { PropertyUnfold } from "@/components/unfold/PropertyUnfold";
import { formatRate, getListingById } from "@/lib/listings";
import { fetchListingsFromSheet } from "@/lib/sheets";

export const dynamic = "force-dynamic";

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const { listings } = await fetchListingsFromSheet();
  const property = getListingById(id, listings);
  if (!property) notFound();

  return (
    <div>
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
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton
            href={`/enquire?property=${property.id}`}
            className="bg-signal text-background hover:bg-signal/90"
          >
            Enquire on this parcel
          </LinkButton>
          <LinkButton href="/explore" variant="outline" className="border-steel">
            Back to explore
          </LinkButton>
        </div>
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
          <h2 className="font-display text-xl text-foreground">Transaction ledger</h2>
          <ul className="mt-4 space-y-3">
            {property.transactions.map((tx) => (
              <li
                key={`${tx.date}-${tx.rate}`}
                className="flex items-center justify-between border-t border-steel-line pt-3"
              >
                <div>
                  <p className="font-data text-sm text-foreground">{tx.date}</p>
                  <p className="text-xs text-dim">{tx.type}</p>
                </div>
                <p className="font-data text-sm text-signal">{formatRate(tx.rate)}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
