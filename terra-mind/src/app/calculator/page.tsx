import type { Metadata } from "next";
import { Suspense } from "react";

import { WealthCalculator } from "@/components/calculator/WealthCalculator";
import { getListings } from "@/lib/sheets";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Wealth calculator",
  description:
    "See what an amount invested in the Jewar Airport / Yamuna Expressway corridor was worth then, is worth now, and could be worth next. Real ledger data, honest projections.",
};

export default async function CalculatorPage() {
  const { listings } = await getListings();

  return (
    // Suspense boundary required: the calculator reads useSearchParams for
    // deep-linked parcel and amount prefills.
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-32 text-sm text-dim md:px-6">
          Loading calculator…
        </div>
      }
    >
      <WealthCalculator listings={listings} />
    </Suspense>
  );
}
