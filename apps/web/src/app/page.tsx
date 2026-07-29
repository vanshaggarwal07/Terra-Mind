/**
 * Home — Terra-Mind.
 * Hero (Timefold) + corridor rail + footer trust strip.
 */
import { Suspense } from "react";
import Link from "next/link";
import { listInfraEvents, getPrediction } from "@/lib/api";
import { TimefoldScrubber } from "@/components/home/TimefoldScrubber";
import { CorridorRail } from "@/components/home/CorridorRail";
import { Disclaimer } from "@/components/trust/Disclaimer";

export default async function Home() {
  let infraEvents: Awaited<ReturnType<typeof listInfraEvents>>["items"] = [];
  let pricePrediction = null;

  try {
    const eventsRes = await listInfraEvents({ limit: 50 });
    infraEvents = eventsRes.items ?? [];
  } catch {
    /* hero falls back to illustrative data */
  }

  try {
    pricePrediction = await getPrediction("price");
  } catch {
    /* illustrative numbers labeled in UI */
  }

  return (
    <>
      <TimefoldScrubber
        infraEvents={infraEvents}
        prediction={pricePrediction}
      />

      <Suspense
        fallback={
          <section className="bg-ink-2 px-ds-5 py-ds-8 md:px-ds-7" aria-busy="true">
            <p className="font-mono text-xs text-text-low">Loading localities…</p>
          </section>
        }
      >
        <CorridorRail />
      </Suspense>

      <footer className="border-t border-line bg-ink-2 px-ds-5 py-ds-6 md:px-ds-7">
        <div className="mx-auto max-w-content">
          <div className="max-w-3xl">
            <Disclaimer variant="prediction">
              Every figure on this platform traces to a cited source and a
              confidence band. Estimates are not investment, legal, or financial
              advice. Infrastructure timelines are official public-record data,
              not predictions.
            </Disclaimer>
            <div className="mt-ds-4 flex flex-wrap gap-ds-5">
              <Link
                href="/style-guide"
                className="font-mono text-[11px] text-text-low transition-colors hover:text-text-mid focus-brass"
              >
                Style guide
              </Link>
              <Link
                href="/admin/review"
                className="font-mono text-[11px] text-text-low transition-colors hover:text-text-mid focus-brass"
              >
                Review queue
              </Link>
              <Link
                href="/ops"
                className="font-mono text-[11px] text-text-low transition-colors hover:text-text-mid focus-brass"
              >
                Ops
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
