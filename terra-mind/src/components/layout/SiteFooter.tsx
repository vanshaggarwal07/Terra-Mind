import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-steel-line bg-panel">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="font-display text-sm tracking-[0.16em] text-foreground uppercase">
            Terra-Mind
          </p>
          <p className="mt-2 max-w-md text-sm text-dim">
            Property intelligence for the Noida / Yamuna Expressway / Jewar Airport
            corridor. Forecasts are estimates with confidence bands — not investment advice.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 font-data text-[11px] uppercase tracking-[0.16em] text-dim">
          <Link href="/explore" className="hover:text-signal">
            Explore
          </Link>
          <Link href="/news" className="hover:text-signal">
            News
          </Link>
          <Link href="/calculator" className="hover:text-signal">
            Calculator
          </Link>
          <Link href="/enquire" className="hover:text-signal">
            Enquire
          </Link>
        </div>
      </div>
    </footer>
  );
}
