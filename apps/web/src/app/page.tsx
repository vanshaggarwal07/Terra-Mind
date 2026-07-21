/**
 * Home page — Terra-Mind.
 * Section 3.1 layout: hero (Timefold scrubber) + corridor card rail + footer disclaimer.
 *
 * Data is fetched on the server for the hero (facts for infra nodes, corridor-level
 * price prediction). The card rail hydrates client-side.
 */
import { Suspense } from "react";
import { listInfraEvents, getPrediction } from "@/lib/api";
import { TimefoldScrubber } from "@/components/home/TimefoldScrubber";
import { CorridorRail } from "@/components/home/CorridorRail";
import { Disclaimer } from "@/components/trust/Disclaimer";

export default async function Home() {
  // Corridor-wide infra events for the Timefold nodes
  let infraEvents: Awaited<ReturnType<typeof listInfraEvents>>["items"] = [];
  let pricePrediction = null;

  try {
    const eventsRes = await listInfraEvents({ limit: 50 });
    infraEvents = eventsRes.items ?? [];
  } catch {
    // Backend not available — hero renders with illustrative data
  }

  try {
    pricePrediction = await getPrediction("price");
  } catch {
    // OK — TimefoldScrubber falls back to illustrative numbers and labels them
  }

  return (
    <>
      {/* Hero */}
      <TimefoldScrubber
        infraEvents={infraEvents}
        prediction={pricePrediction}
      />

      {/* Corridor card rail */}
      <Suspense
        fallback={
          <section className="px-6 md:px-12 py-16 bg-ink-2">
            <p className="font-mono text-xs text-text-low">Loading localities…</p>
          </section>
        }
      >
        <CorridorRail />
      </Suspense>

      {/* Footer disclaimer */}
      <footer className="px-6 md:px-12 py-8 bg-ink-2 border-t border-white/[0.06]">
        <div className="max-w-3xl">
          <Disclaimer variant="prediction">
            Every figure shown on this platform traces to a cited source and a
            confidence band. Estimates are not investment, legal, or financial
            advice. Infrastructure timelines are official public-record data,
            not predictions.
          </Disclaimer>
          <div className="mt-4 flex gap-6 flex-wrap">
            <a href="/style-guide" className="text-[11px] text-text-low hover:text-text-mid font-mono">
              Style guide
            </a>
            <a href="/admin/review" className="text-[11px] text-text-low hover:text-text-mid font-mono">
              Review queue
            </a>
            <a href="/ops" className="text-[11px] text-text-low hover:text-text-mid font-mono">
              Ops
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
