/**
 * INDICATIVE market comparison config — NOT a live data feed.
 *
 * These bands are compiled manually from published broker averages and
 * public registry snapshots for mature NCR markets. They exist to give a
 * sense of relative entry price, and every surface that renders them must
 * show the on-screen "indicative" disclaimer. Update `asOf` whenever the
 * numbers are refreshed. Do not present these as guarantees.
 */
export interface ComparisonMarket {
  name: string;
  /** Indicative residential-plot rate band midpoint, ₹ per sq.yd. */
  ratePerSqYd: number;
  note: string;
}

export const MARKET_COMPARISON: {
  asOf: string;
  sourceNote: string;
  markets: ComparisonMarket[];
} = {
  asOf: "2026-07",
  sourceNote:
    "Compiled from published broker averages and registry snapshots, mid-2026. Indicative only. Verify current rates before any decision.",
  markets: [
    {
      name: "Noida Expressway sectors",
      ratePerSqYd: 110000,
      note: "Mature market, fully built out",
    },
    {
      name: "Greater Noida West",
      ratePerSqYd: 62000,
      note: "Established, high-density residential",
    },
    {
      name: "Gurugram New Sectors",
      ratePerSqYd: 140000,
      note: "Mature market, premium pricing",
    },
  ],
};
