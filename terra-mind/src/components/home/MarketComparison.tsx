import { DUMMY_LISTINGS, formatRate } from "@/lib/listings";
import { MARKET_COMPARISON } from "@/lib/market-comparison";
import type { PropertyListing } from "@/lib/types";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Indicative entry-price comparison: this corridor's live median versus
 * mature NCR markets from the labelled config in lib/market-comparison.ts.
 */
export function MarketComparison({
  listings = DUMMY_LISTINGS,
}: {
  listings?: PropertyListing[];
}) {
  const corridorMedian = median(listings.map((l) => l.pricePerSqYd));

  return (
    <section className="border-y border-steel-line bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
              The corridor&apos;s entry price, in context.
            </h2>
            <p className="mt-3 max-w-md text-base text-dim">
              Mature NCR markets already carry their growth in the price. Here,
              the median tracked parcel still trades at a fraction of those
              rates.
            </p>
            <p className="mt-5 max-w-md font-data text-[11px] leading-relaxed text-dim">
              Indicative comparison, as of {MARKET_COMPARISON.asOf}.{" "}
              {MARKET_COMPARISON.sourceNote}
            </p>
          </div>

          <div className="steel-frame rounded-3xl p-5 md:p-7">
            <div className="flex items-baseline justify-between gap-4 rounded-2xl bg-signal-tint px-4 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  This corridor
                </p>
                <p className="text-xs text-dim">Median of tracked parcels, live</p>
              </div>
              <p className="font-data text-lg text-signal md:text-xl">
                {formatRate(corridorMedian)}
              </p>
            </div>

            <ul className="mt-2">
              {MARKET_COMPARISON.markets.map((market) => (
                <li
                  key={market.name}
                  className="flex items-baseline justify-between gap-4 px-4 py-4 not-last:border-b not-last:border-steel-line"
                >
                  <div>
                    <p className="text-sm text-foreground">{market.name}</p>
                    <p className="text-xs text-dim">{market.note}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-base text-foreground">
                      {formatRate(market.ratePerSqYd)}
                    </p>
                    <p className="font-data text-[11px] text-dim">
                      {(market.ratePerSqYd / corridorMedian).toFixed(1)}× the
                      corridor median
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
