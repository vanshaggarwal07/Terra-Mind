import Link from "next/link";

const PRODUCT_LINKS = [
  { href: "/explore", label: "Explore parcels" },
  { href: "/calculator", label: "Investment calculator" },
  { href: "/news", label: "Corridor news" },
  { href: "/enquire", label: "Enquire" },
];

const COVERAGE = ["Yamuna Expressway", "Jewar Airport Node", "Noida Extension", "Industrial Belt"];

export function SiteFooter() {
  return (
    <footer className="border-t border-steel-line bg-panel">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.3fr_1fr_1fr] md:px-6">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-foreground font-display text-[13px] text-background">
              T
            </span>
            <span className="font-display text-base tracking-tight text-foreground">
              Terra-Mind
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-dim">
            Property intelligence for the Noida, Yamuna Expressway and Jewar Airport
            corridor. Forecasts are estimates with confidence bands, not investment advice.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Product</p>
          <ul className="mt-4 space-y-3">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-dim transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Corridor coverage</p>
          <ul className="mt-4 space-y-3">
            {COVERAGE.map((zone) => (
              <li key={zone} className="text-sm text-dim">
                {zone}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-steel-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-dim md:flex-row md:items-center md:justify-between md:px-6">
          <p>© 2026 Terra-Mind. All estimates are illustrative, not financial advice.</p>
          <p>Built for the Yamuna Expressway corridor.</p>
        </div>
      </div>
    </footer>
  );
}
