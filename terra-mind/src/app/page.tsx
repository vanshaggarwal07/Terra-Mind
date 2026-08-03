import { LandingHero } from "@/components/hero/LandingHero";
import { LinkButton } from "@/components/shared/LinkButton";
import { PropertyUnfold } from "@/components/unfold/PropertyUnfold";
import { DUMMY_LISTINGS } from "@/lib/listings";

export default function HomePage() {
  const featured = DUMMY_LISTINGS[0];

  return (
    <>
      <LandingHero />

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <p className="font-data text-[11px] uppercase tracking-[0.22em] text-signal">
              Signature mechanic
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground md:text-4xl">
              The parcel unfolds under scroll
            </h2>
            <p className="mt-3 max-w-xl text-sm text-dim md:text-base">
              Cover → peel → four panels swing open in 3D. Pure GSAP ScrollTrigger
              with pin and scrub — no click choreography. Scroll the instrument below.
            </p>
          </div>
          <div className="flex md:justify-end">
            <LinkButton
              href="/explore"
              variant="outline"
              className="border-steel text-foreground"
            >
              Browse full corridor
            </LinkButton>
          </div>
        </div>
      </section>

      <PropertyUnfold property={featured} scrollLength="300%" />

      <section className="border-t border-steel-line bg-panel/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3 md:px-6">
          {[
            {
              title: "Live valuation",
              body: "Spot rate + confidence band on every parcel — orange marks live data only.",
            },
            {
              title: "Infra timeline",
              body: "Chronological corridor signals with sources. Sequence is load-bearing, not decorative.",
            },
            {
              title: "Sheets sync",
              body: "Listings read from Google Sheets. Every enquire and calculator use writes Activity rows.",
            },
          ].map((item, i) => (
            <article key={item.title} className="steel-frame p-5">
              <p className="font-data text-[10px] text-growth">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-display text-xl text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm text-dim">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
