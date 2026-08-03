import { categorize } from "@/lib/news/categorize";
import type { NormalizedNewsItem } from "@/lib/news/types";

/** Curated corridor-focused accounts — replace/extend when X monitoring is enabled. */
export const CURATED_X_HANDLES = [
  "YEIDAOfficial",
  "NoidaAuthority",
  "GNIDAOfficial",
  "MoCA_GoI",
  "nhaiofficial",
] as const;

/**
 * Isolated X monitoring module.
 * Returns [] when disabled or missing credentials — never throws.
 */
export async function fetchXCuratedItems(): Promise<NormalizedNewsItem[]> {
  const enabled = process.env.X_MONITORING_ENABLED === "true";
  const bearer = process.env.X_BEARER_TOKEN?.trim();

  if (!enabled || !bearer) {
    console.info(
      "[xCurated] X monitoring disabled (set X_MONITORING_ENABLED=true and X_BEARER_TOKEN to enable)",
    );
    return [];
  }

  try {
    const items: NormalizedNewsItem[] = [];

    for (const handle of CURATED_X_HANDLES) {
      try {
        const userRes = await fetch(
          `https://api.twitter.com/2/users/by/username/${handle}`,
          { headers: { Authorization: `Bearer ${bearer}` } },
        );
        if (!userRes.ok) {
          console.warn(
            `[xCurated] user lookup failed for @${handle}: HTTP ${userRes.status}`,
          );
          continue;
        }
        const userJson = (await userRes.json()) as {
          data?: { id?: string; name?: string };
        };
        const userId = userJson.data?.id;
        if (!userId) continue;

        const tlRes = await fetch(
          `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,text`,
          { headers: { Authorization: `Bearer ${bearer}` } },
        );
        if (!tlRes.ok) {
          console.warn(
            `[xCurated] timeline failed for @${handle}: HTTP ${tlRes.status}`,
          );
          continue;
        }
        const tlJson = (await tlRes.json()) as {
          data?: { id: string; text: string; created_at?: string }[];
        };
        for (const tweet of tlJson.data ?? []) {
          const headline =
            tweet.text.length > 120
              ? `${tweet.text.slice(0, 117)}...`
              : tweet.text;
          const sourceUrl = `https://x.com/${handle}/status/${tweet.id}`;
          items.push({
            headline,
            body: tweet.text,
            sourceName: `@${handle}`,
            sourceUrl,
            publishedAt: tweet.created_at ? new Date(tweet.created_at) : null,
            category: categorize(headline, tweet.text),
            sourceType: "x",
          });
        }
        console.info(
          `[xCurated] @${handle}: ${(tlJson.data ?? []).length} tweets`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[xCurated] @${handle} failed: ${msg}`);
      }
    }

    return items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[xCurated] unexpected failure (returning []): ${msg}`);
    return [];
  }
}
