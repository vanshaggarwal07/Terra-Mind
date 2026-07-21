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
        try { scores[l.id] = await getScore(l.id); } catch {}
        try { prices[l.id] = await getPrediction("price", { localityId: l.id }); } catch {}
      }),
    );
  } catch {}

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
      <div className="mb-10">
        <h1 className="font-display font-medium text-[clamp(28px,4vw,44px)] text-text-hi mb-3">
          All Localities
        </h1>
        <p className="font-voice italic text-text-mid text-lg max-w-xl">
          Every tracked sector and project in the Noida – Yamuna Expressway corridor,
          with verified infrastructure signals and forecast bands.
        </p>
      </div>

      {localities.length === 0 ? (
        <div className="text-text-low text-sm py-12">
          No localities found. Seed the database or check the backend connection.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
          {localities.map((loc) => (
            <ProjectCard
              key={loc.id}
              locality={loc}
              score={scores[loc.id]}
              priceEnvelope={prices[loc.id]}
            />
          ))}
        </div>
      )}

      <Disclaimer />
    </main>
  );
}
