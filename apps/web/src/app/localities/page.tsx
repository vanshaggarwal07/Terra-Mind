/**
 * /localities — full corridor listing with score + price data.
 */
import { listLocalities, getScore, getPrediction } from "@/lib/api";
import { ProjectCard } from "@/components/home/ProjectCard";
import { Disclaimer } from "@/components/trust/Disclaimer";
import type { Locality, PredictionEnvelope } from "@/lib/api";

export default async function LocalitiesPage() {
  let localities: Locality[] = [];
  const scores: Record<string, PredictionEnvelope> = {};
  const prices: Record<string, PredictionEnvelope> = {};

  try {
    localities = await listLocalities(50);
    await Promise.allSettled(
      localities.map(async (l) => {
        try {
          scores[l.id] = await getScore(l.id);
        } catch {
          /* best-effort */
        }
        try {
          prices[l.id] = await getPrediction("price", { localityId: l.id });
        } catch {
          /* best-effort */
        }
      }),
    );
  } catch {
    /* backend unavailable */
  }

  const [featured, ...rest] = localities;

  return (
    <main className="mx-auto max-w-content px-ds-5 py-ds-7 md:px-ds-7 md:py-ds-8">
      <header className="mb-ds-7 max-w-2xl">
        <h1 className="mb-ds-3 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1] text-text-hi">
          All localities
        </h1>
        <p className="max-w-[55ch] font-display text-base text-text-mid md:text-lg">
          Tracked sectors across the Noida to Yamuna Expressway corridor, with
          verified signals and forecast bands.
        </p>
      </header>

      {localities.length === 0 ? (
        <div className="rounded-surface border border-line-strong bg-ink-2 px-ds-5 py-ds-8">
          <p className="text-sm text-text-low">
            No localities found. Seed the database or check the backend connection.
          </p>
        </div>
      ) : (
        <div className="mb-ds-8 space-y-ds-3">
          {/* Featured lead tile */}
          {featured && (
            <ProjectCard
              locality={featured}
              score={scores[featured.id]}
              priceEnvelope={prices[featured.id]}
              featured
              className="min-h-[8rem] md:min-h-[9rem]"
            />
          )}

          {/* Asymmetric remainder — 2 / 3 cols, not equal-four */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-ds-3 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((loc) => (
                <ProjectCard
                  key={loc.id}
                  locality={loc}
                  score={scores[loc.id]}
                  priceEnvelope={prices[loc.id]}
                  className="min-h-[10.5rem]"
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Disclaimer />
    </main>
  );
}
